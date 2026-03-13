type EnvKey =
  | "COMFYUI_BASE_URL"
  | "COMFYUI_CLIP_MODEL"
  | "COMFYUI_UNET_MODEL"
  | "COMFYUI_VAE_MODEL"
  | "DATABASE_URL"
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "GOOGLE_REDIRECT_URI"
  | "NEXT_PUBLIC_APP_URL"
  | "NODE_ENV"
  | "OLLAMA_BASE_URL"
  | "OLLAMA_TEST_ONLY_MODEL_ENABLED"
  | "SEED_DISPLAY_NAME"
  | "SEED_EMAIL"
  | "SEED_PASSWORD"
  | "SESSION_COOKIE_NAME"
  | "SESSION_SECRET";

function get(name: EnvKey): string | undefined {
  return process.env[name];
}

function getTrimmed(name: EnvKey): string | undefined {
  return get(name)?.trim();
}

function required(name: EnvKey): string {
  const value = get(name);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optional(name: EnvKey, fallback: string): string {
  return get(name) ?? fallback;
}

function bool(name: EnvKey, fallback = false): boolean {
  const value = get(name);
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

export function setEnv(name: EnvKey, value: string): void {
  process.env[name] = value;
}

export function unsetEnv(name: EnvKey): void {
  delete process.env[name];
}

export const env = {
  get nodeEnv(): string {
    return optional("NODE_ENV", "development");
  },
  get isProduction(): boolean {
    return this.nodeEnv === "production";
  },
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },
  get appUrl(): string {
    return optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  },
  get sessionSecret(): string | undefined {
    return get("SESSION_SECRET");
  },
  get sessionCookieName(): string {
    return optional("SESSION_COOKIE_NAME", "workspace_session");
  },
  get ollamaBaseUrl(): string {
    return optional("OLLAMA_BASE_URL", "http://localhost:11434");
  },
  get ollamaTestOnlyModelEnabled(): boolean {
    return bool("OLLAMA_TEST_ONLY_MODEL_ENABLED", false);
  },
  get comfyuiBaseUrl(): string {
    return optional("COMFYUI_BASE_URL", "http://192.168.1.202:8188");
  },
  get comfyuiUnetModel(): string {
    return optional("COMFYUI_UNET_MODEL", "z_image_turbo_nvfp4.safetensors");
  },
  get comfyuiClipModel(): string {
    return optional("COMFYUI_CLIP_MODEL", "qwen_3_4b_fp4_mixed.safetensors");
  },
  get comfyuiVaeModel(): string {
    return optional("COMFYUI_VAE_MODEL", "ae.safetensors");
  },
  get googleClientId(): string | undefined {
    return getTrimmed("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret(): string | undefined {
    return getTrimmed("GOOGLE_CLIENT_SECRET");
  },
  get googleRedirectUri(): string | undefined {
    return getTrimmed("GOOGLE_REDIRECT_URI");
  },
  get seedEmail(): string {
    return optional("SEED_EMAIL", "admin@workspace.local");
  },
  get seedPassword(): string {
    return optional("SEED_PASSWORD", "changeme");
  },
  get seedDisplayName(): string {
    return optional("SEED_DISPLAY_NAME", "Admin");
  },
};
