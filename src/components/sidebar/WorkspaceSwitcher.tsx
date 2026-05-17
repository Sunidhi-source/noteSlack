"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";
import { Workspace } from "@/types";

export function WorkspaceSwitcher() {
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((data: Workspace[]) => {
        setWorkspaces(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, [currentWorkspace?.id]);

  // ✅ Calculate dropdown position from button's bounding rect
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 220),
      });
    }
  }, [open]);

  // ✅ Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const switchTo = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    router.push(`/workspace/${ws.id}`);
    setOpen(false);
  };

  return (
    <>
      <div style={{ position: "relative", flex: 1 }}>
        <button
          ref={buttonRef}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: "var(--radius-sm)",
            fontFamily: "inherit",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: "var(--accent-soft)",
            border: "1px solid var(--border-accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, flexShrink: 0,
          }}>
            {currentWorkspace?.icon ?? "🏠"}
          </div>

          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <p style={{
              fontSize: 13, fontWeight: 700,
              color: "var(--text-primary)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "var(--font-display)",
            }}>
              {currentWorkspace?.name ?? "Select Workspace"}
            </p>
          </div>

          <ChevronDown size={13} style={{
            color: "var(--text-muted)", flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }} />
        </button>
      </div>

      {/* ✅ Render dropdown via portal — completely outside sidebar DOM */}
      {open && typeof document !== "undefined" && createPortal(
        <>
          {/* Full-screen backdrop — catches all outside clicks */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />

          {/* Dropdown — positioned exactly below the button */}
          <div style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            zIndex: 9999,
            overflow: "hidden",
          }}>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => switchTo(ws)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", background: "none", border: "none",
                  cursor: "pointer", fontFamily: "inherit", transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: "var(--accent-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0,
                }}>
                  {ws.icon ?? "🏠"}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 500, color: "var(--text-primary)",
                  flex: 1, textAlign: "left",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {ws.name}
                </span>
                {currentWorkspace?.id === ws.id && (
                  <Check size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                )}
              </button>
            ))}

            <div style={{ borderTop: "1px solid var(--border)", padding: "4px 0" }}>
              <button
                onClick={() => { setOpen(false); setShowCreate(true); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", background: "none", border: "none",
                  cursor: "pointer", fontFamily: "inherit",
                  color: "var(--accent)", fontSize: 13, transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: "var(--accent-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Plus size={14} style={{ color: "var(--accent)" }} />
                </div>
                Create new workspace
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {showCreate && (
        <CreateWorkspaceModal onClose={() => setShowCreate(false)} />
      )}
    </>
  );
}