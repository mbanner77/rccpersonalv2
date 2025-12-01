import { db } from "@/lib/prisma";
import { requireUser, hasRole } from "@/lib/auth";

// Default qualifications to seed
const DEFAULT_QUALIFICATIONS = [
  { type: "FIRST_AID", name: "Ersthelfer Grundkurs", validityMonths: 24 },
  { type: "FIRST_AID", name: "Ersthelfer Auffrischung", validityMonths: 24 },
  { type: "FIRE_SAFETY", name: "Brandschutzhelfer", validityMonths: 36 },
  { type: "SAFETY_OFFICER", name: "Sicherheitsbeauftragter", validityMonths: null },
  { type: "DATA_PROTECTION", name: "Datenschutzbeauftragter", validityMonths: null },
  { type: "WORKS_COUNCIL", name: "Betriebsratsmitglied", validityMonths: null },
  { type: "APPRENTICE_TRAINER", name: "Ausbildereignung (AEVO)", validityMonths: null },
  { type: "FORKLIFT", name: "Staplerführerschein", validityMonths: 12 },
  { type: "CRANE", name: "Kranführerschein", validityMonths: 12 },
  { type: "HAZMAT", name: "Gefahrgutbeauftragter", validityMonths: 60 },
  { type: "ELECTRICAL", name: "Elektrofachkraft", validityMonths: null },
  { type: "LANGUAGE", name: "Englisch B2", validityMonths: null },
  { type: "LANGUAGE", name: "Englisch C1", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "AWS Certified", validityMonths: 36 },
  { type: "IT_CERTIFICATION", name: "Azure Certified", validityMonths: 36 },
  { type: "IT_CERTIFICATION", name: "Google Cloud Certified", validityMonths: 36 },
  { type: "PROJECT_MGMT", name: "PMP (Project Management Professional)", validityMonths: 36 },
  { type: "PROJECT_MGMT", name: "PRINCE2 Foundation", validityMonths: null },
  { type: "PROJECT_MGMT", name: "Scrum Master", validityMonths: 24 },
  { type: "OTHER", name: "Sonstige Qualifikation", validityMonths: null },
];

export async function POST() {
  try {
    const user = await requireUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Nur Admins können Qualifikationen anlegen" }, { status: 403 });
    }

    let created = 0;
    let skipped = 0;

    for (const qual of DEFAULT_QUALIFICATIONS) {
      const existing = await db.qualification.findFirst({
        where: { type: qual.type as string, name: qual.name },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.qualification.create({
        data: {
          type: qual.type as string,
          name: qual.name,
          validityMonths: qual.validityMonths,
          isCompanyWide: ["FIRST_AID", "FIRE_SAFETY"].includes(qual.type),
        },
      });
      created++;
    }

    return Response.json({
      success: true,
      created,
      skipped,
      message: `${created} Qualifikationen erstellt, ${skipped} übersprungen`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler";
    return Response.json({ error: msg }, { status: 500 });
  }
}
