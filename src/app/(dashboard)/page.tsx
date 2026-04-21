"use client";

import { use } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceHome } from "@/components/workspace/WorkspaceHome";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default function WorkspacePage({ params }: Props) {
  const { workspaceId } = use(params);
  useWorkspace(workspaceId);
  return <WorkspaceHome workspaceId={workspaceId} />;
}
