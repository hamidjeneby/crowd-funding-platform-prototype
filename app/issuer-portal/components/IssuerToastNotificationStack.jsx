"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ShieldCheck,
  Landmark,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  getIssuerUnreadNotifications,
  markIssuerNotificationAsRead,
  markAllIssuerNotificationsAsRead,
} from "@/app/actions/issuer-notifications";
import { supabaseClient } from "@/lib/supabase";

export default function IssuerToastNotificationStack() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newIncomingId, setNewIncomingId] = useState(null);

  useEffect(() => {
    let channel = null;

    async function loadNotifications() {
      try {
        const res = await getIssuerUnreadNotifications();
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
        console.error("[IssuerToast] Error loading unread notifications:", err);
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
          .channel("realtime_issuer_toast_notifications")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "issuer_notifications",
            },
            () => {
              loadNotifications();
            }
          )
          .subscribe();
      } catch (e) {
        console.error("[IssuerToast] Realtime subscription setup failed:", e);
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

  const handleDismissOne = async (id, e) => {
    if (e) e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await markIssuerNotificationAsRead(id);
  };

  const handleDismissAll = async (e) => {
    if (e) e.stopPropagation();
    setIsSubmitting(true);
    setNotifications([]);
    await markAllIssuerNotificationsAsRead();
    setIsSubmitting(false);
  };

  const handleActionClick = (notif, e) => {
    if (e) e.stopPropagation();
    // 1. Dismiss locally immediately
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    // 2. Mark as read in DB in the background
    if (notif?.id) {
      markIssuerNotificationAsRead(notif.id).catch((err) => {
        console.error("[toast] Error marking notification as read:", err);
      });
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "pledge_recieved":
        return {
          label: "Pledge Received",
          bg: "bg-emerald-500/10 text-emerald-800 border-emerald-200",
          icon: DollarSign,
        };
      case "funding_threshold":
        return {
          label: "Funding Goal",
          bg: "bg-emerald-500/10 text-[#059669] border-emerald-200",
          icon: TrendingUp,
        };
      case "soft_cap_reached":
        return {
          label: "Soft Cap",
          bg: "bg-teal-500/10 text-teal-800 border-teal-200",
          icon: CheckCircle2,
        };
      case "hard_cap_reached":
        return {
          label: "Hard Cap",
          bg: "bg-amber-500/10 text-amber-800 border-amber-200",
          icon: Sparkles,
        };
      case "milestone_approved":
        return {
          label: "Milestone Verified",
          bg: "bg-indigo-500/10 text-indigo-800 border-indigo-200",
          icon: Layers,
        };
      case "milestone_rejected":
        return {
          label: "Milestone Action",
          bg: "bg-rose-500/10 text-rose-800 border-rose-200",
          icon: AlertTriangle,
        };
      case "kyb_approved":
        return {
          label: "KYB Approved",
          bg: "bg-blue-500/10 text-blue-800 border-blue-200",
          icon: ShieldCheck,
        };
      case "kyb_rejected":
        return {
          label: "KYB Action",
          bg: "bg-rose-500/10 text-rose-800 border-rose-200",
          icon: AlertTriangle,
        };
      case "bank_verified":
        return {
          label: "Bank Verified",
          bg: "bg-purple-500/10 text-purple-800 border-purple-200",
          icon: Landmark,
        };
      case "bank_rejected":
        return {
          label: "Bank Action",
          bg: "bg-rose-500/10 text-rose-800 border-rose-200",
          icon: AlertTriangle,
        };
      case "project_approved":
      case "campaign_live":
        return {
          label: "Campaign Live",
          bg: "bg-emerald-500/10 text-emerald-800 border-emerald-200",
          icon: Building2,
        };
      case "project_changes_requested":
        return {
          label: "Changes Requested",
          bg: "bg-amber-500/10 text-amber-800 border-amber-200",
          icon: AlertTriangle,
        };
      case "sharia_certified":
        return {
          label: "Shariah Certified",
          bg: "bg-teal-500/10 text-teal-800 border-teal-200",
          icon: ShieldCheck,
        };
      case "campaign_funded":
        return {
          label: "Campaign Funded",
          bg: "bg-emerald-500/10 text-[#059669] border-emerald-200",
          icon: CheckCircle2,
        };
      case "campaign_failed":
        return {
          label: "Campaign Failed",
          bg: "bg-rose-500/10 text-rose-800 border-rose-200",
          icon: AlertTriangle,
        };
      default:
        return {
          label: "Issuer Alert",
          bg: "bg-gray-500/10 text-gray-800 border-gray-200",
          icon: Bell,
        };
    }
  };

  const topCard = notifications[0];
  const totalCount = notifications.length;
  const hiddenCount = totalCount - 1;

  return (
    <div className="fixed top-3 right-3 sm:right-4 z-50 w-72 sm:w-84 pointer-events-auto transition-all">
      {!isExpanded ? (
        /* --- COLLAPSED STACKED DECK VIEW --- */
        <div className="relative group">
          {/* Main Top Card */}
          <div
            className={`w-full bg-white rounded-2xl p-3.5 border border-emerald-200/90 shadow-xl transition-all duration-300 relative z-30 overflow-hidden ${
              newIncomingId === topCard?.id
                ? "ring-2 ring-emerald-500 animate-bounce"
                : ""
            }`}
          >
            {/* Left Accent Stripe */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 ${
                topCard?.requires_action ? "bg-amber-600" : "bg-[#064e3b]"
              }`}
            />

            <div className="flex items-start justify-between gap-2 pl-1.5">
              <div className="space-y-1 flex-1 pr-1">
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
                  {topCard?.title || "Issuer Notification"}
                </h4>

                <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">
                  {topCard?.message}
                </p>

                {/* Action Button if requires_action is true and notification is unread */}
                {(topCard?.requires_action || topCard?.action_required) &&
                  topCard?.action_url &&
                  !topCard?.read_status && (
                  <div className="pt-1.5">
                    <Link
                      href={topCard.action_url}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionClick(topCard, e);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#064e3b] hover:bg-[#047857] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <span>Take Action</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Close ('X') Dismiss Button */}
              <button
                onClick={(e) => handleDismissOne(topCard?.id, e)}
                title="Dismiss notification"
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom Bar Controls inside Top Card */}
            {totalCount > 1 && (
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="text-[#059669] font-bold hover:text-[#064e3b] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-3 h-3" />
                  Expand {hiddenCount} more notification{hiddenCount > 1 ? "s" : ""}
                </button>

                <button
                  onClick={handleDismissAll}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600 font-medium transition-colors cursor-pointer"
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
              <span>{totalCount} Issuer Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="text-emerald-200 hover:text-white text-[11px] underline flex items-center gap-0.5 cursor-pointer"
              >
                Stack <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={handleDismissAll}
                disabled={isSubmitting}
                className="px-2 py-0.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
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
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      notif.requires_action ? "bg-amber-600" : "bg-[#064e3b]"
                    }`}
                  />
                  <div className="flex items-start justify-between gap-2 pl-1">
                    <div className="space-y-1 flex-1 pr-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${typeInfo.bg}`}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {typeInfo.label}
                      </span>
                      <h4 className="font-bold text-xs text-gray-900 line-clamp-1">
                        {notif.title || "Issuer Notification"}
                      </h4>
                      <p className="text-[11px] text-gray-600 leading-snug">
                        {notif.message}
                      </p>

                      {/* Action Button inside Expanded card */}
                      {(notif.requires_action || notif.action_required) &&
                        notif.action_url &&
                        !notif.read_status && (
                        <div className="pt-1.5">
                          <Link
                            href={notif.action_url}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notif, e);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#064e3b] hover:bg-[#047857] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <span>Take Action</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleDismissOne(notif.id, e)}
                      title="Dismiss notification"
                      className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
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
