"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";

type Ticket = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  priority: string;
  priorityLabel: string;
  status: string;
  statusLabel: string;
  employee?: { id: string; firstName: string; lastName: string } | null;
  createdBy: { id: string; email: string; name: string | null };
  assignedTo?: { id: string; email: string; name: string | null } | null;
  _count: { comments: number };
  createdAt: string;
  resolvedAt?: string | null;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
};

const CATEGORIES = [
  { value: "BONUS", label: "Bonusabrechnung" },
  { value: "SALARY", label: "Gehaltsabrechnung" },
  { value: "ADDRESS_CHANGE", label: "Adressänderung" },
  { value: "BANK_CHANGE", label: "Bankverbindung" },
  { value: "CONTRACT", label: "Vertragsfragen" },
  { value: "VACATION", label: "Urlaubsfragen" },
  { value: "SICK_LEAVE", label: "Krankmeldung" },
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "OFFBOARDING", label: "Offboarding" },
  { value: "CERTIFICATE", label: "Zeugnisse" },
  { value: "OTHER", label: "Sonstiges" },
];

const PRIORITIES = [
  { value: "LOW", label: "Niedrig", color: "bg-gray-100 text-gray-700" },
  { value: "MEDIUM", label: "Mittel", color: "bg-blue-100 text-blue-700" },
  { value: "HIGH", label: "Hoch", color: "bg-orange-100 text-orange-700" },
  { value: "URGENT", label: "Dringend", color: "bg-red-100 text-red-700" },
];

const STATUSES = [
  { value: "OPEN", label: "Offen", color: "bg-yellow-100 text-yellow-800" },
  { value: "IN_PROGRESS", label: "In Bearbeitung", color: "bg-blue-100 text-blue-800" },
  { value: "WAITING", label: "Wartet", color: "bg-purple-100 text-purple-800" },
  { value: "RESOLVED", label: "Gelöst", color: "bg-green-100 text-green-800" },
  { value: "CLOSED", label: "Geschlossen", color: "bg-gray-100 text-gray-800" },
];

export default function TicketsPage() {
  const { user } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState<string>("all");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [priority, setPriority] = useState("MEDIUM");
  const [employeeId, setEmployeeId] = useState("");

  const isAdmin = user?.role === "ADMIN" || user?.role === "HR";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [ticketsRes, employeesRes] = await Promise.all([
        fetch("/api/tickets"),
        fetch("/api/employees?status=ACTIVE"),
      ]);
      if (ticketsRes.ok) setTickets(await ticketsRes.json());
      if (employeesRes.ok) setEmployees(await employeesRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        priority,
        employeeId: employeeId || undefined,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setCategory("OTHER");
      setPriority("MEDIUM");
      setEmployeeId("");
      loadData();
    }
  }

  async function updateTicketStatus(ticketId: string, status: string) {
    const res = await fetch("/api/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ticketId, status }),
    });
    if (res.ok) {
      loadData();
      setSelectedTicket(null);
    }
  }

  const filteredTickets = tickets.filter((t) => {
    if (filter === "all") return true;
    if (filter === "open") return ["OPEN", "IN_PROGRESS", "WAITING"].includes(t.status);
    if (filter === "closed") return ["RESOLVED", "CLOSED"].includes(t.status);
    return t.status === filter;
  });

  const getPriorityColor = (p: string) => PRIORITIES.find((pr) => pr.value === p)?.color || "";
  const getStatusColor = (s: string) => STATUSES.find((st) => st.value === s)?.color || "";

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">HR-Tickets</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {filteredTickets.length} Tickets • {tickets.filter((t) => t.status === "OPEN").length} offen
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neues Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "Alle" },
          { value: "open", label: "Offen" },
          { value: "IN_PROGRESS", label: "In Bearbeitung" },
          { value: "closed", label: "Abgeschlossen" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === f.value
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-zinc-500">Keine Tickets gefunden</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="cursor-pointer rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400">{ticket.ticketNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priorityLabel}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.statusLabel}
                    </span>
                  </div>
                  <h3 className="mt-1 font-medium text-zinc-900 dark:text-white">{ticket.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{ticket.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-700">{ticket.categoryLabel}</span>
                  {ticket.employee && (
                    <span>→ {ticket.employee.firstName} {ticket.employee.lastName}</span>
                  )}
                  <span>{new Date(ticket.createdAt).toLocaleDateString("de-DE")}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Neues Ticket erstellen</h2>
            <form onSubmit={createTicket} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Titel *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={3}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  placeholder="Kurze Beschreibung des Anliegens"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Beschreibung *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={10}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  placeholder="Detaillierte Beschreibung..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Kategorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Priorität</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Betrifft Mitarbeiter (optional)</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                >
                  <option value="">-- Keinen auswählen --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.lastName}, {emp.firstName}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                >
                  Ticket erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 dark:bg-zinc-800">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-mono text-zinc-400">{selectedTicket.ticketNumber}</span>
                <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">{selectedTicket.title}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                {selectedTicket.priorityLabel}
              </span>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(selectedTicket.status)}`}>
                {selectedTicket.statusLabel}
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-700">
                {selectedTicket.categoryLabel}
              </span>
            </div>

            <div className="mt-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-700/50">
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{selectedTicket.description}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Erstellt von:</span>
                <p className="font-medium">{selectedTicket.createdBy.name || selectedTicket.createdBy.email}</p>
              </div>
              <div>
                <span className="text-zinc-500">Erstellt am:</span>
                <p className="font-medium">{new Date(selectedTicket.createdAt).toLocaleString("de-DE")}</p>
              </div>
              {selectedTicket.employee && (
                <div>
                  <span className="text-zinc-500">Betrifft:</span>
                  <p className="font-medium">{selectedTicket.employee.firstName} {selectedTicket.employee.lastName}</p>
                </div>
              )}
              {selectedTicket.resolvedAt && (
                <div>
                  <span className="text-zinc-500">Gelöst am:</span>
                  <p className="font-medium">{new Date(selectedTicket.resolvedAt).toLocaleString("de-DE")}</p>
                </div>
              )}
            </div>

            {/* Admin Actions */}
            {isAdmin && selectedTicket.status !== "CLOSED" && (
              <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Status ändern:</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter((s) => s.value !== selectedTicket.status).map((status) => (
                    <button
                      key={status.value}
                      onClick={() => updateTicketStatus(selectedTicket.id, status.value)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status.color} hover:opacity-80`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
