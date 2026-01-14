export const runtime = "nodejs";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/prisma";

type EmployeeStatus = "ACTIVE" | "EXITED";

type ParsedRow = {
  firstName: string | null;
  lastName: string | null;
  startDate: Date | null;
  birthDate: Date | null;
  email: string | null;
  lockAll: boolean;
  lockFirstName: boolean;
  lockLastName: boolean;
  lockStartDate: boolean;
  lockBirthDate: boolean;
  lockEmail: boolean;
};

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function normalizeNamePart(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z\s-]/g, "")
    .replace(/\s+/g, ".")
    .replace(/-+/g, ".")
    .replace(/\.+/g, ".")
    .trim();
}

function buildEmail(firstName: string | null, lastName: string | null): string | null {
  const fn = normalizeNamePart(firstName);
  const ln = normalizeNamePart(lastName);
  if (!fn || !ln) return null;
  return `${fn}.${ln}@realcore.de`;
}

function parseDateFlexible(input: unknown): Date | null {
  if (input === null || input === undefined || input === "") return null;
  
  // Handle Excel serial date numbers (days since 1900-01-01, with Excel bug for 1900 leap year)
  if (typeof input === "number" || (typeof input === "string" && /^\d+(\.\d+)?$/.test(input.trim()))) {
    const serial = typeof input === "number" ? input : parseFloat(input);
    if (serial > 1 && serial < 100000) {
      // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as a leap year
      // So we need to subtract 1 for dates after Feb 28, 1900
      const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
      const d = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  
  const s = String(input).trim();
  
  // Handle dd.MM.yy or dd.MM.yyyy (German format)
  const m = s.match(/^([0-3]?\d)\.([0-1]?\d)\.(\d{2}|\d{4})$/);
  if (m) {
    const [, ddStr, mmStr, yyStr] = m;
    const dd = parseInt(ddStr!, 10);
    const mm = parseInt(mmStr!, 10) - 1;
    let yyyy = parseInt(yyStr!, 10);
    if (yyStr!.length === 2) {
      yyyy = yyyy < 50 ? 2000 + yyyy : 1900 + yyyy;
    }
    const d = new Date(yyyy, mm, dd);
    if (!Number.isNaN(d.getTime())) return d;
  }
  
  // Handle dd/MM/yyyy or MM/dd/yyyy
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, p1, p2, p3] = slashMatch;
    let yyyy = parseInt(p3!, 10);
    if (p3!.length === 2) yyyy = yyyy < 50 ? 2000 + yyyy : 1900 + yyyy;
    // Try dd/MM/yyyy first (European)
    const dd = parseInt(p1!, 10);
    const mm = parseInt(p2!, 10) - 1;
    if (dd <= 31 && mm <= 11) {
      const d = new Date(yyyy, mm, dd);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  
  // Fallback: try ISO parsing
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);
  
  return null;
}

// pick helper removed; build creates fully-typed Prisma inputs directly

function parseBool(val: unknown): boolean {
  if (val === true || val === false) return val;
  const s = String(val ?? "").toLowerCase().trim();
  return s === "true" || s === "wahr" || s === "1" || s === "ja" || s === "yes";
}

function parseRow(obj: Record<string, unknown>): ParsedRow {
  // Build case-insensitive header map
  const map: Record<string, string> = {};
  for (const k of Object.keys(obj)) map[normalizeHeader(k)] = k;

  // New format: exact column names (case-insensitive)
  const keyFirst = map["firstname"] ?? map["vorname"];
  const keyLast = map["lastname"] ?? map["nachname"];
  const keyEmail = map["email"] ?? map["e-mail"] ?? map["mail"];
  const keyStart = map["startdate"] ?? map["eintrittsdatum"] ?? map["eintritt"];
  const keyBirth = map["birthdate"] ?? map["geburtstag"] ?? map["geburtsdatum"];
  const keyLockAll = map["lockall"];
  const keyLockFirstName = map["lockfirstname"];
  const keyLockLastName = map["locklastname"];
  const keyLockStartDate = map["lockstartdate"];
  const keyLockBirthDate = map["lockbirthdate"];
  const keyLockEmail = map["lockemail"];

  const firstName = keyFirst ? String(obj[keyFirst] ?? "").trim() || null : null;
  const lastName = keyLast ? String(obj[keyLast] ?? "").trim() || null : null;
  const email = keyEmail ? String(obj[keyEmail] ?? "").trim() || null : null;
  const startDate = keyStart ? parseDateFlexible(obj[keyStart]) : null;
  const birthDate = keyBirth ? parseDateFlexible(obj[keyBirth]) : null;
  
  const lockAll = keyLockAll ? parseBool(obj[keyLockAll]) : false;
  const lockFirstName = keyLockFirstName ? parseBool(obj[keyLockFirstName]) : false;
  const lockLastName = keyLockLastName ? parseBool(obj[keyLockLastName]) : false;
  const lockStartDate = keyLockStartDate ? parseBool(obj[keyLockStartDate]) : false;
  const lockBirthDate = keyLockBirthDate ? parseBool(obj[keyLockBirthDate]) : false;
  const lockEmail = keyLockEmail ? parseBool(obj[keyLockEmail]) : false;

  return { firstName, lastName, email, startDate, birthDate, lockAll, lockFirstName, lockLastName, lockStartDate, lockBirthDate, lockEmail };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return Response.json({ error: "file is required" }, { status: 400 });
    }
    const maxBytes = 8 * 1024 * 1024; // 8 MB
    if (typeof file.size === "number" && file.size > maxBytes) {
      return Response.json({ error: `Datei ist zu groß (>${Math.floor(maxBytes/1024/1024)}MB). Bitte Datei aufteilen.` }, { status: 413 });
    }
    const buf = Buffer.from(await file.arrayBuffer());

    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return Response.json({ error: "No sheet found" }, { status: 400 });
    const ref = ws["!ref"];
    if (!ref) return Response.json({ error: "Sheet has no data" }, { status: 400 });
    const range = XLSX.utils.decode_range(ref);
    const headerRow = range.s.r; // assume first row is header
    const totalRows = range.e.r - headerRow; // data rows (excluding header)
    const maxRows = 5000;
    if (totalRows > maxRows) {
      return Response.json({ error: `Zu viele Zeilen (${totalRows}). Maximal ${maxRows} Zeilen pro Upload, bitte Datei aufteilen.` }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let skippedLocked = 0;
    let exited = 0;
    let skippedExitLocked = 0;
    let reactivated = 0;
    let skippedNoData = 0;

    const allEmployees = await db.employee.findMany({
      select: { id: true, firstName: true, lastName: true, birthDate: true, lockAll: true, status: true },
    });
    const touched = new Set<string>();

    // Read all rows once - use raw: true to get original values including dates as numbers
    const allRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
      raw: true,
      defval: null,
    });

    // Debug: log first row to understand structure
    const debugFirstRow = allRows.length > 0 ? JSON.stringify(allRows[0]) : "no rows";
    console.log("[import] totalRows:", allRows.length, "firstRow:", debugFirstRow);

    const batchSize = 300; // process in small chunks to reduce memory
    for (let offset = 0; offset < allRows.length; offset += batchSize) {
      const batchRows = allRows.slice(offset, offset + batchSize);

      for (const r of batchRows) {
        const parsed = parseRow(r);
        const { firstName, lastName, startDate, birthDate, email, lockAll, lockFirstName, lockLastName, lockStartDate, lockBirthDate, lockEmail } = parsed;
        if (!firstName || !lastName || !birthDate) {
          skippedNoData++;
          // Debug: log why row was skipped
          if (skippedNoData <= 3) {
            console.log("[import] skipped row - firstName:", firstName, "lastName:", lastName, "birthDate:", birthDate, "raw:", JSON.stringify(r));
          }
          continue; // insufficient data
        }

        const existing = await db.employee.findUnique({
          where: { firstName_lastName_birthDate: { firstName, lastName, birthDate } },
        });

        if (!existing) {
          const autoEmail = email ?? buildEmail(firstName, lastName) ?? undefined;
          const createdEmployee = await db.employee.create({
            data: {
              firstName: firstName!,
              lastName: lastName!,
              startDate: (startDate ?? new Date()),
              birthDate: birthDate!,
              ...(autoEmail !== undefined ? { email: autoEmail } : {}),
              status: "ACTIVE",
              exitDate: null,
              lockAll,
              lockFirstName,
              lockLastName,
              lockStartDate,
              lockBirthDate,
              lockEmail,
            },
          });
          touched.add(createdEmployee.id);
          created++;
          continue;
        }

        if (existing.lockAll) {
          skippedLocked++;
          continue;
        }

        const updateData: Partial<{
          firstName: string;
          lastName: string;
          startDate: Date;
          birthDate: Date;
          email: string | null;
          status: EmployeeStatus;
          exitDate: Date | null;
        }> = {};
        if (!existing.lockFirstName && firstName && existing.firstName !== firstName) {
          updateData.firstName = firstName;
        }
        if (!existing.lockLastName && lastName && existing.lastName !== lastName) {
          updateData.lastName = lastName;
        }
        if (!existing.lockStartDate && startDate && existing.startDate.getTime() !== startDate.getTime()) {
          updateData.startDate = startDate;
        }
        if (!existing.lockBirthDate && birthDate && existing.birthDate.getTime() !== birthDate.getTime()) {
          updateData.birthDate = birthDate;
        }
        if (!existing.lockEmail) {
          if (email != null && email !== existing.email) {
            updateData.email = email;
          } else if (!existing.email) {
            const auto = buildEmail(firstName, lastName);
            if (auto && auto !== existing.email) updateData.email = auto;
          }
        }

        if (existing.status === "EXITED") {
          updateData.status = "ACTIVE";
          updateData.exitDate = null;
        }

        if (Object.keys(updateData).length > 0) {
          const updatedEmployee = await db.employee.update({
            where: { id: existing.id },
            data: updateData,
          });
          touched.add(updatedEmployee.id);
          updated++;
          if (existing.status === "EXITED" && updateData.status === "ACTIVE") {
            reactivated++;
          }
        } else {
          touched.add(existing.id);
          skippedLocked++;
        }
      }
    }

    const now = new Date();
    for (const employee of allEmployees) {
      if (employee.status === "EXITED") continue;
      if (touched.has(employee.id)) continue;
      if (employee.lockAll) {
        skippedExitLocked++;
        continue;
      }
      await db.employee.update({
        where: { id: employee.id },
        data: { status: "EXITED", exitDate: now },
      });
      exited++;
    }

    await db.employeeImportLog.create({
      data: {
        created,
        updated,
        skippedLocked,
        exited,
        skippedExitLocked,
        reactivated,
      },
    });

    return Response.json({ created, updated, skippedLocked, exited, skippedExitLocked, reactivated, skippedNoData, totalRows: allRows.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
