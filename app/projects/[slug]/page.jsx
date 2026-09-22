import { redirect } from "next/navigation";

export default async function PublicProjectSlugPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  redirect(`/investor-portal/projects/${slug}`);
}
