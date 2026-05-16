"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { Message, TypingUser } from "@/types";

export function useMessages(channelId: string) {
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInitial = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  }, [channelId, supabase]);

  useEffect(() => {
    if (!channelId) return;

    fetchInitial();

    // Unique channel name per mount to avoid stale subscriptions
    const realtimeChannelName = `messages-${channelId}-${Date.now()}`;

    const sub = supabase
      .channel(realtimeChannelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          if (!payload.new) return;
          const { data: fullMsg } = await supabase
            .from("messages")
            .select("*, users(full_name, avatar_url)")
            .eq("id", (payload.new as Message).id)
            .single();
          if (fullMsg) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === (fullMsg as Message).id)) return prev;
              return [...prev, fullMsg as Message];
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          if (!payload.new) return;
          const { data: fullMsg } = await supabase
            .from("messages")
            .select("*, users(full_name, avatar_url)")
            .eq("id", (payload.new as Message).id)
            .single();
          if (fullMsg) {
            setMessages((prev) =>
              prev.map((m) => m.id === (fullMsg as Message).id ? (fullMsg as Message) : m),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const oldId = (payload.old as Partial<Message>)?.id;
          if (oldId) setMessages((prev) => prev.filter((m) => m.id !== oldId));
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[useMessages] Realtime issue:", status, "- refetching");
          fetchInitial();
        }
      });

    return () => { supabase.removeChannel(sub); };
  }, [channelId, supabase, fetchInitial]);

  // Re-sync when tab becomes visible (catches missed events while tab was hidden)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && channelId) fetchInitial();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [channelId, fetchInitial]);

  return { messages, loading };
}

// ── useTypingIndicator ────────────────────────────────────────

export function useTypingIndicator(channelId: string) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const sendTyping = useCallback(async () => {
    if (!user || !channelRef.current) return;
    try {
      await channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: user.id, name: user.fullName, channel_id: channelId },
      });
    } catch { /* best-effort */ }
  }, [channelId, user]);

  useEffect(() => {
    if (!channelId) return;

    const ch = supabase
      .channel(`typing:${channelId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (!payload.payload) return;
        const typingUser = payload.payload as TypingUser;
        if (typingUser.user_id === user?.id) return;
        setTypingUsers((prev) => {
          if (prev.find((u) => u.user_id === typingUser.user_id)) return prev;
          return [...prev, typingUser];
        });
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.user_id !== typingUser.user_id));
        }, 3000);
      })
      .subscribe();

    channelRef.current = ch;

    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [channelId, supabase, user?.id]);

  return { typingUsers, sendTyping };
}

export function useThreadMessages(parentMessageId: string | null) {
  const supabase = useSupabaseClient();
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentMessageId) {
      queueMicrotask(() => setReplies([]));
      return () => {};
    }
    queueMicrotask(() => setLoading(true));

    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("parent_message_id", parentMessageId)
      .order("created_at", { ascending: true })
      .then(({ data }) => { setReplies((data as Message[]) ?? []); setLoading(false); });

    const channel = supabase
      .channel(`thread-${parentMessageId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `parent_message_id=eq.${parentMessageId}` },
        async (payload) => {
          if (!payload.new) return;
          const { data: fullMsg } = await supabase
            .from("messages")
            .select("*, users(full_name, avatar_url)")
            .eq("id", (payload.new as Message).id)
            .single();
          if (fullMsg) {
            setReplies((prev) => {
              if (prev.find((m) => m.id === (fullMsg as Message).id)) return prev;
              return [...prev, fullMsg as Message];
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `parent_message_id=eq.${parentMessageId}` },
        (payload) => {
          const oldId = (payload.old as Partial<Message>)?.id;
          if (oldId) setReplies((prev) => prev.filter((m) => m.id !== oldId));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [parentMessageId, supabase]);

  return { replies, loading };
}
