import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { OllamaClient } from "@/modules/providers/lib/ollama";
import { env } from "@/env";
import {
  DEFAULT_MODEL_SETTING_KEY,
  resolveDefaultModel,
} from "@/modules/settings/lib/default-model";
import {
  getSettingsMapByUserId,
  upsertSetting,
  upsertSettings,
} from "@/modules/settings/lib/settings-repository";

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

    await upsertSetting(userId, DEFAULT_MODEL_SETTING_KEY, resolvedDefaultModel);

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

  const flat = await getSettingsMapByUserId(session.userId);

  const normalizedSettings = await ensureValidDefaultModel(session.userId, flat);

  return NextResponse.json(normalizedSettings);
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json() as Record<string, string>;

  await upsertSettings(session.userId, body);

  return NextResponse.json({ ok: true });
}
