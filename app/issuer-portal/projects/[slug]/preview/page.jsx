import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getInvestorFacingProjectData } from "@/app/actions/marketplace";
import ProjectDetailView from "@/app/components/projects/ProjectDetailView";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  return {
    title: `Project Preview | Issuer Portal`,
  };
}

export default async function IssuerProjectPreviewPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  if (!slug) {
    notFound();
  }

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    notFound();
  }

  // Resolve issuer profile by Clerk org_id
  const { data: issuer, error: issuerError } = await supabaseAdmin
    .from("issuers")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (issuerError || !issuer) {
    notFound();
  }

  // Fetch project row for ownership verification
  let query = supabaseAdmin.from("projects").select("id, issuer_id, slug");
  if (!isNaN(Number(slug))) {
    query = query.or(`id.eq.${slug},slug.eq.${slug}`);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: projectRow, error: pError } = await query.maybeSingle();

  if (pError || !projectRow) {
    notFound();
  }

  // Strict ownership check: return 404 if issuer does not own this project
  if (projectRow.issuer_id !== issuer.id) {
    notFound();
  }

  // Fetch the exact same investor-facing data model
  const projectData = await getInvestorFacingProjectData(projectRow.slug || slug);

  if (!projectData) {
    notFound();
  }

  return <ProjectDetailView project={projectData} viewerRole="issuer_preview" />;
}
