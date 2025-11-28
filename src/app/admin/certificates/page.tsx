"use client";

import { useCallback, useEffect, useState } from "react";

type Category = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  orderIndex: number;
  _count: { textBlocks: number };
};

type TextBlock = {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  rating: number;
  ratingLabel: string;
  isDefault: boolean;
  active: boolean;
  category: { id: string; key: string; label: string };
};

const RATING_OPTIONS = [
  { value: 1, label: "Sehr gut", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: 2, label: "Gut", color: "bg-green-100 text-green-800 border-green-200" },
  { value: 3, label: "Befriedigend", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: 4, label: "Ausreichend", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: 5, label: "Mangelhaft", color: "bg-red-100 text-red-800 border-red-200" },
];

const DEFAULT_CATEGORIES = [
  { key: "INTRO", label: "Einleitung", description: "Einführung und persönliche Daten" },
  { key: "TASKS", label: "Tätigkeitsbeschreibung", description: "Aufgaben und Verantwortlichkeiten" },
  { key: "PERFORMANCE", label: "Leistungsbeurteilung", description: "Arbeitsleistung und Ergebnisse" },
  { key: "BEHAVIOR", label: "Verhalten", description: "Sozialverhalten und Zusammenarbeit" },
  { key: "CLOSING", label: "Schlussformel", description: "Abschluss und Zukunftswünsche" },
];

