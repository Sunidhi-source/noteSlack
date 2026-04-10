"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Hash,
  FileText,
  Users,
  MessageSquare,
  Plus,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { useSupabaseClient } from "@/lib/supabase/client";
import { Message } from "@/types";
import {
  formatRelativeTime,
  generateUserColor,
  getInitials,
} from "@/lib/utils";

interface Props {
  workspaceId: string;
}

export function WorkspaceHome({ workspaceId }: Props) {
  const { currentWorkspace, channels, documents, members } =
    useWorkspaceStore();
  const supabase = useSupabaseClient();
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!workspaceId || channels.length === 0) return;
    const channelIds = channels.map((c) => c.id);

    supabase
      .from("messages")
      .select("*, users(full_name, avatar_url), channels(name)")
      .in("channel_id", channelIds)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data) setRecentMessages(data as Message[]);
      });
  }, [workspaceId, channels, supabase]);

  if (!currentWorkspace) return null;

  const generalChannel = channels.find((c) => c.name === "general");

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        background: "var(--bg-base)",
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "48px 40px",
        }}
      >
        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontSize: 48,
              marginBottom: 12,
              lineHeight: 1,
            }}
          >
            {currentWorkspace.icon ?? "🏠"}
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            Welcome to {currentWorkspace.name}
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
            Your team&apos;s hub for conversations and collaboration.
          </p>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 36,
          }}
        >
          <StatCard
            icon={<Hash size={18} style={{ color: "var(--accent)" }} />}
            value={channels.length}
            label="Channels"
            color="var(--accent)"
          />
          <StatCard
            icon={<FileText size={18} style={{ color: "var(--warning)" }} />}
            value={documents.length}
            label="Documents"
            color="var(--warning)"
          />
          <StatCard
            icon={<Users size={18} style={{ color: "var(--success)" }} />}
            value={members.length}
            label="Members"
            color="var(--success)"
          />
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: 36 }}>
          <SectionLabel>Quick Actions</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
            }}
          >
            {generalChannel && (
              <QuickAction
                icon={
                  <MessageSquare size={16} style={{ color: "var(--accent)" }} />
                }
                label="Open #general"
                desc="Jump into the main conversation"
                href={`/workspace/${workspaceId}/channel/${generalChannel.id}`}
              />
            )}
            <QuickAction
              icon={<Plus size={16} style={{ color: "var(--warning)" }} />}
              label="Create a document"
              desc="Start writing collaboratively"
              href={`/workspace/${workspaceId}/docs`}
            />
          </div>
        </div>

        {/* Recent activity */}
        {recentMessages.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <SectionLabel>Recent Activity</SectionLabel>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
              }}
            >
              {recentMessages.map((msg, i) => {
                const name = msg.users?.full_name ?? "Someone";
                const color = generateUserColor(msg.user_id);
                return (
                  <Link
                    key={msg.id}
                    href={`/workspace/${workspaceId}/channel/${msg.channel_id}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 16px",
                      borderBottom:
                        i < recentMessages.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                      textDecoration: "none",
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
                        borderRadius: 7,
                        background: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {getInitials(name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color,
                          }}
                        >
                          {name}
                        </span>
                        <span
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          in{" "}
                          <span style={{ color: "var(--accent)" }}>
                            #
                            {(msg as Message & { channels?: { name: string } })
                              .channels?.name ?? "channel"}
                          </span>
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 11,
                            color: "var(--text-muted)",
                          }}
                        >
                          {formatRelativeTime(msg.created_at)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          margin: 0,
                        }}
                      >
                        {msg.content}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Members */}
        {members.length > 0 && (
          <div>
            <SectionLabel>Team Members</SectionLabel>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {members.map((m) => {
                const color = generateUserColor(m.id);
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.borderColor =
                        "var(--border-accent)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.borderColor =
                        "var(--border)")
                    }
                    onClick={() =>
                      router.push(`/workspace/${workspaceId}/dm/${m.id}`)
                    }
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {getInitials(m.full_name ?? "U")}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          lineHeight: 1.2,
                        }}
                      >
                        {m.full_name ?? "Unknown"}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--success)",
                        }}
                      >
                        ● Active
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</p>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  desc,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        textDecoration: "none",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-accent)";
        e.currentTarget.style.background = "var(--bg-overlay)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--bg-surface)";
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--bg-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {label}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
      </div>
      <ArrowRight
        size={14}
        style={{ color: "var(--text-muted)", flexShrink: 0 }}
      />
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 10,
      }}
    >
      {children}
    </p>
  );
}
