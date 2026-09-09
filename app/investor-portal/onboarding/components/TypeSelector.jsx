"use client";

import { useState } from "react";
import { setInvestorType } from "@/app/actions/investor-onboarding";
import { useRouter } from "next/navigation";
import { Building2, User } from "lucide-react";

export default function TypeSelector() {
  const router = useRouter();
  const [loadingType, setLoadingType] = useState(null);
  const [error, setError] = useState(null);

  const handleSelect = async (type) => {
    setLoadingType(type);
    setError(null);
    try {
      await setInvestorType(type);
      router.refresh();
    } catch (err) {
      setError("An error occurred while setting your investor type. Please try again.");
      setLoadingType(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-[#064e3b]">Welcome to Jade Fortune</h1>
          <p className="mt-4 text-lg text-gray-600">
            To get started, please tell us how you will be investing.
            This selection cannot be changed later.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Individual Option */}
          <button
            onClick={() => handleSelect("individual")}
            disabled={loadingType !== null}
            className="flex flex-col items-center p-8 bg-white rounded-xl shadow-md border-2 border-transparent hover:border-[#059669] hover:shadow-lg transition-all duration-200 disabled:opacity-50 group relative"
          >
            {loadingType === "individual" && (
              <div className="absolute inset-0 bg-white/50 rounded-xl flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#059669]"></div>
              </div>
            )}
            <div className="w-16 h-16 rounded-full bg-[#ecfdf5] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <User className="w-8 h-8 text-[#059669]" />
            </div>
            <h2 className="text-xl font-bold text-[#064e3b] mb-3">Individual Investor</h2>
            <p className="text-gray-600 text-center text-sm">
              I am investing my own personal funds.
            </p>
          </button>

          {/* Institutional Option */}
          <button
            onClick={() => handleSelect("institutional")}
            disabled={loadingType !== null}
            className="flex flex-col items-center p-8 bg-white rounded-xl shadow-md border-2 border-transparent hover:border-[#059669] hover:shadow-lg transition-all duration-200 disabled:opacity-50 group relative"
          >
            {loadingType === "institutional" && (
              <div className="absolute inset-0 bg-white/50 rounded-xl flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#059669]"></div>
              </div>
            )}
            <div className="w-16 h-16 rounded-full bg-[#ecfdf5] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="w-8 h-8 text-[#059669]" />
            </div>
            <h2 className="text-xl font-bold text-[#064e3b] mb-3">Institutional Investor</h2>
            <p className="text-gray-600 text-center text-sm">
              I am investing on behalf of a company, fund, or trust.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
