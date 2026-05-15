import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body: { workspace_id: string; title?: string } = await req.json();
  const supabase = createServerSupabaseClient();

  // Verify membership
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", body.workspace_id)
    .eq("user_id", userId)
    .single();

  if (!member) return new NextResponse("Forbidden", { status: 403 });

  const { data, error } = await supabase
    .from("documents")
    .insert({
      workspace_id: body.workspace_id,
      title: body.title ?? "Untitled",
      created_by: userId,
      last_edited_by: userId,
    })
    .select()
    .single();

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body: {
    id: string;
    title?: string;
    content?: unknown;
  } = await req.json();

  if (!body.id) {
    return new NextResponse("Document id required", { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("workspace_id")
    .eq("id", body.id)
    .single();

  if (documentError || !document) {
    return new NextResponse("Document not found", { status: 404 });
  }

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", document.workspace_id)
    .eq("user_id", userId)
    .single();

  if (!member) return new NextResponse("Forbidden", { status: 403 });

  const { data, error } = await supabase
    .from("documents")
    .update({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      last_edited_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data);
}
