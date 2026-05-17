"use client";

import { useEffect, useId, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient, authReady } from "@/lib/supabase/client";
import { realtimeClient } from "@/hooks/useRealtime";
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
    addChannel,
    addDocument,
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

    // ✅ Realtime listeners for channels + docs — wait for auth before subscribing
    let cancelledWs = false;
    let channelsSub: ReturnType<typeof realtimeClient.channel> | null = null;
    let docsSub: ReturnType<typeof realtimeClient.channel> | null = null;

    authReady.then(() => {
      if (cancelledWs) return;

      channelsSub = realtimeClient
        .channel(`workspace_channels:${workspaceId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "channels",
            filter: `workspace_id=eq.${workspaceId}`,
          },
          (payload) => {
            if (payload.new) addChannel(payload.new as Channel);
          },
        )
        .subscribe();

      docsSub = realtimeClient
        .channel(`workspace_docs:${workspaceId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "documents",
            filter: `workspace_id=eq.${workspaceId}`,
          },
          (payload) => {
            if (payload.new) addDocument(payload.new as Document);
          },
        )
        .subscribe();
    });

    return () => {
      cancelledWs = true;
      client.removeChannel(notifChannel);
      client.removeChannel(msgChannel);
      if (channelsSub) realtimeClient.removeChannel(channelsSub);
      if (docsSub) realtimeClient.removeChannel(docsSub);
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
    addChannel,
    addDocument,
    incrementUnread,
    channelId,
  ]);
}
