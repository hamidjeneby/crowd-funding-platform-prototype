"use server";

import BankReviewClient from "./BankReviewClient";
import { getBankReviewQueue } from "@/app/actions/auditor";

export default async function BankReviewPage() {
  const { items, error } = await getBankReviewQueue();

  return <BankReviewClient initialItems={items || []} initialError={error} />;
}
