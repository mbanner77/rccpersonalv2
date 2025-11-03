-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "email" TEXT,
    "lockAll" BOOLEAN NOT NULL DEFAULT false,
    "lockFirstName" BOOLEAN NOT NULL DEFAULT false,
    "lockLastName" BOOLEAN NOT NULL DEFAULT false,
    "lockStartDate" BOOLEAN NOT NULL DEFAULT false,
    "lockBirthDate" BOOLEAN NOT NULL DEFAULT false,
    "lockEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "managerEmails" TEXT NOT NULL DEFAULT '',
    "birthdayEmailTemplate" TEXT NOT NULL DEFAULT 'Happy Birthday, {{firstName}}!',
    "jubileeEmailTemplate" TEXT NOT NULL DEFAULT 'Congrats on {{years}} years, {{firstName}}!',
    "jubileeYearsCsv" TEXT NOT NULL DEFAULT '5,10,15,20,25,30,35,40'
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_firstName_lastName_birthDate_key" ON "Employee"("firstName", "lastName", "birthDate");
