import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Prevent multiple connections in dev (Next.js HMR)
const globalForDb = globalThis as unknown as {
  _pgClient?: ReturnType<typeof postgres>;
};

const connectionString = process.env.DATABASE_URL!;

const client =
  globalForDb._pgClient ??
  postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb._pgClient = client;
}

export const db = drizzle(client, { schema });
export type DB = typeof db;
