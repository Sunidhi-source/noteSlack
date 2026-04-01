import { WorkspaceHome } from "@/components/workspace/WorkspaceHome";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceIdPage({ params }: Props) {
  const { workspaceId } = await params;
  return <WorkspaceHome workspaceId={workspaceId} />;
}
