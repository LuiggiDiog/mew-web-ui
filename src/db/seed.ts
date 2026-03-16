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
import {
  ENHANCE_SYSTEM_PROMPT,
  ENHANCE_IMG2IMG_SYSTEM_PROMPT,
  buildZImageTurboWorkflow,
  buildZImageTurboImg2ImgWorkflow,
  Z_IMAGE_TURBO_PLACEHOLDERS,
  Z_IMAGE_TURBO_IMG2IMG_PLACEHOLDERS,
  Z_IMAGE_TURBO_OUTPUT_NODE,
} from "@/modules/providers/services/comfyui";

const email = env.seedEmail;
const ollamaUrl = env.ollamaBaseUrl;

async function seed() {
  const client = postgres(env.databaseUrl);
  const db = drizzle(client, { schema });

  console.log("Seeding defaults for existing user...");

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (!user) {
    console.log(`No user found for ${email}.`);
    console.log("Create the first admin from /login bootstrap flow, then rerun seed if needed.");
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

  // Default Z-Image Turbo profile — only insert if user has no profiles yet
  const existingProfile = await db.query.comfyuiProfiles.findFirst({
    where: eq(schema.comfyuiProfiles.userId, user.id),
  });

  if (!existingProfile) {
    await db.insert(schema.comfyuiProfiles).values({
      userId: user.id,
      name: "Z-Image Turbo",
      baseUrl: env.comfyuiBaseUrl,
      workflowJson: buildZImageTurboWorkflow(),
      img2imgWorkflowJson: buildZImageTurboImg2ImgWorkflow(),
      outputNodeId: Z_IMAGE_TURBO_OUTPUT_NODE,
      placeholders: Z_IMAGE_TURBO_PLACEHOLDERS,
      img2imgPlaceholders: Z_IMAGE_TURBO_IMG2IMG_PLACEHOLDERS,
      enhanceSystemPrompt: ENHANCE_SYSTEM_PROMPT,
      enhanceImg2ImgSystemPrompt: ENHANCE_IMG2IMG_SYSTEM_PROMPT,
      isDefault: true,
    });
    console.log("Default ComfyUI profile (Z-Image Turbo) created.");
  } else {
    console.log("ComfyUI profile already exists, skipping.");
  }

  console.log(`Defaults ready for user: ${email}`);

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
