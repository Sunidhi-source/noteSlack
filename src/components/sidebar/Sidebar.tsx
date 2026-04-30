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
  UserPlus,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { CreateChannelModal } from "./CreateChannelModal";
import { CreateDocModal } from "./CreateDocModal";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SearchModal } from "@/components/ui/SearchModal";
import { NotificationBell } from "@/components/ui/NotificationBell";
import InviteMemberModal from "./InviteMemberModal";
import { generateUserColor, getInitials } from "@/lib/utils";
import type { Channel, Document, User } from "@/types";
 
export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { channels, documents, currentWorkspace, members, unreadCounts } =
    useWorkspaceStore();

  const [channelsOpen, setChannelsOpen] = useState(true);
  const [docsOpen, setDocsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  // FIX: wire up invite modal state
  const [showInvite, setShowInvite] = useState(false);

  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return null;

  const dmMembers = (members ?? []).filter((m: User) => m.id !== user?.id);

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
            gap: 8,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <WorkspaceSwitcher />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            {/* FIX: Invite member button in header for quick access */}
            <button
              onClick={() => setShowInvite(true)}
              title="Invite member"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                padding: "7px",
                borderRadius: "var(--radius-sm)",
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--bg-overlay)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
            >
              <UserPlus size={16} />
            </button>
            <NotificationBell />
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={() => setShowSearch(true)}
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
            color: "var(--text-muted)",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "var(--accent)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "var(--border)")
          }
        >
          <Search size={12} />
          <span style={{ fontSize: 12, flex: 1, textAlign: "left" }}>
            Search…
          </span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>⌘K</span>
        </button>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
          {/* ── Channels ── */}
          <SectionHeader
            label="Channels"
            isOpen={channelsOpen}
            onToggle={() => setChannelsOpen((v) => !v)}
            onAdd={() => setShowCreateChannel(true)}
          />
          {channelsOpen &&
            channels.map((ch: Channel) => (
              <SidebarItem
                key={ch.id}
                href={`/workspace/${workspaceId}/channel/${ch.id}`}
                label={ch.name}
                icon={<Hash size={13} />}
                isActive={
                  pathname === `/workspace/${workspaceId}/channel/${ch.id}`
                }
                badge={unreadCounts?.[ch.id] || 0}
              />
            ))}

          {/* ── Direct Messages ── 
              FIX: added onAdd to open invite modal so users can add people
              right from the DMs section */}
          <SectionHeader
            label="Direct Messages"
            isOpen={dmsOpen}
            onToggle={() => setDmsOpen((v) => !v)}
            onAdd={() => setShowInvite(true)}
          />
          {dmsOpen &&
            dmMembers.map((member: User) => {
              const color = generateUserColor(member.id);
              const initials = getInitials(member.full_name ?? "?");
              return (
                <SidebarItem
                  key={member.id}
                  href={`/workspace/${workspaceId}/dm/${member.id}`}
                  label={member.full_name ?? "Teammate"}
                  isActive={
                    pathname === `/workspace/${workspaceId}/dm/${member.id}`
                  }
                  icon={
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        color: "#fff",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                  }
                  suffix={
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "var(--success)",
                        display: "inline-block",
                        border: "1.5px solid var(--bg-surface)",
                      }}
                    />
                  }
                />
              );
            })}

          {/* ── Documents ── */}
          <SectionHeader
            label="Documents"
            isOpen={docsOpen}
            onToggle={() => setDocsOpen((v) => !v)}
            onAdd={() => setShowCreateDoc(true)}
          />
          {docsOpen &&
            documents.map((doc: Document) => (
              <SidebarItem
                key={doc.id}
                href={`/workspace/${workspaceId}/docs/${doc.id}`}
                label={doc.title || "Untitled"}
                icon={<FileText size={13} />}
                isActive={
                  pathname === `/workspace/${workspaceId}/docs/${doc.id}`
                }
              />
            ))}
        </div>

        {/* Footer — clicking the user area goes to your own profile */}
        <div
          style={{
            padding: "10px 12px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <UserButton />
          <Link
            href={`/workspace/${workspaceId}/profile/${user?.id}`}
            style={{ flex: 1, minWidth: 0, textDecoration: "none" }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.fullName ?? "User"}
            </p>
            <p style={{ fontSize: 10, color: "var(--success)" }}>● Active</p>
          </Link>
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
      {showSearch && (
        <SearchModal
          workspaceId={workspaceId}
          onClose={() => setShowSearch(false)}
        />
      )}
      {/* FIX: invite modal now properly wired */}
      {showInvite && (
        <InviteMemberModal
          workspaceId={workspaceId}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
}

/* ── Helpers ── */

function SectionHeader({
  label,
  isOpen,
  onToggle,
  onAdd,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  onAdd?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 12px 4px",
        gap: 4,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          flex: 1,
          padding: 0,
        }}
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {label}
      </button>
      {onAdd && (
        <button
          onClick={onAdd}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            borderRadius: 4,
            padding: "2px",
            display: "flex",
            alignItems: "center",
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
  badge,
  suffix,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  badge?: number;
  suffix?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px",
        background: isActive ? "var(--accent-soft)" : "transparent",
        borderLeft: isActive
          ? "2px solid var(--accent)"
          : "2px solid transparent",
        textDecoration: "none",
        color: isActive ? "var(--accent)" : "var(--text-secondary)",
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        transition: "background 0.1s",
        borderRadius: "0 6px 6px 0",
        marginRight: 8,
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isActive)
          (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <span
        style={{
          color: isActive ? "var(--accent)" : "var(--text-muted)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {suffix}
      {(badge ?? 0) > 0 && (
        <span
          style={{
            background: "var(--accent)",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 99,
            padding: "1px 5px",
            minWidth: 16,
            textAlign: "center",
          }}
        >
          {(badge ?? 0) > 99 ? "99+" : (badge ?? 0)}
        </span>
      )}
    </Link>
  );
}
