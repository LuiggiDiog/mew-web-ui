import { NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";

export async function GET() {
  const { session, error } = await getApiSession();
  if (error) return error;

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      displayName: session.displayName,
    },
  });
}
