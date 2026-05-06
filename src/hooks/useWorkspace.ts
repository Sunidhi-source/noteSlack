"use client";

import { useEffect, useId, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import { Channel, Document, Notification, User, Workspace } from "@/types";

export function useWorkspace(workspaceId: string) {
  const supabase = useSupabaseClient();
  const supabaseRef = useRef(supabase);
  const channelId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

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
    if (!workspaceId || !user?.id) return;

    const client = supabaseRef.current;
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
            .map((member) => member.users)
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

    const notifChannel = client
      .channel(`notifications:${user.id}:${channelId}`)
      .on(
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
      )
      .subscribe();

    const msgChannel = client
      .channel(`workspace_messages:${workspaceId}:${channelId}`)
      .on(
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
      )
      .subscribe();

    return () => {
      client.removeChannel(notifChannel);
      client.removeChannel(msgChannel);
    };
  }, [
    workspaceId,
    user?.id,
    setCurrentWorkspace,
    setChannels,
    setDocuments,
    setMembers,
    setNotifications,
    addNotification,
    incrementUnread,
    channelId,
  ]);
}
