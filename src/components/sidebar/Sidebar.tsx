"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Hash, FileText, Plus, ChevronDown, ChevronRight,
  Search, UserPlus, Home,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { useWorkspace } from "@/hooks/useWorkspace";
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
  const { channels, documents, currentWorkspace, members, unreadCounts } = useWorkspaceStore();

  const [channelsOpen, setChannelsOpen] = useState(true);
  const [docsOpen, setDocsOpen]         = useState(true);
  const [dmsOpen, setDmsOpen]           = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDoc, setShowCreateDoc]         = useState(false);
  const [showSearch, setShowSearch]               = useState(false);
  const [showInvite, setShowInvite]               = useState(false);

  // ✅ FIX: Extract workspaceId from URL so the Sidebar starts data-fetching
  //    immediately — in parallel with the page — instead of waiting for the
  //    page's useWorkspace to populate currentWorkspace first. This was the
  //    root cause of the ~1min delay (authReady blocked) and stats showing 0
  //    (store empty when WorkspaceHome rendered).
  const urlWorkspaceId = pathname.match(/\/workspace\/([^/]+)/)?.[1] ?? "";
  // useWorkspace must always be called (no conditional hooks). It's a no-op when id is "".
  useWorkspace(urlWorkspaceId);

  const workspaceId = currentWorkspace?.id ?? urlWorkspaceId;
  if (!workspaceId) return null;

  const dmMembers = (members ?? []).filter((m: User) => m.id !== user?.id);
  const homeHref  = `/workspace/${workspaceId}`;
  const isHome    = pathname === homeHref;

  return (
    <>
      <aside style={{
        width: "var(--sidebar-width)",
        height: "100vh",
        background: "linear-gradient(180deg, #07070f 0%, #050508 100%)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        overflow: "hidden", position: "relative",
      }}>
        {/* Ambient top glow */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 140,
          background: "radial-gradient(ellipse at 50% -20%, rgba(124,109,250,0.09) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Vertical accent line */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, right: 0,
          width: 1,
          background: "linear-gradient(180deg, transparent 0%, rgba(124,109,250,0.15) 30%, rgba(124,109,250,0.08) 70%, transparent 100%)",
          pointerEvents: "none",
        }} />

        {/* Header */}
        <div style={{
          padding: "0 12px",
          height: "var(--header-h)",
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--border)",
          position: "relative", zIndex: 1,
        }}>
          <WorkspaceSwitcher />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <IconBtn title="Invite member" onClick={() => setShowInvite(true)}>
              <UserPlus size={14} />
            </IconBtn>
            <NotificationBell />
          </div>
        </div>

        {/* Search */}
        <button
          onClick={() => setShowSearch(true)}
          style={{
            margin: "10px 10px 2px",
            background: "rgba(255,255,255,0.025)",
            border: "1px solid var(--border)",
            borderRadius: 10, padding: "7px 12px",
            display: "flex", alignItems: "center", gap: 8,
            cursor: "pointer", color: "var(--text-muted)",
            transition: "all 0.2s", position: "relative", zIndex: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(124,109,250,0.4)";
            e.currentTarget.style.background  = "rgba(124,109,250,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.background  = "rgba(255,255,255,0.025)";
          }}
        >
          <Search size={12} style={{ color: "var(--text-muted)" }} />
          <span style={{ fontSize: 12, flex: 1, textAlign: "left", color: "var(--text-muted)" }}>Search workspace…</span>
          <span style={{ fontSize: 10, opacity: 0.45, background: "var(--bg-overlay)", padding: "2px 6px", borderRadius: 4, fontFamily: "var(--font-mono)", border: "1px solid var(--border)" }}>⌘K</span>
        </button>

        {/* Home link */}
        <Link href={homeHref}
          style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "7px 12px", margin: "4px 10px 0",
            borderRadius: 9, textDecoration: "none",
            color: isHome ? "var(--accent)" : "var(--text-secondary)",
            background: isHome ? "rgba(124,109,250,0.1)" : "transparent",
            fontSize: 13, fontWeight: isHome ? 600 : 400,
            transition: "all 0.15s",
            border: isHome ? "1px solid rgba(124,109,250,0.2)" : "1px solid transparent",
            position: "relative", zIndex: 1,
          }}
          onMouseEnter={(e) => { if (!isHome) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
          onMouseLeave={(e) => { if (!isHome) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <Home size={13} style={{ color: isHome ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }} />
          <span>Home</span>
          {isHome && (
            <span style={{
              marginLeft: "auto", width: 6, height: 6, borderRadius: "50%",
              background: "var(--accent)", boxShadow: "0 0 8px var(--accent)",
            }} />
          )}
        </Link>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8, position: "relative", zIndex: 1 }}>

          <SectionHeader label="Channels" isOpen={channelsOpen} onToggle={() => setChannelsOpen((v) => !v)} onAdd={() => setShowCreateChannel(true)} />
          {channelsOpen && channels.map((ch: Channel) => (
            <SidebarItem
              key={ch.id}
              href={`/workspace/${workspaceId}/channel/${ch.id}`}
              label={ch.name}
              icon={<Hash size={12} />}
              isActive={pathname === `/workspace/${workspaceId}/channel/${ch.id}`}
              badge={unreadCounts?.[ch.id] || 0}
            />
          ))}

          <SectionHeader label="Direct Messages" isOpen={dmsOpen} onToggle={() => setDmsOpen((v) => !v)} onAdd={() => setShowInvite(true)} />
          {dmsOpen && dmMembers.map((member: User) => {
            const color    = generateUserColor(member.id);
            const initials = getInitials(member.full_name ?? "?");
            return (
              <SidebarItem
                key={member.id}
                href={`/workspace/${workspaceId}/dm/${member.id}`}
                label={member.full_name ?? "Teammate"}
                isActive={pathname === `/workspace/${workspaceId}/dm/${member.id}`}
                icon={
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", background: color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, color: "#fff", fontWeight: 700, flexShrink: 0,
                  }}>{initials}</div>
                }
                suffix={
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "var(--success)", display: "inline-block",
                    border: "1.5px solid #050508",
                    boxShadow: "0 0 6px var(--success)",
                  }} />
                }
              />
            );
          })}

          <SectionHeader label="Documents" isOpen={docsOpen} onToggle={() => setDocsOpen((v) => !v)} onAdd={() => setShowCreateDoc(true)} />
          {docsOpen && documents.map((doc: Document) => (
            <SidebarItem
              key={doc.id}
              href={`/workspace/${workspaceId}/docs/${doc.id}`}
              label={doc.title || "Untitled"}
              icon={<FileText size={12} />}
              isActive={pathname === `/workspace/${workspaceId}/docs/${doc.id}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(0,0,0,0.3)",
          position: "relative", zIndex: 1,
        }}>
          <UserButton />
          <Link href={`/workspace/${workspaceId}/profile/${user?.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.fullName ?? "User"}
            </p>
            <p style={{ fontSize: 10, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", display: "inline-block", boxShadow: "0 0 6px var(--success)", animation: "pulse-glow 2s infinite" }} />
              Active
            </p>
          </Link>
        </div>
      </aside>

      {showCreateChannel && <CreateChannelModal workspaceId={workspaceId} onClose={() => setShowCreateChannel(false)} />}
      {showCreateDoc     && <CreateDocModal workspaceId={workspaceId} onClose={() => setShowCreateDoc(false)} />}
      {showSearch        && <SearchModal workspaceId={workspaceId} onClose={() => setShowSearch(false)} />}
      {showInvite        && <InviteMemberModal workspaceId={workspaceId} onClose={() => setShowInvite(false)} />}
    </>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: "none", border: "none", cursor: "pointer",
      color: "var(--text-muted)", display: "flex", alignItems: "center",
      padding: "6px", borderRadius: 7, transition: "all 0.15s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "none"; }}
    >{children}</button>
  );
}

function SectionHeader({ label, isOpen, onToggle, onAdd }: {
  label: string; isOpen: boolean; onToggle: () => void; onAdd?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 12px 3px", gap: 4 }}>
      <button onClick={onToggle} style={{
        display: "flex", alignItems: "center", gap: 4,
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-muted)", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.09em", textTransform: "uppercase", flex: 1, padding: 0,
        transition: "color 0.15s", fontFamily: "var(--font-display)",
      }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
      >
        {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {label}
      </button>
      {onAdd && (
        <button onClick={onAdd} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", borderRadius: 4, padding: "2px", display: "flex",
          transition: "color 0.15s",
        }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  );
}

function SidebarItem({ href, label, icon, isActive, badge, suffix }: {
  href: string; label: string; icon?: React.ReactNode;
  isActive: boolean; badge?: number; suffix?: React.ReactNode;
}) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "5px 10px 5px 14px",
      background: isActive
        ? "linear-gradient(90deg, rgba(124,109,250,0.14) 0%, rgba(124,109,250,0.04) 100%)"
        : "transparent",
      borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
      textDecoration: "none",
      color: isActive ? "var(--accent)" : "var(--text-secondary)",
      fontSize: 13, fontWeight: isActive ? 600 : 400,
      transition: "all 0.15s", borderRadius: "0 9px 9px 0", marginRight: 6,
    }}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <span style={{ color: isActive ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {suffix}
      {(badge ?? 0) > 0 && (
        <span style={{
          background: "linear-gradient(135deg, var(--accent), #9170ff)",
          color: "#fff", fontSize: 9, fontWeight: 700,
          borderRadius: 99, padding: "2px 6px", minWidth: 18, textAlign: "center",
          boxShadow: "0 0 10px var(--accent-glow)",
        }}>
          {(badge ?? 0) > 99 ? "99+" : (badge ?? 0)}
        </span>
      )}
    </Link>
  );
}
