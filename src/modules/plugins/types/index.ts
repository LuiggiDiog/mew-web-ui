import type { OllamaClient } from "@/modules/providers/services/ollama";

export type { OllamaClient };

export type EnhancePluginContext = {
  ollamaClient: OllamaClient;
  model: string;
  userPrompt: string;
  historyMessages: { role: "user"; content: string }[];
  isImg2Img: boolean;
  customSystemPrompt?: string;
  customImg2ImgSystemPrompt?: string;
};

export type EnhancePluginResult = {
  prompt: string;
  rawModelOutput?: string;
};

export type EnhancePlugin = {
  id: string;
  name: string;
  version: string;
  /**
   * Returns a confidence score 0-1 indicating how well this plugin handles the given profile.
   * Return 0 to opt out. The plugin with the highest score is used.
   */
  match(profile: { name?: string | null; workflowJson?: unknown }): number;
  enhance(context: EnhancePluginContext): Promise<EnhancePluginResult>;
};
