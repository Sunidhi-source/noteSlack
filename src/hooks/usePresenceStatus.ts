"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@/lib/supabase/client";

export function usePresenceStatus(userId: string) {
  const supabase = useSupabaseClient();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`presence_status:${userId}`)
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setIsOnline(Object.keys(state).length > 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return { isOnline };
}