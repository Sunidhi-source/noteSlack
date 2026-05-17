"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useSupabaseClient, registerRealtimeAuthSetter, authReady } from "@/lib/supabase/client";
import { Message, TypingUser } from "@/types";

// ✅ Stable module-level realtime client — never recreated — exported for use in other hooks
export const realtimeClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    realtime: { params: { eventsPerSecond: 10 } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

// ✅ Register token setter so client.ts can push tokens here.
//    CRITICAL FIX: only call setAuth — never disconnect/reconnect.
//    Calling disconnect() destroys all active channel subscriptions,
//    which was the root cause of messages not appearing in real time
//    (every 50s token refresh was wiping all subscriptions).
registerRealtimeAuthSetter((token: string) => {
  realtimeClient.realtime.setAuth(token);
});

export function useMessages(channelId: string) {
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const setMessagesRef = useRef(setMessages);
  setMessagesRef.current = setMessages;

  // ✅ Track confirmed real IDs — prevents double-add from realtime echo
  const confirmedIds = useRef<Set<string>>(new Set());

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.find((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const replaceMessage = useCallback((tempId: string, realMsg: Message) => {
    if (realMsg.id === "__remove__") {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }
    // ✅ Mark real ID as confirmed so realtime INSERT skips it
    confirmedIds.current.add(realMsg.id);
    setMessages((prev) => {
      if (prev.find((m) => m.id === realMsg.id)) {
        return prev.filter((m) => m.id !== tempId);
      }
      return prev.map((m) => (m.id === tempId ? realMsg : m));
    });
  }, []);

  // ✅ Initial fetch
  useEffect(() => {
    if (!channelId) return;
    confirmedIds.current.clear();
    setLoading(true);
    setMessages([]);

    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("channel_id", channelId)
      .is("parent_message_id", null)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("[messages] fetch error:", error);
          setLoading(false);
          return;
        }
        const msgs = (data as Message[]) ?? [];
        msgs.forEach((m) => confirmedIds.current.add(m.id));
        setMessagesRef.current(msgs);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // ✅ Realtime subscription — wait for auth token before subscribing.
  //    FIX: Unique channel key per mount prevents ghost subscriptions
  //    when switching between channels rapidly.
  useEffect(() => {
    if (!channelId) return;

    const channelKey = `messages:${channelId}:${Date.now()}`;
    let cancelled = false;
    let sub: ReturnType<typeof realtimeClient.channel> | null = null;

    const setup = async () => {
      await authReady;
      if (cancelled) return;

      sub = realtimeClient
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `channel_id=eq.${channelId}`,
          },
          async (payload) => {
            if (cancelled || !payload.new) return;
            const newMsg = payload.new as Message;

            // Skip thread replies
            if (newMsg.parent_message_id) return;

            const newId = newMsg.id;

            // ✅ Our own message already added via replaceMessage — skip
            if (confirmedIds.current.has(newId)) return;

            // ✅ Someone else's message — fetch with user join and append
            const { data: fullMsg } = await supabase
              .from("messages")
              .select("*, users(full_name, avatar_url)")
              .eq("id", newId)
              .single();

            if (cancelled || !fullMsg) return;

            setMessagesRef.current((prev) => {
              if (prev.find((m) => m.id === newId)) return prev;
              confirmedIds.current.add(newId);
              return [...prev, fullMsg as Message];
            });
          },
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
            if (cancelled || !payload.new) return;
            const { data: fullMsg } = await supabase
              .from("messages")
              .select("*, users(full_name, avatar_url)")
              .eq("id", (payload.new as Message).id)
              .single();
            if (!cancelled && fullMsg) {
              setMessagesRef.current((prev) =>
                prev.map((m) =>
                  m.id === (fullMsg as Message).id ? (fullMsg as Message) : m,
                ),
              );
            }
          },
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
            if (cancelled) return;
            const oldId = (payload.old as Partial<Message>)?.id;
            if (oldId)
              setMessagesRef.current((prev) =>
                prev.filter((m) => m.id !== oldId)
              );
          },
        )
        .subscribe((status) => {
          console.log(`[realtime] ${channelKey} →`, status);
        });
    };

    setup();

    return () => {
      cancelled = true;
      // ✅ FIX: clean up after authReady so `sub` is always populated
      authReady.then(() => {
        if (sub) {
          realtimeClient.removeChannel(sub);
          sub = null;
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // ✅ Re-sync when tab becomes visible (catches missed events while hidden)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !channelId) return;
      supabase
        .from("messages")
        .select("*, users(full_name, avatar_url)")
        .eq("channel_id", channelId)
        .is("parent_message_id", null)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (data) {
            const msgs = data as Message[];
            msgs.forEach((m) => confirmedIds.current.add(m.id));
            setMessagesRef.current(msgs);
          }
        });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // ✅ NEW: Polling fallback every 15s as a safety net for any missed
  //    realtime events. Guarantees eventual consistency even if the WS
  //    subscription silently drops an event (e.g. network hiccup).
  useEffect(() => {
    if (!channelId) return;

    const poll = () => {
      supabase
        .from("messages")
        .select("*, users(full_name, avatar_url)")
        .eq("channel_id", channelId)
        .is("parent_message_id", null)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (!data) return;
          const incoming = data as Message[];
          setMessagesRef.current((prev) => {
            const prevIds = new Set(prev.map((m) => m.id));
            const hasNew = incoming.some((m) => !prevIds.has(m.id));
            if (!hasNew) return prev; // no change — avoid re-render
            incoming.forEach((m) => confirmedIds.current.add(m.id));
            return incoming;
          });
        });
    };

    const timer = setInterval(poll, 15_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  return { messages, loading, addMessage, replaceMessage };
}

// ── useTypingIndicator ────────────────────────────────────────

export function useTypingIndicator(channelId: string) {
  const { user } = useUser();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof realtimeClient.channel> | null>(null);

  const sendTyping = useCallback(async () => {
    if (!user || !channelRef.current) return;
    try {
      await channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: user.id,
          name: user.fullName,
          channel_id: channelId,
        },
      });
    } catch { /* best-effort */ }
  }, [channelId, user]);

  useEffect(() => {
    if (!channelId) return;
    const ch = realtimeClient
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
          setTypingUsers((prev) =>
            prev.filter((u) => u.user_id !== typingUser.user_id),
          );
        }, 3000);
      })
      .subscribe();
    channelRef.current = ch;
    return () => {
      realtimeClient.removeChannel(ch);
      channelRef.current = null;
    };
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

    // ✅ FIX: hoist channel ref outside the async gap so cleanup always
    //    has the reference. Previously `channel` was `null` when cleanup
    //    ran before authReady resolved, causing a subscription leak.
    let cancelled = false;
    let channel: ReturnType<typeof realtimeClient.channel> | null = null;
    const channelKey = `thread:${parentMessageId}:${Date.now()}`;

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
            table: "messages",
            filter: `parent_message_id=eq.${parentMessageId}`,
          },
          async (payload) => {
            if (cancelled || !payload.new) return;
            const { data: fullMsg } = await supabase
              .from("messages")
              .select("*, users(full_name, avatar_url)")
              .eq("id", (payload.new as Message).id)
              .single();
            if (cancelled || !fullMsg) return;
            setReplies((prev) => {
              if (prev.find((m) => m.id === (fullMsg as Message).id)) return prev;
              return [...prev, fullMsg as Message];
            });
          },
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
            if (cancelled) return;
            const oldId = (payload.old as Partial<Message>)?.id;
            if (oldId) setReplies((prev) => prev.filter((m) => m.id !== oldId));
          },
        )
        .subscribe((status) => {
          console.log(`[realtime] ${channelKey} →`, status);
        });
    };

    setup();

    return () => {
      cancelled = true;
      // ✅ FIX: whether channel was created synchronously or via authReady,
      //    this path always removes it correctly.
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
  }, [parentMessageId]);

  return { replies, loading };
}
