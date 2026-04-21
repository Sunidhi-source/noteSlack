"use client";

import { use, useEffect } from "react";
import { ChatView } from "@/components/chat/ChatView";
import { useWorkspaceStore } from "@/store/workspace";

interface Props {
  params: Promise<{ workspaceId: string; channelId: string }>;
}

export default function ChannelPage({ params }: Props) {
  const { workspaceId, channelId } = use(params);
  const { clearUnread } = useWorkspaceStore();

  useEffect(() => {
    clearUnread(channelId);
  }, [channelId, clearUnread]);

  return <ChatView workspaceId={workspaceId} channelId={channelId} />;
}
