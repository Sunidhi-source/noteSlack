"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { Workspace } from "@/types";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";

export function WorkspaceSwitcher() {
  const { currentWorkspace } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((data) => {
        const ws = (data as { workspaces: Workspace }[]).map(
          (d) => d.workspaces,
        );
        setWorkspaces(ws);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <div style={{ position: "relative", width: "100%" }}>
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
            padding: "4px 4px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {currentWorkspace?.icon ?? "🏠"}
          </span>
          <span
            style={{
              flex: 1,
              textAlign: "left",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {currentWorkspace?.name ?? "Select workspace"}
          </span>
          <ChevronDown
            size={14}
            style={{ color: "var(--text-muted)", flexShrink: 0 }}
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
              padding: "4px",
              zIndex: 100,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              animation: "fadeUp 0.15s ease both",
            }}
          >
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  router.push(`/workspace/${ws.id}`);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 8px",
                  borderRadius: "var(--radius-sm)",
                  background:
                    ws.id === currentWorkspace?.id
                      ? "var(--accent-soft)"
                      : "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: ws.id === currentWorkspace?.id ? 500 : 400,
                  textAlign: "left",
                }}
              >
                <span>{ws.icon ?? "🏠"}</span>
                <span>{ws.name}</span>
              </button>
            ))}
            <div
              style={{
                height: 1,
                background: "var(--border)",
                margin: "4px 0",
              }}
            />
            <button
              onClick={() => {
                setOpen(false);
                setShowCreate(true);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 8px",
                borderRadius: "var(--radius-sm)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: 13,
                textAlign: "left",
              }}
            >
              <Plus size={14} />
              Create workspace
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateWorkspaceModal onClose={() => setShowCreate(false)} />
      )}
    </>
  );
}
