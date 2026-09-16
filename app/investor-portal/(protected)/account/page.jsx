"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { isValidIBAN } from "ibantools";
import {
  getInvestorPortalData,
  requestClassUpgrade,
  updateBankDetails,
} from "@/app/actions/investor-portal";
import {
  ShieldCheck,
  User,
  Building,
  Landmark,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Loader2,
  Users,
  Pencil,
  RotateCcw,
} from "lucide-react";

const bankSchema = z.object({
  account_name: z.string().min(2, "Account holder name is required"),
  bank_name: z.string().min(2, "Bank name is required"),
  account_number: z.string().refine((val) => val.trim().length > 6, {
    message: "Account number must be more than 6 characters",
  }),
  iban: z
    .string()
    .min(1, "IBAN is required")
    .refine((val) => isValidIBAN(val.replace(/\s+/g, "")), {
      message: "Invalid IBAN number. Please enter a valid IBAN",
    }),
  swift_code: z
    .string()
    .min(8, "SWIFT / BIC code must be at least 8 characters")
    .regex(
      /^[A-Z0-9]+$/i,
      "SWIFT / BIC code must contain only uppercase letters and numbers",
    ),
  currency: z.string().min(1, "Currency must be selected"),
  bank_address: z.string().min(5, "Bank address is required"),
});

