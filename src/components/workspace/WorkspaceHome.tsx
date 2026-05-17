"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useWorkspaceStore } from "@/store/workspace";
import {
  Hash, FileText, MessageCircle, ArrowRight, Activity, Zap, Users, Plus,
  Clock, TrendingUp, Radio, Search, Bell, Star, GitBranch, Target,
  Layers, ChevronRight, Send, Sparkles, BarChart3, BookOpen, Rocket,
} from "lucide-react";
import { formatRelativeTime, generateUserColor, getInitials } from "@/lib/utils";
import { CreateChannelModal } from "@/components/sidebar/CreateChannelModal";
import { CreateDocModal } from "@/components/sidebar/CreateDocModal";
import InviteMemberModal from "@/components/sidebar/InviteMemberModal";
import { useSupabaseClient, authReady } from "@/lib/supabase/client";
import { realtimeClient } from "@/hooks/useRealtime";
import { Message } from "@/types";

import { useWorkspace } from "@/hooks/useWorkspace";

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
function getGreeting(name?: string | null) {
  const first = name?.split(" ")[0] ?? "";
  if (HOUR < 5)  return `Burning midnight oil${first ? `, ${first}` : ""}`;
  if (HOUR < 12) return `Good morning${first ? `, ${first}` : ""}`;
  if (HOUR < 17) return `Good afternoon${first ? `, ${first}` : ""}`;
  if (HOUR < 21) return `Good evening${first ? `, ${first}` : ""}`;
  return `Burning midnight oil${first ? `, ${first}` : ""}`;
}

function getGreetingEmoji() {
  if (HOUR < 5)  return "🌙";
  if (HOUR < 12) return "☀️";
  if (HOUR < 17) return "🌤️";
  if (HOUR < 21) return "🌙";
  return "🌙";
}

