import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId)
    return new NextResponse("workspaceId required", { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (!member) return new NextResponse("Forbidden", { status: 403 });

  const { data: recentMessages } = await supabase
    .from("messages")
    .select(
      "id, content, created_at, user_id, channel_id, users(full_name), channels!inner(name, workspace_id)",
    )
    .eq("channels.workspace_id", workspaceId)
    .is("parent_message_id", null)
    .order("created_at", { ascending: false })
    .limit(15);

  const { data: recentDocs } = await supabase
    .from("documents")
    .select(
      "id, title, updated_at, last_edited_by, users:last_edited_by(full_name)",
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(10);

  const activity = [
    ...(recentMessages ?? []).map((m: any) => ({
      type: "message" as const,
      id: m.id,
      actor: m.users?.full_name ?? "Someone",
      description: `sent a message in #${m.channels?.name}`,
      preview: m.content.slice(0, 80),
      link: `/workspace/${workspaceId}/channel/${m.channel_id}`,
      timestamp: m.created_at,
    })),
    ...(recentDocs ?? []).map((d: any) => ({
      type: "document" as const,
      id: d.id,
      actor: (d.users as any)?.full_name ?? "Someone",
      description: `edited document`,
      preview: d.title,
      link: `/workspace/${workspaceId}/docs/${d.id}`,
      timestamp: d.updated_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 30);

  return NextResponse.json(activity);
}
