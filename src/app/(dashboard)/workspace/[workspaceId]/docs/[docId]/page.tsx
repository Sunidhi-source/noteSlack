"use client";

import { use } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { DocumentView } from "@/components/editor/DocumentView";

interface Props {
  params: Promise<{ workspaceId: string; docId: string }>;
}

export default function DocPage({ params }: Props) {
  const { workspaceId, docId } = use(params);
  useWorkspace(workspaceId);
  return <DocumentView workspaceId={workspaceId} docId={docId} />;
}
