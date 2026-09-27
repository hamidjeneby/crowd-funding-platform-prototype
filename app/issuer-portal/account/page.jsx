"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { isValidIBAN } from "ibantools";
import {
  Landmark,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  Save,
  Users,
  Lock,
  ExternalLink,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import {
  getIssuerAccountData,
  updateIssuerBankDetails,
} from "@/app/actions/issuer-account";

const bankDetailsSchema = z.object({
  bank_name: z.string().min(2, "Bank name is required"),
  account_name: z.string().min(2, "Account holder name is required"),
  account_number: z
    .string()
    .min(7, "Account number must be more than 6 characters"),
  iban: z
    .string()
    .min(1, "IBAN is required")
    .refine((val) => isValidIBAN(val.replace(/\s+/g, "")), {
      message: "Invalid IBAN number",
    }),
  swift_code: z
    .string()
    .min(8, "SWIFT code must be at least 8 characters")
    .regex(
      /^[A-Z0-9]+$/,
      "SWIFT code must contain only uppercase letters and numbers"
    ),
  bank_address: z.string().min(5, "Bank address is required"),
  currency: z.string().min(3, "Currency must be selected"),
});

export default function IssuerAccountPage() {
  const [issuerData, setIssuerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditingBank, setIsEditingBank] = useState(false);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      bank_name: "",
      account_name: "",
      account_number: "",
      iban: "",
      swift_code: "",
      bank_address: "",
      currency: "",
    },
  });

  const loadAccountData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getIssuerAccountData();
      if (res.success && res.issuer) {
        setIssuerData(res.issuer);
        const b = res.issuer.bank_details || {};
        reset({
          bank_name: b.bank_name || "",
          account_name: b.account_name || b.accountHolderName || "",
          account_number: b.account_number || "",
          iban: b.iban || "",
          swift_code: b.swift_code || b.swiftCode || "",
          bank_address: b.bank_address || "",
          currency: b.currency || "",
        });
      } else {
        setError(res.error || "Failed to load issuer data.");
      }
    } catch (err) {
      setError("An error occurred while loading issuer data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccountData();
  }, []);

  const handleSaveBank = async (formData) => {
    setIsSubmittingBank(true);
    setError(null);
    try {
      const res = await updateIssuerBankDetails(formData);
      if (res.success) {
        setIsEditingBank(false);
        setSaveMessage(
          "Bank details updated successfully! Bank verification status has been set to Pending for compliance review."
        );
        await loadAccountData();
        setTimeout(() => setSaveMessage(""), 7000);
      } else {
        setError(res.error || "Failed to save bank details.");
      }
    } catch (err) {
      setError("An unexpected error occurred while saving bank details.");
    } finally {
      setIsSubmittingBank(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] p-10 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-[#064e3b] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-gray-500">
          Loading organization account data...
        </p>
      </div>
    );
  }

  const bankDetails = issuerData?.bank_details || {};
  const bankStatus = issuerData?.bank_verification_status || "pending";
  const reps = issuerData?.representatives || [];

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-8 text-[#064e3b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#059669]/15 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
            <Landmark className="w-4 h-4" /> Organization Governance & Banking
          </div>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
            Account & Banking
          </h1>
          <p className="text-sm text-[#064e3b]/70 mt-0.5">
            Verified corporate KYB details, authorized representative credentials, and settlement bank accounts.
          </p>
        </div>
      </div>

      {saveMessage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: BASIC DETAILS / CORPORATE KYB DATA (READ-ONLY) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#064e3b]">
                Corporate KYB Information
              </h3>
              <p className="text-xs text-gray-500">
                Verified organization identity and incorporation data (Read-Only).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-[#064e3b] border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" /> KYB Status: {issuerData?.onboarding_status || "Completed"}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center gap-1 border border-gray-200">
              <Lock className="w-3 h-3" /> Locked
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
            <span className="text-gray-400 font-medium block">Legal Entity Name</span>
            <span className="font-bold text-[#064e3b] text-sm block">
              {issuerData?.legal_entity_name || "N/A"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
            <span className="text-gray-400 font-medium block">Trade License Number</span>
            <span className="font-bold font-mono text-[#064e3b] text-sm block">
              {issuerData?.trade_license_number || "N/A"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
            <span className="text-gray-400 font-medium block">Licensing Authority</span>
            <span className="font-bold text-[#064e3b] text-sm block">
              {issuerData?.license_authority || "N/A"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
            <span className="text-gray-400 font-medium block">Business Structure / Type</span>
            <span className="font-bold text-[#064e3b] text-sm block">
              {issuerData?.business_type || "N/A"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
            <span className="text-gray-400 font-medium block">Country of Incorporation</span>
            <span className="font-bold text-[#064e3b] text-sm block">
              {issuerData?.country || "N/A"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
            <span className="text-gray-400 font-medium block">City / Emirate</span>
            <span className="font-bold text-[#064e3b] text-sm block">
              {issuerData?.city || "N/A"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
            <span className="text-gray-400 font-medium block">Corporate Business Email</span>
            <span className="font-bold font-mono text-[#064e3b] text-sm block">
              {issuerData?.business_email || "N/A"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-emerald-100 space-y-1">
            <span className="text-gray-400 font-medium block">Corporate Business Phone</span>
            <span className="font-bold font-mono text-[#064e3b] text-sm block">
              {issuerData?.business_phone_number || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: AUTHORIZED REPRESENTATIVES DETAILS (READ-ONLY) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#064e3b]">
                Authorized Representative Details
              </h3>
              <p className="text-xs text-gray-500">
                Verified corporate signatories, directors, and ultimate beneficial owners (Read-Only).
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center gap-1 border border-gray-200">
            <Lock className="w-3 h-3" /> Locked
          </span>
        </div>

        {reps.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 font-medium bg-gray-50 rounded-2xl border border-gray-100">
            No specific representative records attached.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {reps.map((rep, idx) => (
              <div
                key={rep.id || idx}
                className="p-5 rounded-2xl bg-[#fdfbf7] border border-indigo-100 space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-indigo-50 pb-3">
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm">
                      {rep.full_name || "Representative"}
                    </h4>
                    {rep.other_designation && (
                      <p className="text-[11px] text-gray-500 font-medium">
                        {rep.other_designation}
                      </p>
                    )}
                  </div>
                  {rep.id_url && (
                    <a
                      href={rep.id_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 underline"
                    >
                      View ID <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Role Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {rep.is_authorized_signatory && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Authorized Signatory
                    </span>
                  )}
                  {rep.is_director && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                      Director
                    </span>
                  )}
                  {rep.is_ubo && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px]">
                      UBO ({rep.ubo_percentage || 0}%)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-gray-600 text-xs pt-1">
                  <div>
                    <span className="text-gray-400 block text-[11px]">ID Type</span>
                    <span className="font-semibold text-gray-900">{rep.id_type || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">ID Number</span>
                    <span className="font-semibold font-mono text-gray-900">
                      {rep.id_number || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: SETTLEMENT BANK DETAILS (EDITABLE - EDITING FLIPS STATUS TO PENDING) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#064e3b]">
                Settlement Bank Account
              </h3>
              <p className="text-xs text-gray-500">
                Primary organization bank account for distributions and payouts (Editable).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {bankStatus === "approved" || bankStatus === "verified" ? (
              <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-[#064e3b] border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#059669]" /> Bank Approved
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Pending Verification
              </span>
            )}

            {!isEditingBank && (
              <button
                onClick={() => setIsEditingBank(true)}
                className="px-4 py-2 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Bank Details
              </button>
            )}
          </div>
        </div>

        {isEditingBank ? (
          <form onSubmit={handleSubmit(handleSaveBank)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("bank_name")}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] p-2 border font-medium"
                />
                {errors.bank_name && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.bank_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Account Name (Beneficiary) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("account_name")}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] p-2 border font-medium"
                />
                {errors.account_name && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.account_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("account_number")}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] p-2 border font-medium"
                />
                {errors.account_number && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.account_number.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  IBAN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("iban")}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] p-2 border font-mono uppercase"
                />
                {errors.iban && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.iban.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  SWIFT / BIC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("swift_code")}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] p-2 border uppercase font-mono"
                />
                {errors.swift_code && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.swift_code.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Currency <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("currency")}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] p-2 border bg-white font-medium"
                >
                  <option value="">Select currency</option>
                  <option value="AED">AED - United Arab Emirates Dirham</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
                {errors.currency && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.currency.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-gray-700 mb-1">
                  Bank Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register("bank_address")}
                  rows={2}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] p-2 border font-medium"
                />
                {errors.bank_address && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.bank_address.message}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold flex items-center gap-2 border border-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Saving changes will update your bank account details and reset your bank verification status back to Pending for compliance verification.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingBank(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingBank}
                className="px-5 py-2 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingBank ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Bank Details...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Bank Details
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-teal-100 space-y-1">
              <span className="text-gray-400 font-medium block">Bank Name</span>
              <span className="font-bold text-[#064e3b] text-sm block">
                {bankDetails.bank_name || bankDetails.bankName || "Not set"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-teal-100 space-y-1">
              <span className="text-gray-400 font-medium block">Account Holder Name</span>
              <span className="font-bold text-[#064e3b] text-sm block">
                {bankDetails.account_name || bankDetails.accountHolderName || "Not set"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-teal-100 space-y-1">
              <span className="text-gray-400 font-medium block">Account Number</span>
              <span className="font-bold font-mono text-[#064e3b] text-sm block">
                {bankDetails.account_number || "Not set"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-teal-100 space-y-1">
              <span className="text-gray-400 font-medium block">IBAN Number</span>
              <span className="font-bold font-mono text-[#064e3b] text-sm block uppercase">
                {bankDetails.iban || "Not set"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-teal-100 space-y-1">
              <span className="text-gray-400 font-medium block">SWIFT / BIC Code</span>
              <span className="font-bold font-mono text-[#064e3b] text-sm block uppercase">
                {bankDetails.swift_code || bankDetails.swiftCode || "Not set"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fdfbf7] border border-teal-100 space-y-1">
              <span className="text-gray-400 font-medium block">Currency</span>
              <span className="font-bold font-mono text-[#064e3b] text-sm block">
                {bankDetails.currency || "Not set"}
              </span>
            </div>

            <div className="md:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-[#fdfbf7] border border-teal-100 space-y-1">
              <span className="text-gray-400 font-medium block">Bank Address</span>
              <span className="font-bold text-[#064e3b] text-sm block">
                {bankDetails.bank_address || "Not set"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
