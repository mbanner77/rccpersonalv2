"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";

type Vehicle = {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  year?: number;
  color?: string;
  fuelType?: string;
  mileage?: number;
  leasingCompany?: string;
  leasingMonthly?: number;
  leasingEnd?: string;
  totalCosts: number;
  currentAssignment?: {
    id: string;
    employee: { id: string; firstName: string; lastName: string; jobTitle?: string };
    startDate: string;
  } | null;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
};

const VEHICLE_TYPES = [
  { value: "CAR", label: "PKW" },
  { value: "VAN", label: "Transporter" },
  { value: "TRUCK", label: "LKW" },
  { value: "MOTORCYCLE", label: "Motorrad" },
  { value: "EBIKE", label: "E-Bike" },
  { value: "OTHER", label: "Sonstiges" },
];

const COST_TYPES = [
  { value: "LEASING", label: "Leasing" },
  { value: "FUEL", label: "Tanken" },
  { value: "REPAIR", label: "Reparatur" },
  { value: "MAINTENANCE", label: "Wartung" },
  { value: "INSURANCE", label: "Versicherung" },
  { value: "TAX", label: "Kfz-Steuer" },
  { value: "TOLL", label: "Maut" },
  { value: "PARKING", label: "Parken" },
  { value: "CLEANING", label: "Reinigung" },
  { value: "OTHER", label: "Sonstiges" },
];

