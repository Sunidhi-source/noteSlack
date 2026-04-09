"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { PresenceUser } from "@/types";
import { generateUserColor } from "@/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PresenceState = Record<string, PresenceUser[]>;

export function usePresence(docId: string) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [cursors, setCursors] = useState<PresenceState>({});
  // Keep a stable ref to the channel so updateCursor can use it
  const roomRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user || !docId) return;

    const room = supabase.channel(`presence:${docId}`, {
      config: { presence: { key: user.id } },
    });

    roomRef.current = room;

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
      roomRef.current = null;
      supabase.removeChannel(room);
    };
  }, [docId, user, supabase]);

  // Call this on mouse move over the editor surface
  const updateCursor = useCallback(
    async (x: number, y: number) => {
      if (!user || !roomRef.current) return;
      await roomRef.current.track({
        user_id: user.id,
        name: user.fullName,
        avatar: user.imageUrl,
        cursor: { x, y },
        color: generateUserColor(user.id),
      } satisfies PresenceUser);
    },
    [user]
  );

  // Flat list of OTHER users' presence (exclude self)
  const activeUsers: PresenceUser[] = Object.entries(cursors)
    .filter(([userId]) => userId !== user?.id)
    .flatMap(([, arr]) => arr as PresenceUser[]);

  return { cursors, activeUsers, updateCursor };
}