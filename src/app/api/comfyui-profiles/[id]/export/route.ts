import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/modules/auth/services/api-auth";
import { findProfileById } from "@/modules/providers/repositories/comfyui-profiles-repository";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, error } = await getApiSession();
  if (error) return error;

  const { id } = await params;
  const profile = await findProfileById(session.userId, id);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Export portable profile — strip identity and user-specific fields
  const { id: _id, userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, isDefault: _isDefault, ...exportable } = profile;

  const filename = `comfyui-profile-${profile.name.toLowerCase().replace(/\s+/g, "-")}.json`;

  return new NextResponse(JSON.stringify(exportable, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
