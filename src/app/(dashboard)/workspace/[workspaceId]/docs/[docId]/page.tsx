"use client";

import { use } from "react";
import { DocumentView } from "@/components/editor/DocumentView";

interface Props {
  params: Promise<{ workspaceId: string; docId: string }>;
}

export default function DocPage({ params }: Props) {
  const resolvedParams = use(params);

  const workspaceId = resolvedParams.workspaceId;
  const docId = resolvedParams.docId;

  if (!workspaceId || !docId) {
    return null;
  }

  return <DocumentView workspaceId={workspaceId} docId={docId} />;
}
