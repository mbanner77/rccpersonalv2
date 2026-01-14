import { db } from "@/lib/prisma";

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const rows = await db.employee.findMany({ orderBy: { lastName: "asc" } });
  const header = [
    "firstName",
    "lastName",
    "email",
    "startDate",
    "birthDate",
    "lockAll",
    "lockFirstName",
    "lockLastName",
    "lockStartDate",
    "lockBirthDate",
    "lockEmail",
  ];

  const lines: string[] = [];
  lines.push(header.join(","));
  for (const r of rows) {
    const fmtBool = (b: boolean) => b ? "WAHR" : "FALSCH";
    const vals = [
      r.firstName,
      r.lastName,
      r.email ?? "",
      fmt(r.startDate),
      fmt(r.birthDate),
      fmtBool(r.lockAll),
      fmtBool(r.lockFirstName),
      fmtBool(r.lockLastName),
      fmtBool(r.lockStartDate),
      fmtBool(r.lockBirthDate),
      fmtBool(r.lockEmail),
    ];
    const escaped = vals.map((v) =>
      /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
    );
    lines.push(escaped.join(","));
  }

  const body = lines.join("\n");
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=employees.csv",
      "cache-control": "no-store",
    },
  });
}
