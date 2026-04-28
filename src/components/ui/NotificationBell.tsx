"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, Check } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { notifications, markNotificationRead, markAllNotificationsRead } =
    useWorkspaceStore();

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = async (id: string, link?: string | null) => {
    markNotificationRead(id);
    await fetch("/api/notification", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (link) {
      router.push(link);
      setOpen(false);
    }
  };

  const handleMarkAll = async () => {
    markAllNotificationsRead();
    await fetch("/api/notification", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all: true }),
    });
  };

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        style={{
          position: "relative",
          background: open ? "var(--bg-overlay)" : "none",
          border: "none",
          cursor: "pointer",
          /* FIX: was --text-muted (#4a4f65) — near-invisible on dark bg.
             Now uses --text-secondary (#8a8fa8) as the resting state. */
          color: open ? "var(--text-primary)" : "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          padding: "7px",
          borderRadius: "var(--radius-sm)",
          transition: "color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
          e.currentTarget.style.background = "var(--bg-overlay)";
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.background = "none";
          }
        }}
      >
        <Bell size={17} />

        {/* FIX: badge moved outside the icon area (top:-6, right:-6)
            so it doesn't overlap, and size increased to 18px for readability */}
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 99,
              background: "var(--danger)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: "2px solid var(--bg-surface)",
              lineHeight: 1,
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 360,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            zIndex: 150,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)",
              }}
            >
              Notifications
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  title="Mark all as read"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    padding: "3px 8px",
                    borderRadius: 4,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-secondary)")
                  }
                >
                  <Check size={12} /> All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  display: "flex",
                  padding: 2,
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                You&apos;re all caught up!
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n.id, n.link)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 16px",
                    background: n.read ? "none" : "var(--accent-soft)",
                    border: "none",
                    cursor: n.link ? "pointer" : "default",
                    textAlign: "left",
                    fontFamily: "inherit",
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (n.link)
                      e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.read
                      ? "none"
                      : "var(--accent-soft)";
                  }}
                >
                  {/* Unread dot */}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: n.read ? "transparent" : "var(--accent)",
                      flexShrink: 0,
                      marginTop: 5,
                      border: n.read ? "1.5px solid var(--border-accent)" : "none",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-primary)",
                        lineHeight: 1.45,
                        margin: 0,
                        fontWeight: n.read ? 400 : 500,
                      }}
                    >
                      {n.message}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        margin: "3px 0 0",
                      }}
                    >
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
