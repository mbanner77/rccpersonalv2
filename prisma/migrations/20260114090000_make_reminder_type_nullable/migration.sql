-- Make Reminder.type (typeLegacy) nullable to allow new reminders without legacy type
ALTER TABLE "Reminder" ALTER COLUMN "type" DROP NOT NULL;