export function WorkspaceHome({ workspaceId }: Props) {
  useWorkspace(workspaceId); // ✅ ensures store is populated even if Sidebar hasn't loaded yet
  const { currentWorkspace, channels, documents, members } = useWorkspaceStore();
  const { user } = useUser();
  const supabase = useSupabaseClient();

  const [activity, setActivity]               = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDoc, setShowCreateDoc]         = useState(false);
  const [showInvite, setShowInvite]               = useState(false);

  // Quick message composer state
  const [quickMsg, setQuickMsg]           = useState("");
  const [quickSending, setQuickSending]   = useState(false);
  const [quickSent, setQuickSent]         = useState(false);

  // General Discussion live feed
  const [generalMessages, setGeneralMessages] = useState<Message[]>([]);
  const [generalLoading, setGeneralLoading]   = useState(true);
  const [newMsgIds, setNewMsgIds]             = useState<Set<string>>(new Set());
  const generalFeedRef = useRef<HTMLDivElement>(null);

  // Stats tracking
  const [todayMsgCount, setTodayMsgCount] = useState(0);
  // ✅ Track whether store data has arrived so stats don't flash 0
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (channels.length > 0 || members.length > 0 || documents.length > 0) {
      setDataReady(true);
    }
  }, [channels.length, members.length, documents.length]);

  const generalChannel = channels.find(
    (c) => c.name.toLowerCase() === "general" || c.name.toLowerCase() === "general-discussion"
  ) ?? channels[0];

  // Load today's message count
  useEffect(() => {
    if (!workspaceId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today.toISOString())
      .then(({ count }) => { if (count !== null) setTodayMsgCount(count); });
  }, [workspaceId, supabase]);

  useEffect(() => {
    if (!generalChannel?.id) { setGeneralLoading(false); return; }

    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("channel_id", generalChannel.id)
      .is("parent_message_id", null)
      .order("created_at", { ascending: false })
      .limit(25)
      .then(({ data }) => {
        setGeneralMessages(((data as Message[]) ?? []).reverse());
        setGeneralLoading(false);
      });

    // ✅ FIX: hoist channel ref outside the authReady gap so cleanup always
    //    has the reference. Previously ch was null when cleanup ran before
    //    authReady resolved, leaking a dead subscription that never fired —
    //    this was why messages only appeared after a manual page refresh.
    let cancelled = false;
    let ch: ReturnType<typeof realtimeClient.channel> | null = null;

    const setup = async () => {
      await authReady;
      if (cancelled) return;

      ch = realtimeClient
        .channel(`home-general:${generalChannel.id}:${Date.now()}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "messages",
          filter: `channel_id=eq.${generalChannel.id}`,
        }, async (payload) => {
          if (cancelled || !payload.new) return;
          const { data: fullMsg } = await supabase
            .from("messages")
            .select("*, users(full_name, avatar_url)")
            .eq("id", (payload.new as Message).id)
            .single();
          if (fullMsg && !cancelled) {
            setGeneralMessages((prev) => {
              if (prev.find((m) => m.id === (fullMsg as Message).id)) return prev;
              return [...prev, fullMsg as Message].slice(-25);
            });
            setNewMsgIds((prev) => new Set([...prev, (fullMsg as Message).id]));
            setTimeout(() => {
              setNewMsgIds((prev) => { const n = new Set(prev); n.delete((fullMsg as Message).id); return n; });
            }, 2500);
          }
        })
        .subscribe((status) => {
          console.log(`[realtime] home-general:${generalChannel.id} →`, status);
        });
    };

    setup();

    return () => {
      cancelled = true;
      // ✅ FIX: whether ch was set before or after this cleanup runs,
      //    we always remove it — prevents ghost subscriptions.
      if (ch) {
        realtimeClient.removeChannel(ch);
        ch = null;
      } else {
        authReady.then(() => {
          if (ch) { realtimeClient.removeChannel(ch); ch = null; }
        });
      }
    };
  }, [generalChannel?.id, supabase]);

  // Auto-scroll general feed
  useEffect(() => {
    const el = generalFeedRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [generalMessages]);

  // Activity feed
  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspace/activity?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setActivity(data); setLoadingActivity(false); })
      .catch(() => setLoadingActivity(false));
  }, [workspaceId]);

  // Quick message send
  const handleQuickSend = useCallback(async () => {
    if (!quickMsg.trim() || !user || !generalChannel?.id || quickSending) return;
    setQuickSending(true);
    const content = quickMsg.trim();
    setQuickMsg("");

    // ✅ FIX: Optimistically add own message immediately so the sender
    //    sees it right away without waiting for a realtime echo.
    //    The realtime INSERT handler deduplicates by id, so when the real
    //    row arrives we replace the temp entry seamlessly.
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      channel_id: generalChannel.id,
      user_id: user.id,
      content,
      created_at: new Date().toISOString(),
      edited_at: null,
      parent_message_id: null,
      is_pinned: false,
      users: { full_name: user.fullName ?? "You", avatar_url: null },
    };
    setGeneralMessages((prev) => [...prev, optimisticMsg].slice(-25));

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({ channel_id: generalChannel.id, user_id: user.id, content })
      .select("*, users(full_name, avatar_url)")
      .single();

    if (inserted && !error) {
      // Replace temp entry with the real persisted row
      setGeneralMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (inserted as Message) : m))
      );
    } else {
      // On error, remove the optimistic message
      setGeneralMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("Failed to send message:", error);
    }

    setQuickSending(false);
    setQuickSent(true);
    setTimeout(() => setQuickSent(false), 2000);
  }, [quickMsg, user, generalChannel?.id, quickSending, supabase]);

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

  const recentDocs = [...documents].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);

  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-base)" }}>

        {/* ── HERO ─────────────────────────────────────────── */}
        <div style={{
          padding: "48px 48px 0",
          position: "relative", overflow: "hidden",
          background: "linear-gradient(160deg, #080814 0%, #0b0a1a 50%, #07090f 100%)",
        }}>
          {/* Aurora orbs */}
          <div className="aurora-orb" style={{ width: 600, height: 600, top: -250, left: -150, background: "rgba(124,109,250,0.10)", animationDelay: "0s" }} />
          <div className="aurora-orb" style={{ width: 350, height: 350, bottom: -80, right: 40, background: "rgba(250,109,154,0.07)", animationDelay: "-4s" }} />
          <div className="aurora-orb" style={{ width: 220, height: 220, top: "30%", right: "30%", background: "rgba(52,211,153,0.05)", animationDelay: "-8s" }} />

          {/* Grid overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 85% 85% at 50% 30%, black 30%, transparent 100%)",
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Top row: workspace badge + greeting */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 22, marginBottom: 36 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 22,
                background: "linear-gradient(135deg, rgba(124,109,250,0.3), rgba(250,109,154,0.18))",
                border: "1px solid rgba(124,109,250,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, flexShrink: 0,
                boxShadow: "0 0 60px rgba(124,109,250,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}>
                {currentWorkspace.icon ?? "🚀"}
              </div>
              <div style={{ paddingTop: 6, flex: 1 }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {getGreetingEmoji()} {getGreeting(user?.firstName)}
                </p>
                <h1 style={{
                  fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 900,
                  color: "#fff", lineHeight: 1.05, letterSpacing: "-0.04em", marginBottom: 12,
                  background: "linear-gradient(135deg, #fff 0%, rgba(200,185,255,0.85) 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  {currentWorkspace.name}
                </h1>

                {/* Meta pills */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { icon: <Users size={10} />, label: dataReady ? `${members.length} members` : "…", color: "#7c6dfa", bg: "rgba(124,109,250,0.12)", border: "rgba(124,109,250,0.2)" },
                    { icon: <Hash size={10} />, label: dataReady ? `${channels.length} channels` : "…", color: "#fa6d9a", bg: "rgba(250,109,154,0.1)", border: "rgba(250,109,154,0.2)" },
                    { icon: <FileText size={10} />, label: dataReady ? `${documents.length} docs` : "…", color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.18)" },
                    { icon: <MessageCircle size={10} />, label: `${todayMsgCount} msgs today`, color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.18)" },
                  ].map(({ icon, label, color, bg, border }, i) => (
                    <span key={i} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600,
                      background: bg, padding: "5px 12px",
                      borderRadius: 99, border: `1px solid ${border}`,
                    }}>
                      <span style={{ color }}>{icon}</span>{label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ display: "flex", gap: 8, paddingTop: 8, flexShrink: 0 }}>
                <QuickActionBtn icon={<Hash size={13} />} label="New Channel" onClick={() => setShowCreateChannel(true)} />
                <QuickActionBtn icon={<FileText size={13} />} label="New Doc" onClick={() => setShowCreateDoc(true)} />
                <QuickActionBtn icon={<Users size={13} />} label="Invite" onClick={() => setShowInvite(true)} accent />
              </div>
            </div>

            {/* Stats row */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 0,
            }}>
              {[
                { label: "Total Members", value: dataReady ? members.length : "—", icon: <Users size={16} />, color: "#7c6dfa", bg: "rgba(124,109,250,0.12)", trend: "+2 this week" },
                { label: "Channels", value: dataReady ? channels.length : "—", icon: <Hash size={16} />, color: "#fa6d9a", bg: "rgba(250,109,154,0.1)", trend: "Active" },
                { label: "Documents", value: dataReady ? documents.length : "—", icon: <FileText size={16} />, color: "#34d399", bg: "rgba(52,211,153,0.08)", trend: `${recentDocs.length} recently edited` },
                { label: "Messages Today", value: todayMsgCount, icon: <MessageCircle size={16} />, color: "#fbbf24", bg: "rgba(251,191,36,0.08)", trend: "Live count" },
              ].map(({ label, value, icon, color, bg, trend }) => (
                <div key={label} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "16px 16px 0 0",
                  padding: "18px 20px 20px",
                  display: "flex", gap: 14, alignItems: "flex-start",
                  backdropFilter: "blur(8px)",
                  transition: "background 0.2s",
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11,
                    background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                    color, flexShrink: 0,
                    boxShadow: `0 0 20px ${color}25`,
                  }}>{icon}</div>
                  <div>
                    <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    <p style={{ fontSize: 10, color, marginTop: 4, fontWeight: 500, opacity: 0.8 }}>{trend}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ───────────────────────────────────── */}
        <div style={{ padding: "24px 32px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

          {/* Live Chat Feed (full width) */}
          {generalChannel && (
            <div style={{
              gridColumn: "1 / -1",
              background: "var(--bg-surface)",
              borderRadius: 18, border: "1px solid var(--border)",
              overflow: "hidden",
              boxShadow: "0 8px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,109,250,0.05)",
            }}>
              {/* Card header */}
              <div style={{
                padding: "14px 20px", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 10,
                background: "linear-gradient(90deg, rgba(124,109,250,0.07) 0%, transparent 60%)",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "rgba(124,109,250,0.15)", border: "1px solid rgba(124,109,250,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Hash size={15} style={{ color: "var(--accent)" }} />
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
                  background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
                  borderRadius: 99, padding: "4px 12px",
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--success)",
                    boxShadow: "0 0 8px var(--success)",
                    animation: "live-pulse 1.5s infinite",
                    display: "inline-block",
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", letterSpacing: "0.06em" }}>LIVE</span>
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
              <div ref={generalFeedRef} style={{ maxHeight: 280, overflowY: "auto", padding: "6px 0" }}>
                {generalLoading ? (
                  <div style={{ padding: "20px" }}>
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
                    <MessageCircle size={28} style={{ color: "var(--text-muted)", margin: "0 auto 10px", display: "block", opacity: 0.3 }} />
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No messages yet. Be the first!</p>
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
                            <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{name}</span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatRelativeTime(msg.created_at)}</span>
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

              {/* Quick message composer */}
              <div style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--border)",
                background: "rgba(255,255,255,0.01)",
              }}>
                <div style={{
                  display: "flex", gap: 10, alignItems: "center",
                  background: "var(--bg-overlay)", borderRadius: 12,
                  border: "1px solid var(--border)", padding: "8px 14px",
                  transition: "border-color 0.2s",
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8,
                    background: user ? generateUserColor(user.id) : "var(--bg-hover)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
                  }}>
                    {user ? getInitials(user.fullName ?? "?") : "?"}
                  </div>
                  <input
                    value={quickMsg}
                    onChange={(e) => setQuickMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleQuickSend(); } }}
                    placeholder={`Quick message to #${generalChannel.name}…`}
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      color: "var(--text-primary)", fontSize: 13,
                      fontFamily: "var(--font-body)",
                    }}
                  />
                  <button
                    onClick={handleQuickSend}
                    disabled={!quickMsg.trim() || quickSending}
                    style={{
                      background: quickSent ? "rgba(52,211,153,0.15)" : (quickMsg.trim() ? "linear-gradient(135deg, var(--accent), #9170ff)" : "var(--bg-hover)"),
                      border: "none", borderRadius: 9, padding: "6px 12px",
                      cursor: !quickMsg.trim() || quickSending ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 12, fontWeight: 600,
                      color: quickSent ? "var(--success)" : (quickMsg.trim() ? "#fff" : "var(--text-muted)"),
                      transition: "all 0.2s", flexShrink: 0,
                    }}
                  >
                    {quickSent ? "✓ Sent!" : quickSending ? (
                      <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    ) : <><Send size={12} /> Send</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Channels Card */}
          <DashCard
            title="Channels"
            icon={<Hash size={14} />}
            iconColor="#7c6dfa"
            iconBg="rgba(124,109,250,0.12)"
            count={channels.length}
            onAdd={() => setShowCreateChannel(true)}
            addLabel="New Channel"
          >
            {channels.length === 0 ? (
              <EmptyState icon={<Hash size={20} />} text="No channels yet." />
            ) : channels.slice(0, 8).map((ch, i) => (
              <Link key={ch.id} href={`/workspace/${workspaceId}/channel/${ch.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
                  textDecoration: "none", borderBottom: "1px solid var(--border)",
                  color: "var(--text-secondary)", transition: "all 0.12s",
                  animation: `fadeUp 0.2s ease ${i * 0.03}s both`,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.paddingLeft = "22px"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.paddingLeft = "18px"; }}
              >
                <span style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(124,109,250,0.1)", border: "1px solid rgba(124,109,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Hash size={11} style={{ color: "var(--accent)" }} />
                </span>
                <span style={{ fontSize: 13, flex: 1, fontWeight: 500, color: "var(--text-primary)" }}>{ch.name}</span>
                {ch.description && <span style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>{ch.description}</span>}
                <ChevronRight size={12} style={{ color: "var(--text-muted)", flexShrink: 0, opacity: 0.4 }} />
              </Link>
            ))}
          </DashCard>

          {/* Documents Card */}
          <DashCard
            title="Documents"
            icon={<BookOpen size={14} />}
            iconColor="#34d399"
            iconBg="rgba(52,211,153,0.1)"
            count={documents.length}
            onAdd={() => setShowCreateDoc(true)}
            addLabel="New Doc"
          >
            {recentDocs.length === 0 ? (
              <EmptyState icon={<FileText size={20} />} text="No documents yet." />
            ) : recentDocs.map((d, i) => (
              <Link key={d.id} href={`/workspace/${workspaceId}/docs/${d.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
                  textDecoration: "none", borderBottom: "1px solid var(--border)",
                  color: "var(--text-secondary)", transition: "all 0.12s",
                  animation: `fadeUp 0.2s ease ${i * 0.03}s both`,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.paddingLeft = "22px"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.paddingLeft = "18px"; }}
              >
                <span style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText size={11} style={{ color: "#34d399" }} />
                </span>
                <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500, color: "var(--text-primary)" }}>{d.title || "Untitled"}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>
                  <Clock size={10} />
                  {formatRelativeTime(d.updated_at)}
                </div>
              </Link>
            ))}
          </DashCard>

          {/* Team Members — full width */}
          <div style={{
            background: "var(--bg-surface)", borderRadius: 18, border: "1px solid var(--border)",
            overflow: "hidden", gridColumn: "1 / -1",
            boxShadow: "0 4px 40px rgba(0,0,0,0.25)",
          }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={15} style={{ color: "var(--warning)" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Team Members</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{members.length} total</span>
                <button
                  onClick={() => setShowInvite(true)}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--accent-soft)", border: "1px solid rgba(124,109,250,0.25)", borderRadius: 9, padding: "5px 14px", cursor: "pointer", color: "var(--accent)", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,109,250,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; }}
                >
                  <Plus size={12} /> Invite
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "18px 20px" }}>
              {members.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No members yet. Invite someone!</p>
              ) : members.map((m, i) => {
                const color = generateUserColor(m.id);
                return (
                  <Link key={m.id} href={`/workspace/${workspaceId}/profile/${m.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 16px 10px 10px",
                      background: "var(--bg-overlay)", borderRadius: 14,
                      border: "1px solid var(--border)", textDecoration: "none",
                      color: "var(--text-primary)", transition: "all 0.15s",
                      animation: `fadeUp 0.2s ease ${i * 0.04}s both`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${color}50`;
                      (e.currentTarget as HTMLElement).style.background = `${color}10`;
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${color}25`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-overlay)";
                      (e.currentTarget as HTMLElement).style.transform = "";
                      (e.currentTarget as HTMLElement).style.boxShadow = "";
                    }}
                  >
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt={m.full_name ?? ""} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", boxShadow: `0 2px 10px ${color}50`, border: `2px solid ${color}40` }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: `0 2px 10px ${color}50` }}>
                        {getInitials(m.full_name ?? "?")}
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: "var(--text-primary)" }}>{m.full_name ?? "Unknown"}</p>
                      <p style={{ fontSize: 10, color: "var(--success)", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", display: "inline-block", animation: "pulse-glow 2s infinite" }} /> Online
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity — full width */}
          <div style={{
            background: "var(--bg-surface)", borderRadius: 18, border: "1px solid var(--border)",
            overflow: "hidden", gridColumn: "1 / -1",
            boxShadow: "0 4px 40px rgba(0,0,0,0.25)",
          }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={15} style={{ color: "var(--danger)" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Recent Activity</span>
              {!loadingActivity && activity.length > 0 && (
                <span style={{ marginLeft: "auto", background: "var(--accent-soft)", color: "var(--accent)", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(124,109,250,0.2)" }}>
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
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
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

          {/* Feature highlights / keyboard shortcuts */}
          <div style={{
            gridColumn: "1 / -1",
            background: "linear-gradient(135deg, rgba(124,109,250,0.05), rgba(250,109,154,0.03))",
            borderRadius: 18, border: "1px solid rgba(124,109,250,0.15)",
            padding: "20px 24px",
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(124,109,250,0.12)", border: "1px solid rgba(124,109,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={16} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>AI Document Assistant</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>Open any doc and use the AI assistant to draft, summarize, and improve content instantly.</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Radio size={16} style={{ color: "#34d399" }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>Live Realtime Chat</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>Messages appear instantly across all members. Threads, reactions, and pinned messages included.</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Rocket size={16} style={{ color: "#fbbf24" }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>Quick Shortcuts</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  <kbd style={{ background: "var(--bg-overlay)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)", fontSize: 10 }}>Enter</kbd> to send ·{" "}
                  <kbd style={{ background: "var(--bg-overlay)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)", fontSize: 10 }}>Shift+Enter</kbd> new line ·{" "}
                  <kbd style={{ background: "var(--bg-overlay)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)", fontSize: 10 }}>Esc</kbd> cancel edit
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {showCreateChannel && <CreateChannelModal workspaceId={workspaceId} onClose={() => setShowCreateChannel(false)} />}
      {showCreateDoc    && <CreateDocModal workspaceId={workspaceId} onClose={() => setShowCreateDoc(false)} />}
      {showInvite       && <InviteMemberModal workspaceId={workspaceId} onClose={() => setShowInvite(false)} />}
    </>
  );
}

function QuickActionBtn({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "8px 16px", borderRadius: 11,
        background: accent ? "linear-gradient(135deg, var(--accent), #9170ff)" : "rgba(255,255,255,0.06)",
        border: accent ? "none" : "1px solid rgba(255,255,255,0.1)",
        color: accent ? "#fff" : "rgba(255,255,255,0.6)",
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: accent ? "0 4px 20px rgba(124,109,250,0.4)" : "none",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        if (!accent) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "";
        if (!accent) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
      }}
    >
      {icon}{label}
    </button>
  );
}

function DashCard({ title, icon, iconColor, iconBg, count, onAdd, addLabel, children }: {
  title: string; icon: React.ReactNode; iconColor: string; iconBg: string;
  count: number; onAdd?: () => void; addLabel?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--bg-surface)", borderRadius: 18, border: "1px solid var(--border)",
      overflow: "hidden", boxShadow: "0 4px 40px rgba(0,0,0,0.25)",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: iconBg, border: `1px solid ${iconColor}30`, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
          {icon}
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{count} total</span>
        {onAdd && (
          <button
            onClick={onAdd}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "none", border: "1px solid var(--border)", cursor: "pointer",
              color: "var(--text-muted)", borderRadius: 8, padding: "4px 10px",
              fontSize: 11, fontWeight: 600, transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "rgba(124,109,250,0.3)"; e.currentTarget.style.background = "var(--accent-soft)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "none"; }}
          >
            <Plus size={12} /> {addLabel}
          </button>
        )}
      </div>
      <div style={{ maxHeight: 280, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
      <div style={{ opacity: 0.2, marginBottom: 10, display: "flex", justifyContent: "center" }}>{icon}</div>
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  );
}