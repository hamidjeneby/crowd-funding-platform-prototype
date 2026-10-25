/**
 * Pure helper functions and constants for Class 9 and Class 10 pledge limits.
 * No database calls and no "@/" path alias imports.
 */

export const QUARTER_COUNTED_STATUSES = [
  "pending",
  "allocated",
  "active",
  "completed",
];

export const OPEN_PLEDGE_STATUSES = ["pending"];

export const OPEN_PLEDGE_LIMIT_CODE = "OPEN_PLEDGE_LIMIT";
export const QUARTER_LIMIT_CODE = "QUARTER_LIMIT";

export const OPEN_PLEDGE_LIMIT_MESSAGE =
  "Your investor class allows one open pledge at a time. You can pledge again after your current pledge is allocated or closed.";

const UTC_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Returns { start, nextStart } as UTC Date objects for the calendar quarter containing `date`.
 * Quarters are UTC calendar quarters:
 * - Q1: Jan 1 00:00:00.000 UTC -> Apr 1 00:00:00.000 UTC
 * - Q2: Apr 1 00:00:00.000 UTC -> Jul 1 00:00:00.000 UTC
 * - Q3: Jul 1 00:00:00.000 UTC -> Oct 1 00:00:00.000 UTC
 * - Q4: Oct 1 00:00:00.000 UTC -> Jan 1 00:00:00.000 UTC (next year)
 *
 * @param {Date|string|number} [date=new Date()]
 * @returns {{ start: Date, nextStart: Date }}
 */
export function getQuarterWindow(date = new Date()) {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError("Invalid date provided to getQuarterWindow");
  }

  const utcYear = d.getUTCFullYear();
  const utcMonth = d.getUTCMonth(); // 0..11
  const quarterStartMonth = Math.floor(utcMonth / 3) * 3; // 0, 3, 6, or 9

  const start = new Date(Date.UTC(utcYear, quarterStartMonth, 1, 0, 0, 0, 0));
  const nextStart =
    quarterStartMonth === 9
      ? new Date(Date.UTC(utcYear + 1, 0, 1, 0, 0, 0, 0))
      : new Date(Date.UTC(utcYear, quarterStartMonth + 3, 1, 0, 0, 0, 0));

  return { start, nextStart };
}

/**
 * Formats a UTC Date as "{day} {Month} {year}", e.g. "1 January 2027".
 *
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatUtcQuarterDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError("Invalid date provided to formatUtcQuarterDate");
  }
  const day = d.getUTCDate();
  const month = UTC_MONTH_NAMES[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Builds the exact user-facing rejection message for QUARTER_LIMIT.
 *
 * @param {Date|string|number} nextStart
 * @returns {string}
 */
export function formatQuarterLimitMessage(nextStart) {
  return `Your investor class allows one campaign per quarter. You can invest again from ${formatUtcQuarterDate(nextStart)} (UTC).`;
}

/**
 * Maps a Postgres error (including 23505 unique index violations) from the pledges insert
 * to a friendly { code, message } without exposing raw database errors.
 *
 * @param {object|null} pledgeInsertError
 * @param {Date|string|number} [referenceDate=new Date()]
 * @returns {{ code: string, message: string }}
 */
export function mapPledgeInsertError(
  pledgeInsertError,
  referenceDate = new Date()
) {
  if (!pledgeInsertError) {
    return {
      code: "PLEDGE_INSERT_FAILED",
      message: "Failed to record pledge commitment. Please try again.",
    };
  }

  if (String(pledgeInsertError.code) === "23505") {
    const rawText = `${pledgeInsertError.message || ""} ${pledgeInsertError.details || ""} ${pledgeInsertError.hint || ""}`;
    if (rawText.includes("uniq_class10_one_active_pledge")) {
      return {
        code: OPEN_PLEDGE_LIMIT_CODE,
        message: OPEN_PLEDGE_LIMIT_MESSAGE,
      };
    }
    if (rawText.includes("uniq_class9_10_one_pledge_per_quarter")) {
      const { nextStart } = getQuarterWindow(referenceDate);
      return {
        code: QUARTER_LIMIT_CODE,
        message: formatQuarterLimitMessage(nextStart),
      };
    }
  }

  return {
    code: "PLEDGE_INSERT_FAILED",
    message: "Failed to record pledge commitment. Please try again.",
  };
}
