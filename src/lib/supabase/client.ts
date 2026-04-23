"use client";

import { useMemo } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useSupabaseClient(): SupabaseClient {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
            const token = await getToken({ template: "supabase" });
            const headers = new Headers(options?.headers);
            if (token) headers.set("Authorization", `Bearer ${token}`);
            return fetch(url, { ...options, headers });
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionFromUrl: false,
        },
      }),
    [getToken],
  );
}
