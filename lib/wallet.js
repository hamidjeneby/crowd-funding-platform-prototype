import crypto from "crypto";

/**
 * Generates a unique, collision-resistant reference code for wallet transactions.
 * Format: TXN-<TYPE>-<YYYYMMDD>-<HEX6>
 * Examples:
 *   - top_up:        TXN-DEP-20261021-A8F2D1
 *   - pledge_debit:  TXN-PLG-20261021-7C4E19
 *   - refund_credit: TXN-REF-20261021-9B1D04
 *
 * @param {'top_up' | 'pledge_debit' | 'refund_credit' | string} type
 * @returns {string}
 */
export function generateWalletReferenceCode(type) {
  const prefixMap = {
    top_up: "DEP",
    pledge_debit: "PLG",
    refund_credit: "REF",
  };
  const prefix = prefixMap[type] || "WTX";
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TXN-${prefix}-${dateStr}-${randomSuffix}`;
}
