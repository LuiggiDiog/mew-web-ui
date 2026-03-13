import { describe, expect, it } from "vitest";
import { resolveDefaultModel } from "./default-model";

const MODELS = [
  { name: "llama3.2:latest", modified_at: "2024-01-01", size: 1000 },
  { name: "phi4:latest", modified_at: "2024-01-02", size: 2000 },
];

describe("resolveDefaultModel", () => {
  it("returns preferred model when it exists", () => {
    const resolved = resolveDefaultModel(MODELS, "phi4:latest");
    expect(resolved).toBe("phi4:latest");
  });

  it("falls back to first available model when preferred does not exist", () => {
    const resolved = resolveDefaultModel(MODELS, "unknown-model");
    expect(resolved).toBe("llama3.2:latest");
  });

  it("returns null when no model is available", () => {
    const resolved = resolveDefaultModel([], "phi4:latest");
    expect(resolved).toBeNull();
  });
});
