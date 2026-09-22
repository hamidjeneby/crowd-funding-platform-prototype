"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { updateProjectDraft, getProjectMilestones } from "@/app/actions/projects";
import { Plus, Trash2, Calendar, Flag } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  summary: z.string().max(150, "Summary must be 150 characters or less"),
  full_description: z
    .string()
    .refine((val) => val.replace(/<[^>]*>/g, "").trim().length > 0, {
      message: "Full description is required",
    }),
});

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

  // Issuer Milestones repeatable state
  const [milestones, setMilestones] = useState([]);

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

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || "",
        summary: initialData.summary || "",
        full_description: initialData.full_description || "",
      });
    }
  }, [initialData, reset]);

  // Load existing issuer milestones
  useEffect(() => {
    async function loadMilestones() {
      if (!projectId) return;
      try {
        const allMs = await getProjectMilestones(projectId);
        const issuerMs = (allMs || []).filter((m) => m.milestone_source === "issuer");
        setMilestones(
          issuerMs.map((m) => ({
            id: m.id,
            title: m.title || "",
            description: m.description || "",
            target_date: m.target_date ? m.target_date.split("T")[0] : "",
          }))
        );
      } catch (e) {
        console.error("Error loading project milestones:", e);
      }
    }
    loadMilestones();
  }, [projectId]);

  const summaryValue = watch("summary") || "";

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialData?.full_description || "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      setValue("full_description", editor.getHTML(), { shouldValidate: true });
    },
  });

  useEffect(() => {
    if (editor && initialData?.full_description !== undefined) {
      const current = editor.getHTML();
      if (current !== initialData.full_description) {
        editor.commands.setContent(initialData.full_description || "", false);
      }
    }
  }, [initialData?.full_description, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  // Milestone list handlers
  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      { title: "", description: "", target_date: "" },
    ]);
  };

  const updateMilestone = (index, field, value) => {
    setMilestones((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeMilestone = (index) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...data,
        issuer_milestones: milestones,
      };

      await updateProjectDraft(projectId, payload, 1);
      await onUpdate();
      onNext();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

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

      {/* REPEATABLE ISSUER MILESTONES BLOCK */}
      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#064e3b] flex items-center gap-2">
              <Flag className="w-4 h-4 text-[#059669]" /> Project Milestones & Target Dates
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Define key execution milestones for your project roadmap.
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={addMilestone}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Milestone
            </button>
          )}
        </div>

        {milestones.length > 0 ? (
          <div className="space-y-4">
            {milestones.map((ms, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3 relative"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#064e3b] uppercase tracking-wider">
                    Milestone #{idx + 1}
                  </span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(idx)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      title="Remove milestone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Milestone Title
                    </label>
                    <input
                      type="text"
                      value={ms.title}
                      onChange={(e) => updateMilestone(idx, "title", e.target.value)}
                      disabled={disabled}
                      placeholder="e.g. Site Acquisition & Permits"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm border bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={ms.target_date}
                      onChange={(e) => updateMilestone(idx, "target_date", e.target.value)}
                      disabled={disabled}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm border bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={ms.description}
                    onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                    disabled={disabled}
                    placeholder="Brief description of the milestone execution plan..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 text-sm border bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-500">
            No issuer milestones added yet. Click &quot;Add Milestone&quot; above to include project targets.
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || summaryValue.length > 150}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#064e3b] hover:bg-[#064e3b]/90 disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Saving..." : disabled ? "Next" : "Save & Continue"}
        </button>
      </div>
    </form>
  );
}
