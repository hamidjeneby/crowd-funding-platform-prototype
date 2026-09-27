"use client";

import { useState, useEffect } from "react";
import { Bell, ShieldCheck, Flag, TrendingUp, Sparkles, Clock, Check, X, Loader2 } from "lucide-react";
import { getNotificationSubscription, updateNotificationSubscription } from "@/app/actions/notifications";

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  investorClass,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const isClass1To4 = Number(investorClass) >= 1 && Number(investorClass) <= 4;

  const [prefs, setPrefs] = useState({
    notify_milestones: false,
    notify_funding_thresholds: false,
    notify_campaign_alerts: false,
    notify_conversion_pool: false,
  });

  useEffect(() => {
    if (isOpen && projectId) {
      setLoading(true);
      setSuccessMsg(null);
      setErrorMsg(null);
      getNotificationSubscription(projectId)
        .then((sub) => {
          if (sub) {
            setPrefs({
              notify_milestones: Boolean(sub.notify_milestones),
              notify_funding_thresholds: Boolean(sub.notify_funding_thresholds),
              notify_campaign_alerts: Boolean(sub.notify_campaign_alerts),
              notify_conversion_pool: isClass1To4 ? Boolean(sub.notify_conversion_pool) : false,
            });
          } else {
            setPrefs({
              notify_milestones: false,
              notify_funding_thresholds: false,
              notify_campaign_alerts: false,
              notify_conversion_pool: false,
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, projectId, investorClass, isClass1To4]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    if (key === "notify_conversion_pool" && !isClass1To4) return;
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAll = () => {
    const allOn =
      prefs.notify_milestones &&
      prefs.notify_funding_thresholds &&
      prefs.notify_campaign_alerts &&
      (!isClass1To4 || prefs.notify_conversion_pool);

    setPrefs({
      notify_milestones: !allOn,
      notify_funding_thresholds: !allOn,
      notify_campaign_alerts: !allOn,
      notify_conversion_pool: isClass1To4 ? !allOn : false,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateNotificationSubscription(projectId, prefs);
    setSaving(false);

    if (res.success) {
      setSuccessMsg("Notification preferences updated successfully!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.error || "Failed to update notification settings.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-[#059669]/20 shadow-2xl w-full max-w-lg overflow-hidden space-y-0 relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064e3b] to-emerald-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <Bell className="w-4 h-4 text-emerald-400" /> Subscription Preferences
          </div>
          <h3 className="text-xl font-extrabold mt-1 text-white line-clamp-1">
            {projectTitle || "Project Alerts"}
          </h3>
          <p className="text-xs text-emerald-200/80 mt-0.5">
            Configure manual alerts for campaign milestones, funding thresholds, and deadlines.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-emerald-800">
              <Loader2 className="w-8 h-8 animate-spin text-[#059669]" />
              <p className="text-xs font-semibold">Loading subscription preferences...</p>
            </div>
          ) : (
            <>
              {/* Select All Toggle Bar */}
              <div className="flex items-center justify-between bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100">
                <span className="text-xs font-extrabold text-[#064e3b]">Enable All Notifications</span>
                <button
                  onClick={handleToggleAll}
                  className="px-3 py-1 rounded-lg bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all cursor-pointer"
                >
                  Toggle All
                </button>
              </div>

              {/* Preferences Toggles List */}
              <div className="space-y-4">
                {/* 1. Milestones */}
                <div
                  onClick={() => handleToggle("notify_milestones")}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-emerald-300 transition-all flex items-start justify-between gap-4 cursor-pointer bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100/80 text-[#059669] shrink-0 mt-0.5">
                      <Flag className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#064e3b]">Milestone Updates</h4>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        Receive instant notifications whenever a new operational or system milestone is completed.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.notify_milestones}
                    onChange={() => {}}
                    className="w-5 h-5 accent-[#064e3b] rounded cursor-pointer mt-1"
                  />
                </div>

                {/* 2. Funding Thresholds */}
                <div
                  onClick={() => handleToggle("notify_funding_thresholds")}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-emerald-300 transition-all flex items-start justify-between gap-4 cursor-pointer bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100/80 text-[#059669] shrink-0 mt-0.5">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#064e3b]">Funding Threshold Alerts</h4>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        Get notified when total campaign funding reaches key targets: 25%, 50%, 75%, or 100%.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.notify_funding_thresholds}
                    onChange={() => {}}
                    className="w-5 h-5 accent-[#064e3b] rounded cursor-pointer mt-1"
                  />
                </div>

                {/* 3. Campaign Alerts */}
                <div
                  onClick={() => handleToggle("notify_campaign_alerts")}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-emerald-300 transition-all flex items-start justify-between gap-4 cursor-pointer bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100/80 text-[#059669] shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#064e3b]">Campaign Deadline Alerts</h4>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        Receive timeline countdown reminders at 60 days, 30 days, 7 days, and 24 hours before campaign end.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.notify_campaign_alerts}
                    onChange={() => {}}
                    className="w-5 h-5 accent-[#064e3b] rounded cursor-pointer mt-1"
                  />
                </div>

                {/* 4. Conversion Pool Thresholds (Classes 1-4 Only) */}
                <div
                  onClick={() => isClass1To4 && handleToggle("notify_conversion_pool")}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 bg-white ${
                    isClass1To4
                      ? "border-gray-200 hover:border-emerald-300 cursor-pointer"
                      : "border-gray-100 opacity-60 bg-gray-50/60 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100/80 text-[#059669] shrink-0 mt-0.5">
                      <Sparkles className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#064e3b]">Conversion Pool Filling Alerts</h4>
                        {!isClass1To4 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                            Class 1–4 Only
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {isClass1To4
                          ? "Get notified as the equity conversion pool fills up at 25%, 50%, 75%, or 100% capacity."
                          : "Conversion pool notifications are exclusively reserved for Class 1 to Class 4 investors."}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isClass1To4}
                    checked={prefs.notify_conversion_pool}
                    onChange={() => {}}
                    className="w-5 h-5 accent-[#064e3b] rounded cursor-pointer mt-1"
                  />
                </div>
              </div>

              {/* Feedback messages */}
              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-700" /> {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Subscription Settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
