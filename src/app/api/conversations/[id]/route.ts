import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { isUuid } from "@/modules/shared/utils/uuid";

type Params = { params: Promise<{ id: string }> };
const MAX_TITLE_LENGTH = 200;

export async function GET(_request: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

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
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

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
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { title } = body as { title?: string };

  if (typeof title !== "string" || !title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `title exceeds max length (${MAX_TITLE_LENGTH})` },
      { status: 400 }
    );
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
