import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireUser, type SessionUser } from "@/lib/auth";

const TaskTypeValues = ["ONBOARDING", "OFFBOARDING"] as const;

const bodySchema = z.object({
  employeeId: z.string().cuid(),
  type: z.enum(TaskTypeValues),
  // optional: regenerate even if exists
  overwrite: z.boolean().optional().default(false),
  // optional: only generate for a specific template
  templateId: z.string().cuid().optional(),
});

function canGenerate(user: SessionUser) {
  // ADMIN/HR/UNIT_LEAD dürfen generieren
  return user.role === "ADMIN" || user.role === "HR" || user.role === "UNIT_LEAD";
}


export async function POST(req: Request) {
  const user = await requireUser();
  if (!canGenerate(user)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { employeeId, type, overwrite, templateId } = parsed.data;

  const employee = await (db as any)["employee"].findUnique({
    where: { id: employeeId },
    select: { id: true, startDate: true, exitDate: true },
  });
  if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });

  const anchorDate: Date | null = type === "ONBOARDING" ? new Date(employee.startDate) : employee.exitDate ? new Date(employee.exitDate) : null;
  if (!anchorDate || isNaN(anchorDate.getTime())) {
    return Response.json({ error: `Missing ${(type === "ONBOARDING" ? "startDate" : "exitDate")}` }, { status: 400 });
  }

  // Get templates with their role key for legacy enum mapping
  // If templateId is provided, only generate for that specific template
  const templateWhere: { type: string; active: boolean; id?: string } = { type, active: true };
  if (templateId) {
    templateWhere.id = templateId;
  }
  
  console.log("[generate] Looking for templates with:", JSON.stringify(templateWhere));
  
  const templates = await (db as any)["taskTemplate"].findMany({
    where: templateWhere,
    orderBy: { title: "asc" },
    select: { 
      id: true, 
      title: true,
      relativeDueDays: true, 
      ownerRoleId: true,
      type: true,
      active: true,
      role: { select: { key: true } },
    },
  });
  
  console.log(`[generate] Found ${templates.length} templates:`, templates.map((t: { id: string; title: string; type: string; active: boolean }) => `${t.title} (${t.type}, active=${t.active})`));
  
  // If templateId was provided but no templates found, check why
  if (templateId && templates.length === 0) {
    const templateCheck = await (db as any)["taskTemplate"].findUnique({
      where: { id: templateId },
      select: { id: true, title: true, type: true, active: true },
    });
    if (templateCheck) {
      const reasons: string[] = [];
      if (templateCheck.type !== type) reasons.push(`Typ ist ${templateCheck.type}, nicht ${type}`);
      if (!templateCheck.active) reasons.push("Vorlage ist nicht aktiv");
      console.log(`[generate] Template ${templateId} exists but filtered out:`, reasons);
      return Response.json({ 
        error: `Vorlage "${templateCheck.title}" kann nicht verwendet werden: ${reasons.join(", ")}`,
        generated: 0 
      }, { status: 400 });
    } else {
      return Response.json({ error: "Vorlage nicht gefunden", generated: 0 }, { status: 404 });
    }
  }
  
  if (templates.length === 0) {
    return Response.json({ 
      error: `Keine aktiven ${type === "ONBOARDING" ? "Onboarding" : "Offboarding"}-Vorlagen gefunden`,
      generated: 0 
    }, { status: 400 });
  }

  // Get the default "OPEN" status dynamically
  let defaultStatus = await (db as any)["lifecycleStatus"].findFirst({
    where: { OR: [{ key: "OPEN" }, { isDefault: true }] },
    select: { id: true, key: true },
  });
  if (!defaultStatus) {
    // Create default status if not exists
    defaultStatus = await (db as any)["lifecycleStatus"].create({
      data: { key: "OPEN", label: "Offen", description: "Aufgabe wurde noch nicht begonnen", isDone: false, isDefault: true, orderIndex: 0 },
      select: { id: true, key: true },
    });
  }
  const openStatusId = defaultStatus.id;

  let generatedCount = 0;
  for (const tpl of templates) {
    const due = new Date(anchorDate);
    due.setDate(due.getDate() + (tpl.relativeDueDays || 0));

    try {
      if (overwrite) {
        // Upsert: try update first, then insert if not exists
        const existing = await (db as any)["taskAssignment"].findUnique({
          where: { employeeId_taskTemplateId: { employeeId, taskTemplateId: tpl.id } },
          select: { id: true },
        });
        
        if (existing) {
          // Update existing - use Prisma instead of raw SQL to avoid legacy column issues
          await (db as any)["taskAssignment"].update({
            where: { id: existing.id },
            data: {
              type,
              dueDate: due,
              ownerRoleId: tpl.ownerRoleId,
              statusId: openStatusId,
            },
          });
          generatedCount++;
        } else {
          // Insert new - use Prisma to handle column mapping properly
          await (db as any)["taskAssignment"].create({
            data: {
              employeeId,
              taskTemplateId: tpl.id,
              type,
              dueDate: due,
              ownerRoleId: tpl.ownerRoleId,
              statusId: openStatusId,
            },
          });
          generatedCount++;
        }
      } else {
        // Create if not exists - use upsert to handle conflicts
        try {
          await (db as any)["taskAssignment"].create({
            data: {
              employeeId,
              taskTemplateId: tpl.id,
              type,
              dueDate: due,
              ownerRoleId: tpl.ownerRoleId,
              statusId: openStatusId,
            },
          });
          generatedCount++;
        } catch (createErr: unknown) {
          // Ignore unique constraint violations (task already exists)
          const errorCode = (createErr as { code?: string })?.code;
          if (errorCode !== 'P2002') {
            throw createErr;
          }
        }
      }
    } catch (err) {
      console.error("Failed to generate task:", err);
      // Skip on error (e.g., unique violation)
    }
  }

  return Response.json({ generated: generatedCount });
}
