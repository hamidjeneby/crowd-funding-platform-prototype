"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Rocket,
  SearchCheck,
  Handshake,
  TrendingUp,
  Users,
  Award,
  CheckCircle2,
  Star,
  Sparkles,
  ChevronRight,
  Mail,
  Lock,
  Zap,
  Layers,
  ArrowUpRight,
  Globe,
  Building2
} from "lucide-react";

function useAnimatedCounter(end, duration = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrame;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

function AnimatedNumber({ end, prefix = "", suffix = "" }) {
  const count = useAnimatedCounter(end);
  return (
    <>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeRoleTab, setActiveRoleTab] = useState("all");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setTimeout(() => setNewsletterSubscribed(false), 5000);
      setNewsletterEmail("");
    }
  };

  const projectList = [
    {
      id: "proj-1",
      category: "tech",
      categoryName: "Tech & Hardware",
      title: "NextGen Solar Processor",
      desc: "Revolutionary ultra-low power chip design powered by ambient light for next-gen IoT ecosystem devices.",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
      raised: 125000,
      goal: 100000,
      percentage: 125,
      backers: 1042,
      timeLeft: "4 Days Left",
      isFunded: true,
      issuer: "Quantum Silicon Labs"
    },
    {
      id: "proj-2",
      category: "design",
      categoryName: "Industrial Design",
      title: "The Modular Desk Ecosystem",
      desc: "A completely customizable ergonomic workspace system that dynamically adapts to posture and multi-monitor workflows.",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
      raised: 45000,
      goal: 50000,
      percentage: 90,
      backers: 312,
      timeLeft: "12 Days Left",
      isFunded: false,
      issuer: "ErgoForm Studios"
    },
    {
      id: "proj-3",
      category: "film",
      categoryName: "Film & Media",
      title: "Echoes of Tomorrow",
      desc: "An independent sci-fi feature film exploring ethics, memory synthetic restoration, and human consciousness.",
      image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80",
      raised: 210000,
      goal: 150000,
      percentage: 140,
      backers: 2150,
      timeLeft: "Funded",
      isFunded: true,
      issuer: "Apex Cinema Collective"
    }
  ];

  const filteredProjects = activeCategory === "all" 
    ? projectList 
    : projectList.filter(p => p.category === activeCategory);

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-[#064e3b]">
      {/* Hero Section */}
      <section className="relative pt-24 pb-24 lg:pt-32 lg:pb-36 overflow-hidden bg-dot-pattern">
        {/* Ambient Gradient Background & Blurs */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#ecfdf5]/80 blur-3xl opacity-70 animate-pulse"></div>
          <div className="absolute bottom-10 left-10 w-[420px] h-[420px] rounded-full bg-[#059669]/10 blur-3xl opacity-60"></div>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-[#ecfdf5]/40 via-white to-[#059669]/5 blur-2xl rounded-full"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline & Action */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 border border-[#059669]/20 shadow-sm backdrop-blur-md transition-all hover:border-[#059669]/40 hover:shadow-md">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#059669]"></span>
                </span>
                <span className="text-xs sm:text-sm font-bold tracking-wide text-[#064e3b] uppercase">
                  The Standard in Equity & Project Crowdfunding
                </span>
                <Sparkles className="w-4 h-4 text-[#059669]" />
              </div>

              {/* Main Title */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                Empower the Future with <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#059669] via-[#047857] to-[#064e3b] relative">
                  Jade Fortune
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#059669]/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q 50 0 100 15" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-xl text-[#064e3b]/80 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal pt-2">
                Discover, evaluate, and back transformative campaigns. A transparent, high-integrity platform uniting visionary creators, verified issuers, and discerning investors.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4 pt-4">
                <Link
                  href="/projects"
                  className="w-full sm:w-auto px-8 py-4 bg-[#064e3b] border-b-[4px] border-[#022c22] text-white rounded-2xl font-bold text-lg hover:bg-[#047857] hover:brightness-110 active:translate-y-[2px] active:border-b-[2px] transition-all duration-150 shadow-xl shadow-[#064e3b]/20 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Browse Projects</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="w-full sm:w-auto px-8 py-4 bg-white/90 backdrop-blur-md text-[#064e3b] border border-[#059669]/25 border-b-[4px] border-b-[#e5dccb] rounded-2xl font-bold text-lg hover:bg-[#ecfdf5] hover:border-[#059669]/40 active:translate-y-[2px] active:border-b-[2px] transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-[#059669]" />
                  <span>Start a Project</span>
                </Link>
              </div>

              {/* Security & Verification Chips */}
              <div className="pt-6 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs sm:text-sm font-semibold text-[#064e3b]/70">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#059669]" />
                  <span>Institutional Due Diligence</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#059669]" />
                  <span>Escrow-Protected Funds</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  <span>100% Audited Issuers</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Statistics & Floating Live Badge */}
            <div className="lg:col-span-5 relative mt-8 lg:mt-0">
              {/* Floating Activity Toast */}
              <div className="absolute -top-6 -left-4 z-20 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/90 backdrop-blur-xl border border-[#059669]/20 shadow-xl animate-float">
                <div className="w-9 h-9 rounded-xl bg-[#ecfdf5] flex items-center justify-center text-[#059669]">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#064e3b]">Live Activity</p>
                  <p className="text-xs text-[#064e3b]/70 font-medium">+$2,500 pledged to Solar Tech</p>
                </div>
              </div>

              {/* Main Stats Card Container */}
              <div className="relative z-10 bg-white/80 backdrop-blur-xl border border-[#059669]/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-[#064e3b]/10 space-y-6">
                <div className="flex items-center justify-between border-b border-[#059669]/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#059669]" />
                    <span className="text-sm font-bold text-[#064e3b] uppercase tracking-wider">Platform Performance</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#ecfdf5] text-[#059669] font-bold border border-[#059669]/20">Verified Real-time</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Stat Card 1 */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-white to-[#fdfbf7] border border-[#059669]/15 shadow-sm hover:shadow-md hover:border-[#059669]/30 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] text-[#059669] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-extrabold text-[#059669] tracking-tight">
                      <AnimatedNumber end={50} prefix="$" suffix="M+" />
                    </p>
                    <p className="text-xs font-bold text-[#064e3b]/70 uppercase tracking-wider mt-1">
                      Total Raised
                    </p>
                  </div>

                  {/* Stat Card 2 */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-white to-[#fdfbf7] border border-[#059669]/15 shadow-sm hover:shadow-md hover:border-[#059669]/30 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] text-[#059669] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Rocket className="w-4 h-4" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-extrabold text-[#059669] tracking-tight">
                      <AnimatedNumber end={1200} suffix="+" />
                    </p>
                    <p className="text-xs font-bold text-[#064e3b]/70 uppercase tracking-wider mt-1">
                      Projects Funded
                    </p>
                  </div>

                  {/* Stat Card 3 */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-white to-[#fdfbf7] border border-[#059669]/15 shadow-sm hover:shadow-md hover:border-[#059669]/30 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] text-[#059669] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-extrabold text-[#059669] tracking-tight">
                      <AnimatedNumber end={250} suffix="k+" />
                    </p>
                    <p className="text-xs font-bold text-[#064e3b]/70 uppercase tracking-wider mt-1">
                      Happy Backers
                    </p>
                  </div>

                  {/* Stat Card 4 */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-white to-[#fdfbf7] border border-[#059669]/15 shadow-sm hover:shadow-md hover:border-[#059669]/30 transition-all duration-200 group">
                    <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] text-[#059669] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-extrabold text-[#059669] tracking-tight">
                      <AnimatedNumber end={100} suffix="%" />
                    </p>
                    <p className="text-xs font-bold text-[#064e3b]/70 uppercase tracking-wider mt-1">
                      Audited Projects
                    </p>
                  </div>
                </div>

                {/* Bottom Trust Note */}
                <div className="pt-2 flex items-center justify-between text-xs text-[#064e3b]/60 border-t border-[#059669]/10">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Lock className="w-3.5 h-3.5 text-[#059669]" /> Bank-grade Encryption
                  </span>
                  <span className="font-semibold text-[#059669]">SEC Compliance Ready</span>
                </div>
              </div>

              {/* Floating Bottom Card */}
              <div className="absolute -bottom-6 -right-4 z-20 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#064e3b] text-white shadow-xl animate-float-delayed">
                <div className="w-8 h-8 rounded-full bg-[#059669] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold">100% Issuer Vetted</p>
                  <p className="text-[11px] text-white/80">Every campaign pre-audited</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Press & Media Infinite Marquee Section */}
      <section className="py-10 bg-white border-y border-[#059669]/15 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs sm:text-sm font-bold text-[#064e3b]/50 uppercase tracking-widest mb-6">
            Recognized by global financial & technology media
          </p>

          <div className="relative w-full overflow-hidden">
            {/* Fade Gradients on edges */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            <div className="animate-marquee flex items-center gap-12 sm:gap-20 opacity-70 hover:opacity-100 transition-opacity">
              <span className="text-2xl font-bold font-serif tracking-tight text-[#064e3b] cursor-default hover:text-[#059669] transition-colors">Forbes</span>
              <span className="text-2xl font-black font-sans tracking-tighter text-[#064e3b] cursor-default hover:text-[#059669] transition-colors">TechCrunch</span>
              <span className="text-2xl font-bold font-mono tracking-widest text-[#064e3b] cursor-default hover:text-[#059669] transition-colors">WIRED</span>
              <span className="text-2xl font-extrabold font-sans italic text-[#064e3b] cursor-default hover:text-[#059669] transition-colors">Bloomberg</span>
              <span className="text-2xl font-semibold font-serif tracking-normal text-[#064e3b] cursor-default hover:text-[#059669] transition-colors">Wall Street Journal</span>
              <span className="text-2xl font-bold font-sans tracking-wide text-[#064e3b] cursor-default hover:text-[#059669] transition-colors">Financial Times</span>
              {/* Duplicate set for seamless continuous marquee */}
              <span className="text-2xl font-bold font-serif tracking-tight text-[#064e3b] cursor-default hover:text-[#059669] transition-colors">Forbes</span>
              <span className="text-2xl font-black font-sans tracking-tighter text-[#064e3b] cursor-default hover:text-[#059669] transition-colors">TechCrunch</span>
              <span className="text-2xl font-bold font-mono tracking-widest text-[#064e3b] cursor-default hover:text-[#059669] transition-colors">WIRED</span>
              <span className="text-2xl font-extrabold font-sans italic text-[#064e3b] cursor-default hover:text-[#059669] transition-colors">Bloomberg</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Ecosystem Section */}
      <section className="py-24 bg-[#fffcf8] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ecfdf5] border border-[#059669]/20 text-[#059669] text-xs font-bold uppercase tracking-wider mb-4">
              <Layers className="w-3.5 h-3.5" />
              Multi-Stakeholder Ecosystem
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#064e3b] tracking-tight mb-4">
              Why Choose Jade Fortune?
            </h2>
            <p className="text-lg text-[#064e3b]/70 leading-relaxed">
              A purpose-built crowdfunding infrastructure engineered to align security, returns, and execution for all participants.
            </p>
            <div className="w-20 h-1 bg-gradient-to-r from-[#059669] to-[#064e3b] mx-auto rounded-full mt-6"></div>
          </div>

          {/* Interactive Ecosystem Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* For Backers */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-lg shadow-[#059669]/5 border border-[#f2eadb] relative overflow-hidden group hover:shadow-xl hover:border-[#059669]/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#ecfdf5] rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 pointer-events-none"></div>
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-[#059669] text-white flex items-center justify-center shadow-lg shadow-[#059669]/20 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#064e3b]">For Backers</h3>
                  <p className="text-xs text-[#059669] font-semibold uppercase tracking-wider">Investors & Donors</p>
                </div>
              </div>

              <ul className="space-y-4 relative z-10">
                <li className="flex items-start gap-3.5 text-[#064e3b]/85">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-[#064e3b] font-bold">Rigorous Auditing:</strong> Every campaign undergoes institutional-grade financial and legal vetting.
                  </span>
                </li>
                <li className="flex items-start gap-3.5 text-[#064e3b]/85">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-[#064e3b] font-bold">High-Yield Opportunities:</strong> Gain curated early access to high-potential equity and reward projects.
                  </span>
                </li>
                <li className="flex items-start gap-3.5 text-[#064e3b]/85">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-[#064e3b] font-bold">Transparent Escrow Tracking:</strong> Monitor your capital allocations with real-time milestone dashboards.
                  </span>
                </li>
              </ul>
            </div>

            {/* For Creators */}
            <div className="bg-[#064e3b] text-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-[#064e3b]/20 border border-[#064e3b] relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#059669] rounded-bl-full -mr-10 -mt-10 opacity-30 transition-transform group-hover:scale-110 pointer-events-none"></div>

              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white text-[#064e3b] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Rocket className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">For Creators</h3>
                  <p className="text-xs text-[#34d399] font-semibold uppercase tracking-wider">Innovators & Founders</p>
                </div>
              </div>

              <ul className="space-y-4 relative z-10">
                <li className="flex items-start gap-3.5 text-white/90">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#059669]/40 text-[#34d399] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-white font-bold">Flexible Funding Models:</strong> All-or-nothing or milestone-based structures customized for project scale.
                  </span>
                </li>
                <li className="flex items-start gap-3.5 text-white/90">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#059669]/40 text-[#34d399] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-white font-bold">Global Network Access:</strong> Pitch directly to thousands of verified retail and institutional backers.
                  </span>
                </li>
                <li className="flex items-start gap-3.5 text-white/90">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#059669]/40 text-[#34d399] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-white font-bold">Issuer Verification Seal:</strong> Earn verified badge status to build instant trust with potential backers.
                  </span>
                </li>
              </ul>
            </div>

            {/* For Issuers */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-lg shadow-[#059669]/5 border border-[#f2eadb] relative overflow-hidden group hover:shadow-xl hover:border-[#059669]/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#ecfdf5] rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 pointer-events-none"></div>

              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-[#059669] text-white flex items-center justify-center shadow-lg shadow-[#059669]/20 group-hover:scale-105 transition-transform">
                  <SearchCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#064e3b]">For Issuers</h3>
                  <p className="text-xs text-[#059669] font-semibold uppercase tracking-wider">Reviewers & Auditors</p>
                </div>
              </div>

              <ul className="space-y-4 relative z-10">
                <li className="flex items-start gap-3.5 text-[#064e3b]/85">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-[#064e3b] font-bold">Monetize Review Expertise:</strong> Earn auditing and diligence fees by verifying campaign viability.
                  </span>
                </li>
                <li className="flex items-start gap-3.5 text-[#064e3b]/85">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-[#064e3b] font-bold">Institutional Reputation:</strong> Build a verified reviewer track record on a high-trust platform.
                  </span>
                </li>
                <li className="flex items-start gap-3.5 text-[#064e3b]/85">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#ecfdf5] text-[#059669] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-[#064e3b] font-bold">Quality Governance:</strong> Shape ecosystem standards by approving compliant projects.
                  </span>
                </li>
              </ul>
            </div>

            {/* For Partners */}
            <div className="bg-[#064e3b] text-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-[#064e3b]/20 border border-[#064e3b] relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#059669] rounded-bl-full -mr-10 -mt-10 opacity-30 transition-transform group-hover:scale-110 pointer-events-none"></div>

              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white text-[#064e3b] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Handshake className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">For Partners</h3>
                  <p className="text-xs text-[#34d399] font-semibold uppercase tracking-wider">Syndicates & Funds</p>
                </div>
              </div>

              <ul className="space-y-4 relative z-10">
                <li className="flex items-start gap-3.5 text-white/90">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#059669]/40 text-[#34d399] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-white font-bold">Syndicate Co-Funding:</strong> Co-invest alongside leading angel syndicates and venture funds.
                  </span>
                </li>
                <li className="flex items-start gap-3.5 text-white/90">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#059669]/40 text-[#34d399] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-white font-bold">Exclusive Deal Flow:</strong> Early access to top-tier, pre-audited technology and energy initiatives.
                  </span>
                </li>
                <li className="flex items-start gap-3.5 text-white/90">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#059669]/40 text-[#34d399] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-base">
                    <strong className="text-white font-bold">Custom Deal Structures:</strong> Negotiate equity splits, revenue shares, and milestone terms.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Connected Timeline */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064e3b] mb-4">
              How It Works
            </h2>
            <p className="text-base sm:text-lg text-[#064e3b]/70">
              Four streamlined steps connecting creators with capital under smart milestone governance.
            </p>
            <div className="w-20 h-1 bg-[#059669] mx-auto rounded-full mt-6"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {[
              {
                step: "01",
                icon: SearchCheck,
                title: "Discover",
                desc: "Explore a curated showcase of audited, high-potential projects across tech, design, and media.",
              },
              {
                step: "02",
                icon: ShieldCheck,
                title: "Audit & Review",
                desc: "Certified issuers perform legal, financial, and technical due diligence before listing.",
              },
              {
                step: "03",
                icon: Lock,
                title: "Secure Funding",
                desc: "Backers commit funds safely into milestone-gated escrow contracts.",
              },
              {
                step: "04",
                icon: TrendingUp,
                title: "Execute & Return",
                desc: "Funds release upon verified milestones, delivering returns directly to backers.",
              },
            ].map((item, index) => {
              const StepIcon = item.icon;
              return (
                <div
                  key={index}
                  className="relative z-10 bg-gradient-to-b from-white to-[#fdfbf7] border border-[#f2eadb] p-8 rounded-3xl shadow-sm text-center group hover:shadow-xl hover:border-[#059669]/30 transition-all duration-300"
                >
                  <div className="w-16 h-16 bg-[#064e3b] text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-lg shadow-[#064e3b]/20 group-hover:bg-[#059669] group-hover:scale-110 transition-all duration-300">
                    <StepIcon className="w-8 h-8 text-[#34d399]" />
                  </div>
                  <span className="inline-block text-xs font-bold text-[#059669] uppercase tracking-widest bg-[#ecfdf5] px-3 py-1 rounded-full mb-3 border border-[#059669]/20">
                    Step {item.step}
                  </span>
                  <h3 className="text-xl font-bold text-[#064e3b] mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#064e3b]/70 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 font-bold text-[#059669] hover:text-[#064e3b] text-lg transition-colors group cursor-pointer"
            >
              <span>Explore full workflow documentation</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Projects Showcase with Interactive Category Tabs */}
      <section className="py-24 bg-[#fdfbf7] relative border-y border-[#059669]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ecfdf5] border border-[#059669]/20 text-[#059669] text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Curated Opportunities
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064e3b]">
                Featured Projects
              </h2>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white border border-[#059669]/15 shadow-sm">
              {[
                { id: "all", label: "All Projects" },
                { id: "tech", label: "Tech & Hardware" },
                { id: "design", label: "Design" },
                { id: "film", label: "Film & Media" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    activeCategory === tab.id
                      ? "bg-[#064e3b] text-white shadow-md"
                      : "text-[#064e3b]/70 hover:text-[#064e3b] hover:bg-[#ecfdf5]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-3xl overflow-hidden shadow-md shadow-[#059669]/5 border border-[#f2eadb] group hover:shadow-2xl hover:border-[#059669]/30 transition-all duration-300 flex flex-col"
              >
                {/* Image & Badge */}
                <div className="h-52 overflow-hidden relative">
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-[#064e3b] text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-sm border border-[#059669]/20 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#059669]" />
                    {project.categoryName}
                  </div>
                  {project.isFunded && (
                    <div className="absolute top-4 right-4 bg-[#059669] text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-sm flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Funded
                    </div>
                  )}
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-xs text-[#059669] font-bold mb-1">By {project.issuer}</div>
                    <h3 className="text-xl font-bold text-[#064e3b] mb-2 group-hover:text-[#059669] transition-colors line-clamp-1">
                      {project.title}
                    </h3>
                    <p className="text-[#064e3b]/70 text-sm line-clamp-2 leading-relaxed">
                      {project.desc}
                    </p>
                  </div>

                  {/* Progress Bar & Amounts */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-baseline text-sm">
                      <span className="font-extrabold text-[#059669] text-base">${project.raised.toLocaleString()}</span>
                      <span className="text-[#064e3b]/60 text-xs font-semibold">of ${project.goal.toLocaleString()} goal</span>
                    </div>

                    <div className="w-full h-2.5 bg-[#ecfdf5] rounded-full overflow-hidden border border-[#059669]/10">
                      <div
                        className="h-full bg-gradient-to-r from-[#059669] to-[#34d399] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(project.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="flex justify-between items-center text-xs font-semibold text-[#064e3b]/70 border-t border-gray-100 pt-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#059669]" /> {project.backers.toLocaleString()} Backers
                    </span>
                    <span className={`font-bold ${project.isFunded ? "text-[#059669]" : "text-amber-600"}`}>
                      {project.timeLeft}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#064e3b] text-white rounded-2xl font-bold text-base hover:bg-[#047857] transition-all shadow-lg hover:shadow-xl cursor-pointer"
            >
              <span>Explore All Verified Projects</span>
              <ArrowUpRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Success Stories & Testimonials Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#064e3b] mb-4">
              Success Stories
            </h2>
            <p className="text-base sm:text-lg text-[#064e3b]/70">
              Trusted by founders, angel investors, and verified auditing partners.
            </p>
            <div className="w-20 h-1 bg-[#059669] mx-auto rounded-full mt-6"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Review 1 */}
            <div className="bg-[#fdfbf7] p-8 rounded-3xl border border-[#f2eadb] relative flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-[#059669]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-base text-[#064e3b]/85 italic leading-relaxed">
                  "Jade Fortune made our funding round seamless. Not only did we surpass our goal in 10 days, but the auditing seal gave our backers maximum confidence."
                </p>
              </div>

              <div className="flex items-center gap-4 pt-6 mt-6 border-t border-[#059669]/10">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
                  alt="Sarah Jenkins"
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#059669]"
                />
                <div>
                  <h4 className="font-bold text-[#064e3b]">Sarah Jenkins</h4>
                  <p className="text-xs font-semibold text-[#059669]">Founder, Modular Desk</p>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="bg-[#fdfbf7] p-8 rounded-3xl border border-[#f2eadb] relative flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-[#059669]/30 transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-base text-[#064e3b]/85 italic leading-relaxed">
                  "As an investor, transparency is non-negotiable. The milestone-gated escrow contracts and verified reports make this platform my top choice."
                </p>
              </div>

              <div className="flex items-center gap-4 pt-6 mt-6 border-t border-[#059669]/10">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"
                  alt="Michael Torres"
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#059669]"
                />
                <div>
                  <h4 className="font-bold text-[#064e3b]">Michael Torres</h4>
                  <p className="text-xs font-semibold text-[#059669]">Lead Syndicate Investor</p>
                </div>
              </div>
            </div>

            {/* Review 3 */}
            <div className="bg-[#fdfbf7] p-8 rounded-3xl border border-[#f2eadb] relative flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-[#059669]/30 transition-all duration-300 md:col-span-2 lg:col-span-1">
              <div className="space-y-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-base text-[#064e3b]/85 italic leading-relaxed">
                  "Serving as an issuer on Jade Fortune allows us to maintain high standards of market integrity while helping groundbreaking founders get funded."
                </p>
              </div>

              <div className="flex items-center gap-4 pt-6 mt-6 border-t border-[#059669]/10">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
                  alt="Elena Rostova"
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#059669]"
                />
                <div>
                  <h4 className="font-bold text-[#064e3b]">Elena Rostova</h4>
                  <p className="text-xs font-semibold text-[#059669]">Certified Audit Issuer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter & Final CTA Section */}
      <section className="py-24 relative overflow-hidden bg-diamond-grid-green text-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#059669] rounded-full blur-3xl opacity-30 transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#059669] rounded-full blur-3xl opacity-30 transform -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#34d399]" /> Start Building Today
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Ready to Shape the Future?
          </h2>

          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            Join thousands of innovators and backers building the next generation of groundbreaking products on Jade Fortune.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-white text-[#064e3b] rounded-2xl font-extrabold text-lg hover:bg-[#ecfdf5] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5 text-[#064e3b]" />
            </Link>
            <Link
              href="/projects"
              className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl font-extrabold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Marketplace</span>
            </Link>
          </div>

          {/* Newsletter Box */}
          <div className="mt-12 bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl max-w-xl mx-auto shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-lg font-bold text-white mb-2">
              <Mail className="w-5 h-5 text-[#34d399]" />
              <span>Stay in the loop</span>
            </div>
            <p className="text-white/70 text-sm mb-6">
              Subscribe to our weekly dispatch for high-potential project alerts and platform updates.
            </p>

            {newsletterSubscribed ? (
              <div className="p-4 rounded-xl bg-[#059669]/60 border border-[#34d399]/40 text-white font-bold flex items-center justify-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-[#34d399]" />
                <span>Thank you! You're subscribed to Jade Fortune updates.</span>
              </div>
            ) : (
              <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleNewsletterSubmit}>
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-grow px-4 py-3.5 rounded-xl bg-white/10 border border-white/25 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#34d399] transition-all"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 bg-[#059669] text-white font-bold rounded-xl hover:bg-[#047857] active:scale-95 transition-all whitespace-nowrap cursor-pointer shadow-md"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
