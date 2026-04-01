"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, inputStyle, btnPrimaryStyle } from "@/components/ui/Modal";
import { useWorkspaceStore } from "@/store/workspace";
import { Workspace } from "@/types";

const ICONS = ["🏠", "🚀", "⚡", "🎨", "🔥", "💎", "🌊", "🌿", "🎯", "🛸"];

interface Props {
  onClose?: () => void;
}

export function CreateWorkspaceModal({ onClose }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🚀");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentWorkspace } = useWorkspaceStore();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), icon }),
    });
    if (res.ok) {
      const workspace: Workspace = await res.json();
      setCurrentWorkspace(workspace);
      router.push(`/workspace/${workspace.id}`);
      onClose?.();
    }
    setLoading(false);
  };

  const content = (
    <>
      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            display: "block",
            marginBottom: 6,
          }}
        >
          Workspace Icon
        </label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ICONS.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              style={{
                width: 36,
                height: 36,
                fontSize: 18,
                borderRadius: 8,
                border: "2px solid",
                borderColor: icon === ic ? "var(--accent)" : "var(--border)",
                background:
                  icon === ic ? "var(--accent-soft)" : "var(--bg-surface)",
                cursor: "pointer",
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>
      <input
        style={inputStyle}
        placeholder="Workspace name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        autoFocus
      />
      <button
        style={{
          ...btnPrimaryStyle,
          opacity: loading || !name.trim() ? 0.6 : 1,
        }}
        onClick={handleCreate}
        disabled={loading || !name.trim()}
      >
        {loading ? "Creating…" : "Create Workspace"}
      </button>
    </>
  );

  if (!onClose) return <div style={{ padding: 24 }}>{content}</div>;

  return (
    <Modal title="Create Workspace" onClose={onClose}>
      {content}
    </Modal>
  );
}
