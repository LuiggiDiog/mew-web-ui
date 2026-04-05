import { NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { listInstalledPlugins } from "@/modules/plugins/repositories/plugins-repository";

export async function GET() {
  const { session, error } = await getApiSession();
  if (error) return error;

  void session;

  const plugins = await listInstalledPlugins();
  return NextResponse.json({ plugins });
}
