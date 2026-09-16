"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProjectDraft } from "@/app/actions/projects";
import { HelpCircle } from "lucide-react";

const PREDEFINED_AUTHORITIES = ["DIFC", "ADGM", "LABUAN_IBFC"];

const schema = z
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

      if (data.sharia_contract_type !== "spv_equity" && data.conversion_enabled) {
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
  onUpdate,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const spvDetail = initialData?.spv_details?.[0] || {};
  const savedAuthority = spvDetail?.registration_authority || "";
  const isPredefinedAuth = PREDEFINED_AUTHORITIES.includes(savedAuthority);

  const initialContractType = initialData?.sharia_contract_type || undefined;
  const initialIsSpv =
    initialContractType === "spv_equity" ? true : initialData?.is_spv || false;

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

      await updateProjectDraft(projectId, payload, 2);
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
        <label className="block text-sm font-medium text-gray-700">
          Sharia Contract Type
        </label>
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
        {errors.sharia_contract_type && (
          <p className="mt-1 text-sm text-red-600">
            {errors.sharia_contract_type.message}
          </p>
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

      {isSpv && (
        <div className="p-4 border rounded-md bg-gray-50 space-y-4">
          <h3 className="font-medium text-gray-900">SPV Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Legal Name
            </label>
            <input
              {...register("spv_legal_name")}
              disabled={disabled}
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
              disabled={disabled}
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
                  disabled={disabled}
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
              disabled={disabled}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            />
            {errors.registration_number && (
              <p className="mt-1 text-sm text-red-600">
                {errors.registration_number.message}
              </p>
            )}
          </div>

          {/* Conversion Clause Checkbox (Only available if SPV is checked AND contract type is NOT SPV Equity) */}
          {shariaContractType !== "spv_equity" && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="conversion_enabled"
                  {...register("conversion_enabled")}
                  disabled={disabled}
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
                      A conversion clause specifies the conditions under which an
                      investment automatically transforms into equity shares in
                      the company. Enabling this clause will make your project
                      more attractive to investors
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
                  disabled={disabled}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
                {errors.conversion_trigger_value && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.conversion_trigger_value.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    1 sukuk unit converts to
                  </label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                    1 Sukuk unit = AED 100
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 10"
                    {...register("conversion_ratio_shares")}
                    disabled={disabled}
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
                  disabled={disabled}
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
