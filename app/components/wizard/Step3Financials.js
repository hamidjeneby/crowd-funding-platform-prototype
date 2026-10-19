"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProjectDraft } from "@/app/actions/projects";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import {
  getYieldTypeForContract,
  getYieldTypeExplanation,
  getRoiLabelForContract,
  getRoiHelperForContract,
  createStep3FinancialsSchema,
  cleanContractTerms,
} from "@/lib/validation/repaymentTermsSchema";

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
  isShariahApproved,
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

  const hasMissingRepaymentTerms =
    initialData &&
    (!initialData.contract_terms ||
      (!isSpvEquity && (!initialData.tenor_months || Number(initialData.tenor_months) <= 0)));

  const schema = useMemo(
    () =>
      createStep3FinancialsSchema({
        shariaContractType,
        conversionEnabled,
        conversionRatioShares,
        totalSharesAuthorized,
        conversionDeadline,
      }),
    [shariaContractType, conversionEnabled, conversionRatioShares, totalSharesAuthorized, conversionDeadline]
  );

  const defaultContractTerms = useMemo(() => {
    const raw = initialData?.contract_terms;
    let existing = {};
    if (raw) {
      existing = typeof raw === "string" ? JSON.parse(raw) : raw;
    }

    if (shariaContractType === "murabaha") {
      return {
        payment_frequency: existing.payment_frequency || "quarterly",
        principal_repayment: existing.principal_repayment || "at_maturity",
        asset_description: existing.asset_description || "",
      };
    }

    if (shariaContractType === "ijara") {
      return {
        payment_frequency: existing.payment_frequency || "quarterly",
        asset_description: existing.asset_description || "",
        asset_value: existing.asset_value ?? "",
        end_of_term: existing.end_of_term || "sale_to_issuer",
        end_of_term_price: existing.end_of_term_price ?? "",
      };
    }

    if (shariaContractType === "mudarabah") {
      return {
        investor_profit_share_percent: existing.investor_profit_share_percent ?? "",
        profit_reporting_frequency: existing.profit_reporting_frequency || "quarterly",
      };
    }

    if (shariaContractType === "spv_equity") {
      return {
        existing_shares_outstanding: existing.existing_shares_outstanding ?? "",
        voting_rights: existing.voting_rights ?? false,
        dividend_policy: existing.dividend_policy || "discretionary",
        target_exit_horizon_years: existing.target_exit_horizon_years ?? "",
      };
    }

    return {};
  }, [initialData?.contract_terms, shariaContractType]);

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
        ? ""
        : (initialData?.expected_roi_percent ?? ""),
      yield_type: lockedYieldType || initialData?.yield_type || undefined,
      currency: initialData?.currency || undefined,
      clearing_option: initialData?.clearing_option || undefined,
      tenor_months: isSpvEquity ? "" : (initialData?.tenor_months ?? ""),
      contract_terms: defaultContractTerms,
    },
  });

  const unitPrice = watch("unit_price");
  const selectedCurrency = watch("currency");
  const currencyPrefix = selectedCurrency ? `${selectedCurrency} ` : "";
  const endOfTermChoice = watch("contract_terms.end_of_term");
  const investorProfitShare = watch("contract_terms.investor_profit_share_percent");

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

    const cleanedTerms = cleanContractTerms(shariaContractType, data.contract_terms);
    const finalYieldType = lockedYieldType || getYieldTypeForContract(shariaContractType);
    const finalData = {
      ...data,
      yield_type: finalYieldType,
      tenor_months: isSpvEquity ? null : Number(data.tenor_months),
      contract_terms: cleanedTerms,
      expected_roi_percent: isSpvEquity ? null : Number(data.expected_roi_percent),
    };

    try {
      const res = await updateProjectDraft(projectId, finalData, 3);
      await onUpdate();
      onNext(res);
    } catch (err) {
      console.error("Step 3 save error:", err);
      const isCodeError =
        !err?.message ||
        err.message.includes("is not defined") ||
        err.message.includes("Cannot read") ||
        err.name === "ReferenceError" ||
        err.name === "TypeError";
      setError(
        isCodeError
          ? "Something went wrong while saving. Please try again or contact support."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = (formErrors) => {
    console.warn("Step 3 form validation errors:", formErrors);
    let firstMessage = null;
    if (formErrors.contract_terms) {
      if (typeof formErrors.contract_terms.message === "string") {
        firstMessage = formErrors.contract_terms.message;
      } else {
        const firstNested = Object.values(formErrors.contract_terms)[0];
        if (firstNested?.message) firstMessage = firstNested.message;
      }
    }
    if (!firstMessage) {
      for (const k of Object.keys(formErrors)) {
        if (formErrors[k]?.message) {
          firstMessage = formErrors[k].message;
          break;
        }
      }
    }
    setError(firstMessage || "Please fill in all required financial terms before continuing.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentUnitPrice = Number(unitPrice) || 0;
  const computedTotalCostAuthorized =
    !isSpvEquity && conversionEnabled && conversionRatioShares > 0 && totalSharesAuthorized > 0 && currentUnitPrice > 0
      ? (currentUnitPrice / conversionRatioShares) * totalSharesAuthorized
      : null;

  const isFinancialsLocked = disabled || isShariahApproved;

  const handleFormSubmit = isFinancialsLocked
    ? (e) => {
        e.preventDefault();
        onNext();
      }
    : handleSubmit(onSubmit, onInvalid);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-[#064e3b]">Financial Terms</h2>

      {isShariahApproved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>This campaign is marked as Shariah Compliant (Approved). Financial terms and campaign goals are locked from editing.</span>
        </div>
      )}

      {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

      {isSpvEquity && (
        <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          <p className="font-semibold">SPV Equity Calculation Active</p>
          <p className="text-xs text-emerald-700 mt-1">
            Target Goal and Hard Cap are autocalculated as Share Price × Shares Offered ({totalSharesAuthorized.toLocaleString()} shares). Yield Type is locked to Equity Appreciation.
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
            disabled={isFinancialsLocked}
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
                disabled={isFinancialsLocked}
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
            disabled={isFinancialsLocked}
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
            disabled={isFinancialsLocked}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
          {errors.min_investment_floor && <p className="mt-1 text-sm text-red-600">{errors.min_investment_floor.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Campaign Deadline (End Date &amp; Time) (UTC)</label>
          <p className="text-xs text-gray-500 mb-1">
            Deadline must be on the hour in UTC (e.g. 14:00). Minutes and seconds must be 00.
          </p>
          <input
            type="datetime-local"
            step="3600"
            {...register("campaign_end_date")}
            disabled={isFinancialsLocked}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white text-sm"
          />
          {errors.campaign_end_date && <p className="mt-1 text-sm text-red-600">{errors.campaign_end_date.message}</p>}
        </div>

        {!isSpvEquity && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {getRoiLabelForContract(shariaContractType)}
            </label>
            {getRoiHelperForContract(shariaContractType) && (
              <p className="text-xs text-gray-500 mb-1">
                {getRoiHelperForContract(shariaContractType)}
              </p>
            )}
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              placeholder="e.g. 12.5"
              {...register("expected_roi_percent")}
              disabled={isFinancialsLocked}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
            {errors.expected_roi_percent && <p className="mt-1 text-sm text-red-600">{errors.expected_roi_percent.message}</p>}
          </div>
        )}

        {/* Read-Only Yield Type Card */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Yield Type (Derived)
          </label>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#064e3b] text-base capitalize">
              {lockedYieldType?.replace("_", " ") || "Not set"}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-[#064e3b]">
              Locked to {shariaContractType?.replace("_", " ") || "Contract"}
            </span>
          </div>
          <p className="text-xs text-gray-500 pt-1 leading-relaxed">
            {getYieldTypeExplanation(lockedYieldType)}
          </p>
          <input type="hidden" {...register("yield_type")} />
          {errors.yield_type && <p className="mt-1 text-sm text-red-600">{errors.yield_type.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Clearing Option</label>
          <select
            {...register("clearing_option")}
            disabled={isFinancialsLocked}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
          >
            <option value="">Select clearing option...</option>
            <option value="platform_clearing">Platform Clearing</option>
            <option value="custody_provider_clearing">Custody Provider Clearing</option>
          </select>
          {errors.clearing_option && <p className="mt-1 text-sm text-red-600">{errors.clearing_option.message}</p>}
        </div>
      </div>

      {/* SECTION: REPAYMENT TERMS */}
      <div className="pt-6 border-t border-gray-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#064e3b]">Repayment Terms</h3>
            <p className="text-xs text-gray-500">
              Contract-specific terms defining how and when investors receive distributions or returns.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-[#064e3b] border border-emerald-200 w-fit">
            {shariaContractType?.replace("_", " ") || "Standard"}
          </span>
        </div>

        {errors.contract_terms?.message && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errors.contract_terms.message}
          </div>
        )}

        {/* Missing Repayment Terms Warning for existing drafts */}
        {hasMissingRepaymentTerms && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Repayment Terms Incomplete</span>
            </div>
            <p className="leading-relaxed font-medium">
              This project is currently missing required repayment terms. Please fill in the terms below to submit your project for review.
            </p>
          </div>
        )}

        {/* Tenor input for non-equity */}
        {!isSpvEquity && (
          <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200 space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900">
              Investment Term / Tenor (Months) <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 leading-relaxed">
              The duration of the investment in months (1–120 months / up to 10 years). The term must be a whole multiple of your chosen payment or reporting frequency.
            </p>
            <input
              type="number"
              step="1"
              min="1"
              max="120"
              placeholder="e.g. 12, 24, 36"
              {...register("tenor_months")}
              disabled={isFinancialsLocked}
              className="mt-1 block w-full sm:max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white font-medium"
            />
            {errors.tenor_months && (
              <p className="mt-1 text-sm text-red-600">{errors.tenor_months.message}</p>
            )}
          </div>
        )}

        {/* Murabaha Terms */}
        {shariaContractType === "murabaha" && (
          <div className="space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("contract_terms.payment_frequency")}
                  disabled={isFinancialsLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                >
                  <option value="">Select frequency...</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                  <option value="at_maturity">At Maturity (Bullet)</option>
                </select>
                {errors.contract_terms?.payment_frequency && (
                  <p className="mt-1 text-sm text-red-600">{errors.contract_terms.payment_frequency.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Principal Repayment <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("contract_terms.principal_repayment")}
                  disabled={isFinancialsLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                >
                  <option value="">Select repayment method...</option>
                  <option value="with_instalments">With Instalments (Amortizing)</option>
                  <option value="at_maturity">At Maturity (Bullet Repayment)</option>
                </select>
                {errors.contract_terms?.principal_repayment && (
                  <p className="mt-1 text-sm text-red-600">{errors.contract_terms.principal_repayment.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Asset Description (Purchased Goods) <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Describe the underlying commodities, inventory, equipment, or assets being purchased under Murabaha (10–500 characters).
              </p>
              <textarea
                rows={3}
                placeholder="e.g., Commercial equipment and industrial machinery for production expansion..."
                {...register("contract_terms.asset_description")}
                disabled={isFinancialsLocked}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              />
              {errors.contract_terms?.asset_description && (
                <p className="mt-1 text-sm text-red-600">{errors.contract_terms.asset_description.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Ijara Terms */}
        {shariaContractType === "ijara" && (
          <div className="space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rent Payment Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("contract_terms.payment_frequency")}
                  disabled={isFinancialsLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                >
                  <option value="">Select rent frequency...</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
                {errors.contract_terms?.payment_frequency && (
                  <p className="mt-1 text-sm text-red-600">{errors.contract_terms.payment_frequency.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asset Value ({selectedCurrency || "Currency"}) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  Total valuation of the underlying leased asset. Must cover the Target Goal.
                </p>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 5000000"
                  {...register("contract_terms.asset_value")}
                  disabled={isFinancialsLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
                {errors.contract_terms?.asset_value && (
                  <p className="mt-1 text-sm text-red-600">{errors.contract_terms.asset_value.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End of Term Outcome <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("contract_terms.end_of_term")}
                  disabled={isFinancialsLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                >
                  <option value="">Select outcome...</option>
                  <option value="sale_to_issuer">Sale to Issuer (Asset Transfer)</option>
                  <option value="sale_to_third_party">Sale to Third Party</option>
                  <option value="return_asset">Return Asset to SPV / Investors</option>
                </select>
                {errors.contract_terms?.end_of_term && (
                  <p className="mt-1 text-sm text-red-600">{errors.contract_terms.end_of_term.message}</p>
                )}
              </div>

              {endOfTermChoice === "sale_to_issuer" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End of Term Purchase Price ({selectedCurrency || "Currency"}) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Pre-agreed asset transfer / buyout price at lease expiry.
                  </p>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1000"
                    {...register("contract_terms.end_of_term_price")}
                    disabled={isFinancialsLocked}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  />
                  {errors.contract_terms?.end_of_term_price && (
                    <p className="mt-1 text-sm text-red-600">{errors.contract_terms.end_of_term_price.message}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Leased Asset Description <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Describe the underlying leased property, infrastructure, or machinery (10–500 characters).
              </p>
              <textarea
                rows={3}
                placeholder="e.g., Commercial warehouse facility and logistics depot located at..."
                {...register("contract_terms.asset_description")}
                disabled={isFinancialsLocked}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              />
              {errors.contract_terms?.asset_description && (
                <p className="mt-1 text-sm text-red-600">{errors.contract_terms.asset_description.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Mudarabah Terms */}
        {shariaContractType === "mudarabah" && (
          <div className="space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Investor Profit Share (%) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  Share of net venture profit allocated to investors (&gt;0% and &lt;100%).
                </p>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="99.99"
                  placeholder="e.g. 70"
                  {...register("contract_terms.investor_profit_share_percent")}
                  disabled={isFinancialsLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
                {errors.contract_terms?.investor_profit_share_percent && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.contract_terms.investor_profit_share_percent.message}
                  </p>
                )}
                {investorProfitShare > 0 && investorProfitShare < 100 && (
                  <p className="text-xs text-emerald-700 font-semibold mt-1">
                    Issuer (Mudarib) retains: {(100 - Number(investorProfitShare)).toFixed(2)}%
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Profit Reporting Frequency <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  Frequency of audited or verified profit/loss reporting to investors.
                </p>
                <select
                  {...register("contract_terms.profit_reporting_frequency")}
                  disabled={isFinancialsLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                >
                  <option value="">Select reporting frequency...</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
                {errors.contract_terms?.profit_reporting_frequency && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.contract_terms.profit_reporting_frequency.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SPV Equity Terms */}
        {shariaContractType === "spv_equity" && (
          <div className="space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Existing Shares Outstanding <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  Total company shares already issued prior to this campaign raise.
                </p>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="e.g. 500000"
                  {...register("contract_terms.existing_shares_outstanding")}
                  disabled={isFinancialsLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
                {errors.contract_terms?.existing_shares_outstanding && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.contract_terms.existing_shares_outstanding.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Dividend Policy (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  Stated policy on dividend payments.
                </p>
                <select
                  {...register("contract_terms.dividend_policy")}
                  disabled={isFinancialsLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                >
                  <option value="">Select dividend policy...</option>
                  <option value="none_planned">None Planned (Profits Reinvested for Growth)</option>
                  <option value="discretionary">Discretionary (Board Declared)</option>
                  <option value="target_payout">Target Payout</option>
                </select>
                {errors.contract_terms?.dividend_policy && (
                  <p className="mt-1 text-sm text-red-600">{errors.contract_terms.dividend_policy.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Target Exit Horizon (Years, Optional)
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  Targeted timeframe for IPO, trade sale, or buyback (1–30 years).
                </p>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="30"
                  placeholder="e.g. 5"
                  {...register("contract_terms.target_exit_horizon_years")}
                  disabled={isFinancialsLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
                {errors.contract_terms?.target_exit_horizon_years && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.contract_terms.target_exit_horizon_years.message}
                  </p>
                )}
              </div>

              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="voting_rights"
                  {...register("contract_terms.voting_rights")}
                  disabled={isFinancialsLocked}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="voting_rights" className="ml-2 block text-sm font-medium text-gray-900">
                  Shares carry voting rights
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onPrev}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
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
