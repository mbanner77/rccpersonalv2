import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireUser, hasRole } from "@/lib/auth";

const CreateSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  orderIndex: z.number().int().optional(),
});

const UpdateSchema = z.object({
  id: z.string().cuid(),
  key: z.string().min(1).max(50).optional(),
  label: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  orderIndex: z.number().int().optional(),
});

const DeleteSchema = z.object({
  id: z.string().cuid(),
});

export async function GET() {
  try {
    const user = await requireUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const categories = await db.certificateCategory.findMany({
      orderBy: { orderIndex: "asc" },
      include: {
        _count: { select: { textBlocks: true } },
      },
    });

    return Response.json(categories);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const category = await db.certificateCategory.create({
      data: {
        key: parsed.data.key.toUpperCase(),
        label: parsed.data.label,
        description: parsed.data.description,
        orderIndex: parsed.data.orderIndex ?? 0,
      },
    });

    return Response.json(category, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, ...data } = parsed.data;
    if (data.key) data.key = data.key.toUpperCase();

    const category = await db.certificateCategory.update({
      where: { id },
      data,
    });

    return Response.json(category);
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

    await db.certificateCategory.delete({
      where: { id: parsed.data.id },
    });

    return Response.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}
