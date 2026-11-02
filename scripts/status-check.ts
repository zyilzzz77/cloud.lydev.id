import { config } from "dotenv";

config({ path: ".env.local" });
config();

const { getMonitoringSummary } = await import("@/services/monitoring/service-status.service");

const summary = await getMonitoringSummary();

for (const service of summary.services) {
  const latency = service.latencyMs === null ? "-" : service.latencyMs + "ms";
  const code = service.statusCode === null ? "-" : String(service.statusCode);
  console.log(
    [service.name.padEnd(15), service.status.padEnd(12), code.padEnd(4), latency].join(" "),
  );
}

console.log("last checked:", summary.checkedAt ?? "never");
