"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { realtimeClient } from "@/hooks/useRealtime";
import { DmMessage } from "@/types";

export function useDmMessages(conversationId: string | null) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Track confirmed real IDs — prevents double-add from realtime echo
  const confirmedIds = useRef<Set<string>>(new Set());
  const setMessagesRef = useRef(setMessages);
  setMessagesRef.current = setMessages;

  useEffect(() => {
    if (!conversationId) {
      queueMicrotask(() => setMessages([]));
      return;
    }

    confirmedIds.current.clear();
    queueMicrotask(() => setLoading(true));

    supabase
      .from("dm_messages")
      .select("*, users(full_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const msgs = (data as DmMessage[]) ?? [];
        msgs.forEach((m) => confirmedIds.current.add(m.id));
        setMessages(msgs);
        setLoading(false);
      });

    // ✅ Use stable realtimeClient (has WS auth) instead of the query client
    const channel = realtimeClient
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
          if (!payload.new) return;
          const newId = (payload.new as DmMessage).id;

          // ✅ Skip our own messages — already added optimistically in sendMessage
          if (confirmedIds.current.has(newId)) return;

          const { data: fullMsg } = await supabase
            .from("dm_messages")
            .select("*, users(full_name, avatar_url)")
            .eq("id", newId)
            .single();

          if (fullMsg) {
            setMessagesRef.current((prev) => {
              if (prev.find((m) => m.id === (fullMsg as DmMessage).id))
                return prev;
              confirmedIds.current.add((fullMsg as DmMessage).id);
              return [...prev, fullMsg as DmMessage];
            });
          }
        },
      )
      .subscribe((status) => {
        console.log(`[realtime] dm:${conversationId} →`, status);
      });

    return () => {
      realtimeClient.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !conversationId || !user) return;

      // ✅ Optimistic insert — show immediately, confirm on DB response
      const tempId = `temp-${Date.now()}`;
      const optimistic: DmMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString(),
        read_at: null, // ← fixes the TypeScript build error
        users: { full_name: user.fullName ?? "You", avatar_url: null },
      };
      setMessagesRef.current((prev) => [...prev, optimistic]);

      const { data: inserted, error } = await supabase
        .from("dm_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
        })
        .select("*, users(full_name, avatar_url)")
        .single();

      if (inserted && !error) {
        // ✅ Mark real ID confirmed so realtime echo is ignored
        confirmedIds.current.add((inserted as DmMessage).id);
        setMessagesRef.current((prev) =>
          prev.map((m) => (m.id === tempId ? (inserted as DmMessage) : m)),
        );
      } else {
        // Roll back optimistic message on error
        setMessagesRef.current((prev) => prev.filter((m) => m.id !== tempId));
        console.error("Failed to send DM:", error);
      }
    },
    [conversationId, supabase, user],
  );

  return { messages, loading, sendMessage };
}
