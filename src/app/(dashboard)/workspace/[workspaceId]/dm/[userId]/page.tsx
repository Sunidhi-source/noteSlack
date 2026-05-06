"use client";

import { use, useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceStore } from "@/store/workspace";
import { useDmMessages } from "@/hooks/useDmMessages";
import { Send } from "lucide-react";
import {
  getInitials,
  generateUserColor,
  formatRelativeTime,
} from "@/lib/utils";
import { usePresenceStatus } from "@/hooks/usePresenceStatus";

interface Props {
  params: Promise<{ workspaceId: string; userId: string }>;
}

export default function DmPage({ params }: Props) {
  const { workspaceId, userId: otherUserId } = use(params);

  useWorkspace(workspaceId);
  const { user } = useUser();
  const { members } = useWorkspaceStore();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const otherUser = members.find((m) => m.id === otherUserId);
  const { messages, loading, sendMessage } = useDmMessages(conversationId);
  const isOnline = usePresenceStatus(otherUserId);

  useEffect(() => {
    if (!user || !otherUserId || !workspaceId) return;
    fetch("/api/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: workspaceId,
        other_user_id: otherUserId,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) setConversationId(data.id);
      });
  }, [user, otherUserId, workspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  };

  const otherName = otherUser?.full_name ?? "Teammate";
  const otherColor = generateUserColor(otherUserId ?? "");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-base)",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: "var(--header-h)",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: otherColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            position: "relative",
          }}
        >
          {getInitials(otherName)}
          {/* ✅ Real presence dot */}
          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: isOnline ? "var(--success)" : "var(--text-muted)",
              border: "2px solid var(--bg-surface)",
            }}
          />
        </div>
        <div>
          <p
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            {otherName}
          </p>
          <p
            style={{
              fontSize: 11,
              color: isOnline ? "var(--success)" : "var(--text-muted)",
            }}
          >
            {isOnline ? "● Online" : "○ Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {loading && (
          <p
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
              paddingTop: 40,
            }}
          >
            Loading…
          </p>
        )}

        {!loading && messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: otherColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {getInitials(otherName)}
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {otherName}
              </p>
              <p style={{ fontSize: 13 }}>
                This is the beginning of your DM with {otherName}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === user?.id;
          const prev = messages[i - 1];
          const grouped =
            prev?.sender_id === msg.sender_id &&
            new Date(msg.created_at).getTime() -
              new Date(prev.created_at).getTime() <
              5 * 60 * 1000;
          const name = isOwn ? (user?.fullName ?? "You") : otherName;
          const color = generateUserColor(msg.sender_id);

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                gap: 10,
                padding: "2px 8px",
                borderRadius: 8,
              }}
            >
              <div style={{ width: 32, flexShrink: 0, paddingTop: 2 }}>
                {!grouped ? (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(name)}
                  </div>
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {!grouped && (
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
                        fontSize: 13,
                        fontWeight: 600,
                        color: isOwn ? "var(--accent)" : color,
                      }}
                    >
                      {isOwn ? "You" : name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {formatRelativeTime(msg.created_at)}
                    </span>
                  </div>
                )}
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-primary)",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: 0,
                  }}
                >
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
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
            gap: 8,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "8px 10px",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: 14,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              maxHeight: 120,
              lineHeight: 1.5,
            }}
            placeholder={`Message ${otherName}`}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              padding: "6px 10px",
              background: input.trim() ? "var(--accent)" : "var(--bg-hover)",
              border: "none",
              borderRadius: 8,
              cursor: input.trim() ? "pointer" : "not-allowed",
              color: input.trim() ? "#fff" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              transition: "background 0.15s",
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
