import { getInvestorPortalData } from "@/app/actions/investor-portal";
import { getVisibleProjectsQuery, parseInvestorClass } from "@/app/actions/marketplace";
import { CLASS_CONFIG } from "@/app/constants/classConfig";
import MarketplaceClient from "./MarketplaceClient";

export const metadata = {
  title: "Investment Marketplace | Crowdfunding Platform",
  description: "Browse curated, Sharia-compliant investment opportunities tailored to your investor eligibility class.",
};

export default async function MarketplacePage() {
  const investorData = await getInvestorPortalData();
  const investorClassNum = await parseInvestorClass(investorData?.investor_class);
  const classCfg = CLASS_CONFIG[investorClassNum] || CLASS_CONFIG[10];

  const projects = await getVisibleProjectsQuery(investorClassNum);

  return (
    <MarketplaceClient
      projects={projects}
      investorClass={investorClassNum}
      investorClassName={classCfg.name}
    />
  );
}
