import { db } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

function defaultSettings() {
  return {
    managerEmails: "",
    birthdayEmailTemplate: "Happy Birthday, {{firstName}}!",
    jubileeEmailTemplate: "Congrats on {{years}} years, {{firstName}}!",
    jubileeYearsCsv: "5,10,15,20,25,30,35,40",
    smtpHost: "smtp.strato.de",
    smtpPort: 465,
    smtpUser: "rccpersonal@futurestore.shop",
    smtpPass: "",
    smtpFrom: "rccpersonal@futurestore.shop",
    smtpSecure: true,
    smtpRejectUnauthorized: true,
    sendOnBirthday: true,
    sendOnJubilee: true,
    dailySendHour: 8,
    // Certificate settings
    certCompanyName: "RealCore Consulting GmbH",
    certCompanyStreet: "",
    certCompanyCity: "",
    certCompanyPhone: "",
    certCompanyWebsite: "",
    certCompanyLogo: "https://realcore.info/bilder/rc-logo.png",
    certCompanyIntro: "Die RealCore Consulting GmbH ist ein führendes Beratungsunternehmen im Bereich IT, mit einem besonderen Schwerpunkt auf der SAP-Technologie. Das Unternehmen unterstützt seine Kunden bei der Implementierung und Optimierung von SAP-Lösungen, um deren Geschäftsprozesse effizienter zu gestalten. Dabei legt RealCore besonderen Wert auf eine partnerschaftliche Zusammenarbeit und die Entwicklung maßgeschneiderter Lösungen, um den individuellen Anforderungen der Kunden gerecht zu werden. Ziel ist es, durch praxisorientierte Beratung und exzellente Expertise nachhaltige Erfolge und eine hohe Kundenzufriedenheit sicherzustellen.",
  };
}

export async function GET() {
  await requireAdmin();
  const defaults = defaultSettings();
  let found = await db.setting.findUnique({ where: { id: 1 } });
  if (!found) {
    // create settings with defaults on first GET so values are persisted
    found = await db.setting.create({ data: { id: 1, ...defaults } });
  } else {
    // ensure smtp defaults are persisted if fields are blank
    const patch: Partial<typeof defaults> = {};
    if (!found.smtpHost) patch.smtpHost = defaults.smtpHost;
    if (!found.smtpPort) patch.smtpPort = defaults.smtpPort;
    if (!found.smtpUser) patch.smtpUser = defaults.smtpUser;
    if (!found.smtpPass) patch.smtpPass = defaults.smtpPass;
    if (!found.smtpFrom) patch.smtpFrom = defaults.smtpFrom;
    if (typeof found.smtpSecure !== "boolean") patch.smtpSecure = defaults.smtpSecure;
    if (typeof found.smtpRejectUnauthorized !== "boolean") patch.smtpRejectUnauthorized = defaults.smtpRejectUnauthorized;
    if (Object.keys(patch).length > 0) {
      found = await db.setting.update({ where: { id: 1 }, data: patch });
    }
  }
  // Handle potentially missing certificate fields for backwards compatibility
  const certFields = found as typeof found & {
    certCompanyName?: string;
    certCompanyStreet?: string;
    certCompanyCity?: string;
    certCompanyPhone?: string;
    certCompanyWebsite?: string;
    certCompanyLogo?: string;
    certCompanyIntro?: string;
  };
  return Response.json({
    managerEmails: found.managerEmails,
    birthdayEmailTemplate: found.birthdayEmailTemplate,
    jubileeEmailTemplate: found.jubileeEmailTemplate,
    jubileeYearsCsv: found.jubileeYearsCsv,
    smtpHost: found.smtpHost,
    smtpPort: found.smtpPort,
    smtpUser: found.smtpUser,
    smtpPass: found.smtpPass,
    smtpFrom: found.smtpFrom,
    smtpSecure: found.smtpSecure,
    smtpRejectUnauthorized: found.smtpRejectUnauthorized,
    sendOnBirthday: found.sendOnBirthday,
    sendOnJubilee: found.sendOnJubilee,
    dailySendHour: found.dailySendHour,
    // Certificate settings
    certCompanyName: certFields.certCompanyName ?? defaults.certCompanyName,
    certCompanyStreet: certFields.certCompanyStreet ?? defaults.certCompanyStreet,
    certCompanyCity: certFields.certCompanyCity ?? defaults.certCompanyCity,
    certCompanyPhone: certFields.certCompanyPhone ?? defaults.certCompanyPhone,
    certCompanyWebsite: certFields.certCompanyWebsite ?? defaults.certCompanyWebsite,
    certCompanyLogo: certFields.certCompanyLogo ?? defaults.certCompanyLogo,
    certCompanyIntro: certFields.certCompanyIntro ?? defaults.certCompanyIntro,
  });
}

export async function POST(req: Request) {
  await requireAdmin();
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
    smtpHost: z.string().optional().transform((s) => s?.trim() ?? ""),
    smtpPort: z.coerce.number().int().min(1).max(65535).default(465),
    smtpUser: z.string().optional().transform((s) => s?.trim() ?? ""),
    smtpPass: z.string().optional().transform((s) => s?.trim() ?? ""),
    smtpFrom: z.string().optional().transform((s) => s?.trim() ?? ""),
    smtpSecure: z.coerce.boolean().default(true),
    smtpRejectUnauthorized: z.coerce.boolean().default(true),
    sendOnBirthday: z.coerce.boolean().default(true),
    sendOnJubilee: z.coerce.boolean().default(true),
    dailySendHour: z.coerce.number().int().min(0).max(23).default(8),
    // Certificate settings
    certCompanyName: z.string().optional().transform((s) => s?.trim() ?? ""),
    certCompanyStreet: z.string().optional().transform((s) => s?.trim() ?? ""),
    certCompanyCity: z.string().optional().transform((s) => s?.trim() ?? ""),
    certCompanyPhone: z.string().optional().transform((s) => s?.trim() ?? ""),
    certCompanyWebsite: z.string().optional().transform((s) => s?.trim() ?? ""),
    certCompanyLogo: z.string().optional().transform((s) => s?.trim() ?? ""),
    certCompanyIntro: z.string().optional().transform((s) => s?.trim() ?? ""),
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
