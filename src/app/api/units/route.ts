import { db } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const units = await db.unit.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  return Response.json(units);
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (!name) return Response.json({ error: "name required" }, { status: 400 });
  const leader = body?.leader ? String(body.leader).trim() : null;
  const deputy = body?.deputy ? String(body.deputy).trim() : null;
  try {
    const created = await db.unit.create({ data: { name, leader, deputy } });
    return Response.json(created, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "create failed";
    if (msg.includes("Unique constraint failed") || msg.includes("Unit_name_key") || msg.includes("P2002")) {
      return Response.json({ error: "unit name already exists" }, { status: 409 });
    }
    return Response.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const data: { name?: string; leader?: string | null; deputy?: string | null } = {};
  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const val = String(body.name ?? "").trim();
    if (!val) return Response.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = val;
  }
  if (Object.prototype.hasOwnProperty.call(body, "leader")) {
    data.leader = body.leader ? String(body.leader).trim() : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "deputy")) {
    data.deputy = body.deputy ? String(body.deputy).trim() : null;
  }
  try {
    const updated = await db.unit.update({ where: { id }, data });
    return Response.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "update failed";
    if (msg.includes("Unique constraint failed") || msg.includes("Unit_name_key") || msg.includes("P2002")) {
      return Response.json({ error: "unit name already exists" }, { status: 409 });
    }
    return Response.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await db.employee.updateMany({ where: { unitId: id }, data: { unitId: null } });
  await db.unit.delete({ where: { id } });
  return Response.json({ ok: true });
}
