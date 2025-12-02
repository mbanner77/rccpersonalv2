import { db } from "@/lib/prisma";
import { requireUser, hasRole } from "@/lib/auth";

type QualificationType = "FIRST_AID" | "FIRE_SAFETY" | "SAFETY_OFFICER" | "DATA_PROTECTION" | "WORKS_COUNCIL" | "APPRENTICE_TRAINER" | "FORKLIFT" | "CRANE" | "HAZMAT" | "ELECTRICAL" | "LANGUAGE" | "IT_CERTIFICATION" | "PROJECT_MGMT" | "OTHER";

// Default qualifications to seed
const DEFAULT_QUALIFICATIONS: { type: QualificationType; name: string; validityMonths: number | null }[] = [
  // Ersthelfer & Sicherheit
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
  
  // Sprachen
  { type: "LANGUAGE", name: "Englisch B2", validityMonths: null },
  { type: "LANGUAGE", name: "Englisch C1", validityMonths: null },
  
  // Cloud Zertifizierungen
  { type: "IT_CERTIFICATION", name: "AWS Certified Solutions Architect", validityMonths: 36 },
  { type: "IT_CERTIFICATION", name: "AWS Certified Developer", validityMonths: 36 },
  { type: "IT_CERTIFICATION", name: "Microsoft Azure Administrator (AZ-104)", validityMonths: 36 },
  { type: "IT_CERTIFICATION", name: "Microsoft Azure Developer (AZ-204)", validityMonths: 36 },
  { type: "IT_CERTIFICATION", name: "Google Cloud Professional", validityMonths: 36 },
  
  // SAP S/4HANA Zertifizierungen
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP S/4HANA Cloud", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP S/4HANA System Administration", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP S/4HANA Sales", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP S/4HANA Sourcing and Procurement", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP S/4HANA Production Planning and Manufacturing", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP S/4HANA Asset Management", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP S/4HANA Project Systems", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP S/4HANA for Financial Accounting", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP S/4HANA for Management Accounting", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP S/4HANA Business Process Integration", validityMonths: null },
  
  // SAP BTP (Business Technology Platform)
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP BTP Integration Suite", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP BTP Extension Developer", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Build Low-Code/No-Code", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP BTP, ABAP Environment", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Cloud Application Programming Model", validityMonths: null },
  
  // SAP ABAP & Entwicklung
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - Back-End Developer - ABAP Cloud", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Development Associate - ABAP with SAP NetWeaver", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Development Specialist - ABAP for SAP HANA", validityMonths: null },
  
  // SAP Fiori & UI5
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Fiori System Administration", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Development Associate - SAP Fiori Application Developer", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAPUI5 Application Developer", validityMonths: null },
  
  // SAP Analytics
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Analytics Cloud", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Analytics Cloud: Planning", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP BW/4HANA", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Application Associate - SAP BusinessObjects BI", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - Data Analyst - SAP Datasphere", validityMonths: null },
  
  // SAP HANA
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP HANA Cloud", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Technology Associate - SAP HANA (Edition 2.0)", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Application Associate - SAP HANA Modeling", validityMonths: null },
  
  // SAP SuccessFactors (HCM Cloud)
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP SuccessFactors Employee Central", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP SuccessFactors Recruiting", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP SuccessFactors Onboarding", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP SuccessFactors Compensation", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP SuccessFactors Performance and Goals", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP SuccessFactors Learning Management", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP SuccessFactors Time Tracking", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP SuccessFactors Workforce Analytics", validityMonths: null },
  
  // SAP Ariba
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Ariba Procurement", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Ariba Supplier Management", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Ariba Supply Chain Collaboration", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Ariba Contracts", validityMonths: null },
  
  // SAP Fieldglass
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Fieldglass Services Procurement", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Fieldglass Contingent Workforce Management", validityMonths: null },
  
  // SAP Concur
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Concur Expense", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Concur Travel", validityMonths: null },
  
  // SAP Customer Experience (CX)
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Sales Cloud", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Service Cloud", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Commerce Cloud", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Marketing Cloud", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Customer Data Cloud", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Emarsys Customer Engagement", validityMonths: null },
  
  // SAP SCM & Logistik
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Extended Warehouse Management", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Transportation Management", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Integrated Business Planning (IBP)", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Digital Manufacturing", validityMonths: null },
  
  // SAP Basis & Administration
  { type: "IT_CERTIFICATION", name: "SAP Certified Technology Associate - SAP NetWeaver AS Administration", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Technology Associate - SAP Solution Manager", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Activate Project Manager", validityMonths: null },
  
  // SAP Signavio
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Signavio Process Manager", validityMonths: null },
  { type: "IT_CERTIFICATION", name: "SAP Certified Associate - SAP Signavio Process Intelligence", validityMonths: null },
  
  // SAP Security
  { type: "IT_CERTIFICATION", name: "SAP Certified Technology Associate - SAP System Security and Authorizations", validityMonths: null },
  
  // Projektmanagement
  { type: "PROJECT_MGMT", name: "PMP (Project Management Professional)", validityMonths: 36 },
  { type: "PROJECT_MGMT", name: "PRINCE2 Foundation", validityMonths: null },
  { type: "PROJECT_MGMT", name: "PRINCE2 Practitioner", validityMonths: 36 },
  { type: "PROJECT_MGMT", name: "Scrum Master (PSM I)", validityMonths: null },
  { type: "PROJECT_MGMT", name: "Scrum Master (PSM II)", validityMonths: null },
  { type: "PROJECT_MGMT", name: "Product Owner (PSPO I)", validityMonths: null },
  { type: "PROJECT_MGMT", name: "SAFe Agilist", validityMonths: 12 },
  { type: "PROJECT_MGMT", name: "ITIL Foundation", validityMonths: null },
  { type: "PROJECT_MGMT", name: "ITIL Expert", validityMonths: null },
  
  // Sonstiges
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
        where: { type: qual.type, name: qual.name },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.qualification.create({
        data: {
          type: qual.type,
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
