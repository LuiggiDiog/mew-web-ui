import type { Provider, Model } from "@/modules/providers/types";

export const MOCK_MODELS: Model[] = [
  // Ollama models
  { id: "llama3.2", name: "Llama 3.2", providerId: "ollama", contextLength: 128000 },
  { id: "llama3.1", name: "Llama 3.1", providerId: "ollama", contextLength: 128000 },
  { id: "mistral", name: "Mistral 7B", providerId: "ollama", contextLength: 32768 },
  { id: "codellama", name: "Code Llama", providerId: "ollama", contextLength: 16384 },
  { id: "phi3", name: "Phi-3 Mini", providerId: "ollama", contextLength: 128000 },
  { id: "deepseek-r1", name: "DeepSeek R1", providerId: "ollama", contextLength: 64000 },
  { id: "gemma2", name: "Gemma 2", providerId: "ollama", contextLength: 8192 },
  // OpenAI models
  { id: "gpt-4o", name: "GPT-4o", providerId: "openai", contextLength: 128000 },
  { id: "gpt-4o-mini", name: "GPT-4o mini", providerId: "openai", contextLength: 128000 },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", providerId: "openai", contextLength: 128000 },
  { id: "o1", name: "o1", providerId: "openai", contextLength: 200000 },
  { id: "o3-mini", name: "o3-mini", providerId: "openai", contextLength: 200000 },
  // Anthropic models
  { id: "claude-opus-4", name: "Claude Opus 4", providerId: "anthropic", contextLength: 200000 },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", providerId: "anthropic", contextLength: 200000 },
  { id: "claude-haiku-3-5", name: "Claude Haiku 3.5", providerId: "anthropic", contextLength: 200000 },
];

export const MOCK_PROVIDERS: Provider[] = [
  {
    id: "ollama",
    name: "Ollama",
    type: "local",
    baseUrl: "http://localhost:11434",
    apiKey: null,
    isActive: true,
    defaultModel: "llama3.2",
  },
  {
    id: "openai",
    name: "OpenAI",
    type: "external",
    baseUrl: null,
    apiKey: null, // Phase 2: real key management
    isActive: false,
    defaultModel: "gpt-4o",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "external",
    baseUrl: null,
    apiKey: null, // Phase 2: real key management
    isActive: false,
    defaultModel: "claude-sonnet-4-5",
  },
];

export function getModelsForProvider(providerId: string): Model[] {
  return MOCK_MODELS.filter((m) => m.providerId === providerId);
}
