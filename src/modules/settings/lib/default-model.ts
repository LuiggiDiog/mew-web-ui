import type { OllamaModel } from "@/modules/providers/lib/ollama";
import { DEFAULT_MODEL } from "@/modules/shared/constants";

export const DEFAULT_MODEL_SETTING_KEY = "defaultModel";

export function resolveDefaultModel(
  availableModels: OllamaModel[],
  preferredModel?: string | null
): string | null {
  if (availableModels.length === 0) return null;

  const availableNames = new Set(availableModels.map((model) => model.name));

  if (preferredModel && availableNames.has(preferredModel)) {
    return preferredModel;
  }

  if (availableNames.has(DEFAULT_MODEL)) {
    return DEFAULT_MODEL;
  }

  return availableModels[0]?.name ?? null;
}
