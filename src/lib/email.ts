import nodemailer from "nodemailer";
import { db } from "@/lib/prisma";

type TransportInfo = {
  messageId?: string;
};

export type MailOptions = {
  to: string | string[];
  subject: string;
  html: string;
};

export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{{2}\s*(\w+)\s*\}{2}/g, (_, k: string) => String(vars[k] ?? ""));
}

export async function sendMail({ to, subject, html }: MailOptions) {
  // Load SMTP settings from database (Setting table)
  const s = await db.setting.findUnique({ where: { id: 1 } });
  
  // Defaults (fallback)
  const defaultHost = "smtp.strato.de";
  const defaultPort = 465;
  const defaultUser = "rccpersonal@futurestore.shop";
  const defaultPass = "";
  const defaultFrom = defaultUser;

  // Use database settings first, then env vars as fallback, then defaults
  const host = s?.smtpHost || process.env.SMTP_HOST || defaultHost;
  const port = Number(s?.smtpPort ?? process.env.SMTP_PORT ?? defaultPort);
  const user = s?.smtpUser || process.env.SMTP_USER || defaultUser;
  const pass = s?.smtpPass || process.env.SMTP_PASS || defaultPass;
  const from = s?.smtpFrom || process.env.SMTP_FROM || user || defaultFrom;
  const secure = typeof s?.smtpSecure === "boolean" ? s.smtpSecure : port === 465;
  const rejectUnauthorized = typeof s?.smtpRejectUnauthorized === "boolean" ? s.smtpRejectUnauthorized : true;

  if (!host || !user || !pass || !from) {
    console.warn("SMTP not fully configured; skipping send.");
    return { skipped: true } as const;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized },
  });

  const info: TransportInfo = await transporter.sendMail({ from, to, subject, html });
  return { ok: true, messageId: info.messageId ?? undefined } as const;
}