export default function FleetPage() {
  const { user } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [showCost, setShowCost] = useState<string | null>(null);

  // Create form
  const [licensePlate, setLicensePlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [vehicleType, setVehicleType] = useState("CAR");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [leasingCompany, setLeasingCompany] = useState("");
  const [leasingMonthly, setLeasingMonthly] = useState("");

  // Assign form
  const [assignEmployeeId, setAssignEmployeeId] = useState("");

  // Cost form
  const [costType, setCostType] = useState("FUEL");
  const [costAmount, setCostAmount] = useState("");
  const [costDate, setCostDate] = useState(new Date().toISOString().split("T")[0]);
  const [costDescription, setCostDescription] = useState("");
  const [costMileage, setCostMileage] = useState("");

  const isAdmin = user?.role === "ADMIN" || user?.role === "HR";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [vehiclesRes, employeesRes] = await Promise.all([
        fetch("/api/fleet"),
        fetch("/api/employees?status=ACTIVE"),
      ]);
      if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
      if (employeesRes.ok) setEmployees(await employeesRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function createVehicle(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/fleet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licensePlate,
        brand,
        model,
        type: vehicleType,
        year: year ? parseInt(year) : undefined,
        color: color || undefined,
        fuelType: fuelType || undefined,
        leasingCompany: leasingCompany || undefined,
        leasingMonthly: leasingMonthly ? parseFloat(leasingMonthly) : undefined,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      resetCreateForm();
      loadData();
    }
  }

  function resetCreateForm() {
    setLicensePlate("");
    setBrand("");
    setModel("");
    setVehicleType("CAR");
    setYear("");
    setColor("");
    setFuelType("");
    setLeasingCompany("");
    setLeasingMonthly("");
  }

  async function assignVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!showAssign || !assignEmployeeId) return;
    const res = await fetch("/api/fleet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        vehicleId: showAssign,
        employeeId: assignEmployeeId,
      }),
    });
    if (res.ok) {
      setShowAssign(null);
      setAssignEmployeeId("");
      loadData();
    }
  }

  async function unassignVehicle(vehicleId: string) {
    if (!confirm("Fahrzeug wirklich freigeben?")) return;
    const res = await fetch("/api/fleet", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, action: "unassign" }),
    });
    if (res.ok) loadData();
  }

  async function addCost(e: React.FormEvent) {
    e.preventDefault();
    if (!showCost) return;
    const res = await fetch("/api/fleet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cost",
        vehicleId: showCost,
        type: costType,
        amount: parseFloat(costAmount),
        date: new Date(costDate).toISOString(),
        description: costDescription || undefined,
        mileage: costMileage ? parseInt(costMileage) : undefined,
      }),
    });
    if (res.ok) {
      setShowCost(null);
      setCostType("FUEL");
      setCostAmount("");
      setCostDate(new Date().toISOString().split("T")[0]);
      setCostDescription("");
      setCostMileage("");
      loadData();
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "bg-green-100 text-green-700";
      case "ASSIGNED": return "bg-blue-100 text-blue-700";
      case "MAINTENANCE": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // Stats
  const totalVehicles = vehicles.length;
  const assignedVehicles = vehicles.filter((v) => v.status === "ASSIGNED").length;
  const totalCosts = vehicles.reduce((sum, v) => sum + (Number(v.totalCosts) || 0), 0);
  const monthlyLeasing = vehicles.reduce((sum, v) => sum + (Number(v.leasingMonthly) || 0), 0);

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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Fuhrpark</h1>
          <p className="mt-1 text-sm text-zinc-500">Fahrzeugverwaltung und Kostenübersicht</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Fahrzeug hinzufügen
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Fahrzeuge gesamt</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{totalVehicles}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Zugewiesen</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{assignedVehicles}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Monatl. Leasing</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{monthlyLeasing.toLocaleString("de-DE")} €</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Gesamtkosten</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{totalCosts.toLocaleString("de-DE")} €</p>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-zinc-900 dark:text-white">{vehicle.licensePlate}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                    {vehicle.statusLabel}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                </p>
              </div>
              <span className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-700">{vehicle.typeLabel}</span>
            </div>

            {vehicle.currentAssignment && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {vehicle.currentAssignment.employee.firstName} {vehicle.currentAssignment.employee.lastName}
                </span>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-500">
              {vehicle.fuelType && <span>⛽ {vehicle.fuelType}</span>}
              {vehicle.mileage && <span>🛣️ {vehicle.mileage.toLocaleString("de-DE")} km</span>}
              {vehicle.leasingMonthly && <span>💰 {Number(vehicle.leasingMonthly).toLocaleString("de-DE")} €/Mon</span>}
              {vehicle.color && <span>🎨 {vehicle.color}</span>}
            </div>

            <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Gesamtkosten:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {Number(vehicle.totalCosts).toLocaleString("de-DE")} €
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-3 flex gap-2">
                {vehicle.status === "AVAILABLE" ? (
                  <button
                    onClick={() => setShowAssign(vehicle.id)}
                    className="flex-1 rounded-lg bg-blue-100 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200"
                  >
                    Zuweisen
                  </button>
                ) : vehicle.status === "ASSIGNED" ? (
                  <button
                    onClick={() => unassignVehicle(vehicle.id)}
                    className="flex-1 rounded-lg bg-gray-100 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Freigeben
                  </button>
                ) : null}
                <button
                  onClick={() => setShowCost(vehicle.id)}
                  className="flex-1 rounded-lg bg-green-100 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                >
                  + Kosten
                </button>
              </div>
            )}
          </div>
        ))}

        {vehicles.length === 0 && (
          <div className="col-span-full rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-zinc-500">Keine Fahrzeuge vorhanden</p>
          </div>
        )}
      </div>

      {/* Create Vehicle Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Neues Fahrzeug</h2>
            <form onSubmit={createVehicle} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Kennzeichen *</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                    placeholder="AB-CD 1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Typ</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Marke *</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                    placeholder="BMW"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Modell *</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                    placeholder="3er"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Baujahr</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min="1990"
                    max="2030"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Farbe</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Kraftstoff</label>
                  <input
                    type="text"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                    placeholder="Diesel"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Leasing-Firma</label>
                  <input
                    type="text"
                    value={leasingCompany}
                    onChange={(e) => setLeasingCompany(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Monatl. Rate (€)</label>
                  <input
                    type="number"
                    value={leasingMonthly}
                    onChange={(e) => setLeasingMonthly(e.target.value)}
                    step="0.01"
                    min="0"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                  Abbrechen
                </button>
                <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Fahrzeug zuweisen</h2>
            <form onSubmit={assignVehicle} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Mitarbeiter</label>
                <select
                  value={assignEmployeeId}
                  onChange={(e) => setAssignEmployeeId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                >
                  <option value="">-- Auswählen --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.lastName}, {emp.firstName}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowAssign(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                  Abbrechen
                </button>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Zuweisen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Cost Modal */}
      {showCost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Kosten erfassen</h2>
            <form onSubmit={addCost} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Kostenart</label>
                  <select
                    value={costType}
                    onChange={(e) => setCostType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  >
                    {COST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Betrag (€) *</label>
                  <input
                    type="number"
                    value={costAmount}
                    onChange={(e) => setCostAmount(e.target.value)}
                    required
                    step="0.01"
                    min="0"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Datum</label>
                  <input
                    type="date"
                    value={costDate}
                    onChange={(e) => setCostDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Kilometerstand</label>
                  <input
                    type="number"
                    value={costMileage}
                    onChange={(e) => setCostMileage(e.target.value)}
                    min="0"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Beschreibung</label>
                <input
                  type="text"
                  value={costDescription}
                  onChange={(e) => setCostDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                  placeholder="z.B. Tankrechnung Shell"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCost(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                  Abbrechen
                </button>
                <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
