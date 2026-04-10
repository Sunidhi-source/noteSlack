"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export function Modal({ title, onClose, children, width = 420 }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-accent)",
          borderRadius: "var(--radius-lg)",
          width,
          maxWidth: "90vw",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          animation: "fadeUp 0.15s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 16,
              margin: 0,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              padding: 4,
              borderRadius: "var(--radius-sm)",
              transition: "color 0.1s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {children}
        </div>
      </div>

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ── Shared input styles (exported for use in modal forms) ──────

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--bg-base)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
  marginBottom: 0,
};

export const btnPrimaryStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 18px",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  fontFamily: "inherit",
  marginTop: 4,
  transition: "opacity 0.15s",
};
