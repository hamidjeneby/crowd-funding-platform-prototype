"use client";

import { useState } from "react";
import {
  HelpCircle,
  ShieldCheck,
  Mail,
  Phone,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CheckCircle2,
  FileText
} from "lucide-react";

export default function SupportHelpPage() {
  // FAQ Accordion State
  const [openFaqId, setOpenFaqId] = useState(1);

  // Ticket Form State
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "general",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccessMsg, setTicketSuccessMsg] = useState("");

  const faqs = [
    {
      id: 1,
      question: "How do investor classification limits (Class 1, 2, 3) work?",
      answer:
        "Investor classes are regulatory categories based on annual income, net worth, and institutional status. Class 3 Retail investors have annual pledge limits to protect non-accredited individuals, while Class 1 Accredited investors enjoy unlimited allocation access.",
    },
    {
      id: 2,
      question: "What happens when I update my payout bank account details?",
      answer:
        "Updating bank details automatically sets your status to PENDING VERIFICATION. For security and fraud prevention, loading your wallet is paused and pending dividend payouts are held until compliance verifies your new account details.",
    },
    {
      id: 3,
      question: "How are project milestones verified before escrow funds are released?",
      answer:
        "Milestones require dual verification. First, the issuer submits independent third-party evidence (e.g. municipal inspection permits, auditor reports). Once verified by platform administrators, escrow funds are unlocked.",
    },
    {
      id: 4,
      question: "How long does a wallet top-up take to process?",
      answer:
        "Instant wallet top-ups via verified bank rails are credited immediately to your liquid balance so you can participate in active campaign pledges without delay.",
    },
  ];

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.message.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketSuccessMsg(
        `Support ticket #${Math.floor(100000 + Math.random() * 900000)} submitted successfully! Our compliance team will respond within 24 hours.`
      );
      setTicketForm({ subject: "", category: "general", message: "" });
      setTimeout(() => setTicketSuccessMsg(""), 6000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-10">
      {/* Header */}
      <div className="border-b border-[#059669]/15 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
          <ShieldCheck className="w-4 h-4" /> Investor Help Center
        </div>
        <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
          Support & Assistance
        </h1>
        <p className="text-sm text-[#064e3b]/70 mt-0.5">
          Submit support tickets, contact compliance directly, or search our investor knowledgebase.
        </p>
      </div>

      {/* Top Cards: Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Email Support
            </span>
            <div className="font-bold text-[#064e3b] text-sm">support@crowdfund.platform</div>
            <div className="text-[11px] text-gray-500">24-hour response SLA</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center flex-shrink-0">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Investor Desk Hotline
            </span>
            <div className="font-bold text-[#064e3b] text-sm">+1 (800) 555-CROWD</div>
            <div className="text-[11px] text-gray-500">Mon-Fri 9:00 AM - 6:00 PM EST</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Escrow & Compliance Desk
            </span>
            <div className="font-bold text-[#064e3b] text-sm">compliance@crowdfund.platform</div>
            <div className="text-[11px] text-gray-500">Same-day priority review</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Ticket Form & FAQs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Support Ticket Submission Form */}
        <div className="p-6 lg:p-8 rounded-2xl bg-white border border-[#059669]/15 shadow-xs space-y-6">
          <div className="flex items-center gap-2 text-[#064e3b]">
            <MessageSquare className="w-5 h-5 text-[#059669]" />
            <h2 className="text-xl font-bold">Submit a Support Ticket</h2>
          </div>

          {ticketSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{ticketSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#064e3b] uppercase mb-1">
                Category
              </label>
              <select
                value={ticketForm.category}
                onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcfaf7] border border-[#059669]/30 text-[#064e3b] font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]"
              >
                <option value="general">General Inquiry</option>
                <option value="wallet">Wallet & Top Up Assistance</option>
                <option value="banking">Bank Account Verification</option>
                <option value="classification">Investor Class Upgrade</option>
                <option value="milestones">Project Milestone Query</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#064e3b] uppercase mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                placeholder="Brief description of your issue"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcfaf7] border border-[#059669]/30 text-[#064e3b] font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e3b] uppercase mb-1">
                Message Details
              </label>
              <textarea
                rows={5}
                required
                placeholder="Explain what you need assistance with..."
                value={ticketForm.message}
                onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                className="w-full p-3.5 rounded-xl bg-[#fcfaf7] border border-[#059669]/30 text-[#064e3b] font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-bold hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Submit Ticket
            </button>
          </form>
        </div>

        {/* FAQ Accordion Section */}
        <div className="p-6 lg:p-8 rounded-2xl bg-white border border-[#059669]/15 shadow-xs space-y-6">
          <div className="flex items-center gap-2 text-[#064e3b]">
            <HelpCircle className="w-5 h-5 text-[#059669]" />
            <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-xl border border-[#059669]/15 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full p-4 bg-[#fcfaf7] flex items-center justify-between text-left font-bold text-sm text-[#064e3b] hover:bg-emerald-50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#059669] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="p-4 bg-white text-xs text-[#064e3b]/80 leading-relaxed border-t border-gray-100">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
