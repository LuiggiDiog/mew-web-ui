import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;
  const { id } = await params;

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, session.userId))
    );

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ conversation, messages: msgs });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;
  const { id } = await params;

  const [deleted] = await db
    .delete(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, session.userId))
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const { title } = body as { title?: string };

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, session.userId))
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation: updated });
}
