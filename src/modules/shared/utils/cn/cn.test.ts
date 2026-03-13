import { describe, it, expect } from "vitest";
import { cn } from ".";

describe("cn", () => {
  it("joins class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cn(undefined, null, false)).toBe("");
  });

  it("handles a single class", () => {
    expect(cn("only")).toBe("only");
  });

  it("returns empty string with no arguments", () => {
    expect(cn()).toBe("");
  });
});
