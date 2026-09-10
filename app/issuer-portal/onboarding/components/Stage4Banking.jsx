"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { isValidIBAN } from "ibantools";
import { Loader2 } from "lucide-react";
import { saveStage4Banking } from "@/app/actions/issuer-onboarding";

const bankingSchema = z.object({
  bank_name: z.string().min(2, "Bank name is required"),
  account_name: z.string().min(2, "Account holder name is required"),
  account_number: z.string().min(5, "Account number must be at least 5 characters"),
  iban: z.string().min(1, "IBAN is required").refine(val => isValidIBAN(val.replace(/\s+/g, '')), {
    message: "Invalid IBAN number",
  }),
  swift_code: z.string().min(8, "SWIFT code must be at least 8 characters").regex(/^[A-Z0-9]+$/, "SWIFT code must contain only uppercase letters and numbers"),
  bank_address: z.string().min(5, "Bank address is required"),
  currency: z.string().min(3, "Currency must be selected"),
});

export default function Stage4Banking({ data, onSave, onNext, onBack }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  let initialBankDetails = {};
  if (data.bank_details) {
    initialBankDetails = typeof data.bank_details === 'string' ? JSON.parse(data.bank_details) : data.bank_details;
  }

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(bankingSchema),
    defaultValues: {
      bank_name: initialBankDetails.bank_name || "",
      account_name: initialBankDetails.account_name || initialBankDetails.account_holder_name || "",
      account_number: initialBankDetails.account_number || "",
      iban: initialBankDetails.iban || "",
      swift_code: initialBankDetails.swift_code || "",
      bank_address: initialBankDetails.bank_address || "",
      currency: initialBankDetails.currency || "",
    }
  });

  const onSubmit = async (formData) => {
    setIsSaving(true);
    setFormError(null);
    setSuccessMsg(null);
    try {
      const bankDetails = {
        ...formData,
        iban: formData.iban.replace(/\s+/g, ''),
      };

      await saveStage4Banking(bankDetails);
      onSave({ bank_details: bankDetails, bank_verification_status: "pending" });
      onNext();
    } catch (error) {
      console.error(error);
      setFormError("Failed to save banking details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveDraft = async () => {
    const formData = watch();
    setIsSaving(true);
    setFormError(null);
    setSuccessMsg(null);
    try {
      const bankDetails = {
        ...formData,
        iban: formData.iban ? formData.iban.replace(/\s+/g, '') : "",
      };

      await saveStage4Banking(bankDetails);
      onSave({ bank_details: bankDetails, bank_verification_status: "pending" });
      setSuccessMsg("Draft saved successfully.");
    } catch (error) {
      console.error(error);
      setFormError("Failed to save draft. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formError && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {formError}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm border border-emerald-200">
          {successMsg}
        </div>
      )}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Banking Details</h3>
        <p className="text-sm text-gray-500 mb-6">Enter your primary bank account details. The IBAN will be validated instantly.</p>
        <p className="text-sm text-red-500 font-medium">* Indicates a required field</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Bank Name <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            {...register("bank_name")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
          {errors.bank_name && <p className="mt-1 text-sm text-red-600">{errors.bank_name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Account Name (Beneficiary) <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            {...register("account_name")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
          {errors.account_name && <p className="mt-1 text-sm text-red-600">{errors.account_name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Account Number <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            {...register("account_number")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
          {errors.account_number && <p className="mt-1 text-sm text-red-600">{errors.account_number.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">IBAN <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            {...register("iban")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border uppercase font-mono" 
          />
          {errors.iban && <p className="mt-1 text-sm text-red-600">{errors.iban.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">SWIFT / BIC Code <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            {...register("swift_code")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border uppercase" 
          />
          {errors.swift_code && <p className="mt-1 text-sm text-red-600">{errors.swift_code.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Currency <span className="text-red-500">*</span></label>
          <select 
            {...register("currency")} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border bg-white"
          >
            <option value="">Select currency</option>
            <option value="AED">AED - United Arab Emirates Dirham</option>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
          </select>
          {errors.currency && <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Bank Address <span className="text-red-500">*</span></label>
          <textarea 
            {...register("bank_address")} 
            rows={2} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" 
          />
          {errors.bank_address && <p className="mt-1 text-sm text-red-600">{errors.bank_address.message}</p>}
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <button 
          type="button" 
          onClick={onBack}
          disabled={isSaving}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <div className="space-x-4 flex">
          <button 
            type="button" 
            onClick={onSaveDraft}
            disabled={isSaving}
            className="px-6 py-2 border border-[#064e3b] text-[#064e3b] rounded-md font-medium hover:bg-[#064e3b]/5 transition-colors disabled:opacity-50"
          >
            Save for Later
          </button>
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center px-6 py-2 bg-[#064e3b] text-white rounded-md font-medium hover:bg-[#064e3b]/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save and Continue"}
          </button>
        </div>
      </div>
    </form>
  );
}
