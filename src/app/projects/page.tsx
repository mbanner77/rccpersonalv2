"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";

type Project = {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  maxParticipants?: number;
  isActive: boolean;
  approvedCount: number;
  pendingCount: number;
  createdBy?: { id: string; email: string; name?: string };
};

type Application = {
  id: string;
  status: string;
  statusLabel: string;
  motivation?: string;
  hoursPerWeek?: number;
  notes?: string;
  employee: { id: string; firstName: string; lastName: string; jobTitle?: string; email?: string };
  project?: { id: string; name: string };
  approvedBy?: { id: string; email: string; name?: string };
  approvedAt?: string;
  createdAt: string;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-gray-100 text-gray-700",
};

export default function ProjectsPage() {
  const { user } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showApply, setShowApply] = useState<string | null>(null);

  // Create form
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");
  const [projectBudget, setProjectBudget] = useState("");
  const [projectMaxParticipants, setProjectMaxParticipants] = useState("");

  // Apply form
  const [applyEmployeeId, setApplyEmployeeId] = useState("");
  const [applyMotivation, setApplyMotivation] = useState("");
  const [applyHoursPerWeek, setApplyHoursPerWeek] = useState("");

  const isAdmin = user?.role === "ADMIN" || user?.role === "HR";

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectApplications(selectedProject);
    }
  }, [selectedProject]);

  async function loadData() {
    try {
      const [projectsRes, empsRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/employees?status=ACTIVE"),
      ]);
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (empsRes.ok) setEmployees(await empsRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectApplications(projectId: string) {
    const res = await fetch(`/api/projects?projectId=${projectId}`);
    if (res.ok) setApplications(await res.json());
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        description: projectDescription || undefined,
        startDate: projectStartDate ? new Date(projectStartDate).toISOString() : undefined,
        endDate: projectEndDate ? new Date(projectEndDate).toISOString() : undefined,
        budget: projectBudget ? parseFloat(projectBudget) : undefined,
        maxParticipants: projectMaxParticipants ? parseInt(projectMaxParticipants) : undefined,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setProjectName("");
      setProjectDescription("");
      setProjectStartDate("");
      setProjectEndDate("");
      setProjectBudget("");
      setProjectMaxParticipants("");
      loadData();
    }
  }

  async function applyForProject(e: React.FormEvent) {
    e.preventDefault();
    if (!showApply) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply",
        projectId: showApply,
        employeeId: applyEmployeeId,
        motivation: applyMotivation || undefined,
        hoursPerWeek: applyHoursPerWeek ? parseInt(applyHoursPerWeek) : undefined,
      }),
    });
    if (res.ok) {
      setShowApply(null);
      setApplyEmployeeId("");
      setApplyMotivation("");
      setApplyHoursPerWeek("");
      loadData();
      if (selectedProject) loadProjectApplications(selectedProject);
    }
  }

  async function decideApplication(applicationId: string, status: "APPROVED" | "REJECTED") {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "decide",
        applicationId,
        status,
      }),
    });
    if (res.ok) {
      loadData();
      if (selectedProject) loadProjectApplications(selectedProject);
    }
  }

  async function closeProject(projectId: string) {
    if (!confirm("Projekt wirklich schließen?")) return;
    const res = await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (res.ok) {
      setSelectedProject(null);
      loadData();
    }
  }

  // Stats
  const activeProjects = projects.filter((p) => p.isActive).length;
  const totalApproved = projects.reduce((sum, p) => sum + p.approvedCount, 0);
  const totalPending = projects.reduce((sum, p) => sum + p.pendingCount, 0);

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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Interne Projekte</h1>
          <p className="mt-1 text-sm text-zinc-500">Projektanträge und Mitarbeiterzuweisungen</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neues Projekt
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Aktive Projekte</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{activeProjects}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Genehmigte Teilnehmer</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{totalApproved}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Offene Anträge</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{totalPending}</p>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => setSelectedProject(project.id)}
            className={`cursor-pointer rounded-xl border p-4 transition hover:shadow-md ${
              selectedProject === project.id
                ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-700"
                : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">{project.name}</h3>
                {project.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{project.description}</p>
                )}
              </div>
              {!project.isActive && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Geschlossen</span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
              {project.startDate && (
                <span>📅 {new Date(project.startDate).toLocaleDateString("de-DE")}</span>
              )}
              {project.budget && (
                <span>💰 {project.budget.toLocaleString("de-DE")} €</span>
              )}
              {project.maxParticipants && (
                <span>👥 max. {project.maxParticipants}</span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-4 border-t border-zinc-100 pt-3 dark:border-zinc-700">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{project.approvedCount} genehmigt</span>
              </div>
              {project.pendingCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{project.pendingCount} offen</span>
                </div>
              )}
            </div>

            {isAdmin && project.isActive && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowApply(project.id); }}
                  className="flex-1 rounded-lg bg-blue-100 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200"
                >
                  Mitarbeiter hinzufügen
                </button>
              </div>
            )}
          </div>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-zinc-500">Keine Projekte vorhanden</p>
          </div>
        )}
      </div>

      {/* Applications Panel */}
      {selectedProject && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Bewerbungen für: {projects.find((p) => p.id === selectedProject)?.name}
            </h2>
            <div className="flex gap-2">
              {isAdmin && projects.find((p) => p.id === selectedProject)?.isActive && (
                <button
                  onClick={() => closeProject(selectedProject)}
                  className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                >
                  Projekt schließen
                </button>
              )}
              <button
                onClick={() => setSelectedProject(null)}
                className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {applications.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">Keine Bewerbungen vorhanden</p>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200">
                      {app.employee.firstName.charAt(0)}{app.employee.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {app.employee.firstName} {app.employee.lastName}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {app.employee.jobTitle}
                        {app.hoursPerWeek && ` • ${app.hoursPerWeek}h/Woche`}
                      </p>
                      {app.motivation && (
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 italic">&ldquo;{app.motivation}&rdquo;</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                      {app.statusLabel}
                    </span>
                    {isAdmin && app.status === "PENDING" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => decideApplication(app.id, "APPROVED")}
                          className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                        >
                          Genehmigen
                        </button>
                        <button
                          onClick={() => decideApplication(app.id, "REJECTED")}
                          className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                        >
                          Ablehnen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Neues Projekt erstellen</h2>
            <form onSubmit={createProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Projektname *</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  placeholder="z.B. Digitalisierung Buchhaltung"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Beschreibung</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Startdatum</label>
                  <input
                    type="date"
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Enddatum</label>
                  <input
                    type="date"
                    value={projectEndDate}
                    onChange={(e) => setProjectEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Budget (€)</label>
                  <input
                    type="number"
                    value={projectBudget}
                    onChange={(e) => setProjectBudget(e.target.value)}
                    step="0.01"
                    min="0"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Max. Teilnehmer</label>
                  <input
                    type="number"
                    value={projectMaxParticipants}
                    onChange={(e) => setProjectMaxParticipants(e.target.value)}
                    min="1"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                  Abbrechen
                </button>
                <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Mitarbeiter für Projekt vorschlagen</h2>
            <form onSubmit={applyForProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Mitarbeiter *</label>
                <select
                  value={applyEmployeeId}
                  onChange={(e) => setApplyEmployeeId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                >
                  <option value="">-- Auswählen --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.lastName}, {emp.firstName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Stunden pro Woche</label>
                <input
                  type="number"
                  value={applyHoursPerWeek}
                  onChange={(e) => setApplyHoursPerWeek(e.target.value)}
                  min="1"
                  max="40"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  placeholder="z.B. 8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Begründung / Motivation</label>
                <textarea
                  value={applyMotivation}
                  onChange={(e) => setApplyMotivation(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  placeholder="Warum ist dieser Mitarbeiter geeignet?"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowApply(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                  Abbrechen
                </button>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Vorschlagen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
