"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/hooks/useSession";

type Role = { id: string; key: string; label: string; description?: string | null; type?: "ONBOARDING" | "OFFBOARDING" | null; orderIndex: number; active: boolean };

type FormState = {
  id?: string;
  key: string;
  label: string;
  description: string;
  type: "" | "ONBOARDING" | "OFFBOARDING";
  orderIndex: string;
  active: boolean;
};

const EMPTY: FormState = { key: "", label: "", description: "", type: "", orderIndex: "0", active: true };

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

export default function RolesPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";

  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/lifecycle/roles", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Role[];
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  const openCreate = () => { setForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (r: Role) => {
    setForm({ id: r.id, key: r.key, label: r.label, description: r.description ?? "", type: (r.type ?? "") as FormState["type"], orderIndex: String(r.orderIndex), active: r.active });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setForm({ ...EMPTY }); setSaving(false); };

  async function submit() {
    setSaving(true);
    try {
      const payload: any = {
        key: form.key.trim(),
        label: form.label.trim(),
        description: form.description.trim() || undefined,
        type: form.type || undefined,
        orderIndex: Number.parseInt(form.orderIndex, 10) || 0,
        active: form.active,
      };
      const method = form.id ? "PATCH" : "POST";
      if (form.id) payload.id = form.id;
      const res = await fetch("/api/admin/lifecycle/roles", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
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

  const sorted = useMemo(() => items.slice().sort((a, b) => a.orderIndex - b.orderIndex || a.label.localeCompare(b.label)), [items]);

  if (!isAdmin) return <div className="p-6 text-sm text-red-600">Zugriff verweigert</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lifecycle-Rollen</h1>
          <p className="text-sm text-zinc-600">Definiere Rollen, die Aufgaben besitzen.</p>
        </div>
        <button onClick={openCreate} className="rounded bg-black px-4 py-2 text-sm font-medium text-white">Neu</button>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-zinc-500">Lade…</div>}

      <div className="divide-y rounded border">
        {sorted.map((r) => (
          <div key={r.id} className="grid grid-cols-6 items-center gap-2 p-3 text-sm">
            <div className="col-span-2 font-medium">{r.label}</div>
            <div className="text-zinc-500">{r.key}</div>
            <div className="text-zinc-500">{r.type ?? "-"}</div>
            <div className="text-zinc-500">#{r.orderIndex}</div>
            <div className="flex items-center justify-end gap-2">
              {!r.active && <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-700">inaktiv</span>}
              <button onClick={() => openEdit(r)} className="rounded border px-3 py-1">Bearbeiten</button>
            </div>
          </div>
        ))}
        {sorted.length === 0 && !loading && (
          <div className="p-6 text-center text-sm text-zinc-500">Keine Rollen vorhanden.</div>
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{form.id ? "Rolle bearbeiten" : "Neue Rolle"}</h2>
              <button onClick={closeDialog} className="text-sm text-zinc-500">Schließen</button>
            </div>
            <div className="grid gap-3 text-sm">
              <label className="flex flex-col gap-1"><span className="text-xs text-zinc-600">Schlüssel</span><input className="rounded border px-3 py-2" value={form.key} onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))} /></label>
              <label className="flex flex-col gap-1"><span className="text-xs text-zinc-600">Bezeichnung</span><input className="rounded border px-3 py-2" value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} /></label>
              <label className="flex flex-col gap-1"><span className="text-xs text-zinc-600">Beschreibung</span><textarea className="min-h-[80px] rounded border px-3 py-2" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></label>
              <label className="flex flex-col gap-1"><span className="text-xs text-zinc-600">Typ</span>
                <select className="rounded border px-3 py-2" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as FormState["type"] }))}>
                  <option value="">(keiner)</option>
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="OFFBOARDING">Offboarding</option>
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="text-xs text-zinc-600">Reihenfolge</span><input type="number" className="rounded border px-3 py-2" value={form.orderIndex} onChange={(e) => setForm((p) => ({ ...p, orderIndex: e.target.value }))} /></label>
              <label className="flex items-center gap-2 text-xs text-zinc-600"><input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} /> Aktiv</label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={closeDialog} className="rounded border px-3 py-2 text-sm">Abbrechen</button>
              <button onClick={submit} disabled={saving} className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Speichern…" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
