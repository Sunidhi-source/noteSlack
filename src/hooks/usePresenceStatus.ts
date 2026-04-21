"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";

export function usePresenceStatus(targetUserId: string): boolean {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!user || !targetUserId) return;

    const room = supabase.channel("global_presence", {
      config: { presence: { key: user.id } },
    });

    room
      .on("presence", { event: "sync" }, () => {
        const state = room.presenceState();
        setIsOnline(targetUserId in state);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (key === targetUserId) setIsOnline(true);
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key === targetUserId) setIsOnline(false);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await room.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(room);
    };
  }, [targetUserId, user, supabase]);

  return isOnline;
}
