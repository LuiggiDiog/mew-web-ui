import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

// Prevent multiple connections in dev (Next.js HMR)
const globalForDb = globalThis as unknown as {
  _pgClient?: ReturnType<typeof postgres>;
};

const connectionString = env.databaseUrl;

const client =
  globalForDb._pgClient ??
  postgres(connectionString, { max: 10 });

if (!env.isProduction) {
  globalForDb._pgClient = client;
}

export const db = drizzle(client, { schema });
export type DB = typeof db;
