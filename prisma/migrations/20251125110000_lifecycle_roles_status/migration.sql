-- Add lifecycle role and status configuration tables
-- and migrate existing lifecycle template/task data from enums to relations

-- Create new lookup tables
CREATE TABLE "LifecycleRole" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "type" "LifecycleType",
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "LifecycleRole_key_key" ON "LifecycleRole"("key");

CREATE TABLE "LifecycleStatus" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "type" "LifecycleType",
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "isDone" BOOLEAN NOT NULL DEFAULT FALSE,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "LifecycleStatus_key_key" ON "LifecycleStatus"("key");

-- Add relational columns prior to migrating values
ALTER TABLE "LifecycleTaskTemplate" ADD COLUMN "ownerRoleId" TEXT;
ALTER TABLE "LifecycleTask" ADD COLUMN "ownerRoleId" TEXT;
ALTER TABLE "LifecycleTask" ADD COLUMN "statusId" TEXT;

-- Seed default roles (mirrors previous enum values)
INSERT INTO "LifecycleRole" ("id", "key", "label", "orderIndex", "active") VALUES
  ('role_ADMIN', 'ADMIN', 'Admin', 0, TRUE),
  ('role_HR', 'HR', 'HR', 1, TRUE),
  ('role_IT', 'IT', 'IT', 2, TRUE),
  ('role_UNIT_LEAD', 'UNIT_LEAD', 'Unit Lead', 3, TRUE),
  ('role_TEAM_LEAD', 'TEAM_LEAD', 'Team Lead', 4, TRUE),
  ('role_PEOPLE_MANAGER', 'PEOPLE_MANAGER', 'People Manager', 5, TRUE);

-- Seed default statuses (mirrors previous enum values)
INSERT INTO "LifecycleStatus" ("id", "key", "label", "orderIndex", "active", "isDone", "isDefault") VALUES
  ('status_OPEN', 'OPEN', 'Offen', 0, TRUE, FALSE, TRUE),
  ('status_COMPLETED', 'COMPLETED', 'Abgeschlossen', 1, TRUE, TRUE, FALSE),
  ('status_CANCELLED', 'CANCELLED', 'Abgebrochen', 2, TRUE, FALSE, FALSE);

-- Migrate existing template/task records to reference lookup tables
UPDATE "LifecycleTaskTemplate"
SET "ownerRoleId" = 'role_' || "ownerRole";

UPDATE "LifecycleTask"
SET "ownerRoleId" = 'role_' || "ownerRole",
    "statusId"    = 'status_' || "status";

-- Enforce non-null and add foreign keys
ALTER TABLE "LifecycleTaskTemplate"
  ALTER COLUMN "ownerRoleId" SET NOT NULL;

ALTER TABLE "LifecycleTask"
  ALTER COLUMN "ownerRoleId" SET NOT NULL,
  ALTER COLUMN "statusId" SET NOT NULL;

ALTER TABLE "LifecycleTaskTemplate"
  ADD CONSTRAINT "LifecycleTaskTemplate_ownerRoleId_fkey"
    FOREIGN KEY ("ownerRoleId") REFERENCES "LifecycleRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LifecycleTask"
  ADD CONSTRAINT "LifecycleTask_ownerRoleId_fkey"
    FOREIGN KEY ("ownerRoleId") REFERENCES "LifecycleRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LifecycleTask"
  ADD CONSTRAINT "LifecycleTask_statusId_fkey"
    FOREIGN KEY ("statusId") REFERENCES "LifecycleStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old enum-backed columns
ALTER TABLE "LifecycleTaskTemplate" DROP COLUMN "ownerRole";
ALTER TABLE "LifecycleTask" DROP COLUMN "ownerRole";
ALTER TABLE "LifecycleTask" DROP COLUMN "status";

-- Remove obsolete enum types
DROP TYPE "LifecycleOwnerRole";
DROP TYPE "LifecycleTaskStatus";
