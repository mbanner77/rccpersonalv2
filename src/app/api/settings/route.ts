import { db } from "@/lib/prisma";
import { z } from "zod";

function defaultSettings() {
  return {
    managerEmails: "",
    birthdayEmailTemplate: "Happy Birthday, {{firstName}}!",
    jubileeEmailTemplate: "Congrats on {{years}} years, {{firstName}}!",
    jubileeYearsCsv: "5,10,15,20,25,30,35,40",
  };
}

export async function GET() {
  const found = await db.setting.findUnique({ where: { id: 1 } });
  if (!found) return Response.json(defaultSettings());
  return Response.json({
    managerEmails: found.managerEmails,
    birthdayEmailTemplate: found.birthdayEmailTemplate,
    jubileeEmailTemplate: found.jubileeEmailTemplate,
    jubileeYearsCsv: found.jubileeYearsCsv,
  });
}

export async function POST(req: Request) {
  const schema = z.object({
    managerEmails: z.string().transform((s) => s.trim()),
    birthdayEmailTemplate: z.string().min(1),
    jubileeEmailTemplate: z.string().min(1),
    jubileeYearsCsv: z
      .string()
      .transform((s) => s.replace(/\s+/g, ""))
      .refine((s) => /^\d+(,\d+)*$/.test(s), {
        message: "jubileeYearsCsv must be comma-separated integers",
      }),
  });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  await db.setting.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  return Response.json({ ok: true });
}
