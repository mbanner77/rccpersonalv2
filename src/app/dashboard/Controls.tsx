"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = { years: number[] };

export default function Controls({ years }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const days = Math.max(1, Math.min(365, Number(sp.get("days") ?? 30) || 30));
  const year = Number(sp.get("year") ?? new Date().getFullYear()) || new Date().getFullYear();

  function setParam(next: { days?: number; year?: number }) {
    const params = new URLSearchParams(sp.toString());
    if (next.days !== undefined) params.set("days", String(next.days));
    if (next.year !== undefined) params.set("year", String(next.year));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-zinc-600">Zeitraum:</span>
      {[7, 30, 60, 90].map((d) => (
        <button
          key={d}
          onClick={() => setParam({ days: d })}
          className={`rounded border px-2 py-1 ${d === days ? "bg-black text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          aria-pressed={d === days}
        >
          {d} Tage
        </button>
      ))}
      <span className="ml-4 text-zinc-600">Jahr:</span>
      {years.map((y) => (
        <button
          key={y}
          onClick={() => setParam({ year: y })}
          className={`rounded border px-2 py-1 ${y === year ? "bg-black text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          aria-pressed={y === year}
        >
          {y}
        </button>
      ))}
    </div>
  );
}
