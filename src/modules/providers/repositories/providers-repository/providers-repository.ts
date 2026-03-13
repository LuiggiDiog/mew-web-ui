import { db } from "@/db";
import { providers } from "@/db/schema";
import { eq } from "drizzle-orm";

export type ProviderRecord = typeof providers.$inferSelect;

export async function listProvidersByUserId(userId: string): Promise<ProviderRecord[]> {
  return db.select().from(providers).where(eq(providers.userId, userId));
}
