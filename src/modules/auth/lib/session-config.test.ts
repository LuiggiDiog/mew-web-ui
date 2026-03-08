import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_SECRET = process.env.SESSION_SECRET;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.SESSION_SECRET;
  } else {
    process.env.SESSION_SECRET = ORIGINAL_SECRET;
  }
});

describe("session-config", () => {
  it("throws when SESSION_SECRET is missing", async () => {
    delete process.env.SESSION_SECRET;
    await expect(import("./session-config")).rejects.toThrow(
      "SESSION_SECRET is required and must be at least 32 characters long"
    );
  });

  it("throws when SESSION_SECRET is too short", async () => {
    process.env.SESSION_SECRET = "short-secret";
    await expect(import("./session-config")).rejects.toThrow(
      "SESSION_SECRET is required and must be at least 32 characters long"
    );
  });

  it("builds session options when SESSION_SECRET is valid", async () => {
    process.env.SESSION_SECRET = "12345678901234567890123456789012";
    const mod = await import("./session-config");
    expect(mod.sessionOptions.password).toBe("12345678901234567890123456789012");
  });
});
