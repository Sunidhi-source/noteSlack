"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent, JSONContent } from "@tiptap/react"; // Added JSONContent
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useUser } from "@clerk/nextjs";
import { Bold, Italic, FileText, CheckCircle2, RotateCw } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePresence } from "@/hooks/usePresence";
import { useSupabaseClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/store/workspace";
import { Document, PresenceUser } from "@/types";
import { getInitials } from "@/lib/utils";

interface Props {
  workspaceId: string;
  docId: string;
}

export function DocumentView({ workspaceId, docId }: Props) {
  useWorkspace(workspaceId);
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const { documents, updateDocument } = useWorkspaceStore();
  const { cursors } = usePresence(docId);

  const doc = documents.find((d) => d.id === docId);

  const [title, setTitle] = useState(doc?.title ?? "Untitled");
  const [saving, setSaving] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!doc) {
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
    }
  }, [docId, doc, supabase, updateDocument]);

  // Save function - Content is now typed as JSONContent
  const saveDoc = useCallback(
    async (content: JSONContent | null, newTitle: string) => {
      if (!content) return;
      setSaving(true);

      await supabase
        .from("documents")
        .update({
          content: content as Record<string, unknown>,
          title: newTitle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", docId);

      updateDocument(docId, {
        content: content as Record<string, unknown>,
        title: newTitle,
      });
      setSaving(false);
    },
    [docId, supabase, updateDocument],
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: "Start writing something great...",
        }),
      ],
      // Content cast to JSONContent to clear the error
      content: (doc?.content as JSONContent) ?? "",
      onUpdate: ({ editor }) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveDoc(editor.getJSON(), title);
        }, 1500);
      },
      editorProps: {
        attributes: {
          class:
            "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none",
        },
      },
    },
    [docId],
  );

  const activeUsers = Object.entries(cursors)
    .filter(([userId]) => userId !== user?.id)
    .flatMap(([, userArray]) => userArray as PresenceUser[]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDoc(editor?.getJSON() ?? null, newTitle);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b flex items-center px-6 gap-4 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold uppercase tracking-tight">
          <FileText size={14} /> Doc
        </div>

        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-colors ${editor?.isActive("bold") ? "bg-slate-200" : "hover:bg-slate-100"}`}
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-colors ${editor?.isActive("italic") ? "bg-slate-200" : "hover:bg-slate-100"}`}
        >
          <Italic size={18} />
        </button>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex -space-x-2">
            {activeUsers.map((u) => (
              <div
                key={u.user_id}
                className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold ring-1 ring-slate-200"
                style={{ backgroundColor: u.color ?? "#3b82f6" }}
                title={u.name ?? "Collaborator"}
              >
                {getInitials(u.name ?? "C")}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            {saving ? (
              <RotateCw size={14} className="animate-spin text-blue-500" />
            ) : (
              <CheckCircle2 size={14} className="text-green-500" />
            )}
            {saving ? "Saving..." : "Saved"}
          </div>
        </div>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 overflow-y-auto px-12 py-16 selection:bg-blue-100">
        <div className="max-w-4xl mx-auto">
          <input
            key={docId}
            defaultValue={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-5xl font-black border-none outline-none w-full mb-10 placeholder:text-slate-200 text-slate-900 tracking-tight caret-blue-600"
            placeholder="Document Title"
          />
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
