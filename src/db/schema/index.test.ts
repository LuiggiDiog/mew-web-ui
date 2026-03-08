import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { users, conversations, messages, providers, settings } from "./index";

describe("DB Schema", () => {
  describe("users table", () => {
    it("has required columns", () => {
      const cols = Object.keys(getTableColumns(users));
      expect(cols).toContain("id");
      expect(cols).toContain("email");
      expect(cols).toContain("passwordHash");
      expect(cols).toContain("displayName");
      expect(cols).toContain("authProvider");
      expect(cols).toContain("googleSub");
      expect(cols).toContain("createdAt");
    });
  });

  describe("conversations table", () => {
    it("has required columns", () => {
      const cols = Object.keys(getTableColumns(conversations));
      expect(cols).toContain("id");
      expect(cols).toContain("userId");
      expect(cols).toContain("title");
      expect(cols).toContain("preview");
      expect(cols).toContain("model");
      expect(cols).toContain("provider");
      expect(cols).toContain("createdAt");
      expect(cols).toContain("updatedAt");
    });
  });

  describe("messages table", () => {
    it("has required columns", () => {
      const cols = Object.keys(getTableColumns(messages));
      expect(cols).toContain("id");
      expect(cols).toContain("conversationId");
      expect(cols).toContain("role");
      expect(cols).toContain("content");
      expect(cols).toContain("createdAt");
    });
  });

  describe("providers table", () => {
    it("has required columns", () => {
      const cols = Object.keys(getTableColumns(providers));
      expect(cols).toContain("id");
      expect(cols).toContain("userId");
      expect(cols).toContain("name");
      expect(cols).toContain("type");
      expect(cols).toContain("baseUrl");
      expect(cols).toContain("isActive");
      expect(cols).toContain("defaultModel");
    });
  });

  describe("settings table", () => {
    it("has required columns", () => {
      const cols = Object.keys(getTableColumns(settings));
      expect(cols).toContain("userId");
      expect(cols).toContain("key");
      expect(cols).toContain("value");
      expect(cols).toContain("updatedAt");
    });
  });
});
