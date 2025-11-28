import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireUser, hasRole } from "@/lib/auth";

const CertificateTypeValues = ["ZWISCHENZEUGNIS", "ENDZEUGNIS", "EINFACH", "QUALIFIZIERT"] as const;
const CertificateStatusValues = ["DRAFT", "REVIEW", "APPROVED", "ISSUED", "ARCHIVED"] as const;

const QuerySchema = z.object({
  employeeId: z.string().cuid().optional(),
  status: z.enum(CertificateStatusValues).optional(),
});

const CreateSchema = z.object({
  employeeId: z.string().cuid(),
  type: z.enum(CertificateTypeValues).default("QUALIFIZIERT"),
  title: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

const UpdateSchema = z.object({
  id: z.string().cuid(),
  type: z.enum(CertificateTypeValues).optional(),
  title: z.string().max(200).nullable().optional(),
  status: z.enum(CertificateStatusValues).optional(),
  fullContent: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  issueDate: z.string().datetime().optional(),
});

const DeleteSchema = z.object({
  id: z.string().cuid(),
});

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  REVIEW: "In Prüfung",
  APPROVED: "Genehmigt",
  ISSUED: "Ausgestellt",
  ARCHIVED: "Archiviert",
};

const TYPE_LABELS: Record<string, string> = {
  ZWISCHENZEUGNIS: "Zwischenzeugnis",
  ENDZEUGNIS: "Endzeugnis",
  EINFACH: "Einfaches Zeugnis",
  QUALIFIZIERT: "Qualifiziertes Zeugnis",
};

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const where: Record<string, unknown> = {};
    if (parsed.data.employeeId) where.employeeId = parsed.data.employeeId;
    if (parsed.data.status) where.status = parsed.data.status;

    // Non-admins can only see their unit's employees' certificates
    if (!hasRole(user, "ADMIN") && user.unitId) {
      where.employee = { unitId: user.unitId };
    }

    const certificates = await db.workCertificate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            textBlock: { select: { id: true, title: true } },
          },
        },
      },
    });

    const result = certificates.map((cert) => ({
      ...cert,
      statusLabel: STATUS_LABELS[cert.status] ?? cert.status,
      typeLabel: TYPE_LABELS[cert.type] ?? cert.type,
    }));

    return Response.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Get employee data
    const employee = await db.employee.findUnique({
      where: { id: parsed.data.employeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        startDate: true,
        exitDate: true,
        unitId: true,
      },
    });

    if (!employee) {
      return Response.json({ error: "Mitarbeiter nicht gefunden" }, { status: 404 });
    }

    // Check access for non-admins
    if (!hasRole(user, "ADMIN") && user.unitId && employee.unitId !== user.unitId) {
      return Response.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const isEndzeugnis = parsed.data.type === "ENDZEUGNIS";

    const certificate = await db.workCertificate.create({
      data: {
        employeeId: employee.id,
        type: parsed.data.type,
        title: parsed.data.title ?? `${TYPE_LABELS[parsed.data.type]} - ${employeeName}`,
        employeeName,
        jobTitle: employee.jobTitle,
        startDate: employee.startDate,
        endDate: isEndzeugnis ? (employee.exitDate ?? new Date()) : null,
        notes: parsed.data.notes,
        createdById: user.id,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return Response.json({
      ...certificate,
      statusLabel: STATUS_LABELS[certificate.status] ?? certificate.status,
      typeLabel: TYPE_LABELS[certificate.type] ?? certificate.type,
    }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, ...data } = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.status !== undefined) {
      updateData.status = data.status;
      // Set approval info if approving
      if (data.status === "APPROVED") {
        updateData.approvedById = user.id;
        updateData.approvedAt = new Date();
      }
    }
    if (data.fullContent !== undefined) updateData.fullContent = data.fullContent;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.issueDate !== undefined) updateData.issueDate = new Date(data.issueDate);

    const certificate = await db.workCertificate.update({
      where: { id },
      data: updateData,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        sections: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return Response.json({
      ...certificate,
      statusLabel: STATUS_LABELS[certificate.status] ?? certificate.status,
      typeLabel: TYPE_LABELS[certificate.type] ?? certificate.type,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await db.workCertificate.delete({
      where: { id: parsed.data.id },
    });

    return Response.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}
