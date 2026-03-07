export type ProviderType = "local" | "external";
export type ProviderStatus = "active" | "inactive";

// Core Provider type — matches the contract specified in AGENTS.md
export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl?: string | null;
  apiKey?: string | null;
  isActive: boolean;
  defaultModel?: string | null;
}

export interface Model {
  id: string;
  name: string;
  providerId: string;
  contextLength?: number;
}
