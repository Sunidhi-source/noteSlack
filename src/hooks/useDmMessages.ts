"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { DmMessage } from "@/types";

export function useDmMessages(conversationId: string | null) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);

    supabase
      .from("dm_messages")
      .select("*, users(full_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as DmMessage[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data: fullMsg } = await supabase
            .from("dm_messages")
            .select("*, users(full_name, avatar_url)")
            .eq("id", (payload.new as DmMessage).id)
            .single();
          if (fullMsg) setMessages((prev) => [...prev, fullMsg as DmMessage]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !conversationId || !user) return;
      await supabase.from("dm_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      });
    },
    [conversationId, supabase, user],
  );

  return { messages, loading, sendMessage };
}
