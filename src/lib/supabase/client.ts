"use client";

import { useEffect } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (typeof window !== "undefined" && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
  );
}

let supabaseInstance: SupabaseClient | null = null;

const authState = {
  getToken: null as null | (() => Promise<string | null>),
  isLoaded: false,
  isSignedIn: false,
};

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
        const headers = new Headers(options?.headers);

        headers.set("Accept", "application/json");
        headers.set("Content-Type", "application/json");

        if (authState.isLoaded && authState.isSignedIn && authState.getToken) {
          try {
            const token = await authState.getToken();
            if (token) {
              headers.set("Authorization", `Bearer ${token}`);
            }
          } catch {
            // fallback to anon
          }
        }

        return fetch(url, { ...options, headers });
      },
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  supabaseInstance.realtime.setAuth(null);

  return supabaseInstance;
}

export function useSupabaseClient(): SupabaseClient {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  // ✅ SAFE: side effects go inside useEffect
  useEffect(() => {
    authState.getToken = () =>
      getToken({ template: "supabase" }).catch(() => null);

    authState.isLoaded = isLoaded;
    authState.isSignedIn = isSignedIn ?? false;
  }, [getToken, isLoaded, isSignedIn]);

  return getSupabaseClient();
}
