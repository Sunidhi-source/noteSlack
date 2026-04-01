import { ChatView } from "@/components/chat/ChatView";

interface Props {
  params: Promise<{ workspaceId: string; channelId: string }>;
}

export default async function ChannelPage({ params }: Props) {
  const { workspaceId, channelId } = await params;
  return <ChatView workspaceId={workspaceId} channelId={channelId} />;
}
