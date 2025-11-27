"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import Dialog, { DialogFooter, FormField, inputClassName, selectClassName, textareaClassName, checkboxContainerClassName, checkboxClassName } from "@/components/Dialog";

type TemplateType = "ONBOARDING" | "OFFBOARDING";

type Role = { id: string; key: string; label: string };

type LifecycleTemplate = {
  id: string;
  title: string;
  description: string | null;
  type: TemplateType;
  ownerRole: Role;
  relativeDueDays: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  title: string;
  description: string;
  type: TemplateType;
  ownerRoleId: string;
  relativeDueDays: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  type: "ONBOARDING",
  ownerRoleId: "",
  relativeDueDays: "0",
  active: true,
};

const TYPE_LABELS: Record<TemplateType, string> = {
  ONBOARDING: "Onboarding",
  OFFBOARDING: "Offboarding",
};

// Rollen werden dynamisch geladen

function parseApiError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    const messages = error
      .map((item) => parseApiError(item, ""))
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length) return messages.join("\n");
    return fallback;
  }
  if (typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
    const formErrors = (error as { formErrors?: string[] }).formErrors ?? [];
    const fieldErrorsRecord = (error as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
    const fieldErrors = Object.values(fieldErrorsRecord).flat().filter(Boolean);
    const combined = [...formErrors, ...fieldErrors];
    if (combined.length) {
      return combined.join("\n");
    }
  }
  return fallback;
}

