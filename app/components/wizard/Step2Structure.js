"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { updateProjectDraft } from "@/app/actions/projects";

const PREDEFINED_AUTHORITIES = ["DIFC", "ADGM", "LABUAN_IBFC"];

const createSchema = (campaignEndDate) =>
  z
    .object({
      sharia_contract_type: z.enum(
        ["murabaha", "mudarabah", "ijara", "spv_equity"],
        {
          required_error: "Please select a Sharia contract type",
        },
      ),
      is_spv: z.boolean(),
      spv_legal_name: z.string().optional(),
      registration_authority: z.string().optional(),
      custom_registration_authority: z.string().optional(),
      registration_number: z.string().optional(),
      total_shares_authorized: z
        .union([
          z.number(),
          z.string().transform((v) => (v === "" ? undefined : Number(v))),
        ])
        .optional(),
      conversion_enabled: z.boolean().optional(),
      conversion_trigger_value: z
        .union([
          z.number(),
          z.string().transform((v) => (v === "" ? undefined : Number(v))),
        ])
        .optional(),
      conversion_ratio_shares: z
        .union([
          z.number(),
          z.string().transform((v) => (v === "" ? undefined : Number(v))),
        ])
        .optional(),
      conversion_deadline: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.is_spv) {
        if (!data.spv_legal_name) {
          ctx.addIssue({
            path: ["spv_legal_name"],
            message: "Required for SPV",
            code: z.ZodIssueCode.custom,
          });
        }
        if (!data.registration_authority) {
          ctx.addIssue({
            path: ["registration_authority"],
            message: "Required for SPV",
            code: z.ZodIssueCode.custom,
          });
        }
        if (
          data.registration_authority === "OTHER" &&
          (!data.custom_registration_authority ||
            !data.custom_registration_authority.trim())
        ) {
          ctx.addIssue({
            path: ["custom_registration_authority"],
            message: "Please specify the registration authority name",
            code: z.ZodIssueCode.custom,
          });
        }
        if (!data.registration_number) {
          ctx.addIssue({
            path: ["registration_number"],
            message: "Required for SPV",
            code: z.ZodIssueCode.custom,
          });
        }

        if (data.sharia_contract_type === "spv_equity") {
          const numShares = Number(data.total_shares_authorized);
          if (
            data.total_shares_authorized === undefined ||
            isNaN(numShares) ||
            numShares < 1 ||
            !Number.isInteger(numShares)
          ) {
            ctx.addIssue({
              path: ["total_shares_authorized"],
              message:
                "Shares offered in this raise is required and must be a whole number of at least 1",
              code: z.ZodIssueCode.custom,
            });
          }
        }

        if (
          data.sharia_contract_type !== "spv_equity" &&
          data.conversion_enabled
        ) {
          if (
            data.total_shares_authorized === undefined ||
            isNaN(data.total_shares_authorized) ||
            data.total_shares_authorized <= 0
          ) {
            ctx.addIssue({
              path: ["total_shares_authorized"],
              message: "Total authorized shares required for conversion clause",
              code: z.ZodIssueCode.custom,
            });
          }
          if (
            data.conversion_trigger_value === undefined ||
            isNaN(data.conversion_trigger_value) ||
            data.conversion_trigger_value <= 0
          ) {
            ctx.addIssue({
              path: ["conversion_trigger_value"],
              message: "Valid trigger share price required",
              code: z.ZodIssueCode.custom,
            });
          }
          if (
            data.conversion_ratio_shares === undefined ||
            isNaN(data.conversion_ratio_shares) ||
            data.conversion_ratio_shares <= 0
          ) {
            ctx.addIssue({
              path: ["conversion_ratio_shares"],
              message: "Valid conversion ratio required",
              code: z.ZodIssueCode.custom,
            });
          }
          if (!data.conversion_deadline) {
            ctx.addIssue({
              path: ["conversion_deadline"],
              message: "Conversion deadline date required",
              code: z.ZodIssueCode.custom,
            });
          } else if (campaignEndDate && data.conversion_deadline) {
            const convDateStr = data.conversion_deadline.endsWith("Z")
              ? data.conversion_deadline
              : `${data.conversion_deadline}T00:00:00.000Z`;
            const campaignDateStr = campaignEndDate.endsWith("Z")
              ? campaignEndDate
              : `${campaignEndDate}:00.000Z`;
            const convDate = new Date(convDateStr);
            const campaignDate = new Date(campaignDateStr);
            if (!isNaN(convDate.getTime()) && !isNaN(campaignDate.getTime())) {
              if (convDate <= campaignDate) {
                ctx.addIssue({
                  path: ["conversion_deadline"],
                  message:
                    "The conversion deadline must be after the campaign end date. Please choose a conversion deadline after the campaign end date.",
                  code: z.ZodIssueCode.custom,
                });
              }
            }
          }
        }
      }
    });

