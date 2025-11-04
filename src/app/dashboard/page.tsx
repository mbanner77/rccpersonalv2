export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { findUpcomingJubilees, parseJubileeYears, type EmployeeLike, isBirthday } from "@/lib/jubilee";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const [settings, employees] = await Promise.all([
    db.setting.findUnique({ where: { id: 1 } }),
    db.employee.findMany({ orderBy: { lastName: "asc" } }),
  ]);
  const years = parseJubileeYears(settings);
  const employeesLike = employees as unknown as EmployeeLike[];
  const daysParam = Array.isArray(searchParams?.days) ? searchParams?.days[0] : searchParams?.days;
  const windowDays = Math.max(1, Math.min(365, Number(daysParam ?? 30) || 30));
  const hitsWindow = findUpcomingJubilees(employeesLike, years, windowDays);
  const hits7 = findUpcomingJubilees(employeesLike, years, 7);
  const birthdaysToday = employees.reduce((count: number, e: { birthDate: Date }) => count + (isBirthday(new Date(e.birthDate)) ? 1 : 0), 0);

  const grouped = hitsWindow.reduce<Record<number, typeof hitsWindow>>((acc, h) => {
    (acc[h.years] ||= []).push(h);
    return acc;
  }, {});
  const order = Object.keys(grouped)
    .map((n) => parseInt(n, 10))
    .sort((a, b) => a - b);

  const now = new Date();
  const yearParam = Array.isArray(searchParams?.year) ? searchParams?.year[0] : searchParams?.year;
  const currYear = Number(yearParam ?? now.getFullYear()) || now.getFullYear();
  const monthLabels = ["Jan","Feb","Mrz","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

  const birthdaysPerMonth = Array.from({ length: 12 }, () => 0);
  for (const e of employees) {
    const d = new Date(e.birthDate);
    birthdaysPerMonth[d.getMonth()]++;
  }

  const hiresPerMonth = Array.from({ length: 12 }, () => 0);
  for (const e of employees) {
    const s = new Date(e.startDate);
    if (s.getFullYear() === currYear) hiresPerMonth[s.getMonth()]++;
  }

  const jubileesPerMonth = Array.from({ length: 12 }, () => 0);
  for (const e of employees) {
    const start = new Date(e.startDate);
    const anniv = new Date(currYear, start.getMonth(), start.getDate());
    const yrs = currYear - start.getFullYear();
    if (yrs > 0 && years.includes(yrs)) {
      jubileesPerMonth[anniv.getMonth()]++;
    }
  }

  function Chart({ data, title }: { data: number[]; title: string }) {
    const max = Math.max(1, ...data);
    const w = 560;
    const h = 140;
    const barW = w / data.length;
    return (
      <div className="rounded-lg border p-4 bg-white dark:bg-zinc-900">
        <div className="mb-2 text-sm text-zinc-600">{title}</div>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          {data.map((v, i) => {
            const bh = Math.round((v / max) * (h - 24));
            const x = i * barW + 6;
            const y = h - 6 - bh;
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW - 12} height={bh} rx={3} className="fill-zinc-800 dark:fill-zinc-200" />
                <text x={x + (barW - 12) / 2} y={h - 8} textAnchor="middle" fontSize="10" className="fill-zinc-600">{monthLabels[i]}</text>
              </g>
            );
          })}
        </svg>
        <div className="mt-2 text-xs text-zinc-600">Max: {max}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-600">Zeitraum:</span>
        {[7, 30, 60, 90].map((d) => (
          <a
            key={d}
            href={`?days=${d}&year=${currYear}`}
            className={`rounded border px-2 py-1 ${d === windowDays ? "bg-black text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            {d} Tage
          </a>
        ))}
        <span className="ml-4 text-zinc-600">Jahr:</span>
        <a href={`?days=${windowDays}&year=${currYear - 1}`} className="rounded border px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">{currYear - 1}</a>
        <a href={`?days=${windowDays}&year=${currYear}`} className="rounded border px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 {currYear === new Date().getFullYear() ? 'bg-black text-white' : ''}">{currYear}</a>
        <a href={`?days=${windowDays}&year=${currYear + 1}`} className="rounded border px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">{currYear + 1}</a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 bg-white dark:bg-zinc-900">
          <div className="text-sm text-zinc-500">Jubiläen (7 Tage)</div>
          <div className="text-3xl font-semibold">{hits7.length}</div>
        </div>
        <div className="rounded-lg border p-4 bg-white dark:bg-zinc-900">
          <div className="text-sm text-zinc-500">Jubiläen ({windowDays} Tage)</div>
          <div className="text-3xl font-semibold">{hitsWindow.length}</div>
        </div>
        <div className="rounded-lg border p-4 bg-white dark:bg-zinc-900">
          <div className="text-sm text-zinc-500">Geburtstage heute</div>
          <div className="text-3xl font-semibold">{birthdaysToday}</div>
        </div>
      </div>

      <h2 className="text-xl font-medium">Jubiläen (nächste {windowDays} Tage)</h2>
      {order.length === 0 ? (
        <p className="text-zinc-600">Keine anstehenden Jubiläen.</p>
      ) : (
        order.map((y) => (
          <div key={y} className="space-y-2">
            <h2 className="text-xl font-medium">{y} Jahre</h2>
            <ul className="divide-y border rounded bg-white dark:bg-zinc-900">
              {grouped[y].map((h) => (
                <li key={h.employee.id} className="p-3 flex items-center justify-between">
                  <span>
                    {h.employee.lastName}, {h.employee.firstName}
                  </span>
                  <span className="text-sm text-zinc-600">
                    am {h.anniversaryDate.toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <h2 className="text-xl font-medium">Auswertungen {currYear}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Chart data={birthdaysPerMonth} title="Geburtstage pro Monat" />
        <Chart data={jubileesPerMonth} title="Jubiläen pro Monat" />
        <Chart data={hiresPerMonth} title="Eintritte pro Monat" />
      </div>
    </div>
  );
}
