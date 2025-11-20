"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Task = {
  id: string;
  status: "OPEN" | "DONE" | "BLOCKED";
  dueDate: string;
  notes: string | null;
  employee: { id: string; firstName: string; lastName: string; email: string | null };
  template: { id: string; title: string; ownerRole: string; type: string };
};

export default function OffboardingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/lifecycle/tasks?type=OFFBOARDING`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Fehler beim Laden";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: Task["status"]) => {
    const prev = tasks;
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await fetch(`/api/lifecycle/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setTasks(prev);
    } else {
      load();
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-xl font-semibold">Offboarding-Aufgaben</h1>
      {loading && <div className="text-sm text-zinc-500">Laden…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="space-y-2">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded border p-3">
            <div className="min-w-0">
              <div className="truncate font-medium">{t.template.title}</div>
              <div className="text-xs text-zinc-500">
                Für: <Link className="underline" href={`/employees/${t.employee.id}`}>{t.employee.firstName} {t.employee.lastName}</Link>
                {" · Fällig: "}
                {new Date(t.dueDate).toLocaleDateString()}
                {t.notes ? ` · Notiz: ${t.notes}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded bg-zinc-100 px-2 py-1">{t.status}</span>
              <button className="rounded border px-2 py-1" onClick={() => updateStatus(t.id, "OPEN")}>Open</button>
              <button className="rounded border px-2 py-1" onClick={() => updateStatus(t.id, "DONE")}>Done</button>
              <button className="rounded border px-2 py-1" onClick={() => updateStatus(t.id, "BLOCKED")}>Blocked</button>
            </div>
          </div>
        ))}
        {!loading && tasks.length === 0 && <div className="text-sm text-zinc-500">Keine Aufgaben.</div>}
      </div>
    </div>
  );
}
