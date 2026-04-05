import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export type SettingRecord = typeof settings.$inferSelect;
export type SettingsMap = Record<string, string>;

export async function listSettingsByUserId(userId: string): Promise<SettingRecord[]> {
  return db.select().from(settings).where(eq(settings.userId, userId));
}

export async function getSettingsMapByUserId(userId: string): Promise<SettingsMap> {
  const rows = await listSettingsByUserId(userId);
  const map: SettingsMap = {};

  for (const row of rows) {
    map[row.key] = row.value;
  }

  return map;
}

export async function upsertSetting(
  userId: string,
  key: string,
  value: string
): Promise<void> {
  await db
    .insert(settings)
    .values({ userId, key, value })
    .onConflictDoUpdate({
      target: [settings.userId, settings.key],
      set: { value, updatedAt: new Date() },
    });
}

export async function upsertSettings(
  userId: string,
  values: SettingsMap
): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    await upsertSetting(userId, key, value);
  }
}
