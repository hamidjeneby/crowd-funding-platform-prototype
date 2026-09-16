"use client";

import { SignIn, useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

export default function InvestorSignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      router.push("/investor-portal");
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#041d16] gap-4 p-4 text-[#fdfbf7] overflow-hidden">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#34d399]"></div>
        <p className="text-[#a7f3d0] font-medium animate-pulse text-sm">Preparing your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen w-full flex bg-[#041d16] text-[#fdfbf7] selection:bg-[#059669] selection:text-white relative overflow-hidden">
      {/* Left Panel: Auth Form */}
      <div className="w-full lg:w-1/2 min-h-screen lg:h-screen flex flex-col justify-between p-6 sm:p-8 lg:p-10 z-10 bg-gradient-to-br from-[#062c22] via-[#041d16] to-[#02130e] relative overflow-y-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#059669]/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Top Navigation */}
        <div className="flex items-center justify-between w-full mb-4 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-emerald-100 hover:text-emerald-300 transition-colors"
          >
            <svg
              className="w-7.5 h-7.5 filter drop-shadow-[0_2px_10px_rgba(52,211,153,0.4)]"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9 9H15L17 2H7L9 9Z" fill="#a7f3d0" />
              <path d="M7 2L9 9H2L7 2Z" fill="#34d399" />
              <path d="M17 2L15 9H22L17 2Z" fill="#059669" />
              <path d="M9 9H15L12 22L9 9Z" fill="#10b981" />
              <path d="M2 9H9L12 22L2 9Z" fill="#065f46" />
              <path d="M15 9H22L12 22L15 9Z" fill="#047857" />
            </svg>
            <span>Jade Fortune</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200/80 hover:text-emerald-100 bg-[#059669]/10 hover:bg-[#059669]/20 border border-[#059669]/30 px-3 py-1.5 rounded-full transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
        </div>

        {/* Center Content / Form */}
        <div className="flex flex-col items-center justify-center my-auto py-4 w-full">
          <div className="flex flex-col items-center max-w-md w-full mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34d399]" /> Investor Portal Access
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight mb-1.5">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/70 mb-5 text-center max-w-sm">
              Sign in to manage your crowdfunding portfolio and discover opportunities.
            </p>

            <SignIn
              forceRedirectUrl="/investor-portal"
              fallbackRedirectUrl="/investor-portal"
              routing="path"
              path="/investor/sign-in"
              signUpUrl="/investor/sign-up"
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 mt-4 border-t border-emerald-900/30 flex items-center justify-between text-xs text-emerald-200/50 shrink-0">
          <span>&copy; {new Date().getFullYear()} Jade Fortune</span>
          <span className="flex items-center gap-1 text-emerald-300/80">
            <Sparkles className="w-3 h-3" /> Investor Network
          </span>
        </div>
      </div>

      {/* Right Panel: Hero Artwork */}
      <div className="hidden lg:block lg:w-1/2 h-full max-h-screen relative bg-[#02130e] overflow-hidden">
        <img
          src="/login-img.png"
          alt="Jade Fortune Art Deco Emerald"
          className="w-full h-full object-cover object-center scale-105"
        />
        {/* Soft edge blending gradients */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#02130e] via-[#02130e]/80 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#02130e] via-transparent to-[#02130e]/40 pointer-events-none" />

        {/* Floating Highlight Card */}
        <div className="absolute bottom-8 left-8 right-8 p-5 rounded-2xl bg-[#062c22]/80 border border-[#34d399]/20 backdrop-blur-md shadow-2xl z-20">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#34d399]" /> Premium Investor Network
          </div>
          <h2 className="text-base font-bold text-white mb-1">
            Build wealth through curated crowdfunding opportunities
          </h2>
          <p className="text-xs text-emerald-100/70 leading-relaxed">
            Gain direct access to vetted high-growth companies, transparent financials, and streamlined investor workflows.
          </p>
        </div>
      </div>
    </div>
  );
}
