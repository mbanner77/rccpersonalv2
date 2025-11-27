import { db } from "@/lib/prisma";
import { hasRole, requireUser, type SessionUser } from "@/lib/auth";
import { z } from "zod";

const ReminderTypeValues = [
  "GEHALT",
  "MEILENSTEIN",
  "SONDERBONUS",
  "STAFFELBONUS",
  "URLAUBSGELD",
  "WEIHNACHTSGELD",
] as const;

const RecipientSchema = z.object({
  email: z.string().email(),
  orderIndex: z.number().int().nonnegative().default(0),
});

const ScheduleSchema = z.object({
  label: z.string().min(1),
  daysBefore: z.number().int(),
  timeOfDay: z.string().trim().min(1).optional().nullable(),
  orderIndex: z.number().int().nonnegative().default(0),
});

const CreateSchema = z.object({
  type: z.enum(ReminderTypeValues),
  description: z.string().trim().optional().nullable(),
  employeeId: z.string().min(1),
  dueDate: z.coerce.date(),
  active: z.boolean().optional().default(true),
  schedules: z.array(ScheduleSchema).min(1),
  recipients: z.array(RecipientSchema).min(1),
});

const UpdateSchema = CreateSchema.partial().extend({ id: z.string().min(1) });

function ensureAccess(user: SessionUser, employeeUnitId: string | null | undefined) {
  if (hasRole(user, "ADMIN")) return;
  if (user.role === "UNIT_LEAD") {
    if (!user.unitId || !employeeUnitId || user.unitId !== employeeUnitId) {
      throw new Response("Forbidden", { status: 403 });
    }
    return;
  }
  throw new Response("Forbidden", { status: 403 });
}

export async function GET() {
  try {
    const user = await requireUser();
    const where = user.role === "UNIT_LEAD" && user.unitId ? { employee: { unitId: user.unitId } } : undefined;
    const items = await (db as any).reminder.findMany({
      where,
      orderBy: [{ dueDate: "asc" }],
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true, unitId: true } },
        schedules: { orderBy: { orderIndex: "asc" } },
        recipients: { orderBy: { orderIndex: "asc" } },
      },
    });
    return Response.json(items);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    // If tables are not yet present (fresh deploy), return empty list instead of 500
    if (/does not exist|relation .* does not exist/i.test(msg)) {
      return Response.json([]);
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const employee = await db.employee.findUnique({ where: { id: data.employeeId }, select: { id: true, unitId: true } });
  if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });
  ensureAccess(user, employee.unitId);

  const created = await db.reminder.create({
    data: {
      typeLegacy: data.type,
      description: data.description ?? null,
      employeeId: data.employeeId,
      dueDate: data.dueDate,
      active: data.active ?? true,
      schedules: { create: data.schedules.map((s) => ({ label: s.label, daysBefore: s.daysBefore, timeOfDay: s.timeOfDay ?? null, orderIndex: s.orderIndex ?? 0 })) },
      recipients: { create: data.recipients.map((r) => ({ email: r.email, orderIndex: r.orderIndex ?? 0 })) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    include: { schedules: true, recipients: true },
  });
  return Response.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const existing = await db.reminder.findUnique({ where: { id }, include: { employee: { select: { unitId: true } } } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  ensureAccess(user, existing.employee?.unitId ?? null);

  // If employeeId changes, re-check access
  if (rest.employeeId && rest.employeeId !== (existing as any).employeeId) {
    const emp = await db.employee.findUnique({ where: { id: rest.employeeId }, select: { unitId: true } });
    ensureAccess(user, emp?.unitId ?? null);
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.reminder.update({
      where: { id },
      data: {
        typeLegacy: rest.type ?? undefined,
        description: rest.description ?? undefined,
        employeeId: rest.employeeId ?? undefined,
        dueDate: rest.dueDate ?? undefined,
        active: typeof rest.active === "boolean" ? rest.active : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    if (rest.schedules) {
      await tx.reminderSchedule.deleteMany({ where: { reminderId: id } });
      if (rest.schedules.length) {
        await tx.reminderSchedule.createMany({
          data: rest.schedules.map((s) => ({ reminderId: id, label: s.label, daysBefore: s.daysBefore, timeOfDay: s.timeOfDay ?? null, orderIndex: s.orderIndex ?? 0 })),
        });
      }
    }
    if (rest.recipients) {
      await tx.reminderRecipient.deleteMany({ where: { reminderId: id } });
      if (rest.recipients.length) {
        await tx.reminderRecipient.createMany({ data: rest.recipients.map((r) => ({ reminderId: id, email: r.email, orderIndex: r.orderIndex ?? 0 })) });
      }
    }

    return tx.reminder.findUnique({ where: { id }, include: { schedules: { orderBy: { orderIndex: "asc" } }, recipients: { orderBy: { orderIndex: "asc" } } } });
  });

  return Response.json(updated);
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const id = String(body.id ?? "");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const existing = await db.reminder.findUnique({ where: { id }, include: { employee: { select: { unitId: true } } } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  ensureAccess(user, existing.employee?.unitId ?? null);
  await db.reminder.delete({ where: { id } });
  return Response.json({ ok: true });
}
