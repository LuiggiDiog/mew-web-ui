import { afterEach, describe, expect, it, vi } from "vitest";
import { setEnv, unsetEnv } from "@/env";
import { createLogger } from ".";

const ORIGINAL_LOG_LEVEL = process.env.LOG_LEVEL;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  vi.restoreAllMocks();

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

describe("logger", () => {
  it("logs info but skips debug on info level", () => {
    setEnv("LOG_LEVEL", "info");

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const logger = createLogger("test:scope");
    logger.info("message");
    logger.debug("details");

    expect(infoSpy).toHaveBeenCalledWith("[test:scope] message");
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("logs debug details on debug level", () => {
    setEnv("LOG_LEVEL", "debug");

    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const logger = createLogger("test:scope");
    logger.debug("details", { key: "value" });

    expect(debugSpy).toHaveBeenCalledWith("[test:scope] details", { key: "value" });
  });

  it("skips all logs on silent level", () => {
    setEnv("LOG_LEVEL", "silent");

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const logger = createLogger("test:scope");
    logger.error("boom");

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("uses production fallback level info when LOG_LEVEL is missing", () => {
    unsetEnv("LOG_LEVEL");
    setEnv("NODE_ENV", "production");

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const logger = createLogger("test:scope");
    logger.info("message");
    logger.debug("details");

    expect(infoSpy).toHaveBeenCalledWith("[test:scope] message");
    expect(debugSpy).not.toHaveBeenCalled();
  });
});

