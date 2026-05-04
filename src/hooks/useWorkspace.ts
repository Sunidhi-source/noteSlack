"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import {
  Channel,
  Document,
  DmConversation,
  Notification,
  User,
  Workspace,
} from "@/types";

export function useWorkspace(workspaceId: string) {
  const supabase = useSupabaseClient();
  const supabaseRef = useRef(supabase); // ✅ lock instance

  const { user } = useUser();

  const {
    setCurrentWorkspace,
    setChannels,
    setDocuments,
    setMembers,
    setNotifications,
    setDmConversations,
    addNotification,
    incrementUnread,
  } = useWorkspaceStore();

  // ✅ prevent duplicate subscriptions
  const hasSubscribedRef = useRef(false);

  useEffect(() => {
    if (!workspaceId || !user?.id) return;

    const client = supabaseRef.current;

    // ── FETCH DATA (unchanged) ───────────────────────────────

    client
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single()
      .then(({ data }) => {
        if (data) setCurrentWorkspace(data as Workspace);
      });

    client
      .from("channels")
      .select("*")
      .eq("workspace_id", workspaceId)
      .then(({ data }) => {
        if (data) setChannels(data as Channel[]);
      });

    client
      .from("documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .then(({ data }) => {
        if (data) setDocuments(data as Document[]);
      });

    client
      .from("workspace_members")
      .select("users(*)")
      .eq("workspace_id", workspaceId)
      .then(({ data }) => {
        if (data) {
          const users = data
            .map((m) => m.users)
            .filter(Boolean) as unknown as User[];
          setMembers(users);
        }
      });

    client
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
      });

    // 🛑 IMPORTANT: avoid double subscription
    if (hasSubscribedRef.current) return;
    hasSubscribedRef.current = true;

    // ── REALTIME ─────────────────────────────────────────────

    const notifChannel = client.channel(`notifications:${user.id}`);

    notifChannel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        if (payload.new) {
          addNotification(payload.new as Notification);
        }
      },
    );

    notifChannel.subscribe();

    const msgChannel = client.channel(`workspace_messages:${workspaceId}`);

    msgChannel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        if (!payload.new) return;

        const msg = payload.new as {
          channel_id: string;
          user_id: string;
        };

        if (msg.user_id !== user.id) {
          incrementUnread(msg.channel_id);
        }
      },
    );

    msgChannel.subscribe();

    return () => {
      client.removeChannel(notifChannel);
      client.removeChannel(msgChannel);
      hasSubscribedRef.current = false; // reset
    };
  }, [workspaceId, user?.id]);
}
