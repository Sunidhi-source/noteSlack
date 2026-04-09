"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { SupabaseProvider } from "y-supabase";
import { useUser } from "@clerk/nextjs";
import {
  Bold, Italic, Strikethrough, List, ListOrdered,
  Heading2, Quote, Code, FileText, CheckCircle2, RotateCw, Users,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePresence } from "@/hooks/usePresence";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import { Document, PresenceUser } from "@/types";
import { getInitials, generateUserColor } from "@/lib/utils";

interface Props {
  workspaceId: string;
  docId: string;
}

export function DocumentView({ workspaceId, docId }: Props) {
  useWorkspace(workspaceId);
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const { documents, updateDocument } = useWorkspaceStore();
  const { activeUsers, updateCursor } = usePresence(docId);

  const doc = documents.find((d) => d.id === docId);
  const [title, setTitle] = useState(doc?.title ?? "Untitled");
  const [saving, setSaving] = useState(false);
  const [collab, setCollab] = useState(false);

  // Y.js doc + Supabase provider — stable refs so they live across re-renders
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SupabaseProvider | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Initialise Y.js once per docId
  useEffect(() => {
    if (!user) return;

    // Clean up previous
    providerRef.current?.destroy();
    ydocRef.current?.destroy();

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new SupabaseProvider(ydoc, supabase, {
      channel: `doc-crdt-${docId}`,
      id: docId,
      tableName: "documents",
      columnName: "content",
    });
    providerRef.current = provider;

    provider.on("synced", () => setCollab(true));

    return () => {
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
      setCollab(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, user?.id]);

  // Also fetch doc metadata if not in store
  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      return;
    }
    supabase
      .from("documents")
      .select("*")
      .eq("id", docId)
      .single()
      .then(({ data }) => {
        if (data) {
          updateDocument(docId, data as Document);
          setTitle(data.title);
        }
      });
  }, [docId, doc, supabase, updateDocument]);

  const saveTitle = useCallback(
    async (newTitle: string) => {
      setSaving(true);
      await supabase
        .from("documents")
        .update({ title: newTitle, last_edited_by: user?.id })
        .eq("id", docId);
      updateDocument(docId, { title: newTitle });
      setSaving(false);
    },
    [docId, supabase, updateDocument, user?.id]
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }), // Y.js handles history
        Placeholder.configure({ placeholder: "Start writing something great…" }),
        ...(ydocRef.current
          ? [
              Collaboration.configure({ document: ydocRef.current }),
              CollaborationCursor.configure({
                provider: providerRef.current!,
                user: {
                  name: user?.fullName ?? "Anonymous",
                  color: generateUserColor(user?.id ?? ""),
                },
              }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class: "prose prose-sm sm:prose lg:prose-lg focus:outline-none max-w-none",
        },
      },
    },
    [collab] // re-create editor once Y.js is synced
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveTitle(newTitle), 1500);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      updateCursor(e.clientX - rect.left, e.clientY - rect.top);
    },
    [updateCursor]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-base)", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ height: "var(--header-h)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 20px", gap: 6, background: "var(--bg-surface)", flexShrink: 0, flexWrap: "wrap" }}>
        {/* Doc badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, marginRight: 4 }}>
          <FileText size={12} /> Doc
        </div>

        <ToolbarDivider />

        {/* Format buttons */}
        <ToolbarBtn active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold"><Bold size={14} /></ToolbarBtn>
        <ToolbarBtn active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic"><Italic size={14} /></ToolbarBtn>
        <ToolbarBtn active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough size={14} /></ToolbarBtn>
        <ToolbarBtn active={editor?.isActive("code")} onClick={() => editor?.chain().focus().toggleCode().run()} title="Inline code"><Code size={14} /></ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading"><Heading2 size={14} /></ToolbarBtn>
        <ToolbarBtn active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet list"><List size={14} /></ToolbarBtn>
        <ToolbarBtn active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered size={14} /></ToolbarBtn>
        <ToolbarBtn active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Quote"><Quote size={14} /></ToolbarBtn>

        {/* Right side */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Collaborator avatars */}
          {activeUsers.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Users size={13} style={{ color: "var(--text-muted)" }} />
              <div style={{ display: "flex", marginLeft: 2 }}>
                {activeUsers.slice(0, 4).map((u) => (
                  <div
                    key={u.user_id}
                    title={u.name ?? "Collaborator"}
                    style={{ width: 24, height: 24, borderRadius: "50%", background: u.color ?? "var(--accent)", border: "2px solid var(--bg-surface)", marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700 }}
                  >
                    {getInitials(u.name ?? "C")}
                  </div>
                ))}
                {activeUsers.length > 4 && (
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--bg-hover)", border: "2px solid var(--bg-surface)", marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--text-secondary)" }}>
                    +{activeUsers.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
            {saving ? (
              <><RotateCw size={12} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} /> Saving…</>
            ) : (
              <><CheckCircle2 size={12} style={{ color: "var(--success)" }} /> Saved</>
            )}
          </div>

          {!collab && (
            <span style={{ fontSize: 11, background: "var(--accent-soft)", color: "var(--accent)", padding: "2px 8px", borderRadius: 99 }}>Connecting…</span>
          )}
        </div>
      </div>

      {/* Editor surface with cursor tracking */}
      <div
        style={{ flex: 1, overflowY: "auto", position: "relative" }}
        onMouseMove={handleMouseMove}
      >
        {/* Live cursor overlays from other users */}
        {activeUsers.map((u) => (
          <CursorOverlay key={u.user_id} user={u} />
        ))}

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 64px" }}>
          <input
            key={docId}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", border: "none", outline: "none", width: "100%", marginBottom: 32, color: "var(--text-primary)", background: "transparent", fontFamily: "var(--font-display)" }}
            placeholder="Document Title"
          />
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Cursor overlay ─────────────────────────────────────────────

function CursorOverlay({ user: u }: { user: PresenceUser }) {
  if (!u.cursor || (u.cursor.x === 0 && u.cursor.y === 0)) return null;
  return (
    <div style={{ position: "absolute", left: u.cursor.x, top: u.cursor.y, pointerEvents: "none", zIndex: 50, transform: "translate(-2px, -2px)" }}>
      {/* cursor pointer */}
      <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
        <path d="M0 0L0 14L4 10L7 17L9 16L6 9L11 9Z" fill={u.color ?? "#6c63ff"} />
      </svg>
      {/* name tag */}
      <div style={{ position: "absolute", left: 12, top: 0, background: u.color ?? "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
        {u.name ?? "User"}
      </div>
    </div>
  );
}

// ── Toolbar helpers ────────────────────────────────────────────

function ToolbarBtn({ children, active, onClick, title }: { children: React.ReactNode; active?: boolean; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ padding: "4px 6px", borderRadius: 6, border: "none", cursor: "pointer", background: active ? "var(--accent-soft)" : "transparent", color: active ? "var(--accent)" : "var(--text-secondary)", display: "flex", alignItems: "center", transition: "background 0.1s" }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 2px" }} />;
}