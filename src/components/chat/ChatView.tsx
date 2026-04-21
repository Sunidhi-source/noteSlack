"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Send,
  Hash,
  Pencil,
  MessageSquare,
  Trash2,
  Pin,
  Smile,
  Paperclip,
  X,
  ChevronDown,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMessages, useTypingIndicator } from "@/hooks/useRealtime";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import { Message } from "@/types";
import {
  getInitials,
  formatRelativeTime,
  generateUserColor,
} from "@/lib/utils";
import { MessageReactions } from "./MessageReactions";
import { ThreadPanel } from "./ThreadPanel";

// ── Quick emoji picker ─────────────────────────────────────────
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👀"];

interface Props {
  workspaceId: string;
  channelId: string;
}

export function ChatView({ workspaceId, channelId }: Props) {
  useWorkspace(workspaceId);
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const { messages, loading } = useMessages(channelId);
  const { typingUsers, sendTyping } = useTypingIndicator(channelId);
  const { channels } = useWorkspaceStore();
  const channel = channels.find((c) => c.id === channelId);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const topLevelMessages = messages.filter((m) => !m.parent_message_id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Scroll to bottom on new messages ─────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topLevelMessages.length]);

  // ── Show "scroll to bottom" button when scrolled up ──────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  // ── Fetch pinned messages ─────────────────────────────────────
  useEffect(() => {
    if (!channelId) return;
    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("channel_id", channelId)
      .eq("is_pinned", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPinnedMessages(data as Message[]);
      });
  }, [channelId, supabase]);

  // ── Auto-resize textarea ──────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
    sendTyping();
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await supabase
      .from("messages")
      .insert({ channel_id: channelId, user_id: user.id, content });
    setSending(false);
  }, [input, user, sending, supabase, channelId]);

  const handleEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    await supabase
      .from("messages")
      .update({
        content: editContent.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId);
    setEditingId(null);
    setEditContent("");
  };

  // ✅ NEW: Delete message
  const handleDelete = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;
    await supabase.from("messages").delete().eq("id", messageId);
  };

  // ✅ NEW: Pin/unpin message
  const handleTogglePin = async (msg: Message) => {
    const newPinned = !(msg as any).is_pinned;
    await supabase
      .from("messages")
      .update({ is_pinned: newPinned })
      .eq("id", msg.id);
    if (newPinned) {
      setPinnedMessages((prev) => [
        { ...msg, is_pinned: true } as any,
        ...prev,
      ]);
    } else {
      setPinnedMessages((prev) => prev.filter((p) => p.id !== msg.id));
    }
  };

  // ✅ NEW: Insert emoji into input
  const insertEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            height: "var(--header-h)",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
            background: "var(--bg-surface)",
          }}
        >
          <Hash size={18} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--text-primary)",
            }}
          >
            {channel?.name ?? "Loading…"}
          </span>
          {channel?.description && (
            <>
              <span style={{ color: "var(--border-accent)", fontSize: 16 }}>
                |
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {channel.description}
              </span>
            </>
          )}

          {/* ✅ NEW: Pinned messages indicator */}
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinned((v) => !v)}
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "var(--accent-soft)",
                border: "none",
                borderRadius: 6,
                padding: "3px 8px",
                cursor: "pointer",
                fontSize: 11,
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              <Pin size={11} /> {pinnedMessages.length} pinned
            </button>
          )}
        </div>

        {/* ✅ NEW: Pinned messages banner */}
        {showPinned && pinnedMessages.length > 0 && (
          <div
            style={{
              background: "var(--accent-soft)",
              borderBottom: "1px solid var(--accent)",
              padding: "8px 20px",
              maxHeight: 120,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--accent)",
                }}
              >
                📌 PINNED MESSAGES
              </span>
              <button
                onClick={() => setShowPinned(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={12} />
              </button>
            </div>
            {pinnedMessages.map((pm) => (
              <div
                key={pm.id}
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  padding: "2px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <strong>{pm.users?.full_name ?? "User"}:</strong>{" "}
                {pm.content.slice(0, 100)}
                {pm.content.length > 100 ? "…" : ""}
              </div>
            ))}
          </div>
        )}

        {/* ── Messages ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 0",
            position: "relative",
          }}
        >
          {loading && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
                padding: "40px 0",
              }}
            >
              Loading messages…
            </div>
          )}

          {topLevelMessages.map((msg) => {
            const name = msg.users?.full_name ?? "Unknown";
            const color = generateUserColor(msg.user_id);
            const isOwn = msg.user_id === user?.id;

            return (
              <div
                key={msg.id}
                style={{
                  padding: "6px 20px",
                  display: "flex",
                  gap: 10,
                  position: "relative",
                }}
                className="message-row"
                onMouseEnter={(e) => {
                  const actions =
                    e.currentTarget.querySelector<HTMLElement>(".msg-actions");
                  if (actions) actions.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  const actions =
                    e.currentTarget.querySelector<HTMLElement>(".msg-actions");
                  if (actions) actions.style.opacity = "0";
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {getInitials(name)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: 14,
                        color: "var(--text-primary)",
                      }}
                    >
                      {name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {formatRelativeTime(msg.created_at)}
                    </span>
                    {msg.edited_at && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        (edited)
                      </span>
                    )}
                    {/* ✅ NEW: Pinned badge */}
                    {(msg as any).is_pinned && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--accent)",
                          background: "var(--accent-soft)",
                          padding: "1px 5px",
                          borderRadius: 4,
                        }}
                      >
                        📌 pinned
                      </span>
                    )}
                  </div>

                  {editingId === msg.id ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-end",
                      }}
                    >
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleEdit(msg.id);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        rows={2}
                        style={{
                          flex: 1,
                          background: "var(--bg-overlay)",
                          border: "1px solid var(--accent)",
                          borderRadius: 8,
                          padding: "6px 10px",
                          fontSize: 13,
                          color: "var(--text-primary)",
                          outline: "none",
                          resize: "none",
                          fontFamily: "var(--font-body)",
                        }}
                      />
                      <button
                        onClick={() => handleEdit(msg.id)}
                        style={{
                          background: "var(--accent)",
                          border: "none",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 12,
                          color: "#fff",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          background: "var(--bg-overlay)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p
                      style={{
                        fontSize: 14,
                        color: "var(--text-secondary)",
                        lineHeight: 1.55,
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.content}
                    </p>
                  )}

                  <MessageReactions messageId={msg.id} />
                </div>

                {/* ✅ ENHANCED: Hover actions with delete + pin */}
                <div
                  className="msg-actions"
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 16,
                    display: "flex",
                    gap: 4,
                    opacity: 0,
                    transition: "opacity 0.15s",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "4px",
                  }}
                >
                  <ActionBtn
                    title="Reply in thread"
                    onClick={() => setThreadMessage(msg)}
                  >
                    <MessageSquare size={13} />
                  </ActionBtn>
                  <ActionBtn
                    title="Pin message"
                    onClick={() => handleTogglePin(msg)}
                  >
                    <Pin size={13} />
                  </ActionBtn>
                  {isOwn && (
                    <>
                      <ActionBtn
                        title="Edit"
                        onClick={() => {
                          setEditingId(msg.id);
                          setEditContent(msg.content);
                        }}
                      >
                        <Pencil size={13} />
                      </ActionBtn>
                      <ActionBtn
                        title="Delete"
                        onClick={() => handleDelete(msg.id)}
                        danger
                      >
                        <Trash2 size={13} />
                      </ActionBtn>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {typingUsers.length > 0 && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontStyle: "italic",
                padding: "4px 20px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              {typingUsers.map((u) => u.name ?? "Someone").join(", ")} is
              typing…
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ✅ NEW: Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() =>
              bottomRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            style={{
              position: "absolute",
              bottom: 100,
              right: 32,
              background: "var(--accent)",
              border: "none",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
              zIndex: 10,
            }}
          >
            <ChevronDown size={16} color="#fff" />
          </button>
        )}

        {/* ── Input ── */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {/* ✅ NEW: Emoji picker */}
          {showEmojiPicker && (
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: "8px 12px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => insertEmoji(em)}
                  style={{
                    fontSize: 20,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 4,
                    padding: "2px 4px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              background: "var(--bg-overlay)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              padding: "8px 12px",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          >
            {/* ✅ NEW: Emoji button */}
            <button
              onClick={() => setShowEmojiPicker((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: "4px",
                borderRadius: 6,
                display: "flex",
                flexShrink: 0,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              <Smile size={18} />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message #${channel?.name ?? "channel"}`}
              rows={1}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: 14,
                resize: "none",
                fontFamily: "var(--font-body)",
                lineHeight: 1.5,
                maxHeight: 120,
                overflow: "auto",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{
                background: input.trim() ? "var(--accent)" : "var(--bg-hover)",
                border: "none",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: !input.trim() || sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
            >
              <Send
                size={16}
                color={input.trim() ? "#fff" : "var(--text-muted)"}
              />
            </button>
          </div>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 4,
              paddingLeft: 2,
            }}
          >
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Thread panel */}
      {threadMessage && (
        <ThreadPanel
          parentMessage={threadMessage}
          onClose={() => setThreadMessage(null)}
        />
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        borderRadius: 4,
        color: danger ? "var(--error, #e53e3e)" : "var(--text-muted)",
        display: "flex",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.color = danger
          ? "#e53e3e"
          : "var(--text-primary)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.color = danger
          ? "var(--error, #e53e3e)"
          : "var(--text-muted)")
      }
    >
      {children}
    </button>
  );
}
