"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  ShieldCheck,
  Flag,
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Building2,
  AlertTriangle,
} from "lucide-react";
import {
  getInvestorNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/actions/notifications";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async (currentPage, tab) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getInvestorNotifications({
        page: currentPage,
        limit: 20,
        typeFilter: tab,
      });

      if (res.success) {
        setNotifications(res.notifications || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.totalCount || 0);
        setTotalUnreadCount(res.totalUnreadCount || 0);
      } else {
        setError(res.error || "Failed to load notifications.");
      }
    } catch (err) {
      setError("An error occurred while fetching notifications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page, activeTab);
  }, [page, activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const handleMarkAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_status: true } : n))
    );
    setTotalUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    setIsSubmitting(true);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_status: true }))
    );
    setTotalUnreadCount(0);
    await markAllNotificationsAsRead();
    setIsSubmitting(false);
  };

  const getTypeDetails = (type) => {
    const cleanType = String(type || "").toLowerCase();
    switch (cleanType) {
      case "campaign_alert":
        return {
          label: "Campaign Alert",
          badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
          iconBg: "bg-amber-500 text-white",
          icon: Clock,
        };
      case "funding_threshold":
      case "funding_threshhold":
        return {
          label: "Funding Threshold",
          badgeBg: "bg-emerald-100 text-[#064e3b] border-emerald-300",
          iconBg: "bg-[#064e3b] text-emerald-300",
          icon: TrendingUp,
        };
      case "conversion_pool":
        return {
          label: "Conversion Pool",
          badgeBg: "bg-teal-100 text-teal-900 border-teal-300",
          iconBg: "bg-teal-600 text-white",
          icon: Sparkles,
        };
      case "milestone":
        return {
          label: "Milestone Update",
          badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-300",
          iconBg: "bg-indigo-600 text-white",
          icon: Layers,
        };
      default:
        return {
          label: "System Notice",
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

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <ShieldCheck className="w-4 h-4" /> Activity Feed
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Notifications Center
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Real-time notifications on campaign deadlines, funding thresholds, conversion pools, and milestones.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Unread Counter Badge */}
          <div className="px-4 py-2 rounded-xl bg-white border border-[#059669]/20 text-[#064e3b] text-xs font-bold flex items-center gap-2 shadow-xs">
            <Bell className="w-4 h-4 text-[#059669]" />
            <span>{totalUnreadCount} Unread Notification{totalUnreadCount === 1 ? "" : "s"}</span>
          </div>

          {/* Mark All Notifications as Read Button */}
          {totalUnreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" /> Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
        {[
          { id: "all", label: "All Notifications" },
          { id: "campaign_alert", label: "Campaign Alerts" },
          { id: "funding_threshold", label: "Funding Thresholds" },
          { id: "conversion_pool", label: "Conversion Pool Alerts" },
          { id: "milestone", label: "Milestones" },
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

      {/* Content Section */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#064e3b] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-500">Loading live notifications...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center text-xs font-semibold">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-200/80 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-emerald-50 text-[#059669] rounded-2xl flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-[#064e3b] text-base">No Notifications Found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            You currently have no notifications in this category. Live alerts generated by campaign deadlines, funding thresholds, conversion pools, and milestones will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {notifications.map((item) => {
              const isUnread =
                item.read_status === undefined ||
                item.read_status === null ||
                String(item.read_status).toUpperCase() === "FALSE" ||
                String(item.read_status) === "0";
              const details = getTypeDetails(item.type);
              const IconComponent = details.icon;
              const projectTitle = item.projects?.title;
              const projectSlug = item.projects?.slug;

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl bg-white border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
                    isUnread
                      ? "border-l-4 border-l-[#059669] border-[#059669]/20 bg-emerald-50/20"
                      : "border-gray-200 opacity-90"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${details.iconBg}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${details.badgeBg}`}
                        >
                          {details.label}
                        </span>

                        {projectTitle && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                            <Building2 className="w-3 h-3 text-[#059669]" />
                            {projectSlug ? (
                              <Link
                                href={`/investor-portal/projects/${projectSlug}`}
                                className="hover:underline text-[#064e3b]"
                              >
                                {projectTitle}
                              </Link>
                            ) : (
                              projectTitle
                            )}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#064e3b]">{item.title}</h3>

                      <p className="text-xs text-[#064e3b]/80 leading-relaxed max-w-3xl">
                        {item.message || item.notification_text || item.description}
                      </p>
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
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-gray-600">
              <div>
                Showing{" "}
                <span className="font-bold text-[#064e3b]">
                  {(page - 1) * 20 + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-[#064e3b]">
                  {Math.min(page * 20, totalCount)}
                </span>{" "}
                of <span className="font-bold text-[#064e3b]">{totalCount}</span> notifications
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#064e3b] font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-[#064e3b] font-bold border border-emerald-200">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#064e3b] font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
