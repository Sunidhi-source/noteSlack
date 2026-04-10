import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body: { id?: string; mark_all?: boolean } = await req.json();
  const supabase = createServerSupabaseClient();

  if (body.mark_all) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  } else if (body.id) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", body.id)
      .eq("user_id", userId);
  }

  return NextResponse.json({ ok: true });
}
