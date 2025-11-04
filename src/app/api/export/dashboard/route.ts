import { db } from "@/lib/prisma";

function qParam(url: URL, key: string): string | null {
  const v = url.searchParams.get(key);
  return v !== null ? v : null;
}

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = qParam(url, "kind") as "birthdays" | "jubilees" | "hires" | null;
  const year = Number(qParam(url, "year") ?? new Date().getFullYear());
  const month = qParam(url, "month") !== null ? Number(qParam(url, "month")) : null; // 0-11
  const quarter = qParam(url, "quarter") !== null ? Number(qParam(url, "quarter")) : null; // 0-3

  if (!kind || Number.isNaN(year)) {
    return new Response("Invalid parameters", { status: 400 });
  }

  const employees = await db.employee.findMany({ orderBy: { lastName: "asc" } });

  const rows: { firstName: string; lastName: string; email: string; date: string; type: string }[] = [];

  for (const e of employees) {
    if (kind === "birthdays") {
      const b = new Date(e.birthDate);
      const m = b.getMonth();
      const d = new Date(year, m, b.getDate());
      if (month !== null && m !== month) continue;
      if (quarter !== null && Math.floor(m / 3) !== quarter) continue;
      rows.push({ firstName: e.firstName, lastName: e.lastName, email: e.email ?? "", date: fmt(d), type: "birthday" });
    } else if (kind === "hires") {
      const s = new Date(e.startDate);
      if (s.getFullYear() !== year) continue;
      const m = s.getMonth();
      if (month !== null && m !== month) continue;
      if (quarter !== null && Math.floor(m / 3) !== quarter) continue;
      rows.push({ firstName: e.firstName, lastName: e.lastName, email: e.email ?? "", date: fmt(s), type: "hire" });
    } else if (kind === "jubilees") {
      const s = new Date(e.startDate);
      const m = s.getMonth();
      const anniv = new Date(year, m, s.getDate());
      // we export all anniversaries in the selected month/quarter, independent of specific years-setting
      if (month !== null && m !== month) continue;
      if (quarter !== null && Math.floor(m / 3) !== quarter) continue;
      rows.push({ firstName: e.firstName, lastName: e.lastName, email: e.email ?? "", date: fmt(anniv), type: "jubilee" });
    }
  }

  const header = ["firstName","lastName","email","date","type"];
  const csv = [header.join(",")].concat(
    rows.map((r) => {
      const vals = [r.firstName, r.lastName, r.email, r.date, r.type];
      return vals.map((v) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)).join(",");
    })
  ).join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=dashboard-${kind}-${year}${month !== null ? "-m"+month : quarter !== null ? "-q"+quarter : ""}.csv`,
      "cache-control": "no-store",
    },
  });
}
