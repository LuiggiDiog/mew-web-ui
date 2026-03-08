import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";

export async function GET() {
  const { session, error } = await getApiSession();
  if (error) return error;

  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, session.userId))
    .orderBy(desc(conversations.updatedAt));

  return NextResponse.json({ conversations: rows });
}

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json();
  const { title, model, provider } = body as {
    title?: string;
    model?: string;
    provider?: string;
  };

  if (!title || !model || !provider) {
    return NextResponse.json(
      { error: "title, model, and provider are required" },
      { status: 400 }
    );
  }

  const [conversation] = await db
    .insert(conversations)
    .values({ userId: session.userId, title, model, provider })
    .returning();

  return NextResponse.json({ conversation }, { status: 201 });
}
