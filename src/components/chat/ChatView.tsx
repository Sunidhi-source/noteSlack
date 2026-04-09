"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useUser } from "@clerk/nextjs";
import { Send, Hash, MoreHorizontal, Pencil, Trash2, MessageSquare, X, SmilePlus } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMessages, useTypingIndicator, useThreadMessages } from "@/hooks/useRealtime";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import { useReactions } from "@/hooks/useReactions";
import { Message } from "@/types";
import { getInitials, formatRelativeTime, generateUserColor } from "@/lib/utils";

const EMOJI_QUICK = ["👍", "❤️", "😂", "🎉", "🔥", "👀"];

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
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    clearTimeout(typingTimer.current);
    sendTyping();
    typingTimer.current = setTimeout(() => {}, 3000);
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    await supabase
      .from("messages")
      .update({ content: editContent.trim(), edited_at: new Date().toISOString() })
      .eq("id", editingId);
    setEditingId(null);
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await supabase.from("messages").delete().eq("id", id);
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Main chat pane */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-base)" }}>
        {/* Header */}
        <div style={{ height: "var(--header-h)", padding: "0 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", flexShrink: 0 }}>
          <Hash size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
            {channel?.name ?? "…"}
          </span>
          {channel?.description && (
            <span style={{ fontSize: 13, color: "var(--text-muted)", borderLeft: "1px solid var(--border)", paddingLeft: 12, marginLeft: 4 }}>
              {channel.description}
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
          {loading && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "40px 0" }}>
              Loading messages…
            </div>
          )}

          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const grouped = prev?.user_id === msg.user_id &&
              new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;

            return (
              <MessageRow
                key={msg.id}
                message={msg}
                isOwn={msg.user_id === user?.id}
                grouped={grouped}
                isEditing={editingId === msg.id}
                editContent={editContent}
                onEditChange={setEditContent}
                onEditSave={saveEdit}
                onEditCancel={() => setEditingId(null)}
                onEdit={() => startEdit(msg)}
                onDelete={() => deleteMessage(msg.id)}
                onThread={() => setThreadParent(msg)}
              />
            );
          })}

          {typingUsers.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", padding: "4px 44px" }}>
              {typingUsers.map((u) => u.name ?? "Someone").join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "8px 10px", transition: "border-color 0.15s" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 14, color: "var(--text-primary)", fontFamily: "inherit", maxHeight: 120, lineHeight: 1.5 }}
              placeholder={`Message #${channel?.name ?? "channel"}`}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{ padding: "6px 10px", background: input.trim() ? "var(--accent)" : "var(--bg-hover)", border: "none", borderRadius: 8, cursor: input.trim() ? "pointer" : "not-allowed", color: input.trim() ? "#fff" : "var(--text-muted)", display: "flex", alignItems: "center", transition: "background 0.15s" }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Thread panel */}
      {threadParent && (
        <ThreadPanel
          parent={threadParent}
          currentUserId={user?.id ?? ""}
          onClose={() => setThreadParent(null)}
        />
      )}
    </div>
  );
}

// ── MessageRow ─────────────────────────────────────────────────

