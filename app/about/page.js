"use client";
import Link from "next/link";
import {
  Sparkles,
  Target,
  Compass,
  SearchCheck,
  ShieldCheck,
  Handshake,
  CheckCircle2,
  Users,
  Award,
  ArrowRight,
  Building2,
  ChevronRight
} from "lucide-react";

export default function About() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-[#064e3b] pb-24">
      {/* Header */}
      <section className="bg-diamond-grid-green py-20 lg:py-28 px-4 text-center text-white relative overflow-hidden border-b-[8px] border-[#059669]">
        <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#059669] rounded-full blur-3xl opacity-30 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-[450px] h-[450px] bg-[#34d399] rounded-full blur-3xl opacity-20 pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold tracking-wide uppercase text-[#34d399]">
            <Sparkles className="w-4 h-4" />
            Our Mission & Legacy
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Building the Future of <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34d399] to-white">
              Trust in Crowdfunding
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/85 leading-relaxed font-normal">
            Jade Fortune was founded to bridge the gap between visionary ideas and the security that investors deserve.
          </p>
        </div>
      </section>

      {/* Mission / Vision Cards */}
      <section className="max-w-7xl mx-auto px-4 w-full mt-16 mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#059669] to-[#064e3b] transform rotate-2 rounded-3xl opacity-20 blur-lg group-hover:rotate-1 transition-transform"></div>
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
              alt="Jade Fortune Team Collaborating"
              className="relative z-10 rounded-3xl shadow-xl border border-[#f2eadb] w-full object-cover h-[420px]"
            />
            <div className="absolute -bottom-6 -right-6 z-20 bg-white/95 backdrop-blur-md border border-[#059669]/20 p-4 rounded-2xl shadow-xl hidden sm:flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#064e3b]">100% Audited Projects</p>
                <p className="text-[11px] text-[#059669] font-semibold">Institutional Grade Vetting</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-[#f2eadb] shadow-md hover:border-[#059669]/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-[#064e3b]">Our Mission</h2>
              </div>
              <p className="text-[#064e3b]/80 text-base sm:text-lg leading-relaxed font-normal">
                To democratize access to high-potential early-stage projects while establishing a gold standard of transparency, rigorous auditing, and accountability in the global crowdfunding ecosystem.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#f2eadb] shadow-md hover:border-[#059669]/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
                  <Compass className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-[#064e3b]">Our Vision</h2>
              </div>
              <p className="text-[#064e3b]/80 text-base sm:text-lg leading-relaxed font-normal">
                A world where anyone can confidently back breakthrough innovations, knowing their capital is protected by verifiable data, milestone-gated escrow, and certified reviewer oversight.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-[#064e3b] py-24 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#059669] rounded-full filter blur-3xl opacity-30 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#34d399] rounded-full filter blur-3xl opacity-20 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 w-full relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Our Guiding Principles
            </h2>
            <p className="text-white/80 text-base sm:text-lg">
              The core values shaping every line of code, audit rule, and transaction on Jade Fortune.
            </p>
            <div className="w-20 h-1 bg-[#34d399] mx-auto rounded-full mt-6"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: SearchCheck,
                title: "Radical Transparency",
                desc: "No hidden fees or opaque algorithms. Every decision, audit report, and milestone status is documented and accessible."
              },
              {
                icon: ShieldCheck,
                title: "Uncompromising Security",
                desc: "We prioritize user capital safety above all else, deploying smart contract escrow vaults and certified third-party audits."
              },
              {
                icon: Handshake,
                title: "Mutual Growth",
                desc: "We align incentives across all ecosystem participants. When creators succeed, backers and issuers thrive together."
              }
            ].map((value, i) => {
              const ValueIcon = value.icon;
              return (
                <div
                  key={i}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-xl hover:bg-white/15 transition-all duration-300 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#059669] text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                    <ValueIcon className="w-7 h-7 text-[#34d399]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                  <p className="text-white/80 text-sm leading-relaxed">{value.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline / Story */}
      <section className="max-w-4xl mx-auto px-4 w-full py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064e3b] mb-4">
            Our Journey
          </h2>
          <p className="text-[#064e3b]/70 text-base sm:text-lg">From architectural concept to a global trust platform.</p>
          <div className="w-20 h-1 bg-[#059669] mx-auto rounded-full mt-6"></div>
        </div>

        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#059669]/30 before:to-transparent">
          {/* Milestone 1 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#fdfbf7] bg-[#059669] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white rounded-3xl shadow-md border border-[#f2eadb] hover:shadow-xl transition-all">
              <span className="inline-block text-xs font-bold text-[#059669] uppercase tracking-wider bg-[#ecfdf5] px-3 py-1 rounded-full mb-2 border border-[#059669]/20">
                2024 • The Catalyst
              </span>
              <h3 className="font-bold text-[#064e3b] text-xl mb-2">Architecting Trust</h3>
              <p className="text-[#064e3b]/75 text-sm leading-relaxed">
                Witnessing significant losses in unverified crowdfunding spaces, our founders began designing a trust-first platform with smart contract escrow.
              </p>
            </div>
          </div>

          {/* Milestone 2 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#fdfbf7] bg-[#059669] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white rounded-3xl shadow-md border border-[#f2eadb] hover:shadow-xl transition-all">
              <span className="inline-block text-xs font-bold text-[#059669] uppercase tracking-wider bg-[#ecfdf5] px-3 py-1 rounded-full mb-2 border border-[#059669]/20">
                2025 • Beta Launch
              </span>
              <h3 className="font-bold text-[#064e3b] text-xl mb-2">Issuer Audit Integration</h3>
              <p className="text-[#064e3b]/75 text-sm leading-relaxed">
                Launched the first beta iteration of Jade Fortune with 1,000 verified backers and 50 audited projects under independent reviewer oversight.
              </p>
            </div>
          </div>

          {/* Milestone 3 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#fdfbf7] bg-[#064e3b] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <Sparkles className="w-5 h-5 text-[#34d399]" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-[#064e3b] text-white rounded-3xl shadow-xl border border-[#064e3b]">
              <span className="inline-block text-xs font-bold text-[#34d399] uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full mb-2 border border-white/20">
                Today • Global Scale
              </span>
              <h3 className="font-bold text-white text-xl mb-2">Setting the Standard</h3>
              <p className="text-white/85 text-sm leading-relaxed">
                Expanding globally, scaling institutional syndicate funding, and establishing the gold standard in equity and reward crowdfunding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="bg-white py-24 border-t border-[#059669]/10">
        <div className="max-w-7xl mx-auto px-4 w-full">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064e3b] mb-4">
              Meet the Leadership
            </h2>
            <p className="text-[#064e3b]/70 text-base sm:text-lg">
              Experienced leaders spanning financial auditing, legal compliance, and software engineering.
            </p>
            <div className="w-20 h-1 bg-[#059669] mx-auto rounded-full mt-6"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: "Elena Rostova",
                role: "Chief Executive Officer",
                image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
              },
              {
                name: "Marcus Chen",
                role: "Chief Technical Officer",
                image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
              },
              {
                name: "Sarah Jenkins",
                role: "Head of Auditing & Compliance",
                image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80"
              },
              {
                name: "David Alaba",
                role: "VP of Product Infrastructure",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80"
              }
            ].map((member, i) => (
              <div
                key={i}
                className="bg-[#fdfbf7] p-6 rounded-3xl border border-[#f2eadb] text-center shadow-sm hover:shadow-xl hover:border-[#059669]/30 transition-all duration-300 group"
              >
                <div className="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-4 border-[#059669] shadow-md group-hover:scale-105 transition-transform">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-bold text-[#064e3b] mb-1">{member.name}</h3>
                <p className="text-xs font-semibold text-[#059669] uppercase tracking-wider">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Action CTA */}
      <section className="max-w-5xl mx-auto px-4 w-full mt-24 text-center">
        <div className="bg-[#064e3b] text-white p-10 sm:p-14 rounded-3xl shadow-2xl relative overflow-hidden bg-diamond-grid-green space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Ready to Join Jade Fortune?</h2>
          <p className="text-white/80 max-w-xl mx-auto text-base sm:text-lg">
            Discover verified projects or submit your campaign to our independent audit team.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            <Link
              href="/projects"
              className="px-8 py-4 bg-white text-[#064e3b] rounded-2xl font-bold text-base hover:bg-[#ecfdf5] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Projects</span>
              <ArrowRight className="w-5 h-5 text-[#064e3b]" />
            </Link>
            <Link
              href="/how-it-works"
              className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl font-bold text-base hover:bg-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>How It Works</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
