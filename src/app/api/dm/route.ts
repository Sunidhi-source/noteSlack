import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/dm?workspace_id=... — list DM conversations
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json([]);

  const supabase = createServerSupabaseClient();

  // Find all dm_conversations for this user in this workspace
  const { data, error } = await supabase
    .from("dm_conversations")
    .select(
      "*, participant_a:users!dm_conversations_participant_a_fkey(id,full_name,avatar_url), participant_b:users!dm_conversations_participant_b_fkey(id,full_name,avatar_url)",
    )
    .eq("workspace_id", workspaceId)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/dm — open or get a DM conversation
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body: { workspace_id: string; other_user_id: string } =
    await req.json();
  const supabase = createServerSupabaseClient();

  // Ensure consistent ordering so no duplicates
  const [a, b] = [userId, body.other_user_id].sort();

  const { data: existing } = await supabase
    .from("dm_conversations")
    .select("*")
    .eq("workspace_id", body.workspace_id)
    .eq("participant_a", a)
    .eq("participant_b", b)
    .single();

  if (existing) return NextResponse.json(existing);

  const { data, error } = await supabase
    .from("dm_conversations")
    .insert({
      workspace_id: body.workspace_id,
      participant_a: a,
      participant_b: b,
    })
    .select()
    .single();

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
