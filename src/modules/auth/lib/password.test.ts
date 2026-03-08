import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashPassword produces a different string than the input", async () => {
    const hash = await hashPassword("mysecret");
    expect(hash).not.toBe("mysecret");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("hashPassword produces different hashes for the same input", async () => {
    const hash1 = await hashPassword("mysecret");
    const hash2 = await hashPassword("mysecret");
    expect(hash1).not.toBe(hash2);
  });

  it("verifyPassword returns true for correct password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("correct", hash)).toBe(true);
  });

  it("verifyPassword returns false for wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
