import { db } from "@/lib/prisma";
import { requireUser, hasRole } from "@/lib/auth";

// Get database statistics and table information
export async function GET() {
  try {
    const user = await requireUser();
    if (!hasRole(user, "ADMIN")) {
      return Response.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    // Get counts for all main tables
    const [
      employeeCount,
      userCount,
      unitCount,
      reminderCount,
      taskTemplateCount,
      taskAssignmentCount,
      absenceCount,
      lifecycleRoleCount,
      lifecycleStatusCount,
      reminderSendLogCount,
    ] = await Promise.all([
      db.employee.count(),
      db.user.count(),
      db.unit.count(),
      db.reminder.count(),
      db.taskTemplate.count(),
      db.taskAssignment.count(),
      db.absence.count(),
      db.lifecycleRole.count(),
      db.lifecycleStatus.count(),
      db.reminderSendLog.count(),
    ]);

    // Get ReminderTypeConfig count separately (new model)
    let reminderTypeConfigCount = 0;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reminderTypeConfigCount = await (db as any).reminderTypeConfig?.count() ?? 0;
    } catch {
      // Model might not exist yet
    }

    const tables = [
      { name: "Employee", count: employeeCount, description: "Mitarbeiter" },
      { name: "User", count: userCount, description: "Benutzer/Accounts" },
      { name: "Unit", count: unitCount, description: "Organisationseinheiten" },
      { name: "Reminder", count: reminderCount, description: "Erinnerungen" },
      { name: "ReminderTypeConfig", count: reminderTypeConfigCount, description: "Erinnerungstypen" },
      { name: "ReminderSendLog", count: reminderSendLogCount, description: "E-Mail-Sendeprotokoll" },
      { name: "TaskTemplate", count: taskTemplateCount, description: "Aufgabenvorlagen" },
      { name: "TaskAssignment", count: taskAssignmentCount, description: "Aufgabenzuweisungen" },
      { name: "Absence", count: absenceCount, description: "Abwesenheiten" },
      { name: "LifecycleRole", count: lifecycleRoleCount, description: "Lifecycle-Rollen" },
      { name: "LifecycleStatus", count: lifecycleStatusCount, description: "Lifecycle-Status" },
    ];

    return Response.json({ tables });
  } catch (error) {
    console.error("Failed to get database stats:", error);
    return Response.json({ error: "Failed to get database statistics" }, { status: 500 });
  }
}
