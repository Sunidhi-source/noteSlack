import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body: { workspace_id: string; email: string } = await req.json();

  if (!body.workspace_id || !body.email?.trim()) {
    return new NextResponse("workspace_id and email are required", {
      status: 400,
    });
  }

  const supabase = createServerSupabaseClient();

  // Check inviter is an admin/owner
  const { data: inviter } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", body.workspace_id)
    .eq("user_id", userId)
    .single();

  if (!inviter || !["owner", "admin"].includes(inviter.role)) {
    return new NextResponse("Only admins and owners can invite members", {
      status: 403,
    });
  }

  // Look up user by email
  const { data: targetUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", body.email.toLowerCase().trim())
    .single();

  if (!targetUser) {
    return new NextResponse(
      "No user found with that email. They need to sign up first.",
      { status: 404 },
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", body.workspace_id)
    .eq("user_id", targetUser.id)
    .single();

  if (existing) {
    return new NextResponse("User is already a member of this workspace", {
      status: 409,
    });
  }

  const { error } = await supabase.from("workspace_members").insert({
    workspace_id: body.workspace_id,
    user_id: targetUser.id,
    role: "member",
  });

  if (error) return new NextResponse(error.message, { status: 500 });

  await supabase.from("notifications").insert({
    user_id: targetUser.id,
    message: `You've been added to a workspace!`,
    type: "invite",
    link: `/workspace/${body.workspace_id}`,
    read: false,
  });

  return NextResponse.json({ success: true });
}
