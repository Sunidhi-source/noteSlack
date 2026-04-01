"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, inputStyle, btnPrimaryStyle } from "@/components/ui/Modal";
import { useWorkspaceStore } from "@/store/workspace";
import { Document } from "@/types";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export function CreateDocModal({ workspaceId, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const { addDocument } = useWorkspaceStore();
  const router = useRouter();

  const handleCreate = async () => {
    setLoading(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: workspaceId,
        title: title.trim() || "Untitled",
      }),
    });
    if (res.ok) {
      const doc: Document = await res.json();
      addDocument(doc);
      router.push(`/workspace/${workspaceId}/doc/${doc.id}`);
      onClose();
    }
    setLoading(false);
  };

  return (
    <Modal title="New Document" onClose={onClose}>
      <input
        style={inputStyle}
        placeholder="Document title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        autoFocus
      />
      <button
        style={{ ...btnPrimaryStyle, opacity: loading ? 0.6 : 1 }}
        onClick={handleCreate}
        disabled={loading}
      >
        {loading ? "Creating…" : "Create Document"}
      </button>
    </Modal>
  );
}
