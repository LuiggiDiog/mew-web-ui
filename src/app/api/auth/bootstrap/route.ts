import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/modules/auth/services/session";
import {
  BootstrapAlreadyCompletedError,
  isBootstrapRequired,
  registerInitialAdmin,
} from "@/modules/auth/services/bootstrap";

const MAX_EMAIL_LENGTH = 320;
const MAX_DISPLAY_NAME_LENGTH = 120;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

export async function GET() {
  const needsBootstrap = await isBootstrapRequired();
  return NextResponse.json({ needsBootstrap });
}

export async function POST(request: NextRequest) {
  let body: {
    email?: string;
    displayName?: string;
    password?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const displayName = body.displayName?.trim();
  const password = body.password;

  if (!email || !displayName || !password) {
    return NextResponse.json(
      { error: "email, displayName, and password are required" },
      { status: 400 }
    );
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    return NextResponse.json(
      { error: `email exceeds max length (${MAX_EMAIL_LENGTH})` },
      { status: 400 }
    );
  }

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return NextResponse.json(
      { error: `displayName exceeds max length (${MAX_DISPLAY_NAME_LENGTH})` },
      { status: 400 }
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        error: `password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      },
      { status: 400 }
    );
  }

  try {
    const user = await registerInitialAdmin({
      email,
      displayName,
      password,
    });

    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.displayName = user.displayName;
    await session.save();

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof BootstrapAlreadyCompletedError) {
      return NextResponse.json(
        { error: "Bootstrap already completed" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Could not create initial admin user" },
      { status: 500 }
    );
  }
}
