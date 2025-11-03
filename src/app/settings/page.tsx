"use client";

import { useEffect, useState } from "react";

type SettingsDto = {
  managerEmails: string;
  birthdayEmailTemplate: string;
  jubileeEmailTemplate: string;
  jubileeYearsCsv: string;
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      setData(json);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const ok = res.ok;
    setSaving(false);
    setMsg(ok ? "Gespeichert" : "Fehler beim Speichern");
  }

  function update<K extends keyof SettingsDto>(key: K, value: SettingsDto[K]) {
    if (!data) return;
    setData({ ...data, [key]: value });
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      {!data ? (
        <p className="text-zinc-600">Lade…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium">Manager-Verteiler (Komma-getrennt)</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={data.managerEmails}
              onChange={(e) => update("managerEmails", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Jubiläumsjahre (CSV)</label>
            <input
              className="mt-1 w-full border rounded p-2"
              value={data.jubileeYearsCsv}
              onChange={(e) => update("jubileeYearsCsv", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Geburtstags-Template</label>
            <textarea
              className="mt-1 w-full border rounded p-2 h-28"
              value={data.birthdayEmailTemplate}
              onChange={(e) => update("birthdayEmailTemplate", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Jubiläums-Template</label>
            <textarea
              className="mt-1 w-full border rounded p-2 h-28"
              value={data.jubileeEmailTemplate}
              onChange={(e) => update("jubileeEmailTemplate", e.target.value)}
            />
          </div>
          <button disabled={saving} className="rounded bg-black text-white px-4 py-2 disabled:opacity-50">
            {saving ? "Speichern…" : "Speichern"}
          </button>
          {msg && <p className="text-sm text-zinc-700">{msg}</p>}
        </form>
      )}
    </div>
  );
}
