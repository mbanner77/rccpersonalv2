"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/hooks/useSession";

type ReminderType = "GEHALT" | "MEILENSTEIN" | "SONDERBONUS" | "STAFFELBONUS" | "URLAUBSGELD" | "WEIHNACHTSGELD";

type Employee = { id: string; firstName: string; lastName: string; email: string | null };

type Schedule = { label: string; daysBefore: number; timeOfDay?: string | null; orderIndex?: number };

type Recipient = { email: string; orderIndex?: number };

type Reminder = {
  id: string;
  type: ReminderType;
  description?: string | null;
  employeeId: string;
  dueDate: string;
  active: boolean;
  employee?: Employee;
  schedules: Array<Required<Schedule>>;
  recipients: Array<Required<Recipient>>;
};

type FormState = {
  id?: string;
  type: ReminderType;
  description: string;
  employeeId: string;
  dueDate: string; // yyyy-mm-dd
  active: boolean;
  schedules: Schedule[];
  recipients: Recipient[];
};

const TYPES: ReminderType[] = ["GEHALT", "MEILENSTEIN", "SONDERBONUS", "STAFFELBONUS", "URLAUBSGELD", "WEIHNACHTSGELD"];

const EMPTY: FormState = {
  type: "GEHALT",
  description: "",
  employeeId: "",
  dueDate: new Date().toISOString().slice(0, 10),
  active: true,
  schedules: [
    { label: "1 Woche vorher", daysBefore: 7, timeOfDay: "09:00", orderIndex: 0 },
    { label: "1 Tag vorher", daysBefore: 1, timeOfDay: "09:00", orderIndex: 1 },
    { label: "Fälligkeit", daysBefore: 0, timeOfDay: "09:00", orderIndex: 2 },
  ],
  recipients: [],
};

function parseApiError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (Array.isArray(error)) return (error as unknown[]).map((e) => parseApiError(e, "")).filter(Boolean).join("\n") || fallback;
  if (typeof error === "object") {
    const msg = (error as any).message;
    if (typeof msg === "string" && msg.trim()) return msg;
    const f = (error as any).formErrors ?? [];
    const r = (error as any).fieldErrors ?? {};
    const all = [...f, ...Object.values(r).flat()];
    if (all.length) return all.join("\n");
  }
  return fallback;
}

