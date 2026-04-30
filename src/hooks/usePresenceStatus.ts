import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/profile/[userId]?workspaceId=...
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const url = new URL(_req.url);
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query param is required" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  // Make sure the requester is a member of the workspace
  const { data: requester } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", currentUserId)
    .single();

  if (!requester) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch target user's basic info
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url, created_at")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Fetch their role + join date inside this workspace
  // FIX: select both joined_at and created_at to handle schemas that use either column name
  const { data: memberData } = await supabase
    .from("workspace_members")
    .select("role, joined_at, created_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  return NextResponse.json({
    ...userData,
    role: memberData?.role ?? null,
    // FIX: fall back to created_at if joined_at is not populated in this schema
    joined_at: memberData?.joined_at ?? memberData?.created_at ?? null,
  });
}