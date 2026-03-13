import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { env } from "@/env";
import {
  DEFAULT_MODEL_SETTING_KEY,
  resolveDefaultModel,
} from "@/modules/settings/lib/default-model";

async function ensureValidDefaultModel(
  userId: string,
  currentSettings: Record<string, string>
): Promise<Record<string, string>> {
  const client = new OllamaClient(env.ollamaBaseUrl);

  try {
    const models = await client.listModels();
    const resolvedDefaultModel = resolveDefaultModel(
      models,
      currentSettings[DEFAULT_MODEL_SETTING_KEY]
    );

    if (!resolvedDefaultModel) {
      return currentSettings;
    }

    if (currentSettings[DEFAULT_MODEL_SETTING_KEY] === resolvedDefaultModel) {
      return currentSettings;
    }

    await db
      .insert(settings)
      .values({
        userId,
        key: DEFAULT_MODEL_SETTING_KEY,
        value: resolvedDefaultModel,
      })
      .onConflictDoUpdate({
        target: [settings.userId, settings.key],
        set: { value: resolvedDefaultModel, updatedAt: new Date() },
      });

    return {
      ...currentSettings,
      [DEFAULT_MODEL_SETTING_KEY]: resolvedDefaultModel,
    };
  } catch {
    // If Ollama is down/unreachable, keep existing settings unchanged.
    return currentSettings;
  }
}

export async function GET() {
  const { session, error } = await getApiSession();
  if (error) return error;

  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, session.userId));

  const flat: Record<string, string> = {};
  for (const row of rows) {
    flat[row.key] = row.value;
  }

  const normalizedSettings = await ensureValidDefaultModel(session.userId, flat);

  return NextResponse.json(normalizedSettings);
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json() as Record<string, string>;

  for (const [key, value] of Object.entries(body)) {
    await db
      .insert(settings)
      .values({ userId: session.userId, key, value })
      .onConflictDoUpdate({
        target: [settings.userId, settings.key],
        set: { value, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ ok: true });
}
