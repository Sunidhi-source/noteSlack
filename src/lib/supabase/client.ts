"use client";

import { useEffect, useRef } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Single global instance for queries
let supabaseInstance: SupabaseClient | null = null;
let currentToken: string | null = null;

// ✅ Auth-ready promise — resolves once the first JWT is fetched.
//    Subscriptions that depend on auth must wait for this before subscribing.
let authReadyResolve: (() => void) | null = null;
export const authReady: Promise<void> = new Promise((resolve) => {
  authReadyResolve = resolve;
});

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

// ✅ Called from useRealtime to keep realtime client token in sync.
//    The setter must ONLY call setAuth — never disconnect/reconnect —
//    so that existing subscriptions survive token refreshes.
let realtimeAuthSetter: ((token: string) => void) | null = null;
export function registerRealtimeAuthSetter(fn: (token: string) => void) {
  realtimeAuthSetter = fn;
}

export function useSupabaseClient(): SupabaseClient {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const refreshInterval = useRef<ReturnType<typeof setInterval>>(undefined);
  const hasSetToken = useRef(false);
  const lastToken = useRef<string | null>(null);

  const client = getSupabaseInstance();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const setToken = async () => {
      try {
        const token = await getToken({ template: "supabase" });
        // ✅ Only update when the token actually changes — avoids redundant
        //    setAuth calls on every interval tick when token hasn't rotated.
        if (token && token !== lastToken.current) {
          lastToken.current = token;
          currentToken = token;
          // Update auth on the query client's realtime connection
          supabaseInstance?.realtime.setAuth(token);
          // Update auth on the dedicated realtime-only client.
          // CRITICAL: realtimeAuthSetter must NOT call disconnect/reconnect
          // because that destroys all active channel subscriptions.
          realtimeAuthSetter?.(token);

          // ✅ Signal auth is ready on first successful token fetch
          if (!hasSetToken.current) {
            hasSetToken.current = true;
            authReadyResolve?.();
          }
        }
      } catch {
        // fallback to anon — subscriptions remain active
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
