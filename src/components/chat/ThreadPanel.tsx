"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { X, Send, MessageSquare } from "lucide-react";
import { useSupabaseClient } from "@/lib/supabase/client";
import { Message } from "@/types";
import { generateUserColor, getInitials, formatRelativeTime } from "@/lib/utils";

interface Props {
  parentMessage: Message;
  onClose: () => void;
}

export function ThreadPanel({ parentMessage, onClose }: Props) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [replies, setReplies] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url)")
      .eq("parent_message_id", parentMessage.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setReplies((data as Message[]) ?? []));

    const channel = supabase
      .channel(`thread:${parentMessage.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `parent_message_id=eq.${parentMessage.id}`,
        },
        (payload) => setReplies((prev) => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [parentMessage.id, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const sendReply = useCallback(async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    await supabase.from("messages").insert({
      channel_id: parentMessage.channel_id,
      user_id: user.id,
      content,
      parent_message_id: parentMessage.id,
    });
    setSending(false);
  }, [input, user, sending, supabase, parentMessage]);

  return (
    <div
      style={{
        width: 360,
        height: "100%",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          height: "var(--header-h)",
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <MessageSquare size={16} style={{ color: "var(--accent)" }} />
        <span
          style={{
            flex: 1,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 14,
            color: "var(--text-primary)",
          }}
        >
          Thread
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
            padding: 4,
            borderRadius: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <X size={16} />
        </button>
      </div>

      {/* Parent message */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-overlay)",
        }}
      >
        <MessageItem message={parentMessage} />
      </div>

      {/* Replies */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {replies.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
              marginTop: 20,
            }}
          >
            No replies yet. Start the thread!
          </p>
        )}
        {replies.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 12 }}>
            <MessageItem message={msg} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            background: "var(--bg-overlay)",
            borderRadius: 10,
            border: "1px solid var(--border)",
            padding: "8px",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendReply();
              }
            }}
            placeholder="Reply in thread…"
            rows={1}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 13,
              resize: "none",
              fontFamily: "var(--font-body)",
              maxHeight: 100,
            }}
          />
          <button
            onClick={sendReply}
            disabled={!input.trim() || sending}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: 8,
              padding: "6px 8px",
              cursor: !input.trim() || sending ? "not-allowed" : "pointer",
              opacity: !input.trim() || sending ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <Send size={14} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const name = message.users?.full_name ?? "Unknown";
  const color = generateUserColor(message.user_id);

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {getInitials(name)}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
            }}
          >
            {name}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {formatRelativeTime(message.created_at)}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {message.content}
        </p>
      </div>
    </div>
  );
}