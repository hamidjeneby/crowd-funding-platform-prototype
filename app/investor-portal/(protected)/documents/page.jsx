import { getInvestorDocuments } from "@/app/actions/investor-portal";
import DocumentsClient from "./DocumentsClient";

export const metadata = {
  title: "Document Vault | Investor Portal",
  description: "View and download your official Shariah certificates, pledge confirmations, and subscription agreements.",
};

export default async function DocumentsPage() {
  const result = await getInvestorDocuments();
  const documents = result?.documents || [];

  return <DocumentsClient initialDocuments={documents} />;
}
