"use client";

import { useState } from "react";
import { CheckCircle2, Edit2, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function StageReview({ investorData, repsData, docsData, type, onEditSection, onSubmit }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttested, setHasAttested] = useState(false);
  const isInstitutional = type === "institutional";

  const bankDetails = investorData.bank_details ? 
    (typeof investorData.bank_details === 'string' ? JSON.parse(investorData.bank_details) : investorData.bank_details) 
    : null;

  const handleSubmit = async () => {
    if (!hasAttested) {
      alert("Please confirm the attestation before submitting.");
      return;
    }
    setIsSubmitting(true);
    await onSubmit();
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Review & Attest</h3>
        <p className="text-sm text-gray-500">Please review your information before final submission.</p>
      </div>

      <div className="space-y-6">
        {/* Entity / Personal Info */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900 flex items-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
              {isInstitutional ? "Entity Information" : "Personal Information"}
            </h4>
            <button onClick={() => onEditSection(1)} className="text-[#064e3b] text-sm font-medium hover:underline flex items-center">
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </button>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {isInstitutional ? (
              <>
                <div><span className="text-gray-500 block mb-1">Legal Entity Name</span><span className="font-medium text-gray-900">{investorData.legal_entity_name || "-"}</span></div>
                <div><span className="text-gray-500 block mb-1">Country</span><span className="font-medium text-gray-900">{investorData.country || "-"}</span></div>
                <div><span className="text-gray-500 block mb-1">Business Type</span><span className="font-medium text-gray-900">{investorData.business_type || "-"}</span></div>
                <div><span className="text-gray-500 block mb-1">License Authority</span><span className="font-medium text-gray-900">{investorData.license_authority || "-"}</span></div>
              </>
            ) : (
              <>
                <div><span className="text-gray-500 block mb-1">Full Name</span><span className="font-medium text-gray-900">{investorData.full_name || "-"}</span></div>
                <div><span className="text-gray-500 block mb-1">Country of Residence</span><span className="font-medium text-gray-900">{investorData.country || "-"}</span></div>
                <div><span className="text-gray-500 block mb-1">Nationality</span><span className="font-medium text-gray-900">{investorData.nationality || "-"}</span></div>
                <div><span className="text-gray-500 block mb-1">Date of Birth</span><span className="font-medium text-gray-900">{investorData.DOB ? investorData.DOB.split('-').reverse().join('/') : "-"}</span></div>
                <div><span className="text-gray-500 block mb-1">National ID / Passport Number</span><span className="font-medium text-gray-900">{investorData.id_number || "-"}</span></div>
              </>
            )}
            <div><span className="text-gray-500 block mb-1">Net Worth</span><span className="font-medium text-gray-900">{investorData.net_worth ? `AED ${investorData.net_worth}` : "-"}</span></div>
            <div><span className="text-gray-500 block mb-1">Investment Experience</span><span className="font-medium text-gray-900">{investorData.investment_experience_years !== null ? `${investorData.investment_experience_years} years` : "-"}</span></div>
          </div>
        </div>

        {/* Authorized Reps (Institutional only) */}
        {isInstitutional && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h4 className="font-medium text-gray-900 flex items-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                Authorized Representatives
              </h4>
              <button onClick={() => onEditSection(2)} className="text-[#064e3b] text-sm font-medium hover:underline flex items-center">
                <Edit2 className="w-4 h-4 mr-1" /> Edit
              </button>
            </div>
            <div className="p-6 text-sm">
              {repsData.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {repsData.map(rep => (
                    <li key={rep.id} className="py-3 first:pt-0 last:pb-0 flex justify-between">
                      <span className="font-medium text-gray-900">{rep.full_name}</span>
                      <span className="text-gray-500">{rep.id_type}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No representatives added.</p>
              )}
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900 flex items-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
              Uploaded Documents
            </h4>
            <button onClick={() => onEditSection(isInstitutional ? 3 : 2)} className="text-[#064e3b] text-sm font-medium hover:underline flex items-center">
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </button>
          </div>
          <div className="p-6 text-sm">
            {docsData.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {docsData.map(doc => (
                  <span key={doc.id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200">
                    {doc.doc_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No documents uploaded.</p>
            )}
          </div>
        </div>

        {/* Banking */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900 flex items-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
              Banking Details
            </h4>
            <button onClick={() => onEditSection(isInstitutional ? 4 : 3)} className="text-[#064e3b] text-sm font-medium hover:underline flex items-center">
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </button>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {bankDetails ? (
              <>
                <div><span className="text-gray-500 block mb-1">Bank Name</span><span className="font-medium text-gray-900">{bankDetails.bank_name}</span></div>
                <div><span className="text-gray-500 block mb-1">Account Number</span><span className="font-medium text-gray-900">{bankDetails.account_number}</span></div>
                <div><span className="text-gray-500 block mb-1">IBAN</span><span className="font-medium text-gray-900">{bankDetails.iban}</span></div>
                <div><span className="text-gray-500 block mb-1">Currency</span><span className="font-medium text-gray-900">{bankDetails.currency}</span></div>
              </>
            ) : (
              <p className="text-gray-500 italic col-span-2">No banking details provided.</p>
            )}
          </div>
        </div>

        {/* Attestation Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <div className="flex items-start">
            <ShieldCheck className="w-6 h-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-md font-medium text-blue-900 mb-2">Final Attestation</h4>
              <p className="text-sm text-blue-800 mb-4 leading-relaxed">
                I hereby declare that the information provided in this application is true, accurate, and complete to the best of my knowledge. I understand that providing false or misleading information may lead to the rejection of this application or termination of any subsequent agreement. I authorize the platform to verify the provided information and documents with relevant authorities.
              </p>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hasAttested}
                  onChange={(e) => setHasAttested(e.target.checked)}
                  className="w-5 h-5 text-[#064e3b] border-gray-300 rounded focus:ring-[#064e3b]"
                />
                <span className="text-sm font-medium text-blue-900">
                  I agree to the above terms and attest to the accuracy of my submission.
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-8 border-t border-gray-200 mt-8">
        <button 
          type="button" 
          onClick={() => onEditSection(isInstitutional ? 4 : 3)} 
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button 
          type="button" 
          onClick={handleSubmit}
          disabled={!hasAttested || isSubmitting}
          className="flex items-center px-8 py-3 bg-[#064e3b] text-white rounded-md font-medium hover:bg-[#064e3b]/90 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting Application...</>
          ) : (
            "Submit Application"
          )}
        </button>
      </div>
    </div>
  );
}
