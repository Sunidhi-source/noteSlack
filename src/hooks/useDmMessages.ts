"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient, authReady } from "@/lib/supabase/client";
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

    // Fetch existing messages
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

    // ✅ FIX: hoist channel ref and use unique key so cleanup always
    //    has the reference regardless of when authReady resolves.
    let cancelled = false;
    let channel: ReturnType<typeof realtimeClient.channel> | null = null;
    const channelKey = `dm:${conversationId}:${Date.now()}`;

    const setup = async () => {
      await authReady;
      if (cancelled) return;

      channel = realtimeClient
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "dm_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            if (cancelled || !payload.new) return;
            const newId = (payload.new as DmMessage).id;

            // ✅ Skip our own messages — already added optimistically
            if (confirmedIds.current.has(newId)) return;

            const { data: fullMsg } = await supabase
              .from("dm_messages")
              .select("*, users(full_name, avatar_url)")
              .eq("id", newId)
              .single();

            if (cancelled || !fullMsg) return;

            setMessagesRef.current((prev) => {
              if (prev.find((m) => m.id === (fullMsg as DmMessage).id)) return prev;
              confirmedIds.current.add((fullMsg as DmMessage).id);
              return [...prev, fullMsg as DmMessage];
            });
          },
        )
        .subscribe((status) => {
          console.log(`[realtime] ${channelKey} →`, status);
        });
    };

    setup();

    return () => {
      cancelled = true;
      if (channel) {
        realtimeClient.removeChannel(channel);
        channel = null;
      } else {
        authReady.then(() => {
          if (channel) {
            realtimeClient.removeChannel(channel);
            channel = null;
          }
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ✅ NEW: Polling fallback every 15s as safety net for missed realtime events
  useEffect(() => {
    if (!conversationId) return;

    const poll = () => {
      supabase
        .from("dm_messages")
        .select("*, users(full_name, avatar_url)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (!data) return;
          const incoming = data as DmMessage[];
          setMessagesRef.current((prev) => {
            const prevIds = new Set(prev.map((m) => m.id));
            const hasNew = incoming.some((m) => !prevIds.has(m.id));
            if (!hasNew) return prev;
            incoming.forEach((m) => confirmedIds.current.add(m.id));
            return incoming;
          });
        });
    };

    const timer = setInterval(poll, 15_000);
    return () => clearInterval(timer);
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
        read_at: null,
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