export default function Step2Structure({
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

  const spvDetail =
    initialData?.spv_details?.[0] || initialData?.spv_details || {};
  const savedAuthority = spvDetail?.registration_authority || "";
  const isPredefinedAuth = PREDEFINED_AUTHORITIES.includes(savedAuthority);

  const initialContractType = initialData?.sharia_contract_type || undefined;
  const initialIsSpv =
    initialContractType === "spv_equity" ? true : initialData?.is_spv || false;
  const campaignEndDate = initialData?.campaign_end_date;

  const rejectionReason = spvDetail?.rejection_reason?.trim()
    ? spvDetail.rejection_reason
    : null;
  const hasSpvRejection =
    spvDetail?.spv_detail_verification_status === "rejected" ||
    Boolean(rejectionReason);

  const schema = useMemo(
    () => createSchema(campaignEndDate),
    [campaignEndDate],
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
      sharia_contract_type: initialContractType,
      is_spv: initialIsSpv,
      spv_legal_name: spvDetail?.spv_legal_name || "",
      registration_authority: savedAuthority
        ? isPredefinedAuth
          ? savedAuthority
          : "OTHER"
        : undefined,
      custom_registration_authority: isPredefinedAuth ? "" : savedAuthority,
      registration_number: spvDetail?.registration_number || "",
      total_shares_authorized: spvDetail?.total_shares_authorized ?? "",
      conversion_enabled:
        initialContractType === "spv_equity"
          ? false
          : spvDetail?.conversion_enabled || false,
      conversion_trigger_value: spvDetail?.conversion_trigger_value ?? "",
      conversion_ratio_shares: spvDetail?.conversion_ratio_shares ?? "",
      conversion_deadline: spvDetail?.conversion_deadline || "",
    },
  });

  const shariaContractType = watch("sharia_contract_type");
  const isSpv = watch("is_spv");
  const registrationAuthority = watch("registration_authority");
  const conversionEnabled = watch("conversion_enabled");

  // Synchronize is_spv and conversion_enabled based on selected Sharia Contract Type
  useEffect(() => {
    if (shariaContractType === "spv_equity") {
      setValue("is_spv", true);
      setValue("conversion_enabled", false);
    }
  }, [shariaContractType, setValue]);

  // Reset conversion_enabled if SPV is unchecked or contract type is SPV Equity
  useEffect(() => {
    if (!isSpv || shariaContractType === "spv_equity") {
      setValue("conversion_enabled", false);
    }
  }, [isSpv, shariaContractType, setValue]);

  const onSubmit = async (data) => {
    if (disabled) return onNext();
    setLoading(true);
    setError(null);
    try {
      const finalAuthority =
        data.registration_authority === "OTHER"
          ? data.custom_registration_authority?.trim()
          : data.registration_authority;

      const isSpvActive =
        data.sharia_contract_type === "spv_equity" || Boolean(data.is_spv);
      const isConversionActive =
        isSpvActive &&
        data.sharia_contract_type !== "spv_equity" &&
        Boolean(data.conversion_enabled);

      const payload = {
        ...data,
        is_spv: isSpvActive,
        conversion_enabled: isConversionActive,
        registration_authority: finalAuthority,
      };

      const res = await updateProjectDraft(projectId, payload, 2);
      await onUpdate();
      onNext(res);
    } catch (err) {
      console.error("Step 2 save error:", err);
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

  const isStructureLocked = disabled || isShariahApproved;

  const handleFormSubmit = isStructureLocked
    ? (e) => {
        e.preventDefault();
        onNext();
      }
    : handleSubmit(onSubmit);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">Structure &amp; Compliance</h2>

      {isShariahApproved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>This campaign is marked as Shariah Compliant (Approved). Shariah contract type and structure details are locked from editing.</span>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Sharia Contract Type
        </label>
        <select
          {...register("sharia_contract_type")}
          disabled={isStructureLocked}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
        >
          <option value="">Select a type...</option>
          <option value="murabaha">Murabaha</option>
          <option value="mudarabah">Mudarabah</option>
          <option value="ijara">Ijara</option>
          <option value="spv_equity">SPV Equity</option>
        </select>
        {errors.sharia_contract_type && (
          <p className="mt-1 text-sm text-red-600">
            {errors.sharia_contract_type.message}
          </p>
        )}
        {initialContractType && shariaContractType && shariaContractType !== initialContractType && (
          <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Repayment Terms Will Be Reset</span>
            </div>
            <p className="leading-relaxed font-medium">
              You changed the contract type from <strong className="capitalize">{initialContractType.replace("_", " ")}</strong> to <strong className="capitalize">{shariaContractType.replace("_", " ")}</strong>. Repayment terms and tenor from the previous contract type will be cleared upon saving, and will need to be re-entered in Step 3.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_spv"
          {...register("is_spv")}
          disabled={disabled || shariaContractType === "spv_equity"}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <label
          htmlFor="is_spv"
          className={`ml-2 block text-sm font-medium ${
            shariaContractType === "spv_equity"
              ? "text-gray-700 font-semibold"
              : "text-gray-900"
          }`}
        >
          This project is an SPV
          {shariaContractType === "spv_equity" && (
            <span className="ml-2 text-xs font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Required for SPV Equity
            </span>
          )}
        </label>
      </div>

      {/* If SPV was rejected and is not currently selected as SPV, show a notice */}
      {hasSpvRejection && !isSpv && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-red-950">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>SPV Details Rejected by Auditor</span>
          </div>
          <p className="text-red-900/90 leading-relaxed font-medium">
            The previous SPV details for this project were rejected by the auditor. Please check &quot;This project is an SPV&quot; to review the auditor&apos;s rejection feedback and correct your information.
          </p>
          {rejectionReason && (
            <div className="pt-2 border-t border-red-200/80">
              <span className="font-extrabold uppercase text-[10px] text-red-800 block mb-0.5">
                Auditor Rejection Reason:
              </span>
              <p className="font-semibold text-red-950 bg-red-100/70 p-2.5 rounded-lg border border-red-200/60 whitespace-pre-wrap">
                {rejectionReason}
              </p>
            </div>
          )}
        </div>
      )}

      {isSpv && (
        <div
          className={`p-5 border rounded-2xl space-y-4 transition-colors ${
            hasSpvRejection
              ? "border-red-300 bg-red-50/20 shadow-xs"
              : spvDetail?.spv_detail_verification_status === "approved"
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200/80 pb-3 gap-2">
            <div>
              <h3 className="font-bold text-gray-900 text-base">SPV Details</h3>
              <p className="text-xs text-gray-500">
                Special Purpose Vehicle corporate registration &amp; jurisdiction
              </p>
            </div>
            <div>
              {hasSpvRejection ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 shadow-2xs">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  SPV Details Rejected
                </span>
              ) : spvDetail?.spv_detail_verification_status === "approved" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  SPV Approved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pending Verification
                </span>
              )}
            </div>
          </div>

          {/* Prominent Rejection Feedback Banner */}
          {hasSpvRejection && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-extrabold text-red-950">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Action Required: Auditor SPV Rejection Feedback</span>
              </div>
              <p className="text-xs text-red-900/90 leading-relaxed font-medium">
                The auditor rejected your submitted SPV details. Please review the specific feedback below and update your SPV parameters before resubmitting.
              </p>
              {rejectionReason && (
                <div className="pt-2 border-t border-red-200/80 mt-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-800 block mb-1">
                    Auditor Rejection Reason:
                  </span>
                  <p className="text-xs font-semibold text-red-950 bg-red-100/80 p-3 rounded-lg border border-red-200 whitespace-pre-wrap">
                    {rejectionReason}
                  </p>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Legal Name
            </label>
            <input
              {...register("spv_legal_name")}
              disabled={isStructureLocked}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
            {errors.spv_legal_name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.spv_legal_name.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Registration Authority
            </label>
            <select
              {...register("registration_authority")}
              disabled={isStructureLocked}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
            >
              <option value="">Select an authority...</option>
              <option value="DIFC">DIFC</option>
              <option value="ADGM">ADGM</option>
              <option value="LABUAN_IBFC">Labuan IBFC</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.registration_authority && (
              <p className="mt-1 text-sm text-red-600">
                {errors.registration_authority.message}
              </p>
            )}

            {registrationAuthority === "OTHER" && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700">
                  Specify Registration Authority Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. BVI Financial Services Commission"
                  {...register("custom_registration_authority")}
                  disabled={isStructureLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
                {errors.custom_registration_authority && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.custom_registration_authority.message}
                  </p>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Registration Number
            </label>
            <input
              {...register("registration_number")}
              disabled={isStructureLocked}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
            {errors.registration_number && (
              <p className="mt-1 text-sm text-red-600">
                {errors.registration_number.message}
              </p>
            )}
          </div>

          {shariaContractType === "spv_equity" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Shares offered in this raise <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-1">
                (Total number of shares being offered to investors in this campaign raise)
              </p>
              <input
                type="number"
                step="1"
                placeholder="e.g. 100000"
                {...register("total_shares_authorized")}
                disabled={isStructureLocked}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
              />
              {errors.total_shares_authorized && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.total_shares_authorized.message}
                </p>
              )}
            </div>
          )}

          {/* Conversion Clause Checkbox (Only available if SPV is checked AND contract type is NOT SPV Equity) */}
          {shariaContractType !== "spv_equity" && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="conversion_enabled"
                  {...register("conversion_enabled")}
                  disabled={isStructureLocked}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="conversion_enabled"
                  className="ml-2 block text-sm font-medium text-gray-900 flex items-center"
                >
                  Enable Conversion Clause
                  <span className="relative inline-block group ml-1.5 align-middle">
                    <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-72 p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-30 leading-relaxed font-normal">
                      A conversion clause specifies the conditions under which
                      an investment automatically transforms into equity shares
                      in the company. Enabling this clause will make your
                      project more attractive to investors
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Conversion Inputs */}
          {shariaContractType !== "spv_equity" && conversionEnabled && (
            <div className="p-4 border rounded-md bg-white space-y-4 shadow-sm">
              <h4 className="font-medium text-sm text-gray-900">
                Conversion Terms
              </h4>
              <p className="text-xs text-blue-700 bg-blue-50/80 p-2.5 rounded-lg border border-blue-200/60 leading-relaxed font-medium">
                Units that convert to shares stop receiving scheduled payments from the conversion date.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Authorized Shares{" "}
                  <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  (Maximum number of shares that can be distributed upon
                  conversion)
                </p>
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 100000"
                  {...register("total_shares_authorized")}
                  disabled={isStructureLocked}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
                {errors.total_shares_authorized && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.total_shares_authorized.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trigger Share Price
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  (The price per share that will trigger the conversion clause)
                </p>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  {...register("conversion_trigger_value")}
                  disabled={isStructureLocked}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
                {errors.conversion_trigger_value && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.conversion_trigger_value.message}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    1 sukuk unit converts to
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 10"
                    {...register("conversion_ratio_shares")}
                    disabled={isStructureLocked}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  />
                  <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                    shares
                  </span>
                </div>
                {errors.conversion_ratio_shares && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.conversion_ratio_shares.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Conversion Deadline
                </label>
                <input
                  type="date"
                  {...register("conversion_deadline")}
                  disabled={isStructureLocked}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
                {errors.conversion_deadline && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.conversion_deadline.message}
                  </p>
                )}
              </div>
            </div>
          )}
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
