import { db } from "@/db";
import { installedPlugins } from "@/db/schema";
import { eq } from "drizzle-orm";

export type InstalledPluginRecord = typeof installedPlugins.$inferSelect;

export type InsertPluginData = {
  pluginId: string;
  name: string;
  version: string;
  githubUrl?: string | null;
  directoryName: string;
  kind?: string;
  isBuiltIn?: boolean;
  isActive?: boolean;
};

export async function listInstalledPlugins(): Promise<InstalledPluginRecord[]> {
  return db.select().from(installedPlugins).orderBy(installedPlugins.installedAt);
}

export async function findPluginByPluginId(
  pluginId: string
): Promise<InstalledPluginRecord | undefined> {
  const rows = await db
    .select()
    .from(installedPlugins)
    .where(eq(installedPlugins.pluginId, pluginId));
  return rows[0];
}

export async function insertPlugin(data: InsertPluginData): Promise<InstalledPluginRecord> {
  const rows = await db
    .insert(installedPlugins)
    .values({
      pluginId: data.pluginId,
      name: data.name,
      version: data.version,
      githubUrl: data.githubUrl ?? null,
      directoryName: data.directoryName,
      kind: data.kind ?? "enhance",
      isBuiltIn: data.isBuiltIn ?? false,
      isActive: data.isActive ?? true,
    })
    .returning();
  return rows[0];
}

export async function removePlugin(pluginId: string): Promise<void> {
  await db.delete(installedPlugins).where(eq(installedPlugins.pluginId, pluginId));
}

export async function setPluginActive(pluginId: string, isActive: boolean): Promise<void> {
  await db
    .update(installedPlugins)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(installedPlugins.pluginId, pluginId));
}
