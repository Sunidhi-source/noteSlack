import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  let event: { type: string; data: any };
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as any;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const primaryEmail = data.email_addresses?.find(
      (e: any) => e.id === data.primary_email_address_id,
    )?.email_address;

    await supabase.from("users").upsert(
      {
        id: data.id,
        email: primaryEmail ?? `${data.id}@clerk.local`,
        full_name:
          [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
        avatar_url: data.image_url ?? null,
      },
      { onConflict: "id" },
    );
  }

  if (type === "user.deleted") {
    await supabase.from("workspace_members").delete().eq("user_id", data.id);
  }

  return NextResponse.json({ received: true });
}
