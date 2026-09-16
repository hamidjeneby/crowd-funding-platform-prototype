"use client";
import { useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Sparkles,
  CheckCircle2,
  XCircle,
  Percent,
  Calculator,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  Zap,
  Building2
} from "lucide-react";

export default function Pricing() {
  const [targetRaise, setTargetRaise] = useState(100000);

  // Fee calculation helper: 5% platform fee, 3% processing fee
  const platformFee = Math.round(targetRaise * 0.05);
  const processingFee = Math.round(targetRaise * 0.03);
  const netPayout = targetRaise - platformFee - processingFee;

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-[#064e3b] pb-24">
      {/* Header */}
      <section className="bg-diamond-grid-green py-20 lg:py-28 px-4 text-center text-white relative overflow-hidden border-b-[8px] border-[#059669]">
        <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#059669] rounded-full blur-3xl opacity-30 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-[450px] h-[450px] bg-[#34d399] rounded-full blur-3xl opacity-20 pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold tracking-wide uppercase text-[#34d399]">
            <Sparkles className="w-4 h-4" />
            Transparent Fee Schedule
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Simple, Transparent <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34d399] to-white">
              Pricing & Terms
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/85 leading-relaxed font-normal">
            We only succeed when your campaign succeeds. No hidden charges, zero backer fees, and no surprise overhead.
          </p>
        </div>
      </section>

      {/* Main Fee Breakdown (Creators vs Backers) */}
      <section className="max-w-6xl mx-auto px-4 w-full mt-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl shadow-[#059669]/5 border border-[#f2eadb] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#ecfdf5] rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left: For Creators */}
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ecfdf5] text-[#059669] text-xs font-bold uppercase tracking-wider mb-2">
                  Campaign Founders
                </div>
                <h2 className="text-3xl font-bold text-[#064e3b]">For Creators</h2>
                <p className="text-[#064e3b]/70 text-sm mt-1">
                  Launch your project with zero upfront cost. Fees only apply upon successful raise.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#fdfbf7] border border-[#f2eadb]">
                  <div className="w-12 h-12 rounded-2xl bg-[#059669] text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow-md">
                    5%
                  </div>
                  <div>
                    <h3 className="font-bold text-[#064e3b] text-base">Platform Fee</h3>
                    <p className="text-sm text-[#064e3b]/70">
                      Applied exclusively to successfully funded campaigns. Zero charge if goal is not met.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#fdfbf7] border border-[#f2eadb]">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-md">
                    ~3%
                  </div>
                  <div>
                    <h3 className="font-bold text-[#064e3b] text-base">Payment Processing</h3>
                    <p className="text-sm text-[#064e3b]/70">
                      Standard credit card and payment gateway processing fees ($0.30 per transaction).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#fdfbf7] border border-[#f2eadb]">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-md">
                    Audit
                  </div>
                  <div>
                    <h3 className="font-bold text-[#064e3b] text-base">Issuer Audit Fee</h3>
                    <p className="text-sm text-[#064e3b]/70">
                      Optional reviewer fee paid to certified independent issuers for verified audit badges.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: For Backers */}
            <div className="border-t md:border-t-0 md:border-l border-gray-200 pt-8 md:pt-0 md:pl-12 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ecfdf5] text-[#059669] text-xs font-bold uppercase tracking-wider mb-2">
                  Investors & Donors
                </div>
                <h2 className="text-3xl font-bold text-[#064e3b]">For Backers</h2>
                <p className="text-[#064e3b]/70 text-sm mt-1">
                  Pledge funds without worrying about hidden overhead or subscription costs.
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#ecfdf5] to-white p-8 rounded-3xl border border-[#34d399]/40 shadow-sm text-center">
                <div className="text-5xl font-extrabold text-[#059669] mb-2">
                  0%
                </div>
                <h3 className="font-bold text-[#064e3b] text-xl mb-1">Pledge Fee</h3>
                <p className="text-sm text-[#064e3b]/75">
                  Backers never pay platform fees when pledging on Jade Fortune.
                </p>
              </div>

              <ul className="space-y-3.5">
                <li className="flex items-center gap-3 text-[#064e3b]/85 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                  <span>Free account creation & portfolio tracking</span>
                </li>
                <li className="flex items-center gap-3 text-[#064e3b]/85 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                  <span>Full access to audited financial reports</span>
                </li>
                <li className="flex items-center gap-3 text-[#064e3b]/85 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                  <span>Escrow-protected milestone fund distribution</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Creator Fee Calculator */}
      <section className="max-w-4xl mx-auto px-4 w-full mt-16">
        <div className="bg-[#064e3b] text-white p-8 sm:p-12 rounded-3xl shadow-2xl relative overflow-hidden bg-diamond-grid-green space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#34d399] text-xs font-bold uppercase tracking-wider mb-2">
                <Calculator className="w-4 h-4" /> Interactive Estimator
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold">Calculate Your Net Raise</h2>
            </div>
            <span className="text-xs bg-[#059669] text-white font-bold px-3 py-1.5 rounded-full border border-white/20">
              Instant Estimation
            </span>
          </div>

          <div className="space-y-4 bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white/20">
            <div className="flex justify-between items-center text-sm font-bold">
              <span>Target Funding Goal:</span>
              <span className="text-2xl font-extrabold text-[#34d399]">
                ${targetRaise.toLocaleString()}
              </span>
            </div>

            <input
              type="range"
              min="10000"
              max="1000000"
              step="10000"
              value={targetRaise}
              onChange={(e) => setTargetRaise(Number(e.target.value))}
              className="w-full accent-[#34d399] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-white/70">
              <span>$10,000</span>
              <span>$500,000</span>
              <span>$1,000,000</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/15 text-center sm:text-left">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/70 font-semibold uppercase">5% Platform Fee</p>
                <p className="text-xl font-bold text-white mt-1">-${platformFee.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/70 font-semibold uppercase">~3% Processing</p>
                <p className="text-xl font-bold text-white mt-1">-${processingFee.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-xl bg-[#059669] border border-[#34d399]/40 text-white">
                <p className="text-xs text-[#34d399] font-bold uppercase">Estimated Net Payout</p>
                <p className="text-2xl font-extrabold text-white mt-1">${netPayout.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creator Launch Tier Plans Grid */}
      <section className="max-w-[95%] xl:max-w-[1400px] mx-auto px-4 w-full mt-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064e3b] mb-4">
            Creator Launch Plans
          </h2>
          <p className="text-[#064e3b]/70 text-base sm:text-lg">
            Choose the level of audit diligence and promotional reach suited for your campaign.
          </p>
          <div className="w-20 h-1 bg-[#059669] mx-auto rounded-full mt-6"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 items-stretch">
          {/* Bronze Plan */}
          <div className="bg-white p-6 xl:p-8 rounded-3xl border border-[#f2eadb] shadow-md flex flex-col justify-between hover:shadow-xl hover:border-[#059669]/30 transition-all">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-[#064e3b]">Bronze</h3>
              <p className="text-[#064e3b]/70 text-sm">Perfect for initial community builds and basic raises.</p>
              <div className="text-4xl font-extrabold text-[#064e3b] py-2">
                5% <span className="text-base font-normal text-[#064e3b]/60">success fee</span>
              </div>

              <ul className="space-y-3 pt-2">
                <li className="flex items-center gap-2.5 text-[#064e3b]/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  Basic project listing
                </li>
                <li className="flex items-center gap-2.5 text-[#064e3b]/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  Standard support SLA
                </li>
                <li className="flex items-center gap-2.5 text-gray-400 text-sm">
                  <XCircle className="w-4 h-4 text-gray-300 shrink-0" />
                  Independent Audit Badge
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="mt-8 block w-full py-3.5 px-4 bg-white border-2 border-[#059669] text-[#059669] font-bold text-center rounded-2xl hover:bg-[#ecfdf5] transition-colors cursor-pointer"
            >
              Get Started
            </Link>
          </div>

          {/* Silver Plan */}
          <div className="bg-white p-6 xl:p-8 rounded-3xl border border-[#f2eadb] shadow-md flex flex-col justify-between hover:shadow-xl hover:border-[#059669]/30 transition-all">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-[#064e3b]">Silver</h3>
              <p className="text-[#064e3b]/70 text-sm">For growing creators building a repeat backer audience.</p>
              <div className="text-4xl font-extrabold text-[#064e3b] py-2">
                4.5% <span className="text-base font-normal text-[#064e3b]/60">success fee</span>
              </div>

              <ul className="space-y-3 pt-2">
                <li className="flex items-center gap-2.5 text-[#064e3b]/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  Enhanced project listing
                </li>
                <li className="flex items-center gap-2.5 text-[#064e3b]/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  Priority support response
                </li>
                <li className="flex items-center gap-2.5 text-[#064e3b]/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  Community Q&A tools
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="mt-8 block w-full py-3.5 px-4 bg-white border-2 border-[#059669] text-[#059669] font-bold text-center rounded-2xl hover:bg-[#ecfdf5] transition-colors cursor-pointer"
            >
              Get Started
            </Link>
          </div>

          {/* Gold Plan (Recommended) */}
          <div className="bg-[#064e3b] text-white p-6 xl:p-8 rounded-3xl border border-[#064e3b] shadow-2xl flex flex-col justify-between relative transform lg:-translate-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#34d399] text-[#064e3b] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
              Recommended
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-2xl font-bold text-white">Gold</h3>
              <p className="text-white/80 text-sm">For serious founders wanting maximum backer trust.</p>
              <div className="text-4xl font-extrabold text-white py-2">
                4% <span className="text-base font-normal text-white/70">fee + Audit</span>
              </div>

              <ul className="space-y-3 pt-2">
                <li className="flex items-center gap-2.5 text-white/90 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
                  Everything in Silver
                </li>
                <li className="flex items-center gap-2.5 text-white/90 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
                  Certified Issuer Audit Review
                </li>
                <li className="flex items-center gap-2.5 text-white/90 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
                  Jade Verified Audit Badge
                </li>
                <li className="flex items-center gap-2.5 text-white/90 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
                  Featured Showcase placement
                </li>
              </ul>
            </div>

            <Link
              href="/register"
              className="mt-8 block w-full py-3.5 px-4 bg-[#059669] hover:bg-[#047857] text-white font-bold text-center rounded-2xl transition-all shadow-lg border border-[#34d399]/30 cursor-pointer"
            >
              Start Gold Project
            </Link>
          </div>

          {/* Platinum Plan */}
          <div className="bg-white p-6 xl:p-8 rounded-3xl border border-[#f2eadb] shadow-md flex flex-col justify-between hover:shadow-xl hover:border-[#059669]/30 transition-all">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-[#064e3b]">Platinum</h3>
              <p className="text-[#064e3b]/70 text-sm">For large-scale institutional raises and syndicates.</p>
              <div className="text-4xl font-extrabold text-[#064e3b] py-2">
                Custom
              </div>

              <ul className="space-y-3 pt-2">
                <li className="flex items-center gap-2.5 text-[#064e3b]/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  Dedicated Account Manager
                </li>
                <li className="flex items-center gap-2.5 text-[#064e3b]/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  Custom Smart Contract Terms
                </li>
                <li className="flex items-center gap-2.5 text-[#064e3b]/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  Legal & Entity Structuring
                </li>
              </ul>
            </div>

            <Link
              href="/contact"
              className="mt-8 block w-full py-3.5 px-4 bg-white border-2 border-gray-200 text-gray-700 font-bold text-center rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mt-24 text-center px-4 max-w-4xl mx-auto">
        <div className="bg-white p-10 rounded-3xl border border-[#f2eadb] shadow-xl space-y-6">
          <h2 className="text-3xl font-extrabold text-[#064e3b]">
            Ready to launch your campaign?
          </h2>
          <p className="text-[#064e3b]/70 max-w-lg mx-auto text-base">
            Create an account in minutes and connect with certified issuers to verify your project.
          </p>
          <div className="pt-2">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#064e3b] text-white rounded-2xl font-bold text-base hover:bg-[#047857] transition-all shadow-xl cursor-pointer"
            >
              <span>Explore How It Works</span>
              <ArrowRight className="w-5 h-5 text-white" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
