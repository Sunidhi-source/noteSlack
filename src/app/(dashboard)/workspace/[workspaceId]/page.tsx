"use client";

import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceStore } from "@/store/workspace";
import { WorkspaceHome } from "@/components/workspace/WorkspaceHome";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default function WorkspacePage({ params }: Props) {
  // Next.js 16 — params is a promise
  const { workspaceId } = params as unknown as { workspaceId: string };
  useWorkspace(workspaceId);

  return <WorkspaceHome workspaceId={workspaceId} />;
}
