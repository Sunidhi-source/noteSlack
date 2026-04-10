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

  // Close on outside click
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
    await fetch("/api/notifications", {
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
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all: true }),
    });
  };

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: open ? "var(--text-primary)" : "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          padding: "6px",
          borderRadius: "var(--radius-sm)",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "var(--text-primary)")
        }
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.color = "var(--text-muted)";
        }}
        title="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "var(--danger)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid var(--bg-surface)",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

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
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
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
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
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
                  color: "var(--text-muted)",
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                You&apos;re all caught up! 🎉
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
                  {!n.read && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-primary)",
                        lineHeight: 1.45,
                        margin: 0,
                      }}
                    >
                      {n.message}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        margin: "2px 0 0",
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
