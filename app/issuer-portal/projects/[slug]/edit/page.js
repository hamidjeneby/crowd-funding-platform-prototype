"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { createClerkSupabaseClient } from "@/lib/supabase";

import Step1BasicInfo from "@/app/components/wizard/Step1BasicInfo";
import Step2Structure from "@/app/components/wizard/Step2Structure";
import Step3Financials from "@/app/components/wizard/Step3Financials";
import Step4Documents from "@/app/components/wizard/Step4Documents";
import Step5Media from "@/app/components/wizard/Step5Media";
import Step6Preview from "@/app/components/wizard/Step6Preview";
import { UploadProvider, useUpload } from "@/app/components/wizard/UploadProvider";
import ProgressBar from "@/app/issuer-portal/onboarding/components/ProgressBar";
import { Loader2, CheckCircle } from "lucide-react";

const STEPS = [
  { id: 1, title: "Basic Info" },
  { id: 2, title: "Structure & Compliance" },
  { id: 3, title: "Financial Terms" },
  { id: 4, title: "Documents" },
  { id: 5, title: "Media" },
  { id: 6, title: "Preview & Submit" },
];

function ProjectWizardPage() {
  const params = useParams();
  const slug = params?.slug;
  const { getToken, isLoaded, userId } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProject() {
      if (!isLoaded || !userId || !slug) return;
      try {
        const token = await getToken({ template: "supabase" });
        const supabase = createClerkSupabaseClient(token);

        // Fetch project and related data by slug
        const { data: project, error: pError } = await supabase
          .from("projects")
          .select(`
            *,
            spv_details (*),
            project_docs (*),
            project_media (*),
            project_milestones (*)
          `)
          .eq("slug", slug)
          .maybeSingle();

        if (pError) throw pError;
        if (!project) throw new Error("Project not found");

        if (project.status !== "draft") {
          setError("This project is currently under review and is in read-only mode.");
          setCurrentStep(1);
        } else {
          setCurrentStep(project.current_step || 1);
        }

        setProjectData(project);
      } catch (err) {
        console.error("Failed to load project:", err);
        setError("Failed to load project data. You may not have permission.");
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [isLoaded, userId, slug, getToken]);

  const handleNext = () => {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  };
  const handlePrev = () => setCurrentStep((s) => Math.max(s - 1, 1));
  const jumpToStep = (stepIndex) => setCurrentStep(stepIndex);
  const reloadData = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const token = await getToken({ template: "supabase" });
      const supabase = createClerkSupabaseClient(token);
      const { data: project } = await supabase
        .from("projects")
        .select(`
          *,
          spv_details (*),
          project_docs (*),
          project_media (*),
          project_milestones (*)
        `)
        .eq("slug", slug)
        .maybeSingle();
      setProjectData(project);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-pulse">
        {/* Skeleton Title block */}
        <div className="mb-8">
          <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
        </div>

        {/* Skeleton Stepper */}
        <div className="mb-8">
          <div className="flex justify-between items-center relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 z-0"></div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="relative z-10 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white"></div>
                <div className="absolute top-12 w-20 h-3 bg-gray-200 rounded mt-1"></div>
              </div>
            ))}
          </div>
          <div className="h-8"></div>
        </div>

        {/* Skeleton Content */}
        <div className="bg-white rounded-xl shadow-lg border border-[#064e3b]/10 p-6 sm:p-10 min-h-[400px]">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-6">
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/6 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/6 mb-2"></div>
              <div className="h-24 bg-gray-200 rounded w-full"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/6 mb-2"></div>
              <div className="h-32 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
          <div className="flex justify-end mt-8">
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !projectData) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        {error}
      </div>
    );
  }

  const completedSteps = Array.from({ length: currentStep - 1 }, (_, i) => i + 1);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Title block */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{projectData?.title}</h1>
          {error && (
            <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
              {error}
            </div>
          )}
        </div>
        <GlobalUploadIndicator />
      </div>

      {/* Stepper */}
      <ProgressBar currentStep={currentStep} steps={STEPS} completedSteps={completedSteps} />

      {/* Wizard Content */}
      <div className="bg-white rounded-xl shadow-lg border border-[#064e3b]/10 p-6 sm:p-10">
        {currentStep === 1 && (
          <Step1BasicInfo
            projectId={projectData?.id}
            initialData={projectData}
            onNext={handleNext}
            disabled={projectData?.status !== "draft"}
            onUpdate={reloadData}
          />
        )}
        {currentStep === 2 && (
          <Step2Structure
            projectId={projectData?.id}
            initialData={projectData}
            onNext={handleNext}
            onPrev={handlePrev}
            disabled={projectData?.status !== "draft"}
            onUpdate={reloadData}
          />
        )}
        {currentStep === 3 && (
          <Step3Financials
            projectId={projectData?.id}
            initialData={projectData}
            onNext={handleNext}
            onPrev={handlePrev}
            disabled={projectData?.status !== "draft"}
            onUpdate={reloadData}
          />
        )}
        {currentStep === 4 && (
          <Step4Documents
            projectId={projectData?.id}
            initialData={projectData}
            onNext={handleNext}
            onPrev={handlePrev}
            disabled={projectData?.status !== "draft"}
            onUpdate={reloadData}
          />
        )}
        {currentStep === 5 && (
          <Step5Media
            projectId={projectData?.id}
            initialData={projectData}
            onNext={handleNext}
            onPrev={handlePrev}
            disabled={projectData?.status !== "draft"}
            onUpdate={reloadData}
          />
        )}
        {currentStep === 6 && (
          <Step6Preview
            projectId={projectData?.id}
            projectData={projectData}
            onPrev={handlePrev}
            jumpToStep={jumpToStep}
            disabled={projectData?.status !== "draft"}
            onSuccess={() => router.push("/issuer-portal/projects")}
          />
        )}
      </div>
    </div>
  );
}

function GlobalUploadIndicator() {
  const { uploadingCount, hasFinishedUploads } = useUpload();
  
  if (uploadingCount > 0) {
    return (
      <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium border border-blue-100 shadow-sm animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin" />
        {uploadingCount} {uploadingCount === 1 ? 'file' : 'files'} uploading...
      </div>
    );
  }

  if (hasFinishedUploads) {
    return (
      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium border border-green-100 shadow-sm">
        <CheckCircle className="w-4 h-4" />
        All documents uploaded successfully
      </div>
    );
  }

  return null;
}

export default function ProjectWizardPageWrapper() {
  return (
    <UploadProvider>
      <ProjectWizardPage />
    </UploadProvider>
  );
}
