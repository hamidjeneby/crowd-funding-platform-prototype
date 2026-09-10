"use client";

import { SignUp, useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InvestorSignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const timeoutId = setTimeout(() => {
        router.push("/investor-portal");
      }, 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-[#fdfbf7] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#064e3b]"></div>
        <p className="text-[#064e3b] font-medium animate-pulse">Setting up your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#fdfbf7]">
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold text-[#064e3b] mb-6">Investor Portal Registration</h1>
        <SignUp forceRedirectUrl="/investor/sign-up" routing="path" path="/investor/sign-up" signInUrl="/investor/sign-in" unsafeMetadata={{ role: "investor" }} />
      </div>
    </div>
  );
}
