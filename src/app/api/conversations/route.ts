import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/lib/api-auth";
import {
  createConversation,
  listConversationsByUserId,
} from "@/modules/conversations/lib/conversations-repository";

const MAX_TITLE_LENGTH = 200;
const MAX_MODEL_LENGTH = 200;
const MAX_PROVIDER_LENGTH = 100;

export async function GET() {
  const { session, error } = await getApiSession();
  if (error) return error;

  const rows = await listConversationsByUserId(session.userId);

  return NextResponse.json({ conversations: rows });
}

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, model, provider } = body as {
    title?: string;
    model?: string;
    provider?: string;
  };

  if (
    typeof title !== "string" ||
    typeof model !== "string" ||
    typeof provider !== "string" ||
    !title ||
    !model ||
    !provider
  ) {
    return NextResponse.json(
      { error: "title, model, and provider are required" },
      { status: 400 }
    );
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `title exceeds max length (${MAX_TITLE_LENGTH})` },
      { status: 400 }
    );
  }

  if (model.length > MAX_MODEL_LENGTH || provider.length > MAX_PROVIDER_LENGTH) {
    return NextResponse.json(
      { error: "model/provider exceed max length" },
      { status: 400 }
    );
  }

  const conversation = await createConversation({
    userId: session.userId,
    title,
    model,
    provider,
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
