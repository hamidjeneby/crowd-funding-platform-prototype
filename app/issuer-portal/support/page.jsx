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
  Building2,
  FileText,
} from "lucide-react";

export default function IssuerSupportPage() {
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
      question: "How long does platform auditor review take for new project submissions?",
      answer:
        "Auditor review typically takes 2 to 3 business days once all required KYB documents, balance sheets, valuation reports, and cap tables are uploaded. Any document rejections or changes requested will appear directly on your Issuer Dashboard and Project Management Documents tab.",
    },
    {
      id: 2,
      question: "When are escrow funds released to our settlement bank account?",
      answer:
        "Escrow release occurs following campaign goal completion and verification of system or issuer-defined milestones as specified in your campaign charter. Released funds are transferred directly to your verified corporate bank account.",
    },
    {
      id: 3,
      question: "How do Mudarabah profit reporting distributions work?",
      answer:
        "For Mudarabah contracts, issuers report actual period profits via the Distributions tab in Project Management. The report undergoes reviewer confirmation before payouts are executed automatically to investor wallets.",
    },
    {
      id: 4,
      question: "What happens if we update our corporate bank account or registered address?",
      answer:
        "Modifying corporate KYB address, representative details, or settlement bank information automatically sets your verification status to Pending. Compliance will re-verify the account before new disbursements occur.",
    },
    {
      id: 5,
      question: "How do SPV equity unit conversions get calculated?",
      answer:
        "SPV unit conversions are tracked automatically against investor pledges based on the total convertible pool units allocated in your campaign structure (Class 1-4 investor methodology). You can monitor conversion progress directly in your My Projects dashboard.",
    },
  ];

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.message.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketSuccessMsg(
        `Issuer support ticket #${Math.floor(100000 + Math.random() * 900000)} submitted successfully! Our issuer operations desk will respond within 24 hours.`
      );
      setTicketForm({ subject: "", category: "general", message: "" });
      setTimeout(() => setTicketSuccessMsg(""), 6000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-10 text-[#064e3b]">
      {/* Header */}
      <div className="border-b border-[#059669]/15 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
          <ShieldCheck className="w-4 h-4" /> Issuer Operations Center
        </div>
        <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
          Support & Assistance
        </h1>
        <p className="text-sm text-[#064e3b]/70 mt-0.5">
          Submit support tickets, contact compliance directly, or search our issuer knowledgebase.
        </p>
      </div>

      {/* Top Cards: Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Issuer Operations Email
            </span>
            <div className="font-bold text-[#064e3b] text-sm">issuer.ops@crowdfund.platform</div>
            <div className="text-[11px] text-gray-500">24-hour response SLA</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Issuer Relations Hotline
            </span>
            <div className="font-bold text-[#064e3b] text-sm">+1 (800) 555-ISSUER</div>
            <div className="text-[11px] text-gray-500">Mon-Fri 8:00 AM - 6:00 PM EST</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Escrow & Audit Desk
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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
                <option value="general">General Issuer Inquiry</option>
                <option value="audit">Project Audit & Submission Review</option>
                <option value="banking">Settlement Bank & Verification</option>
                <option value="escrow">Escrow Milestone & Disbursement</option>
                <option value="distributions">Profit Reporting & Distributions</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#064e3b] uppercase mb-1">
                Subject / Project Reference
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Milestone 2 Verification for Solar Project"
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
                    className="w-full p-4 bg-[#fcfaf7] flex items-center justify-between text-left font-bold text-sm text-[#064e3b] hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#059669] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
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
