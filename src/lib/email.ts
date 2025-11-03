import nodemailer from "nodemailer";

export type MailOptions = {
  to: string | string[];
  subject: string;
  html: string;
};

export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{{2}\s*(\w+)\s*\}{2}/g, (_, k: string) => String(vars[k] ?? ""));
}

export async function sendMail({ to, subject, html }: MailOptions) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    console.warn("SMTP not fully configured; skipping send.");
    return { skipped: true } as const;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, subject, html });
  return { ok: true } as const;
}
