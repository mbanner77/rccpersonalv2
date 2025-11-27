/**
 * Post-deployment migration script to:
 * 1. Create default ReminderType records
 * 2. Link existing Reminders to their ReminderType based on legacy "type" column
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_REMINDER_TYPES = [
  { key: "GEHALT", label: "Gehalt", description: "Gehaltserhöhungen und -anpassungen", color: "emerald", orderIndex: 0 },
  { key: "MEILENSTEIN", label: "Meilenstein", description: "Wichtige Ereignisse und Jubiläen", color: "blue", orderIndex: 1 },
  { key: "SONDERBONUS", label: "Sonderbonus", description: "Einmalige Bonuszahlungen", color: "purple", orderIndex: 2 },
  { key: "STAFFELBONUS", label: "Staffelbonus", description: "Gestaffelte Bonuszahlungen", color: "orange", orderIndex: 3 },
  { key: "URLAUBSGELD", label: "Urlaubsgeld", description: "Jährliche Urlaubsgeldzahlung", color: "indigo", orderIndex: 4 },
  { key: "WEIHNACHTSGELD", label: "Weihnachtsgeld", description: "Jährliche Weihnachtsgeldzahlung", color: "red", orderIndex: 5 },
];

async function migrateReminderTypes() {
  console.log("=== Migrating Reminder Types ===");
  
  // Step 1: Create default ReminderTypes if they don't exist
  console.log("\n1. Creating default ReminderType records...");
  const typeMap: Record<string, string> = {};
  
  for (const typeData of DEFAULT_REMINDER_TYPES) {
    let reminderType = await prisma.reminderType.findUnique({
      where: { key: typeData.key },
    });
    
    if (!reminderType) {
      reminderType = await prisma.reminderType.create({
        data: typeData,
      });
      console.log(`   Created: ${typeData.key} -> ${reminderType.id}`);
    } else {
      console.log(`   Exists: ${typeData.key} -> ${reminderType.id}`);
    }
    
    typeMap[typeData.key] = reminderType.id;
  }
  
  // Step 2: Update existing Reminders that have no reminderTypeId
  console.log("\n2. Updating existing Reminders without reminderTypeId...");
  
  // Get all reminders that have typeLegacy but no reminderTypeId
  // We need to use raw query because typeLegacy is mapped to "type" column
  const remindersToUpdate = await prisma.$queryRaw<Array<{ id: string; type: string }>>`
    SELECT id, type FROM "Reminder" WHERE "reminderTypeId" IS NULL AND type IS NOT NULL
  `;
  
  console.log(`   Found ${remindersToUpdate.length} reminders to update`);
  
  let updated = 0;
  let failed = 0;
  
  for (const reminder of remindersToUpdate) {
    const reminderTypeId = typeMap[reminder.type];
    
    if (reminderTypeId) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { reminderTypeId },
      });
      updated++;
    } else {
      console.log(`   Warning: Unknown type "${reminder.type}" for reminder ${reminder.id}`);
      failed++;
    }
  }
  
  console.log(`   Updated: ${updated}, Failed: ${failed}`);
  
  // Step 3: Check for any remaining reminders without reminderTypeId
  const remaining = await prisma.reminder.count({
    where: { reminderTypeId: null },
  });
  
  if (remaining > 0) {
    console.log(`\n   Warning: ${remaining} reminders still have no reminderTypeId`);
  } else {
    console.log("\n   All reminders have been migrated successfully!");
  }
  
  console.log("\n=== Migration Complete ===");
}

migrateReminderTypes()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
