import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function createServerSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      `Missing Supabase env vars. ` +
        `NEXT_PUBLIC_SUPABASE_URL=${url ? "set" : "MISSING"}, ` +
        `SUPABASE_SERVICE_ROLE_KEY=${key ? "set" : "MISSING"}. ` +
        `Check your .env.local file.`,
    );
  }

  return createClient(url, key);
}
