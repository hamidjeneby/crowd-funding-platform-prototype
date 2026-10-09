"use server";

import MilestoneQueueClient from "./MilestoneQueueClient";
import { getMilestoneQueue } from "@/app/actions/auditor";

export default async function MilestoneQueuePage() {
  const { milestones, error } = await getMilestoneQueue();

  return <MilestoneQueueClient initialMilestones={milestones || []} initialError={error} />;
}
