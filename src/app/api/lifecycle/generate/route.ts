import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireUser, type SessionUser } from "@/lib/auth";

const TaskTypeValues = ["ONBOARDING", "OFFBOARDING"] as const;

const bodySchema = z.object({
  employeeId: z.string().cuid(),
  type: z.enum(TaskTypeValues),
  // optional: regenerate even if exists
  overwrite: z.boolean().optional().default(false),
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
  const { employeeId, type, overwrite } = parsed.data;

  const employee = await (db as any)["employee"].findUnique({
    where: { id: employeeId },
    select: { id: true, startDate: true, exitDate: true },
  });
  if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });

  const anchorDate: Date | null = type === "ONBOARDING" ? new Date(employee.startDate) : employee.exitDate ? new Date(employee.exitDate) : null;
  if (!anchorDate || isNaN(anchorDate.getTime())) {
    return Response.json({ error: `Missing ${(type === "ONBOARDING" ? "startDate" : "exitDate")}` }, { status: 400 });
  }

  const templates: Array<any> = await (db as any)["taskTemplate"].findMany({
    where: { type, active: true },
    orderBy: { title: "asc" },
    select: { id: true, relativeDueDays: true, ownerRoleId: true },
  });

  // Get the default "OPEN" status dynamically
  let defaultStatus = await (db as any)["lifecycleStatus"].findFirst({
    where: { OR: [{ key: "OPEN" }, { isDefault: true }] },
    select: { id: true },
  });
  if (!defaultStatus) {
    // Create default status if not exists
    defaultStatus = await (db as any)["lifecycleStatus"].create({
      data: { key: "OPEN", label: "Offen", description: "Aufgabe wurde noch nicht begonnen", isDone: false, isDefault: true, orderIndex: 0 },
      select: { id: true },
    });
  }
  const openStatusId = defaultStatus.id;

  const results: any[] = [];
  for (const tpl of templates) {
    const due = new Date(anchorDate);
    due.setDate(due.getDate() + (tpl.relativeDueDays || 0));

    if (overwrite) {
      // upsert: set status back to OPEN and update dueDate/ownerRole
      const up = await (db as any)["taskAssignment"].upsert({
        where: { employeeId_taskTemplateId: { employeeId, taskTemplateId: tpl.id } },
        update: { type, dueDate: due, ownerRoleId: tpl.ownerRoleId, statusId: openStatusId },
        create: { employeeId, taskTemplateId: tpl.id, type, dueDate: due, ownerRoleId: tpl.ownerRoleId, statusId: openStatusId },
      });
      results.push(up);
    } else {
      // create if not exists, ignore on conflict
      try {
        const created = await (db as any)["taskAssignment"].create({
          data: { employeeId, taskTemplateId: tpl.id, type, dueDate: due, ownerRoleId: tpl.ownerRoleId, statusId: openStatusId },
        });
        results.push(created);
      } catch {
        // likely unique violation -> skip
      }
    }
  }

  return Response.json({ generated: results.length });
}
