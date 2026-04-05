import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import {
  findPluginByPluginId,
  setPluginActive,
} from "@/modules/plugins/repositories/plugins-repository";
import { invalidatePluginCache } from "@/modules/plugins/services/plugin-loader";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const { session, error } = await getApiSession();
  if (error) return error;

  void session;

  const { pluginId } = await params;

  const record = await findPluginByPluginId(pluginId);
  if (!record) {
    return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
  }

  await setPluginActive(pluginId, !record.isActive);
  invalidatePluginCache();

  const updated = await findPluginByPluginId(pluginId);
  return NextResponse.json({ plugin: updated });
}
