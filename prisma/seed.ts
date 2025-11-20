import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@realcore.de").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "RealCore2025!";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Administrator";

  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      managerEmails: "",
    },
  });

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`[seed] Created default admin ${adminEmail}`);
  } else {
    console.log(`[seed] Admin ${adminEmail} already exists, skipping creation.`);
  }

  // Seed default lifecycle task templates (idempotent upserts by unique compound of title+type)
  const templates: Array<{ title: string; description?: string; type: "ONBOARDING"|"OFFBOARDING"; ownerRole: "HR"|"IT"|"ADMIN"|"UNIT_LEAD"|"TEAM_LEAD"|"PEOPLE_MANAGER"; relativeDueDays: number; active?: boolean; }>
    = [
      { title: "IT-Account anlegen", description: "Benutzer im IDM anlegen", type: "ONBOARDING", ownerRole: "UNIT_LEAD", relativeDueDays: -3 },
      { title: "Laptop vorbereiten", description: "Gerät provisionieren", type: "ONBOARDING", ownerRole: "UNIT_LEAD", relativeDueDays: -2 },
      { title: "Zutritt/Schlüssel organisieren", type: "ONBOARDING", ownerRole: "HR", relativeDueDays: -1 },
      { title: "Intro & Richtlinien", type: "ONBOARDING", ownerRole: "HR", relativeDueDays: 1 },
      { title: "Systemzugänge sperren", type: "OFFBOARDING", ownerRole: "UNIT_LEAD", relativeDueDays: 0 },
      { title: "Hardware zurücknehmen", type: "OFFBOARDING", ownerRole: "UNIT_LEAD", relativeDueDays: 0 },
      { title: "Austrittsgespräch", type: "OFFBOARDING", ownerRole: "HR", relativeDueDays: -1 },
    ];

  for (const t of templates) {
    await (prisma as any)["taskTemplate"].upsert({
      where: { title_type: { title: t.title, type: t.type } },
      update: { description: t.description ?? null, ownerRole: t.ownerRole, relativeDueDays: t.relativeDueDays, active: true },
      create: { title: t.title, description: t.description ?? null, type: t.type, ownerRole: t.ownerRole, relativeDueDays: t.relativeDueDays, active: true },
    }).catch(() => undefined);
  }
}

main()
  .then(() => console.log("[seed] Complete."))
  .catch((error) => {
    console.error("[seed] Error seeding database:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
