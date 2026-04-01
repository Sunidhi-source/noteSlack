"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { PresenceUser } from "@/types";
import { generateUserColor } from "@/lib/utils";

type PresenceState = Record<string, PresenceUser[]>;

export function usePresence(docId: string) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [cursors, setCursors] = useState<PresenceState>({});

  useEffect(() => {
    if (!user || !docId) return;

    const room = supabase.channel(`presence:${docId}`, {
      config: { presence: { key: user.id } },
    });

    room
      .on("presence", { event: "sync" }, () => {
        const state = room.presenceState<PresenceUser>();
        setCursors(state);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await room.track({
            user_id: user.id,
            name: user.fullName,
            avatar: user.imageUrl,
            cursor: { x: 0, y: 0 },
            color: generateUserColor(user.id),
          } satisfies PresenceUser);
        }
      });

    return () => {
      supabase.removeChannel(room);
    };
  }, [docId, user, supabase]);

  const updateCursor = async (x: number, y: number) => {
    if (!user) return;
    const room = supabase.channel(`presence:${docId}`);
    await room.track({
      user_id: user.id,
      name: user.fullName,
      avatar: user.imageUrl,
      cursor: { x, y },
      color: generateUserColor(user.id),
    } satisfies PresenceUser);
  };

  return { cursors, updateCursor };
}
