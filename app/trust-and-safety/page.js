"use client";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  UserCheck,
  Building2,
  FileCheck2,
  Cpu,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  AlertCircle
} from "lucide-react";

export default function TrustAndSafety() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-[#064e3b] pb-24">
      {/* Header */}
      <section className="bg-diamond-grid-green py-20 lg:py-28 px-4 text-center text-white relative overflow-hidden border-b-[8px] border-[#059669]">
        <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#059669] rounded-full blur-3xl opacity-30 pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold tracking-wide uppercase text-[#34d399]">
            <ShieldCheck className="w-4 h-4" />
            Security & Integrity First
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Trust is Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34d399] to-white">Foundation</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/85 leading-relaxed font-normal">
            We don't just facilitate crowdfunding; we engineer investor security. Explore the rigorous auditing protocols protecting our platform.
          </p>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="max-w-7xl mx-auto px-4 w-full mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (8 cols): Protocol & Escrow */}
          <div className="lg:col-span-8 space-y-8">
            {/* Vetting Protocol Card */}
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-lg border border-[#f2eadb] space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center shadow-md">
                  <FileCheck2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#064e3b]">The 4-Step Vetting Protocol</h2>
                  <p className="text-xs text-[#059669] font-bold uppercase tracking-wider">Mandatory Pre-Listing Audit</p>
                </div>
              </div>

              <p className="text-[#064e3b]/80 text-base leading-relaxed">
                Every project listed on Jade Fortune is subjected to institutional-grade diligence by certified independent issuers before going live.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  {
                    num: "1",
                    title: "Identity Verification (KYC/AML)",
                    desc: "All campaign creators undergo biometric identity checks and PEP/sanction screening.",
                    icon: UserCheck
                  },
                  {
                    num: "2",
                    title: "Corporate Entity Validation",
                    desc: "We verify corporate registration, tax standing, and Ultimate Beneficial Ownership (UBO) structures.",
                    icon: Building2
                  },
                  {
                    num: "3",
                    title: "Independent Financial Audit",
                    desc: "Certified third-party CPAs analyze financial statements, asset health, and valuation projections.",
                    icon: FileText
                  },
                  {
                    num: "4",
                    title: "Technical Feasibility Assessment",
                    desc: "Domain experts inspect product prototypes, IP rights, and manufacturing timelines.",
                    icon: Cpu
                  }
                ].map((item, i) => {
                  const ItemIcon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[#fdfbf7] border border-[#f2eadb]">
                      <div className="w-8 h-8 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                        {item.num}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-[#064e3b] text-base flex items-center gap-2">
                          <ItemIcon className="w-4 h-4 text-[#059669]" />
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#064e3b]/75">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fraud Prevention & Escrow Vault Card */}
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-lg border border-[#f2eadb] space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center shadow-md">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#064e3b]">Fraud Prevention & Smart Escrow</h2>
                  <p className="text-xs text-[#059669] font-bold uppercase tracking-wider">Milestone-Gated Distribution</p>
                </div>
              </div>

              <p className="text-[#064e3b]/80 text-base leading-relaxed">
                Pledged capital is never disbursed blindly. Funds are locked in smart-contract escrow vaults and released incrementally upon verified roadmap milestones.
              </p>

              <div className="bg-gradient-to-br from-[#ecfdf5] to-white p-6 rounded-2xl border border-[#34d399]/40 space-y-2">
                <h3 className="font-bold text-[#059669] text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" /> Milestone Tranche Releases
                </h3>
                <p className="text-xs sm:text-sm text-[#064e3b]/80 leading-relaxed">
                  If a project encounters delays or fails to deliver verified proof to certified issuers, remaining escrow tranches stay locked, protecting backer capital from mismanagement.
                </p>
              </div>
            </div>

            {/* Dispute Resolution Card */}
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-lg border border-[#f2eadb] space-y-4">
              <h2 className="text-2xl font-bold text-[#064e3b]">Dispute Resolution & Governance</h2>
              <p className="text-[#064e3b]/80 text-sm sm:text-base leading-relaxed">
                Should disagreements arise between backers and creators, Jade Fortune provides a formal structured arbitration framework:
              </p>
              <ul className="space-y-3 pt-2">
                <li className="flex items-center gap-3 text-xs sm:text-sm text-[#064e3b]/85 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  14-day direct mediation channel managed by certified issuers.
                </li>
                <li className="flex items-center gap-3 text-xs sm:text-sm text-[#064e3b]/85 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  Backer vote mechanism to freeze escrow disbursements if milestones are contested.
                </li>
                <li className="flex items-center gap-3 text-xs sm:text-sm text-[#064e3b]/85 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  Independent legal arbitration sign-off prior to any refund or final release.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column (4 cols): Badges & Risk Notes */}
          <div className="lg:col-span-4 space-y-8">
            {/* Verification Badges Explanation */}
            <div className="bg-[#064e3b] text-white p-8 rounded-3xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-[#34d399]" /> Verification Seals
              </h3>

              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0 mt-1">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#34d399] text-sm">Identity Verified</h4>
                    <p className="text-xs text-white/75 mt-0.5">Creator entity has passed biometric KYC & AML background checks.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0 mt-1">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#34d399] text-sm">Jade Audited Seal</h4>
                    <p className="text-xs text-white/75 mt-0.5">Financial statements & legal entity verified by certified issuers.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0 mt-1">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#34d399] text-sm">Proven Track Record</h4>
                    <p className="text-xs text-white/75 mt-0.5">Founder has successfully fulfilled 2+ audited campaigns on platform.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Disclosure Box */}
            <div className="bg-[#ecfdf5] border border-[#34d399]/40 p-8 rounded-3xl text-center space-y-4">
              <div className="w-12 h-12 bg-white rounded-2xl text-amber-600 flex items-center justify-center mx-auto shadow-md">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-[#064e3b] text-lg">Understand the Risks</h3>
              <p className="text-xs sm:text-sm text-[#064e3b]/80 leading-relaxed">
                Early-stage investing carries financial risk. We encourage all backers to review audit notes and legal disclosures.
              </p>
              <Link
                href="/faq"
                className="inline-block w-full py-3 bg-white border border-[#059669]/30 text-[#059669] font-bold rounded-2xl hover:bg-gray-50 transition-colors text-xs uppercase tracking-wider shadow-sm cursor-pointer"
              >
                Read Risk & Safety FAQ
              </Link>
            </div>

            {/* Report Issue Box */}
            <div className="bg-white border border-[#f2eadb] p-8 rounded-3xl text-center shadow-md space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="font-bold text-[#064e3b] text-base">Spot Something Suspicious?</h3>
              <p className="text-xs text-[#064e3b]/70">Our community vigilance protects the platform.</p>
              <Link
                href="/contact"
                className="inline-block font-bold text-amber-600 hover:text-amber-700 text-sm underline cursor-pointer"
              >
                Report a project to compliance &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
