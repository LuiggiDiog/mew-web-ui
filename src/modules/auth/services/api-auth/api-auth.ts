import { NextResponse } from "next/server";
import { getSession, type SessionData } from "@/modules/auth/services/session";
import { findUserById } from "@/modules/auth/repositories/users-repository";

/**
 * Returns the session for API routes.
 * If the session has no userId, returns a 401 NextResponse instead.
 */
export async function getApiSession(): Promise<
  { session: Required<SessionData>; error: null } |
  { session: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session.userId) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await findUserById(session.userId);
  if (!user) {
    session.destroy();
    return {
      session: null,
      error: NextResponse.json(
        { error: "Unauthorized", code: "SESSION_INVALID" },
        { status: 401 }
      ),
    };
  }

  return { session: session as Required<SessionData>, error: null };
}
