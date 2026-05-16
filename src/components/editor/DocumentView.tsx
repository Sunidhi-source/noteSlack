"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useUser } from "@clerk/nextjs";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
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

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function isTiptapDocument(content: unknown): content is JSONContent {
  return (
    typeof content === "object" &&
    content !== null &&
    !Array.isArray(content) &&
    "type" in content &&
    (content as { type?: unknown }).type === "doc"
  );
}

function DocumentEditor({
  initialContent,
  remoteContent,
  onChange,
  onEditorReady,
}: {
  initialContent: JSONContent;
  remoteContent: { content: JSONContent; version: number } | null;
  onChange: (content: JSONContent, options?: { broadcast?: boolean }) => void;
  onEditorReady: (editor: Editor | null) => void;
}) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      content: initialContent,
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: "Start writing something great...",
        }),
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none",
        },
      },
      onUpdate: ({ editor }) => {
        onChange(editor.getJSON());
      },
    },
    [],
  );

  useEffect(() => {
    onEditorReady(editor);

    return () => {
      onEditorReady(null);
    };
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || !remoteContent) return;

    editor.commands.setContent(remoteContent.content, {
      emitUpdate: false,
    });
    onChange(remoteContent.content, { broadcast: false });
  }, [editor, onChange, remoteContent]);

  return <EditorContent editor={editor} />;
}

