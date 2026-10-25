"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  PieChart,
  ArrowRight,
  Briefcase,
  ArrowUpRight,
} from "lucide-react";
import { getInvestorPortfolioPledges } from "@/app/actions/investor-portal";
import {
  buildSummary,
  byContractType,
  byProject,
  byMonth,
  outcomes,
  conversionExposure,
} from "@/lib/portfolio/aggregate";
import SummaryStrip from "@/components/portfolio/SummaryStrip";
import ContractTypeDoughnut from "@/components/portfolio/ContractTypeDoughnut";
import ProjectHorizontalBar from "@/components/portfolio/ProjectHorizontalBar";
import CapitalOverTimeBar from "@/components/portfolio/CapitalOverTimeBar";
import PledgeOutcomesCard from "@/components/portfolio/PledgeOutcomesCard";
import ConversionExposureCard from "@/components/portfolio/ConversionExposureCard";
import RepaymentsPanel from "@/components/portfolio/RepaymentsPanel";
import PortfolioSkeleton from "@/components/portfolio/PortfolioSkeleton";
import PortfolioError from "@/components/portfolio/PortfolioError";

export default function PortfolioClient({
  initialPledges = null,
  initialRepayments = [],
  initialPeriods = [],
  initialError = false,
}) {
  const [pledges, setPledges] = useState(initialPledges);
  const [repayments, setRepayments] = useState(initialRepayments || []);
  const [periods, setPeriods] = useState(initialPeriods || []);
  const [loading, setLoading] = useState(
    initialPledges === null && !initialError,
  );
  const [error, setError] = useState(initialError);

  const fetchPortfolioData = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const res = await getInvestorPortfolioPledges();
      if (!res.success) {
        throw new Error(res.error || "Failed to load portfolio data");
      }
      setPledges(res.pledges || []);
      setRepayments(res.repayments || []);
      setPeriods(res.periods || []);
    } catch (err) {
      console.error("Error fetching portfolio data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialPledges === null && !initialError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPortfolioData();
    }
  }, [fetchPortfolioData, initialPledges, initialError]);

  // Plain aggregation functions
  const summary = useMemo(() => buildSummary(pledges || []), [pledges]);
  const contractTypeData = useMemo(
    () => byContractType(pledges || []),
    [pledges],
  );
  const projectData = useMemo(() => byProject(pledges || [], 8), [pledges]);
  const monthData = useMemo(() => byMonth(pledges || []), [pledges]);
  const outcomesData = useMemo(() => outcomes(pledges || []), [pledges]);
  const conversionData = useMemo(
    () => conversionExposure(pledges || []),
    [pledges],
  );

  const currency = summary.primaryCurrency || "AED";
  const isEmptyPortfolio =
    !loading &&
    !error &&
    summary.holdingsCount === 0 &&
    summary.awaitingAllocation === 0 &&
    !outcomesData.hasOutcomes;

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <ShieldCheck className="w-4 h-4" /> Portfolio Overview
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Portfolio Analysis & Asset Allocation
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5 max-w-2xl">
            Comprehensive analytical view of total deployed capital, contract
            structures, historical pledge outcomes, and reserved conversion
            entitlements.
          </p>
        </div>

        {/* Link to My Investments */}
        <div className="shrink-0">
          <Link
            href="/investor-portal/investments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] hover:text-[#047857] transition-colors bg-white hover:bg-emerald-50/80 border border-[#059669]/20 px-4 py-2.5 rounded-xl shadow-xs"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>My Investments</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </Link>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {loading && <PortfolioSkeleton />}

      {/* Fetch Error State with Retry Button */}
      {error && !loading && <PortfolioError onRetry={fetchPortfolioData} />}

      {/* Empty State: No Holdings and No Pending Pledges */}
      {isEmptyPortfolio && (
        <div className="py-16 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-emerald-100/80 border border-[#059669]/20 flex items-center justify-center text-[#059669] shadow-xs">
            <PieChart className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#064e3b]">
              No Active Portfolio Holdings
            </h2>
            <p className="text-sm text-[#064e3b]/70 leading-relaxed">
              You currently do not have any active holdings or submitted pledges
              in your portfolio. Explore live Sharia-compliant campaigns in the
              marketplace to get started.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/investor-portal/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#064e3b] text-white font-semibold text-sm hover:bg-[#047857] transition-all shadow-md hover:shadow-lg"
            >
              Explore Marketplace <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Populated Portfolio View */}
      {!loading && !error && !isEmptyPortfolio && (
        <div className="space-y-8">
          {/* 1. Summary Strip (4 metrics) */}
          <SummaryStrip summary={summary} />

          {/* 2 & 3. Allocation Grid (Contract Type & Top 8 Projects) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContractTypeDoughnut data={contractTypeData} currency={currency} />
            <ProjectHorizontalBar data={projectData} currency={currency} />
          </div>

          {/* 4. Capital Invested Over Time */}
          <CapitalOverTimeBar data={monthData} currency={currency} />

          {/* 5. Pledge Outcomes */}
          <PledgeOutcomesCard data={outcomesData} currency={currency} />

          {/* 6. Conversion Exposure (Rendered only if investor holds conversion_eligible_units > 0) */}
          {conversionData.hasExposure && (
            <ConversionExposureCard data={conversionData} currency={currency} />
          )}

          {/* 7. Repayments Panel */}
          <RepaymentsPanel
            repayments={repayments}
            periods={periods}
            holdings={pledges}
            currency={currency}
          />
        </div>
      )}

      {/* Footer Note */}
      <div className="border-t border-[#059669]/10 pt-4 text-center text-xs text-gray-500">
        Portfolio tracking powered by real-time asset position records.
      </div>
    </div>
  );
}
