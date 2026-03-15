import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSession = {
  userId: undefined as string | undefined,
  email: "test@test.com",
  displayName: "Test User",
  destroy: vi.fn(),
};

vi.mock("@/modules/auth/services/session", () => ({
  getSession: vi.fn().mockImplementation(() => Promise.resolve(mockSession)),
}));

vi.mock("@/modules/auth/repositories/users-repository", () => ({
  findUserById: vi.fn(),
}));

import { getApiSession } from "./api-auth";
import { getSession } from "@/modules/auth/services/session";
import { findUserById } from "@/modules/auth/repositories/users-repository";

describe("getApiSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.userId = undefined;
  });

  it("returns 401 when session has no userId", async () => {
    const result = await getApiSession();

    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(401);
    await expect(result.error?.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(findUserById).not.toHaveBeenCalled();
  });

  it("returns session when user exists", async () => {
    mockSession.userId = "user-1";
    vi.mocked(findUserById).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      displayName: "Test User",
      passwordHash: "hash",
      authProvider: "local",
      googleSub: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getApiSession();

    expect(result.error).toBeNull();
    expect(result.session?.userId).toBe("user-1");
    expect(findUserById).toHaveBeenCalledWith("user-1");
  });

  it("destroys session and returns 401 when user no longer exists", async () => {
    mockSession.userId = "deleted-user";
    vi.mocked(findUserById).mockResolvedValue(undefined);

    const result = await getApiSession();

    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(401);
    await expect(result.error?.json()).resolves.toEqual({
      error: "Unauthorized",
      code: "SESSION_INVALID",
    });
    expect(mockSession.destroy).toHaveBeenCalledTimes(1);
  });

  it("reads session from auth service", async () => {
    mockSession.userId = "user-1";
    vi.mocked(findUserById).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      displayName: "Test User",
      passwordHash: "hash",
      authProvider: "local",
      googleSub: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await getApiSession();

    expect(getSession).toHaveBeenCalledTimes(1);
  });
});
