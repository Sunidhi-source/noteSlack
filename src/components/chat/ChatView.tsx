"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Send, Hash, Pencil, MessageSquare, Trash2, Pin, Smile,
  X, ChevronDown, ArrowLeft, Users,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMessages, useTypingIndicator } from "@/hooks/useRealtime";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import { Message } from "@/types";
import { getInitials, formatRelativeTime, generateUserColor } from "@/lib/utils";
import { MessageReactions } from "./MessageReactions";
import { ThreadPanel } from "./ThreadPanel";

const QUICK_EMOJIS = ["👍","❤️","😂","😮","😢","🔥","🎉","👀","✅","💯"];

interface Props {
  workspaceId: string;
  channelId: string;
}

export function ChatView({ workspaceId, channelId }: Props) {
  useWorkspace(workspaceId);
  const { user }    = useUser();
  const supabase    = useSupabaseClient();
  const { messages, loading, addMessage, replaceMessage } = useMessages(channelId);
  const { typingUsers, sendTyping } = useTypingIndicator(channelId);
  const { channels, members }  = useWorkspaceStore();
  const channel = channels.find((c) => c.id === channelId);

  const [input, setInput]           = useState("");
  const [sending, setSending]       = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinned, setShowPinned]   = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBtn, setShowScrollBtn]     = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [justSentIds, setJustSentIds] = useState<Set<string>>(new Set());

  const topLevelMessages = messages.filter((m) => !m.parent_message_id);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topLevelMessages.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  }, []);

  useEffect(() => {
    if (!channelId) return;
    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("channel_id", channelId)
      .eq("is_pinned", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setPinnedMessages(data as Message[]); });
  }, [channelId, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 130) + "px";
    sendTyping();
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Optimistic insert — show message instantly before DB confirms
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      channel_id: channelId,
      user_id: user.id,
      content,
      created_at: new Date().toISOString(),
      edited_at: null,
      parent_message_id: null,
      is_pinned: false,
      users: { full_name: user.fullName ?? "You", avatar_url: null },
    };
    addMessage(optimisticMsg);
    setJustSentIds((prev) => new Set([...prev, tempId]));

    // Persist to DB, then fetch the full message with user join to replace the temp
    const { data: inserted } = await supabase
      .from("messages")
      .insert({ channel_id: channelId, user_id: user.id, content })
      .select("id")
      .single();

    if (inserted?.id) {
      // Fetch with user join separately — more reliable than chaining after insert
      const { data: fullMsg } = await supabase
        .from("messages")
        .select("*, users(full_name, avatar_url)")
        .eq("id", inserted.id)
        .single();

      const confirmed = (fullMsg ?? { ...optimisticMsg, id: inserted.id }) as Message;
      replaceMessage(tempId, confirmed);
      setJustSentIds((prev) => {
        const n = new Set(prev);
        n.delete(tempId);
        n.add(confirmed.id);
        return n;
      });
      setTimeout(() => setJustSentIds((prev) => { const n = new Set(prev); n.delete(confirmed.id); return n; }), 1500);
    } else {
      // DB failed — remove the optimistic message so UI is consistent
      setJustSentIds((prev) => { const n = new Set(prev); n.delete(tempId); return n; });
      // Also remove from messages list
      replaceMessage(tempId, { ...optimisticMsg, id: "__remove__" });
    }

    setSending(false);
  }, [input, user, sending, supabase, channelId, addMessage, replaceMessage]);

  const handleEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    await supabase.from("messages").update({ content: editContent.trim(), edited_at: new Date().toISOString() }).eq("id", messageId);
    setEditingId(null);
    setEditContent("");
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;
    await supabase.from("messages").delete().eq("id", messageId);
  };

  const handleTogglePin = async (msg: Message) => {
    const newPinned = !msg.is_pinned;
    await supabase.from("messages").update({ is_pinned: newPinned }).eq("id", msg.id);
    if (newPinned) {
      setPinnedMessages((prev) => [{ ...msg, is_pinned: true }, ...prev]);
    } else {
      setPinnedMessages((prev) => prev.filter((p) => p.id !== msg.id));
    }
  };

  const insertEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Group by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  topLevelMessages.forEach((msg) => {
    const date = new Date(msg.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else groupedMessages.push({ date, msgs: [msg] });
  });

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

        {/* ── Header ── */}
        <div style={{
          height: "var(--header-h)", padding: "0 16px",
          display: "flex", alignItems: "center", gap: 10,
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          background: "rgba(5,5,8,0.85)", backdropFilter: "blur(20px)",
          position: "relative", zIndex: 10,
        }}>
          <Link
            href={`/workspace/${workspaceId}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)", textDecoration: "none",
              transition: "all 0.15s", flexShrink: 0,
            }}
            title="Back to workspace"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,109,250,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            <ArrowLeft size={13} />
          </Link>

          <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(135deg, rgba(124,109,250,0.2), rgba(124,109,250,0.1))",
            border: "1px solid rgba(124,109,250,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Hash size={15} style={{ color: "var(--accent)" }} />
          </div>

          <div style={{ minWidth: 0 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", display: "block" }}>
              {channel?.name ?? "Loading…"}
            </span>
            {channel?.description && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>
                {channel.description}
              </span>
            )}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setShowMembers((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: showMembers ? "var(--accent-soft)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${showMembers ? "rgba(124,109,250,0.3)" : "var(--border)"}`,
                borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                fontSize: 12, color: showMembers ? "var(--accent)" : "var(--text-muted)",
                fontWeight: 500, transition: "all 0.15s",
              }}
            >
              <Users size={12} />
              {members.length}
            </button>

            {pinnedMessages.length > 0 && (
              <button
                onClick={() => setShowPinned((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: showPinned ? "var(--accent-soft)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${showPinned ? "rgba(124,109,250,0.3)" : "var(--border)"}`,
                  borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                  fontSize: 12, color: showPinned ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: 500, transition: "all 0.15s",
                }}
              >
                <Pin size={11} />
                {pinnedMessages.length}
              </button>
            )}
          </div>
        </div>

        {/* ── Members panel ── */}
        {showMembers && (
          <div style={{
            background: "rgba(5,5,8,0.9)", backdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--border)",
            padding: "10px 16px",
            display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
            animation: "fadeUp 0.2s ease",
          }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Members</span>
            {members.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-overlay)", borderRadius: 99, padding: "4px 10px 4px 6px", border: "1px solid var(--border)" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: generateUserColor(m.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#fff", fontWeight: 700 }}>
                  {getInitials(m.full_name ?? "?")}
                </div>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{m.full_name ?? "Unknown"}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Pinned banner ── */}
        {showPinned && pinnedMessages.length > 0 && (
          <div style={{
            background: "rgba(124,109,250,0.05)", borderBottom: "1px solid rgba(124,109,250,0.15)",
            padding: "10px 20px", maxHeight: 130, overflowY: "auto",
            animation: "fadeUp 0.2s ease",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.07em", textTransform: "uppercase" }}>📌 Pinned Messages</span>
              <button onClick={() => setShowPinned(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={12} /></button>
            </div>
            {pinnedMessages.map((pm) => (
              <div key={pm.id} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                <strong style={{ color: "var(--text-primary)" }}>{pm.users?.full_name ?? "User"}:</strong>{" "}
                {pm.content.slice(0, 120)}{pm.content.length > 120 ? "…" : ""}
              </div>
            ))}
          </div>
        )}

        {/* ── Messages ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: "auto", padding: "8px 0 4px", position: "relative" }}
        >
          {loading && (
            <div style={{ padding: "40px 20px" }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "8px 20px", animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
                  <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 12, width: "28%", marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 10, width: "68%", marginBottom: 4 }} />
                    <div className="skeleton" style={{ height: 10, width: "48%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && topLevelMessages.length === 0 && (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18,
                background: "linear-gradient(135deg, rgba(124,109,250,0.2), rgba(124,109,250,0.08))",
                border: "1px solid rgba(124,109,250,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 18px",
                boxShadow: "0 0 32px rgba(124,109,250,0.15)",
              }}>
                <Hash size={26} style={{ color: "var(--accent)" }} />
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "var(--text-primary)", marginBottom: 8, letterSpacing: "-0.02em" }}>
                Welcome to #{channel?.name ?? "channel"}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>This is the very beginning. Say something!</p>
            </div>
          )}

          {groupedMessages.map(({ date, msgs }) => (
            <div key={date}>
              {/* Date divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px 8px", position: "sticky", top: 0, zIndex: 2, background: "linear-gradient(180deg, var(--bg-base) 60%, transparent)" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap", background: "var(--bg-surface)", padding: "3px 12px", borderRadius: 99, border: "1px solid var(--border)", letterSpacing: "0.04em" }}>{date}</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              {msgs.map((msg) => {
                const name   = msg.users?.full_name ?? "Unknown";
                const color  = generateUserColor(msg.user_id);
                const isOwn  = msg.user_id === user?.id;
                const isNew  = justSentIds.has(msg.id);

                return (
                  <div
                    key={msg.id}
                    style={{
                      padding: "3px 20px", display: "flex", gap: 12,
                      position: "relative", transition: "background 0.12s",
                      borderRadius: 4,
                      borderLeft: isNew ? "2px solid var(--accent)" : "2px solid transparent",
                      background: isNew ? "rgba(124,109,250,0.04)" : "transparent",
                    }}
                    className="message-row"
                    onMouseEnter={(e) => {
                      const actions = e.currentTarget.querySelector<HTMLElement>(".msg-actions");
                      if (actions) actions.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      const actions = e.currentTarget.querySelector<HTMLElement>(".msg-actions");
                      if (actions) actions.style.opacity = "0";
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: color, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 13, fontWeight: 700,
                      color: "#fff", flexShrink: 0, marginTop: 4,
                      boxShadow: `0 2px 10px ${color}50`,
                    }}>
                      {getInitials(name)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: isOwn ? "var(--accent)" : "var(--text-primary)" }}>
                          {name}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatRelativeTime(msg.created_at)}</span>
                        {msg.edited_at && <span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>(edited)</span>}
                        {msg.is_pinned && (
                          <span style={{ fontSize: 9, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(124,109,250,0.2)" }}>📌</span>
                        )}
                        {isNew && (
                          <span style={{ fontSize: 9, color: "var(--success)", background: "rgba(52,211,153,0.1)", padding: "1px 6px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.04em", animation: "pop-in 0.3s ease" }}>NEW</span>
                        )}
                      </div>

                      {editingId === msg.id ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEdit(msg.id); }
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus rows={2}
                            style={{ flex: 1, background: "var(--bg-overlay)", border: "1px solid var(--accent)", borderRadius: 9, padding: "7px 10px", fontSize: 13, color: "var(--text-primary)", outline: "none", resize: "none", fontFamily: "var(--font-body)", boxShadow: "0 0 0 3px var(--accent-soft)" }}
                          />
                          <button onClick={() => handleEdit(msg.id)} style={{ background: "linear-gradient(135deg, var(--accent), #9170ff)", border: "none", borderRadius: 9, padding: "7px 14px", fontSize: 12, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Save</button>
                          <button onClick={() => setEditingId(null)} style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 12px", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
                        </div>
                      ) : (
                        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, wordBreak: "break-word" }}>
                          {msg.content}
                        </p>
                      )}

                      {!msg.id.startsWith("temp-") && <MessageReactions messageId={msg.id} />}
                    </div>

                    {/* Hover actions */}
                    <div
                      className="msg-actions"
                      style={{
                        position: "absolute", top: 2, right: 12,
                        display: "flex", gap: 3,
                        opacity: 0, transition: "opacity 0.15s",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 10, padding: "4px",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                      }}
                    >
                      <ActionBtn title="Reply in thread" onClick={() => setThreadMessage(msg)}><MessageSquare size={12} /></ActionBtn>
                      <ActionBtn title={msg.is_pinned ? "Unpin" : "Pin"} onClick={() => handleTogglePin(msg)}><Pin size={12} /></ActionBtn>
                      {isOwn && (
                        <>
                          <ActionBtn title="Edit" onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}><Pencil size={12} /></ActionBtn>
                          <ActionBtn title="Delete" onClick={() => handleDelete(msg.id)} danger><Trash2 size={12} /></ActionBtn>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {typingUsers.length > 0 && (
            <div style={{ padding: "6px 20px 6px 70px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                {typingUsers.map((u) => u.name ?? "Someone").join(", ")} is typing…
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            style={{
              position: "absolute", bottom: 110, right: 28,
              background: "linear-gradient(135deg, var(--accent), #9170ff)",
              border: "none", borderRadius: "50%", width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 20px var(--accent-glow)",
              zIndex: 10, animation: "pop-in 0.2s ease",
            }}
          >
            <ChevronDown size={15} color="#fff" />
          </button>
        )}

        {/* ── Input area ── */}
        <div style={{ padding: "10px 16px 14px", borderTop: "1px solid var(--border)", flexShrink: 0, background: "rgba(5,5,8,0.7)", backdropFilter: "blur(16px)" }}>
          {showEmojiPicker && (
            <div style={{
              display: "flex", gap: 6, padding: "10px 12px",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 12, marginBottom: 8, flexWrap: "wrap",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              animation: "fadeUp 0.15s ease",
            }}>
              {QUICK_EMOJIS.map((em) => (
                <button key={em} onClick={() => insertEmoji(em)}
                  style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer", borderRadius: 6, padding: "3px 5px", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >{em}</button>
              ))}
            </div>
          )}

          <div
            className="input-glow"
            style={{
              display: "flex", alignItems: "flex-end", gap: 10,
              background: "var(--bg-overlay)",
              borderRadius: 14, border: "1px solid var(--border)",
              padding: "8px 12px", transition: "all 0.2s",
            }}
          >
            <button
              onClick={() => setShowEmojiPicker((v) => !v)}
              style={{
                background: showEmojiPicker ? "var(--accent-soft)" : "none",
                border: "none", cursor: "pointer",
                color: showEmojiPicker ? "var(--accent)" : "var(--text-muted)",
                padding: "5px", borderRadius: 7, display: "flex", flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              <Smile size={17} />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder={`Message #${channel?.name ?? "channel"}`}
              rows={1}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "var(--text-primary)", fontSize: 14, resize: "none",
                fontFamily: "var(--font-body)", lineHeight: 1.55,
                maxHeight: 130, overflow: "auto", padding: "2px 0",
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{
                background: input.trim()
                  ? "linear-gradient(135deg, var(--accent), #9170ff)"
                  : "var(--bg-hover)",
                border: "none", borderRadius: 10, padding: "7px 13px",
                cursor: !input.trim() || sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.7 : 1,
                display: "flex", alignItems: "center",
                transition: "all 0.2s", flexShrink: 0,
                boxShadow: input.trim() ? "0 2px 14px var(--accent-glow)" : "none",
                transform: "none",
              }}
              onMouseEnter={(e) => { if (input.trim() && !sending) e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
            >
              {sending ? (
                <div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              ) : (
                <Send size={14} color={input.trim() ? "#fff" : "var(--text-muted)"} />
              )}
            </button>
          </div>

          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5, paddingLeft: 2 }}>
            <kbd style={{ background: "var(--bg-overlay)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)", fontSize: 10, fontFamily: "var(--font-mono)" }}>Enter</kbd> to send ·{" "}
            <kbd style={{ background: "var(--bg-overlay)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)", fontSize: 10, fontFamily: "var(--font-mono)" }}>Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>

      {threadMessage && (
        <ThreadPanel parentMessage={threadMessage} onClose={() => setThreadMessage(null)} />
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: "5px", borderRadius: 6,
        color: danger ? "var(--danger)" : "var(--text-muted)",
        display: "flex", transition: "all 0.1s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLElement).style.color = danger ? "var(--danger)" : "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "none";
        (e.currentTarget as HTMLElement).style.color = danger ? "var(--danger)" : "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );
}
