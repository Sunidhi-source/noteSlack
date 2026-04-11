"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Hash,
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { CreateChannelModal } from "./CreateChannelModal";
import { CreateDocModal } from "./CreateDocModal";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { channels, documents, currentWorkspace } = useWorkspaceStore();

  const [channelsOpen, setChannelsOpen] = useState(true);
  const [docsOpen, setDocsOpen] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDoc, setShowCreateDoc] = useState(false);

  const workspaceId = currentWorkspace?.id;

  // ✅ Safety check
  if (!workspaceId) return null;

  return (
    <>
      <aside
        style={{
          width: "var(--sidebar-width)",
          height: "100vh",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0 12px",
            height: "var(--header-h)",
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <WorkspaceSwitcher />
        </div>

        {/* Search */}
        <button
          style={{
            margin: "8px 10px 4px",
            background: "var(--bg-overlay)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <Search size={12} />
          <span style={{ fontSize: 12, flex: 1, textAlign: "left" }}>
            Search…
          </span>
          <span style={{ fontSize: 10 }}>⌘K</span>
        </button>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Channels */}
          <SectionHeader
            label="Channels"
            isOpen={channelsOpen}
            onToggle={() => setChannelsOpen((v) => !v)}
            onAdd={() => setShowCreateChannel(true)}
          />

          {channelsOpen &&
            channels.map((ch) => (
              <SidebarItem
                key={ch.id}
                href={`/workspace/${workspaceId}/channel/${ch.id}`}
                label={ch.name}
                icon={<Hash size={13} />}
                isActive={
                  pathname ===
                  `/workspace/${workspaceId}/channel/${ch.id}`
                }
              />
            ))}

          {/* Documents */}
          <SectionHeader
            label="Documents"
            isOpen={docsOpen}
            onToggle={() => setDocsOpen((v) => !v)}
            onAdd={() => setShowCreateDoc(true)}
          />

          {docsOpen &&
            documents.map((doc) => (
              <SidebarItem
                key={doc.id}
                href={`/workspace/${workspaceId}/docs/${doc.id}`}
                label={doc.title || "Untitled"}
                icon={<FileText size={13} />}
                isActive={
                  pathname ===
                  `/workspace/${workspaceId}/docs/${doc.id}`
                }
              />
            ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <UserButton />
          <span>{user?.fullName ?? "User"}</span>
        </div>
      </aside>

      {/* Modals */}
      {showCreateChannel && (
        <CreateChannelModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateChannel(false)}
        />
      )}

      {showCreateDoc && (
        <CreateDocModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateDoc(false)}
        />
      )}
    </>
  );
}

/* Helpers */

function SectionHeader({
  label,
  isOpen,
  onToggle,
  onAdd,
}: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: 8 }}>
      <button onClick={onToggle}>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {label}
      </button>
      <button onClick={onAdd}>
        <Plus size={14} />
      </button>
    </div>
  );
}

function SidebarItem({ href, label, icon, isActive }: any) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        gap: 8,
        padding: "6px 12px",
        background: isActive ? "#eee" : "transparent",
        textDecoration: "none",
      }}
    >
      {icon}
      {label}
    </Link>
  );
}