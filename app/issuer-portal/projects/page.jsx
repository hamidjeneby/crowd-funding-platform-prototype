import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import {
  FolderOpen,
  PlusCircle,
  AlertCircle,
  Edit,
  Eye,
  Image as ImageIcon,
} from "lucide-react";

export default async function ProjectsPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return <div>Unauthorized</div>;
  }

  let projects = [];
  let fetchError = null;

  try {
    const { data: issuer, error: issuerError } = await supabaseAdmin
      .from("issuers")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (issuerError || !issuer) {
      projects = [];
    } else {
      const { data, error } = await supabaseAdmin
        .from("projects")
        .select("*, project_media(id)")
        .eq("issuer_id", issuer.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      projects = data || [];
    }
  } catch (err) {
    console.error("Error fetching projects:", err);
    fetchError =
      "there was an error fetching your projects please try again later";
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
        <Link
          href="/issuer-portal/projects/new"
          className="flex items-center px-4 py-2 bg-[#064e3b] text-white rounded-md hover:bg-[#064e3b]/90 transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Create New Project
        </Link>
      </div>

      {fetchError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center mb-8 shadow-sm">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="font-medium">{fetchError}</p>
        </div>
      )}

      {!fetchError && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-gray-200 border-dashed text-center shadow-sm">
          <div className="w-20 h-20 bg-[#064e3b]/10 text-[#064e3b] rounded-full flex items-center justify-center mb-6">
            <FolderOpen className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            No projects listed
          </h2>
          <p className="text-gray-500 mb-8 max-w-md text-lg">
            You haven't created any crowdfunding projects yet. Start by creating
            your first project draft to raise funds.
          </p>
          <Link
            href="/issuer-portal/projects/new"
            className="flex items-center px-8 py-4 bg-[#064e3b] text-white font-semibold rounded-md hover:bg-[#064e3b]/90 transition-colors shadow-md text-lg"
          >
            <PlusCircle className="w-6 h-6 mr-2" />
            Create Your First Project
          </Link>
        </div>
      )}

      {!fetchError && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => {
            const mediaCount = project.project_media?.length || 0;
            const isDraft = project.status === "draft";

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Card Header / Cover */}
                <div className="relative h-48 bg-gray-100 flex-shrink-0 border-b border-gray-200">
                  {project.cover_image_url ? (
                    <img
                      src={project.cover_image_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="w-12 h-12 mb-2 opacity-40" />
                      <span className="text-sm font-medium">
                        No Cover Image
                      </span>
                    </div>
                  )}
                  {/* Overlay Gradient for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-md uppercase tracking-wider ${
                        isDraft
                          ? "bg-white text-gray-700 border border-gray-200"
                          : project.status === "pending review"
                            ? "bg-yellow-400 text-yellow-900 border border-yellow-500"
                            : "bg-green-500 text-white border border-green-600"
                      }`}
                    >
                      {project.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3
                      className="text-xl font-bold text-white line-clamp-1 drop-shadow-md"
                      title={project.title}
                    >
                      {project.title || "Untitled Project"}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Summary */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                    {project.summary || "No summary provided."}
                  </p>

                  <div className="flex items-center text-xs font-medium text-gray-500 mb-5 bg-gray-50 p-2 rounded-lg border border-gray-100 w-fit">
                    <ImageIcon className="w-4 h-4 mr-2 text-[#064e3b]" />
                    {mediaCount} media {mediaCount === 1 ? "file" : "files"}
                  </div>

                  {project.target_goal ? (
                    <div className="mb-5">
                      <span className="text-xs text-gray-500 font-medium block mb-1 uppercase tracking-wide">
                        Target Goal
                      </span>
                      <span className="font-extrabold text-gray-900 text-xl">
                        {project.currency || "USD"}{" "}
                        {Number(project.target_goal).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div className="mb-5">
                      <span className="text-xs text-gray-500 font-medium block mb-1 uppercase tracking-wide">
                        Target Goal
                      </span>
                      <span className="font-medium text-gray-400 text-base italic">
                        Not set yet
                      </span>
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex gap-3 border-t border-gray-100">
                    <div className="flex-1 group relative">
                      <Link
                        href={`/issuer-portal/projects/${project.id}/edit`}
                        className={`flex items-center justify-center w-full py-2.5 px-4 rounded-lg border text-sm font-bold transition-all ${
                          isDraft
                            ? "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm"
                            : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed pointer-events-none"
                        }`}
                        aria-disabled={!isDraft}
                        tabIndex={!isDraft ? -1 : undefined}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Link>
                      {!isDraft && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-[200px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-gray-900 text-white text-xs leading-relaxed rounded-md py-2 px-3 z-20 text-center shadow-lg">
                          your project is not in draft mode it cannot be edited
                          at this time
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 group relative">
                      <Link
                        href={`/issuer-portal/projects/${project.id}/view`}
                        className={`flex items-center justify-center w-full py-2.5 px-4 rounded-lg border text-sm font-bold transition-all ${
                          !isDraft
                            ? "border-[#064e3b] text-[#064e3b] bg-white hover:bg-[#064e3b]/5 hover:shadow-sm"
                            : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed pointer-events-none"
                        }`}
                        aria-disabled={isDraft}
                        tabIndex={isDraft ? -1 : undefined}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Link>
                      {isDraft && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-[220px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-gray-900 text-white text-xs leading-relaxed rounded-md py-2 px-3 z-20 text-center shadow-lg">
                          you cannot view a project that has not been submitted
                          for review
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
