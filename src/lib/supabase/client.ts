"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

export function useSupabaseClient(): SupabaseClient {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            fetch: async (
              url: RequestInfo | URL,
              options: RequestInit = {},
            ) => {
              const clerkToken = await getToken({ template: "supabase" });
              const headers = new Headers(options?.headers);
              if (clerkToken)
                headers.set("Authorization", `Bearer ${clerkToken}`);
              return fetch(url, { ...options, headers });
            },
          },
        },
      ),
    [getToken],
  );
}
