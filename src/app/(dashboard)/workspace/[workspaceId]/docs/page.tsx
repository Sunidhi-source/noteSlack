"use client";

import { use } from "react";
import { FileText } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import Link from "next/link";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default function DocsIndexPage({ params }: Props) {
  const { workspaceId } = use(params);
  const { documents } = useWorkspaceStore();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        color: "var(--text-secondary)",
        padding: "2rem",
      }}
    >
      <FileText size={40} style={{ color: "var(--text-muted)" }} />
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.1rem",
          color: "var(--text-primary)",
        }}
      >
        {documents.length > 0 ? "Select a document" : "No documents yet"}
      </p>
      {documents.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 400 }}>
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/workspace/${workspaceId}/docs/${doc.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                background: "var(--bg-overlay)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                color: "var(--text-primary)",
                fontSize: 14,
                transition: "border-color 0.15s",
              }}
            >
              <FileText size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.title || "Untitled"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Create a document from the sidebar to get started.
        </p>
      )}
    </div>
  );
}
