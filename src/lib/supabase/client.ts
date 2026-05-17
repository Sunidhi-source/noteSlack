"use client";

import { useEffect, useRef } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Single global instance for queries
let supabaseInstance: SupabaseClient | null = null;
let currentToken: string | null = null;

function getSupabaseInstance(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
        const headers = new Headers(options?.headers);
        headers.set("Accept", "application/json");
        headers.set("Content-Type", "application/json");
        if (currentToken) {
          headers.set("Authorization", `Bearer ${currentToken}`);
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

  return supabaseInstance;
}

// ✅ Called from useRealtime to keep realtime client in sync
let realtimeAuthSetter: ((token: string) => void) | null = null;
export function registerRealtimeAuthSetter(fn: (token: string) => void) {
  realtimeAuthSetter = fn;
}

export function useSupabaseClient(): SupabaseClient {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const refreshInterval = useRef<ReturnType<typeof setInterval>>(undefined);

  const client = getSupabaseInstance();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const setToken = async () => {
      try {
        const token = await getToken({ template: "supabase" });
        if (token) {
          currentToken = token;
          // ✅ Set on query client
          supabaseInstance?.realtime.setAuth(token);
          // ✅ Set on realtime-only client
          realtimeAuthSetter?.(token);
        }
      } catch {
        // fallback to anon
      }
    };

    setToken();

    // ✅ Refresh every 50s before 60s expiry
    refreshInterval.current = setInterval(setToken, 50_000);

    return () => {
      clearInterval(refreshInterval.current);
    };
  }, [isLoaded, isSignedIn, getToken]);

  return client;
}