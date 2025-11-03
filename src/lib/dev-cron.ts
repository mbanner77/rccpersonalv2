import cron from "node-cron";

// Prevent duplicate scheduling in dev with HMR
declare global {
  var __cronInitialized: boolean | undefined;
}

if (process.env.NODE_ENV !== "production" && !global.__cronInitialized) {
  global.__cronInitialized = true;

  // Run daily at 08:00 local time
  cron.schedule("0 8 * * *", async () => {
    try {
      await fetch("http://localhost:3000/api/schedule/run-daily");
    } catch {
      // ignore in dev
    }
  });

  // Optional: run once shortly after startup to aid dev testing
  setTimeout(async () => {
    try {
      await fetch("http://localhost:3000/api/schedule/run-daily");
    } catch {}
  }, 5000);
}
