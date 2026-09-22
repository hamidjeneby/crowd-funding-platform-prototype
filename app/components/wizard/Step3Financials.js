"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProjectDraft } from "@/app/actions/projects";

const getYieldTypeForContract = (contractType) => {
  switch (contractType) {
    case "ijara":
      return "rental";
    case "murabaha":
    case "mudarabah":
      return "profit_margin";
    case "spv_equity":
      return "equity_appreciation";
    default:
      return undefined;
  }
};

const createSchema = ({
  isSpvEquity,
  conversionEnabled,
  conversionRatioShares,
  totalSharesAuthorized,
  conversionDeadline,
}) =>
  z
    .object({
      target_goal: z.coerce.number().min(1, "Target goal is required"),
      soft_cap: z.coerce.number().min(1, "Soft cap is required"),
      hard_cap: z.coerce.number().min(1, "Hard cap is required"),
      min_investment_floor: z.coerce
        .number()
        .min(1, "Min investment floor is required")
        .refine((val) => Number.isInteger(val), {
          message: "Minimum investment floor must be a whole integer number",
        }),
      campaign_end_date: z.string().min(1, "Campaign deadline is required"),
      unit_price: z.coerce.number().optional(),
      expected_roi_percent: z.coerce.number().optional(),
      yield_type: z.enum(["rental", "profit_margin", "equity_appreciation"], {
        required_error: "Please select a yield type",
      }),
      currency: z.enum(["AED", "MYR", "USD", "IDR"], {
        required_error: "Please select a currency",
      }),
      clearing_option: z.enum(
        ["platform_clearing", "custody_provider_clearing"],
        { required_error: "Please select a clearing option" },
      ),
    })
    .superRefine((data, ctx) => {
      if (data.soft_cap > data.target_goal) {
        ctx.addIssue({
          path: ["soft_cap"],
          message: "Soft cap cannot be greater than target goal",
          code: z.ZodIssueCode.custom,
        });
      }
      if (data.soft_cap > data.hard_cap) {
        ctx.addIssue({
          path: ["soft_cap"],
          message: "Soft cap cannot be greater than hard cap",
          code: z.ZodIssueCode.custom,
        });
      }
      if (data.hard_cap < data.target_goal) {
        ctx.addIssue({
          path: ["hard_cap"],
          message: "Hard cap must be equal to or greater than target goal",
          code: z.ZodIssueCode.custom,
        });
      }

      // Check minimum target_goal based on total_cost_authorized for conversion enabled non-SPV Equity projects
      if (
        !isSpvEquity &&
        conversionEnabled &&
        conversionRatioShares > 0 &&
        totalSharesAuthorized > 0 &&
        data.unit_price > 0
      ) {
        const totalCostAuth = (data.unit_price / conversionRatioShares) * totalSharesAuthorized;
        if (data.target_goal < totalCostAuth) {
          const currPrefix = data.currency ? `${data.currency} ` : "";
          ctx.addIssue({
            path: ["target_goal"],
            message: `Target goal cannot be less than the Total Authorized Cost (${currPrefix}${totalCostAuth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) based on conversion terms.`,
            code: z.ZodIssueCode.custom,
          });
        }
      }

      // Check campaign_end_date vs conversion_deadline
      if (conversionEnabled && conversionDeadline && data.campaign_end_date) {
        const campaignDateStr = data.campaign_end_date.endsWith("Z") ? data.campaign_end_date : `${data.campaign_end_date}:00.000Z`;
        const convDateStr = conversionDeadline.endsWith("Z") ? conversionDeadline : `${conversionDeadline}T00:00:00.000Z`;
        const campaignDate = new Date(campaignDateStr);
        const convDate = new Date(convDateStr);

        if (!isNaN(campaignDate.getTime()) && !isNaN(convDate.getTime())) {
          if (campaignDate >= convDate) {
            ctx.addIssue({
              path: ["campaign_end_date"],
              message: "The campaign end date cannot be later than or equal to the conversion deadline. Please go back to Step 2 to change the conversion deadline or choose an earlier campaign end date.",
              code: z.ZodIssueCode.custom,
            });
          }
        }
      }
    });

