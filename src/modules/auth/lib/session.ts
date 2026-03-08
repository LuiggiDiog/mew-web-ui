import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { type SessionData, sessionOptions } from "./session-config";

export type { SessionData } from "./session-config";
export { sessionOptions } from "./session-config";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session.userId) {
    throw new Error("Unauthorized");
  }
  return session as Required<{ userId: string; email: string; displayName: string }>;
}
