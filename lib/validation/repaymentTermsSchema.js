import * as z from "zod";

export const FREQUENCY_MONTHS = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
};

export const getYieldTypeForContract = (contractType) => {
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

export const getYieldTypeExplanation = (yieldType) => {
  switch (yieldType) {
    case "rental":
      return "Rental income generated through leasing the underlying asset to the issuer under Ijara.";
    case "profit_margin":
      return "Contractual or target profit margin derived from the Sharia commercial contract.";
    case "equity_appreciation":
      return "Returns derived from equity appreciation, dividends, and potential SPV exit events.";
    default:
      return "";
  }
};

export const getRoiLabelForContract = (contractType) => {
  switch (contractType) {
    case "murabaha":
      return "Annual profit rate (%)";
    case "ijara":
      return "Annual rental yield (%)";
    case "mudarabah":
      return "Target annual return (%), not guaranteed";
    default:
      return "Expected ROI (%)";
  }
};

export const getRoiHelperForContract = (contractType) => {
  switch (contractType) {
    case "murabaha":
    case "ijara":
      return "The rate investors are contractually owed.";
    case "mudarabah":
      return "A target only. Actual returns depend on profit and can be zero.";
    default:
      return "";
  }
};

/**
 * Adds whole calendar months to a UTC date.
 */
export function addMonthsUtc(dateInput, months) {
  if (!dateInput || !months) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const seconds = d.getUTCSeconds();
  return new Date(Date.UTC(year, month + months, day, hours, minutes, seconds));
}

// -------------------------------------------------------------
// Strict Zod Schemas for contract_terms (Reject unknown keys)
// -------------------------------------------------------------

export const murabahaTermsSchema = z
  .object({
    payment_frequency: z.enum(
      ["monthly", "quarterly", "semi_annual", "annual", "at_maturity"],
      { required_error: "Payment frequency is required" }
    ),
    principal_repayment: z.enum(["with_instalments", "at_maturity"], {
      required_error: "Principal repayment method is required",
    }),
    asset_description: z
      .string({ required_error: "Asset description is required" })
      .trim()
      .min(10, "Asset description must be at least 10 characters")
      .max(500, "Asset description cannot exceed 500 characters"),
  })
  .strict({ message: "Unknown fields detected in Murabaha contract terms" });

export const ijaraTermsSchema = z
  .object({
    payment_frequency: z.enum(
      ["monthly", "quarterly", "semi_annual", "annual"],
      { required_error: "Rent payment frequency is required" }
    ),
    asset_description: z
      .string({ required_error: "Asset description is required" })
      .trim()
      .min(10, "Asset description must be at least 10 characters")
      .max(500, "Asset description cannot exceed 500 characters"),
    asset_value: z.coerce
      .number({ required_error: "Asset value is required" })
      .positive("Asset value must be greater than 0"),
    end_of_term: z.enum(
      ["sale_to_issuer", "sale_to_third_party", "return_asset"],
      { required_error: "End of term arrangement is required" }
    ),
    end_of_term_price: z
      .union([
        z.coerce.number().positive("End of term price must be greater than 0"),
        z.nan(),
        z.null(),
        z.literal(""),
      ])
      .optional(),
  })
  .strict({ message: "Unknown fields detected in Ijara contract terms" })
  .superRefine((data, ctx) => {
    if (data.end_of_term === "sale_to_issuer") {
      const price = Number(data.end_of_term_price);
      if (isNaN(price) || price <= 0) {
        ctx.addIssue({
          path: ["end_of_term_price"],
          message: "End of term price is required when end of term is sale to issuer",
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

export const mudarabahTermsSchema = z
  .object({
    investor_profit_share_percent: z.coerce
      .number({ required_error: "Investor profit share percentage is required" })
      .gt(0, "Investor profit share must be greater than 0%")
      .lt(100, "Investor profit share must be less than 100%"),
    profit_reporting_frequency: z.enum(
      ["monthly", "quarterly", "semi_annual", "annual"],
      { required_error: "Profit reporting frequency is required" }
    ),
  })
  .strict({ message: "Unknown fields detected in Mudarabah contract terms" });

export const spvEquityTermsSchema = z
  .object({
    existing_shares_outstanding: z.coerce
      .number({ required_error: "Existing shares outstanding is required" })
      .int("Existing shares outstanding must be a whole integer")
      .min(0, "Existing shares outstanding cannot be negative"),
    voting_rights: z.boolean().optional().default(false),
    dividend_policy: z
      .enum(["none_planned", "discretionary", "target_payout"])
      .optional()
      .nullable(),
    target_exit_horizon_years: z
      .union([
        z.coerce
          .number()
          .int("Exit horizon must be a whole number of years")
          .min(1, "Target exit horizon must be at least 1 year")
          .max(30, "Target exit horizon cannot exceed 30 years"),
        z.nan(),
        z.null(),
        z.literal(""),
      ])
      .optional(),
  })
  .strict({ message: "Unknown fields detected in SPV Equity contract terms" });

const ALL_CONTRACT_KEYS = [
  "payment_frequency",
  "principal_repayment",
  "asset_description",
  "asset_value",
  "end_of_term",
  "end_of_term_price",
  "investor_profit_share_percent",
  "profit_reporting_frequency",
  "existing_shares_outstanding",
  "voting_rights",
  "dividend_policy",
  "target_exit_horizon_years",
];

const ALLOWED_KEYS_BY_CONTRACT = {
  murabaha: new Set(["payment_frequency", "principal_repayment", "asset_description"]),
  ijara: new Set(["payment_frequency", "asset_description", "asset_value", "end_of_term", "end_of_term_price"]),
  mudarabah: new Set(["investor_profit_share_percent", "profit_reporting_frequency"]),
  spv_equity: new Set(["existing_shares_outstanding", "voting_rights", "dividend_policy", "target_exit_horizon_years"]),
};

/**
 * Cleans a contract_terms object by retaining ONLY fields applicable to the specified contractType,
 * stripping empty string values for optional fields, and converting numeric strings to numbers.
 */
export function cleanContractTerms(contractType, terms) {
  if (!terms || typeof terms !== "object") return {};
  const allowed = ALLOWED_KEYS_BY_CONTRACT[contractType] || new Set();
  const cleaned = {};

  for (const [k, v] of Object.entries(terms)) {
    // If it's a known key belonging to a DIFFERENT contract type, ignore it
    if (!allowed.has(k) && ALL_CONTRACT_KEYS.includes(k)) continue;

    // Filter out empty strings/null for optional fields so they don't fail enum or numeric validation
    if (
      (k === "end_of_term_price" || k === "target_exit_horizon_years" || k === "dividend_policy") &&
      (v === "" || v === null || (typeof v === "number" && isNaN(v)))
    ) {
      continue;
    }

    // Coerce numeric fields where appropriate
    if (k === "asset_value" && v !== "" && v !== null && !isNaN(Number(v))) {
      cleaned[k] = Number(v);
    } else if (k === "end_of_term_price" && v !== "" && v !== null && !isNaN(Number(v))) {
      cleaned[k] = Number(v);
    } else if (k === "investor_profit_share_percent" && v !== "" && v !== null && !isNaN(Number(v))) {
      cleaned[k] = Number(v);
    } else if (k === "existing_shares_outstanding" && v !== "" && v !== null && !isNaN(Number(v))) {
      cleaned[k] = Number(v);
    } else if (k === "target_exit_horizon_years" && v !== "" && v !== null && !isNaN(Number(v))) {
      cleaned[k] = Number(v);
    } else if (k === "voting_rights") {
      cleaned[k] = Boolean(v);
    } else if (typeof v === "string") {
      cleaned[k] = k === "asset_description" ? v.trim() : v;
    } else {
      cleaned[k] = v;
    }
  }

  return cleaned;
}

/**
 * Validates a contract_terms object against the strict schema for the contract type.
 */
export function validateContractTerms(contractType, terms) {
  if (!terms || typeof terms !== "object") {
    return { success: false, error: "Contract terms must be a valid JSON object" };
  }

  const cleaned = cleanContractTerms(contractType, terms);

  switch (contractType) {
    case "murabaha":
      return murabahaTermsSchema.safeParse(cleaned);
    case "ijara":
      return ijaraTermsSchema.safeParse(cleaned);
    case "mudarabah":
      return mudarabahTermsSchema.safeParse(cleaned);
    case "spv_equity":
      return spvEquityTermsSchema.safeParse(cleaned);
    default:
      return { success: false, error: `Unsupported Sharia contract type: ${contractType}` };
  }
}

// -------------------------------------------------------------
// Comprehensive Step 3 Financials Schema (Client & Server)
// -------------------------------------------------------------

export const createStep3FinancialsSchema = ({
  shariaContractType,
  conversionEnabled = false,
  conversionRatioShares = 0,
  totalSharesAuthorized = 0,
  conversionDeadline = null,
}) => {
  const isSpvEquity = shariaContractType === "spv_equity";

  return z
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
      expected_roi_percent: isSpvEquity
        ? z.union([z.null(), z.undefined(), z.literal(""), z.nan()]).optional()
        : z.preprocess(
            (val) => (val === "" || val === null || val === undefined ? undefined : val),
            z.coerce
              .number({ required_error: "Expected ROI is required", invalid_type_error: "Expected ROI is required" })
              .gt(0, "Expected ROI must be greater than 0%")
              .lte(100, "Expected ROI cannot exceed 100%")
          ),
      yield_type: z.enum(["rental", "profit_margin", "equity_appreciation"], {
        required_error: "Please select a yield type",
      }),
      currency: z.enum(["AED", "MYR", "USD", "IDR"], {
        required_error: "Please select a currency",
      }),
      clearing_option: z.enum(
        ["platform_clearing", "custody_provider_clearing"],
        { required_error: "Please select a clearing option" }
      ),
      tenor_months: isSpvEquity
        ? z.union([z.null(), z.undefined(), z.literal(""), z.nan()]).optional()
        : z.preprocess(
            (val) => (val === "" || val === null || val === undefined ? undefined : val),
            z.coerce
              .number({ required_error: "Term in months is required", invalid_type_error: "Term in months is required" })
              .int("Term must be a whole number of months")
              .min(1, "Term must be at least 1 month")
              .max(120, "Term cannot exceed 120 months (10 years)")
          ),
      contract_terms: z.record(z.any()),
    })
    .superRefine((data, ctx) => {
      // 1. Soft cap and Hard cap relationships
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

      // 2. Campaign End Date hourly enforcement (minutes and seconds must be 00)
      if (data.campaign_end_date) {
        const rawDate = data.campaign_end_date;
        const dateIso = rawDate.endsWith("Z")
          ? rawDate
          : `${rawDate}:00.000Z`;
        const d = new Date(dateIso);
        if (!isNaN(d.getTime())) {
          if (d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0) {
            ctx.addIssue({
              path: ["campaign_end_date"],
              message:
                "Campaign deadline must be set to the top of an hour (minutes and seconds must be 00:00 UTC).",
              code: z.ZodIssueCode.custom,
            });
          }
        }
      }

      // 3. Conversion terms minimum target_goal check
      if (
        !isSpvEquity &&
        conversionEnabled &&
        conversionRatioShares > 0 &&
        totalSharesAuthorized > 0 &&
        data.unit_price > 0
      ) {
        const totalCostAuth =
          (data.unit_price / conversionRatioShares) * totalSharesAuthorized;
        if (data.target_goal < totalCostAuth) {
          const currPrefix = data.currency ? `${data.currency} ` : "";
          ctx.addIssue({
            path: ["target_goal"],
            message: `Target goal cannot be less than the Total Authorized Cost (${currPrefix}${totalCostAuth.toLocaleString(
              undefined,
              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
            )}) based on conversion terms.`,
            code: z.ZodIssueCode.custom,
          });
        }
      }

      // 4. Conversion deadline vs campaign_end_date check
      if (conversionEnabled && conversionDeadline && data.campaign_end_date) {
        const campaignDateStr = data.campaign_end_date.endsWith("Z")
          ? data.campaign_end_date
          : `${data.campaign_end_date}:00.000Z`;
        const convDateStr = conversionDeadline.endsWith("Z")
          ? conversionDeadline
          : `${conversionDeadline}T00:00:00.000Z`;
        const campaignDate = new Date(campaignDateStr);
        const convDate = new Date(convDateStr);

        if (!isNaN(campaignDate.getTime()) && !isNaN(convDate.getTime())) {
          if (campaignDate >= convDate) {
            ctx.addIssue({
              path: ["campaign_end_date"],
              message:
                "The campaign end date cannot be later than or equal to the conversion deadline. Please go back to Step 2 to change the conversion deadline or choose an earlier campaign end date.",
              code: z.ZodIssueCode.custom,
            });
          }
        }
      }

      // 5. Repayment terms & frequency divisibility checks
      const termsResult = validateContractTerms(shariaContractType, data.contract_terms);
      if (!termsResult.success) {
        // Forward issues from contract_terms
        if (termsResult.error?.issues) {
          termsResult.error.issues.forEach((iss) => {
            ctx.addIssue({
              path: ["contract_terms", ...iss.path],
              message: iss.message,
              code: z.ZodIssueCode.custom,
            });
          });
        } else {
          ctx.addIssue({
            path: ["contract_terms"],
            message: termsResult.error || "Invalid repayment terms",
            code: z.ZodIssueCode.custom,
          });
        }
      } else {
        const parsedTerms = termsResult.data;

        // Non-equity frequency divisibility check against tenor_months
        if (!isSpvEquity && data.tenor_months) {
          const freq =
            parsedTerms.payment_frequency || parsedTerms.profit_reporting_frequency;

          if (freq && freq !== "at_maturity") {
            const periodMonths = FREQUENCY_MONTHS[freq];
            if (periodMonths && data.tenor_months % periodMonths !== 0) {
              ctx.addIssue({
                path: ["tenor_months"],
                message:
                  "The term must be a whole number of payment periods. Choose a term that fits the frequency.",
                code: z.ZodIssueCode.custom,
              });
            }
          }

          // Ijara asset_value must be >= target_goal
          if (shariaContractType === "ijara" && parsedTerms.asset_value !== undefined) {
            if (Number(parsedTerms.asset_value) < Number(data.target_goal)) {
              ctx.addIssue({
                path: ["contract_terms", "asset_value"],
                message: "The asset value must cover the amount you are raising.",
                code: z.ZodIssueCode.custom,
              });
            }
          }

          // Conversion deadline vs Tenor / Estimated Maturity check
          if (
            conversionEnabled &&
            conversionDeadline &&
            data.campaign_end_date &&
            data.tenor_months > 0
          ) {
            const campaignDateStr = data.campaign_end_date.endsWith("Z")
              ? data.campaign_end_date
              : `${data.campaign_end_date}:00.000Z`;
            const estimatedMaturity = addMonthsUtc(
              campaignDateStr,
              Number(data.tenor_months)
            );
            const convDateStr = conversionDeadline.endsWith("Z")
              ? conversionDeadline
              : `${conversionDeadline}T00:00:00.000Z`;
            const convDate = new Date(convDateStr);

            if (
              estimatedMaturity &&
              !isNaN(convDate.getTime()) &&
              convDate >= estimatedMaturity
            ) {
              ctx.addIssue({
                path: ["tenor_months"],
                message: `The conversion deadline must fall before the project maturity date (Campaign End Date + ${data.tenor_months} months). Please go back to Step 2 to set an earlier conversion deadline or choose a longer term in Step 3.`,
                code: z.ZodIssueCode.custom,
              });
            }
          }
        }
      }
    });
};
