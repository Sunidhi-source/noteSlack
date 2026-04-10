"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import { Channel, Document, Notification, User, Workspace } from "@/types";

export function useWorkspace(workspaceId: string) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const {
    setCurrentWorkspace,
    setChannels,
    setDocuments,
    setMembers,
    setNotifications,
    addNotification,
    incrementUnread,
  } = useWorkspaceStore();

  useEffect(() => {
    if (!workspaceId || !user) return;

    // ── Fetch workspace
    supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single()
      .then(({ data }) => {
        if (data) setCurrentWorkspace(data as Workspace);
      });

    // ── Fetch channels
    supabase
      .from("channels")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setChannels(data as Channel[]);
      });

    // ── Fetch documents
    supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (data) setDocuments(data as Document[]);
      });

    // ── Fetch workspace members with user info
    supabase
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

    // ── Fetch notifications for current user
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
      });

    // ── Live notification subscription
    const notifChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          addNotification(payload.new as Notification);
        },
      )
      .subscribe();

    // ── Live unread tracking: listen for new messages in any channel of workspace
    // We track messages INSERT events and increment unread for other channels
    const msgUnreadChannel = supabase
      .channel(`workspace_messages:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as { channel_id: string; user_id: string };
          // Don't count own messages
          if (msg.user_id !== user.id) {
            incrementUnread(msg.channel_id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgUnreadChannel);
    };
  }, [
    workspaceId,
    user,
    supabase,
    setCurrentWorkspace,
    setChannels,
    setDocuments,
    setMembers,
    setNotifications,
    addNotification,
    incrementUnread,
  ]);
}
