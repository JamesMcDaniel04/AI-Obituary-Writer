"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  RotateCcw,
  RotateCw,
  Type,
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ExportMenu } from "@/components/editor/export-menu";
import { htmlToText } from "@/lib/utils";

type ObituaryEditorProps = {
  caseId: string;
  familyName: string;
  initialContent: string;
};

type SaveState = "saved" | "saving" | "error";

function ToolbarButton({
  active = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
        active
          ? "border-accent bg-accent text-white"
          : "border-border bg-white text-foreground hover:border-accent/40"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ObituaryEditor({
  caseId,
  familyName,
  initialContent,
}: ObituaryEditorProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialContent);
  const [plainText, setPlainText] = useState(htmlToText(initialContent));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveMessage, setSaveMessage] = useState("All changes saved.");

  const persistDraft = async (html: string) => {
    setSaveState("saving");
    setSaveMessage("Saving changes...");

    const response = await fetch(`/api/cases/${caseId}/draft`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: html }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      setSaveState("error");
      setSaveMessage(body?.error ?? "Autosave failed. Please try again.");
      return;
    }

    lastSavedRef.current = html;
    setSaveState("saved");
    setSaveMessage("All changes saved.");
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "editor-content min-h-[420px] rounded-[1.75rem] border border-border bg-white/90 px-6 py-6 text-base leading-8 text-foreground shadow-inner shadow-[rgba(75,42,25,0.04)]",
      },
    },
    onUpdate: ({ editor: tiptapEditor }) => {
      const html = tiptapEditor.getHTML();
      const text = tiptapEditor.getText({ blockSeparator: "\n\n" }).trim();

      setPlainText(text);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (html === lastSavedRef.current) {
        setSaveState("saved");
        setSaveMessage("All changes saved.");
        return;
      }

      timeoutRef.current = setTimeout(() => {
        void persistDraft(html);
      }, 1500);
    },
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className="panel fade-up rounded-[2rem] p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted">
            Editable draft
          </p>
          <h2 className="mt-1 font-serif text-4xl text-foreground">
            {familyName}
          </h2>
          <p
            className={`mt-3 text-sm ${
              saveState === "error" ? "text-red-700" : "text-muted"
            }`}
          >
            {saveMessage}
          </p>
        </div>
        <ExportMenu
          pdfUrl={`/api/cases/${caseId}/pdf`}
          plainText={plainText}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Type className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
          <RotateCcw className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
          <RotateCw className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="mt-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
