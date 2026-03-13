import { NextResponse } from "next/server";
import { verifyPassword } from "@/modules/auth/lib/password";
import { getSession } from "@/modules/auth/lib/session";
import { findUserByEmail } from "@/modules/auth/lib/users-repository";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await findUserByEmail(email.toLowerCase().trim());

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.authProvider === "google" || !user.passwordHash) {
    return NextResponse.json(
      { error: "This account uses Google sign-in" },
      { status: 403 }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.displayName = user.displayName;
  await session.save();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  });
}
