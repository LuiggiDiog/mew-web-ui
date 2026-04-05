import { db } from "@/db";
import { comfyuiProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type ComfyuiProfileRecord = typeof comfyuiProfiles.$inferSelect;

export type PlaceholderEntry = { nodeId: string; field: string };
export type PlaceholderMap = {
  positivePrompt?: PlaceholderEntry;
  negativePrompt?: PlaceholderEntry;
  width?: PlaceholderEntry;
  height?: PlaceholderEntry;
  seed?: PlaceholderEntry;
  denoise?: PlaceholderEntry;
  referenceImage?: PlaceholderEntry;
};

export type CreateProfileData = {
  userId: string;
  name: string;
  baseUrl: string;
  workflowJson: object;
  img2imgWorkflowJson?: object | null;
  outputNodeId?: string;
  placeholders: PlaceholderMap;
  img2imgPlaceholders?: PlaceholderMap | null;
  enhanceSystemPrompt?: string | null;
  enhanceImg2ImgSystemPrompt?: string | null;
  enhanceModel?: string | null;
  isDefault?: boolean;
};

export type UpdateProfileData = Partial<Omit<CreateProfileData, "userId">>;

export async function listProfilesByUserId(userId: string): Promise<ComfyuiProfileRecord[]> {
  return db
    .select()
    .from(comfyuiProfiles)
    .where(eq(comfyuiProfiles.userId, userId))
    .orderBy(comfyuiProfiles.createdAt);
}

export async function findProfileById(
  userId: string,
  profileId: string
): Promise<ComfyuiProfileRecord | undefined> {
  const rows = await db
    .select()
    .from(comfyuiProfiles)
    .where(and(eq(comfyuiProfiles.id, profileId), eq(comfyuiProfiles.userId, userId)));
  return rows[0];
}

export async function findDefaultProfile(userId: string): Promise<ComfyuiProfileRecord | undefined> {
  const rows = await db
    .select()
    .from(comfyuiProfiles)
    .where(and(eq(comfyuiProfiles.userId, userId), eq(comfyuiProfiles.isDefault, true)));

  if (rows[0]) return rows[0];

  // Fallback: return first profile if no default is set
  const all = await db
    .select()
    .from(comfyuiProfiles)
    .where(eq(comfyuiProfiles.userId, userId))
    .orderBy(comfyuiProfiles.createdAt);
  return all[0];
}

export async function createProfile(data: CreateProfileData): Promise<ComfyuiProfileRecord> {
  if (data.isDefault) {
    await db
      .update(comfyuiProfiles)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(comfyuiProfiles.userId, data.userId));
  }

  const [row] = await db
    .insert(comfyuiProfiles)
    .values({
      userId: data.userId,
      name: data.name,
      baseUrl: data.baseUrl,
      workflowJson: data.workflowJson,
      img2imgWorkflowJson: data.img2imgWorkflowJson ?? null,
      outputNodeId: data.outputNodeId ?? "9",
      placeholders: data.placeholders,
      img2imgPlaceholders: data.img2imgPlaceholders ?? null,
      enhanceSystemPrompt: data.enhanceSystemPrompt ?? null,
      enhanceImg2ImgSystemPrompt: data.enhanceImg2ImgSystemPrompt ?? null,
      enhanceModel: data.enhanceModel ?? null,
      isDefault: data.isDefault ?? false,
    })
    .returning();

  return row;
}

export async function updateProfile(
  userId: string,
  profileId: string,
  data: UpdateProfileData
): Promise<ComfyuiProfileRecord | undefined> {
  if (data.isDefault) {
    await db
      .update(comfyuiProfiles)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(comfyuiProfiles.userId, userId), eq(comfyuiProfiles.isDefault, true)));
  }

  const [row] = await db
    .update(comfyuiProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(comfyuiProfiles.id, profileId), eq(comfyuiProfiles.userId, userId)))
    .returning();

  return row;
}

export async function deleteProfile(
  userId: string,
  profileId: string
): Promise<{ deleted: boolean; reason?: string }> {
  const all = await listProfilesByUserId(userId);

  if (all.length <= 1) {
    return { deleted: false, reason: "Cannot delete the only profile" };
  }

  const target = all.find((p) => p.id === profileId);
  if (!target) return { deleted: false, reason: "Not found" };

  await db
    .delete(comfyuiProfiles)
    .where(and(eq(comfyuiProfiles.id, profileId), eq(comfyuiProfiles.userId, userId)));

  // If deleted profile was default, promote the first remaining one
  if (target.isDefault) {
    const remaining = all.filter((p) => p.id !== profileId);
    if (remaining[0]) {
      await db
        .update(comfyuiProfiles)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(comfyuiProfiles.id, remaining[0].id));
    }
  }

  return { deleted: true };
}

export async function setDefaultProfile(
  userId: string,
  profileId: string
): Promise<ComfyuiProfileRecord | undefined> {
  await db
    .update(comfyuiProfiles)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(comfyuiProfiles.userId, userId));

  const [row] = await db
    .update(comfyuiProfiles)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(and(eq(comfyuiProfiles.id, profileId), eq(comfyuiProfiles.userId, userId)))
    .returning();

  return row;
}
