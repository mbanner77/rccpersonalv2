import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireUser, type SessionUser } from "@/lib/auth";

const TaskTypeValues = ["ONBOARDING", "OFFBOARDING"] as const;
const UserRoleValues = ["ADMIN", "HR", "PEOPLE_MANAGER", "TEAM_LEAD", "UNIT_LEAD"] as const;

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(TaskTypeValues),
  ownerRole: z.enum(UserRoleValues),
  relativeDueDays: z.number().int().min(-365).max(365),
  active: z.boolean().optional().default(true),
});

const updateSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  type: z.enum(TaskTypeValues).optional(),
  ownerRole: z.enum(UserRoleValues).optional(),
  relativeDueDays: z.number().int().min(-365).max(365).optional(),
  active: z.boolean().optional(),
});

function ensureAdmin(user: SessionUser) {
  if (user.role !== "ADMIN") throw new Response("Forbidden", { status: 403 });
}

export async function GET() {
  const user = await requireUser();
  ensureAdmin(user);
  const templates = await (db as any)["taskTemplate"].findMany({
    orderBy: [{ type: "asc" }, { title: "asc" }],
  });
  return Response.json(templates);
}

export async function POST(req: Request) {
  const user = await requireUser();
  ensureAdmin(user);
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const created = await (db as any)["taskTemplate"].create({ data });
  return Response.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  ensureAdmin(user);
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const updated = await (db as any)["taskTemplate"].update({ where: { id }, data: rest });
  return Response.json(updated);
}
