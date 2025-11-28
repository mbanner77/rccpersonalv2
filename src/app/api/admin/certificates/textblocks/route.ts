import { z } from "zod";
import { db } from "@/lib/prisma";
import { requireUser, hasRole } from "@/lib/auth";

const CreateSchema = z.object({
  categoryId: z.string().cuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  rating: z.number().int().min(1).max(5).default(2),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
});

const UpdateSchema = z.object({
  id: z.string().cuid(),
  categoryId: z.string().cuid().optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

const DeleteSchema = z.object({
  id: z.string().cuid(),
});

// Rating labels in German
const RATING_LABELS: Record<number, string> = {
  1: "Sehr gut",
  2: "Gut",
  3: "Befriedigend",
  4: "Ausreichend",
  5: "Mangelhaft",
};

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const url = new URL(req.url);
    const categoryId = url.searchParams.get("categoryId");
    const rating = url.searchParams.get("rating");

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (rating) where.rating = parseInt(rating, 10);

    const textBlocks = await db.certificateTextBlock.findMany({
      where,
      orderBy: [{ category: { orderIndex: "asc" } }, { rating: "asc" }, { title: "asc" }],
      include: {
        category: { select: { id: true, key: true, label: true } },
      },
    });

    // Add rating labels
    const result = textBlocks.map((block) => ({
      ...block,
      ratingLabel: RATING_LABELS[block.rating] ?? "Unbekannt",
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
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // If this is set as default, unset other defaults for same category/rating
    if (parsed.data.isDefault) {
      await db.certificateTextBlock.updateMany({
        where: {
          categoryId: parsed.data.categoryId,
          rating: parsed.data.rating,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const textBlock = await db.certificateTextBlock.create({
      data: parsed.data,
      include: {
        category: { select: { id: true, key: true, label: true } },
      },
    });

    return Response.json({
      ...textBlock,
      ratingLabel: RATING_LABELS[textBlock.rating] ?? "Unbekannt",
    }, { status: 201 });
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

    // If setting as default, unset other defaults
    if (data.isDefault) {
      const existing = await db.certificateTextBlock.findUnique({
        where: { id },
        select: { categoryId: true, rating: true },
      });
      if (existing) {
        await db.certificateTextBlock.updateMany({
          where: {
            categoryId: data.categoryId ?? existing.categoryId,
            rating: data.rating ?? existing.rating,
            isDefault: true,
            NOT: { id },
          },
          data: { isDefault: false },
        });
      }
    }

    const textBlock = await db.certificateTextBlock.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, key: true, label: true } },
      },
    });

    return Response.json({
      ...textBlock,
      ratingLabel: RATING_LABELS[textBlock.rating] ?? "Unbekannt",
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

    await db.certificateTextBlock.delete({
      where: { id: parsed.data.id },
    });

    return Response.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}
