import type { AppSettings } from "@/modules/settings/types";

// TODO: Phase 2 — replace with real persisted settings
export const MOCK_DEFAULT_SETTINGS: AppSettings = {
  saveHistory: true,
  darkMode: true,
  defaultProvider: "ollama",
  defaultModel: "llama3.2",
};
