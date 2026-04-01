import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body: {
    name: string;
    workspace_id: string;
    description?: string;
    is_private?: boolean;
  } = await req.json();

  const supabase = createServerSupabaseClient();

  // Verify user is a member
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", body.workspace_id)
    .eq("user_id", userId)
    .single();

  if (!member) return new NextResponse("Forbidden", { status: 403 });

  const { data, error } = await supabase
    .from("channels")
    .insert({
      name: body.name.toLowerCase().replace(/\s+/g, "-"),
      workspace_id: body.workspace_id,
      description: body.description ?? null,
      is_private: body.is_private ?? false,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
