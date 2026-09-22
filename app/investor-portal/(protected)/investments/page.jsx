import { getInvestorHoldingsAndPledges } from "@/app/actions/investor-portal";
import MyInvestmentsClient from "./MyInvestmentsClient";

export default async function MyInvestmentsPage() {
  const { investorClass, holdings, pledges } = await getInvestorHoldingsAndPledges();

  return (
    <MyInvestmentsClient
      investorClass={investorClass}
      holdings={holdings}
      pledges={pledges}
    />
  );
}