export default function RemindersPage() {
  const { user } = useSession();
  const isAllowed = user?.role === "ADMIN" || user?.role === "UNIT_LEAD";

  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/reminders", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Reminder[];
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      setEmployeesLoading(true);
      const res = await fetch("/api/employees", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEmployees(
          (data as any[]).map((r) => ({ id: r.id, firstName: r.firstName, lastName: r.lastName, email: r.email ?? null }))
        );
      }
    } finally {
      setEmployeesLoading(false);
    }
  }

  useEffect(() => {
    if (isAllowed) {
      void load();
      void loadEmployees();
    }
  }, [isAllowed]);

  const sorted = useMemo(
    () => items.slice().sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [items]
  );

  const openCreate = () => {
    setForm({ ...EMPTY });
    setDialogOpen(true);
  };

  const openEdit = (r: Reminder) => {
    setForm({
      id: r.id,
      type: r.type,
      description: r.description ?? "",
      employeeId: r.employeeId,
      dueDate: r.dueDate.substring(0, 10),
      active: r.active,
      schedules: r.schedules.map((s) => ({ label: s.label, daysBefore: s.daysBefore, timeOfDay: s.timeOfDay ?? null, orderIndex: s.orderIndex })),
      recipients: r.recipients.map((x) => ({ email: x.email, orderIndex: x.orderIndex })),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setForm({ ...EMPTY });
    setSaving(false);
  };

  async function submit() {
    setSaving(true);
    try {
      // Parse semicolon-separated emails into individual recipient entries
      const allRecipients: Recipient[] = [];
      form.recipients.forEach((r) => {
        const emails = r.email.split(/[;,]/).map((e) => e.trim()).filter(Boolean);
        emails.forEach((email) => allRecipients.push({ email, orderIndex: allRecipients.length }));
      });
      if (allRecipients.length === 0) {
        throw new Error("Mindestens ein Empfänger erforderlich");
      }
      const payload = {
        ...(form.id ? { id: form.id } : {}),
        type: form.type,
        description: form.description.trim() || undefined,
        employeeId: form.employeeId,
        dueDate: new Date(form.dueDate),
        active: form.active,
        schedules: form.schedules.map((s, i) => ({ label: s.label.trim(), daysBefore: s.daysBefore | 0, timeOfDay: s.timeOfDay?.trim() || undefined, orderIndex: s.orderIndex ?? i })),
        recipients: allRecipients,
      };
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/reminders", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(parseApiError(json?.error ?? json, "Speichern fehlgeschlagen"));
      await load();
      closeDialog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Wirklich löschen?")) return;
    const res = await fetch("/api/admin/reminders", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) await load();
  }

  const employeeLabel = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.lastName}, ${e.firstName}${e.email ? ` (${e.email})` : ""}` : id;
  };

  if (!isAllowed) return <div className="p-6 text-sm text-red-600">Zugriff verweigert</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Erinnerungen</h1>
          <p className="text-sm text-zinc-600">Einmalige Erinnerungen mit mehreren Hinweisen und Empfängern.</p>
        </div>
        <button onClick={openCreate} className="rounded bg-black px-4 py-2 text-sm font-medium text-white">Neu</button>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-zinc-500">Lade…</div>}

      <div className="divide-y rounded border">
        {sorted.map((r) => (
          <div key={r.id} className="grid grid-cols-7 items-center gap-2 p-3 text-sm">
            <div className="font-medium">{r.type}</div>
            <div className="col-span-2 truncate text-zinc-700">{r.description || "—"}</div>
            <div className="text-zinc-700">{employeeLabel(r.employeeId)}</div>
            <div className="text-zinc-700">{new Date(r.dueDate).toLocaleDateString()}</div>
            <div className="text-zinc-500">{r.schedules.length} Erinnerungen</div>
            <div className="flex items-center justify-end gap-2">
              {!r.active && <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-700">inaktiv</span>}
              <button onClick={() => openEdit(r)} className="rounded border px-3 py-1">Bearbeiten</button>
              <button onClick={() => remove(r.id)} className="rounded border border-red-300 px-3 py-1 text-red-700">Löschen</button>
            </div>
          </div>
        ))}
        {sorted.length === 0 && !loading && (
          <div className="p-6 text-center text-sm text-zinc-500">Keine Erinnerungen vorhanden.</div>
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{form.id ? "Erinnerung bearbeiten" : "Neue Erinnerung"}</h2>
              <button onClick={closeDialog} className="text-sm text-zinc-500">Schließen</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-600">Typ</span>
                <select className="rounded border px-3 py-2" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ReminderType }))}>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-600">Fälligkeit</span>
                <input type="date" className="rounded border px-3 py-2" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs text-zinc-600">Beschreibung</span>
                <textarea className="min-h-[70px] rounded border px-3 py-2" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs text-zinc-600">Berechtigter</span>
                <select className="rounded border px-3 py-2" value={form.employeeId} onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}>
                  <option value="">Bitte wählen…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.lastName}, {e.firstName}{e.email ? ` (${e.email})` : ""}
                    </option>
                  ))}
                </select>
                {employeesLoading && <span className="text-xs text-zinc-500">Lade Mitarbeitende…</span>}
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} /> Aktiv
              </label>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Erinnerungen</h3>
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => setForm((p) => ({ ...p, schedules: [...p.schedules, { label: "Neue Erinnerung", daysBefore: 0, timeOfDay: "09:00", orderIndex: p.schedules.length }] }))}
                  >
                    + Hinzufügen
                  </button>
                </div>
                <div className="space-y-2">
                  {form.schedules.map((s, i) => (
                    <div key={i} className="grid grid-cols-10 items-center gap-2">
                      <input className="col-span-4 rounded border px-3 py-2" placeholder="Bezeichnung" value={s.label} onChange={(e) => setForm((p) => { const list = p.schedules.slice(); list[i] = { ...list[i], label: e.target.value }; return { ...p, schedules: list }; })} />
                      <input type="number" className="col-span-2 rounded border px-3 py-2" placeholder="Tage vorher" value={s.daysBefore} onChange={(e) => setForm((p) => { const list = p.schedules.slice(); list[i] = { ...list[i], daysBefore: Number(e.target.value) }; return { ...p, schedules: list }; })} />
                      <input className="col-span-2 rounded border px-3 py-2" placeholder="Zeit (HH:mm)" value={s.timeOfDay ?? ""} onChange={(e) => setForm((p) => { const list = p.schedules.slice(); list[i] = { ...list[i], timeOfDay: e.target.value || null }; return { ...p, schedules: list }; })} />
                      <button className="col-span-2 rounded border border-red-300 px-2 py-2 text-xs text-red-700" onClick={() => setForm((p) => ({ ...p, schedules: p.schedules.filter((_, idx) => idx !== i) }))}>Entfernen</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Empfänger</h3>
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => setForm((p) => ({ ...p, recipients: [...p.recipients, { email: "" }] }))}
                  >
                    + Hinzufügen
                  </button>
                </div>
                <div className="space-y-2">
                  {form.recipients.map((r, i) => (
                    <div key={i} className="grid grid-cols-10 items-center gap-2">
                      <input className="col-span-8 rounded border px-3 py-2" placeholder="E-Mail" value={r.email} onChange={(e) => setForm((p) => { const list = p.recipients.slice(); list[i] = { ...list[i], email: e.target.value }; return { ...p, recipients: list }; })} />
                      <button className="col-span-2 rounded border border-red-300 px-2 py-2 text-xs text-red-700" onClick={() => setForm((p) => ({ ...p, recipients: p.recipients.filter((_, idx) => idx !== i) }))}>Entfernen</button>
                    </div>
                  ))}
                  {form.recipients.length === 0 && (
                    <div className="text-xs text-zinc-600">Tipp: Mehrere Adressen per Semikolon einfügen.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={closeDialog} className="rounded border px-3 py-2 text-sm">Abbrechen</button>
              <button onClick={submit} disabled={saving || !form.employeeId} className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Speichern…" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
