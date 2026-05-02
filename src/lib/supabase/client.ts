"use client";

import { useEffect, useRef } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
  );
}

// Single instance at module level — created once for the entire app lifetime
let supabaseInstance: SupabaseClient | null = null;
let currentGetToken: (() => Promise<string | null>) | null = null;
let currentIsSignedIn: boolean = false;
let currentIsLoaded: boolean = false;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
        const headers = new Headers(options?.headers);

        headers.set("Accept", "application/json");
        headers.set("Content-Type", "application/json");

        if (currentIsLoaded && currentIsSignedIn && currentGetToken) {
          try {
            const token = await currentGetToken();
            if (token) {
              headers.set("Authorization", `Bearer ${token}`);
            }
          } catch (error) {
            console.warn("Failed to retrieve Clerk token for Supabase:", error);
          }
        }

        return fetch(url, { ...options, headers });
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return supabaseInstance;
}
export function useSupabaseClient(): SupabaseClient {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  currentGetToken = () => getToken({ template: "supabase" });
  currentIsLoaded = isLoaded;
  currentIsSignedIn = isSignedIn ?? false;

  return getSupabaseClient();
}
