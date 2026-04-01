import { Webhook } from "svix";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ClerkUserEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
}

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let evt: ClerkUserEvent;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkUserEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  if (evt.type === "user.created") {
    const { error } = await supabase.from("users").insert({
      id: evt.data.id,
      email: evt.data.email_addresses[0].email_address,
      full_name:
        `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim(),
      avatar_url: evt.data.image_url,
    });
    if (error) console.error("Supabase insert error:", error);
  }

  if (evt.type === "user.updated") {
    const { error } = await supabase
      .from("users")
      .update({
        email: evt.data.email_addresses[0].email_address,
        full_name:
          `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim(),
        avatar_url: evt.data.image_url,
      })
      .eq("id", evt.data.id);
    if (error) console.error("Supabase update error:", error);
  }

  return new Response("OK", { status: 200 });
}
