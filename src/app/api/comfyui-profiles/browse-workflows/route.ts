import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";

export async function POST(request: NextRequest) {
  const { session, error } = await getApiSession();
  if (error) return error;
  void session;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const baseUrl = body.url.trim().replace(/\/+$/, "");

  try {
    // Try multiple ComfyUI endpoint patterns for listing workflows
    const listUrls = [
      `${baseUrl}/api/userdata?dir=workflows&recurse=true&full_info=false`,
      `${baseUrl}/userdata?dir=workflows&recurse=true&full_info=false`,
    ];

    let data: unknown = null;
    let usedApiPrefix = false;
    for (const listUrl of listUrls) {
      try {
        const res = await fetch(listUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          data = await res.json();
          usedApiPrefix = listUrl.includes("/api/userdata");
          break;
        }
      } catch {
        continue;
      }
    }

    if (data === null) {
      return NextResponse.json({ workflows: [], supported: false });
    }

    // Response is either string[] or object[] with a path/filename field
    const names: string[] = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === "string" && item.endsWith(".json")) {
          // Strip leading "workflows/" prefix if present
          names.push(item.replace(/^workflows[\\/]/, ""));
        } else if (typeof item === "object" && item !== null) {
          const path = (item as Record<string, unknown>).path ?? (item as Record<string, unknown>).name ?? (item as Record<string, unknown>).filename;
          if (typeof path === "string" && path.endsWith(".json")) {
            names.push(path.replace(/^workflows[\\/]/, ""));
          }
        }
      }
    }

    return NextResponse.json({ workflows: names, supported: true, apiPrefix: usedApiPrefix });
  } catch {
    return NextResponse.json({ workflows: [], supported: false });
  }
}
