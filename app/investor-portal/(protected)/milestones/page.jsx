import { getInvestorMilestonesPageData } from "@/app/actions/investor-portal";
import MilestonesClient from "./MilestonesClient";

export const metadata = {
  title: "Invested Project Roadmaps | Investor Portal",
  description: "Unified timeline of system-generated milestones and verified issuer operational progress for your active holdings.",
};

export default async function MilestonesPage() {
  const { heldProjects } = await getInvestorMilestonesPageData();

  return <MilestonesClient heldProjects={heldProjects} />;
}
