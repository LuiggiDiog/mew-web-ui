import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";

export async function GET() {
  const { session, error } = await getApiSession();
  if (error) return error;

  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, session.userId));

  const flat: Record<string, string> = {};
  for (const row of rows) {
    flat[row.key] = row.value;
  }

  return NextResponse.json(flat);
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json() as Record<string, string>;

  for (const [key, value] of Object.entries(body)) {
    await db
      .insert(settings)
      .values({ userId: session.userId, key, value })
      .onConflictDoUpdate({
        target: [settings.userId, settings.key],
        set: { value, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ ok: true });
}
