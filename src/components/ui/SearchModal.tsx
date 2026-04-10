"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Hash,
  FileText,
  MessageSquare,
  X,
  Loader2,
} from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { formatRelativeTime } from "@/lib/utils";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export function SearchModal({ workspaceId, onClose }: Props) {
  const [query, setQuery] = useState("");
  const { results, loading, search, total } = useSearch(workspaceId);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    search(query);
  }, [query, search]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 200,
        paddingTop: "10vh",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-accent)",
          borderRadius: "var(--radius-lg)",
          width: "min(600px, 90vw)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {loading ? (
            <Loader2
              size={18}
              style={{
                color: "var(--accent)",
                animation: "spin 1s linear infinite",
                flexShrink: 0,
              }}
            />
          ) : (
            <Search
              size={18}
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
            />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, docs, channels…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              color: "var(--text-primary)",
              fontFamily: "inherit",
            }}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              padding: 2,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {!query.trim() && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                textAlign: "center",
                padding: "32px 20px",
              }}
            >
              Start typing to search across your workspace
            </p>
          )}

          {query.trim() && !loading && total === 0 && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                textAlign: "center",
                padding: "32px 20px",
              }}
            >
              No results for &quot;{query}&quot;
            </p>
          )}

          {results.channels.length > 0 && (
            <ResultSection label="Channels">
              {results.channels.map((ch) => (
                <ResultRow
                  key={ch.id}
                  icon={<Hash size={14} style={{ color: "var(--accent)" }} />}
                  title={`#${ch.name}`}
                  subtitle={ch.description ?? ""}
                  onClick={() =>
                    navigate(`/workspace/${workspaceId}/channel/${ch.id}`)
                  }
                />
              ))}
            </ResultSection>
          )}

          {results.documents.length > 0 && (
            <ResultSection label="Documents">
              {results.documents.map((doc) => (
                <ResultRow
                  key={doc.id}
                  icon={
                    <FileText size={14} style={{ color: "var(--warning)" }} />
                  }
                  title={doc.title || "Untitled"}
                  subtitle={`Updated ${formatRelativeTime(doc.updated_at)}`}
                  onClick={() =>
                    navigate(`/workspace/${workspaceId}/docs/${doc.id}`)
                  }
                />
              ))}
            </ResultSection>
          )}

          {results.messages.length > 0 && (
            <ResultSection label="Messages">
              {results.messages.map((msg) => (
                <ResultRow
                  key={msg.id}
                  icon={
                    <MessageSquare
                      size={14}
                      style={{ color: "var(--success)" }}
                    />
                  }
                  title={msg.content.slice(0, 80)}
                  subtitle={`in #${msg.channels?.name ?? "channel"} · ${formatRelativeTime(msg.created_at)}`}
                  onClick={() =>
                    navigate(
                      `/workspace/${workspaceId}/channel/${msg.channel_id}`,
                    )
                  }
                />
              ))}
            </ResultSection>
          )}
        </div>

        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 12,
          }}
        >
          <Kbd>↵</Kbd>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            to navigate
          </span>
          <Kbd>Esc</Kbd>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            to close
          </span>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ResultSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          padding: "10px 16px 4px",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--bg-hover)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        fontSize: 11,
        background: "var(--bg-hover)",
        border: "1px solid var(--border-accent)",
        borderRadius: 4,
        padding: "1px 5px",
        color: "var(--text-secondary)",
      }}
    >
      {children}
    </kbd>
  );
}
