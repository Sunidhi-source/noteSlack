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
  UserPlus,
  Search,
  MessageCircle,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { CreateChannelModal } from "./CreateChannelModal";
import { CreateDocModal } from "./CreateDocModal";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { InviteMemberModal } from "./InviteMemberModal";
import { SearchModal } from "@/components/ui/SearchModal";
import { NotificationBell } from "@/components/ui/NotificationBell";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { channels, documents, currentWorkspace, unreadCounts, members } =
    useWorkspaceStore();

  const [channelsOpen, setChannelsOpen] = useState(true);
  const [docsOpen, setDocsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const workspaceId = currentWorkspace?.id;

  // Keyboard shortcut: Cmd/Ctrl+K to open search
  useState(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  });

  // Total unread across all channels
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  // DM partners = other members (simplified: show all workspace members as DM targets)
  const dmPartners = members.filter((m) => m.id !== user?.id).slice(0, 8);

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
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Workspace header */}
        <div
          style={{
            padding: "0 12px",
            height: "var(--header-h)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <WorkspaceSwitcher />
          </div>
          <NotificationBell />
        </div>

        {/* Search bar */}
        <div style={{ padding: "8px 10px", flexShrink: 0 }}>
          <button
            onClick={() => setShowSearch(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 13,
              fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          >
            <Search size={13} />
            <span style={{ flex: 1, textAlign: "left" }}>Search…</span>
            <kbd
              style={{
                fontSize: 10,
                background: "var(--bg-hover)",
                border: "1px solid var(--border-accent)",
                borderRadius: 3,
                padding: "1px 4px",
                color: "var(--text-muted)",
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {/* Channels */}
          <SectionHeader
            label="Channels"
            badge={totalUnread > 0 ? totalUnread : undefined}
            isOpen={channelsOpen}
            onToggle={() => setChannelsOpen((v) => !v)}
            onAdd={() => setShowCreateChannel(true)}
          />
          {channelsOpen && (
            <div style={{ paddingBottom: 4 }}>
              {channels.map((ch) => (
                <SidebarItem
                  key={ch.id}
                  href={`/workspace/${workspaceId}/channel/${ch.id}`}
                  label={ch.name}
                  icon={<Hash size={13} strokeWidth={2} />}
                  isActive={pathname.includes(ch.id)}
                  unread={unreadCounts[ch.id]}
                  isPrivate={ch.is_private}
                />
              ))}
              {channels.length === 0 && <EmptyHint text="No channels yet" />}
            </div>
          )}

          <div style={{ height: 4 }} />

          {/* Direct Messages */}
          <SectionHeader
            label="Direct Messages"
            isOpen={dmsOpen}
            onToggle={() => setDmsOpen((v) => !v)}
          />
          {dmsOpen && (
            <div style={{ paddingBottom: 4 }}>
              {dmPartners.map((member) => (
                <SidebarItem
                  key={member.id}
                  href={`/workspace/${workspaceId}/dm/${member.id}`}
                  label={member.full_name ?? member.email ?? "Unknown"}
                  icon={
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--success)",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                  }
                  isActive={pathname.includes(`/dm/${member.id}`)}
                />
              ))}
              {dmPartners.length === 0 && <EmptyHint text="No teammates yet" />}
            </div>
          )}

          <div style={{ height: 4 }} />

          {/* Documents */}
          <SectionHeader
            label="Documents"
            isOpen={docsOpen}
            onToggle={() => setDocsOpen((v) => !v)}
            onAdd={() => setShowCreateDoc(true)}
          />
          {docsOpen && (
            <div style={{ paddingBottom: 4 }}>
              {documents.map((doc) => (
                <SidebarItem
                  key={doc.id}
                  href={`/workspace/${workspaceId}/docs/${doc.id}`}
                  label={doc.title || "Untitled"}
                  icon={<FileText size={13} strokeWidth={2} />}
                  isActive={pathname.includes(doc.id)}
                />
              ))}
              {documents.length === 0 && <EmptyHint text="No documents yet" />}
            </div>
          )}

          {/* Invite members */}
          {workspaceId && (
            <div style={{ padding: "12px 8px 0" }}>
              <button
                onClick={() => setShowInvite(true)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "none",
                  border: "1px dashed var(--border)",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  fontFamily: "inherit",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <UserPlus size={13} />
                Invite teammates
              </button>
            </div>
          )}
        </div>

        {/* User footer */}
        <div
          style={{
            padding: "10px 12px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <UserButton
            appearance={{
              variables: { colorPrimary: "#6c63ff" },
              elements: { avatarBox: { width: 30, height: 30 } },
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.fullName ?? user?.username ?? "You"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--success)",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Active
              </span>
            </div>
          </div>
        </div>
      </aside>

      {showSearch && workspaceId && (
        <SearchModal
          workspaceId={workspaceId}
          onClose={() => setShowSearch(false)}
        />
      )}
      {showCreateChannel && workspaceId && (
        <CreateChannelModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateChannel(false)}
        />
      )}
      {showCreateDoc && workspaceId && (
        <CreateDocModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateDoc(false)}
        />
      )}
      {showInvite && workspaceId && (
        <InviteMemberModal
          workspaceId={workspaceId}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function SectionHeader({
  label,
  badge,
  isOpen,
  onToggle,
  onAdd,
}: {
  label: string;
  badge?: number;
  isOpen: boolean;
  onToggle: () => void;
  onAdd?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 8px 4px 12px",
        marginBottom: 2,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: "var(--font-display)",
          padding: 0,
        }}
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {label}
        {badge && badge > 0 ? (
          <span
            style={{
              marginLeft: 4,
              background: "var(--danger)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 99,
              padding: "1px 5px",
            }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>
      {onAdd && (
        <button
          onClick={onAdd}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            padding: "2px",
            borderRadius: 4,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-muted)")
          }
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

function SidebarItem({
  href,
  label,
  icon,
  isActive,
  unread,
  isPrivate,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  unread?: number;
  isPrivate?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px",
        margin: "1px 6px",
        borderRadius: "var(--radius-sm)",
        textDecoration: "none",
        fontSize: 13,
        color: isActive
          ? "var(--text-primary)"
          : unread
            ? "var(--text-primary)"
            : "var(--text-secondary)",
        background: isActive ? "var(--accent-soft)" : "transparent",
        fontWeight: isActive ? 500 : unread ? 600 : 400,
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        transition: "background 0.1s, color 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "var(--bg-hover)";
          e.currentTarget.style.color = "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = unread
            ? "var(--text-primary)"
            : "var(--text-secondary)";
        }
      }}
    >
      <span style={{ opacity: 0.7, flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
        {isPrivate ? "🔒 " : ""}
        {label}
      </span>
      {unread && unread > 0 && !isActive ? (
        <span
          style={{
            background: "var(--accent)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 99,
            padding: "1px 6px",
            flexShrink: 0,
          }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : isActive ? (
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "var(--accent)",
            flexShrink: 0,
          }}
        />
      ) : null}
    </Link>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: 12,
        color: "var(--text-muted)",
        padding: "4px 16px 8px",
      }}
    >
      {text}
    </p>
  );
}
