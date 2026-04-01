"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Send, Hash } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMessages, useTypingIndicator } from "@/hooks/useRealtime";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import { Message, TypingUser } from "@/types";
import {
  getInitials,
  formatRelativeTime,
  generateUserColor,
} from "@/lib/utils";

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

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
    sendTyping();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      <div className="h-14 px-5 flex items-center gap-2 border-b shrink-0 bg-white/80 backdrop-blur-sm z-10">
        <Hash size={18} className="text-blue-500" />
        <span className="font-bold text-slate-900 dark:text-white">
          {channel?.name ?? "Loading…"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
        {loading && (
          <div className="text-center text-sm text-slate-500 py-10">
            Fetching conversation...
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.user_id === user?.id}
          />
        ))}

        {typingUsers.length > 0 && (
          <div className="text-[11px] text-slate-500 italic animate-pulse px-12">
            {typingUsers.map((u) => u.name ?? "Someone").join(", ")} is
            typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t shrink-0">
        <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 shadow-sm focus-within:border-blue-400 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none resize-none p-2 text-sm max-h-32"
            placeholder={`Message #${channel?.name ?? "channel"}`}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2 bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  const name = message.users?.full_name ?? "Unknown";
  const color = generateUserColor(message.user_id);

  return (
    <div className="flex gap-3 group">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
        style={{ backgroundColor: color }}
      >
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className="text-sm font-bold text-slate-900"
            style={{ color: isOwn ? "#2563eb" : color }}
          >
            {isOwn ? "You" : name}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {formatRelativeTime(message.created_at)}
          </span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}
