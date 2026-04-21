import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CreateWorkspaceModal } from "@/components/sidebar/CreateWorkspaceModal";

export default async function WorkspacePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (data?.workspace_id) redirect(`/workspace/${data.workspace_id}`);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
        color: "var(--text-secondary)",
      }}
    >
      <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
        You don&apos;t have a workspace yet.
      </p>
      <CreateWorkspaceModal />
    </div>
  );
}
