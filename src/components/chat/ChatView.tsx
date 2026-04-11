"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Send, Hash, Pencil, MessageSquare } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMessages, useTypingIndicator } from "@/hooks/useRealtime";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import { Message } from "@/types";
import { getInitials, formatRelativeTime, generateUserColor } from "@/lib/utils";
import { MessageReactions } from "./MessageReactions";
import { ThreadPanel } from "./ThreadPanel";

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

  // Only show top-level messages (no thread replies)
  const topLevelMessages = messages.filter((m) => !m.parent_message_id);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [topLevelMessages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    await supabase.from("messages").insert({
      channel_id: channelId,
      user_id: user.id,
      content,
    });
    setSending(false);
  }, [input, user, sending, supabase, channelId]);

  const handleEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    await supabase
      .from("messages")
      .update({ content: editContent.trim(), edited_at: new Date().toISOString() })
      .eq("id", messageId);
    setEditingId(null);
    setEditContent("");
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        {/* Header */}
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
              <span style={{ color: "var(--border-accent)", fontSize: 16 }}>|</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {channel.description}
              </span>
            </>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
          {loading && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "40px 0" }}>
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
                style={{ padding: "6px 20px", display: "flex", gap: 10, position: "relative" }}
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
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
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
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                        (edited)
                      </span>
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

                {/* Hover actions */}
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
                  {isOwn && (
                    <button
                      onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                      title="Edit"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 4,
                        color: "var(--text-muted)",
                        display: "flex",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => setThreadMessage(msg)}
                    title="Reply in thread"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      borderRadius: 4,
                      color: "var(--text-muted)",
                      display: "flex",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    <MessageSquare size={13} />
                  </button>
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
              {typingUsers.map((u) => u.name ?? "Someone").join(", ")} is typing…
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
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
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                else sendTyping();
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
              <Send size={16} color={input.trim() ? "#fff" : "var(--text-muted)"} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, paddingLeft: 2 }}>
            Press Enter to send, Shift+Enter for new line
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
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}