function MessageRow({
  message, isOwn, grouped, isEditing, editContent,
  onEditChange, onEditSave, onEditCancel, onEdit, onDelete, onThread,
}: {
  message: Message;
  isOwn: boolean;
  grouped: boolean;
  isEditing: boolean;
  editContent: string;
  onEditChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onThread: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { reactions, toggleReaction } = useReactions(message.id);
  const name = message.users?.full_name ?? "Unknown";
  const color = generateUserColor(message.user_id);

  return (
    <div
      style={{ display: "flex", gap: 10, padding: "2px 8px", borderRadius: 8, position: "relative", background: showActions ? "var(--bg-hover)" : "transparent" }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
    >
      {/* Avatar / spacer */}
      <div style={{ width: 32, flexShrink: 0, paddingTop: 2 }}>
        {!grouped ? (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
            {getInitials(name)}
          </div>
        ) : null}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {!grouped && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: isOwn ? "var(--accent)" : color }}>{isOwn ? "You" : name}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatRelativeTime(message.created_at)}</span>
          </div>
        )}

        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => onEditChange(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEditSave(); }
                if (e.key === "Escape") onEditCancel();
              }}
              style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--accent)", borderRadius: 6, padding: "6px 8px", fontSize: 14, color: "var(--text-primary)", fontFamily: "inherit", resize: "none", outline: "none" }}
              rows={2}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={onEditSave} style={{ fontSize: 12, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}>Save</button>
              <button onClick={onEditCancel} style={{ fontSize: 12, background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
            {message.content}
            {message.edited_at && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>(edited)</span>}
          </p>
        )}

        {/* Reactions */}
        {Object.keys(reactions).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {Object.values(reactions).map((r) => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(r.emoji)}
                style={{ fontSize: 12, padding: "2px 7px", borderRadius: 99, border: `1px solid ${r.reacted ? "var(--accent)" : "var(--border)"}`, background: r.reacted ? "var(--accent-soft)" : "transparent", cursor: "pointer", color: "var(--text-primary)", fontFamily: "inherit" }}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action toolbar */}
      {showActions && !isEditing && (
        <div style={{ position: "absolute", right: 8, top: -18, display: "flex", gap: 2, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "2px 4px", zIndex: 10 }}>
          {/* Quick emoji */}
          <div style={{ position: "relative" }}>
            <ActionBtn icon={<SmilePlus size={13} />} title="React" onClick={() => setShowEmojiPicker((v) => !v)} />
            {showEmojiPicker && (
              <div style={{ position: "absolute", right: 0, top: 28, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 6, display: "flex", gap: 4, zIndex: 20 }}>
                {EMOJI_QUICK.map((e) => (
                  <button key={e} onClick={() => { toggleReaction(e); setShowEmojiPicker(false); }}
                    style={{ fontSize: 16, background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}>{e}</button>
                ))}
              </div>
            )}
          </div>
          <ActionBtn icon={<MessageSquare size={13} />} title="Reply in thread" onClick={onThread} />
          {isOwn && <ActionBtn icon={<Pencil size={13} />} title="Edit" onClick={onEdit} />}
          {isOwn && <ActionBtn icon={<Trash2 size={13} />} title="Delete" onClick={onDelete} danger />}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, title, onClick, danger }: { icon: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 5px", borderRadius: 5, color: danger ? "var(--danger)" : "var(--text-secondary)", display: "flex", alignItems: "center" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      {icon}
    </button>
  );
}

// ── ThreadPanel ────────────────────────────────────────────────

function ThreadPanel({ parent, currentUserId, onClose }: { parent: Message; currentUserId: string; onClose: () => void }) {
  const supabase = useSupabaseClient();
  const { replies, loading } = useThreadMessages(parent.id);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const sendReply = async () => {
    if (!input.trim() || !currentUserId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    await supabase.from("messages").insert({
      channel_id: parent.channel_id,
      user_id: currentUserId,
      content,
      parent_message_id: parent.id,
    });
    setSending(false);
  };

  const color = generateUserColor(parent.user_id);
  const name = parent.users?.full_name ?? "Unknown";

  return (
    <div style={{ width: 340, borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--bg-surface)", flexShrink: 0 }}>
      <div style={{ height: "var(--header-h)", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Thread</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}><X size={16} /></button>
      </div>

      {/* Parent message preview */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", opacity: 0.8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
            {getInitials(name)}
          </div>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color }}>{name}</span>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "2px 0 0", lineHeight: 1.4 }}>{parent.content}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading…</p>}
        {replies.map((r) => {
          const rName = r.users?.full_name ?? "Unknown";
          const rColor = generateUserColor(r.user_id);
          return (
            <div key={r.id} style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: rColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                {getInitials(rName)}
              </div>
              <div>
                <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: r.user_id === currentUserId ? "var(--accent)" : rColor }}>{r.user_id === currentUserId ? "You" : rName}</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatRelativeTime(r.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-primary)", margin: "1px 0 0", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{r.content}</p>
              </div>
            </div>
          );
        })}
        {replies.length === 0 && !loading && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", paddingTop: 12 }}>No replies yet</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 6, background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 13, color: "var(--text-primary)", fontFamily: "inherit" }}
            placeholder="Reply…"
            rows={1}
          />
          <button onClick={sendReply} disabled={!input.trim() || sending}
            style={{ background: input.trim() ? "var(--accent)" : "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: input.trim() ? "#fff" : "var(--text-muted)", padding: "4px 7px", display: "flex" }}>
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}