import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspaces(*)")
    .eq("user_id", userId);

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body: { name: string; icon?: string } = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = body.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const supabase = createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .single();

  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({
      name: body.name.trim(),
      slug: finalSlug,
      icon: body.icon ?? "🏠",
      owner_id: userId,
    })
    .select()
    .single();

  if (error) return new NextResponse(error.message, { status: 500 });

  await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: "owner",
  });

  await supabase.from("channels").insert({
    workspace_id: workspace.id,
    name: "general",
    description: "General discussion for the whole team",
    created_by: userId,
  });

  await supabase.from("channels").insert({
    workspace_id: workspace.id,
    name: "announcements",
    description: "Important updates for the team",
    created_by: userId,
  });

  return NextResponse.json(workspace, { status: 201 });
}
