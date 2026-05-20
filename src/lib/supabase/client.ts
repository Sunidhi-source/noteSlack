"use client";

import { useEffect, useRef } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabaseInstance: SupabaseClient | null = null;
let currentToken: string | null = null;

// ✅ Token listeners — anything that needs the JWT registers here
const tokenListeners: Set<(token: string) => void> = new Set();

export function registerTokenListener(fn: (token: string) => void) {
  tokenListeners.add(fn);
  if (currentToken) fn(currentToken); // immediately call if token already set
  return () => tokenListeners.delete(fn);
}

// ✅ authReady — a promise that resolves when the first token is set
// Reset every time to handle user switches (Sarah vs Sunidhi)
let _authReadyResolve: (() => void) | null = null;
let _authReady: Promise<void> = new Promise((r) => { _authReadyResolve = r; });

export function getAuthReady(): Promise<void> {
  return _authReady;
}

function resetAuthReady() {
  _authReady = new Promise((r) => { _authReadyResolve = r; });
  currentToken = null;
}

// Keep legacy export for existing imports
export { _authReady as authReady };

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
    realtime: { params: { eventsPerSecond: 10 } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return supabaseInstance;
}

let realtimeAuthSetter: ((token: string) => void) | null = null;
export function registerRealtimeAuthSetter(fn: (token: string) => void) {
  realtimeAuthSetter = fn;
}

export function useSupabaseClient(): SupabaseClient {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const refreshInterval = useRef<ReturnType<typeof setInterval>>(undefined);
  const lastUserId = useRef<string | null>(null);
  const lastToken = useRef<string | null>(null);

  const client = getSupabaseInstance();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      // User signed out — reset auth
      resetAuthReady();
      lastUserId.current = null;
      lastToken.current = null;
      return;
    }

    // ✅ User switched — reset so new user's token is fetched fresh
    if (lastUserId.current && lastUserId.current !== userId) {
      resetAuthReady();
      lastToken.current = null;
    }
    lastUserId.current = userId;

    const setToken = async () => {
      try {
        const token = await getToken({ template: "supabase" });
        if (token && token !== lastToken.current) {
          lastToken.current = token;
          currentToken = token;
          supabaseInstance?.realtime.setAuth(token);
          realtimeAuthSetter?.(token);
          // ✅ Notify all listeners (realtime client etc)
          tokenListeners.forEach((fn) => fn(token));
          // ✅ Resolve authReady for this user
          _authReadyResolve?.();
          _authReadyResolve = null;
        }
      } catch {
        // fallback to anon
      }
    };

    setToken();
    refreshInterval.current = setInterval(setToken, 50_000);

    return () => clearInterval(refreshInterval.current);
  }, [isLoaded, isSignedIn, userId, getToken]);

  return client;
}