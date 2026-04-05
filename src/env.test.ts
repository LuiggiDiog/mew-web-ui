import { afterEach, describe, expect, it } from "vitest";
import { env, setEnv, unsetEnv } from "@/env";

const ORIGINAL_LOG_LEVEL = process.env.LOG_LEVEL;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  if (ORIGINAL_LOG_LEVEL === undefined) {
    unsetEnv("LOG_LEVEL");
  } else {
    setEnv("LOG_LEVEL", ORIGINAL_LOG_LEVEL);
  }

  if (ORIGINAL_NODE_ENV === undefined) {
    unsetEnv("NODE_ENV");
  } else {
    setEnv("NODE_ENV", ORIGINAL_NODE_ENV);
  }
});

describe("env.logLevel", () => {
  it("normalizes the configured LOG_LEVEL value", () => {
    setEnv("LOG_LEVEL", "WARN");
    expect(env.logLevel).toBe("warn");
  });

  it("falls back to info in production when LOG_LEVEL is invalid", () => {
    setEnv("NODE_ENV", "production");
    setEnv("LOG_LEVEL", "verbose");

    expect(env.logLevel).toBe("info");
  });

  it("falls back to debug in non-production when LOG_LEVEL is invalid", () => {
    setEnv("NODE_ENV", "development");
    setEnv("LOG_LEVEL", "verbose");

    expect(env.logLevel).toBe("debug");
  });
});

