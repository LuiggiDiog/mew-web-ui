import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { installPluginFromGitHub } from "@/modules/plugins/services/plugin-installer";

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  void session;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { githubUrl } = body as { githubUrl?: string };
  if (typeof githubUrl !== "string" || !githubUrl.trim()) {
    return NextResponse.json({ error: "githubUrl is required" }, { status: 400 });
  }

  try {
    const plugin = await installPluginFromGitHub(githubUrl.trim());
    return NextResponse.json({ plugin });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("already installed") ? 409 : 422;
    return NextResponse.json({ error: msg }, { status });
  }
}
