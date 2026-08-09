"use client";

import { useState } from "react";
import { updateProjectDraft, deleteProjectDoc } from "@/app/actions/projects";
import { authorizeUploadBatch, deleteProjectFile } from "@/app/actions/upload";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useUpload } from "@/app/components/wizard/UploadProvider";

export default function Step4Documents({ projectId, initialData, onNext, onPrev, disabled, onUpdate }) {
  const [files, setFiles] = useState({});
  const [otherFiles, setOtherFiles] = useState([]); // List of 'other' files staged
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  const [replacedFiles, setReplacedFiles] = useState({});
  const { queueUploads, uploads, retryUpload, clearUpload } = useUpload();

  const docs = initialData?.project_docs || [];
  
  const REQUIRED_DOCS = [
    { type: "pitch_deck", label: "Pitch Deck" },
    { type: "balance_sheet", label: "Balance Sheet" },
    { type: "valuation_report", label: "Valuation Report" },
  ];
  if (initialData?.is_spv) {
    REQUIRED_DOCS.push({ type: "cap_table", label: "Cap Table" });
    REQUIRED_DOCS.push({ type: "spv_registration", label: "SPV Registration Document" });
  }
  
  const handleFileChange = (docType, file, existingUrl) => {
    if (file) {
      setFiles(prev => ({ ...prev, [docType]: file }));
      clearUpload(`doc_${docType}`);
      if (existingUrl) {
        setReplacedFiles(prev => ({ ...prev, [docType]: existingUrl }));
      }
    }
  };

  const handleRemove = async (docType, existingFileUrl) => {
    if (files[docType]) {
      // Just clear local stage
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[docType];
        return newFiles;
      });
    } else if (existingFileUrl) {
      // Delete from server
      setUploading(true);
      setError(null);
      try {
        await deleteProjectFile(projectId, existingFileUrl, "document");
        await onUpdate();
      } catch (err) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSaveAndContinue = async () => {
    setError(null);

    // Validate required slots
    const missing = REQUIRED_DOCS.filter(docDef => {
      const hasExisting = docs.some(d => d.doc_type === docDef.type);
      const isStaged = !!files[docDef.type];
      const isUploadingOrDone = !!uploads[`doc_${docDef.type}`];
      return !hasExisting && !isStaged && !isUploadingOrDone;
    });

    if (missing.length > 0) {
      setError(`Please upload all required documents. Missing: ${missing.map(m => m.label).join(", ")}`);
      return;
    }

    setUploading(true);

    try {
      // Prepare payload for signed URLs
      const filePayloads = [];
      const localFileMap = {}; // tempId -> File

      // Only required slots
      for (const [docType, file] of Object.entries(files)) {
        const ext = file.name.split(".").pop();
        const tempId = `doc_${docType}`;
        filePayloads.push({ tempId, category: "document", type: docType, ext });
        localFileMap[tempId] = file;
      }

      if (filePayloads.length === 0) {
        // Nothing new to upload, just save draft and continue
        await updateProjectDraft(projectId, {}, 4);
        onNext();
        return;
      }

      // Step A: Get Signed URLs / Authorized Paths
      const authorizedFiles = await authorizeUploadBatch(projectId, filePayloads);
      
      // Step B: Queue uploads in the global context
      const uploadConfigs = authorizedFiles.map(authData => {
        const file = localFileMap[authData.tempId];
        const payload = filePayloads.find(p => p.tempId === authData.tempId);
        
        return {
          fileId: authData.tempId,
          projectId,
          file,
          filename: file.name,
          category: payload.category,
          type: payload.type,
          bucket: authData.bucket,
          path: authData.path,
          isCover: authData.isCover,
          upsert: authData.upsert,
          signedUrl: authData.signedUrl // Only exists if it was a standard upload (e.g. cover image)
        };
      });

      queueUploads(uploadConfigs);

      // Delete old replaced files
      for (const [docType, file] of Object.entries(files)) {
        if (replacedFiles[docType]) {
          try {
            await deleteProjectFile(projectId, replacedFiles[docType], "document");
          } catch (e) {
            console.error("Failed to delete replaced file:", e);
          }
        }
      }

      // Clear local states
      setFiles({});
      setReplacedFiles({});

      // Save step progress in backend and continue immediately
      await updateProjectDraft(projectId, {}, 4);
      
      await onUpdate();
      onNext();
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Documents</h2>
      
      {error && <p className="text-red-500 font-medium bg-red-50 p-3 rounded-md">{error}</p>}
      
      <div className="space-y-4">
        {REQUIRED_DOCS.map((docDef) => {
          const existing = docs.find(d => d.doc_type === docDef.type);
          const currentFile = files[docDef.type];
          const uploadState = uploads[`doc_${docDef.type}`];
          
          return (
            <div key={docDef.type} className="p-4 border rounded-md flex justify-between items-center bg-gray-50">
              <div className="flex-1 mr-4">
                <h3 className="font-medium">{docDef.label} <span className="text-red-500">*</span></h3>
                
                {uploadState ? (
                  <div className="mt-1">
                    <span className={`text-sm font-medium ${uploadState.status === "error" ? "text-red-600" : uploadState.status === "success" ? "text-green-600" : "text-blue-600"}`}>
                      {uploadState.status === "error" ? "Upload Failed" : uploadState.status === "success" ? "Uploaded Successfully" : "Uploading in background..."}
                    </span>
                    {uploadState.status === "error" && <span className="text-xs text-red-500 block">{uploadState.errorMessage || uploadState.filename}</span>}
                  </div>
                ) : currentFile ? (
                  <span className="text-sm text-gray-600 block mt-1 font-medium">{currentFile.name} (Staged)</span>
                ) : existing ? (
                  <span className="text-sm text-green-600 block mt-1 font-medium">Uploaded Successfully</span>
                ) : null}
              </div>
              
              {!disabled && (
                <div className="flex gap-2 items-center">
                  {uploadState?.status === "error" && (
                    <button type="button" onClick={() => retryUpload(`doc_${docDef.type}`)} className="text-sm flex items-center text-blue-600 hover:text-blue-800 px-2 py-1">
                      <RefreshCw className="w-4 h-4 mr-1" /> Retry
                    </button>
                  )}
                  {(currentFile || existing) && !uploadState && (
                    <button
                      type="button"
                      onClick={() => handleRemove(docDef.type, existing?.file_url)}
                      disabled={uploading}
                      className="text-sm text-red-600 hover:text-red-800 px-2 py-1"
                    >
                      Remove
                    </button>
                  )}
                  
                  {(!uploadState || uploadState.status === "error" || uploadState.status === "success") && (
                    <label className="cursor-pointer bg-white py-1 px-3 border rounded shadow-sm text-sm hover:bg-gray-50">
                      {currentFile || existing || uploadState?.status === "success" ? "Replace" : "Upload"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileChange(docDef.type, e.target.files[0], existing?.file_url)}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onPrev}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={disabled ? onNext : handleSaveAndContinue}
          disabled={uploading}
          className="flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#064e3b] hover:bg-[#064e3b]/90 disabled:opacity-50"
        >
          {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : (disabled ? "Next" : "Save & Continue")}
        </button>
      </div>
    </div>
  );
}
