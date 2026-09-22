"use client";

import { useState } from "react";
import { submitProjectForReview } from "@/app/actions/projects";
import { CheckCircle, FileText, Image as ImageIcon, Loader2, AlertCircle, Flag, Calendar } from "lucide-react";
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import { useUpload } from "@/app/components/wizard/UploadProvider";

const md = new MarkdownIt({ html: true, breaks: true });

function formatUtcDate(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes} UTC`;
  } catch (e) {
    return "—";
  }
}

function formatUtcDateOnly(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return "—";
  }
}

export default function Step6Preview({ projectId, projectData, onPrev, jumpToStep, disabled, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState([]);
  const { hasActiveUploads, uploads, uploadingCount, hasFinishedUploads } = useUpload();

  const issuerMilestones = (projectData?.project_milestones || []).filter(
    (m) => m.milestone_source === "issuer"
  );

  const handleSubmit = async () => {
    if (disabled || hasActiveUploads) return;
    setSubmitting(true);
    setError(null);
    setMissing([]);
    
    try {
      const res = await submitProjectForReview(projectId);
      if (res.success) {
        onSuccess();
      } else if (res.missingFields) {
        setMissing(res.missingFields);
        setError("The form is incomplete. Please fill out the missing fields in the following sections:");
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(err.message || "Failed to submit project.");
    } finally {
      setSubmitting(false);
    }
  };

  const docs = projectData?.project_docs ? [...projectData.project_docs] : [];
  const media = projectData?.project_media ? [...projectData.project_media] : [];
  
  Object.values(uploads).forEach(u => {
    if (u.projectId === projectId) {
      if (u.category === "document" && !docs.some(d => d.doc_type === u.type)) {
        docs.push({ doc_type: u.type, isUploadTemp: true, uploadStatus: u.status });
      } else if (u.category === "media" && !media.some(m => m.url === u.fileId)) {
        media.push({ isUploadTemp: true, uploadStatus: u.status, isCover: u.isCover, url: u.file ? URL.createObjectURL(u.file) : "" });
      }
    }
  });

  const getSectionForField = (field) => {
    if (["title", "full_description", "summary"].includes(field)) return "Basic Info";
    if (["sharia_contract_type"].includes(field)) return "Structure & Compliance";
    if (["target_goal", "soft_cap", "hard_cap", "min_investment_floor", "expected_roi_percent", "yield_type", "currency", "clearing_option", "campaign_end_date"].includes(field)) return "Financial Terms";
    if (field.includes("doc")) return "Documents";
    if (field === "project_media") return "Media";
    return "Other";
  };

  const missingBySection = missing.reduce((acc, field) => {
    const section = getSectionForField(field);
    if (!acc[section]) acc[section] = [];
    acc[section].push(field.replace("_", " ").replace(" doc", ""));
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <CheckCircle className="mx-auto h-12 w-12 text-[#064e3b]" />
        <h3 className="mt-4 text-xl font-medium text-gray-900">
          Review & Submit
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Please review all the project details you have provided. By submitting,
          you attest that the information is accurate and ready for audit.
        </p>
      </div>

      {disabled && (
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
          This project has already been submitted and is currently {projectData?.status.replace("_", " ")}.
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-md border border-red-200">
          <p className="font-bold">{error}</p>
          {Object.entries(missingBySection).length > 0 && (
            <div className="mt-3 space-y-2">
              {Object.entries(missingBySection).map(([section, fields]) => (
                <div key={section}>
                  <p className="font-semibold text-sm underline">{section}</p>
                  <ul className="list-disc pl-5 text-sm mt-1">
                    {fields.map(f => (
                      <li key={f} className="capitalize">{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasActiveUploads ? (
        <div className="p-4 bg-blue-50 text-blue-800 rounded-md border border-blue-200 flex items-start gap-3">
          <Loader2 className="w-5 h-5 mt-0.5 animate-spin" />
          <div>
            <p className="font-bold">Uploads in progress ({uploadingCount} {uploadingCount === 1 ? 'file' : 'files'})</p>
            <p className="text-sm mt-1">Please wait for all documents and media to finish uploading before submitting the project. Please do not close the tab while the upload is in progress.</p>
          </div>
        </div>
      ) : hasFinishedUploads ? (
        <div className="p-4 bg-green-50 text-green-800 rounded-md border border-green-200 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-bold">Uploads completed successfully</p>
            <p className="text-sm mt-1">All your files have been uploaded and saved.</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        {/* Section 1: Basic Info */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 relative">
          {!disabled && (
            <button
              type="button"
              onClick={() => jumpToStep(1)}
              className="absolute top-6 right-6 text-sm font-medium text-[#064e3b] hover:underline"
            >
              Edit
            </button>
          )}
          <h4 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
            Basic Info
          </h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Project Title</dt>
              <dd className="font-medium text-gray-900">
                {projectData?.title || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Summary</dt>
              <dd className="font-medium text-gray-900 line-clamp-2">
                {projectData?.summary || "—"}
              </dd>
            </div>
          </dl>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <dt className="text-gray-500 mb-2">Description Preview</dt>
            <div className="border rounded-md p-4 bg-gray-50 text-black max-h-60 overflow-y-auto text-sm [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-2 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-2 [&_p]:mb-2 [&_strong]:font-bold [&_em]:italic"
                 dangerouslySetInnerHTML={{
                   __html: DOMPurify.sanitize(md.render(projectData?.full_description || ""))
                 }}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <dt className="text-gray-500 mb-3 font-medium flex items-center gap-2">
              <Flag className="w-4 h-4 text-[#059669]" />
              Project Milestones ({issuerMilestones.length})
            </dt>
            {issuerMilestones.length > 0 ? (
              <div className="space-y-3">
                {issuerMilestones.map((ms, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-gray-900">{ms.title || "Untitled Milestone"}</span>
                      {ms.target_date && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium shrink-0 bg-white px-2 py-0.5 rounded border border-gray-200">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {formatUtcDateOnly(ms.target_date)}
                        </span>
                      )}
                    </div>
                    {ms.description && (
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{ms.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No project milestones added.</p>
            )}
          </div>
        </div>

        {/* Section 2: Structure & Compliance */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 relative">
          {!disabled && (
            <button
              type="button"
              onClick={() => jumpToStep(2)}
              className="absolute top-6 right-6 text-sm font-medium text-[#064e3b] hover:underline"
            >
              Edit
            </button>
          )}
          <h4 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
            Structure & Compliance
          </h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Sharia Contract Type</dt>
              <dd className="font-medium text-gray-900 capitalize">
                {projectData?.sharia_contract_type?.replace("_", " ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Unit Type</dt>
              <dd className="font-medium text-gray-900 capitalize">
                {projectData?.unit_type || (projectData?.sharia_contract_type === "spv_equity" ? "shares" : "sukuk")}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Is SPV?</dt>
              <dd className="font-medium text-gray-900">
                {projectData?.is_spv ? "Yes" : "No"}
              </dd>
            </div>
            {projectData?.is_spv && projectData?.spv_details && projectData.spv_details.length > 0 && (
              <>
                <div>
                  <dt className="text-gray-500">SPV Legal Name</dt>
                  <dd className="font-medium text-gray-900">
                    {projectData.spv_details[0].spv_legal_name || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">SPV Registration</dt>
                  <dd className="font-medium text-gray-900">
                    {projectData.spv_details[0].registration_authority || "—"}{" "}
                    ({projectData.spv_details[0].registration_number || "—"})
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {/* Section 3: Financial Terms */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 relative">
          {!disabled && (
            <button
              type="button"
              onClick={() => jumpToStep(3)}
              className="absolute top-6 right-6 text-sm font-medium text-[#064e3b] hover:underline"
            >
              Edit
            </button>
          )}
          <h4 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
            Financial Terms
          </h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Currency</dt>
              <dd className="font-medium text-gray-900 uppercase">
                {projectData?.currency || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">
                {projectData?.sharia_contract_type === "spv_equity" ? "Share Price" : "Unit Price"}
              </dt>
              <dd className="font-medium text-gray-900">
                {projectData?.unit_price ? `${projectData?.currency ? `${projectData.currency} ` : ""}${projectData.unit_price}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Target Goal</dt>
              <dd className="font-medium text-gray-900">
                {projectData?.target_goal?.toLocaleString() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Soft Cap / Hard Cap</dt>
              <dd className="font-medium text-gray-900">
                {projectData?.soft_cap?.toLocaleString() || "—"} / {projectData?.hard_cap?.toLocaleString() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Min Investment Floor</dt>
              <dd className="font-medium text-gray-900">
                {projectData?.min_investment_floor?.toLocaleString() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Campaign Deadline</dt>
              <dd className="font-medium text-gray-900">
                {formatUtcDate(projectData?.campaign_end_date)}
              </dd>
            </div>
            {projectData?.sharia_contract_type !== "spv_equity" && (
              <div>
                <dt className="text-gray-500">Expected ROI</dt>
                <dd className="font-medium text-gray-900">
                  {projectData?.expected_roi_percent || "—"}%
                </dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Yield Type</dt>
              <dd className="font-medium text-gray-900 capitalize">
                {projectData?.yield_type?.replace("_", " ") || "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Section 4: Documents */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 relative">
          {!disabled && (
            <button
              type="button"
              onClick={() => jumpToStep(4)}
              className="absolute top-6 right-6 text-sm font-medium text-[#064e3b] hover:underline"
            >
              Edit
            </button>
          )}
          <h4 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2 flex items-center gap-3">
            <span>Documents</span>
            {docs.some(d => d.uploadStatus === 'error') && (
              <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded">
                {docs.filter(d => d.uploadStatus === 'error').length} Failed Upload(s)
              </span>
            )}
          </h4>
          {docs.length > 0 ? (
            <div className="space-y-3">
              {docs.map((doc, idx) => (
                <div key={idx} className="flex items-center text-sm">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="font-medium text-gray-700 capitalize">
                    {doc.doc_type.replace("_", " ")}
                  </span>
                  <span className={`ml-auto text-xs ${doc.uploadStatus === 'error' ? 'text-red-500 font-bold' : doc.isUploadTemp && doc.uploadStatus !== 'success' ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>
                    {doc.uploadStatus === 'error' ? 'Failed' : doc.isUploadTemp && doc.uploadStatus !== 'success' ? 'Uploading...' : 'Uploaded'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              {hasActiveUploads ? "Documents uploading..." : "No documents uploaded."}
            </p>
          )}
        </div>

        {/* Section 5: Media */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 relative">
          {!disabled && (
            <button
              type="button"
              onClick={() => jumpToStep(5)}
              className="absolute top-6 right-6 text-sm font-medium text-[#064e3b] hover:underline"
            >
              Edit
            </button>
          )}
          <h4 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2 flex items-center gap-3">
            <span>Media</span>
            {media.some(m => m.uploadStatus === 'error') && (
              <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded">
                {media.filter(m => m.uploadStatus === 'error').length} Failed Upload(s)
              </span>
            )}
          </h4>
          <div className="space-y-4">
            <div className="flex items-start text-sm">
              <ImageIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
              <div>
                <span className="font-medium text-gray-700 block mb-1">Cover Image</span>
                {projectData?.cover_image_url || media.some(m => m.isCover) ? (
                  <img 
                    src={projectData?.cover_image_url || media.find(m => m.isCover)?.url} 
                    alt="Cover" 
                    className="h-20 w-32 object-cover rounded border border-gray-200"
                  />
                ) : (
                  <span className="text-xs text-red-500 italic">No cover image uploaded</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center text-sm pt-2 border-t border-gray-100">
              <span className="font-medium text-gray-700">Additional Media</span>
              <span className="ml-auto bg-gray-100 text-gray-800 py-1 px-2 rounded-full text-xs font-semibold">
                {media.filter(m => !m.isCover).length} items
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-10 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onPrev}
          className="py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || disabled || hasActiveUploads}
          className="flex items-center py-2 px-8 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#064e3b] hover:bg-[#064e3b]/90 disabled:opacity-50"
        >
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit for Review"}
        </button>
      </div>
    </div>
  );
}
