"use client";

import { use } from "react";
import { WorkspaceHome } from "@/components/workspace/WorkspaceHome";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default function WorkspacePage({ params }: Props) {
  const { workspaceId } = use(params);
  return <WorkspaceHome workspaceId={workspaceId} />;
}