"use client";

import { useState } from "react";
import {
  Bell,
  ShieldCheck,
  Flag,
  Megaphone,
  UserCheck,
  Zap,
  CheckCircle,
  Clock,
  Filter
} from "lucide-react";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const notifications = [
    {
      id: 1,
      category: "milestones",
      title: "Milestone Verified: Groundbreaking Complete",
      project: "Aura Luxury Residences",
      description: "Issuer submitted verified drone imagery and municipal inspector sign-off.",
      time: "2 hours ago",
      date: "Sep 14, 2026",
      isUnread: true,
      icon: Flag,
    },
    {
      id: 2,
      category: "campaigns",
      title: "Campaign Closing Alert: Solaris Green Energy",
      project: "Solaris Green Energy Infrastructure",
      description: "Campaign is currently 94% funded and closing in 48 hours.",
      time: "1 day ago",
      date: "Sep 13, 2026",
      isUnread: true,
      icon: Megaphone,
    },
    {
      id: 3,
      category: "kyc",
      title: "Investor Classification Approved: Class 2",
      project: "Platform Compliance",
      description: "Your self-accreditation documentation has been verified by compliance.",
      time: "3 days ago",
      date: "Sep 11, 2026",
      isUnread: false,
      icon: UserCheck,
    },
    {
      id: 4,
      category: "underwriting",
      title: "Exclusive Class 1 Underwriting Opportunity",
      project: "Apex Logistics Tech Hub",
      description: "Early access tranche offered for institutional syndicate lead positions.",
      time: "4 days ago",
      date: "Sep 10, 2026",
      isUnread: false,
      icon: Zap,
    },
    {
      id: 5,
      category: "milestones",
      title: "System Event: Escrow Custody Release Confirmed",
      project: "Solaris Green Energy Infrastructure",
      description: "Escrow release executed following Phase 1 verification.",
      time: "1 week ago",
      date: "Sep 07, 2026",
      isUnread: false,
      icon: Flag,
    },
  ];

  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => n.category === activeTab);

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
            Milestone updates, campaign alerts, compliance approvals, and underwriting offers.
          </p>
        </div>

        {/* Unread Counter Badge */}
        <div className="px-4 py-2 rounded-xl bg-white border border-[#059669]/20 text-[#064e3b] text-xs font-bold flex items-center gap-2 shadow-xs self-start md:self-auto">
          <Bell className="w-4 h-4 text-[#059669]" />
          <span>2 Unread Notifications</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
        {[
          { id: "all", label: "All Events" },
          { id: "milestones", label: "Milestone Updates" },
          { id: "campaigns", label: "Campaign Alerts" },
          { id: "kyc", label: "KYC & Class Status" },
          { id: "underwriting", label: "Underwriting Offers (Class 1)" },
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

      {/* Notification Items List */}
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
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {item.category}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">{item.project}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#064e3b]">{item.title}</h3>
                  <p className="text-xs text-[#064e3b]/75 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-400 font-medium self-end md:self-auto">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
