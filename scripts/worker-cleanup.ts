import { config } from "dotenv";

config({ path: ".env.local" });
config();

const { cleanupExpiredDlFiles } = await import("@/services/storage/cleanup.service");

const removed = await cleanupExpiredDlFiles();
console.log(`Removed ${removed} expired file(s).`);
