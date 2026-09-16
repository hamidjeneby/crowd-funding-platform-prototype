"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  ChevronDown,
  HelpCircle,
  Mail,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  UserCheck,
  Building2,
  Lock
} from "lucide-react";

const faqs = [
  {
    category: "General",
    questions: [
      {
        q: "What is Jade Fortune?",
        a: "Jade Fortune is a premium equity and reward crowdfunding platform that bridges visionary creators and verified backers through rigorous independent issuer auditing and milestone-gated escrow contracts."
      },
      {
        q: "How is Jade Fortune different from traditional platforms?",
        a: "Unlike traditional open platforms, every campaign listed on Jade Fortune undergoes mandatory independent auditing by certified third-party reviewers to verify financial projections, legal compliance, and roadmap feasibility."
      }
    ]
  },
  {
    category: "For Backers",
    questions: [
      {
        q: "Is there a fee for backers to pledge?",
        a: "No. Backers never pay platform fees when pledging or investing in campaigns on Jade Fortune."
      },
      {
        q: "What happens if a project does not reach its target goal?",
        a: "Under the All-or-Nothing funding model, if a campaign fails to hit 100% of its target goal before the deadline, all pledged funds are fully refunded or released from escrow authorization automatically."
      },
      {
        q: "How are my pledged funds protected?",
        a: "Funds are held in secure smart-contract escrow vaults and released to creators in structured tranches only after certified issuers verify deliverable milestone proof."
      }
    ]
  },
  {
    category: "For Creators",
    questions: [
      {
        q: "How much does it cost to launch a project?",
        a: "Launching a campaign is completely free upfront. A standard 5% platform success fee is applied only if your project successfully hits its funding target."
      },
      {
        q: "How long does the issuer audit review take?",
        a: "The independent audit review typically takes between 3 to 10 business days depending on project complexity, entity documentation, and selected audit tier."
      }
    ]
  },
  {
    category: "Payments & Escrow",
    questions: [
      {
        q: "What payment methods are supported?",
        a: "We accept major credit cards, bank wire transfers (recommended for institutional syndicate pledges), and ACH transfers via secure bank-grade gateways."
      },
      {
        q: "When are pledged funds collected?",
        a: "Funds are authorized upon pledging, but are captured and transferred into escrow only when the campaign reaches a successful close."
      }
    ]
  },
  {
    category: "Account & Security",
    questions: [
      {
        q: "How is my identity and financial data protected?",
        a: "We employ 256-bit bank-grade encryption, strict KYC/AML verification protocols, and conform to GDPR and CCPA privacy standards."
      },
      {
        q: "What is the Jade Verified Audit Badge?",
        a: "The Jade Audit Seal is awarded after independent certified issuers verify corporate entity registration, financial projections, and team identity checks."
      }
    ]
  }
];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState("General");
  const [openIndex, setOpenIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter FAQs based on active category or search query
  const displayFaqs = searchQuery.trim()
    ? faqs.flatMap(cat =>
        cat.questions
          .filter(q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) || q.a.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(q => ({ ...q, category: cat.category }))
      )
    : faqs.find(f => f.category === activeCategory)?.questions || [];

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-[#064e3b] pb-24">
      {/* Search Header */}
      <section className="bg-diamond-grid-green py-20 lg:py-28 px-4 text-center text-white relative overflow-hidden border-b-[8px] border-[#059669]">
        <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#059669] rounded-full blur-3xl opacity-30 pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold tracking-wide uppercase text-[#34d399]">
            <HelpCircle className="w-4 h-4" />
            Knowledge Base & Support
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            How Can We <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34d399] to-white">Help You?</span>
          </h1>

          {/* Search Box */}
          <div className="relative max-w-2xl mx-auto mt-6">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-5 h-5 text-[#059669]" />
            </div>
            <input
              type="text"
              placeholder="Search answers (e.g. audit, escrow, fees)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4.5 rounded-2xl text-base sm:text-lg text-[#064e3b] bg-white shadow-2xl focus:outline-none focus:ring-4 focus:ring-[#34d399]/50 border-0 placeholder-gray-400"
            />
          </div>
        </div>
      </section>

      {/* Main FAQ Content */}
      <section className="max-w-5xl mx-auto px-4 w-full mt-16 space-y-8">
        {/* Category Pill Tabs */}
        {!searchQuery.trim() && (
          <div className="bg-white p-2 rounded-2xl shadow-lg border border-[#f2eadb] flex flex-wrap gap-2 justify-center">
            {faqs.map((cat, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveCategory(cat.category);
                  setOpenIndex(0);
                }}
                className={`px-5 py-3 rounded-xl font-bold text-sm sm:text-base transition-all cursor-pointer ${
                  activeCategory === cat.category
                    ? "bg-[#064e3b] text-white shadow-md"
                    : "text-[#064e3b]/70 hover:bg-[#ecfdf5] hover:text-[#064e3b]"
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>
        )}

        {/* FAQ Accordion List */}
        <div className="bg-white rounded-3xl shadow-xl border border-[#f2eadb] p-6 sm:p-10 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h2 className="text-2xl font-bold text-[#064e3b]">
              {searchQuery.trim() ? `Search Results (${displayFaqs.length})` : activeCategory}
            </h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#059669]/20">
              Verified Documentation
            </span>
          </div>

          {displayFaqs.length === 0 ? (
            <div className="text-center py-12 text-[#064e3b]/60 space-y-3">
              <HelpCircle className="w-12 h-12 text-[#059669] mx-auto opacity-40" />
              <p className="text-lg font-bold">No answers found for "{searchQuery}"</p>
              <p className="text-sm">Try searching with broader terms or reach out to our support team.</p>
            </div>
          ) : (
            displayFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                    isOpen ? "border-[#059669]/40 bg-[#ecfdf5]/30 shadow-sm" : "border-gray-100 hover:border-[#059669]/20"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="w-full flex justify-between items-center text-left p-5 font-bold text-[#064e3b] text-base sm:text-lg cursor-pointer"
                  >
                    <span className="pr-4">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#059669] shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-[#064e3b]/80 text-sm sm:text-base leading-relaxed border-t border-[#059669]/10 pt-3">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Support CTA */}
      <section className="max-w-4xl mx-auto px-4 w-full mt-20 text-center">
        <div className="bg-[#ecfdf5] rounded-3xl p-10 sm:p-12 border border-[#34d399]/40 shadow-lg space-y-6">
          <div className="w-14 h-14 bg-white rounded-2xl text-[#059669] flex items-center justify-center mx-auto shadow-md">
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#064e3b]">
            Still Have Unanswered Questions?
          </h2>
          <p className="text-[#064e3b]/75 max-w-md mx-auto text-base">
            Our support specialists and issuer audit team are ready to assist you.
          </p>
          <div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#059669] text-white rounded-2xl font-bold text-base hover:bg-[#047857] transition-all shadow-xl cursor-pointer"
            >
              <span>Contact Support</span>
              <ArrowRight className="w-5 h-5 text-white" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
