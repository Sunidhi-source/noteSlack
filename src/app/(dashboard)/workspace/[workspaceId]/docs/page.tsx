import { DocumentView } from "@/components/editor/DocumentView";

interface Props {
  params: Promise<{ workspaceId: string; docId: string }>;
}

export default async function DocPage({ params }: Props) {
  const { workspaceId, docId } = await params;
  return <DocumentView workspaceId={workspaceId} docId={docId} />;
}
