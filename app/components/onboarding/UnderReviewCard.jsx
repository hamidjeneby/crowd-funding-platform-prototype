"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function UnderReviewCard({ dashboardHref = "/investor-portal" }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfaf5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto text-center bg-white p-10 rounded-xl shadow-lg border border-[#064e3b]/10">
        <CheckCircle className="mx-auto h-16 w-16 text-[#064e3b] mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Under Review</h1>
        <p className="text-gray-600 mb-8">
          Your onboarding has been completed and is under review. We will notify you once the review process is complete.
        </p>
        <Link
          href={dashboardHref}
          className="inline-flex justify-center items-center py-3 px-6 border border-transparent rounded-md shadow-sm text-md font-medium text-white bg-[#064e3b] hover:bg-[#064e3b]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#064e3b] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
