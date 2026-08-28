"use client";

import { useState, useEffect } from "react";
import ProgressBar from "@/app/issuer-portal/onboarding/components/ProgressBar";
import { useRouter } from "next/navigation";
import { submitApplication, updateCurrentStep } from "@/app/actions/investor-onboarding";

// We will import these once we create them
import Stage1Entity from "./institutional/Stage1Entity";
import Stage2Reps from "./institutional/Stage2Reps";
import Stage3DocsInst from "./institutional/Stage3Docs";

import Stage1PersonalInfo from "./individual/Stage1PersonalInfo";
import Stage2DocsIndiv from "./individual/Stage2Docs";

import StageBanking from "./shared/StageBanking";
import StageReview from "./shared/StageReview";

const INSTITUTIONAL_STEPS = [
  { id: 1, title: "Entity & Jurisdiction" },
  { id: 2, title: "Authorized Reps" },
  { id: 3, title: "Document Upload" },
  { id: 4, title: "Banking Details" },
  { id: 5, title: "Review & Attest" },
];

const INDIVIDUAL_STEPS = [
  { id: 1, title: "Personal Information" },
  { id: 2, title: "Document Upload" },
  { id: 3, title: "Banking Details" },
  { id: 4, title: "Review & Attest" },
];

export default function OnboardingFlow({ initialData, type }) {
  const router = useRouter();
  const isInstitutional = type === "institutional";
  const STEPS = isInstitutional ? INSTITUTIONAL_STEPS : INDIVIDUAL_STEPS;
  const maxSteps = STEPS.length;

  const [currentStep, setCurrentStep] = useState(() => {
    let startStep = initialData.investor?.current_step || 1;
    return startStep > maxSteps ? maxSteps : startStep;
  });
  const [completedSteps, setCompletedSteps] = useState([]);
  
  // Data states
  const [investorData, setInvestorData] = useState(initialData.investor || {});
  const [repsData, setRepsData] = useState(initialData.reps || []);
  const [docsData, setDocsData] = useState(initialData.docs || []);

  // Sync state when initialData changes due to router.refresh() from a DB save
  useEffect(() => {
    setInvestorData(initialData.investor || {});
    setRepsData(initialData.reps || []);
    setDocsData(initialData.docs || []);
  }, [initialData]);

  useEffect(() => {
    // Evaluate completed steps
    const completed = [];
    
    if (isInstitutional) {
      // Institutional checks
      if (investorData.legal_entity_name && investorData.country) completed.push(1);
      if (repsData.length > 0 && repsData.some(r => r.id_url)) completed.push(2);
      
      const requiredDocs = ["trade_certificate", "certificate_of_incorporation", "audited_financials", "source_of_funds", "bank_verification_letter"];
      const uploadedDocs = docsData.map(d => d.doc_type);
      if (requiredDocs.every(d => uploadedDocs.includes(d))) completed.push(3);
      
      if (investorData.bank_details) completed.push(4);
    } else {
      // Individual checks
      if (investorData.full_name && investorData.country) completed.push(1);
      
      const requiredDocs = ["identification", "proof_of_address", "income_evidence"];
      const uploadedDocs = docsData.map(d => d.doc_type);
      if (requiredDocs.every(d => uploadedDocs.includes(d))) completed.push(2);
      
      if (investorData.bank_details) completed.push(3);
    }
    
    setCompletedSteps(completed);
  }, [investorData, repsData, docsData, isInstitutional]);

  const handleNext = async () => {
    if (currentStep < maxSteps) {
      try {
        const nextStep = currentStep + 1;
        const res = await updateCurrentStep(nextStep);
        setCurrentStep(res.current_step);
        if (!completedSteps.includes(currentStep)) {
          setCompletedSteps(prev => [...prev, currentStep]);
        }
      } catch (err) {
        console.error("Failed to update step", err);
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

  const updateInvestorData = (newData) => setInvestorData(prev => ({ ...prev, ...newData }));
  const updateRepsData = (newData) => setRepsData(newData);
  const updateDocsData = (newData) => setDocsData(newData);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#064e3b]/10 p-6 sm:p-10">
      <ProgressBar currentStep={currentStep} steps={STEPS} completedSteps={completedSteps} />
      
      <div className="mt-8">
        {isInstitutional ? (
          // INSTITUTIONAL FLOW
          <>
            {currentStep === 1 && (
              <Stage1Entity data={investorData} onSave={updateInvestorData} onNext={handleNext} />
            )}
            {currentStep === 2 && (
              <Stage2Reps reps={repsData} onUpdate={updateRepsData} onNext={handleNext} onBack={handleBack} />
            )}
            {currentStep === 3 && (
              <Stage3DocsInst docs={docsData} onUpdate={updateDocsData} onNext={handleNext} onBack={handleBack} />
            )}
            {currentStep === 4 && (
              <StageBanking data={investorData} onSave={updateInvestorData} onNext={handleNext} onBack={handleBack} />
            )}
            {currentStep === 5 && (
              <StageReview 
                investorData={investorData} repsData={repsData} docsData={docsData} type="institutional"
                onEditSection={handleEditSection}
                onSubmit={async () => {
                  try {
                    await submitApplication();
                    router.refresh();
                  } catch (err) {
                    console.error(err);
                    alert(err.message);
                  }
                }}
              />
            )}
          </>
        ) : (
          // INDIVIDUAL FLOW
          <>
            {currentStep === 1 && (
              <Stage1PersonalInfo data={investorData} onSave={updateInvestorData} onNext={handleNext} />
            )}
            {currentStep === 2 && (
              <Stage2DocsIndiv docs={docsData} onUpdate={updateDocsData} onNext={handleNext} onBack={handleBack} />
            )}
            {currentStep === 3 && (
              <StageBanking data={investorData} onSave={updateInvestorData} onNext={handleNext} onBack={handleBack} />
            )}
            {currentStep === 4 && (
              <StageReview 
                investorData={investorData} repsData={repsData} docsData={docsData} type="individual"
                onEditSection={handleEditSection}
                onSubmit={async () => {
                  try {
                    await submitApplication();
                    router.refresh();
                  } catch (err) {
                    console.error(err);
                    alert(err.message);
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
