import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type UserRecord = typeof users.$inferSelect;

type CreateGoogleUserInput = {
  email: string;
  displayName: string;
  googleSub: string;
};

type CreateLocalUserInput = {
  email: string;
  displayName: string;
  passwordHash: string;
};

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function countUsers(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  return row?.count ?? 0;
}

export async function createLocalUser(input: CreateLocalUserInput): Promise<UserRecord> {
  const [createdUser] = await db
    .insert(users)
    .values({
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      authProvider: "local",
    })
    .returning();

  if (!createdUser) {
    throw new Error("Failed to create local user");
  }

  return createdUser;
}

export async function createGoogleUser(
  input: CreateGoogleUserInput
): Promise<UserRecord> {
  const [createdUser] = await db
    .insert(users)
    .values({
      email: input.email,
      displayName: input.displayName,
      passwordHash: null,
      authProvider: "google",
      googleSub: input.googleSub,
    })
    .returning();

  if (!createdUser) {
    throw new Error("Failed to create Google user");
  }

  return createdUser;
}
