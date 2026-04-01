"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import { Channel, Document, Workspace } from "@/types";

export function useWorkspace(workspaceId: string) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const { setCurrentWorkspace, setChannels, setDocuments } =
    useWorkspaceStore();

  useEffect(() => {
    if (!workspaceId || !user) return;

    // Fetch workspace
    supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single()
      .then(({ data }) => {
        if (data) setCurrentWorkspace(data as Workspace);
      });

    // Fetch channels
    supabase
      .from("channels")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setChannels(data as Channel[]);
      });

    // Fetch documents
    supabase
      .from("documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (data) setDocuments(data as Document[]);
      });
  }, [
    workspaceId,
    user,
    supabase,
    setCurrentWorkspace,
    setChannels,
    setDocuments,
  ]);
}
