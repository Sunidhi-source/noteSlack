"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Hash, FileText, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceStore } from "@/store/workspace";
import { formatRelativeTime } from "@/lib/utils";

interface Props {
  workspaceId: string;
}

export function WorkspaceHome({ workspaceId }: Props) {
  useWorkspace(workspaceId);
  const { currentWorkspace, channels, documents } = useWorkspaceStore();

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "40px 48px",
        animation: "fadeUp 0.3s ease both",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 32 }}>{currentWorkspace?.icon ?? "🏠"}</span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "2rem",
              letterSpacing: "-0.03em",
            }}
          >
            {currentWorkspace?.name ?? "Loading…"}
          </h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Your collaborative workspace — chat, write, and build together.
        </p>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        {/* Channels card */}
        <SectionCard
          title="Channels"
          icon={<Hash size={16} />}
          count={channels.length}
        >
          {channels.slice(0, 5).map((ch) => (
            <Link
              key={ch.id}
              href={`/workspace/${workspaceId}/channel/${ch.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                textDecoration: "none",
                color: "var(--text-secondary)",
                fontSize: 13,
                transition: "background 0.1s, color 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <Hash size={12} style={{ opacity: 0.5 }} />
              <span>{ch.name}</span>
              <ArrowRight
                size={12}
                style={{ marginLeft: "auto", opacity: 0.4 }}
              />
            </Link>
          ))}
          {channels.length === 0 && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                padding: "8px 10px",
              }}
            >
              No channels yet — create one in the sidebar.
            </p>
          )}
        </SectionCard>

        {/* Documents card */}
        <SectionCard
          title="Documents"
          icon={<FileText size={16} />}
          count={documents.length}
        >
          {documents.slice(0, 5).map((doc) => (
            <Link
              key={doc.id}
              href={`/workspace/${workspaceId}/doc/${doc.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                textDecoration: "none",
                color: "var(--text-secondary)",
                fontSize: 13,
                transition: "background 0.1s, color 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <FileText size={12} style={{ opacity: 0.5 }} />
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {doc.title || "Untitled"}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                {formatRelativeTime(doc.updated_at)}
              </span>
            </Link>
          ))}
          {documents.length === 0 && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                padding: "8px 10px",
              }}
            >
              No documents yet — create one in the sidebar.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        animation: "fadeUp 0.3s ease both",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <span style={{ color: "var(--accent)" }}>{icon}</span>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h2>
        <span
          style={{
            marginLeft: "auto",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            borderRadius: "99px",
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}
