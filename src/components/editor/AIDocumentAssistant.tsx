"use client";

import { useState } from "react";
import { Sparkles, X, Send, ChevronDown, ChevronUp } from "lucide-react";

interface AIAssistantProps {
  documentTitle: string;
  documentContent: string;
  onInsert: (text: string) => void;
}

const QUICK_PROMPTS = [
  "Summarize this document",
  "Improve the writing",
  "Add a conclusion",
  "Create action items",
  "Make it more concise",
];

export function AIDocumentAssistant({
  documentTitle,
  documentContent,
  onInsert,
}: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (customPrompt?: string) => {
    const question = customPrompt ?? prompt;
    if (!question.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: question,
          documentTitle,
          documentContent,
        }),
      });

      if (!res.ok) throw new Error("AI request failed");

      const data = await res.json();
      setResult(data.content);
      setPrompt("");
    } catch {
      setError("Couldn't get a response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 50,
        width: open ? 380 : "auto",
      }}
    >
      {open ? (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-accent)",
            borderRadius: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: 520,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, var(--accent-soft) 0%, transparent 100%)",
            }}
          >
            <Sparkles size={16} style={{ color: "var(--accent)" }} />
            <span
              style={{
                flex: 1,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--text-primary)",
              }}
            >
              AI Document Assistant
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                padding: 2,
              }}
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Quick prompts */}
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => handleAsk(p)}
                disabled={loading}
                style={{
                  background: "var(--bg-overlay)",
                  border: "1px solid var(--border)",
                  borderRadius: 99,
                  padding: "4px 10px",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Result area */}
          {(result || error || loading) && (
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                maxHeight: 250,
              }}
            >
              {loading && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--text-muted)",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      border: "2px solid var(--accent)",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Thinking…
                </div>
              )}
              {error && (
                <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>
              )}
              {result && (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      margin: "0 0 10px",
                    }}
                  >
                    {result}
                  </p>
                  <button
                    onClick={() => onInsert(result)}
                    style={{
                      background: "var(--accent)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Insert into document
                  </button>
                </>
              )}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: "10px 12px",
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="Ask anything about this document…"
              rows={2}
              style={{
                flex: 1,
                background: "var(--bg-overlay)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 13,
                color: "var(--text-primary)",
                outline: "none",
                resize: "none",
                fontFamily: "var(--font-body)",
              }}
            />
            <button
              onClick={() => handleAsk()}
              disabled={!prompt.trim() || loading}
              style={{
                background: "var(--accent)",
                border: "none",
                borderRadius: 8,
                padding: "8px 10px",
                cursor: !prompt.trim() || loading ? "not-allowed" : "pointer",
                opacity: !prompt.trim() || loading ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                alignSelf: "flex-end",
              }}
            >
              <Send size={16} color="#fff" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "10px 16px",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 4px 20px var(--accent-glow)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 30px var(--accent-glow)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px var(--accent-glow)";
          }}
        >
          <Sparkles size={16} />
          AI Assistant
          <ChevronUp size={14} style={{ opacity: 0.7 }} />
        </button>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}