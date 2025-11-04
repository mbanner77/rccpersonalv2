import Link from "next/link";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = {
  kind?: string;
  year?: string;
  month?: string;
  quarter?: string;
};

function fmt(d: Date) {
  return d.toLocaleDateString();
}

export default async function DrilldownPage({ searchParams }: { searchParams: SearchParams }) {
  const kind = (searchParams.kind ?? "").toString();
  const year = Number(searchParams.year ?? new Date().getFullYear());
  const month = searchParams.month !== undefined ? Number(searchParams.month) : null; // 0-11
  const quarter = searchParams.quarter !== undefined ? Number(searchParams.quarter) : null; // 0-3

  const employees = await db.employee.findMany({ orderBy: { lastName: "asc" } });

  const rows: { id: string; name: string; email: string; date: Date }[] = [];

  for (const e of employees) {
    if (kind === "birthdays") {
      const b = new Date(e.birthDate);
      const m = b.getMonth();
      if (month !== null && m !== month) continue;
      if (quarter !== null && Math.floor(m / 3) !== quarter) continue;
      rows.push({ id: e.id, name: `${e.lastName}, ${e.firstName}` , email: e.email ?? "", date: new Date(year, m, b.getDate()) });
    } else if (kind === "hires") {
      const s = new Date(e.startDate);
      if (s.getFullYear() !== year) continue;
      const m = s.getMonth();
      if (month !== null && m !== month) continue;
      if (quarter !== null && Math.floor(m / 3) !== quarter) continue;
      rows.push({ id: e.id, name: `${e.lastName}, ${e.firstName}`, email: e.email ?? "", date: s });
    } else if (kind === "jubilees") {
      const s = new Date(e.startDate);
      const m = s.getMonth();
      if (month !== null && m !== month) continue;
      if (quarter !== null && Math.floor(m / 3) !== quarter) continue;
      rows.push({ id: e.id, name: `${e.lastName}, ${e.firstName}`, email: e.email ?? "", date: new Date(year, m, s.getDate()) });
    }
  }

  rows.sort((a, b) => a.date.getTime() - b.date.getTime() || a.name.localeCompare(b.name));

  const backHref = "/dashboard";
  const exportHref = `/api/export/dashboard?kind=${encodeURIComponent(kind)}&year=${year}` +
    (month !== null ? `&month=${month}` : "") + (quarter !== null ? `&quarter=${quarter}` : "");

  const titleKind = kind === "birthdays" ? "Geburtstage" : kind === "hires" ? "Eintritte" : kind === "jubilees" ? "Jubiläen" : "Details";

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{titleKind} {year}</h1>
        <div className="flex items-center gap-2 text-sm">
          <a href={exportHref} className="rounded border px-3 py-1">CSV Export</a>
          <Link href={backHref} className="rounded border px-3 py-1">Zurück</Link>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-zinc-600">Keine Einträge.</p>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="text-left p-2 border">Name</th>
              <th className="text-left p-2 border">E-Mail</th>
              <th className="text-left p-2 border">Datum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-900 dark:even:bg-zinc-800">
                <td className="p-2 border">{r.name}</td>
                <td className="p-2 border">{r.email}</td>
                <td className="p-2 border">{fmt(r.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
