"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, Check } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Notification } from "@/types";

function InviteActions({ notif }: { notif: Notification }) {
  const [loading, setLoading] = useState<"accepted" | "declined" | null>(null);
  const updateNotification = useWorkspaceStore((s) => s.updateNotification);
  const router = useRouter();

  async function respond(action: "accepted" | "declined") {
    setLoading(action);
    const res = await fetch("/api/workspace/invite/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: notif.id, action }),
    });
    const data = await res.json();
    if (res.ok) {
      updateNotification(notif.id, { status: action, read: true });
      if (action === "accepted" && notif.workspace_id) {
        router.push(`/workspace/${notif.workspace_id}`);
      }
    } else {
      alert(data.error ?? "Something went wrong");
    }
    setLoading(null);
  }

  if (notif.status === "accepted") {
    return (
      <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--success, #22c55e)" }}>
        ✓ Joined workspace
      </p>
    );
  }

  if (notif.status === "declined") {
    return (
      <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
        Declined
      </p>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => respond("accepted")}
        disabled={!!loading}
        style={{
          padding: "4px 12px",
          borderRadius: 6,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading === "accepted" ? "Joining…" : "Accept"}
      </button>
      <button
        onClick={() => respond("declined")}
        disabled={!!loading}
        style={{
          padding: "4px 12px",
          borderRadius: 6,
          border: "1px solid var(--border-accent)",
          background: "transparent",
          color: "var(--text-secondary)",
          fontSize: 12,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading === "declined" ? "Declining…" : "Decline"}
      </button>
    </div>
  );
}

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

  const handleClick = async (n: Notification) => {
    if (n.type === "workspace_invite") return;
    markNotificationRead(n.id);
    await fetch("/api/notification", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id }),
    });
    if (n.link) {
      router.push(n.link);
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
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        style={{
          position: "relative",
          background: open ? "var(--bg-overlay)" : "none",
          border: "none",
          cursor: "pointer",
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

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",           // ✅ fixed so it doesn't overflow parent
            right: 8,                    // ✅ 8px from screen edge
            top: 48,                     // ✅ just below topbar
            width: "min(360px, calc(100vw - 16px))",  // ✅ never wider than screen
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
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
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
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
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
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 16px",
                    background: n.read ? "none" : "var(--accent-soft)",
                    borderBottom: "1px solid var(--border)",
                    cursor: n.type === "workspace_invite" ? "default" : n.link ? "pointer" : "default",
                    transition: "background 0.1s",
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => {
                    if (n.link && n.type !== "workspace_invite")
                      e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.read ? "none" : "var(--accent-soft)";
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
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "3px 0 0" }}>
                      {formatRelativeTime(n.created_at)}
                    </p>

                    {/* ✅ Accept/Decline for invite notifications */}
                    {n.type === "workspace_invite" && (
                      <InviteActions notif={n} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}