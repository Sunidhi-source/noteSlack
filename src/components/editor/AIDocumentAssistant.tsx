"use client";

import { useState } from "react";
import { Sparkles, Wand2, Loader2, X, Check, Languages } from "lucide-react";

interface Props {
  selectedText: string;
  onInsert: (text: string) => void;
  onClose: () => void;
}

type Action = "improve" | "summarize" | "continue" | "translate";

const NON_TRANSLATE_ACTIONS: {
  id: Action;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    id: "improve",
    label: "Improve Writing",
    icon: "✨",
    desc: "Clearer & more professional",
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
];

const LANGUAGES = [
  "Spanish",
  "French",
  "German",
  "Hindi",
  "Japanese",
  "Arabic",
  "Portuguese",
  "Chinese",
  "Italian",
  "Korean",
  "Russian",
  "Turkish",
  "Dutch",
  "Polish",
  "Swedish",
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
  const [targetLang, setTargetLang] = useState("Spanish");

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
        body: JSON.stringify({ text: selectedText, action, targetLang }),
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: 20,
          border: "1px solid var(--border)",
          width: "min(620px, 93vw)",
          boxShadow: "0 32px 100px rgba(0,0,0,0.4)",
          overflow: "hidden",
          animation: "slideUp 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(167,139,250,0.04))",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--accent), #a78bfa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
            }}
          >
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <p
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text-primary)",
              }}
            >
              AI Writing Assistant
            </p>
            <p
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}
            >
              {selectedText.length > 0
                ? `✦ ${selectedText.length} characters selected`
                : "Select text in the document to use AI"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "var(--bg-overlay)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              color: "var(--text-muted)",
              borderRadius: 8,
              padding: "6px",
              display: "flex",
              transition: "all 0.15s",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Selected text preview */}
        {selectedText && (
          <div
            style={{
              margin: "14px 20px 0",
              background: "var(--bg-overlay)",
              borderRadius: 10,
              padding: "10px 14px",
              borderLeft: "3px solid var(--accent)",
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                marginBottom: 4,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              SELECTED TEXT
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                maxHeight: 72,
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
            padding: "14px 20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {/* Improve, Summarize, Continue */}
          {NON_TRANSLATE_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => runAction(a.id)}
              disabled={loading || !selectedText.trim()}
              style={{
                background:
                  activeAction === a.id && (loading || result)
                    ? "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(167,139,250,0.06))"
                    : "var(--bg-overlay)",
                border: `1px solid ${activeAction === a.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 12,
                padding: "12px 14px",
                cursor:
                  loading || !selectedText.trim() ? "not-allowed" : "pointer",
                textAlign: "left",
                opacity: loading && activeAction !== a.id ? 0.5 : 1,
                transition: "all 0.2s",
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
                  gap: 7,
                  marginBottom: 4,
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
                    size={13}
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

          {/* Translate card — div to avoid nested button hydration error */}
          <div
            style={{
              background:
                activeAction === "translate" && (loading || result)
                  ? "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(167,139,250,0.06))"
                  : "var(--bg-overlay)",
              border: `1px solid ${activeAction === "translate" ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 12,
              padding: "12px 14px",
              opacity: loading && activeAction !== "translate" ? 0.5 : 1,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading && selectedText.trim())
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--accent)";
            }}
            onMouseLeave={(e) => {
              if (activeAction !== "translate")
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border)";
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>🌍</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Translate
              </span>
              {loading && activeAction === "translate" && (
                <Loader2
                  size={13}
                  style={{
                    marginLeft: "auto",
                    color: "var(--accent)",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={loading}
                style={{
                  flex: 1,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  padding: "5px 8px",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <button
                onClick={() => runAction("translate")}
                disabled={loading || !selectedText.trim()}
                style={{
                  background: "linear-gradient(135deg, var(--accent), #a78bfa)",
                  border: "none",
                  borderRadius: 7,
                  padding: "5px 12px",
                  cursor:
                    loading || !selectedText.trim() ? "not-allowed" : "pointer",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(139,92,246,0.3)",
                }}
              >
                <Languages size={11} /> Go
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              margin: "0 20px 14px",
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>⚠️</span>
            <p style={{ fontSize: 12, color: "#f87171", lineHeight: 1.5 }}>
              {error}
            </p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            style={{
              margin: "0 20px 18px",
              border: "1px solid var(--accent)",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(139,92,246,0.1)",
              animation: "fadeIn 0.3s ease",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(167,139,250,0.08))",
                padding: "9px 14px",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Wand2 size={13} style={{ color: "var(--accent)" }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "0.06em",
                }}
              >
                AI RESULT
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  background: "var(--bg-overlay)",
                  padding: "2px 8px",
                  borderRadius: 20,
                }}
              >
                {activeAction}
              </span>
            </div>

            <div style={{ padding: "14px", background: "var(--bg-overlay)" }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {result}
              </p>
            </div>

            <div
              style={{
                padding: "10px 14px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: 8,
                background: "var(--bg-surface)",
              }}
            >
              <button
                onClick={() => {
                  onInsert(result);
                  onClose();
                }}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, var(--accent), #a78bfa)",
                  border: "none",
                  borderRadius: 9,
                  padding: "9px",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <Check size={14} /> Insert into Document
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(result)}
                style={{
                  padding: "9px 16px",
                  background: "var(--bg-overlay)",
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--accent)";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--border)";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-secondary)";
                }}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
