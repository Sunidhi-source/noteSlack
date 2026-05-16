"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspaceStore } from "@/store/workspace";
import {
  Hash, FileText, MessageCircle, ArrowRight, Activity, Zap, Users, Plus, Clock,
} from "lucide-react";
import { formatRelativeTime, generateUserColor, getInitials } from "@/lib/utils";
import { CreateChannelModal } from "@/components/sidebar/CreateChannelModal";
import { CreateDocModal } from "@/components/sidebar/CreateDocModal";
import InviteMemberModal from "@/components/sidebar/InviteMemberModal";

interface Props { workspaceId: string; }

interface ActivityItem {
  type: "message" | "document";
  id: string;
  actor: string;
  description: string;
  preview: string;
  link: string;
  timestamp: string;
}

const HOUR = new Date().getHours();
function getGreeting() {
  if (HOUR < 12) return "Good morning";
  if (HOUR < 17) return "Good afternoon";
  return "Good evening";
}

export function WorkspaceHome({ workspaceId }: Props) {
  const { currentWorkspace, channels, documents, members } = useWorkspaceStore();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspace/activity?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setActivity(data); setLoadingActivity(false); })
      .catch(() => setLoadingActivity(false));
  }, [workspaceId]);

  if (!currentWorkspace) {
    return (
      <div style={{ flex: 1, background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-base)" }}>
        {/* Hero banner */}
        <div
          style={{
            padding: "40px 48px 44px",
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, #0f0f20 0%, #14101f 50%, #0a1020 100%)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {/* Gradient orbs */}
          <div style={{ position: "absolute", top: -80, left: -40, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, right: 80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "40%", right: "30%", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,201,134,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Grid lines */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Workspace icon + greeting */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 28 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: "linear-gradient(135deg, rgba(108,99,255,0.3), rgba(124,58,237,0.2))",
                border: "1px solid rgba(108,99,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, flexShrink: 0,
                boxShadow: "0 0 40px rgba(108,99,255,0.2)",
              }}>
                {currentWorkspace.icon ?? "🚀"}
              </div>

              <div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4, fontWeight: 500 }}>{getGreeting()} 👋</p>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 8 }}>
                  {currentWorkspace.name}
                </h1>
                <div style={{ display: "flex", gap: 16 }}>
                  {[
                    { icon: <Users size={12} />, label: `${members.length} members` },
                    { icon: <Hash size={12} />, label: `${channels.length} channels` },
                    { icon: <FileText size={12} />, label: `${documents.length} docs` },
                  ].map(({ icon, label }) => (
                    <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                      {icon}{label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { icon: <Hash size={14} />, label: "New Channel", onClick: () => setShowCreateChannel(true), accent: true },
                { icon: <FileText size={14} />, label: "New Doc", onClick: () => setShowCreateDoc(true) },
                { icon: <Users size={14} />, label: "Invite Member", onClick: () => setShowInvite(true) },
              ].map(({ icon, label, onClick, accent }) => (
                <button
                  key={label}
                  onClick={onClick}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 18px", borderRadius: 10,
                    border: `1px solid ${accent ? "rgba(108,99,255,0.5)" : "rgba(255,255,255,0.12)"}`,
                    background: accent ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.06)",
                    color: accent ? "#b8b3ff" : "rgba(255,255,255,0.75)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = accent ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = accent ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.06)"; }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "flex", gap: 0,
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}>
          {[
            { value: channels.length, label: "Channels", icon: "💬", color: "#6c63ff" },
            { value: documents.length, label: "Documents", icon: "📄", color: "#22c986" },
            { value: members.length, label: "Members", icon: "👥", color: "#f5a623" },
            { value: activity.length, label: "Recent actions", icon: "⚡", color: "#ff4d6a" },
          ].map(({ value, label, icon, color }, i) => (
            <div key={label} style={{
              flex: 1, padding: "16px 20px",
              borderRight: i < 3 ? "1px solid var(--border)" : "none",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {icon}
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "var(--text-primary)", lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Channels card */}
          <div style={{ background: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Hash size={13} style={{ color: "var(--accent)" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Channels</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{channels.length} total</span>
              <button onClick={() => setShowCreateChannel(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", borderRadius: 6, padding: "3px", display: "flex", transition: "color 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >
                <Plus size={14} />
              </button>
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {channels.length === 0 ? (
                <EmptyState icon={<Hash size={20} />} text="No channels yet. Create one!" />
              ) : (
                channels.map((ch, i) => (
                  <Link key={ch.id} href={`/workspace/${workspaceId}/channel/${ch.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", textDecoration: "none", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)", transition: "background 0.1s", animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Hash size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1, fontWeight: 500 }}>{ch.name}</span>
                    {ch.description && <span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{ch.description}</span>}
                    <ArrowRight size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Documents card */}
          <div style={{ background: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--accent-2-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={13} style={{ color: "var(--accent-2)" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Documents</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{documents.length} total</span>
              <button onClick={() => setShowCreateDoc(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", borderRadius: 6, padding: "3px", display: "flex", transition: "color 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-2)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >
                <Plus size={14} />
              </button>
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {documents.length === 0 ? (
                <EmptyState icon={<FileText size={20} />} text="No documents yet. Create one!" />
              ) : (
                documents.map((d, i) => (
                  <Link key={d.id} href={`/workspace/${workspaceId}/docs/${d.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", textDecoration: "none", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)", transition: "background 0.1s", animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <FileText size={13} style={{ color: "var(--accent-2)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{d.title || "Untitled"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>
                      <Clock size={10} />
                      {formatRelativeTime(d.updated_at)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Members */}
          <div style={{ background: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", gridColumn: "1 / -1" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(245,166,35,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={13} style={{ color: "var(--warning)" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Team Members</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{members.length} total</span>
              <button onClick={() => setShowInvite(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--accent-soft)", border: "1px solid rgba(108,99,255,0.2)", borderRadius: 7, padding: "4px 10px", cursor: "pointer", color: "var(--accent)", fontSize: 11, fontWeight: 600, transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(108,99,255,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; }}
              >
                <Plus size={12} /> Invite
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "16px 18px" }}>
              {members.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No members yet. Invite someone!</p>
              ) : (
                members.map((m, i) => {
                  const color = generateUserColor(m.id);
                  return (
                    <Link key={m.id} href={`/workspace/${workspaceId}/profile/${m.id}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 14px 7px 8px",
                        background: "var(--bg-base)", borderRadius: 99,
                        border: "1px solid var(--border)", textDecoration: "none",
                        color: "var(--text-primary)", transition: "all 0.15s",
                        animation: `fadeUp 0.2s ease ${i * 0.04}s both`,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-base)"; }}
                    >
                      {m.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar_url} alt={m.full_name ?? ""} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: `0 2px 6px ${color}50` }}>
                          {getInitials(m.full_name ?? "?")}
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{m.full_name ?? "Unknown"}</p>
                        <p style={{ fontSize: 10, color: "var(--success)", display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} /> Online
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div style={{ background: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", gridColumn: "1 / -1" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,77,106,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={13} style={{ color: "var(--danger)" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Recent Activity</span>
              {!loadingActivity && activity.length > 0 && (
                <span style={{ marginLeft: "auto", background: "var(--accent-soft)", color: "var(--accent)", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(108,99,255,0.2)" }}>
                  {activity.length} actions
                </span>
              )}
            </div>

            {loadingActivity ? (
              <div style={{ padding: "20px" }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 11, width: "40%", marginBottom: 6 }} />
                      <div className="skeleton" style={{ height: 10, width: "65%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <EmptyState icon={<Zap size={24} />} text="No activity yet. Start a conversation!" />
            ) : (
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {activity.map((item, i) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.link}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 14,
                      padding: "12px 18px", textDecoration: "none",
                      borderBottom: "1px solid var(--border)", transition: "background 0.1s",
                      animation: `fadeUp 0.2s ease ${i * 0.03}s both`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: item.type === "message" ? "var(--accent-soft)" : "var(--accent-2-soft)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px solid ${item.type === "message" ? "rgba(108,99,255,0.2)" : "rgba(34,201,134,0.2)"}`,
                    }}>
                      {item.type === "message"
                        ? <MessageCircle size={14} style={{ color: "var(--accent)" }} />
                        : <FileText size={14} style={{ color: "var(--accent-2)" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>
                        <strong style={{ color: "var(--text-primary)" }}>{item.actor}</strong>{" "}
                        <span style={{ color: "var(--text-muted)" }}>{item.description}</span>
                      </p>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.preview}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={10} />
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateChannel && <CreateChannelModal workspaceId={workspaceId} onClose={() => setShowCreateChannel(false)} />}
      {showCreateDoc && <CreateDocModal workspaceId={workspaceId} onClose={() => setShowCreateDoc(false)} />}
      {showInvite && <InviteMemberModal workspaceId={workspaceId} onClose={() => setShowInvite(false)} />}
    </>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
      <div style={{ opacity: 0.3, marginBottom: 10, display: "flex", justifyContent: "center" }}>{icon}</div>
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  );
}
