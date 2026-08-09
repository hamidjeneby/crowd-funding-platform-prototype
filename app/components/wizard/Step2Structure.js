"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProjectDraft } from "@/app/actions/projects";

const schema = z.object({
  sharia_contract_type: z.enum(["murabaha", "mudarabah", "ijara", "spv_equity"], {
    required_error: "Please select a Sharia contract type",
  }),
  is_spv: z.boolean(),
  spv_legal_name: z.string().optional(),
  registration_authority: z.enum(["DIFC", "ADGM", "LABUAN_IBFC", "OTHER"]).optional(),
  registration_number: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.is_spv) {
    if (!data.spv_legal_name) {
      ctx.addIssue({ path: ["spv_legal_name"], message: "Required for SPV", code: z.ZodIssueCode.custom });
    }
    if (!data.registration_authority) {
      ctx.addIssue({ path: ["registration_authority"], message: "Required for SPV", code: z.ZodIssueCode.custom });
    }
    if (!data.registration_number) {
      ctx.addIssue({ path: ["registration_number"], message: "Required for SPV", code: z.ZodIssueCode.custom });
    }
  }
});

export default function Step2Structure({ projectId, initialData, onNext, onPrev, disabled, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      sharia_contract_type: initialData?.sharia_contract_type || undefined,
      is_spv: initialData?.is_spv || false,
      spv_legal_name: initialData?.spv_details?.[0]?.spv_legal_name || "",
      registration_authority: initialData?.spv_details?.[0]?.registration_authority || undefined,
      registration_number: initialData?.spv_details?.[0]?.registration_number || "",
    },
  });

  const isSpv = watch("is_spv");

  const onSubmit = async (data) => {
    if (disabled) return onNext();
    setLoading(true);
    setError(null);
    try {
      await updateProjectDraft(projectId, data, 2);
      await onUpdate();
      onNext();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-xl font-semibold">Structure & Compliance</h2>
      
      {error && <p className="text-red-500">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700">Sharia Contract Type</label>
        <select
          {...register("sharia_contract_type")}
          disabled={disabled}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
        >
          <option value="">Select a type...</option>
          <option value="murabaha">Murabaha</option>
          <option value="mudarabah">Mudarabah</option>
          <option value="ijara">Ijara</option>
          <option value="spv_equity">SPV Equity</option>
        </select>
        {errors.sharia_contract_type && <p className="mt-1 text-sm text-red-600">{errors.sharia_contract_type.message}</p>}
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_spv"
          {...register("is_spv")}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="is_spv" className="ml-2 block text-sm font-medium text-gray-900">
          This project is an SPV
        </label>
      </div>

      {isSpv && (
        <div className="p-4 border rounded-md bg-gray-50 space-y-4">
          <h3 className="font-medium text-gray-900">SPV Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Legal Name</label>
            <input
              {...register("spv_legal_name")}
              disabled={disabled}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
            {errors.spv_legal_name && <p className="mt-1 text-sm text-red-600">{errors.spv_legal_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Authority</label>
            <select
              {...register("registration_authority")}
              disabled={disabled}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
            >
              <option value="">Select an authority...</option>
              <option value="DIFC">DIFC</option>
              <option value="ADGM">ADGM</option>
              <option value="LABUAN_IBFC">Labuan IBFC</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.registration_authority && <p className="mt-1 text-sm text-red-600">{errors.registration_authority.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Number</label>
            <input
              {...register("registration_number")}
              disabled={disabled}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
            {errors.registration_number && <p className="mt-1 text-sm text-red-600">{errors.registration_number.message}</p>}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#064e3b] hover:bg-[#064e3b]/90 disabled:opacity-50"
        >
          {loading ? "Saving..." : disabled ? "Next" : "Save & Continue"}
        </button>
      </div>
    </form>
  );
}
