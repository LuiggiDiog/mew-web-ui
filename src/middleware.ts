import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/modules/auth/lib/session-config";
import { sessionOptions } from "@/modules/auth/lib/session-config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieName = (sessionOptions.cookieName as string) ?? "workspace_session";

  const isPrivate =
    pathname === "/" ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/settings");

  const isPublic = pathname === "/login";

  // Try to read the session from the cookie
  let userId: string | undefined;
  const hasCookie = request.cookies.has(cookieName);
  if (hasCookie) {
    try {
      const response = NextResponse.next();
      const session = await getIronSession<SessionData>(request, response, sessionOptions);
      userId = session.userId;
    } catch {
      userId = undefined;
    }
  }

  if (isPrivate && !userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublic && userId) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).*)"],
};
