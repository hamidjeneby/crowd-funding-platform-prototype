"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { updateProjectDraft } from "@/app/actions/projects";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  summary: z.string().max(150, "Summary must be 150 characters or less"),
  full_description: z
    .string()
    .refine((val) => val.replace(/<[^>]*>/g, "").trim().length > 0, {
      message: "Full description is required",
    }),
});

// Restricted extension set: bold, italic, ONE heading size, lists, paragraphs.
// No code blocks, blockquotes, horizontal rules, strikethrough, links, or images.
const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [2] },
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
    strike: false,
  }),
];

function ToolbarButton({ onClick, active, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`px-3 py-1 border rounded text-sm hover:bg-gray-200 ${
        active ? "bg-gray-300 font-semibold" : "bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function Step1BasicInfo({
  projectId,
  initialData,
  onNext,
  disabled,
  onUpdate,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialData?.title || "",
      summary: initialData?.summary || "",
      full_description: initialData?.full_description || "",
    },
  });

  // initialData often arrives asynchronously (fetched after this component mounts).
  // defaultValues only apply on first render, so title/summary need an explicit
  // resync once the real data shows up.
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || "",
        summary: initialData.summary || "",
        full_description: initialData.full_description || "",
      });
    }
  }, [initialData, reset]);

  const summaryValue = watch("summary");

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialData?.full_description || "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      setValue("full_description", editor.getHTML(), { shouldValidate: true });
    },
  });

  // The editor's own DOM content is a separate thing from react-hook-form's
  // internal value above -- reset() alone won't repaint what's on screen.
  // This keeps the visible editor in sync if initialData changes after mount.
  useEffect(() => {
    if (editor && initialData?.full_description !== undefined) {
      const current = editor.getHTML();
      if (current !== initialData.full_description) {
        editor.commands.setContent(initialData.full_description || "", false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.full_description, editor]);

  // Tiptap's `editable` option is only read at creation time -- toggling the
  // `disabled` prop later requires calling setEditable() directly.
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await updateProjectDraft(projectId, data, 1);
      await onUpdate();
      onNext();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  // When this step is locked (project under review), skip validation
  // entirely -- old data that predates a validation rule (e.g. a summary
  // saved before the 150-char limit existed) must never block navigation.
  const handleFormSubmit = disabled
    ? (e) => {
        e.preventDefault();
        onNext();
      }
    : handleSubmit(onSubmit);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">Basic Info</h2>

      {error && <p className="text-red-500">{error}</p>}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Project Title
        </label>
        <input
          id="title"
          {...register("title")}
          disabled={disabled}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="summary"
          className="block text-sm font-medium text-gray-700"
        >
          Summary
        </label>
        <textarea
          id="summary"
          {...register("summary")}
          disabled={disabled}
          rows={3}
          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 p-2 border ${
            summaryValue.length > 150
              ? "border-red-500 focus:border-red-500"
              : "border-gray-300 focus:border-blue-500"
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors.summary ? (
            <p className="text-sm text-red-600">{errors.summary.message}</p>
          ) : (
            <div />
          )}
          <p
            className={`text-sm ${
              summaryValue.length > 150
                ? "text-red-600 font-bold"
                : "text-gray-500"
            }`}
          >
            {summaryValue.length} / 150
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Description
        </label>

        {!disabled && editor && (
          <div className="flex flex-wrap gap-2 mb-2">
            <ToolbarButton
              label="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              label="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton
              label="Section title"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              Title
            </ToolbarButton>
            <ToolbarButton
              label="Bullet list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              List
            </ToolbarButton>
            <ToolbarButton
              label="Numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              1. List
            </ToolbarButton>
          </div>
        )}

        <EditorContent
          editor={editor}
          className={`border rounded-md p-3 min-h-[220px] bg-white [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-2 [&_p]:mb-2 ${
            disabled ? "bg-gray-50" : ""
          }`}
        />
        {errors.full_description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.full_description.message}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || summaryValue.length > 150}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#064e3b] hover:bg-[#064e3b]/90 disabled:opacity-50"
        >
          {loading ? "Saving..." : disabled ? "Next" : "Save & Continue"}
        </button>
      </div>
    </form>
  );
}
