"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspaceStore } from "@/store/workspace";
import {
  Hash,
  FileText,
  MessageCircle,
  ArrowRight,
  Activity,
  Zap,
  Users,
  Plus,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { CreateChannelModal } from "@/components/sidebar/CreateChannelModal";
import { CreateDocModal } from "@/components/sidebar/CreateDocModal";
import InviteMemberModal from "@/components/sidebar/InviteMemberModal";

interface Props {
  workspaceId: string;
}

interface ActivityItem {
  type: "message" | "document";
  id: string;
  actor: string;
  description: string;
  preview: string;
  link: string;
  timestamp: string;
}

export function WorkspaceHome({ workspaceId }: Props) {
  const { currentWorkspace, channels, documents, members } =
    useWorkspaceStore();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspace/activity?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setActivity(data);
        setLoadingActivity(false);
      })
      .catch(() => setLoadingActivity(false));
  }, [workspaceId]);

  // ── Loading skeleton while workspace data fetches ──────────────
  if (!currentWorkspace) {
    return (
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-base)" }}>
        <div
          style={{
            background:
              "linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)",
            padding: "40px 48px 32px",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8, opacity: 0.3 }}>🚀</div>
          <div
            style={{
              height: 32,
              width: 220,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 8,
              marginBottom: 12,
            }}
          />
          <div
            style={{
              height: 16,
              width: 160,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 6,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-base)" }}>
        {/* ── Hero banner ── */}
        <div
          style={{
            background:
              "linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)",
            padding: "40px 48px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative circles */}
          <div
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 80,
              bottom: -60,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {currentWorkspace.icon ?? "🚀"}
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 6,
                fontFamily: "var(--font-display)",
              }}
            >
              Welcome to {currentWorkspace.name}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.7)",
                marginBottom: 20,
              }}
            >
              {members.length} member{members.length !== 1 ? "s" : ""} ·{" "}
              {channels.length} channel{channels.length !== 1 ? "s" : ""} ·{" "}
              {documents.length} doc{documents.length !== 1 ? "s" : ""}
            </p>

            {/* ── Quick action buttons ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => setShowCreateChannel(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Plus size={13} /> New Channel
              </button>
              <button
                onClick={() => setShowCreateDoc(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Plus size={13} /> New Doc
              </button>
              <button
                onClick={() => setShowInvite(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Users size={13} /> Invite Member
              </button>
            </div>
          </div>
        </div>

        {/* ── Grid of cards ── */}
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "32px 24px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          {/* ── Channels card ── */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Hash size={15} style={{ color: "var(--accent)" }} />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
              >
                Channels
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                {channels.length} total
              </span>
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {channels.length === 0 ? (
                <p
                  style={{
                    padding: "20px 18px",
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  No channels yet. Create one!
                </p>
              ) : (
                channels.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/workspace/${workspaceId}/channel/${ch.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 18px",
                      textDecoration: "none",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <Hash
                      size={13}
                      style={{ color: "var(--text-muted)", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, flex: 1 }}>{ch.name}</span>
                    {ch.description && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 100,
                        }}
                      >
                        {ch.description}
                      </span>
                    )}
                    <ArrowRight
                      size={12}
                      style={{ color: "var(--text-muted)", flexShrink: 0 }}
                    />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* ── Documents card ── */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FileText size={15} style={{ color: "var(--accent)" }} />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
              >
                Documents
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                {documents.length} total
              </span>
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {documents.length === 0 ? (
                <p
                  style={{
                    padding: "20px 18px",
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  No documents yet. Create one!
                </p>
              ) : (
                documents.map((d) => (
                  <Link
                    key={d.id}
                    href={`/workspace/${workspaceId}/docs/${d.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 18px",
                      textDecoration: "none",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <FileText
                      size={13}
                      style={{ color: "var(--text-muted)", flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.title || "Untitled"}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {formatRelativeTime(d.updated_at)}
                    </span>
                    <ArrowRight
                      size={12}
                      style={{ color: "var(--text-muted)", flexShrink: 0 }}
                    />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* ── Members card ── */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              overflow: "hidden",
              gridColumn: "1 / -1",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Users size={15} style={{ color: "var(--accent)" }} />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
              >
                Members
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                {members.length} total
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                padding: "16px 18px",
              }}
            >
              {members.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  No members yet. Invite someone!
                </p>
              ) : (
                members.map((m) => (
                  <Link
                    key={m.id}
                    href={`/workspace/${workspaceId}/profile/${m.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px 6px 6px",
                      background: "var(--bg-base)",
                      borderRadius: 99,
                      border: "1px solid var(--border)",
                      textDecoration: "none",
                      color: "var(--text-primary)",
                      transition: "border-color 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border)")
                    }
                  >
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatar_url}
                        alt={m.full_name ?? ""}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: "var(--accent-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--accent)",
                          flexShrink: 0,
                        }}
                      >
                        {(m.full_name ?? "?")[0].toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {m.full_name ?? "Unknown"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* ── Activity Feed ── */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              overflow: "hidden",
              gridColumn: "1 / -1",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Activity size={15} style={{ color: "var(--accent)" }} />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
              >
                Recent Activity
              </span>
            </div>

            {loadingActivity ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Loading activity…
              </div>
            ) : activity.length === 0 ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <Zap size={24} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                <p style={{ fontSize: 13 }}>
                  No activity yet. Start a conversation!
                </p>
              </div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {activity.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.link}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "10px 18px",
                      textDecoration: "none",
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        flexShrink: 0,
                        background:
                          item.type === "message"
                            ? "var(--accent-soft)"
                            : "rgba(16,185,129,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.type === "message" ? (
                        <MessageCircle
                          size={13}
                          style={{ color: "var(--accent)" }}
                        />
                      ) : (
                        <FileText size={13} style={{ color: "#10b981" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text-primary)",
                          marginBottom: 2,
                        }}
                      >
                        <strong>{item.actor}</strong>{" "}
                        <span style={{ color: "var(--text-muted)" }}>
                          {item.description}
                        </span>
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.preview}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showCreateChannel && (
        <CreateChannelModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateChannel(false)}
        />
      )}
      {showCreateDoc && (
        <CreateDocModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateDoc(false)}
        />
      )}
      {showInvite && (
        <InviteMemberModal
          workspaceId={workspaceId}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
}
