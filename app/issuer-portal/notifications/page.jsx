"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  DollarSign,
  Building2,
  CheckCheck,
  Landmark,
  ArrowRight,
  TrendingUp,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import {
  getIssuerNotifications,
  markIssuerNotificationAsRead,
  markAllIssuerNotificationsAsRead,
} from "@/app/actions/issuer-notifications";
import { supabaseClient } from "@/lib/supabase";

export default function IssuerNotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionRequiredCount, setActionRequiredCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const pageRef = useRef(page);
  const activeTabRef = useRef(activeTab);

  const fetchNotifications = async (currentPage, tab, { isSilent = false } = {}) => {
    if (!isSilent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await getIssuerNotifications({
        page: currentPage,
        limit: 20,
        typeFilter: tab,
      });

      if (res.success) {
        setNotifications(res.notifications || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.totalCount || 0);
        setUnreadCount(res.unreadCount || 0);
        setActionRequiredCount(res.actionRequiredCount || 0);
      } else {
        if (!isSilent) {
          setError(res.error || "Failed to load issuer notifications.");
        }
      }
    } catch (err) {
      console.error("[IssuerNotificationsPage] Fetch error:", err);
      if (!isSilent) {
        setError("An error occurred while fetching notifications.");
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  };

  // Primary user-triggered fetch on page or tab change
  useEffect(() => {
    pageRef.current = page;
    activeTabRef.current = activeTab;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications(page, activeTab);
  }, [page, activeTab]);

  // Realtime WebSocket subscription & silent background sync backup
  useEffect(() => {
    let channel = null;

    const silentRefresh = () => {
      fetchNotifications(pageRef.current, activeTabRef.current, { isSilent: true });
    };

    // 1. Supabase Realtime WebSocket listener
    if (supabaseClient) {
      try {
        channel = supabaseClient
          .channel("realtime_issuer_notifications_page")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "issuer_notifications",
            },
            () => {
              silentRefresh();
            }
          )
          .subscribe();
      } catch (err) {
        console.error("[IssuerNotificationsPage] Realtime setup failed:", err);
      }
    }

    // 2. 30-second silent background poll backup (only when tab is visible)
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      silentRefresh();
    }, 30000);

    return () => {
      clearInterval(intervalId);
      if (channel && supabaseClient) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const handleMarkAsRead = async (id) => {
    setNotifications((prev) => {
      if (activeTab === "action_required") {
        return prev.filter((n) => n.id !== id);
      }
      return prev.map((n) => (n.id === id ? { ...n, read_status: true } : n));
    });
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setActionRequiredCount((prev) => Math.max(0, prev - 1));
    await markIssuerNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    setIsSubmitting(true);
    setNotifications((prev) => {
      if (activeTab === "action_required") {
        return [];
      }
      return prev.map((n) => ({ ...n, read_status: true }));
    });
    setUnreadCount(0);
    setActionRequiredCount(0);
    await markAllIssuerNotificationsAsRead();
    setIsSubmitting(false);
  };

  const handleActionClick = (item) => {
    // 1. Mark as read immediately in local state
    setNotifications((prev) => {
      if (activeTab === "action_required") {
        return prev.filter((n) => n.id !== item.id);
      }
      return prev.map((n) => (n.id === item.id ? { ...n, read_status: true } : n));
    });
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setActionRequiredCount((prev) => Math.max(0, prev - 1));

    // 2. Mark as read in DB in the background
    if (item?.id) {
      markIssuerNotificationAsRead(item.id).catch((err) => {
        console.error("[notifications] Error marking notification as read:", err);
      });
    }
  };

  const getTypeDetails = (type) => {
    switch (type) {
      case "pledge_recieved":
        return {
          label: "Pledge Received",
          badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
          iconBg: "bg-emerald-600 text-white",
          icon: DollarSign,
        };
      case "funding_threshold":
        return {
          label: "Funding Goal",
          badgeBg: "bg-emerald-100 text-[#064e3b] border-emerald-300",
          iconBg: "bg-[#064e3b] text-emerald-300",
          icon: TrendingUp,
        };
      case "soft_cap_reached":
        return {
          label: "Soft Cap",
          badgeBg: "bg-teal-100 text-teal-900 border-teal-300",
          iconBg: "bg-teal-600 text-white",
          icon: CheckCircle2,
        };
      case "hard_cap_reached":
        return {
          label: "Hard Cap",
          badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
          iconBg: "bg-amber-500 text-white",
          icon: Sparkles,
        };
      case "milestone_approved":
        return {
          label: "Milestone Verified",
          badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-300",
          iconBg: "bg-indigo-600 text-white",
          icon: Layers,
        };
      case "milestone_rejected":
        return {
          label: "Milestone Action",
          badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
          iconBg: "bg-rose-600 text-white",
          icon: AlertTriangle,
        };
      case "kyb_approved":
        return {
          label: "KYB Approved",
          badgeBg: "bg-blue-100 text-blue-900 border-blue-300",
          iconBg: "bg-blue-600 text-white",
          icon: ShieldCheck,
        };
      case "kyb_rejected":
        return {
          label: "KYB Action",
          badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
          iconBg: "bg-rose-600 text-white",
          icon: AlertTriangle,
        };
      case "bank_verified":
        return {
          label: "Bank Verified",
          badgeBg: "bg-purple-100 text-purple-900 border-purple-300",
          iconBg: "bg-purple-600 text-white",
          icon: Landmark,
        };
      case "bank_rejected":
        return {
          label: "Bank Action",
          badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
          iconBg: "bg-rose-600 text-white",
          icon: AlertTriangle,
        };
      case "project_approved":
      case "campaign_live":
        return {
          label: "Campaign Live",
          badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
          iconBg: "bg-[#064e3b] text-white",
          icon: Building2,
        };
      case "project_changes_requested":
        return {
          label: "Changes Requested",
          badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
          iconBg: "bg-amber-500 text-white",
          icon: FileEdit,
        };
      case "sharia_certified":
        return {
          label: "Shariah Certified",
          badgeBg: "bg-teal-100 text-teal-900 border-teal-300",
          iconBg: "bg-teal-700 text-white",
          icon: ShieldCheck,
        };
      case "campaign_funded":
        return {
          label: "Campaign Funded",
          badgeBg: "bg-emerald-100 text-[#064e3b] border-emerald-300",
          iconBg: "bg-[#064e3b] text-emerald-300",
          icon: CheckCircle2,
        };
      case "campaign_failed":
        return {
          label: "Campaign Failed",
          badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
          iconBg: "bg-rose-600 text-white",
          icon: AlertTriangle,
        };
      default:
        return {
          label: "Issuer Alert",
          badgeBg: "bg-gray-100 text-gray-800 border-gray-300",
          iconBg: "bg-gray-700 text-white",
          icon: Bell,
        };
    }
  };

  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  const displayedNotifications =
    activeTab === "action_required"
      ? notifications.filter((item) => {
          const isRead =
            item.read_status === true ||
            String(item.read_status).toUpperCase() === "TRUE" ||
            String(item.read_status) === "1";
          return !isRead;
        })
      : notifications;

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8 text-[#064e3b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <Building2 className="w-4 h-4" /> Issuer Operations Activity
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Issuer Notifications Center
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Real-time compliance audit decisions, milestone outcomes, funding thresholds, and investor pledges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Action Required Badge */}
          {actionRequiredCount > 0 && (
            <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{actionRequiredCount} Action Required</span>
            </div>
          )}

          {/* Unread Counter Badge */}
          <div className="px-4 py-2 rounded-xl bg-white border border-[#059669]/20 text-[#064e3b] text-xs font-bold flex items-center gap-2 shadow-xs">
            <Bell className="w-4 h-4 text-[#059669]" />
            <span>{unreadCount} Unread</span>
          </div>

          {/* Mark All as Read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" /> Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
        {[
          { id: "all", label: "All Notifications" },
          { id: "action_required", label: "Action Required" },
          { id: "compliance", label: "KYB & Bank Review" },
          { id: "project_reviews", label: "Project Audits" },
          { id: "milestones", label: "Milestones" },
          { id: "campaign_funding", label: "Campaign Funding & Pledges" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "bg-[#064e3b] text-white shadow-xs"
                : "bg-white text-[#064e3b] border border-[#059669]/15 hover:bg-emerald-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List Section */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 flex-1">
                {/* Icon box skeleton */}
                <div className="w-10 h-10 rounded-xl bg-emerald-100/60 shrink-0"></div>

                <div className="space-y-2 flex-1">
                  {/* Badges row skeleton */}
                  <div className="flex items-center gap-2">
                    <div className="h-4.5 w-24 bg-emerald-100/70 rounded-full"></div>
                    {i % 2 === 1 && (
                      <div className="h-4.5 w-28 bg-amber-100/80 rounded-full"></div>
                    )}
                  </div>

                  {/* Title skeleton */}
                  <div className="h-5 bg-emerald-900/15 rounded-md w-56 sm:w-80"></div>

                  {/* Message lines skeleton */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="h-3.5 bg-gray-200/80 rounded w-full max-w-xl"></div>
                    <div className="h-3.5 bg-gray-100 rounded w-3/4 max-w-md"></div>
                  </div>

                  {/* Action button skeleton */}
                  {i % 2 === 1 && (
                    <div className="pt-1.5">
                      <div className="h-7 w-28 bg-[#064e3b]/20 rounded-xl"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column skeleton: timestamp & mark read */}
              <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
                <div className="h-3.5 w-20 bg-gray-200 rounded"></div>
                <div className="h-7 w-20 bg-emerald-50 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center text-xs font-semibold">
          {error}
        </div>
      ) : displayedNotifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-200/80 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-emerald-50 text-[#059669] rounded-2xl flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-[#064e3b] text-base">No Notifications Found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {activeTab === "action_required"
              ? "All actions have been completed. You have no pending items requiring action."
              : "No notification events have occurred in this category yet. When reviewer decisions or funding activities occur, they will automatically appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedNotifications.map((item) => {
            const isUnread =
              item.read_status === undefined ||
              item.read_status === null ||
              item.read_status === false ||
              String(item.read_status).toUpperCase() === "FALSE" ||
              String(item.read_status) === "0";
            const isActionRequired = Boolean(
              item.requires_action || item.action_required,
            );

            const details = getTypeDetails(item.type);
            const IconComponent = details.icon;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl bg-white border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
                  isUnread
                    ? isActionRequired
                      ? "border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/20"
                      : "border-l-4 border-l-[#059669] border-[#059669]/20 bg-emerald-50/20"
                    : "border-gray-200 opacity-90"
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${details.iconBg}`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${details.badgeBg}`}
                      >
                        {details.label}
                      </span>

                      {isActionRequired && isUnread && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Action Required
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[#064e3b]">{item.title}</h3>

                    <p className="text-xs text-[#064e3b]/80 leading-relaxed max-w-3xl">
                      {item.message}
                    </p>

                    {/* Action Button: only shown if action is required AND notification is unread (not yet read) */}
                    {isActionRequired && item.action_url && isUnread && (
                      <div className="pt-2">
                        <Link
                          href={item.action_url}
                          onClick={() => handleActionClick(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <span>Take Action</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={() => handleMarkAsRead(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-[#064e3b] font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages} ({totalCount} total events)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-[#064e3b] bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-[#064e3b] bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
