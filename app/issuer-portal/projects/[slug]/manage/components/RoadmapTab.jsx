"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Flag,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  AlertCircle,
  Loader2,
  Info,
  Calendar,
  Lock,
} from "lucide-react";
import { saveIssuerMilestone, markMilestoneReached } from "@/app/actions/issuer-management";

export default function RoadmapTab({ projectId, initialMilestones = [] }) {
  const router = useRouter();
  const [milestones, setMilestones] = useState(initialMilestones);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmingMilestone, setConfirmingMilestone] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reachingId, setReachingId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Sync state when initialMilestones updates from server revalidation
  useEffect(() => {
    setMilestones(initialMilestones);
  }, [initialMilestones]);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  function openCreateModal() {
    setEditingMilestone(null);
    setTitle("");
    setDescription("");
    setTargetDate("");
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(m) {
    if (m.milestone_source === "system" || m.status === "complete" || m.status === "completed") {
      return;
    }
    setEditingMilestone(m);
    setTitle(m.title || "");
    setDescription(m.description || "");
    
    // Format target_date for date input YYYY-MM-DD
    let formattedDate = "";
    if (m.target_date) {
      try {
        const d = new Date(m.target_date);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().split("T")[0];
        }
      } catch (e) {
        console.error(e);
      }
    }
    setTargetDate(formattedDate);
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Milestone title is required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        id: editingMilestone ? editingMilestone.id : undefined,
        title: title.trim(),
        description: description.trim() || null,
        target_date: targetDate || null,
      };

      await saveIssuerMilestone(projectId, payload);
      setSuccessMessage("Milestone saved and submitted for review!");
      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to save milestone.");
    } finally {
      setSaving(false);
    }
  }

  function openConfirmModal(m) {
    const verifRaw = m.mileston_verification_status ?? m.milestone_verification_status ?? m.verification_status;
    const isApprovedVerif = verifRaw ? String(verifRaw).trim().toLowerCase() === "approved" : false;
    if (!isApprovedVerif) return;
    setConfirmingMilestone(m);
  }

  async function confirmAndMarkReached() {
    const m = confirmingMilestone;
    if (!m) return;

    setConfirmingMilestone(null);
    setReachingId(m.id);

    // Optimistic local state update for instant UI feedback
    setMilestones((prev) =>
      prev.map((item) =>
        item.id === m.id
          ? { ...item, status: "completed", verification_status: "pending" }
          : item
      )
    );

    try {
      await markMilestoneReached(projectId, m.id);
      setSuccessMessage(`Milestone "${m.title}" submitted as reached for auditor review!`);
      router.refresh();
    } catch (err) {
      console.error(err);
      // Revert optimistic update on error
      setMilestones(initialMilestones);
      alert(err.message || "Failed to mark milestone as reached.");
    } finally {
      setReachingId(null);
    }
  }

  function formatUtcDate(dateStr) {
    if (!dateStr) return "Target date TBD";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6">
      {/* Notice & Disclaimer Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#059669]">
            <Info className="w-4 h-4 shrink-0" /> Auditor Review & Milestone Clearing Rule
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#064e3b] text-white font-bold text-xs rounded-xl hover:bg-[#047857] transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Project Milestone
          </button>
        </div>
        <p className="text-xs text-[#064e3b]/80 leading-relaxed">
          Adding or updating a milestone will submit it for platform reviewer clearing.
          It will show a <span className="font-bold text-amber-700">Pending Review</span> badge in your hub and will not be displayed on the investor portal until it is reviewed and approved.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center justify-between text-xs font-bold shadow-xs">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Timeline List */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="text-base font-extrabold text-[#064e3b] flex items-center gap-2 border-b border-gray-100 pb-4">
          <Flag className="w-5 h-5 text-[#059669]" /> Milestone Timeline & Roadmap
        </h3>

        {milestones.length === 0 ? (
          <div className="text-center py-12 text-gray-500 space-y-3">
            <Flag className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-xs">No milestones created yet. Click above to add your first milestone.</p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-emerald-100">
            {milestones.map((m) => {
              const isSystem = m.milestone_source === "system";
              const isComplete = m.status === "complete" || m.status === "completed";
              const verifRaw = m.mileston_verification_status ?? m.milestone_verification_status ?? m.verification_status;
              const isApprovedVerif = verifRaw ? String(verifRaw).trim().toLowerCase() === "approved" : false;
              const isRejectedVerif = verifRaw ? String(verifRaw).trim().toLowerCase() === "rejected" : false;
              const isPendingVerif = !isApprovedVerif && !isRejectedVerif;

              return (
                <div key={m.id || m.title} className="relative group">
                  {/* Timeline Dot Icon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs shadow-xs ${
                      isComplete
                        ? "bg-emerald-600 text-white border-emerald-700"
                        : "bg-white text-emerald-800 border-emerald-300"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#059669]" />
                    )}
                  </div>

                  {/* Milestone Card */}
                  <div className="bg-[#fdfbf7] rounded-2xl border border-emerald-100 p-4 sm:p-5 space-y-3 hover:border-emerald-300 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Source Tag */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            isSystem
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-emerald-100 text-[#064e3b] border-emerald-200"
                          }`}
                        >
                          {isSystem ? "Platform Milestone" : "Project Milestone"}
                        </span>

                        {/* Verification Status Badge */}
                        {!isSystem && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              isPendingVerif
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : isRejectedVerif
                                ? "bg-red-100 text-red-800 border-red-300"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            {isPendingVerif
                              ? "Pending Auditor Review"
                              : isRejectedVerif
                              ? "Rejected"
                              : "Cleared for Investors"}
                          </span>
                        )}

                        {isComplete && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] uppercase border border-emerald-700">
                            Reached
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#059669]" />
                        {formatUtcDate(m.target_date)}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-[#064e3b]">{m.title}</h4>
                      {m.description && (
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{m.description}</p>
                      )}
                    </div>

                    {/* Actions Footer */}
                    {!isSystem && (
                      <div className="flex items-center justify-between pt-2 border-t border-emerald-100/60 text-xs">
                        {isComplete ? (
                          <span className="text-gray-400 text-[11px] font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Milestone Reached & Locked
                          </span>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openEditModal(m)}
                              className="text-[#059669] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit Details
                            </button>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openConfirmModal(m)}
                                disabled={reachingId === m.id || !isApprovedVerif}
                                title={!isApprovedVerif ? "Milestone must be approved/cleared for investors before marking as reached" : ""}
                                className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-800 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {reachingId === m.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                Mark as Reached
                              </button>
                              {!isApprovedVerif && (
                                <span className="text-[10px] text-amber-700 font-semibold italic">
                                  Requires Auditor Clearing First
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmingMilestone && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-200">
            <div className="flex items-center gap-3 text-amber-700">
              <AlertCircle className="w-6 h-6 shrink-0 text-amber-600" />
              <h3 className="text-base font-extrabold text-[#064e3b]">
                Mark Milestone as Reached?
              </h3>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              Are you sure you want to mark milestone <strong>"{confirmingMilestone.title}"</strong> as reached?
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] font-semibold leading-normal">
              ⚠️ <strong>Notice:</strong> This action is <strong>irreversible</strong> and will submit the milestone completion to platform auditors for final verification.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmingMilestone(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndMarkReached}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-[#064e3b]">
                {editingMilestone ? "Edit Project Milestone" : "Add New Project Milestone"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. SPV Regulatory License Approval"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#059669] font-medium text-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#059669] font-medium text-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context or expected deliverables for this milestone..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#059669] font-medium text-gray-900"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-snug">
                <strong>Review Note:</strong> Saving this milestone sets its verification status to <em>pending</em>. It will be reviewed by platform compliance before becoming visible to investors.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#064e3b] text-white font-bold hover:bg-[#047857] flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingMilestone ? "Save Changes" : "Create Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
