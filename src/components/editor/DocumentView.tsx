"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { useRouter } from "next/navigation";

import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";

import * as Y from "yjs";
import SupabaseProvider from "y-supabase";

import { useUser, useAuth } from "@clerk/nextjs";
import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  RotateCw,
  Save,
} from "lucide-react";

import { useWorkspace } from "@/hooks/useWorkspace";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";

import { Document } from "@/types";

interface Props {
  workspaceId: string;
  docId: string;
}

function CollaborativeEditor({ ydoc }: { ydoc: Y.Doc }) {
  const editor = useEditor(
    {
      immediatelyRender: false,

      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),

        Placeholder.configure({
          placeholder: "Start writing something great...",
        }),

        Collaboration.configure({
          document: ydoc,
        }),
      ],

      editorProps: {
        attributes: {
          class:
            "prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none",
        },
      },
    },
    [ydoc],
  );

  return <EditorContent editor={editor} />;
}

export function DocumentView({ workspaceId, docId }: Props) {
  useWorkspace(workspaceId);

  const router = useRouter();

  const supabase = useSupabaseClient();

  const { user } = useUser();
  const { getToken } = useAuth();

  const { documents, updateDocument } = useWorkspaceStore();

  const doc = documents.find((d) => d.id === docId);

  const [title, setTitle] = useState(doc?.title ?? "");

  const [hasUnsavedTitle, setHasUnsavedTitle] = useState(false);

  const [collabReady, setCollabReady] = useState(false);

  const [collab, setCollab] = useState(false);

  const [saving, setSaving] = useState(false);

  const ydocRef = useRef<Y.Doc | null>(null);

  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);

  const providerRef = useRef<SupabaseProvider | null>(null);
  const titleChannelRef = useRef<RealtimeChannel | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─────────────────────────────────────────────
  // Load document
  // ─────────────────────────────────────────────

  useEffect(() => {
    queueMicrotask(() => setHasUnsavedTitle(false));
  }, [docId]);

  useEffect(() => {
    if (doc) {
      if (!hasUnsavedTitle) {
        queueMicrotask(() => {
          setTitle(doc.title ?? "");
        });
      }

      return;
    }

    supabase
      .from("documents")
      .select("*")
      .eq("id", docId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }

        if (data) {
          updateDocument(docId, data as Document);

          setTitle(data.title ?? "");
        }
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, doc?.id]);

  useEffect(() => {
    if (!user?.id || !supabase) return;

    const channel = supabase
      .channel(`doc-title-${docId}`)
      .on("broadcast", { event: "title" }, ({ payload }) => {
        const nextTitle = payload?.title;

        if (payload?.userId === user.id || typeof nextTitle !== "string") {
          return;
        }

        setTitle(nextTitle);
        setHasUnsavedTitle(false);
        updateDocument(docId, { title: nextTitle });
      })
      .subscribe();

    titleChannelRef.current = channel;

    return () => {
      titleChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [docId, supabase, updateDocument, user?.id]);

  // ─────────────────────────────────────────────
  // Setup Collaboration
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!user || !supabase) return;

    providerRef.current?.destroy();
    ydocRef.current?.destroy();

    providerRef.current = null;
    ydocRef.current = null;

    queueMicrotask(() => {
      setYdoc(null);
      setCollabReady(false);
      setCollab(false);
    });

    const ydoc = new Y.Doc();

    ydocRef.current = ydoc;

    let mounted = true;

    (async () => {
      try {
        // ✅ FIX: Always fetch and apply the token before creating
        // SupabaseProvider. This ensures Realtime auth is set correctly
        // before any channel subscription is made, preventing 422 errors.
        const token = await getToken({
          template: "supabase",
        }).catch(() => null);

        if (!mounted) return;

        if (token) {
          supabase.realtime.setAuth(token);
        }

        const provider = new SupabaseProvider(ydoc, supabase, {
          channel: `doc-${docId}`,
          id: docId,
          tableName: "documents",
          columnName: "content",
          resyncInterval: false,
        });

        if (!mounted) return;

        providerRef.current = provider;
        setYdoc(ydoc);

        provider?.on?.("connect", () => {
          setCollab(true);
        });

        provider?.on?.("status", (status: Array<{ status?: string }>) => {
          setCollab(status.some((item) => item.status === "connected"));
        });

        provider?.on?.("disconnect", () => {
          setCollab(false);
        });

        provider?.on?.("error", (error: unknown) => {
          console.error("Collaboration provider error:", error);
          setCollab(false);
        });

        provider?.on?.("synced", () => {
          setCollab(true);
        });

        setCollabReady(true);
      } catch (err) {
        console.error("Collaboration setup failed:", err);
      }
    })();

    return () => {
      mounted = false;

      providerRef.current?.destroy();
      ydocRef.current?.destroy();

      providerRef.current = null;
      ydocRef.current = null;
      setYdoc(null);

      setCollabReady(false);
      setCollab(false);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, user?.id]);

  // ─────────────────────────────────────────────
  // Save Title
  // ─────────────────────────────────────────────

  const saveTitle = useCallback(
    async (newTitle: string) => {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: docId,
          title: newTitle,
        }),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "Failed to save title");
      }

      const savedDoc = (await res.json()) as Document;

      if (savedDoc) {
        updateDocument(docId, {
          title: savedDoc.title,
          updated_at: savedDoc.updated_at,
          last_edited_by: savedDoc.last_edited_by,
        });
      }
    },
    [docId, updateDocument],
  );

  const handleSaveDocument = useCallback(async () => {
    // Clear any pending auto-save timer since we're saving now
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    setSaving(true);

    try {
      await Promise.all([saveTitle(title), providerRef.current?.save()]);
      setHasUnsavedTitle(false);
    } catch (error) {
      console.error("Document save failed:", error);
    } finally {
      setSaving(false);
    }
  }, [saveTitle, title]);

  const handleBack = useCallback(() => {
    router.push(`/workspace/${workspaceId}`);
  }, [router, workspaceId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();

        handleSaveDocument();
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [handleSaveDocument]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedTitle(true);

    titleChannelRef.current?.send({
      type: "broadcast",
      event: "title",
      payload: {
        title: newTitle,
        userId: user?.id,
      },
    });

    // ✅ FIX: Restart the debounce timer on every keystroke so the title
    // is auto-saved 1.5s after the user stops typing. Previously the timer
    // was cleared but never restarted, so unsaved title changes were lost
    // unless the user clicked Save manually.
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      saveTitle(newTitle)
        .then(() => {
          setHasUnsavedTitle(false);
        })
        .catch((error) => {
          console.error("Title auto-save failed:", error);
        })
        .finally(() => {
          saveTimer.current = null;
        });
    }, 1500);
  };

  // ─────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────

  if (!collabReady || !ydoc) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 8,
          color: "var(--text-muted)",
          fontSize: 14,
        }}
      >
        <RotateCw
          size={16}
          style={{
            animation: "spin 1s linear infinite",
          }}
        />
        Loading document...
        <style>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      {/* Toolbar */}

      <div
        style={{
          height: "var(--header-h)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 20px",
          background: "rgba(9,9,14,0.8)",
          backdropFilter: "blur(16px)",
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to workspace"
          title="Back to workspace"
          style={{
            width: 30, height: 30,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-muted)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-soft)";
            e.currentTarget.style.color = "var(--accent)";
            e.currentTarget.style.borderColor = "rgba(108,99,255,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <ArrowLeft size={14} />
        </button>

        <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />

        <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-2-soft)", border: "1px solid rgba(34,201,134,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FileText size={14} style={{ color: "var(--accent-2)" }} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontWeight: 600,
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
            fontSize: 15,
          }}
        >
          Document
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={handleSaveDocument}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid var(--border)",
              background: saving ? "var(--bg-hover)" : "linear-gradient(135deg, var(--accent), #7c3aed)",
              color: saving ? "var(--text-muted)" : "#fff",
              borderRadius: 9,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "var(--font-display)",
              boxShadow: saving ? "none" : "0 2px 12px var(--accent-glow)",
              transition: "all 0.15s",
            }}
          >
            {saving ? (
              <RotateCw
                size={14}
                style={{
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving" : "Save"}
          </button>

          {!collab ? (
            <span
              style={{
                fontSize: 11,
                background: "var(--accent-soft)",
                color: "var(--accent)",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Connecting...
            </span>
          ) : (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <CheckCircle2
                size={12}
                style={{
                  color: "var(--success)",
                }}
              />
              Synced
            </span>
          )}
        </div>
      </div>

      {/* Editor */}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            padding: "48px 64px",
          }}
        >
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Document Title"
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 40,
              fontWeight: 800,
              marginBottom: 32,
              color: "var(--text-primary)",
            }}
          />

          <CollaborativeEditor ydoc={ydoc} />
        </div>
      </div>
    </div>
  );
}
