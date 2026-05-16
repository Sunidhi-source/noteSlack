"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useWorkspaceStore } from "@/store/workspace";
import {
  Hash, FileText, MessageCircle, ArrowRight, Activity, Zap, Users, Plus, Clock,
  Sparkles, TrendingUp, Radio,
} from "lucide-react";
import { formatRelativeTime, generateUserColor, getInitials } from "@/lib/utils";
import { CreateChannelModal } from "@/components/sidebar/CreateChannelModal";
import { CreateDocModal } from "@/components/sidebar/CreateDocModal";
import InviteMemberModal from "@/components/sidebar/InviteMemberModal";
import { useSupabaseClient } from "@/lib/supabase/client";
import { Message } from "@/types";

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
  if (HOUR < 5)  return "Burning midnight oil";
  if (HOUR < 12) return "Good morning";
  if (HOUR < 17) return "Good afternoon";
  if (HOUR < 21) return "Good evening";
  return "Burning midnight oil";
}

function getGreetingEmoji() {
  if (HOUR < 5)  return "🌙";
  if (HOUR < 12) return "☀️";
  if (HOUR < 17) return "🌤️";
  if (HOUR < 21) return "🌙";
  return "🌙";
}

export function WorkspaceHome({ workspaceId }: Props) {
  const { currentWorkspace, channels, documents, members } = useWorkspaceStore();
  const supabase = useSupabaseClient();

  const [activity, setActivity]               = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDoc, setShowCreateDoc]         = useState(false);
  const [showInvite, setShowInvite]               = useState(false);

  // ── General Discussion live feed ──────────────────────────────
  const [generalMessages, setGeneralMessages] = useState<Message[]>([]);
  const [generalLoading, setGeneralLoading]   = useState(true);
  const [newMsgIds, setNewMsgIds]             = useState<Set<string>>(new Set());
  const generalFeedRef = useRef<HTMLDivElement>(null);

  const generalChannel = channels.find(
    (c) => c.name.toLowerCase() === "general" || c.name.toLowerCase() === "general-discussion"
  ) ?? channels[0];

  useEffect(() => {
    if (!generalChannel?.id) { setGeneralLoading(false); return; }

    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("channel_id", generalChannel.id)
      .is("parent_message_id", null)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setGeneralMessages(((data as Message[]) ?? []).reverse());
        setGeneralLoading(false);
      });

    const channel = supabase
      .channel(`home-general:${generalChannel.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `channel_id=eq.${generalChannel.id}`,
      }, async (payload) => {
        if (!payload.new) return;
        const { data: fullMsg } = await supabase
          .from("messages")
          .select("*, users(full_name, avatar_url)")
          .eq("id", (payload.new as Message).id)
          .single();
        if (fullMsg) {
          setGeneralMessages((prev) => {
            const updated = [...prev, fullMsg as Message];
            return updated.slice(-20);
          });
          setNewMsgIds((prev) => new Set([...prev, (fullMsg as Message).id]));
          setTimeout(() => {
            setNewMsgIds((prev) => { const n = new Set(prev); n.delete((fullMsg as Message).id); return n; });
          }, 2000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [generalChannel?.id, supabase]);

  // Auto-scroll general feed
  useEffect(() => {
    const el = generalFeedRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [generalMessages]);

  // ── Activity feed ─────────────────────────────────────────────
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

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div style={{
          padding: "44px 48px 48px",
          position: "relative", overflow: "hidden",
          background: "linear-gradient(160deg, #09091a 0%, #0c0b18 40%, #07090f 100%)",
          borderBottom: "1px solid var(--border)",
        }}>
          {/* Aurora orbs */}
          <div className="aurora-orb" style={{ width: 480, height: 480, top: -180, left: -80, background: "rgba(124,109,250,0.12)", animationDelay: "0s" }} />
          <div className="aurora-orb" style={{ width: 320, height: 320, bottom: -100, right: 60, background: "rgba(250,109,154,0.08)", animationDelay: "-3s" }} />
          <div className="aurora-orb" style={{ width: 200, height: 200, top: "50%", right: "35%", background: "rgba(52,211,153,0.06)", animationDelay: "-6s" }} />

          {/* Grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Workspace badge + greeting */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 32 }}>
              <div style={{
                width: 68, height: 68, borderRadius: 20,
                background: "linear-gradient(135deg, rgba(124,109,250,0.25), rgba(250,109,154,0.15))",
                border: "1px solid rgba(124,109,250,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 34, flexShrink: 0,
                boxShadow: "0 0 48px rgba(124,109,250,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}>
                {currentWorkspace.icon ?? "🚀"}
              </div>
              <div style={{ paddingTop: 4 }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {getGreetingEmoji()} {getGreeting()}
                </p>
                <h1 style={{
                  fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 800,
                  color: "#fff", lineHeight: 1.05, letterSpacing: "-0.035em", marginBottom: 10,
                  background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.75) 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  {currentWorkspace.name}
                </h1>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {[
                    { icon: <Users size={11} />, label: `${members.length} members`, color: "#7c6dfa" },
                    { icon: <Hash size={11} />, label: `${channels.length} channels`, color: "#fa6d9a" },
                    { icon: <FileText size={11} />, label: `${documents.length} docs`, color: "#34d399" },
                  ].map(({ icon, label, color }) => (
                    <span key={label} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500,
                      background: "rgba(255,255,255,0.04)", padding: "4px 10px",
                      borderRadius: 99, border: "1px solid rgba(255,255,255,0.07)",
                    }}>
                      <span style={{ color }}>{icon}</span>{label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { icon: <Hash size={14} />, label: "New Channel",    onClick: () => setShowCreateChannel(true), primary: true },
                { icon: <FileText size={14} />, label: "New Doc",    onClick: () => setShowCreateDoc(true) },
                { icon: <Users size={14} />, label: "Invite Member", onClick: () => setShowInvite(true) },
              ].map(({ icon, label, onClick, primary }) => (
                <button
                  key={label} onClick={onClick}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "9px 18px", borderRadius: 12,
                    border: `1px solid ${primary ? "rgba(124,109,250,0.45)" : "rgba(255,255,255,0.1)"}`,
                    background: primary
                      ? "linear-gradient(135deg, rgba(124,109,250,0.22), rgba(124,109,250,0.12))"
                      : "rgba(255,255,255,0.05)",
                    color: primary ? "#b3aaff" : "rgba(255,255,255,0.65)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.18s",
                    backdropFilter: "blur(8px)",
                    boxShadow: primary ? "0 0 24px rgba(124,109,250,0.1)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.background = primary
                      ? "linear-gradient(135deg, rgba(124,109,250,0.32), rgba(124,109,250,0.2))"
                      : "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.background = primary
                      ? "linear-gradient(135deg, rgba(124,109,250,0.22), rgba(124,109,250,0.12))"
                      : "rgba(255,255,255,0.05)";
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stats strip ─────────────────────────────────────── */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--border)",
          background: "linear-gradient(90deg, var(--bg-surface) 0%, rgba(9,9,18,0.6) 100%)",
        }}>
          {[
            { label: "Members",  value: members.length,   icon: <Users size={13} />,       color: "#7c6dfa" },
            { label: "Channels", value: channels.length,  icon: <Hash size={13} />,         color: "#fa6d9a" },
            { label: "Docs",     value: documents.length, icon: <FileText size={13} />,     color: "#34d399" },
            { label: "Messages", value: generalMessages.length > 0 ? `${generalMessages.length}+` : "—",
                                        icon: <MessageCircle size={13} />, color: "#fbbf24" },
          ].map(({ label, value, icon, color }, i) => (
            <div key={label} style={{
              flex: 1, padding: "16px 20px",
              borderRight: i < 3 ? "1px solid var(--border)" : "none",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: `${color}15`, border: `1px solid ${color}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color, flexShrink: 0,
              }}>{icon}</div>
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text-primary)", lineHeight: 1.1 }}>{value}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginTop: 1 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main grid ───────────────────────────────────────── */}
        <div style={{ padding: "28px 32px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* General Discussion — LIVE FEED */}
          {generalChannel && (
            <div style={{
              gridColumn: "1 / -1",
              background: "var(--bg-surface)",
              borderRadius: 18, border: "1px solid var(--border)",
              overflow: "hidden",
              boxShadow: "0 4px 40px rgba(0,0,0,0.35)",
            }}>
              {/* Card header */}
              <div style={{
                padding: "14px 20px", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 10,
                background: "linear-gradient(90deg, rgba(124,109,250,0.06) 0%, transparent 100%)",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: "rgba(124,109,250,0.15)", border: "1px solid rgba(124,109,250,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Hash size={14} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    {generalChannel.name}
                  </span>
                  {generalChannel.description && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{generalChannel.description}</p>
                  )}
                </div>

                {/* Live badge */}
                <div style={{
                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)",
                  borderRadius: 99, padding: "4px 10px",
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--success)",
                    boxShadow: "0 0 8px var(--success)",
                    animation: "live-pulse 1.5s infinite",
                    display: "inline-block",
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", letterSpacing: "0.05em" }}>LIVE</span>
                </div>

                <Link
                  href={`/workspace/${workspaceId}/channel/${generalChannel.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 9,
                    background: "var(--accent-soft)", border: "1px solid rgba(124,109,250,0.25)",
                    color: "var(--accent)", fontSize: 12, fontWeight: 600,
                    textDecoration: "none", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,109,250,0.2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; }}
                >
                  Open <ArrowRight size={11} />
                </Link>
              </div>

              {/* Messages feed */}
              <div
                ref={generalFeedRef}
                style={{ maxHeight: 320, overflowY: "auto", padding: "8px 0" }}
              >
                {generalLoading ? (
                  <div style={{ padding: "20px 20px" }}>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", marginBottom: 4 }}>
                        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div className="skeleton" style={{ height: 11, width: "25%", marginBottom: 7 }} />
                          <div className="skeleton" style={{ height: 10, width: "65%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : generalMessages.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <MessageCircle size={28} style={{ color: "var(--text-muted)", margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  generalMessages.map((msg) => {
                    const name  = msg.users?.full_name ?? "Unknown";
                    const color = generateUserColor(msg.user_id);
                    const isNew = newMsgIds.has(msg.id);
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex", gap: 11, padding: "7px 20px",
                          transition: "background 0.15s",
                          background: isNew ? "rgba(124,109,250,0.06)" : "transparent",
                          borderLeft: isNew ? "2px solid var(--accent)" : "2px solid transparent",
                          animation: isNew ? "fadeUp 0.3s ease" : undefined,
                        }}
                        onMouseEnter={(e) => { if (!isNew) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isNew ? "rgba(124,109,250,0.06)" : "transparent"; }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: 9,
                          background: color, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, marginTop: 2,
                          boxShadow: `0 2px 8px ${color}50`,
                        }}>
                          {getInitials(name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                              {name}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                              {formatRelativeTime(msg.created_at)}
                            </span>
                            {isNew && (
                              <span style={{
                                fontSize: 9, color: "var(--accent)",
                                background: "var(--accent-soft)", padding: "1px 6px",
                                borderRadius: 4, fontWeight: 700, letterSpacing: "0.04em",
                                animation: "pop-in 0.3s ease",
                              }}>NEW</span>
                            )}
                          </div>
                          <p style={{
                            fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Channels */}
          <Card
            title="Channels"
            icon={<Hash size={13} />}
            iconColor="#7c6dfa"
            iconBg="rgba(124,109,250,0.12)"
            count={channels.length}
            onAdd={() => setShowCreateChannel(true)}
          >
            {channels.length === 0 ? (
              <EmptyState icon={<Hash size={20} />} text="No channels yet." />
            ) : channels.map((ch, i) => (
              <Link key={ch.id} href={`/workspace/${workspaceId}/channel/${ch.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
                  textDecoration: "none", borderBottom: "1px solid var(--border)",
                  color: "var(--text-secondary)", transition: "all 0.1s",
                  animation: `fadeUp 0.2s ease ${i * 0.03}s both`,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.paddingLeft = "22px"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.paddingLeft = "18px"; }}
              >
                <span style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(124,109,250,0.1)", border: "1px solid rgba(124,109,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Hash size={11} style={{ color: "var(--accent)" }} />
                </span>
                <span style={{ fontSize: 13, flex: 1, fontWeight: 500 }}>{ch.name}</span>
                {ch.description && <span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{ch.description}</span>}
                <ArrowRight size={11} style={{ color: "var(--text-muted)", flexShrink: 0, opacity: 0.5 }} />
              </Link>
            ))}
          </Card>

          {/* Documents */}
          <Card
            title="Documents"
            icon={<FileText size={13} />}
            iconColor="#34d399"
            iconBg="rgba(52,211,153,0.1)"
            count={documents.length}
            onAdd={() => setShowCreateDoc(true)}
          >
            {documents.length === 0 ? (
              <EmptyState icon={<FileText size={20} />} text="No documents yet." />
            ) : documents.map((d, i) => (
              <Link key={d.id} href={`/workspace/${workspaceId}/docs/${d.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
                  textDecoration: "none", borderBottom: "1px solid var(--border)",
                  color: "var(--text-secondary)", transition: "all 0.1s",
                  animation: `fadeUp 0.2s ease ${i * 0.03}s both`,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.paddingLeft = "22px"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.paddingLeft = "18px"; }}
              >
                <span style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText size={11} style={{ color: "#34d399" }} />
                </span>
                <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{d.title || "Untitled"}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>
                  <Clock size={10} />
                  {formatRelativeTime(d.updated_at)}
                </div>
              </Link>
            ))}
          </Card>

          {/* Members */}
          <div style={{
            background: "var(--bg-surface)", borderRadius: 18, border: "1px solid var(--border)",
            overflow: "hidden", gridColumn: "1 / -1",
            boxShadow: "0 4px 40px rgba(0,0,0,0.25)",
          }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={13} style={{ color: "var(--warning)" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Team Members</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{members.length} total</span>
              <button
                onClick={() => setShowInvite(true)}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--accent-soft)", border: "1px solid rgba(124,109,250,0.25)", borderRadius: 9, padding: "5px 12px", cursor: "pointer", color: "var(--accent)", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,109,250,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; }}
              >
                <Plus size={12} /> Invite
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "18px 20px" }}>
              {members.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No members yet. Invite someone!</p>
              ) : members.map((m, i) => {
                const color = generateUserColor(m.id);
                return (
                  <Link key={m.id} href={`/workspace/${workspaceId}/profile/${m.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "8px 14px 8px 9px",
                      background: "var(--bg-overlay)", borderRadius: 99,
                      border: "1px solid var(--border)", textDecoration: "none",
                      color: "var(--text-primary)", transition: "all 0.15s",
                      animation: `fadeUp 0.2s ease ${i * 0.04}s both`,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-overlay)"; (e.currentTarget as HTMLElement).style.transform = ""; }}
                  >
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt={m.full_name ?? ""} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", boxShadow: `0 2px 8px ${color}40` }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: `0 2px 8px ${color}50` }}>
                        {getInitials(m.full_name ?? "?")}
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{m.full_name ?? "Unknown"}</p>
                      <p style={{ fontSize: 10, color: "var(--success)", display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", display: "inline-block", animation: "pulse-glow 2s infinite" }} /> Online
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{
            background: "var(--bg-surface)", borderRadius: 18, border: "1px solid var(--border)",
            overflow: "hidden", gridColumn: "1 / -1",
            boxShadow: "0 4px 40px rgba(0,0,0,0.25)",
          }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={13} style={{ color: "var(--danger)" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Recent Activity</span>
              {!loadingActivity && activity.length > 0 && (
                <span style={{ marginLeft: "auto", background: "var(--accent-soft)", color: "var(--accent)", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, border: "1px solid rgba(124,109,250,0.2)" }}>
                  {activity.length} actions
                </span>
              )}
            </div>

            {loadingActivity ? (
              <div style={{ padding: "20px" }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0 }} />
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
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {activity.map((item, i) => (
                  <Link key={`${item.type}-${item.id}`} href={item.link}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 14,
                      padding: "12px 20px", textDecoration: "none",
                      borderBottom: "1px solid var(--border)", transition: "background 0.1s",
                      animation: `fadeUp 0.2s ease ${i * 0.03}s both`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: item.type === "message" ? "var(--accent-soft)" : "rgba(52,211,153,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px solid ${item.type === "message" ? "rgba(124,109,250,0.2)" : "rgba(52,211,153,0.2)"}`,
                    }}>
                      {item.type === "message"
                        ? <MessageCircle size={14} style={{ color: "var(--accent)" }} />
                        : <FileText size={14} style={{ color: "#34d399" }} />}
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
      {showCreateDoc    && <CreateDocModal workspaceId={workspaceId} onClose={() => setShowCreateDoc(false)} />}
      {showInvite       && <InviteMemberModal workspaceId={workspaceId} onClose={() => setShowInvite(false)} />}
    </>
  );
}

function Card({ title, icon, iconColor, iconBg, count, onAdd, children }: {
  title: string; icon: React.ReactNode; iconColor: string; iconBg: string;
  count: number; onAdd?: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--bg-surface)", borderRadius: 18, border: "1px solid var(--border)",
      overflow: "hidden", boxShadow: "0 4px 40px rgba(0,0,0,0.25)",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: iconBg, border: `1px solid ${iconColor}30`, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
          {icon}
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{count} total</span>
        {onAdd && (
          <button
            onClick={onAdd}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", borderRadius: 6, padding: "3px", display: "flex", transition: "color 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
          >
            <Plus size={15} />
          </button>
        )}
      </div>
      <div style={{ maxHeight: 260, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
      <div style={{ opacity: 0.25, marginBottom: 10, display: "flex", justifyContent: "center" }}>{icon}</div>
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  );
}
