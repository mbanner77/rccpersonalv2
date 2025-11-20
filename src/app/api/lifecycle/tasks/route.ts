import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const TaskTypeValues = ["ONBOARDING", "OFFBOARDING"] as const;
const TaskStatusValues = ["OPEN", "DONE", "BLOCKED"] as const;

const querySchema = z.object({
  type: z.enum(TaskTypeValues).optional(),
  status: z.enum(TaskStatusValues).optional(),
  employeeId: z.string().cuid().optional(),
});

const patchSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(TaskStatusValues).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(req: Request) {
  await requireUser();
  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { type, status, employeeId } = parsed.data;

  const where: any = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;

  const tasks = await (db as any)["taskAssignment"].findMany({
    where,
    orderBy: [{ dueDate: "asc" }],
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, email: true } },
      template: { select: { id: true, title: true, ownerRole: true, type: true } },
    },
  });
  return Response.json(tasks);
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, status, notes } = parsed.data;

  const data: any = {};
  if (status) {
    data.status = status;
    if (status === "DONE") data.completedAt = new Date();
    if (status !== "DONE") data.completedAt = null;
  }
  if (notes !== undefined) data.notes = notes ?? null;

  const updated = await (db as any)["taskAssignment"].update({ where: { id }, data });
  return Response.json(updated);
}
