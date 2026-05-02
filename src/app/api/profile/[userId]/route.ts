import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ userId: string }>;
}

type ProfileRow = {
  role: "owner" | "admin" | "member" | null;
  joined_at: string | null;
  users: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    created_at: string;
  } | null;
};

export async function GET(req: Request, context: RouteContext) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { userId: targetUserId } = await context.params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required" },
      { status: 400 },
    );
  }

  const supabase = createServerSupabaseClient();

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (membershipError)
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 },
    );
  if (!membership)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: profileRow, error: profileError } = await supabase
    .from("workspace_members")
    .select(
      "role, joined_at, users!workspace_members_user_id_fkey(id, full_name, email, avatar_url, created_at)",
    )
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 });

  const typedProfile = profileRow as unknown as ProfileRow;
  if (!typedProfile?.users)
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({
    id: typedProfile.users.id,
    full_name: typedProfile.users.full_name,
    email: typedProfile.users.email,
    avatar_url: typedProfile.users.avatar_url,
    created_at: typedProfile.users.created_at,
    role: typedProfile.role,
    joined_at: typedProfile.joined_at,
  });
}
