"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  X,
  CheckCheck,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getInvestorNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/actions/notifications";
import { supabaseClient } from "@/lib/supabase";

export default function ToastNotificationStack() {
  const [notifications, setNotifications] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newIncomingId, setNewIncomingId] = useState(null);

  useEffect(() => {
    let channel = null;

    async function loadNotifications() {
      try {
        const res = await getInvestorNotifications();
        if (res.success && Array.isArray(res.notifications)) {
          const unread = res.notifications.filter((n) => {
            if (n.read_status === undefined || n.read_status === null) return true;
            const str = String(n.read_status).toUpperCase();
            return str === "FALSE" || str === "0";
          });

          setNotifications((prev) => {
            // Detect if a brand new notification arrived
            if (unread.length > prev.length && unread.length > 0) {
              const latest = unread[0];
              if (!prev.some((p) => p.id === latest.id)) {
                setNewIncomingId(latest.id);
                setTimeout(() => setNewIncomingId(null), 2500);
              }
            }
            return unread;
          });
        }
      } catch (err) {
        console.error("Error loading notifications:", err);
      }
    }

    // Initial load
    loadNotifications();

    // 1. Polling Backup (Every 4 Seconds) - Guarantees background updates work smoothly
    const intervalId = setInterval(loadNotifications, 4000);

    // 2. Supabase Realtime WebSocket Listener
    if (supabaseClient) {
      try {
        channel = supabaseClient
          .channel("realtime_toast_notifications")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
            },
            () => {
              loadNotifications();
            }
          )
          .subscribe();
      } catch (e) {
        console.error("Realtime subscription setup failed:", e);
      }
    }

    return () => {
      clearInterval(intervalId);
      if (channel && supabaseClient) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, []);

  if (!notifications || notifications.length === 0) {
    return null;
  }

  const handleDismissOne = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await markNotificationAsRead(id);
  };

  const handleDismissAll = async () => {
    setIsSubmitting(true);
    setNotifications([]);
    await markAllNotificationsAsRead();
    setIsSubmitting(false);
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "campaign_alert":
        return {
          label: "Campaign Alert",
          bg: "bg-amber-500/10 text-amber-700 border-amber-200",
          icon: Clock,
        };
      case "funding_threshhold":
      case "funding_threshold":
        return {
          label: "Funding Threshold",
          bg: "bg-emerald-500/10 text-[#059669] border-emerald-200",
          icon: TrendingUp,
        };
      case "conversion_pool":
        return {
          label: "Conversion Pool",
          bg: "bg-teal-500/10 text-teal-700 border-teal-200",
          icon: Sparkles,
        };
      case "milestone":
        return {
          label: "Milestone",
          bg: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
          icon: Layers,
        };
      default:
        return {
          label: "Notification",
          bg: "bg-gray-500/10 text-gray-700 border-gray-200",
          icon: Bell,
        };
    }
  };

  const topCard = notifications[0];
  const totalCount = notifications.length;
  const hiddenCount = totalCount - 1;

  return (
    <div className="fixed top-3 right-3 sm:right-4 z-50 w-72 sm:w-80 pointer-events-auto transition-all">
      {!isExpanded ? (
        /* --- COLLAPSED STACKED DECK VIEW --- */
        <div className="relative group">
          {/* Main Top Card */}
          <div
            className={`w-full bg-white rounded-2xl p-3.5 border border-emerald-200/80 shadow-xl transition-all duration-300 relative z-30 overflow-hidden ${
              newIncomingId === topCard?.id
                ? "ring-2 ring-emerald-500 animate-bounce"
                : ""
            }`}
          >
            {/* Left Accent Stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#064e3b]" />

            <div className="flex items-start justify-between gap-2 pl-1.5">
              <div className="space-y-1 flex-1 pr-2">
                <div className="flex items-center justify-between gap-1">
                  {(() => {
                    const typeInfo = getTypeBadge(topCard?.type);
                    const Icon = typeInfo.icon;
                    return (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${typeInfo.bg}`}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {typeInfo.label}
                      </span>
                    );
                  })()}

                  {totalCount > 1 && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                      1 of {totalCount}
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-xs text-gray-900 line-clamp-1">
                  {topCard?.title || "Project Notification"}
                </h4>

                <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">
                  {topCard?.message}
                </p>
              </div>

              {/* Dismiss Top Card Button */}
              <button
                onClick={() => handleDismissOne(topCard?.id)}
                title="Dismiss notification"
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom Bar Controls inside Top Card */}
            {totalCount > 1 && (
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="text-[#059669] font-bold hover:text-[#064e3b] flex items-center gap-1 transition-colors"
                >
                  <ChevronDown className="w-3 h-3" />
                  Expand {hiddenCount} more notification{hiddenCount > 1 ? "s" : ""}
                </button>

                <button
                  onClick={handleDismissAll}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600 font-medium transition-colors"
                >
                  Dismiss All
                </button>
              </div>
            )}
          </div>

          {/* Physical Stacked Deck Layers Peeking Directly Behind Top Card */}
          {totalCount > 1 && (
            <>
              {/* Layer 1 - Directly behind */}
              <div
                onClick={() => setIsExpanded(true)}
                className="absolute -bottom-1.5 left-2 right-2 h-4 bg-emerald-700/90 rounded-b-2xl border-t border-emerald-500/40 shadow-md z-20 cursor-pointer hover:bg-emerald-600 transition-colors"
              />
              {/* Layer 2 - Deep stack */}
              {totalCount > 2 && (
                <div
                  onClick={() => setIsExpanded(true)}
                  className="absolute -bottom-3 left-4 right-4 h-4 bg-emerald-900/70 rounded-b-2xl border-t border-emerald-700/30 shadow-sm z-10 cursor-pointer hover:bg-emerald-800 transition-colors"
                />
              )}
            </>
          )}
        </div>
      ) : (
        /* --- EXPANDED UNSTACKED LIST VIEW --- */
        <div className="w-full space-y-2 bg-[#064e3b]/95 backdrop-blur-md p-2.5 rounded-2xl border border-emerald-600/50 shadow-2xl text-white">
          {/* Top Control Bar */}
          <div className="flex items-center justify-between px-1.5 py-1 text-xs font-semibold border-b border-emerald-700/60 pb-2">
            <div className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-emerald-300" />
              <span>{totalCount} Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="text-emerald-200 hover:text-white text-[11px] underline flex items-center gap-0.5"
              >
                Stack <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={handleDismissAll}
                disabled={isSubmitting}
                className="px-2 py-0.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-medium transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Dismiss All
              </button>
            </div>
          </div>

          {/* Cards Vertical List */}
          <div className="max-h-[70vh] overflow-y-auto space-y-2 pr-1">
            {notifications.map((notif) => {
              const typeInfo = getTypeBadge(notif.type);
              const Icon = typeInfo.icon;

              return (
                <div
                  key={notif.id}
                  className="w-full bg-white rounded-xl p-3 border border-emerald-100 shadow-sm relative overflow-hidden text-gray-900"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#064e3b]" />
                  <div className="flex items-start justify-between gap-2 pl-1">
                    <div className="space-y-1 flex-1 pr-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${typeInfo.bg}`}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {typeInfo.label}
                      </span>
                      <h4 className="font-bold text-xs text-gray-900 line-clamp-1">
                        {notif.title || "Project Notification"}
                      </h4>
                      <p className="text-[11px] text-gray-600 leading-snug">
                        {notif.message}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDismissOne(notif.id)}
                      title="Dismiss notification"
                      className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
