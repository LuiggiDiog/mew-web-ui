/**
 * Seed script - backfills default providers/settings for an existing user.
 *
 * This script no longer creates the first user. The first admin user must be
 * created through the in-app bootstrap flow when the database is empty.
 *
 * Usage:
 *   SEED_EMAIL=me@example.com npm run db:seed
 */

// env loaded via --env-file flag (see package.json db:seed script)
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { env } from "@/env";
import { DEFAULT_MODEL } from "@/modules/shared/constants";
import { createLogger } from "@/modules/shared/services";

const email = env.seedEmail;
const ollamaUrl = env.ollamaBaseUrl;
const logger = createLogger("db:seed");

async function seed() {
  const client = postgres(env.databaseUrl);
  const db = drizzle(client, { schema });

  logger.info("Seeding defaults for existing user");

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (!user) {
    logger.warn(`No user found for ${email}.`);
    logger.info("Create the first admin from /login bootstrap flow, then rerun seed if needed.");
    await client.end();
    return;
  }

  await db
    .insert(schema.providers)
    .values({
      id: "ollama",
      userId: user.id,
      name: "Ollama",
      type: "local",
      baseUrl: ollamaUrl,
      isActive: true,
      defaultModel: DEFAULT_MODEL,
    })
    .onConflictDoUpdate({
      target: schema.providers.id,
      set: {
        userId: user.id,
        name: "Ollama",
        type: "local",
        baseUrl: ollamaUrl,
        isActive: true,
        defaultModel: DEFAULT_MODEL,
        updatedAt: new Date(),
      },
    });

  const defaultSettings = [
    { key: "saveHistory", value: "true" },
    { key: "darkMode", value: "true" },
    { key: "defaultProvider", value: "ollama" },
    { key: "defaultModel", value: DEFAULT_MODEL },
  ];

  for (const setting of defaultSettings) {
    await db
      .insert(schema.settings)
      .values({ userId: user.id, key: setting.key, value: setting.value })
      .onConflictDoUpdate({
        target: [schema.settings.userId, schema.settings.key],
        set: { value: setting.value, updatedAt: new Date() },
      });
  }

  logger.info(`Defaults ready for user: ${email}`);

  await client.end();
}

seed().catch((err) => {
  logger.error("Seed failed", err);
  process.exit(1);
});
