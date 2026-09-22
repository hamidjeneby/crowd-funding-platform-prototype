"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProjectDraft } from "@/app/actions/projects";

import { FolderPlus } from "lucide-react";

export default function NewProjectPage() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const projectResult = await createProjectDraft(title);
      router.push(`/issuer-portal/projects/${projectResult.slug}/edit`);
    } catch (err) {
      setError(err.message || "Failed to create project");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-[#064e3b]/5 p-8 border border-gray-100">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-[#ecfdf5] rounded-2xl flex items-center justify-center mb-4">
            <FolderPlus className="w-8 h-8 text-[#059669]" />
          </div>
          <h1 className="text-2xl font-bold text-[#064e3b]">Create New Project</h1>
          <p className="text-gray-500 text-sm mt-2">
            Give your project a name to get started. You can change this later.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Project Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-[#059669] focus:ring-[#059669] px-4 py-3 bg-gray-50 transition-colors focus:bg-white"
              placeholder="e.g. Green Energy Fund I"
              required
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-md font-medium text-white bg-[#064e3b] hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {loading ? "Preparing your workspace..." : "Start Project Wizard"}
          </button>
        </form>
      </div>
    </div>
  );
}
