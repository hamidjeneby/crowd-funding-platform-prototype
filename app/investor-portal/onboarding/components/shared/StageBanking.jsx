"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { saveStage4Banking } from "@/app/actions/investor-onboarding";

const bankSchema = z.object({
  bank_name: z.string().min(2, "Bank name must be at least 2 characters"),
  account_name: z.string().min(2, "Account name must be at least 2 characters"),
  account_number: z.string().min(5, "Account number must be at least 5 characters"),
  iban: z.string().min(15, "IBAN must be at least 15 characters").regex(/^[A-Z0-9]+$/, "IBAN must contain only uppercase letters and numbers"),
  swift_code: z.string().min(8, "SWIFT code must be at least 8 characters").regex(/^[A-Z0-9]+$/, "SWIFT code must contain only uppercase letters and numbers"),
  bank_address: z.string().min(5, "Bank address must be at least 5 characters"),
  currency: z.string().min(3, "Currency must be selected"),
});

export default function StageBanking({ data, onSave, onNext, onBack }) {
  const [savingType, setSavingType] = useState(null);

  // Safely parse JSON if stored as string, or use object directly
  let initialBankDetails = {};
  if (data.bank_details) {
    initialBankDetails = typeof data.bank_details === 'string' ? JSON.parse(data.bank_details) : data.bank_details;
  }

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bank_name: initialBankDetails.bank_name || "",
      account_name: initialBankDetails.account_name || "",
      account_number: initialBankDetails.account_number || "",
      iban: initialBankDetails.iban || "",
      swift_code: initialBankDetails.swift_code || "",
      bank_address: initialBankDetails.bank_address || "",
      currency: initialBankDetails.currency || "",
    }
  });

  const onSubmit = async (formData) => {
    setSavingType("next");
    try {
      await saveStage4Banking(formData);
      onSave({ bank_details: formData });
      onNext();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setSavingType(null);
    }
  };

  const onSaveDraft = async () => {
    const formData = watch();
    setSavingType("draft");
    try {
      await saveStage4Banking(formData);
      onSave({ bank_details: formData });
      alert("Draft saved successfully.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setSavingType(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Banking Details</h3>
        <p className="text-sm text-gray-500">Provide the bank account information for fund transfers and payouts. Ensure the account name matches your registered name.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <p className="text-sm text-red-500 font-medium">* Indicates a required field</p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Bank Name <span className="text-red-500">*</span></label>
            <input type="text" {...register("bank_name")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Name (Beneficiary) <span className="text-red-500">*</span></label>
            <input type="text" {...register("account_name")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Number <span className="text-red-500">*</span></label>
            <input type="text" {...register("account_number")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">IBAN <span className="text-red-500">*</span></label>
            <input type="text" {...register("iban")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border uppercase" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">SWIFT / BIC Code <span className="text-red-500">*</span></label>
            <input type="text" {...register("swift_code")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border uppercase" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Currency <span className="text-red-500">*</span></label>
            <select {...register("currency")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border">
              <option value="">Select currency</option>
              <option value="AED">AED - United Arab Emirates Dirham</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Bank Address <span className="text-red-500">*</span></label>
            <textarea {...register("bank_address")} rows="2" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#064e3b] focus:ring-[#064e3b] sm:text-sm p-2 border"></textarea>
          </div>
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Please correct the following errors:</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{error.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors">
            Back
          </button>
          <div className="flex space-x-4">
            <button 
              type="button" 
              onClick={onSaveDraft}
              disabled={savingType !== null}
              className="px-6 py-2 border border-[#064e3b] text-[#064e3b] rounded-md font-medium hover:bg-[#064e3b]/5 transition-colors disabled:opacity-50 flex items-center"
            >
              {savingType === "draft" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save for Later"}
            </button>
            <button 
              type="submit" 
              disabled={savingType !== null}
              className="flex items-center px-6 py-2 bg-[#064e3b] text-white rounded-md font-medium hover:bg-[#064e3b]/90 transition-colors disabled:opacity-50"
            >
              {savingType === "next" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save and Continue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