export default function CertificatesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"categories" | "textblocks">("textblocks");
  
  // Category form state
  const [categoryForm, setCategoryForm] = useState({ key: "", label: "", description: "" });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Text block form state
  const [textBlockForm, setTextBlockForm] = useState({
    categoryId: "",
    title: "",
    content: "",
    rating: 2,
    isDefault: false,
  });
  const [editingTextBlock, setEditingTextBlock] = useState<TextBlock | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterRating, setFilterRating] = useState<string>("");

  // Load data
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/certificates/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  }, []);

  const loadTextBlocks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("categoryId", filterCategory);
      if (filterRating) params.set("rating", filterRating);
      
      const res = await fetch(`/api/admin/certificates/textblocks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTextBlocks(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load text blocks:", e);
    }
  }, [filterCategory, filterRating]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCategories(), loadTextBlocks()])
      .finally(() => setLoading(false));
  }, [loadCategories, loadTextBlocks]);

  // Initialize default categories
  const initializeCategories = async () => {
    for (const cat of DEFAULT_CATEGORIES) {
      try {
        await fetch("/api/admin/certificates/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...cat, orderIndex: DEFAULT_CATEGORIES.indexOf(cat) }),
        });
      } catch {
        // Ignore duplicates
      }
    }
    await loadCategories();
  };

  // Category CRUD
  const saveCategory = async () => {
    setError(null);
    try {
      const url = "/api/admin/certificates/categories";
      const method = editingCategory ? "PATCH" : "POST";
      const body = editingCategory
        ? { id: editingCategory.id, ...categoryForm }
        : categoryForm;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Speichern");
      }

      setCategoryForm({ key: "", label: "", description: "" });
      setEditingCategory(null);
      await loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Kategorie wirklich löschen? Alle zugehörigen Textbausteine werden ebenfalls gelöscht.")) return;
    try {
      await fetch("/api/admin/certificates/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadCategories();
      await loadTextBlocks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  };

  // Text block CRUD
  const saveTextBlock = async () => {
    setError(null);
    if (!textBlockForm.categoryId) {
      setError("Bitte wählen Sie eine Kategorie");
      return;
    }
    try {
      const url = "/api/admin/certificates/textblocks";
      const method = editingTextBlock ? "PATCH" : "POST";
      const body = editingTextBlock
        ? { id: editingTextBlock.id, ...textBlockForm }
        : textBlockForm;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Speichern");
      }

      setTextBlockForm({ categoryId: "", title: "", content: "", rating: 2, isDefault: false });
      setEditingTextBlock(null);
      await loadTextBlocks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  };

  const deleteTextBlock = async (id: string) => {
    if (!confirm("Textbaustein wirklich löschen?")) return;
    try {
      await fetch("/api/admin/certificates/textblocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadTextBlocks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  };

  const getRatingColor = (rating: number) => {
    return RATING_OPTIONS.find(r => r.value === rating)?.color ?? "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return <div className="p-6 text-zinc-500">Lade Daten...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zeugnis-Textbausteine</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Verwalten Sie Kategorien und Standardtexte für Arbeitszeugnisse
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setActiveTab("textblocks")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "textblocks"
              ? "border-black text-black dark:border-white dark:text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Textbausteine ({textBlocks.length})
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "categories"
              ? "border-black text-black dark:border-white dark:text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Kategorien ({categories.length})
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          {categories.length === 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 p-4 dark:bg-amber-900/20 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-400 mb-2">
                Keine Kategorien vorhanden. Möchten Sie die Standard-Kategorien anlegen?
              </p>
              <button
                onClick={initializeCategories}
                className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                Standard-Kategorien erstellen
              </button>
            </div>
          )}

          {/* Category Form */}
          <div className="rounded border border-zinc-200 bg-white p-4 dark:bg-zinc-800 dark:border-zinc-700">
            <h3 className="font-medium mb-3">
              {editingCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded border px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-600"
                placeholder="Schlüssel (z.B. INTRO)"
                value={categoryForm.key}
                onChange={(e) => setCategoryForm({ ...categoryForm, key: e.target.value })}
              />
              <input
                className="rounded border px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-600"
                placeholder="Bezeichnung"
                value={categoryForm.label}
                onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
              />
              <input
                className="rounded border px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-600"
                placeholder="Beschreibung (optional)"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={saveCategory}
                className="rounded bg-black px-4 py-2 text-xs font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                {editingCategory ? "Aktualisieren" : "Erstellen"}
              </button>
              {editingCategory && (
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ key: "", label: "", description: "" });
                  }}
                  className="rounded border px-4 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Abbrechen
                </button>
              )}
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded border border-zinc-200 bg-white p-3 dark:bg-zinc-800 dark:border-zinc-700"
              >
                <div>
                  <span className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded mr-2 dark:bg-zinc-700">
                    {cat.key}
                  </span>
                  <span className="font-medium">{cat.label}</span>
                  {cat.description && (
                    <span className="text-sm text-zinc-500 ml-2">— {cat.description}</span>
                  )}
                  <span className="text-xs text-zinc-400 ml-2">({cat._count.textBlocks} Texte)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryForm({ key: cat.key, label: cat.label, description: cat.description ?? "" });
                    }}
                    className="rounded border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Blocks Tab */}
      {activeTab === "textblocks" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              className="rounded border px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-600"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Alle Kategorien</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            <select
              className="rounded border px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-600"
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
            >
              <option value="">Alle Bewertungen</option>
              {RATING_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Text Block Form */}
          <div className="rounded border border-zinc-200 bg-white p-4 dark:bg-zinc-800 dark:border-zinc-700">
            <h3 className="font-medium mb-3">
              {editingTextBlock ? "Textbaustein bearbeiten" : "Neuer Textbaustein"}
            </h3>
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  className="rounded border px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-600"
                  value={textBlockForm.categoryId}
                  onChange={(e) => setTextBlockForm({ ...textBlockForm, categoryId: e.target.value })}
                >
                  <option value="">Kategorie wählen...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
                <input
                  className="rounded border px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-600"
                  placeholder="Titel / Beschreibung"
                  value={textBlockForm.title}
                  onChange={(e) => setTextBlockForm({ ...textBlockForm, title: e.target.value })}
                />
                <div className="flex items-center gap-3">
                  <select
                    className="rounded border px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-600"
                    value={textBlockForm.rating}
                    onChange={(e) => setTextBlockForm({ ...textBlockForm, rating: parseInt(e.target.value) })}
                  >
                    {RATING_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={textBlockForm.isDefault}
                      onChange={(e) => setTextBlockForm({ ...textBlockForm, isDefault: e.target.checked })}
                    />
                    Standard
                  </label>
                </div>
              </div>
              <div>
                <textarea
                  className="w-full rounded border px-3 py-2 text-sm min-h-[150px] font-mono dark:bg-zinc-900 dark:border-zinc-600"
                  placeholder="Text mit Platzhaltern: {firstName}, {lastName}, {fullName}, {jobTitle}, {startDate}, {endDate}, {duration}, {unit}, {department}, {pronoun}, {possessive}"
                  value={textBlockForm.content}
                  onChange={(e) => setTextBlockForm({ ...textBlockForm, content: e.target.value })}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Verfügbare Platzhalter: {"{firstName}"}, {"{lastName}"}, {"{fullName}"}, {"{jobTitle}"}, {"{startDate}"}, {"{endDate}"}, {"{duration}"}, {"{unit}"}, {"{department}"}, {"{pronoun}"}, {"{possessive}"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={saveTextBlock}
                className="rounded bg-black px-4 py-2 text-xs font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                {editingTextBlock ? "Aktualisieren" : "Erstellen"}
              </button>
              {editingTextBlock && (
                <button
                  onClick={() => {
                    setEditingTextBlock(null);
                    setTextBlockForm({ categoryId: "", title: "", content: "", rating: 2, isDefault: false });
                  }}
                  className="rounded border px-4 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Abbrechen
                </button>
              )}
            </div>
          </div>

          {/* Text Blocks List */}
          <div className="space-y-3">
            {textBlocks.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                Keine Textbausteine gefunden. Erstellen Sie Ihren ersten Textbaustein oben.
              </div>
            ) : (
              textBlocks.map((block) => (
                <div
                  key={block.id}
                  className={`rounded border p-4 ${
                    block.active
                      ? "border-zinc-200 bg-white dark:bg-zinc-800 dark:border-zinc-700"
                      : "border-zinc-100 bg-zinc-50 opacity-60 dark:bg-zinc-900 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{block.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        {block.category.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${getRatingColor(block.rating)}`}>
                        {block.ratingLabel}
                      </span>
                      {block.isDefault && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                          Standard
                        </span>
                      )}
                      {!block.active && (
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-600">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTextBlock(block);
                          setTextBlockForm({
                            categoryId: block.categoryId,
                            title: block.title,
                            content: block.content,
                            rating: block.rating,
                            isDefault: block.isDefault,
                          });
                        }}
                        className="rounded border px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => deleteTextBlock(block.id)}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                  <pre className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed">
                    {block.content}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
