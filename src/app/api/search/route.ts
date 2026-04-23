import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const workspaceId = searchParams.get("workspace_id");

  if (!query || !workspaceId) {
    return NextResponse.json({ messages: [], documents: [], channels: [] });
  }

  const supabase = createServerSupabaseClient();

  // Verify membership
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (!member) return new NextResponse("Forbidden", { status: 403 });

  // Search messages (full text)
  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, content, created_at, channel_id, user_id, users(full_name, avatar_url), channels!inner(name, workspace_id)",
    )
    .eq("channels.workspace_id", workspaceId)
    .ilike("content", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  // Search documents
  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, updated_at, created_by")
    .eq("workspace_id", workspaceId)
    .ilike("title", `%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(10);

  // Search channels
  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, description")
    .eq("workspace_id", workspaceId)
    .ilike("name", `%${query}%`)
    .limit(5);

  return NextResponse.json({
    messages: messages ?? [],
    documents: documents ?? [],
    channels: channels ?? [],
  });
}
