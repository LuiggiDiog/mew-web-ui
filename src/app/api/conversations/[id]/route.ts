import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import { isUuid } from "@/modules/shared/utils/uuid";
import { listMessagesByConversationId } from "@/modules/chat/lib/messages-repository";
import {
  deleteConversationByIdForUser,
  findConversationByIdForUser,
  updateConversationTitleByIdForUser,
} from "@/modules/conversations/lib/conversations-repository";

type Params = { params: Promise<{ id: string }> };
const MAX_TITLE_LENGTH = 200;

export async function GET(_request: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const conversation = await findConversationByIdForUser(session.userId, id);

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const msgs = await listMessagesByConversationId(id, { order: "asc" });

  return NextResponse.json({ conversation, messages: msgs });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const deleted = await deleteConversationByIdForUser(session.userId, id);

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

  const updated = await updateConversationTitleByIdForUser(
    session.userId,
    id,
    title
  );

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation: updated });
}