export default function AccountAndBankingPage() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Bank Edit Mode State
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    account_name: "",
    bank_name: "",
    account_number: "",
    iban: "",
    swift_code: "",
    currency: "USD",
    bank_address: "",
  });
  const [bankStatus, setBankStatus] = useState("verified");
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankSuccessMsg, setBankSuccessMsg] = useState("");
  const [bankErrorMsg, setBankErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bankSchema),
    defaultValues: bankForm,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getInvestorPortalData();
        setProfile(data);
        setBankStatus(data.bank_verification_status || "verified");

        const bd = data.bank_details || {};
        const loadedForm = {
          account_name:
            bd.account_name || bd.account_holder || data.legal_name || "",
          bank_name: bd.bank_name || "",
          account_number: bd.account_number || "",
          iban: bd.iban || "",
          swift_code: bd.swift_code || bd.routing_number || "",
          currency: bd.currency || "USD",
          bank_address: bd.bank_address || "",
        };
        setBankForm(loadedForm);
        reset(loadedForm);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [reset]);

  const handleStartEdit = () => {
    reset(bankForm);
    setIsEditingBank(true);
  };

  const handleUpgradeSubmit = async (e) => {
    e.preventDefault();
    if (!upgradeReason.trim()) return;

    setIsSubmittingUpgrade(true);
    try {
      const res = await requestClassUpgrade(upgradeReason);
      if (res.success) {
        setIsUpgradeModalOpen(false);
        setUpgradeReason("");
        setIsSuccessModalOpen(true);
      }
    } catch (err) {
      console.error("Error requesting class upgrade:", err);
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  const handleBankSubmit = async (formData) => {
    setBankErrorMsg("");
    setBankSuccessMsg("");

    const payload = {
      ...formData,
      account_name: formData.account_name.trim(),
      bank_name: formData.bank_name.trim(),
      account_number: formData.account_number.trim(),
      iban: (formData.iban || "").trim().replace(/\s+/g, ""),
      swift_code: (formData.swift_code || "").trim().toUpperCase(),
      currency: formData.currency.trim(),
      bank_address: formData.bank_address.trim(),
    };

    setIsSavingBank(true);
    try {
      const res = await updateBankDetails(payload);
      if (res.success) {
        setBankStatus("pending");
        setIsEditingBank(false);
        setBankForm(payload);
        reset(payload);
        setBankSuccessMsg(
          "Bank details updated! Your bank verification status has been reset to PENDING. Wallet loading & payouts are temporarily paused until verified.",
        );
      } else {
        setBankErrorMsg(res.error || "Failed to update bank details.");
      }
    } catch (err) {
      setBankErrorMsg(
        "An unexpected error occurred while saving bank details.",
      );
    } finally {
      setIsSavingBank(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
      </div>
    );
  }

  // Format Investor Class Display (No default value, "Class N/A" if missing)
  const rawClass = profile?.investor_class;
  const strClass =
    rawClass !== null && rawClass !== undefined ? String(rawClass).trim() : "";
  const displayClass = strClass
    ? strClass.toLowerCase().startsWith("class")
      ? strClass
      : `Class ${strClass}`
    : "Class N/A";

  return (
    <div className="min-h-screen bg-[#fcfaf7] p-6 lg:p-10 space-y-10">
      {/* Header */}
      <div className="border-b border-[#059669]/15 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]">
          <ShieldCheck className="w-4 h-4" /> Account Settings
        </div>
        <h1 className="text-3xl font-extrabold text-[#064e3b] mt-1">
          Account & Banking
        </h1>
        <p className="text-sm text-[#064e3b]/70 mt-0.5">
          Manage investor classification, entity details, institutional
          representatives, and verified banking payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Profile Info + Investor Class + Institutional Reps */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile & Entity Details */}
          <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center">
                {profile?.type === "institutional" ? (
                  <Building className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#064e3b]">
                  {profile?.legal_name}
                </h2>
                <span className="text-xs font-semibold text-gray-500 capitalize">
                  {profile?.type} Investor Profile
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500 font-medium">
                  Legal Name / Entity
                </span>
                <p className="font-bold text-[#064e3b] mt-0.5">
                  {profile?.legal_name}
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Primary Email</span>
                <p className="font-bold text-[#064e3b] mt-0.5">
                  {profile?.email || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Phone Number</span>
                <p className="font-bold text-[#064e3b] mt-0.5">
                  {profile?.phone || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">
                  Onboarding Status
                </span>
                <p className="font-bold text-emerald-700 capitalize mt-0.5">
                  {profile?.onboarding_status || "Complete"}
                </p>
              </div>
            </div>
          </div>

          {/* Investor Class Card & Upgrade Button */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#064e3b] to-emerald-950 text-white shadow-md space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  <Award className="w-4 h-4" /> Current Investor Classification
                </div>
                {/* Formatted Class Display: Class {{investor_class}} or Class N/A */}
                <div className="text-2xl font-black">{displayClass}</div>
                <p className="text-xs text-emerald-200/80">
                  Determines your maximum annual pledge limits and eligibility
                  for private placement offerings.
                </p>
              </div>

              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-400 transition-all shadow-md cursor-pointer self-start sm:self-auto whitespace-nowrap"
              >
                Request Class Upgrade
              </button>
            </div>
          </div>

          {/* Institutional Representatives Section (if institutional) */}
          {profile?.type === "institutional" && (
            <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#064e3b]">
                  <Users className="w-5 h-5 text-[#059669]" />
                  <h2 className="text-lg font-bold">
                    Authorized Representatives
                  </h2>
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  Managing Entity Reps
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                <div className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#064e3b]">
                      {profile?.legal_name} Rep
                    </div>
                    <div className="text-gray-500">
                      Primary Authorized Signatory
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Active Admin
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 col): Bank Details (View Only vs Edit Mode) */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-[#059669]/15 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#064e3b]">
                <Landmark className="w-5 h-5 text-[#059669]" />
                <h2 className="text-lg font-bold">Payout Bank Details</h2>
              </div>

              {(() => {
                const normStatus = (bankStatus || "pending")
                  .toLowerCase()
                  .trim();
                if (normStatus === "approved" || normStatus === "verified") {
                  return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                      Approved
                    </span>
                  );
                }
                if (normStatus === "rejected") {
                  return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 bg-red-100 text-red-800 border border-red-300">
                      <XCircle className="w-3.5 h-3.5 text-red-600" /> Rejected
                    </span>
                  );
                }
                return (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />{" "}
                    Pending
                  </span>
                );
              })()}
            </div>

            {bankSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                {bankSuccessMsg}
              </div>
            )}

            {bankErrorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                {bankErrorMsg}
              </div>
            )}

            {/* VIEW ONLY MODE */}
            {!isEditingBank ? (
              <div className="space-y-5 text-xs">
                <div className="space-y-3.5">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 font-medium">
                      Account Name
                    </span>
                    <span className="font-bold text-[#064e3b]">
                      {bankForm.account_name || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 font-medium">Bank Name</span>
                    <span className="font-bold text-[#064e3b]">
                      {bankForm.bank_name || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 font-medium">
                      Account Number
                    </span>
                    <span className="font-mono font-bold text-[#064e3b]">
                      {bankForm.account_number || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 font-medium">IBAN</span>
                    <span className="font-mono font-bold text-[#064e3b] break-all text-right max-w-[200px]">
                      {bankForm.iban || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 font-medium">
                      SWIFT / BIC Code
                    </span>
                    <span className="font-mono font-bold text-[#064e3b]">
                      {bankForm.swift_code || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 font-medium">Currency</span>
                    <span className="font-bold text-[#064e3b]">
                      {bankForm.currency || "USD"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500 font-medium">
                      Bank Address
                    </span>
                    <span className="font-bold text-[#064e3b] text-right max-w-[200px]">
                      {bankForm.bank_address || "N/A"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-bold hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Pencil className="w-4 h-4" /> Edit Bank Details
                </button>
              </div>
            ) : (
              /* EDIT MODE: WARNING BANNER APPEARS HERE */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />{" "}
                    Important Verification Notice
                  </div>
                  <p className="leading-relaxed">
                    Updating your bank details will automatically reset your
                    status to <strong>PENDING VERIFICATION</strong>. While
                    pending, wallet loading will be temporarily disabled and any
                    pending dividend payouts will be withheld until verified.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(handleBankSubmit)}
                  className="space-y-3.5 text-xs"
                >
                  <div>
                    <label className="block font-bold text-[#064e3b] uppercase mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      {...register("account_name")}
                      className={`w-full px-3.5 py-2 rounded-xl bg-[#fcfaf7] border text-[#064e3b] font-medium focus:outline-none focus:ring-2 focus:ring-[#059669] ${
                        errors.account_name ? "border-red-500" : "border-[#059669]/30"
                      }`}
                    />
                    {errors.account_name && (
                      <p className="mt-1 text-xs text-red-600 font-medium">
                        {errors.account_name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-[#064e3b] uppercase mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      {...register("bank_name")}
                      className={`w-full px-3.5 py-2 rounded-xl bg-[#fcfaf7] border text-[#064e3b] font-medium focus:outline-none focus:ring-2 focus:ring-[#059669] ${
                        errors.bank_name ? "border-red-500" : "border-[#059669]/30"
                      }`}
                    />
                    {errors.bank_name && (
                      <p className="mt-1 text-xs text-red-600 font-medium">
                        {errors.bank_name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-[#064e3b] uppercase mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      {...register("account_number")}
                      className={`w-full px-3.5 py-2 rounded-xl bg-[#fcfaf7] border text-[#064e3b] font-medium focus:outline-none focus:ring-2 focus:ring-[#059669] ${
                        errors.account_number ? "border-red-500" : "border-[#059669]/30"
                      }`}
                    />
                    {errors.account_number && (
                      <p className="mt-1 text-xs text-red-600 font-medium">
                        {errors.account_number.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-[#064e3b] uppercase mb-1">
                      IBAN
                    </label>
                    <input
                      type="text"
                      {...register("iban")}
                      className={`w-full px-3.5 py-2 rounded-xl bg-[#fcfaf7] border text-[#064e3b] font-mono font-medium uppercase focus:outline-none focus:ring-2 focus:ring-[#059669] ${
                        errors.iban ? "border-red-500" : "border-[#059669]/30"
                      }`}
                    />
                    {errors.iban && (
                      <p className="mt-1 text-xs text-red-600 font-medium">
                        {errors.iban.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-[#064e3b] uppercase mb-1">
                      SWIFT / BIC Code
                    </label>
                    <input
                      type="text"
                      {...register("swift_code")}
                      className={`w-full px-3.5 py-2 rounded-xl bg-[#fcfaf7] border text-[#064e3b] font-mono font-medium uppercase focus:outline-none focus:ring-2 focus:ring-[#059669] ${
                        errors.swift_code ? "border-red-500" : "border-[#059669]/30"
                      }`}
                    />
                    {errors.swift_code && (
                      <p className="mt-1 text-xs text-red-600 font-medium">
                        {errors.swift_code.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-[#064e3b] uppercase mb-1">
                      Currency
                    </label>
                    <select
                      {...register("currency")}
                      className={`w-full px-3.5 py-2 rounded-xl bg-[#fcfaf7] border text-[#064e3b] font-medium focus:outline-none focus:ring-2 focus:ring-[#059669] ${
                        errors.currency ? "border-red-500" : "border-[#059669]/30"
                      }`}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
                    {errors.currency && (
                      <p className="mt-1 text-xs text-red-600 font-medium">
                        {errors.currency.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-[#064e3b] uppercase mb-1">
                      Bank Address
                    </label>
                    <input
                      type="text"
                      {...register("bank_address")}
                      className={`w-full px-3.5 py-2 rounded-xl bg-[#fcfaf7] border text-[#064e3b] font-medium focus:outline-none focus:ring-2 focus:ring-[#059669] ${
                        errors.bank_address ? "border-red-500" : "border-[#059669]/30"
                      }`}
                    />
                    {errors.bank_address && (
                      <p className="mt-1 text-xs text-red-600 font-medium">
                        {errors.bank_address.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingBank(false)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingBank}
                      className="flex-1 py-2.5 rounded-xl bg-[#064e3b] text-white font-bold hover:bg-[#047857] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingBank ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        "Save Details"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 lg:p-8 space-y-6 shadow-2xl border border-[#059669]/20 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-[#064e3b]">
                <Award className="w-5 h-5 text-[#059669]" />
                <h3 className="text-xl font-bold">
                  Request Investor Class Upgrade
                </h3>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpgradeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#064e3b] mb-1.5">
                  Why should your investor class be upgraded?
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide details regarding your updated net worth, annual liquid income, institutional assets under management, or professional experience..."
                  value={upgradeReason}
                  onChange={(e) => setUpgradeReason(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#fcfaf7] border border-[#059669]/30 text-[#064e3b] text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-gray-600 font-semibold text-xs hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpgrade}
                  className="px-5 py-2.5 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingUpgrade ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit Upgrade Request"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Request Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 lg:p-8 space-y-6 text-center shadow-2xl border border-[#059669]/20 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#064e3b]">
                Request Received!
              </h3>
              <p className="text-xs text-[#064e3b]/70 leading-relaxed">
                Your request to upgrade your investor classification has been
                received and is currently under review by our compliance team.
                You will receive an email update once verified.
              </p>
            </div>

            <button
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-bold text-xs hover:bg-[#047857] transition-all shadow-md"
            >
              Back to Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
