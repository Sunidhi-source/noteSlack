"use client";

import { useEffect } from "react";
import { ChatView } from "@/components/chat/ChatView";
import { useWorkspaceStore } from "@/store/workspace";

interface Props {
  params: Promise<{ workspaceId: string; channelId: string }>;
}

export default function ChannelPage({ params }: Props) {
  const { workspaceId, channelId } = params as unknown as {
    workspaceId: string;
    channelId: string;
  };

  const { clearUnread } = useWorkspaceStore();

  // Clear unread count when user opens this channel
  useEffect(() => {
    clearUnread(channelId);
  }, [channelId, clearUnread]);

  return <ChatView workspaceId={workspaceId} channelId={channelId} />;
}
