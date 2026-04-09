"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { Message, TypingUser } from "@/types";

// ── useMessages ───────────────────────────────────────────────
// Fetches messages with user join and keeps them live via Realtime.
// FIX: on INSERT, re-fetches the full row (with users join) so the
//      sender name is available immediately — not just on next refresh.

export function useMessages(channelId: string) {
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;

    // Initial load
    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Re-fetch with users join so full_name is populated immediately
          const { data: fullMsg } = await supabase
            .from("messages")
            .select("*, users(full_name, avatar_url)")
            .eq("id", (payload.new as Message).id)
            .single();
          if (fullMsg) {
            setMessages((prev) => [...prev, fullMsg as Message]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const { data: fullMsg } = await supabase
            .from("messages")
            .select("*, users(full_name, avatar_url)")
            .eq("id", (payload.new as Message).id)
            .single();
          if (fullMsg) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === (fullMsg as Message).id ? (fullMsg as Message) : m
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.filter((m) => m.id !== (payload.old as Message).id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase]);

  return { messages, loading };
}

// ── useTypingIndicator ────────────────────────────────────────

export function useTypingIndicator(channelId: string) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const sendTyping = useCallback(async () => {
    if (!user) return;
    const channel = supabase.channel(`typing:${channelId}`);
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id, name: user.fullName, channel_id: channelId },
    });
  }, [channelId, supabase, user]);

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`typing:${channelId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const typingUser = payload.payload as TypingUser;
        if (typingUser.user_id === user?.id) return;
        setTypingUsers((prev) => {
          if (prev.find((u) => u.user_id === typingUser.user_id)) return prev;
          return [...prev, typingUser];
        });
        setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((u) => u.user_id !== typingUser.user_id)
          );
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase, user?.id]);

  return { typingUsers, sendTyping };
}

// ── useThreadMessages ─────────────────────────────────────────
// Fetches replies for a specific parent message

export function useThreadMessages(parentMessageId: string | null) {
  const supabase = useSupabaseClient();
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentMessageId) {
      setReplies([]);
      return;
    }
    setLoading(true);

    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("parent_message_id", parentMessageId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setReplies((data as Message[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`thread:${parentMessageId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `parent_message_id=eq.${parentMessageId}`,
        },
        async (payload) => {
          const { data: fullMsg } = await supabase
            .from("messages")
            .select("*, users(full_name, avatar_url)")
            .eq("id", (payload.new as Message).id)
            .single();
          if (fullMsg) setReplies((prev) => [...prev, fullMsg as Message]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `parent_message_id=eq.${parentMessageId}`,
        },
        (payload) => {
          setReplies((prev) =>
            prev.filter((m) => m.id !== (payload.old as Message).id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessageId, supabase]);

  return { replies, loading };
}