"use client";

import { useEffect, useMemo, useState } from "react";

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  startDate: string | Date;
  birthDate: string | Date;
  lockAll: boolean;
  lockFirstName: boolean;
  lockLastName: boolean;
  lockStartDate: boolean;
  lockBirthDate: boolean;
  lockEmail: boolean;
};

export default function EmployeesPage() {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<EmployeeRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    if (!input?.files?.[0]) {
      setStatus("Bitte eine .xlsx-Datei auswählen.");
      return;
    }
    const fd = new FormData();
    fd.append("file", input.files[0]);
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Fehler: ${data?.error ?? res.statusText}`);
      } else {
        setStatus(`Import: neu=${data.created}, aktualisiert=${data.updated}, übersprungen=${data.skippedLocked}`);
        await load();
      }
    } catch {
      setStatus("Unerwarteter Fehler beim Upload.");
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setItems(data as EmployeeRow[]);
    } finally {
      setLoading(false);
    }
  }

  async function save(row: EmployeeRow) {
    const payload = { ...row };
    const res = await fetch("/api/employees", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Fehler beim Speichern: ${j?.error ?? res.statusText}`);
    } else {
      setStatus("Gespeichert");
      await load();
    }
  }

  function onFieldChange(id: string, key: string, value: unknown) {
    if (!items) return;
    setItems(items.map((it) => (it.id === id ? { ...it, [key]: value } : it)));
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!items) return [] as EmployeeRow[];
    if (!q) return items;
    return items.filter((e) =>
      `${e.lastName} ${e.firstName} ${e.email ?? ""}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil((filtered?.length ?? 0) / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mitarbeiter</h1>
        <p className="text-zinc-600 mt-2">Excel-Import (.xlsx) – Spalten: Name, Vorname | Nachname | Eintrittsdatum | Geburtstag</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 w-full max-w-lg" encType="multipart/form-data">
        <input type="file" name="file" accept=".xlsx" className="border rounded p-2" />
        <button disabled={busy} className="rounded bg-black text-white px-4 py-2 disabled:opacity-50">
          {busy ? "Import läuft …" : "Import starten"}
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={load} className="rounded border px-3 py-1">Liste neu laden</button>
        <a href="/api/template" className="rounded border px-3 py-1">Excel-Vorlage laden</a>
        <a href="/api/employees/export.csv" className="rounded border px-3 py-1">Export CSV</a>
        <a href="/api/employees/export.xlsx" className="rounded border px-3 py-1">Export XLSX</a>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Suche (Name/Email)"
          className="border rounded p-2 flex-1 min-w-[220px]"
        />
        {loading && <span className="text-sm text-zinc-600">Lade…</span>}
      </div>
      {status && <p className="text-sm text-zinc-700">{status}</p>}

      {items && filtered && (
        <div className="overflow-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Nachname</th>
                <th className="p-2">Vorname</th>
                <th className="p-2">Email</th>
                <th className="p-2">Eintritt</th>
                <th className="p-2">Geburtstag</th>
                <th className="p-2">Locks</th>
                <th className="p-2">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((it) => (
                <tr key={it.id} className="border-b">
                  <td className="p-2">
                    <input className="border rounded p-1 w-full" value={it.lastName ?? ""} onChange={(e) => onFieldChange(it.id, "lastName", e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input className="border rounded p-1 w-full" value={it.firstName ?? ""} onChange={(e) => onFieldChange(it.id, "firstName", e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input className="border rounded p-1 w-full" value={it.email ?? ""} onChange={(e) => onFieldChange(it.id, "email", e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="date" className="border rounded p-1" value={it.startDate ? String(it.startDate).slice(0,10) : ""} onChange={(e) => onFieldChange(it.id, "startDate", e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="date" className="border rounded p-1" value={it.birthDate ? String(it.birthDate).slice(0,10) : ""} onChange={(e) => onFieldChange(it.id, "birthDate", e.target.value)} />
                  </td>
                  <td className="p-2">
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!it.lockAll} onChange={(e) => onFieldChange(it.id, "lockAll", e.target.checked)} /> Datensatz</label>
                      <div className="grid grid-cols-3 gap-x-3">
                        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!it.lockFirstName} onChange={(e) => onFieldChange(it.id, "lockFirstName", e.target.checked)} /> Vorname</label>
                        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!it.lockLastName} onChange={(e) => onFieldChange(it.id, "lockLastName", e.target.checked)} /> Nachname</label>
                        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!it.lockEmail} onChange={(e) => onFieldChange(it.id, "lockEmail", e.target.checked)} /> Email</label>
                        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!it.lockStartDate} onChange={(e) => onFieldChange(it.id, "lockStartDate", e.target.checked)} /> Eintritt</label>
                        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!it.lockBirthDate} onChange={(e) => onFieldChange(it.id, "lockBirthDate", e.target.checked)} /> Geburtstag</label>
                      </div>
                    </div>
                  </td>
                  <td className="p-2">
                    <button onClick={() => save(it)} className="rounded bg-black text-white px-3 py-1">Speichern</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-3 text-sm">
            <span>{filtered.length} Einträge</span>
            <div className="flex items-center gap-2">
              <button disabled={currentPage<=1} onClick={() => setPage((p) => Math.max(1, p-1))} className="border rounded px-2 py-1 disabled:opacity-50">Zurück</button>
              <span>Seite {currentPage} / {totalPages}</span>
              <button disabled={currentPage>=totalPages} onClick={() => setPage((p) => Math.min(totalPages, p+1))} className="border rounded px-2 py-1 disabled:opacity-50">Weiter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
