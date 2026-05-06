"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";

export interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean; // did the current user react?
}

export type ReactionsMap = Record<string, Reaction>; // key = emoji

export function useReactions(messageId: string) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [reactions, setReactions] = useState<ReactionsMap>({});

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from("reactions")
      .select("emoji, user_id")
      .eq("message_id", messageId);

    if (!data) return;

    const map: ReactionsMap = {};
    for (const row of data) {
      if (!map[row.emoji]) {
        map[row.emoji] = { emoji: row.emoji, count: 0, reacted: false };
      }
      map[row.emoji].count++;
      if (row.user_id === user?.id) map[row.emoji].reacted = true;
    }
    setReactions(map);
  }, [messageId, supabase, user?.id]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchReactions();
    });

    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
          filter: `message_id=eq.${messageId}`,
        },
        () => fetchReactions(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, supabase, fetchReactions]);

  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!user) return;
      const existing = reactions[emoji];
      if (existing?.reacted) {
        await supabase
          .from("reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
      } else {
        await supabase
          .from("reactions")
          .insert({ message_id: messageId, user_id: user.id, emoji });
      }
    },
    [messageId, reactions, supabase, user],
  );

  return { reactions, toggleReaction };
}
