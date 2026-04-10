"use client";

import { useState } from "react";
import { Modal, inputStyle, btnPrimaryStyle } from "@/components/ui/Modal";
import { useWorkspaceStore } from "@/store/workspace";
import { Document } from "@/types";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

const TEMPLATES = [
  { id: "blank", label: "Blank page", icon: "📄", title: "" },
  { id: "meeting", label: "Meeting notes", icon: "📋", title: "Meeting Notes" },
  {
    id: "spec",
    label: "Project spec",
    icon: "🏗️",
    title: "Project Specification",
  },
  {
    id: "retro",
    label: "Retrospective",
    icon: "🔄",
    title: "Sprint Retrospective",
  },
];

export function CreateDocModal({ workspaceId, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addDocument } = useWorkspaceStore();
  const router = useRouter();

  const template = TEMPLATES.find((t) => t.id === selectedTemplate);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    const finalTitle = title.trim() || template?.title || "Untitled";

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: workspaceId,
        title: finalTitle,
      }),
    });

    if (res.ok) {
      const doc: Document = await res.json();
      addDocument(doc);
      router.push(`/workspace/${workspaceId}/docs/${doc.id}`);
      onClose();
    } else {
      const text = await res.text();
      setError(text || "Failed to create document.");
    }

    setLoading(false);
  };

  return (
    <Modal title="New Document" onClose={onClose}>
      {/* Template picker */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            display: "block",
            marginBottom: 8,
            letterSpacing: "0.04em",
          }}
        >
          Start from
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              style={{
                padding: "10px 12px",
                background:
                  selectedTemplate === t.id
                    ? "var(--accent-soft)"
                    : "var(--bg-base)",
                border: `1px solid ${
                  selectedTemplate === t.id ? "var(--accent)" : "var(--border)"
                }`,
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "inherit",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span
                style={{
                  fontSize: 12,
                  color:
                    selectedTemplate === t.id
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  fontWeight: selectedTemplate === t.id ? 600 : 400,
                }}
              >
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            display: "block",
            marginBottom: 6,
            letterSpacing: "0.04em",
          }}
        >
          Title (optional)
        </label>
        <input
          style={inputStyle}
          placeholder={template?.title || "Untitled"}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          autoFocus
          maxLength={100}
        />
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
        style={{ ...btnPrimaryStyle, opacity: loading ? 0.6 : 1 }}
        onClick={handleCreate}
        disabled={loading}
      >
        {loading ? "Creating…" : "Create Document"}
      </button>
    </Modal>
  );
}
