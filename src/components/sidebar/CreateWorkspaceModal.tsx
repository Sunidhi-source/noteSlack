"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, inputStyle, btnPrimaryStyle } from "@/components/ui/Modal";
import { useWorkspaceStore } from "@/store/workspace";
import { Workspace } from "@/types";
import { Loader2 } from "lucide-react";

const ICONS = ["🏠", "🚀", "⚡", "🎨", "🔥", "💎", "🌊", "🌿", "🎯", "🛸"];

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

    // ✅ FIX: was /api/workspace (singular) — route now exists at /api/workspaces
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
    } else {
      const body = await res.text();
      setError(body || "Something went wrong. Please try again.");
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
            fontWeight: 600,
            letterSpacing: "0.04em",
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
                width: 38,
                height: 38,
                fontSize: 18,
                borderRadius: 8,
                border: "2px solid",
                borderColor:
                  icon === ic ? "var(--accent)" : "var(--border-accent)",
                background:
                  icon === ic ? "var(--accent-soft)" : "var(--bg-base)",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          Workspace Name
        </label>
        <input
          style={inputStyle}
          placeholder="e.g. Acme Inc, My Team, Side Project"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          autoFocus
          maxLength={50}
        />
        {name.trim() && (
          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            URL slug:{" "}
            <span style={{ color: "var(--accent)" }}>
              {name
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "")}
            </span>
          </p>
        )}
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            background: "rgba(255,77,106,0.1)",
            border: "1px solid rgba(255,77,106,0.3)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            color: "var(--danger)",
          }}
        >
          {error}
        </div>
      )}

      <button
        style={{
          ...btnPrimaryStyle,
          opacity: loading || !name.trim() ? 0.6 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
        onClick={handleCreate}
        disabled={loading || !name.trim()}
      >
        {loading && (
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        )}
        {loading ? "Creating…" : "Create Workspace"}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  if (!onClose) return <div style={{ padding: 24 }}>{content}</div>;

  return (
    <Modal title="Create a new workspace" onClose={onClose}>
      {content}
    </Modal>
  );
}
