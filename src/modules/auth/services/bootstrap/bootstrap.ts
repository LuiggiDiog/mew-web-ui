import { sql } from "drizzle-orm";
import { db } from "@/db";
import { providers, settings, users } from "@/db/schema";
import { env } from "@/env";
import { DEFAULT_MODEL } from "@/modules/shared/constants";
import { countUsers, type UserRecord } from "@/modules/auth/repositories/users-repository";
import { hashPassword } from "@/modules/auth/services/password";

type RegisterInitialAdminInput = {
  email: string;
  displayName: string;
  password: string;
};

export class BootstrapAlreadyCompletedError extends Error {
  constructor() {
    super("Bootstrap already completed");
    this.name = "BootstrapAlreadyCompletedError";
  }
}

export async function isBootstrapRequired(): Promise<boolean> {
  const totalUsers = await countUsers();
  return totalUsers === 0;
}

export async function registerInitialAdmin(
  input: RegisterInitialAdminInput
): Promise<UserRecord> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`LOCK TABLE "users" IN EXCLUSIVE MODE`);

    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    if ((row?.count ?? 0) > 0) {
      throw new BootstrapAlreadyCompletedError();
    }

    const passwordHash = await hashPassword(input.password);

    const [createdUser] = await tx
      .insert(users)
      .values({
        email: input.email,
        displayName: input.displayName,
        passwordHash,
        authProvider: "local",
      })
      .returning();

    if (!createdUser) {
      throw new Error("Failed to create initial admin user");
    }

    await tx.insert(providers).values({
      id: "ollama",
      userId: createdUser.id,
      name: "Ollama",
      type: "local",
      baseUrl: env.ollamaBaseUrl,
      isActive: true,
      defaultModel: DEFAULT_MODEL,
    });

    await tx.insert(settings).values([
      { userId: createdUser.id, key: "saveHistory", value: "true" },
      { userId: createdUser.id, key: "darkMode", value: "true" },
      { userId: createdUser.id, key: "defaultProvider", value: "ollama" },
      { userId: createdUser.id, key: "defaultModel", value: DEFAULT_MODEL },
    ]);

    return createdUser;
  });
}
