"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { Message, TypingUser } from "@/types";

export function useMessages(channelId: string) {
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep a ref to setMessages so the subscription closure never goes stale
  const setMessagesRef = useRef(setMessages);
  setMessagesRef.current = setMessages;

  // addMessage: push a new message, deduplicated
  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.find((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  // replaceMessage: swap tempId → real message, or remove if id === "__remove__"
  const replaceMessage = useCallback((tempId: string, realMsg: Message) => {
    setMessages((prev) => {
      if (realMsg.id === "__remove__") return prev.filter((m) => m.id !== tempId);
      // If the real message already exists (realtime beat us), just remove the temp
      if (prev.find((m) => m.id === realMsg.id)) return prev.filter((m) => m.id !== tempId);
      return prev.map((m) => (m.id === tempId ? realMsg : m));
    });
  }, []);

  useEffect(() => {
    if (!channelId) return;

    let cancelled = false;

    // Initial load
    setLoading(true);
    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setMessagesRef.current((data as Message[]) ?? []);
        setLoading(false);
      });

    // Realtime subscription
    const sub = supabase
      .channel(`messages-${channelId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          if (cancelled || !payload.new) return;
          const newId = (payload.new as Message).id;
          // Skip if we already have it (our own optimistic message was confirmed)
          setMessagesRef.current((prev) => {
            if (prev.find((m) => m.id === newId)) return prev; // already have it
            // Not in list — fetch from another user
            supabase
              .from("messages")
              .select("*, users(full_name, avatar_url)")
              .eq("id", newId)
              .single()
              .then(({ data: fullMsg }) => {
                if (cancelled || !fullMsg) return;
                setMessagesRef.current((p) => {
                  if (p.find((m) => m.id === (fullMsg as Message).id)) return p;
                  return [...p, fullMsg as Message];
                });
              });
            return prev; // unchanged for now; async above will add it
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          if (cancelled || !payload.new) return;
          const { data: fullMsg } = await supabase
            .from("messages")
            .select("*, users(full_name, avatar_url)")
            .eq("id", (payload.new as Message).id)
            .single();
          if (!cancelled && fullMsg) {
            setMessagesRef.current((prev) =>
              prev.map((m) => m.id === (fullMsg as Message).id ? (fullMsg as Message) : m),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (cancelled) return;
          const oldId = (payload.old as Partial<Message>)?.id;
          if (oldId) setMessagesRef.current((prev) => prev.filter((m) => m.id !== oldId));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(sub);
    };
  // Only re-run when the channel changes — NOT when supabase reference changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Re-sync when tab becomes visible (catch missed events while hidden)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !channelId) return;
      supabase
        .from("messages")
        .select("*, users(full_name, avatar_url)")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (data) setMessagesRef.current(data as Message[]);
        });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  return { messages, loading, addMessage, replaceMessage };
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, user?.id]);

  return { typingUsers, sendTyping };
}

export function useThreadMessages(parentMessageId: string | null) {
  const supabase = useSupabaseClient();
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentMessageId) {
      setReplies([]);
      return () => {};
    }
    setLoading(true);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentMessageId]);

  return { replies, loading };
}
