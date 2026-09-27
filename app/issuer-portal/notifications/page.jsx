"use client";

import { useState } from "react";
import {
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  DollarSign,
  FileCheck,
  FileX,
  Building2,
  CheckCheck,
} from "lucide-react";

export default function IssuerNotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      category: "reviewer_decisions",
      title: "Project Audit Approved: Solaris Green Energy Phase II",
      project: "Solaris Green Energy Phase II",
      description: "Platform auditor compliance review completed. Project status updated to Campaign Live.",
      time: "1 hour ago",
      date: "Sep 26, 2026",
      isUnread: true,
      icon: CheckCircle2,
      badgeColor: "bg-emerald-100 text-[#064e3b] border-emerald-200",
    },
    {
      id: 2,
      category: "reviewer_decisions",
      title: "Document Revision Requested: Valuation Report",
      project: "Apex Logistics Tech Hub",
      description: "Reviewer requested updated 2026 Q2 valuation statement certified by independent auditor.",
      time: "3 hours ago",
      date: "Sep 26, 2026",
      isUnread: true,
      icon: FileX,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      id: 3,
      category: "payout_reminders",
      title: "ACTION REQUIRED: Mudarabah Period Profit Report Due",
      project: "Oasis Green Residential SPV",
      description: "Q3 actual period profit report is due for auditor review prior to automated investor distribution payout execution.",
      time: "5 hours ago",
      date: "Sep 26, 2026",
      isUnread: true,
      icon: DollarSign,
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    },
    {
      id: 4,
      category: "underwriter_commitments",
      title: "Class 1 Lead Underwriter Commitment Confirmed",
      project: "Horizon Logistics Terminal",
      description: "Apex Capital Syndicate (Class 1 Institutional) committed $5,000,000 as Lead Underwriter.",
      time: "1 day ago",
      date: "Sep 25, 2026",
      isUnread: false,
      icon: Sparkles,
      badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    },
    {
      id: 5,
      category: "milestone_outcomes",
      title: "Milestone Confirmation Outcome: Groundbreaking Verified",
      project: "Aura Luxury Residences",
      description: "Platform reviewer confirmed municipal inspector sign-off and released tranche custody.",
      time: "2 days ago",
      date: "Sep 24, 2026",
      isUnread: false,
      icon: Layers,
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    },
    {
      id: 6,
      category: "campaign_updates",
      title: "Campaign 100% Fully Funded!",
      project: "Solaris Green Energy Phase II",
      description: "Target goal of $6,000,000 successfully reached from 35 investors.",
      time: "3 days ago",
      date: "Sep 23, 2026",
      isUnread: false,
      icon: CheckCircle2,
      badgeColor: "bg-emerald-100 text-[#064e3b] border-emerald-200",
    },
  ]);

  const handleMarkAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => n.category === activeTab);

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8 text-[#064e3b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <Building2 className="w-4 h-4" /> Issuer Operations Activity
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Issuer Notifications
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Reviewer decisions, milestone confirmations, underwriter commitments, and Mudarabah payout reminders.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-4 py-2 rounded-xl bg-white border border-[#059669]/20 text-[#064e3b] text-xs font-bold flex items-center gap-2 shadow-xs">
            <Bell className="w-4 h-4 text-[#059669]" />
            <span>{unreadCount} Unread Notifications</span>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" /> Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
        {[
          { id: "all", label: "All Events" },
          { id: "reviewer_decisions", label: "Reviewer Decisions" },
          { id: "milestone_outcomes", label: "Milestone Outcomes" },
          { id: "underwriter_commitments", label: "Underwriter Commitments" },
          { id: "payout_reminders", label: "Payout Reminders (Mudarabah)" },
          { id: "campaign_updates", label: "Campaign Updates" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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

      {/* Notification List */}
      <div className="space-y-4">
        {filteredNotifications.map((item) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl bg-white border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
                item.isUnread
                  ? "border-l-4 border-l-[#059669] border-[#059669]/20 bg-emerald-50/20"
                  : "border-gray-200 opacity-90"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.isUnread
                      ? "bg-[#064e3b] text-emerald-300"
                      : "bg-emerald-100 text-[#059669]"
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}
                    >
                      {item.category.replace("_", " ")}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      {item.project}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#064e3b]">{item.title}</h3>
                  <p className="text-xs text-[#064e3b]/80 leading-relaxed max-w-3xl">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.time}</span>
                  </div>
                </div>

                {item.isUnread && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-[#064e3b] font-semibold text-xs transition-colors"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
