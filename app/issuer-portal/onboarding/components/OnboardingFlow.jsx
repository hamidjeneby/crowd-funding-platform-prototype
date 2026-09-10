"use client";

import { useState, useEffect } from "react";
import ProgressBar from "./ProgressBar";
import Stage1Entity from "./Stage1Entity";
import Stage2Reps from "./Stage2Reps";
import Stage3Docs from "./Stage3Docs";
import Stage4Banking from "./Stage4Banking";
import Stage5Review from "./Stage5Review";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Users, UserPlus } from "lucide-react";
import { submitApplication, updateCurrentStep } from "@/app/actions/issuer-onboarding";

const STEPS = [
  { id: 1, title: "Entity & Jurisdiction" },
  { id: 2, title: "Authorized Reps" },
  { id: 3, title: "Document Upload" },
  { id: 4, title: "Banking Details" },
  { id: 5, title: "Review & Attest" },
];

export default function OnboardingFlow({ initialData }) {
  const router = useRouter();
  const clerk = useClerk();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [flowError, setFlowError] = useState(null);

  // Data states
  const [issuerData, setIssuerData] = useState(initialData.issuer || {});
  const [repsData, setRepsData] = useState(initialData.reps || []);
  const [docsData, setDocsData] = useState(initialData.docs || []);

  // Sync state when initialData changes due to router.refresh() from a DB save
  useEffect(() => {
    setIssuerData(initialData.issuer || {});
    setRepsData(initialData.reps || []);
    setDocsData(initialData.docs || []);
  }, [initialData]);

  useEffect(() => {
    // Evaluate completed steps based on initial data
    const completed = [];
    
    // Step 1 check
    if (issuerData.legal_entity_name && issuerData.country) {
      completed.push(1);
    }
    
    // Step 2 check (at least one rep with an ID)
    if (repsData.length > 0 && repsData.some(r => r.id_url)) {
      completed.push(2);
    }
    
    // Step 3 check (all 5 required docs)
    const requiredDocs = [
      "trade_certificate", "certificate_of_incorporation", 
      "ubo_decleration", "proof_of_address", "bank_verification_letter"
    ];
    const uploadedDocs = docsData.map(d => d.doc_type);
    if (requiredDocs.every(d => uploadedDocs.includes(d))) {
      completed.push(3);
    }
    
    // Step 4 check
    if (issuerData.bank_details) {
      completed.push(4);
    }
    
    setCompletedSteps(completed);
  }, [issuerData, repsData, docsData]);

  useEffect(() => {
    // Determine the initial step once on mount
    const completed = [];
    if (initialData.issuer?.legal_entity_name && initialData.issuer?.country) completed.push(1);
    if (initialData.reps?.length > 0 && initialData.reps.some(r => r.id_url)) completed.push(2);
    const requiredDocs = ["trade_certificate", "certificate_of_incorporation", "ubo_decleration", "proof_of_address", "bank_verification_letter"];
    const uploadedDocs = (initialData.docs || []).map(d => d.doc_type);
    if (requiredDocs.every(d => uploadedDocs.includes(d))) completed.push(3);
    if (initialData.issuer?.bank_details) completed.push(4);

    let startStep = initialData.issuer?.current_step || 1;
    if (completed.length === 4) startStep = 5;
    setCurrentStep(startStep);
  }, []);

  const handleNext = async () => {
    if (currentStep < 5) {
      try {
        const nextStep = currentStep + 1;
        const res = await updateCurrentStep(nextStep);
        setCurrentStep(res.current_step);
        if (!completedSteps.includes(currentStep)) {
          setCompletedSteps(prev => [...prev, currentStep]);
        }
      } catch (err) {
        console.error("Failed to update step", err);
        // Fallback to simple increment if error
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleEditSection = (stepNum) => {
    setCurrentStep(stepNum);
  };

  const updateIssuerData = (newData) => setIssuerData(prev => ({ ...prev, ...newData }));
  const updateRepsData = (newData) => setRepsData(newData);
  const updateDocsData = (newData) => setDocsData(newData);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#064e3b]/10 p-6 sm:p-10">
      {/* Organization Team Collaboration Banner */}
      <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#064e3b] text-white shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#064e3b]">
              Collaborate on Onboarding
            </h4>
            <p className="text-xs text-gray-600">
              Invite team members or representatives to help complete entity details & document uploads.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => clerk.openOrganizationProfile()}
          className="inline-flex items-center justify-center px-4 py-2 bg-[#064e3b] hover:bg-[#064e3b]/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex-shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Manage & Invite Team
        </button>
      </div>

      <ProgressBar currentStep={currentStep} steps={STEPS} completedSteps={completedSteps} />
      
      {flowError && (
        <div className="mt-6 p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {flowError}
        </div>
      )}

      <div className="mt-8">
        {currentStep === 1 && (
          <Stage1Entity 
            data={issuerData} 
            onSave={updateIssuerData} 
            onNext={handleNext} 
          />
        )}
        {currentStep === 2 && (
          <Stage2Reps 
            reps={repsData} 
            onUpdate={updateRepsData} 
            onNext={handleNext} 
            onBack={handleBack} 
          />
        )}
        {currentStep === 3 && (
          <Stage3Docs 
            docs={docsData} 
            onUpdate={updateDocsData} 
            onNext={handleNext} 
            onBack={handleBack} 
          />
        )}
        {currentStep === 4 && (
          <Stage4Banking 
            data={issuerData} 
            onSave={updateIssuerData} 
            onNext={handleNext} 
            onBack={handleBack} 
          />
        )}
        {currentStep === 5 && (
          <Stage5Review 
            issuerData={issuerData}
            repsData={repsData}
            docsData={docsData}
            onEditSection={handleEditSection}
            onSubmit={async () => {
              setFlowError(null);
              try {
                await submitApplication();
                window.scrollTo({ top: 0, behavior: "smooth" });
                router.refresh();
              } catch (err) {
                console.error(err);
                setFlowError("An unexpected error occurred while submitting your application. Please try again.");
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
