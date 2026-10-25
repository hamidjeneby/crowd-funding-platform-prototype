import { getInvestorPortfolioPledges } from "@/app/actions/investor-portal";
import PortfolioClient from "./PortfolioClient";

export const metadata = {
  title: "Portfolio Analysis | Investor Portal",
  description: "Analytical overview of deployed capital, contract types, asset allocation, and pledge outcomes.",
};

export default async function PortfolioPage() {
  const res = await getInvestorPortfolioPledges();
  const initialPledges = res.success ? res.pledges : null;
  const initialRepayments = res.success ? res.repayments : [];
  const initialPeriods = res.success ? res.periods : [];
  const initialError = !res.success;

  return (
    <PortfolioClient
      initialPledges={initialPledges}
      initialRepayments={initialRepayments}
      initialPeriods={initialPeriods}
      initialError={initialError}
    />
  );
}
