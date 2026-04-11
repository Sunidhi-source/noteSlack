"use client";

import { useState, useEffect, useRef } from "react";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((data: { workspaces: Workspace }[]) => {
        const ws = data
          .map((item) => item.workspaces)
          .filter(Boolean) as Workspace[];
        setWorkspaces(ws);
      })
      .catch(() => {});
  }, [currentWorkspace?.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const switchTo = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    router.push(`/workspace/${ws.id}`);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative", flex: 1 }} ref={panelRef}>
      <button
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
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-hover)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        {/* Workspace icon */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "var(--accent-soft)",
            border: "1px solid var(--border-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {currentWorkspace?.icon ?? "🏠"}
        </div>

        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-display)",
            }}
          >
            {currentWorkspace?.name ?? "Select Workspace"}
          </p>
        </div>

        <ChevronDown
          size={13}
          style={{
            color: "var(--text-muted)",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--bg-overlay)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => switchTo(ws)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-hover)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: "var(--accent-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {ws.icon ?? "🏠"}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  flex: 1,
                  textAlign: "left",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ws.name}
              </span>
              {currentWorkspace?.id === ws.id && (
                <Check
                  size={13}
                  style={{ color: "var(--accent)", flexShrink: 0 }}
                />
              )}
            </button>
          ))}

          <div
            style={{
              borderTop: "1px solid var(--border)",
              padding: "4px 0",
            }}
          >
            <button
              onClick={() => {
                setOpen(false);
                setShowCreate(true);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                color: "var(--accent)",
                fontSize: 13,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-hover)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: "var(--accent-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Plus size={14} style={{ color: "var(--accent)" }} />
              </div>
              Create new workspace
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateWorkspaceModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
