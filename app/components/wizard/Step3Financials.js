"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProjectDraft } from "@/app/actions/projects";

const schema = z.object({
  target_goal: z.coerce.number().min(1, "Target goal is required"),
  soft_cap: z.coerce.number().min(1, "Soft cap is required"),
  hard_cap: z.coerce.number().min(1, "Hard cap is required"),
  min_investment_floor: z.coerce.number().min(1, "Min investment floor is required"),
  unit_price: z.coerce.number().optional(),
  expected_roi_percent: z.coerce.number().min(0, "Expected ROI is required"),
  yield_type: z.enum(["rental", "profit_margin", "equity_appreciation"], { required_error: "Please select a yield type" }),
  currency: z.enum(["AED", "MYR", "USD", "IDR"], { required_error: "Please select a currency" }),
  clearing_option: z.enum(["platform_clearing", "custody_provider_clearing"], { required_error: "Please select a clearing option" }),
}).superRefine((data, ctx) => {
  if (data.soft_cap >= data.hard_cap) {
    ctx.addIssue({ path: ["soft_cap"], message: "Soft cap must be less than hard cap", code: z.ZodIssueCode.custom });
  }
  if (data.hard_cap > data.target_goal) {
    ctx.addIssue({ path: ["hard_cap"], message: "Hard cap must be less than or equal to target goal", code: z.ZodIssueCode.custom });
  }
});

export default function Step3Financials({ projectId, initialData, onNext, onPrev, disabled, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      target_goal: initialData?.target_goal || "",
      soft_cap: initialData?.soft_cap || "",
      hard_cap: initialData?.hard_cap || "",
      min_investment_floor: initialData?.min_investment_floor || "",
      unit_price: initialData?.unit_price || "",
      expected_roi_percent: initialData?.expected_roi_percent || "",
      yield_type: initialData?.yield_type || undefined,
      currency: initialData?.currency || undefined,
      clearing_option: initialData?.clearing_option || undefined,
    },
  });

  const onSubmit = async (data) => {
    if (disabled) return onNext();
    setLoading(true);
    setError(null);
    try {
      await updateProjectDraft(projectId, data, 3);
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
      <h2 className="text-xl font-semibold">Financial Terms</h2>
      
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <select
            {...register("currency")}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
          >
            <option value="">Select currency...</option>
            <option value="AED">AED</option>
            <option value="MYR">MYR</option>
            <option value="USD">USD</option>
            <option value="IDR">IDR</option>
          </select>
          {errors.currency && <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Target Goal</label>
          <input
            type="number"
            {...register("target_goal")}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
          {errors.target_goal && <p className="mt-1 text-sm text-red-600">{errors.target_goal.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Soft Cap</label>
          <input
            type="number"
            {...register("soft_cap")}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
          {errors.soft_cap && <p className="mt-1 text-sm text-red-600">{errors.soft_cap.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Hard Cap</label>
          <input
            type="number"
            {...register("hard_cap")}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
          {errors.hard_cap && <p className="mt-1 text-sm text-red-600">{errors.hard_cap.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Min Investment Floor</label>
          <input
            type="number"
            {...register("min_investment_floor")}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
          {errors.min_investment_floor && <p className="mt-1 text-sm text-red-600">{errors.min_investment_floor.message}</p>}
        </div>

        {initialData?.is_spv && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit Price</label>
            <input
              type="number"
              {...register("unit_price")}
              disabled={disabled}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
            {errors.unit_price && <p className="mt-1 text-sm text-red-600">{errors.unit_price.message}</p>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Expected ROI (%)</label>
          <input
            type="number"
            step="0.01"
            {...register("expected_roi_percent")}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
          {errors.expected_roi_percent && <p className="mt-1 text-sm text-red-600">{errors.expected_roi_percent.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Yield Type</label>
          <select
            {...register("yield_type")}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
          >
            <option value="">Select yield type...</option>
            <option value="rental">Rental</option>
            <option value="profit_margin">Profit Margin</option>
            <option value="equity_appreciation">Equity Appreciation</option>
          </select>
          {errors.yield_type && <p className="mt-1 text-sm text-red-600">{errors.yield_type.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Clearing Option</label>
          <select
            {...register("clearing_option")}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
          >
            <option value="">Select clearing option...</option>
            <option value="platform_clearing">Platform Clearing</option>
            <option value="custody_provider_clearing">Custody Provider Clearing</option>
          </select>
          {errors.clearing_option && <p className="mt-1 text-sm text-red-600">{errors.clearing_option.message}</p>}
        </div>
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
