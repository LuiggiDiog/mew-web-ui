import { NextResponse } from "next/server";
import { getSession } from "@/modules/auth/services/session";

export async function GET() {
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      displayName: session.displayName,
    },
  });
}
