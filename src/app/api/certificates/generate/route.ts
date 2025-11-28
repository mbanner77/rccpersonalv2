import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireUser, hasRole } from "@/lib/auth";

const GenerateSchema = z.object({
  certificateId: z.string().cuid(),
  ratings: z.record(z.string(), z.number().int().min(1).max(5)), // categoryKey -> rating
});

// Placeholder replacements
function replacePlaceholders(content: string, data: Record<string, string | null | undefined>): string {
  let result = content;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{${key}\\}`, "gi");
    result = result.replace(placeholder, value ?? "");
  }
  return result;
}

// Format date in German
function formatDateGerman(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

// Calculate employment duration
function calculateDuration(startDate: Date, endDate: Date | null): string {
  const end = endDate ?? new Date();
  const start = new Date(startDate);
  
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  
  let totalMonths = years * 12 + months;
  if (totalMonths < 0) totalMonths = 0;
  
  const displayYears = Math.floor(totalMonths / 12);
  const displayMonths = totalMonths % 12;
  
  if (displayYears === 0) {
    return displayMonths === 1 ? "1 Monat" : `${displayMonths} Monaten`;
  }
  if (displayMonths === 0) {
    return displayYears === 1 ? "1 Jahr" : `${displayYears} Jahren`;
  }
  return `${displayYears} Jahr${displayYears > 1 ? "en" : ""} und ${displayMonths} Monat${displayMonths > 1 ? "en" : ""}`;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const parsed = GenerateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { certificateId, ratings } = parsed.data;

    // Get the certificate with employee data
    const certificate = await db.workCertificate.findUnique({
      where: { id: certificateId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            startDate: true,
            exitDate: true,
            unit: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    });

    if (!certificate) {
      return Response.json({ error: "Zeugnis nicht gefunden" }, { status: 404 });
    }

    // Check access
    if (!hasRole(user, "ADMIN") && user.unitId && certificate.employee.unit?.name !== user.unitId) {
      return Response.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    // Get all categories
    const categories = await db.certificateCategory.findMany({
      orderBy: { orderIndex: "asc" },
    });

    // Build placeholder data
    const emp = certificate.employee;
    const pronoun = "er/sie"; // Could be extended for gender
    const possessive = "sein/ihr";
    
    const placeholders: Record<string, string | null> = {
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`,
      jobTitle: emp.jobTitle ?? certificate.jobTitle,
      startDate: formatDateGerman(emp.startDate),
      endDate: formatDateGerman(certificate.endDate ?? emp.exitDate),
      today: formatDateGerman(new Date()),
      duration: calculateDuration(emp.startDate, certificate.endDate ?? emp.exitDate),
      unit: emp.unit?.name ?? "",
      department: emp.department?.name ?? "",
      pronoun,
      Pronoun: pronoun.charAt(0).toUpperCase() + pronoun.slice(1),
      possessive,
      Possessive: possessive.charAt(0).toUpperCase() + possessive.slice(1),
    };

    // Delete existing sections
    await db.workCertificateSection.deleteMany({
      where: { certificateId },
    });

    // Generate new sections
    const sections: Array<{
      certificateId: string;
      categoryKey: string;
      orderIndex: number;
      content: string;
      rating: number | null;
      textBlockId: string | null;
    }> = [];

    let fullContent = "";

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const rating = ratings[category.key] ?? 2; // Default to "gut" if not specified

      // Find the best matching text block
      let textBlock = await db.certificateTextBlock.findFirst({
        where: {
          categoryId: category.id,
          rating,
          active: true,
          isDefault: true,
        },
      });

      // If no default found, try any block with this rating
      if (!textBlock) {
        textBlock = await db.certificateTextBlock.findFirst({
          where: {
            categoryId: category.id,
            rating,
            active: true,
          },
        });
      }

      // If still not found, try closest rating
      if (!textBlock) {
        textBlock = await db.certificateTextBlock.findFirst({
          where: {
            categoryId: category.id,
            active: true,
          },
          orderBy: {
            rating: rating <= 2 ? "asc" : "desc",
          },
        });
      }

      if (textBlock) {
        const content = replacePlaceholders(textBlock.content, placeholders);
        sections.push({
          certificateId,
          categoryKey: category.key,
          orderIndex: i,
          content,
          rating,
          textBlockId: textBlock.id,
        });
        fullContent += content + "\n\n";
      }
    }

    // Create all sections
    if (sections.length > 0) {
      await db.workCertificateSection.createMany({
        data: sections,
      });
    }

    // Update certificate with full content
    const updatedCertificate = await db.workCertificate.update({
      where: { id: certificateId },
      data: {
        fullContent: fullContent.trim(),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            textBlock: { select: { id: true, title: true, category: { select: { key: true, label: true } } } },
          },
        },
      },
    });

    return Response.json({
      ...updatedCertificate,
      message: `Zeugnis mit ${sections.length} Abschnitten generiert`,
    });
  } catch (e) {
    console.error("Generate certificate error:", e);
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}