export function DocumentView({ workspaceId, docId }: Props) {
  useWorkspace(workspaceId);

  const router = useRouter();
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const { updateDocument } = useWorkspaceStore();

  const [title, setTitle] = useState("");
  const [hasUnsavedTitle, setHasUnsavedTitle] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [editorContent, setEditorContent] =
    useState<JSONContent>(EMPTY_DOCUMENT);
  const [remoteContent, setRemoteContent] = useState<{
    content: JSONContent;
    version: number;
  } | null>(null);
  const [collab, setCollab] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const titleChannelRef = useRef<RealtimeChannel | null>(null);
  const contentChannelRef = useRef<RealtimeChannel | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const titleRef = useRef("");
  const hasUnsavedTitleRef = useRef(false);
  const contentRef = useRef<JSONContent>(EMPTY_DOCUMENT);
  const remoteVersionRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hasUnsavedTitleRef.current = hasUnsavedTitle;
  }, [hasUnsavedTitle]);

  useEffect(() => {
    let mounted = true;

    contentRef.current = EMPTY_DOCUMENT;

    queueMicrotask(() => {
      if (!mounted) return;

      setContentReady(false);
      setEditorContent(EMPTY_DOCUMENT);
      setRemoteContent(null);
    });

    fetch(`/api/documents?id=${encodeURIComponent(docId)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            (await res.text()) || "Failed to load document",
          );
        }

        return (await res.json()) as Document;
      })
      .then((document) => {
        if (!mounted) return;

        const nextContent = isTiptapDocument(document.content)
          ? document.content
          : EMPTY_DOCUMENT;

        updateDocument(docId, document);

        if (!hasUnsavedTitleRef.current) {
          const nextTitle = document.title ?? "";
          titleRef.current = nextTitle;
          setTitle(nextTitle);
        }

        setEditorContent(nextContent);
        contentRef.current = nextContent;
        setContentReady(true);
      })
      .catch((error) => {
        if (!mounted) return;

        console.error("Document load failed:", error);
        setSaveError(
          error instanceof Error ? error.message : "Failed to load document",
        );
        setContentReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [docId, updateDocument]);

  useEffect(() => {
    if (!user?.id) return;

    const titleChannel = supabase
      .channel(`doc-title-${docId}`)
      .on("broadcast", { event: "title" }, ({ payload }) => {
        const nextTitle = payload?.title;

        if (payload?.userId === user.id || typeof nextTitle !== "string") {
          return;
        }

        titleRef.current = nextTitle;
        setTitle(nextTitle);
        setHasUnsavedTitle(false);
        updateDocument(docId, { title: nextTitle });
      })
      .subscribe();

    const contentChannel = supabase
      .channel(`doc-content-${docId}`)
      .on("broadcast", { event: "content" }, ({ payload }) => {
        const nextContent = payload?.content;

        if (payload?.userId === user.id || !isTiptapDocument(nextContent)) {
          return;
        }

        remoteVersionRef.current += 1;
        setRemoteContent({
          content: nextContent,
          version: remoteVersionRef.current,
        });
      })
      .subscribe((status) => {
        setCollab(status === "SUBSCRIBED");
      });

    titleChannelRef.current = titleChannel;
    contentChannelRef.current = contentChannel;

    return () => {
      titleChannelRef.current = null;
      contentChannelRef.current = null;
      supabase.removeChannel(titleChannel);
      supabase.removeChannel(contentChannel);
      setCollab(false);
    };
  }, [docId, supabase, updateDocument, user?.id]);

  const saveDocumentSnapshot = useCallback(
    async (newTitle: string) => {
      const currentContent = editorRef.current?.getJSON() ?? contentRef.current;

      contentRef.current = currentContent;
      setEditorContent(currentContent);
      setSaveError(null);

      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: docId,
          title: newTitle,
          content: currentContent,
        }),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "Failed to save document");
      }

      const savedDoc = (await res.json()) as Document;

      updateDocument(docId, {
        title: savedDoc.title,
        content: savedDoc.content,
        updated_at: savedDoc.updated_at,
        last_edited_by: savedDoc.last_edited_by,
      });
      setLastSavedAt(Date.now());
    },
    [docId, updateDocument],
  );

  const handleSaveDocument = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (contentSaveTimer.current) {
      clearTimeout(contentSaveTimer.current);
      contentSaveTimer.current = null;
    }

    setSaving(true);

    try {
      await saveDocumentSnapshot(titleRef.current);
      setHasUnsavedTitle(false);
    } catch (error) {
      console.error("Document save failed:", error);
      setSaveError(
        error instanceof Error ? error.message : "Document save failed",
      );
    } finally {
      setSaving(false);
    }
  }, [saveDocumentSnapshot]);

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

  const handleBack = useCallback(() => {
    router.push(`/workspace/${workspaceId}`);
  }, [router, workspaceId]);

  const handleTitleChange = (newTitle: string) => {
    titleRef.current = newTitle;
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

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      saveDocumentSnapshot(newTitle)
        .then(() => {
          setHasUnsavedTitle(false);
        })
        .catch((error) => {
          console.error("Title auto-save failed:", error);
          setSaveError(
            error instanceof Error ? error.message : "Title auto-save failed",
          );
        })
        .finally(() => {
          saveTimer.current = null;
        });
    }, 1500);
  };

  const handleContentChange = useCallback(
    (
      nextContent: JSONContent,
      options: { broadcast?: boolean } = { broadcast: true },
    ) => {
      contentRef.current = nextContent;
      setEditorContent(nextContent);

      if (options.broadcast !== false) {
        if (contentSaveTimer.current) {
          clearTimeout(contentSaveTimer.current);
        }

        contentSaveTimer.current = setTimeout(() => {
          saveDocumentSnapshot(titleRef.current)
            .catch((error) => {
              console.error("Content auto-save failed:", error);
              setSaveError(
                error instanceof Error
                  ? error.message
                  : "Content auto-save failed",
              );
            })
            .finally(() => {
              contentSaveTimer.current = null;
            });
        }, 1200);

        contentChannelRef.current?.send({
          type: "broadcast",
          event: "content",
          payload: {
            content: nextContent,
            userId: user?.id,
          },
        });
      }
    },
    [saveDocumentSnapshot, user?.id],
  );

  const handleEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      if (contentSaveTimer.current) {
        clearTimeout(contentSaveTimer.current);
      }
    };
  }, []);

  if (!contentReady) {
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

          {saveError ? (
            <span
              style={{
                fontSize: 12,
                color: "#dc2626",
              }}
            >
              Save failed
            </span>
          ) : lastSavedAt ? (
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Saved
            </span>
          ) : null}

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

          <DocumentEditor
            initialContent={editorContent}
            remoteContent={remoteContent}
            onChange={handleContentChange}
            onEditorReady={handleEditorReady}
          />
        </div>
      </div>
    </div>
  );
}
