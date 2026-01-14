import { db } from "@/lib/prisma";
import * as XLSX from "xlsx";

type Row = {
  firstName: string;
  lastName: string;
  email: string | null;
  startDate: Date | string;
  birthDate: Date | string;
  lockAll: boolean;
  lockFirstName: boolean;
  lockLastName: boolean;
  lockStartDate: boolean;
  lockBirthDate: boolean;
  lockEmail: boolean;
};

function formatBool(b: boolean): string {
  return b ? "WAHR" : "FALSCH";
}

function toRow(r: Row) {
  return {
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email ?? "",
    startDate: new Date(r.startDate).toISOString().slice(0, 10),
    birthDate: new Date(r.birthDate).toISOString().slice(0, 10),
    lockAll: formatBool(r.lockAll),
    lockFirstName: formatBool(r.lockFirstName),
    lockLastName: formatBool(r.lockLastName),
    lockStartDate: formatBool(r.lockStartDate),
    lockBirthDate: formatBool(r.lockBirthDate),
    lockEmail: formatBool(r.lockEmail),
  };
}

export async function GET() {
  const rows = await db.employee.findMany({ orderBy: { lastName: "asc" } });
  const data = rows.map(toRow);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "employees");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": "attachment; filename=employees.xlsx",
      "cache-control": "no-store",
    },
  });
}
