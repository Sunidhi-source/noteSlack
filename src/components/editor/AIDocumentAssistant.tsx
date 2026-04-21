"use client";

import { useState } from "react";
import {
  Sparkles,
  Wand2,
  FileText,
  ArrowRight,
  Loader2,
  X,
  Check,
} from "lucide-react";

interface Props {
  selectedText: string;
  onInsert: (text: string) => void;
  onClose: () => void;
}

type Action = "improve" | "summarize" | "continue" | "translate";

const ACTIONS: { id: Action; label: string; icon: string; desc: string }[] = [
  {
    id: "improve",
    label: "Improve Writing",
    icon: "✨",
    desc: "Make it clearer and more professional",
  },
  {
    id: "summarize",
    label: "Summarize",
    icon: "📝",
    desc: "Condense into 2-3 sentences",
  },
  {
    id: "continue",
    label: "Continue Writing",
    icon: "➡️",
    desc: "Add more in the same style",
  },
  {
    id: "translate",
    label: "Translate",
    icon: "🌍",
    desc: "English ↔ Spanish",
  },
];

export function AIDocumentAssistant({
  selectedText,
  onInsert,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (action: Action) => {
    if (!selectedText.trim()) {
      setError("Select some text in the document first.");
      return;
    }
    setLoading(true);
    setActiveAction(action);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText, action }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data.result);
    } catch (e) {
      setError((e as Error).message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: 16,
          border: "1px solid var(--border)",
          width: "min(600px, 92vw)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent), #a78bfa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={16} color="#fff" />
          </div>
          <div>
            <p
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "var(--text-primary)",
              }}
            >
              AI Writing Assistant
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {selectedText.length > 0
                ? `Working with ${selectedText.length} characters selected`
                : "Select text in the document to use AI"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              borderRadius: 6,
              padding: 4,
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Selected text preview */}
        {selectedText && (
          <div
            style={{
              margin: "12px 20px 0",
              background: "var(--bg-overlay)",
              borderRadius: 8,
              padding: "10px 12px",
              borderLeft: "3px solid var(--accent)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 4,
                fontWeight: 600,
              }}
            >
              SELECTED TEXT
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                maxHeight: 80,
                overflow: "hidden",
              }}
            >
              {selectedText.slice(0, 200)}
              {selectedText.length > 200 ? "…" : ""}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            padding: "12px 20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => runAction(a.id)}
              disabled={loading || !selectedText.trim()}
              style={{
                background:
                  activeAction === a.id && loading
                    ? "var(--accent-soft)"
                    : "var(--bg-overlay)",
                border: `1px solid ${activeAction === a.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 10,
                padding: "10px 12px",
                cursor:
                  loading || !selectedText.trim() ? "not-allowed" : "pointer",
                textAlign: "left",
                opacity: loading || !selectedText.trim() ? 0.6 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!loading && selectedText.trim())
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--accent)";
              }}
              onMouseLeave={(e) => {
                if (activeAction !== a.id)
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--border)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {a.label}
                </span>
                {loading && activeAction === a.id && (
                  <Loader2
                    size={12}
                    style={{
                      marginLeft: "auto",
                      color: "var(--accent)",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                )}
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {a.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              margin: "0 20px 12px",
              background: "#fee2e2",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            <p style={{ fontSize: 12, color: "#dc2626" }}>{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            style={{
              margin: "0 20px 16px",
              border: "1px solid var(--accent)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "var(--accent-soft)",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Wand2 size={12} style={{ color: "var(--accent)" }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--accent)",
                }}
              >
                AI RESULT
              </span>
            </div>
            <div style={{ padding: "12px", background: "var(--bg-overlay)" }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {result}
              </p>
            </div>
            <div
              style={{
                padding: "8px 12px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: 8,
              }}
            >
              <button
                onClick={() => {
                  onInsert(result);
                  onClose();
                }}
                style={{
                  flex: 1,
                  background: "var(--accent)",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                }}
              >
                <Check size={13} /> Insert into Document
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(result)}
                style={{
                  padding: "8px 14px",
                  background: "var(--bg-overlay)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
