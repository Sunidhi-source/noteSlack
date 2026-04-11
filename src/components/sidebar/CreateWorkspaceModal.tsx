"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, inputStyle, btnPrimaryStyle } from "@/components/ui/Modal";
import { useWorkspaceStore } from "@/store/workspace";
import { Workspace } from "@/types";

const ICONS = ["🚀", "🏠", "⚡", "🎨", "🔥", "💎", "🌊", "🌿", "🎯", "🛸", "🧠", "🦄"];

interface Props {
  onClose?: () => void;
}

export function CreateWorkspaceModal({ onClose }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🚀");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setCurrentWorkspace } = useWorkspaceStore();

  const handleCreate = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create workspace");
      }

      const workspace: Workspace = await res.json();
      setCurrentWorkspace(workspace);
      router.push(`/workspace/${workspace.id}`);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            display: "block",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
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
                width: 40,
                height: 40,
                fontSize: 20,
                borderRadius: 8,
                border: "2px solid",
                borderColor: icon === ic ? "var(--accent)" : "var(--border)",
                background: icon === ic ? "var(--accent-soft)" : "var(--bg-surface)",
                cursor: "pointer",
                transition: "all 0.15s",
                transform: icon === ic ? "scale(1.1)" : "scale(1)",
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            display: "block",
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
          }}
        >
          Workspace Name
        </label>
        <input
          style={inputStyle}
          placeholder="e.g. Acme Engineering"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          autoFocus
          maxLength={80}
        />
      </div>

      {error && (
        <div
          style={{
            background: "rgba(255, 77, 106, 0.1)",
            border: "1px solid rgba(255, 77, 106, 0.3)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 13,
            color: "var(--danger)",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <button
        style={{
          ...btnPrimaryStyle,
          opacity: loading || !name.trim() ? 0.6 : 1,
          cursor: loading || !name.trim() ? "not-allowed" : "pointer",
        }}
        onClick={handleCreate}
        disabled={loading || !name.trim()}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <span
              style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }}
            />
            Creating…
          </span>
        ) : (
          "Create Workspace"
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  if (!onClose) return <div style={{ padding: 24 }}>{content}</div>;

  return (
    <Modal title="Create Workspace" onClose={onClose}>
      {content}
    </Modal>
  );
}