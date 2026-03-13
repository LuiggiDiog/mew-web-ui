/**
 * Seed script — creates the first user + default providers + default settings.
 *
 * Usage:
 *   SEED_EMAIL=me@example.com SEED_PASSWORD=secret SEED_DISPLAY_NAME="Your Name" npm run db:seed
 *
 * Or set these in .env.local and run: npm run db:seed
 */

// env loaded via --env-file flag (see package.json db:seed script)
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import { env } from "@/env";
import { DEFAULT_MODEL } from "@/modules/shared/constants";

const email = env.seedEmail;
const password = env.seedPassword;
const displayName = env.seedDisplayName;
const ollamaUrl = env.ollamaBaseUrl;

async function seed() {
  const client = postgres(env.databaseUrl);
  const db = drizzle(client, { schema });

  console.log("Seeding database...");

  // Create user
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(schema.users)
    .values({ email, displayName, passwordHash, authProvider: "local" })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    console.log(`User ${email} already exists. Skipping.`);
    await client.end();
    return;
  }

  console.log(`Created user: ${email}`);

  // Create default Ollama provider
  await db.insert(schema.providers).values({
    id: "ollama",
    userId: user.id,
    name: "Ollama",
    type: "local",
    baseUrl: ollamaUrl,
    isActive: true,
    defaultModel: DEFAULT_MODEL,
  });
  console.log("Created Ollama provider");

  // Create default settings
  const defaultSettings = [
    { key: "saveHistory", value: "true" },
    { key: "darkMode", value: "true" },
    { key: "defaultProvider", value: "ollama" },
    { key: "defaultModel", value: DEFAULT_MODEL },
  ];

  await db.insert(schema.settings).values(
    defaultSettings.map((s) => ({ userId: user.id, ...s }))
  );
  console.log("Created default settings");

  console.log("\nSeed complete!");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
