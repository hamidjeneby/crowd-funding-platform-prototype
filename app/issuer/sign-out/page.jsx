"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function IssuerSignOutPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    async function handleSignOut() {
      try {
        await signOut({ redirectUrl: "/issuer/sign-in?error=no_organization" });
      } catch (err) {
        console.error("Error signing out user without organization:", err);
        router.push("/issuer/sign-in?error=no_organization");
      }
    }
    handleSignOut();
  }, [signOut, router]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#fdfbf7] p-4 text-center">
      <div className="w-full max-w-md p-8 glass rounded-3xl border border-[#059669]/20 shadow-xl flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-[#059669]/20 border-t-[#059669] rounded-full animate-spin" />
        <h2 className="text-xl font-bold text-[#064e3b]">Logging Out...</h2>
        <p className="text-sm text-[#064e3b]/70">
          An active organization membership is required to access the Issuer Portal. Signing you out...
        </p>
      </div>
    </div>
  );
}
