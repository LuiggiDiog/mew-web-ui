import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { uninstallPlugin } from "@/modules/plugins/services/plugin-installer";

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;

  void session;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pluginId } = body as { pluginId?: string };
  if (typeof pluginId !== "string" || !pluginId.trim()) {
    return NextResponse.json({ error: "pluginId is required" }, { status: 400 });
  }

  try {
    await uninstallPlugin(pluginId.trim());
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("not found") ? 404 : msg.includes("built-in") ? 403 : 422;
    return NextResponse.json({ error: msg }, { status });
  }
}
