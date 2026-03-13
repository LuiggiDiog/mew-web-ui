import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { env, setEnv, unsetEnv } from "@/env";

const ORIGINAL_SECRET = env.sessionSecret;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    unsetEnv("SESSION_SECRET");
  } else {
    setEnv("SESSION_SECRET", ORIGINAL_SECRET);
  }
});

describe("session-config", () => {
  it("throws when SESSION_SECRET is missing", async () => {
    unsetEnv("SESSION_SECRET");
    await expect(import("./session-config")).rejects.toThrow(
      "SESSION_SECRET is required and must be at least 32 characters long"
    );
  });

  it("throws when SESSION_SECRET is too short", async () => {
    setEnv("SESSION_SECRET", "short-secret");
    await expect(import("./session-config")).rejects.toThrow(
      "SESSION_SECRET is required and must be at least 32 characters long"
    );
  });

  it("builds session options when SESSION_SECRET is valid", async () => {
    setEnv("SESSION_SECRET", "12345678901234567890123456789012");
    const mod = await import("./session-config");
    expect(mod.sessionOptions.password).toBe("12345678901234567890123456789012");
  });
});
