import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  lydevSqlClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.lydevSqlClient ??
  postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.lydevSqlClient = client;
}

export const db = drizzle(client, { schema });
export { client as sql };
