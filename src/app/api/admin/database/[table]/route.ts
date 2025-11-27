import { db } from "@/lib/prisma";
import { requireUser, hasRole } from "@/lib/auth";
import { NextRequest } from "next/server";

// Map table names to Prisma models
const tableModelMap: Record<string, string> = {
  Employee: "employee",
  User: "user",
  Unit: "unit",
  Reminder: "reminder",
  ReminderTypeConfig: "reminderTypeConfig",
  ReminderSendLog: "reminderSendLog",
  ReminderSchedule: "reminderSchedule",
  ReminderRecipient: "reminderRecipient",
  TaskTemplate: "taskTemplate",
  TaskAssignment: "taskAssignment",
  Absence: "absence",
  LifecycleRole: "lifecycleRole",
  LifecycleStatus: "lifecycleStatus",
};

// Get data from a specific table
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  try {
    const user = await requireUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { table } = await context.params;
    const modelName = tableModelMap[table];
    
    if (!modelName) {
      return Response.json({ error: `Unknown table: ${table}` }, { status: 400 });
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Access the model dynamically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (db as any)[modelName];
    
    if (!model) {
      return Response.json({ error: `Model not available: ${modelName}` }, { status: 400 });
    }

    // Get data with pagination
    const [data, total] = await Promise.all([
      model.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }).catch(() => 
        // Fallback without orderBy if createdAt doesn't exist
        model.findMany({
          take: limit,
          skip: offset,
        })
      ),
      model.count(),
    ]);

    // Get column names from first row or empty array
    const columns = data.length > 0 
      ? Object.keys(data[0]).filter(k => !k.startsWith("_"))
      : [];

    return Response.json({
      table,
      columns,
      data,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to get table data:", error);
    return Response.json({ error: "Failed to get table data" }, { status: 500 });
  }
}
