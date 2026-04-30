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
    return new NextResponse("Unauthorized", { status: 401 });

  const { userId } = await params;
  const url = new URL(_req.url);
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("workspaceId query param is required", {
      status: 400,
    });
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
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Fetch target user's basic info
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url, created_at")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    return new NextResponse("User not found", { status: 404 });
  }

  // Fetch their role + join date inside this workspace
  const { data: memberData } = await supabase
    .from("workspace_members")
    .select("role, joined_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  return NextResponse.json({
    ...userData,
    role: memberData?.role ?? null,
    joined_at: memberData?.joined_at ?? null,
  });
}
