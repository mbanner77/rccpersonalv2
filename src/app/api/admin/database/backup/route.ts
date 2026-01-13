import { db } from "@/lib/prisma";
import { requireUser, hasRole } from "@/lib/auth";
import { NextRequest } from "next/server";

// Models to export (order matters for import due to foreign key dependencies)
const exportModels = [
  "unit",
  "department",
  "team",
  "location",
  "employee",
  "user",
  "setting",
  "lifecycleRole",
  "lifecycleStatus",
  "lifecycleTemplate",
  "lifecycleTaskTemplate",
  "lifecycleProcess",
  "lifecycleTask",
  "taskTemplate",
  "taskAssignment",
  "absence",
  "reminder",
  "reminderTypeConfig",
  "reminderSchedule",
  "reminderRecipient",
  "reminderSendLog",
  "employeeAssignment",
  "employeeDocument",
  "asset",
  "assetTransfer",
  "access",
  "certificateCategory",
  "certificateTextBlock",
  "workCertificate",
  "workCertificateSection",
  "internalProject",
  "projectApplication",
  "vehicle",
  "vehicleAssignment",
  "vehicleCost",
  "qualification",
  "employeeQualification",
  "hrTicketCategory",
  "hrTicket",
  "hrTicketComment",
  "employeeImportLog",
];

// GET: Export all data as JSON
export async function GET() {
  try {
    const user = await requireUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const backup: Record<string, unknown[]> = {};
    const errors: string[] = [];

    for (const modelName of exportModels) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = (db as any)[modelName];
        if (model && typeof model.findMany === "function") {
          const data = await model.findMany();
          backup[modelName] = data;
        }
      } catch (err) {
        // Model might not exist or have issues - continue with others
        errors.push(`${modelName}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      tables: backup,
      errors: errors.length > 0 ? errors : undefined,
    };

    // Return as downloadable JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Failed to export database:", error);
    return Response.json({ error: "Failed to export database" }, { status: 500 });
  }
}

// POST: Import data from JSON backup
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await req.json();
    
    if (!body.tables || typeof body.tables !== "object") {
      return Response.json({ error: "Invalid backup format - missing 'tables' object" }, { status: 400 });
    }

    const results: Record<string, { imported: number; errors: string[] }> = {};
    
    // Import in order to respect foreign key dependencies
    for (const modelName of exportModels) {
      const tableData = body.tables[modelName];
      if (!Array.isArray(tableData) || tableData.length === 0) {
        continue;
      }

      results[modelName] = { imported: 0, errors: [] };

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = (db as any)[modelName];
        if (!model || typeof model.upsert !== "function") {
          results[modelName].errors.push("Model not available");
          continue;
        }

        for (const record of tableData) {
          try {
            // Use upsert to handle both new and existing records
            const id = record.id;
            if (!id) {
              results[modelName].errors.push("Record missing id field");
              continue;
            }

            // Remove auto-generated fields that might cause conflicts
            const { createdAt, updatedAt, ...data } = record;

            await model.upsert({
              where: { id },
              create: { ...data, id },
              update: data,
            });
            results[modelName].imported++;
          } catch (err) {
            results[modelName].errors.push(
              `ID ${record.id}: ${err instanceof Error ? err.message : "Unknown error"}`
            );
          }
        }
      } catch (err) {
        results[modelName].errors.push(
          `Table error: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    const totalImported = Object.values(results).reduce((sum, r) => sum + r.imported, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0);

    return Response.json({
      success: true,
      message: `Import abgeschlossen: ${totalImported} Datensätze importiert, ${totalErrors} Fehler`,
      totalImported,
      totalErrors,
      details: results,
    });
  } catch (error) {
    console.error("Failed to import database:", error);
    return Response.json({ 
      error: "Failed to import database",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
