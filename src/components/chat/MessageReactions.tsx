"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase/client";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "👀", "✅", "💡"];

interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface Props {
  messageId: string;
}

export function MessageReactions({ messageId }: Props) {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!messageId) return;

    const fetchReactions = async () => {
      const { data } = await supabase
        .from("reactions")
        .select("emoji, user_id")
        .eq("message_id", messageId);

      if (!data) return;

      const map = new Map<string, { count: number; reacted: boolean }>();
      for (const r of data) {
        const existing = map.get(r.emoji) ?? { count: 0, reacted: false };
        map.set(r.emoji, {
          count: existing.count + 1,
          reacted: existing.reacted || r.user_id === user?.id,
        });
      }

      setReactions(
        [...map.entries()].map(([emoji, v]) => ({ emoji, ...v }))
      );
    };

    fetchReactions();

    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
          filter: `message_id=eq.${messageId}`,
        },
        () => fetchReactions()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messageId, supabase, user?.id]);

  const toggle = async (emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.emoji === emoji);

    if (existing?.reacted) {
      await supabase
        .from("reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    } else {
      await supabase.from("reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }
    setShowPicker(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => toggle(r.emoji)}
          style={{
            background: r.reacted ? "var(--accent-soft)" : "var(--bg-overlay)",
            border: `1px solid ${r.reacted ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 99,
            padding: "2px 8px",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: r.reacted ? "var(--accent)" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}
        >
          <span>{r.emoji}</span>
          <span style={{ fontWeight: 500 }}>{r.count}</span>
        </button>
      ))}

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowPicker((v) => !v)}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 99,
            padding: "2px 8px",
            fontSize: 12,
            cursor: "pointer",
            color: "var(--text-muted)",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-accent)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          + 😊
        </button>

        {showPicker && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: 0,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-accent)",
              borderRadius: 12,
              padding: "8px",
              display: "flex",
              gap: 4,
              zIndex: 100,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => toggle(e)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  borderRadius: 6,
                  padding: "4px",
                  transition: "background 0.1s, transform 0.1s",
                }}
                onMouseEnter={(ev) => {
                  ev.currentTarget.style.background = "var(--bg-hover)";
                  ev.currentTarget.style.transform = "scale(1.2)";
                }}
                onMouseLeave={(ev) => {
                  ev.currentTarget.style.background = "none";
                  ev.currentTarget.style.transform = "scale(1)";
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}