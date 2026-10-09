"use client";

import { useState, useRef } from "react";
import { Upload, Info, Check, Eye, EyeOff, Loader2, CheckCircle2, Lock } from "lucide-react";
import { saveStage3Doc, updateDocPassword } from "@/app/actions/investor-onboarding";
import { useRouter } from "next/navigation";

const REQUIRED_DOCS = [
  { id: "identification", label: "Proof of Identification", tooltip: "Upload a copy of your Passport or National ID" },
  { id: "proof_of_address", label: "Proof of Address", tooltip: "You can upload a tenancy contract or utility bill" },
  { id: "income_evidence", label: "Evidence of Income/Net Worth", tooltip: "Upload bank statements or salary certificate" },
];

export default function Stage2DocsIndiv({ docs = [], onUpdate, onNext, onBack }) {
  const router = useRouter();
  const [files, setFiles] = useState({});
  const [passwords, setPasswords] = useState(() => {
    const initial = {};
    docs.forEach(d => {
      if (d.document_password) initial[d.doc_type] = d.document_password;
    });
    return initial;
  });
  const [showPasswords, setShowPasswords] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [docError, setDocError] = useState(null);
  
  const fileRefs = {
    identification: useRef(),
    proof_of_address: useRef(),
    income_evidence: useRef(),
  };

  const getExistingDoc = (docId) => docs.find((d) => d.doc_type === docId);

  const isUploaded = (docId) => {
    const d = getExistingDoc(docId);
    return d && d.url && d.status !== "rejected";
  };

  const handleFileChange = (docId, file) => {
    setDocError(null);
    if (file) {
      if (!file.type.match(/^(image\/.*|application\/pdf)$/)) {
        setDocError("Only image or PDF files are allowed.");
        return;
      }
      setFiles(prev => ({ ...prev, [docId]: file }));
    }
  };

  const handleSaveAndContinue = async () => {
    setDocError(null);
    const missing = REQUIRED_DOCS.filter((d) => {
      const existing = getExistingDoc(d.id);
      return !files[d.id] && !isUploaded(d.id) && existing?.status !== "approved";
    });
    
    if (missing.length > 0) {
      setDocError(`Please upload all required documents. Missing: ${missing.map(m => m.label).join(", ")}`);
      return;
    }

    setIsSaving(true);
    try {
      const uploadPromises = REQUIRED_DOCS.map(async (doc) => {
        const docId = doc.id;
        const file = files[docId];
        const existing = getExistingDoc(docId);
        
        // Skip modifying already approved docs
        if (existing?.status === "approved") return;

        if (file) {
          const formData = new FormData();
          formData.append("doc_type", docId);
          formData.append("file", file);
          if (passwords[docId]) {
            formData.append("document_password", passwords[docId]);
          }
          await saveStage3Doc(formData);
        } else if (isUploaded(docId)) {
          const currentPassword = passwords[docId] || "";
          const originalPassword = existing?.document_password || "";
          
          if (currentPassword !== originalPassword) {
            await updateDocPassword(docId, currentPassword);
          }
        }
      });

      await Promise.all(uploadPromises);
      router.refresh();
      onNext();
    } catch (err) {
      console.error(err);
      setDocError("An error occurred while saving your documents. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Document Upload</h3>
        <p className="text-sm text-gray-500">Please upload the required personal documents. Only PDF and Image files are accepted.</p>
      </div>

      {docError && (
        <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
          {docError}
        </div>
      )}

      <div className="space-y-6">
        <p className="text-sm text-red-500 font-medium">* Indicates a required field</p>
        {REQUIRED_DOCS.map(doc => {
          const existingDoc = getExistingDoc(doc.id);
          const isApproved = existingDoc?.status === "approved";
          const isRejected = existingDoc?.status === "rejected";
          const uploaded = isUploaded(doc.id);
          const currentFile = files[doc.id];
          
          return (
            <div key={doc.id} className="p-5 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center">
                    <label className="block text-sm font-semibold text-gray-900">{doc.label} <span className="text-red-500">*</span></label>
                    {doc.tooltip && (
                      <div className="relative ml-2 flex items-center">
                        <button 
                          type="button" 
                          onMouseEnter={() => setActiveTooltip(doc.id)}
                          onMouseLeave={() => setActiveTooltip(null)}
                          className="text-gray-400 hover:text-[#064e3b]"
                        >
                          <Info size={16} />
                        </button>
                        {activeTooltip === doc.id && (
                          <div className="absolute left-6 top-0 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                            {doc.tooltip}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isRejected && existingDoc?.rejection_reason && (
                    <div className="mt-2 text-xs text-red-700 bg-red-100/80 p-2.5 rounded-lg border border-red-200 font-semibold">
                      Rejection Reason: {existingDoc.rejection_reason}. Please upload a replacement document.
                    </div>
                  )}
                  
                  <div className="mt-3 flex items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      ref={fileRefs[doc.id]} 
                      onChange={(e) => handleFileChange(doc.id, e.target.files[0])} 
                      className="hidden" 
                      disabled={isApproved}
                    />
                    <button 
                      type="button" 
                      disabled={isApproved}
                      onClick={() => !isApproved && fileRefs[doc.id].current.click()} 
                      className={`flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                        isApproved
                          ? "bg-gray-200/80 text-gray-500 border-gray-300 cursor-not-allowed opacity-75"
                          : "text-gray-700 bg-white hover:bg-gray-100 border-gray-300"
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <Lock size={16} className="mr-2 text-emerald-700" />
                          Approved & Locked
                        </>
                      ) : (
                        <>
                          <Upload size={16} className="mr-2" />
                          {currentFile ? currentFile.name : (uploaded ? "Replace File" : "Select File")}
                        </>
                      )}
                    </button>
                    {!currentFile && uploaded && (
                      <span className="text-sm text-green-600 flex items-center">
                        <Check size={16} className="mr-1"/> Uploaded
                      </span>
                    )}
                    {isApproved && (
                      <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-emerald-600" /> Approved by Compliance
                      </span>
                    )}
                  </div>
                </div>

                <div className="sm:w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Password (Optional)</label>
                  <div className="relative">
                    <input 
                      type={showPasswords[doc.id] ? "text" : "password"} 
                      placeholder="If encrypted"
                      disabled={isApproved}
                      value={passwords[doc.id] || ""}
                      onChange={(e) => setPasswords(prev => ({ ...prev, [doc.id]: e.target.value }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 pr-10 border disabled:bg-gray-200/50 disabled:cursor-not-allowed" 
                    />
                    <button 
                      type="button"
                      disabled={isApproved}
                      onClick={() => setShowPasswords(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-40"
                    >
                      {showPasswords[doc.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200 mt-8">
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors">
          Back
        </button>
        <button 
          type="button" 
          onClick={handleSaveAndContinue}
          disabled={isSaving}
          className="flex items-center px-6 py-2 bg-[#064e3b] text-white rounded-md font-medium hover:bg-[#064e3b]/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : "Save and Continue"}
        </button>
      </div>
    </div>
  );
}
