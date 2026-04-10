"use client";

import { useState } from "react";
import { Modal, inputStyle, btnPrimaryStyle } from "@/components/ui/Modal";
import { useWorkspaceStore } from "@/store/workspace";
import { Channel } from "@/types";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export function CreateChannelModal({ workspaceId, onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addChannel, currentWorkspace } = useWorkspaceStore();
  const router = useRouter();

  const sanitizedName = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const handleCreate = async () => {
    if (!sanitizedName || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sanitizedName,
        workspace_id: workspaceId,
        description: description.trim() || null,
        is_private: isPrivate,
      }),
    });

    if (res.ok) {
      const channel: Channel = await res.json();
      addChannel(channel);
      router.push(`/workspace/${workspaceId}/channel/${channel.id}`);
      onClose();
    } else {
      const text = await res.text();
      setError(text || "Failed to create channel.");
    }

    setLoading(false);
  };

  return (
    <Modal title="Create Channel" onClose={onClose}>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Channel Name</label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              padding: "0 10px",
              color: "var(--text-muted)",
              fontSize: 16,
              userSelect: "none",
            }}
          >
            #
          </span>
          <input
            style={{
              ...inputStyle,
              border: "none",
              borderRadius: 0,
              flex: 1,
              background: "transparent",
            }}
            placeholder="channel-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
            maxLength={40}
          />
        </div>
        {name && sanitizedName !== name.toLowerCase() && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Will be created as:{" "}
            <span style={{ color: "var(--accent)" }}>#{sanitizedName}</span>
          </p>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Description (optional)</label>
        <input
          style={inputStyle}
          placeholder="What's this channel about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
      </div>

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
        }}
        onClick={() => setIsPrivate((v) => !v)}
      >
        <div
          style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            background: isPrivate ? "var(--accent)" : "var(--bg-hover)",
            position: "relative",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              left: isPrivate ? 18 : 2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.2s",
            }}
          />
        </div>
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {isPrivate && <Lock size={12} />}
            Private channel
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Only invited members can see this channel
          </p>
        </div>
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
          opacity: loading || !sanitizedName ? 0.6 : 1,
        }}
        onClick={handleCreate}
        disabled={loading || !sanitizedName}
      >
        {loading ? "Creating…" : "Create Channel"}
      </button>
    </Modal>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 6,
  letterSpacing: "0.04em",
};
