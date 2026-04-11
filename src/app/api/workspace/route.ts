import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/workspaces — list user's workspaces
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspaces(*)")
    .eq("user_id", userId);

  if (error) return new NextResponse(error.message, { status: 500 });

  // Flatten the nested structure
  const workspaces = (data ?? [])
    .map((row: { workspaces: unknown }) => row.workspaces)
    .filter(Boolean);

  return NextResponse.json(workspaces);
}

// POST /api/workspaces — create a workspace
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body: { name: string; icon?: string } = await req.json();

  if (!body.name?.trim()) {
    return new NextResponse("Workspace name is required", { status: 400 });
  }

  const slug = body.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50);

  const supabase = createServerSupabaseClient();

  // Upsert user (in case webhook hasn't fired yet)
  const { error: upsertError } = await supabase.from("users").upsert(
    { id: userId, email: `${userId}@clerk.local` },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (upsertError) console.warn("User upsert warning:", upsertError.message);

  // Create workspace
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      name: body.name.trim(),
      slug: `${slug}-${Date.now()}`, // ensure uniqueness
      icon: body.icon ?? "🚀",
      owner_id: userId,
    })
    .select()
    .single();

  if (wsError) return new NextResponse(wsError.message, { status: 500 });

  // Add creator as owner member
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: "owner",
    });

  if (memberError) {
    console.error("Member insert error:", memberError);
  }

  // Create default #general channel
  const { error: channelError } = await supabase.from("channels").insert({
    workspace_id: workspace.id,
    name: "general",
    description: "General discussion",
    created_by: userId,
    is_private: false,
  });

  if (channelError) {
    console.error("Channel insert error:", channelError);
  }

  return NextResponse.json(workspace, { status: 201 });
}