export default function AdminLifecyclePage() {
  const { user, loading: sessionLoading, error: sessionError } = useSession();
  const [templates, setTemplates] = useState<LifecycleTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<LifecycleTemplate | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<TemplateType | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/lifecycle/templates");
      if (!res.ok) {
        throw new Error(`Vorlagen konnten nicht geladen werden (${res.status})`);
      }
      const json = (await res.json()) as LifecycleTemplate[];
      setTemplates(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await fetch("/api/admin/lifecycle/roles");
      if (!res.ok) throw new Error(`Rollen konnten nicht geladen werden (${res.status})`);
      const data = (await res.json()) as Role[];
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const seedData = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/admin/lifecycle/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Seed fehlgeschlagen");
      const r = json.results;
      setSeedResult(`Erstellt: ${r.roles.created} Rollen, ${r.statuses.created} Status, ${r.templates.created} Vorlagen`);
      // Reload data
      await loadTemplates();
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed fehlgeschlagen");
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadTemplates();
    void loadRoles();
  }, [isAdmin]);

  const filteredTemplates = useMemo(() => {
    const query = appliedSearch.trim().toLowerCase();
    return templates
      .filter((tpl) => (filterType === "ALL" ? true : tpl.type === filterType))
      .filter((tpl) =>
        query
          ? tpl.title.toLowerCase().includes(query) || (tpl.description?.toLowerCase() ?? "").includes(query)
          : true
      )
      .sort((a, b) => {
        if (a.type === b.type) return a.title.localeCompare(b.title);
        return a.type.localeCompare(b.type);
      });
  }, [templates, filterType, appliedSearch]);

  const openCreate = () => {
    setDialogMode("create");
    setActiveTemplate(null);
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (tpl: LifecycleTemplate) => {
    setDialogMode("edit");
    setActiveTemplate(tpl);
    setForm({
      title: tpl.title,
      description: tpl.description ?? "",
      type: tpl.type,
      ownerRoleId: tpl.ownerRole.id,
      relativeDueDays: String(tpl.relativeDueDays),
      active: tpl.active,
    });
  };

  const closeDialog = () => {
    setDialogMode(null);
    setActiveTemplate(null);
    setForm({ ...EMPTY_FORM });
    setSaving(false);
  };

  const submitCreate = async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() ? form.description.trim() : undefined,
        type: form.type,
        ownerRoleId: form.ownerRoleId,
        relativeDueDays: Number.parseInt(form.relativeDueDays, 10) || 0,
        active: form.active,
      };
      const res = await fetch("/api/admin/lifecycle/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = parseApiError(json?.error ?? json, "Vorlage konnte nicht angelegt werden");
        throw new Error(message);
      }
      setTemplates((prev) => [...prev, json as LifecycleTemplate]);
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const submitUpdate = async () => {
    if (!activeTemplate) return;
    setSaving(true);
    try {
      const payload = {
        id: activeTemplate.id,
        title: form.title.trim(),
        description: form.description.trim() ? form.description.trim() : null,
        type: form.type,
        ownerRoleId: form.ownerRoleId,
        relativeDueDays: Number.parseInt(form.relativeDueDays, 10) || 0,
        active: form.active,
      };
      const res = await fetch("/api/admin/lifecycle/templates", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = parseApiError(json?.error ?? json, "Vorlage konnte nicht aktualisiert werden");
        throw new Error(message);
      }
      setTemplates((prev) => prev.map((tpl) => (tpl.id === activeTemplate.id ? (json as LifecycleTemplate) : tpl)));
      closeDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tpl: LifecycleTemplate) => {
    try {
      const res = await fetch("/api/admin/lifecycle/templates", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: tpl.id, active: !tpl.active }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = parseApiError(json?.error ?? json, "Status konnte nicht geändert werden");
        throw new Error(message);
      }
      setTemplates((prev) => prev.map((item) => (item.id === tpl.id ? (json as LifecycleTemplate) : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (sessionLoading) {
    return <div className="p-6 text-sm text-zinc-600">Authentifizierung wird geprüft…</div>;
  }

  if (sessionError) {
    return <div className="p-6 text-sm text-red-600">Fehler beim Laden der Session: {sessionError}</div>;
  }

  if (!isAdmin) {
    return <div className="p-6 text-sm text-red-600">Zugriff verweigert. Nur Admins können Lifecycle-Vorlagen verwalten.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Lifecycle-Vorlagen</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Aufgaben-Templates für Onboarding- und Offboarding-Prozesse verwalten
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/lifecycle/roles"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:shadow dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Rollen
              </Link>
              <Link
                href="/admin/lifecycle/statuses"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:shadow dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Status
              </Link>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-500/30"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Neue Vorlage
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}
        {seedResult && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {seedResult}
          </div>
        )}
        
        {templates.length === 0 && roles.length === 0 && !loading && (
          <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-white/50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-700">
              <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-zinc-900 dark:text-white">Keine Daten vorhanden</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Erstellen Sie Beispiel-Daten für Rollen, Status und Vorlagen.</p>
            <button
              type="button"
              onClick={seedData}
              disabled={seeding}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-60"
            >
              {seeding ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Erstelle Daten…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
                  Beispiel-Daten erstellen
                </>
              )}
            </button>
          </div>
        )}

        {/* Filter Section */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <form
            className="p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedSearch(search.trim());
            }}
          >
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full sm:w-48">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Typ</label>
                <select
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                  value={filterType}
                  onChange={(event) => setFilterType(event.target.value as typeof filterType)}
                >
                  <option value="ALL">Alle Typen</option>
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="OFFBOARDING">Offboarding</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Suche</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:placeholder-zinc-400"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Titel oder Beschreibung suchen…"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500"
                  >
                    Suchen
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Template List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-zinc-500">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              Lade Vorlagen…
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemplates.map((tpl) => (
              <div 
                key={tpl.id} 
                className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-lg dark:bg-zinc-800 ${
                  tpl.active 
                    ? "border-zinc-200 dark:border-zinc-700" 
                    : "border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-900/10"
                }`}
              >
                <div className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left Content */}
                    <div className="flex-1 space-y-3">
                      {/* Title and Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{tpl.title}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          tpl.type === "ONBOARDING" 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}>
                          {tpl.type === "ONBOARDING" ? (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          ) : (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                          )}
                          {TYPE_LABELS[tpl.type]}
                        </span>
                        {tpl.ownerRole?.label && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {tpl.ownerRole.label}
                          </span>
                        )}
                        {!tpl.active && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            Deaktiviert
                          </span>
                        )}
                      </div>
                      
                      {/* Description */}
                      {tpl.description && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{tpl.description}</p>
                      )}
                      
                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Fällig: <span className={`font-medium ${tpl.relativeDueDays >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {tpl.relativeDueDays >= 0 ? `+${tpl.relativeDueDays}` : tpl.relativeDueDays} Tage
                          </span> zum {tpl.type === "ONBOARDING" ? "Start" : "Austritt"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Aktualisiert: {new Date(tpl.updatedAt).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        onClick={() => openEdit(tpl)}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          tpl.active 
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30" 
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                        }`}
                        onClick={() => void toggleActive(tpl)}
                      >
                        {tpl.active ? (
                          <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            Deaktivieren
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Aktivieren
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!loading && filteredTemplates.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-800">
                <svg className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Keine Vorlagen für die Auswahl gefunden.</p>
              </div>
            )}
          </div>
        )}

      <Dialog
        open={!!dialogMode}
        onClose={closeDialog}
        title={dialogMode === "create" ? "Neue Lifecycle-Vorlage" : "Vorlage bearbeiten"}
        subtitle="Erstellen oder bearbeiten Sie eine Vorlage für Onboarding/Offboarding"
        size="xl"
        icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
        iconColor="indigo"
        footer={
          <DialogFooter
            onCancel={closeDialog}
            onSave={dialogMode === "create" ? submitCreate : submitUpdate}
            saving={saving}
            saveText={dialogMode === "create" ? "Anlegen" : "Speichern"}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Titel" required>
            <input
              className={inputClassName}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </FormField>
          <FormField label="Typ">
            <select
              className={selectClassName}
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as TemplateType }))}
            >
              <option value="ONBOARDING">Onboarding</option>
              <option value="OFFBOARDING">Offboarding</option>
            </select>
          </FormField>
          <FormField label="Owner-Rolle">
            <select
              className={selectClassName}
              value={form.ownerRoleId}
              onChange={(event) => setForm((prev) => ({ ...prev, ownerRoleId: event.target.value }))}
            >
              <option value="">Bitte wählen…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Relative Fälligkeit (Tage)">
            <input
              type="number"
              className={inputClassName}
              value={form.relativeDueDays}
              onChange={(event) => setForm((prev) => ({ ...prev, relativeDueDays: event.target.value }))}
            />
          </FormField>
          <FormField label="Beschreibung" className="md:col-span-2">
            <textarea
              className={textareaClassName}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Optional: detaillierte Beschreibung oder Checkliste"
            />
          </FormField>
          <label className={`md:col-span-2 ${checkboxContainerClassName}`}>
            <input
              type="checkbox"
              className={checkboxClassName}
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Vorlage aktiv</span>
          </label>
        </div>
      </Dialog>
      </div>
    </div>
  );
}
