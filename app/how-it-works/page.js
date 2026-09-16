"use client";
import { useState } from "react";
import Link from "next/link";
import {
  SearchCheck,
  ShieldCheck,
  Lock,
  TrendingUp,
  Award,
  Rocket,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  UserPlus,
  PieChart,
  Briefcase,
  Layers,
  DollarSign,
  Scale,
  Users,
  Building2,
  FileCheck2,
  ArrowUpRight,
} from "lucide-react";

export default function HowItWorks() {
  const [activeTab, setActiveTab] = useState("backers");

  const stepsData = {
    backers: [
      {
        step: 1,
        title: "Discover & Evaluate",
        badge: "Curated Showcase",
        icon: SearchCheck,
        desc: "Browse a curated selection of visionary projects across technology, design, and media. Every project on Jade Fortune passes rigorous institutional-grade audits before listing, so you can inspect financial projections, team history, and Auditor verification notes with complete transparency.",
        highlights: [
          "Pre-vetted financial projections",
          "Audited Auditor verification badge",
          "Transparent risk assessments",
        ],
      },
      {
        step: 2,
        title: "Secure Investment",
        badge: "Escrow Protection",
        icon: Lock,
        desc: "Pledge capital safely to campaigns you believe in. Your funds are protected in milestone-gated smart contract escrow and are only released if the campaign reaches its verified funding target. Choose between reward perks or equity stakes based on project structure.",
        highlights: [
          "Smart contract escrow vault",
          "All-or-nothing protection",
          "Flexible reward or equity allocation",
        ],
      },
      {
        step: 3,
        title: "Execution & Returns",
        badge: "Milestone Payouts",
        icon: TrendingUp,
        desc: "Receive real-time progress updates as Creators execute their roadmap. When milestones are completed and verified by Auditors, funds release incrementally. When projects generate dividends or product rewards, smart contracts route payouts directly to your wallet.",
        highlights: [
          "Audited milestone verification",
          "Direct automated returns",
          "Real-time Creator updates",
        ],
      },
      {
        step: 4,
        title: "Track & Reinvest",
        badge: "Portfolio Growth",
        icon: Award,
        desc: "Monitor your growing portfolio through our investor dashboard. Track dividend distribution history, capital growth metrics, and reinvest your returns into new high-potential projects within the Jade Fortune ecosystem.",
        highlights: [
          "Unified investor portfolio analytics",
          "Automated tax & tax-free reporting",
          "Reinvestment compounding options",
        ],
      },
    ],
    creators: [
      {
        step: 1,
        title: "Submission & Diligence",
        badge: "Auditor Review",
        icon: FileCheck2,
        desc: "Submit your campaign pitch, financial roadmap, and technical specs. Before going live, independent certified Auditors evaluate your project to verify feasibility, legal compliance, and team credentials, earning you the Jade Audit Seal.",
        highlights: [
          "Certified Auditor review team",
          "Clear compliance checklist",
          "Jade Verified Audit Seal",
        ],
      },
      {
        step: 2,
        title: "Campaign & Funding",
        badge: "Global Backer Access",
        icon: Rocket,
        desc: "Launch your campaign to thousands of verified retail backers, angels, and institutional syndicates. Engage directly with your community, conduct Q&A sessions, and build momentum around your vision.",
        highlights: [
          "Global investor exposure",
          "Built-in community updates",
          "Escrow milestone security",
        ],
      },
      {
        step: 3,
        title: "Milestone Execution",
        badge: "Tranche Funding",
        icon: CheckCircle2,
        desc: "Upon successful funding, capital is unlocked in structured tranches tied to verifiable milestones. Provide proof of progress to certified Auditors to trigger subsequent fund releases and maintain backer trust.",
        highlights: [
          "Milestone-gated fund releases",
          "Proof of execution workflow",
          "Transparent backer updates",
        ],
      },
      {
        step: 4,
        title: "Scale & Thrive",
        badge: "Ecosystem Growth",
        icon: Building2,
        desc: "Leverage successful funding to scale manufacturing, expand team hiring, and execute market entry. Your early backers become your most loyal brand ambassadors and repeat investors for future rounds.",
        highlights: [
          "Long-term investor relations",
          "Syndicate follow-on capital",
          "Ecosystem partner perks",
        ],
      },
    ],
    auditors: [
      {
        step: 1,
        title: "Application & Verification",
        badge: "Auditor Onboarding",
        icon: ShieldCheck,
        desc: "Apply as a certified independent Auditor on Jade Fortune. Demonstrate your legal, financial, or industry domain expertise to gain accredited audit permissions on the platform.",
        highlights: [
          "Institutional accreditation",
          "Domain expertise verification",
          "Compliance dashboard access",
        ],
      },
      {
        step: 2,
        title: "Due Diligence & Audit",
        badge: "Project Vetting",
        icon: Scale,
        desc: "Review Creator submissions, financial projections, team background checks, and IP rights. Issue formal audit notes and assign risk ratings before projects launch.",
        highlights: [
          "Standardized audit templates",
          "Direct Creator communication",
          "Risk rating methodology",
        ],
      },
      {
        step: 3,
        title: "Milestone Verification",
        badge: "Tranche Sign-Off",
        icon: CheckCircle2,
        desc: "Inspect milestone proof submitted by funded Creators. Verify deliverable completion to authorize smart contract escrow tranche releases to the project team.",
        highlights: [
          "Evidence verification portal",
          "Smart contract release trigger",
          "Ecosystem integrity governance",
        ],
      },
      {
        step: 4,
        title: "Monetization & Reputation",
        badge: "Fee Earnings",
        icon: DollarSign,
        desc: "Earn structured review fees for every completed audit and milestone sign-off while building a verified reviewer track record on the Jade Fortune platform.",
        highlights: [
          "Transparent review fee split",
          "Verified reviewer badge",
          "Ecosystem leadership ranking",
        ],
      },
    ],
  };

  const currentSteps = stepsData[activeTab] || stepsData.backers;

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-[#064e3b] pb-24">
      {/* Hero Header */}
      <section className="bg-diamond-grid-green py-20 lg:py-28 px-4 text-center text-white relative overflow-hidden border-b-[8px] border-[#059669]">
        <div className="absolute top-0 right-1/3 w-[450px] h-[450px] bg-[#059669] rounded-full blur-3xl opacity-30 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] bg-[#34d399] rounded-full blur-3xl opacity-20 pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold tracking-wide uppercase text-[#34d399]">
            <Sparkles className="w-4 h-4" />
            Transparent & Audited Infrastructure
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            How{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34d399] to-white">
              Crowdfunding Works
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/85 leading-relaxed font-normal">
            Understanding the complete lifecycle of a secure, audited, and
            milestone-governed campaign on Jade Fortune.
          </p>
        </div>
      </section>

      {/* Audience Role Selector Tabs */}
      <section className="max-w-2xl mx-auto px-4 w-full -mt-8 relative z-20">
        <div className="bg-white p-2 rounded-2xl sm:rounded-full shadow-xl border border-[#059669]/20 flex flex-col sm:flex-row gap-2">
          {[
            { id: "backers", label: "For Backers", icon: ShieldCheck },
            { id: "creators", label: "For Creators", icon: Rocket },
            { id: "auditors", label: "For Auditors", icon: Scale },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-5 rounded-xl sm:rounded-full font-bold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-[#064e3b] text-white shadow-lg"
                    : "text-[#064e3b]/70 hover:bg-[#ecfdf5] hover:text-[#064e3b]"
                }`}
              >
                <TabIcon
                  className={`w-4 h-4 ${isActive ? "text-[#34d399]" : "text-[#059669]"}`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Step Progress Header */}
      <section className="max-w-7xl mx-auto px-4 w-full mt-16">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-[#059669] uppercase tracking-widest bg-[#ecfdf5] px-3.5 py-1.5 rounded-full border border-[#059669]/20">
            {activeTab === "backers"
              ? "Backer Journey"
              : activeTab === "creators"
                ? "Creator Lifecycle"
                : "Auditor Governance"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064e3b] mt-3">
            4-Step Process Guide
          </h2>
        </div>

        {/* Timeline Grid */}
        <div className="space-y-8">
          {currentSteps.map((stepItem, index) => {
            const StepIcon = stepItem.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-3xl p-6 sm:p-10 shadow-lg shadow-[#059669]/5 border border-[#f2eadb] relative overflow-hidden group hover:shadow-2xl hover:border-[#059669]/30 transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                {/* Visual Icon Box */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-gradient-to-br from-[#fdfbf7] to-[#ecfdf5] border border-[#059669]/15 group-hover:border-[#059669]/30 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-[#064e3b] text-[#34d399] flex items-center justify-center shadow-lg shadow-[#064e3b]/20 mb-4 group-hover:scale-110 transition-transform">
                    <StepIcon className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold text-[#059669] uppercase tracking-wider mb-1">
                    Step 0{stepItem.step} of 04
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white text-[#064e3b] border border-[#059669]/20 shadow-sm">
                    {stepItem.badge}
                  </span>
                </div>

                {/* Narrative Detail Box */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#059669] text-white font-bold flex items-center justify-center text-sm shadow-md">
                      {stepItem.step}
                    </span>
                    <h3 className="text-2xl font-bold text-[#064e3b]">
                      {stepItem.title}
                    </h3>
                  </div>

                  <p className="text-[#064e3b]/80 leading-relaxed text-base sm:text-lg font-normal">
                    {stepItem.desc}
                  </p>

                  {/* Highlights Bullet List */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {stepItem.highlights.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs font-semibold text-[#064e3b]/90 bg-[#ecfdf5] p-2.5 rounded-xl border border-[#059669]/15"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#059669] flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Funding Models & Fee Transparency */}
      <section className="max-w-7xl mx-auto px-4 w-full mt-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ecfdf5] border border-[#059669]/20 text-[#059669] text-xs font-bold uppercase tracking-wider mb-3">
            <Scale className="w-3.5 h-3.5" /> Fair & Transparent Terms
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064e3b]">
            Funding Models & Governance
          </h2>
          <p className="text-base text-[#064e3b]/70 mt-2">
            Engineered to protect investor capital while providing flexible
            options for Creators.
          </p>
          <div className="w-20 h-1 bg-[#059669] mx-auto rounded-full mt-6"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Card 1 */}
          <div className="bg-white p-8 rounded-3xl border border-[#f2eadb] shadow-md hover:shadow-xl hover:border-[#059669]/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#064e3b] mb-3">
              All-or-Nothing vs. Flexible
            </h3>
            <p className="text-sm text-[#064e3b]/75 leading-relaxed">
              Creators select All-or-Nothing (funds collected only when the goal
              is achieved) or Flexible funding with milestone tranche releases.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-8 rounded-3xl border border-[#f2eadb] shadow-md hover:shadow-xl hover:border-[#059669]/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center mb-6">
              <PieChart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#064e3b] mb-3">
              Reward Perks vs. Equity
            </h3>
            <p className="text-sm text-[#064e3b]/75 leading-relaxed">
              Backers can pledge in exchange for physical rewards/early products
              or structured equity shares with dividend potential.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-8 rounded-3xl border border-[#f2eadb] shadow-md hover:shadow-xl hover:border-[#059669]/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#064e3b] mb-3">
              Auditor Due Diligence
            </h3>
            <p className="text-sm text-[#064e3b]/75 leading-relaxed">
              Independent certified reviewers check legal entity status, bank
              accounts, and roadmap deliverables before listing.
            </p>
          </div>
        </div>

        {/* Transparent Pricing Card */}
        <div className="bg-gradient-to-br from-[#064e3b] to-[#047857] p-8 sm:p-12 rounded-3xl text-white shadow-2xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#34d399] text-xs font-bold uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5" /> No Hidden Fees
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold">
              Zero Pledge Fees for Backers
            </h3>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Backers never pay platform fees. Creators pay a straightforward,
              competitive fee only upon successful campaign funding.
            </p>
          </div>

          <Link
            href="/pricing"
            className="px-8 py-4 bg-white text-[#064e3b] rounded-2xl font-extrabold text-base hover:bg-[#ecfdf5] active:scale-95 transition-all shadow-xl flex items-center gap-2 whitespace-nowrap cursor-pointer flex-shrink-0"
          >
            <span>View Pricing Schedule</span>
            <ArrowUpRight className="w-5 h-5 text-[#064e3b]" />
          </Link>
        </div>
      </section>

      {/* FAQ & CTA */}
      <section className="max-w-5xl mx-auto px-4 w-full mt-24">
        <div className="bg-[#064e3b] rounded-3xl p-10 sm:p-16 text-center text-white relative overflow-hidden shadow-2xl bg-diamond-grid-green">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#059669] rounded-full filter blur-3xl opacity-40 pointer-events-none"></div>

          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 relative z-10">
            Still Have Questions?
          </h2>
          <p className="text-white/80 mb-10 max-w-xl mx-auto text-base sm:text-lg relative z-10 leading-relaxed">
            Check our comprehensive FAQ for detailed guides on campaign
            creation, escrow safety, and Auditor accreditation.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
            <Link
              href="/faq"
              className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white rounded-2xl font-bold text-base hover:bg-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-5 h-5 text-[#34d399]" />
              <span>Read the FAQ</span>
            </Link>
            <Link
              href="/register"
              className="px-8 py-4 bg-white text-[#064e3b] rounded-2xl font-bold text-base hover:bg-gray-50 shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-5 h-5 text-[#064e3b]" />
              <span>Create an Account</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
