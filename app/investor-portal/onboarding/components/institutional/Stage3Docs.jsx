"use client";

import { useState, useRef } from "react";
import { Upload, Info, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { saveStage3Doc, updateDocPassword } from "@/app/actions/investor-onboarding";
import { useRouter } from "next/navigation";

const REQUIRED_DOCS = [
  { id: "trade_certificate", label: "Trade Certificate" },
  { id: "certificate_of_incorporation", label: "Certificate of Incorporation" },
  { id: "audited_financials", label: "Audited Financial Statements", tooltip: "Upload the latest audited financial statements for the entity" },
  { id: "source_of_funds", label: "Source of Funds Declaration", tooltip: "Upload a declaration detailing the source of funds" },
  { id: "bank_verification_letter", label: "Bank Verification Letter", tooltip: "IBAN certificate or bounced cheque or monthly bank statement" },
];

export default function Stage3DocsInst({ docs, onUpdate, onNext, onBack }) {
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
  
  const fileRefs = {
    trade_certificate: useRef(),
    certificate_of_incorporation: useRef(),
    audited_financials: useRef(),
    source_of_funds: useRef(),
    bank_verification_letter: useRef(),
  };

  const [error, setError] = useState(null);

  const isUploaded = (docId) => docs.some(d => d.doc_type === docId);

  const handleFileChange = (docId, file) => {
    setError(null);
    if (file) {
      if (!file.type.match(/^(image\/.*|application\/pdf)$/)) {
        setError("Only images or PDF files are allowed.");
        return;
      }
      setFiles(prev => ({ ...prev, [docId]: file }));
    }
  };

  const handleSaveAndContinue = async () => {
    setError(null);
    const missing = REQUIRED_DOCS.filter(d => !files[d.id] && !isUploaded(d.id));
    
    if (missing.length > 0) {
      setError(`Please upload all required documents. Missing: ${missing.map(m => m.label).join(", ")}`);
      return;
    }

    setIsSaving(true);
    try {
      const uploadPromises = REQUIRED_DOCS.map(async (doc) => {
        const docId = doc.id;
        const file = files[docId];
        
        if (file) {
          const formData = new FormData();
          formData.append("doc_type", docId);
          formData.append("file", file);
          if (passwords[docId]) {
            formData.append("document_password", passwords[docId]);
          }
          await saveStage3Doc(formData);
        } else if (isUploaded(docId)) {
          const originalDoc = docs.find(d => d.doc_type === docId);
          const currentPassword = passwords[docId] || "";
          const originalPassword = originalDoc?.document_password || "";
          
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
      setError("An unexpected error occurred while saving documents. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Document Upload</h3>
        <p className="text-sm text-gray-500">Please upload the required corporate documents. Only PDF and Image files are accepted.</p>
      </div>

      <div className="space-y-6">
        <p className="text-sm text-red-500 font-medium">* Indicates a required field</p>
        {REQUIRED_DOCS.map(doc => {
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
                  
                  <div className="mt-3 flex items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      ref={fileRefs[doc.id]} 
                      onChange={(e) => handleFileChange(doc.id, e.target.files[0])} 
                      className="hidden" 
                    />
                    <button 
                      type="button" 
                      onClick={() => fileRefs[doc.id].current.click()} 
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
                    >
                      <Upload size={16} className="mr-2" />
                      {currentFile ? currentFile.name : (uploaded ? "Replace File" : "Select File")}
                    </button>
                    {!currentFile && uploaded && (
                      <span className="text-sm text-green-600 flex items-center">
                        <Check size={16} className="mr-1"/> Uploaded
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
                      value={passwords[doc.id] || ""}
                      onChange={(e) => setPasswords(prev => ({ ...prev, [doc.id]: e.target.value }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 pr-10 border" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
