"use client";

import { use } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { ProfileView } from "@/components/profile/ProfileView";

interface Props {
  params: Promise<{ workspaceId: string; userId: string }>;
}

export default function ProfilePage({ params }: Props) {
  const { workspaceId, userId } = use(params);

  useWorkspace(workspaceId);

  return <ProfileView workspaceId={workspaceId} userId={userId} />;
}
