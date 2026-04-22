"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabaseInstance: SupabaseClient | null = null;
let currentGetToken:
  | ((args?: { template?: string }) => Promise<string | null>)
  | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
        const clerkToken = currentGetToken
          ? await currentGetToken({ template: "supabase" })
          : null;
        const headers = new Headers(options?.headers);
        if (clerkToken) {
          headers.set("Authorization", `Bearer ${clerkToken}`);
        }
        return fetch(url, { ...options, headers });
      },
    },
  });

  return supabaseInstance;
}

export function useSupabaseClient(): SupabaseClient {
  const { getToken } = useAuth();
  currentGetToken = getToken;
  return getSupabaseClient();
}
