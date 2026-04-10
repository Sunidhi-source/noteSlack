import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses?.[0]?.email_address ?? "";
    const full_name = [first_name, last_name].filter(Boolean).join(" ") || null;

    const { error } = await supabase.from("users").upsert(
      {
        id,
        email,
        full_name,
        avatar_url: image_url ?? null,
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error("Failed to upsert user:", error.message);
      return new NextResponse(error.message, { status: 500 });
    }
  }

  if (evt.type === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      await supabase.from("users").delete().eq("id", id);
    }
  }

  return NextResponse.json({ received: true });
}
