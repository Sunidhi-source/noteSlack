"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, inputStyle, btnPrimaryStyle } from "@/components/ui/Modal";
import { useWorkspaceStore } from "@/store/workspace";
import { Channel } from "@/types";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export function CreateChannelModal({ workspaceId, onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addChannel } = useWorkspaceStore();
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        workspace_id: workspaceId,
        description,
        is_private: isPrivate,
      }),
    });
    if (res.ok) {
      const channel: Channel = await res.json();
      addChannel(channel);
      router.push(`/workspace/${workspaceId}/channel/${channel.id}`);
      onClose();
    }
    setLoading(false);
  };

  return (
    <Modal title="Create Channel" onClose={onClose}>
      <input
        style={inputStyle}
        placeholder="channel-name"
        value={name}
        onChange={(e) =>
          setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))
        }
        autoFocus
      />
      <input
        style={inputStyle}
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          cursor: "pointer",
          fontSize: 13,
          color: "var(--text-secondary)",
        }}
      >
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        Private channel
      </label>
      <button
        style={{
          ...btnPrimaryStyle,
          opacity: loading || !name.trim() ? 0.6 : 1,
        }}
        onClick={handleCreate}
        disabled={loading || !name.trim()}
      >
        {loading ? "Creating…" : "Create Channel"}
      </button>
    </Modal>
  );
}