function formatForDatetimeInput(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  } catch (e) {
    return "";
  }
}

export default function Step3Financials({
  projectId,
  initialData,
  onNext,
  onPrev,
  disabled,
  onUpdate,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const shariaContractType = initialData?.sharia_contract_type;
  const isSpvEquity = shariaContractType === "spv_equity";
  const lockedYieldType = getYieldTypeForContract(shariaContractType);

  const spvDetail = initialData?.spv_details?.[0] || initialData?.spv_details || {};
  const totalSharesAuthorized = Number(spvDetail?.total_shares_authorized) || 0;
  const conversionEnabled = Boolean(spvDetail?.conversion_enabled);
  const conversionRatioShares = Number(spvDetail?.conversion_ratio_shares) || 0;
  const conversionDeadline = spvDetail?.conversion_deadline || initialData?.conversion_deadline;

  const schema = useMemo(
    () =>
      createSchema({
        isSpvEquity,
        conversionEnabled,
        conversionRatioShares,
        totalSharesAuthorized,
        conversionDeadline,
      }),
    [isSpvEquity, conversionEnabled, conversionRatioShares, totalSharesAuthorized, conversionDeadline]
  );


  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      target_goal: initialData?.target_goal || "",
      soft_cap: initialData?.soft_cap || "",
      hard_cap: initialData?.hard_cap || "",
      min_investment_floor: initialData?.min_investment_floor || "",
      campaign_end_date: formatForDatetimeInput(initialData?.campaign_end_date),
      unit_price: initialData?.unit_price || "",
      expected_roi_percent: isSpvEquity
        ? initialData?.expected_roi_percent ?? 0
        : initialData?.expected_roi_percent || "",
      yield_type: lockedYieldType || initialData?.yield_type || undefined,
      currency: initialData?.currency || undefined,
      clearing_option: initialData?.clearing_option || undefined,
    },
  });

  const unitPrice = watch("unit_price");
  const selectedCurrency = watch("currency");
  const currencyPrefix = selectedCurrency ? `${selectedCurrency} ` : "";

  useEffect(() => {
    if (lockedYieldType) {
      setValue("yield_type", lockedYieldType);
    }
  }, [lockedYieldType, setValue]);

  useEffect(() => {
    if (isSpvEquity && totalSharesAuthorized > 0 && unitPrice) {
      const price = Number(unitPrice) || 0;
      const computedGoal = price * Number(totalSharesAuthorized);
      setValue("target_goal", computedGoal);
      setValue("hard_cap", computedGoal);
    }
  }, [isSpvEquity, totalSharesAuthorized, unitPrice, setValue]);

  const onSubmit = async (data) => {
    if (disabled) return onNext();
    setLoading(true);
    setError(null);

    const finalYieldType = lockedYieldType || data.yield_type;
    const finalData = {
      ...data,
      yield_type: finalYieldType,
      expected_roi_percent: isSpvEquity
        ? data.expected_roi_percent || 0
        : data.expected_roi_percent,
    };

    try {
      await updateProjectDraft(projectId, finalData, 3);
      await onUpdate();
      onNext();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const currentUnitPrice = Number(unitPrice) || 0;
  const computedTotalCostAuthorized =
    !isSpvEquity && conversionEnabled && conversionRatioShares > 0 && totalSharesAuthorized > 0 && currentUnitPrice > 0
      ? (currentUnitPrice / conversionRatioShares) * totalSharesAuthorized
      : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-xl font-semibold">Financial Terms</h2>

      {error && <p className="text-red-500">{error}</p>}

      {isSpvEquity && (
        <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          <p className="font-semibold">SPV Equity Calculation Active</p>
          <p className="text-xs text-emerald-700 mt-1">
            Target Goal and Hard Cap are autocalculated as Share Price × Total Authorized Shares ({totalSharesAuthorized.toLocaleString()} shares). Yield Type is locked to Equity Appreciation.
          </p>
        </div>
      )}

      {!isSpvEquity && conversionEnabled && conversionRatioShares > 0 && totalSharesAuthorized > 0 && (
        <div className="p-4 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-900">
          <p className="font-semibold">Conversion Clause Financial Requirements</p>
          <p className="text-xs text-blue-700 mt-1">
            1 Sukuk unit converts to {conversionRatioShares} shares. Total Authorized Shares = {totalSharesAuthorized.toLocaleString()}.
            {computedTotalCostAuthorized ? (
              <>
                {" "}Price per share: <strong>{currencyPrefix}{(currentUnitPrice / conversionRatioShares).toFixed(2)}</strong>. Minimum Total Authorized Cost: <strong>{currencyPrefix}{computedTotalCostAuthorized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>. Target Goal and Hard Cap cannot be less than this amount.
              </>
            ) : (
              <> Enter a Unit Price to compute the Minimum Target Goal.</>
            )}
          </p>
        </div>
      )}

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

        {(initialData?.is_spv || isSpvEquity) && (
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                {isSpvEquity ? "Share Price" : "Unit Price"}
              </label>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                Unit Type: <span className="font-semibold capitalize text-gray-900">{isSpvEquity ? "shares" : (initialData?.unit_type || "sukuk")}</span>
              </span>
            </div>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="number"
                step="any"
                {...register("unit_price")}
                disabled={disabled}
                className="block w-full rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 p-2 border"
                placeholder="0.00"
              />
              <span className="inline-flex items-center px-3.5 rounded-r-md border border-l-0 border-gray-300 bg-gray-100 text-gray-600 text-sm font-medium select-none capitalize">
                / {isSpvEquity ? "shares" : (initialData?.unit_type || "sukuk")}
              </span>
            </div>
            {errors.unit_price && <p className="mt-1 text-sm text-red-600">{errors.unit_price.message}</p>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Target Goal {isSpvEquity && "(Autocalculated)"}
          </label>
          <input
            type="number"
            {...register("target_goal")}
            disabled={disabled || isSpvEquity}
            readOnly={isSpvEquity}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border ${
              isSpvEquity ? "bg-gray-100 text-gray-700 font-semibold cursor-not-allowed" : ""
            }`}
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
          <label className="block text-sm font-medium text-gray-700">
            Hard Cap {isSpvEquity && "(Autocalculated)"}
          </label>
          <input
            type="number"
            {...register("hard_cap")}
            disabled={disabled || isSpvEquity}
            readOnly={isSpvEquity}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border ${
              isSpvEquity ? "bg-gray-100 text-gray-700 font-semibold cursor-not-allowed" : ""
            }`}
          />
          {errors.hard_cap && <p className="mt-1 text-sm text-red-600">{errors.hard_cap.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Min Investment Floor (Integer)</label>
          <input
            type="number"
            step="1"
            placeholder="e.g. 1000"
            {...register("min_investment_floor")}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
          {errors.min_investment_floor && <p className="mt-1 text-sm text-red-600">{errors.min_investment_floor.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Campaign Deadline (End Date & Time)</label>
          <input
            type="datetime-local"
            {...register("campaign_end_date")}
            disabled={disabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-sm"
          />
          {errors.campaign_end_date && <p className="mt-1 text-sm text-red-600">{errors.campaign_end_date.message}</p>}
        </div>

        {!isSpvEquity && (
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
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Yield Type {lockedYieldType && "(Locked)"}
          </label>
          <select
            {...register("yield_type")}
            disabled={disabled || Boolean(lockedYieldType)}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border ${
              lockedYieldType ? "bg-gray-100 text-gray-700 font-semibold cursor-not-allowed" : "bg-white"
            }`}
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
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#064e3b] hover:bg-[#064e3b]/90 disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Saving..." : disabled ? "Next" : "Save & Continue"}
        </button>
      </div>
    </form>
  );
}
