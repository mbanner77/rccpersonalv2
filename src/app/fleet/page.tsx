"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";

type VehicleCost = {
  id: string;
  type: string;
  typeLabel: string;
  amount: number;
  date: string;
  description?: string;
  mileage?: number;
  createdAt: string;
};

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
  costs?: VehicleCost[];
  costsByType?: Record<string, number>;
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
  const [showDetail, setShowDetail] = useState<Vehicle | null>(null);
  const [detailCosts, setDetailCosts] = useState<VehicleCost[]>([]);
  const [loadingCosts, setLoadingCosts] = useState(false);

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

  async function loadVehicleCosts(vehicleId: string) {
    setLoadingCosts(true);
    try {
      const res = await fetch(`/api/fleet?vehicleId=${vehicleId}&includeCosts=true`);
      if (res.ok) {
        const data = await res.json();
        setDetailCosts(data.costs || []);
      }
    } finally {
      setLoadingCosts(false);
    }
  }

  async function openVehicleDetail(vehicle: Vehicle) {
    setShowDetail(vehicle);
    await loadVehicleCosts(vehicle.id);
  }

  async function deleteCost(costId: string) {
    if (!confirm("Kosten wirklich löschen?")) return;
    const res = await fetch("/api/fleet", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ costId, action: "deleteCost" }),
    });
    if (res.ok && showDetail) {
      loadVehicleCosts(showDetail.id);
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

  const getCostTypeColor = (type: string) => {
    switch (type) {
      case "FUEL": return "bg-amber-100 text-amber-700";
      case "LEASING": return "bg-blue-100 text-blue-700";
      case "REPAIR": return "bg-red-100 text-red-700";
      case "MAINTENANCE": return "bg-orange-100 text-orange-700";
      case "INSURANCE": return "bg-purple-100 text-purple-700";
      case "TAX": return "bg-slate-100 text-slate-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // Calculate cost breakdown for detail view
  const costsByType = detailCosts.reduce((acc, cost) => {
    acc[cost.type] = (acc[cost.type] || 0) + Number(cost.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalDetailCosts = Object.values(costsByType).reduce((sum, val) => sum + val, 0);

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
              <button
                onClick={() => openVehicleDetail(vehicle)}
                className="flex w-full items-center justify-between text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50 -mx-1 px-1 py-1 rounded transition"
              >
                <span className="text-zinc-500">Gesamtkosten:</span>
                <span className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-white">
                  {Number(vehicle.totalCosts).toLocaleString("de-DE")} €
                  <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
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

      {/* Vehicle Detail / Cost History Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {showDetail.licensePlate} - {showDetail.brand} {showDetail.model}
                </h2>
                <p className="text-sm text-zinc-500">Kostenübersicht</p>
              </div>
              <button
                onClick={() => { setShowDetail(null); setDetailCosts([]); }}
                className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cost Summary */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-700/50 border-b border-zinc-200 dark:border-zinc-700">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {totalDetailCosts.toLocaleString("de-DE")} €
                  </p>
                  <p className="text-xs text-zinc-500">Gesamtkosten</p>
                </div>
                {COST_TYPES.slice(0, 3).map((ct) => (
                  <div key={ct.value} className="text-center">
                    <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                      {(costsByType[ct.value] || 0).toLocaleString("de-DE")} €
                    </p>
                    <p className="text-xs text-zinc-500">{ct.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Breakdown by Type */}
            {Object.keys(costsByType).length > 0 && (
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Aufteilung nach Kostenart</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(costsByType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, amount]) => {
                      const label = COST_TYPES.find((c) => c.value === type)?.label || type;
                      const percent = totalDetailCosts > 0 ? Math.round((amount / totalDetailCosts) * 100) : 0;
                      return (
                        <div key={type} className={`rounded-lg px-3 py-1.5 text-sm ${getCostTypeColor(type)}`}>
                          <span className="font-medium">{label}</span>
                          <span className="ml-2">{amount.toLocaleString("de-DE")} € ({percent}%)</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Cost List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Alle Kosten ({detailCosts.length})
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => { setShowCost(showDetail.id); }}
                    className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Kosten hinzufügen
                  </button>
                )}
              </div>

              {loadingCosts ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                </div>
              ) : detailCosts.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">Keine Kosten erfasst</p>
              ) : (
                <div className="space-y-2">
                  {detailCosts
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((cost) => (
                      <div
                        key={cost.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-700/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${getCostTypeColor(cost.type)}`}>
                            {cost.typeLabel || COST_TYPES.find((c) => c.value === cost.type)?.label || cost.type}
                          </span>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">
                              {Number(cost.amount).toLocaleString("de-DE")} €
                            </p>
                            <p className="text-xs text-zinc-500">
                              {new Date(cost.date).toLocaleDateString("de-DE")}
                              {cost.description && ` • ${cost.description}`}
                              {cost.mileage && ` • ${cost.mileage.toLocaleString("de-DE")} km`}
                            </p>
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => deleteCost(cost.id)}
                            className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Löschen"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
