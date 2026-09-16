"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  Send,
  CheckCircle2,
  HelpCircle,
  Building2,
  ArrowRight
} from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "General Inquiry",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        subject: "General Inquiry",
        message: ""
      });
      setTimeout(() => setSubmitted(false), 6000);
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-[#064e3b] pb-24">
      {/* Header */}
      <section className="bg-diamond-grid-green py-20 lg:py-28 px-4 text-center text-white relative overflow-hidden border-b-[8px] border-[#059669]">
        <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#059669] rounded-full blur-3xl opacity-30 pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold tracking-wide uppercase text-[#34d399]">
            <Sparkles className="w-4 h-4" />
            We're Here to Help
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Get In <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34d399] to-white">Touch</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/85 leading-relaxed font-normal">
            Have questions about campaign auditing, investor portfolios, or platform onboarding? Our specialist team is at your service.
          </p>
        </div>
      </section>

      {/* Main Section */}
      <section className="max-w-6xl mx-auto px-4 w-full mt-16 space-y-12">
        {/* Quick FAQ Banner */}
        <div className="bg-[#ecfdf5] border border-[#34d399]/40 rounded-3xl p-6 text-center shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[#059669] flex items-center justify-center shrink-0 shadow-sm">
              <HelpCircle className="w-5 h-5" />
            </div>
            <p className="text-sm sm:text-base font-semibold text-[#064e3b] text-left">
              Looking for immediate answers to common questions?
            </p>
          </div>
          <Link
            href="/faq"
            className="px-5 py-2.5 bg-[#059669] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#047857] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
          >
            <span>Explore FAQ</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact Details (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h2 className="text-3xl font-extrabold text-[#064e3b]">Contact Information</h2>
              <p className="text-[#064e3b]/70 text-sm mt-1">Reach out through any of our support channels.</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#f2eadb] shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-[#064e3b] text-base">Phone Support</h3>
                  <p className="text-sm font-semibold text-[#059669]">+1 (555) 123-4567</p>
                  <p className="text-xs text-[#064e3b]/60 mt-0.5">Mon–Fri from 8:00 AM to 6:00 PM (EST)</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#f2eadb] shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-[#064e3b] text-base">Email Support</h3>
                  <p className="text-sm font-semibold text-[#059669]">support@jadefortune.com</p>
                  <p className="text-xs text-[#064e3b]/60 mt-0.5">Average response time: within 12 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#f2eadb] shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-[#064e3b] text-base">Headquarters</h3>
                  <p className="text-sm text-[#064e3b]/80">100 Emerald Suite, Financial District</p>
                  <p className="text-xs text-[#064e3b]/60 mt-0.5">New York, NY 10004</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#f2eadb] shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-[#064e3b] text-base">Auditor Support Hours</h3>
                  <p className="text-sm text-[#064e3b]/80">24/7 Verified Escrow Operations</p>
                </div>
              </div>
            </div>

            {/* Issuer Application Banner */}
            <div className="p-6 bg-[#064e3b] text-white rounded-3xl space-y-3 shadow-xl relative overflow-hidden bg-diamond-grid-green">
              <div className="flex items-center gap-2 text-[#34d399] font-bold text-xs uppercase tracking-wider">
                <Building2 className="w-4 h-4" /> Reviewer Accreditation
              </div>
              <h4 className="font-extrabold text-lg text-white">Are You a Certified Issuer?</h4>
              <p className="text-xs text-white/80 leading-relaxed">
                We are expanding our network of accredited financial and legal review partners.
              </p>
              <Link
                href="/how-it-works"
                className="inline-block text-xs font-bold text-[#34d399] hover:underline pt-1 cursor-pointer"
              >
                Apply for Certified Issuer Status &rarr;
              </Link>
            </div>
          </div>

          {/* Contact Message Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-[#f2eadb] space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#064e3b]">Send Us a Message</h2>
              <p className="text-[#064e3b]/70 text-sm mt-1">Fill out the form below and an advisor will be assigned to your query.</p>
            </div>

            {submitted && (
              <div className="p-4 rounded-2xl bg-[#ecfdf5] border border-[#34d399]/40 text-[#059669] font-bold text-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Thank you! Your message has been sent. We will respond within 12 hours.</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#064e3b] uppercase tracking-wider mb-2">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Jane"
                    className="w-full px-4 py-3.5 rounded-xl border border-[#064e3b]/20 bg-[#fdfbf7] text-[#064e3b] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#064e3b] uppercase tracking-wider mb-2">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    className="w-full px-4 py-3.5 rounded-xl border border-[#064e3b]/20 bg-[#fdfbf7] text-[#064e3b] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#064e3b] uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane.doe@example.com"
                  className="w-full px-4 py-3.5 rounded-xl border border-[#064e3b]/20 bg-[#fdfbf7] text-[#064e3b] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#064e3b] uppercase tracking-wider mb-2">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border border-[#064e3b]/20 bg-[#fdfbf7] text-[#064e3b] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-all text-sm cursor-pointer"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Creator Campaign Support">Creator Campaign Support</option>
                  <option value="Backer & Investment Support">Backer & Investment Support</option>
                  <option value="Issuer Accreditation">Issuer Accreditation</option>
                  <option value="Press & Institutional Partnerships">Press & Institutional Partnerships</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#064e3b] uppercase tracking-wider mb-2">Message</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can our team assist you today?"
                  className="w-full px-4 py-3.5 rounded-xl border border-[#064e3b]/20 bg-[#fdfbf7] text-[#064e3b] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-all text-sm resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#064e3b] hover:bg-[#047857] text-white font-bold text-base py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Sending Message...</span>
                ) : (
                  <>
                    <Send className="w-5 h-5 text-[#34d399]" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
