/**
 * FILE: tests/pledge-limits/test-pledge-limits.mjs
 * PURPOSE:
 *   Pure `node:test` unit tests for Class 9 and Class 10 pledge limit rules:
 *     - `getQuarterWindow(date)` UTC quarter calculation (Q1–Q4, boundaries, year rollover, leap years)
 *     - `QUARTER_COUNTED_STATUSES` and `OPEN_PLEDGE_STATUSES` constants
 *     - `CLASS_CONFIG` single-source-of-truth keys (`maxCampaignsPerQuarter`, `maxOpenPledges`)
 *     - `mapPledgeInsertError` mapping of Postgres `23505` unique index violations
 *
 * HOW TO RUN:
 *   node --test tests/pledge-limits/test-pledge-limits.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  getQuarterWindow,
  QUARTER_COUNTED_STATUSES,
  OPEN_PLEDGE_STATUSES,
  OPEN_PLEDGE_LIMIT_CODE,
  QUARTER_LIMIT_CODE,
  OPEN_PLEDGE_LIMIT_MESSAGE,
  formatUtcQuarterDate,
  formatQuarterLimitMessage,
  mapPledgeInsertError,
} from "../../lib/pledgeLimits.js";
import { CLASS_CONFIG } from "../../app/constants/classConfig.js";

test("QUARTER_COUNTED_STATUSES and OPEN_PLEDGE_STATUSES match specification", () => {
  assert.deepEqual(QUARTER_COUNTED_STATUSES, [
    "pending",
    "allocated",
    "active",
    "completed",
  ]);
  assert.deepEqual(OPEN_PLEDGE_STATUSES, ["pending"]);
});

test("CLASS_CONFIG defines maxCampaignsPerQuarter and maxOpenPledges only on Class 9 and 10", () => {
  for (let cls = 1; cls <= 8; cls++) {
    assert.equal(
      "maxCampaignsPerQuarter" in CLASS_CONFIG[cls],
      false,
      `Class ${cls} must not have maxCampaignsPerQuarter`
    );
    assert.equal(
      "maxOpenPledges" in CLASS_CONFIG[cls],
      false,
      `Class ${cls} must not have maxOpenPledges`
    );
  }

  assert.equal(CLASS_CONFIG[9].maxCampaignsPerQuarter, 1);
  assert.equal("maxOpenPledges" in CLASS_CONFIG[9], false);

  assert.equal(CLASS_CONFIG[10].maxCampaignsPerQuarter, 1);
  assert.equal(CLASS_CONFIG[10].maxOpenPledges, 1);
});

test("getQuarterWindow returns UTC Dates for dates in each quarter (Q1, Q2, Q3, Q4)", () => {
  // Q1 (Jan-Mar)
  const q1 = getQuarterWindow(new Date("2026-02-15T14:30:00.000Z"));
  assert.equal(q1.start instanceof Date, true);
  assert.equal(q1.nextStart instanceof Date, true);
  assert.equal(q1.start.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(q1.nextStart.toISOString(), "2026-04-01T00:00:00.000Z");

  // Q2 (Apr-Jun)
  const q2 = getQuarterWindow(new Date("2026-05-20T08:15:00.000Z"));
  assert.equal(q2.start.toISOString(), "2026-04-01T00:00:00.000Z");
  assert.equal(q2.nextStart.toISOString(), "2026-07-01T00:00:00.000Z");

  // Q3 (Jul-Sep)
  const q3 = getQuarterWindow(new Date("2026-08-10T22:45:00.000Z"));
  assert.equal(q3.start.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(q3.nextStart.toISOString(), "2026-10-01T00:00:00.000Z");

  // Q4 (Oct-Dec)
  const q4 = getQuarterWindow(new Date("2026-11-05T03:00:00.000Z"));
  assert.equal(q4.start.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(q4.nextStart.toISOString(), "2027-01-01T00:00:00.000Z");
});

test("getQuarterWindow boundary: 31 March 23:59:59 UTC vs 1 April 00:00:00 UTC", () => {
  const mar31 = getQuarterWindow(new Date("2026-03-31T23:59:59.000Z"));
  assert.equal(mar31.start.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(mar31.nextStart.toISOString(), "2026-04-01T00:00:00.000Z");

  const apr1 = getQuarterWindow(new Date("2026-04-01T00:00:00.000Z"));
  assert.equal(apr1.start.toISOString(), "2026-04-01T00:00:00.000Z");
  assert.equal(apr1.nextStart.toISOString(), "2026-07-01T00:00:00.000Z");

  // Confirm 31 March 23:59:59 is strictly before apr1.start
  assert.equal(
    new Date("2026-03-31T23:59:59.000Z").getTime() < mar31.nextStart.getTime(),
    true
  );
  assert.equal(mar31.nextStart.getTime(), apr1.start.getTime());
});

test("getQuarterWindow boundary: 31 December vs 1 January (year rollover)", () => {
  const dec31 = getQuarterWindow(new Date("2026-12-31T23:59:59.000Z"));
  assert.equal(dec31.start.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(dec31.nextStart.toISOString(), "2027-01-01T00:00:00.000Z");

  const jan1 = getQuarterWindow(new Date("2027-01-01T00:00:00.000Z"));
  assert.equal(jan1.start.toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(jan1.nextStart.toISOString(), "2027-04-01T00:00:00.000Z");

  assert.equal(dec31.nextStart.getTime(), jan1.start.getTime());
});

test("getQuarterWindow handles leap-year date (29 February)", () => {
  const leap2024 = getQuarterWindow(new Date("2024-02-29T23:59:59.000Z"));
  assert.equal(leap2024.start.toISOString(), "2024-01-01T00:00:00.000Z");
  assert.equal(leap2024.nextStart.toISOString(), "2024-04-01T00:00:00.000Z");

  const leap2028 = getQuarterWindow(new Date("2028-02-29T00:00:00.000Z"));
  assert.equal(leap2028.start.toISOString(), "2028-01-01T00:00:00.000Z");
  assert.equal(leap2028.nextStart.toISOString(), "2028-04-01T00:00:00.000Z");
});

test("formatQuarterLimitMessage and OPEN_PLEDGE_LIMIT_MESSAGE format exact UTC strings", () => {
  const { nextStart } = getQuarterWindow(new Date("2026-11-15T12:00:00.000Z"));
  assert.equal(formatUtcQuarterDate(nextStart), "1 January 2027");
  assert.equal(
    formatQuarterLimitMessage(nextStart),
    "Your investor class allows one campaign per quarter. You can invest again from 1 January 2027 (UTC)."
  );
  assert.equal(OPEN_PLEDGE_LIMIT_CODE, "OPEN_PLEDGE_LIMIT");
  assert.equal(QUARTER_LIMIT_CODE, "QUARTER_LIMIT");
  assert.equal(
    OPEN_PLEDGE_LIMIT_MESSAGE,
    "Your investor class allows one open pledge at a time. You can pledge again after your current pledge is allocated or closed."
  );
});

test("mapPledgeInsertError maps Postgres 23505 unique index violations to friendly messages", () => {
  const openErr = mapPledgeInsertError(
    {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "uniq_class10_one_active_pledge"',
    },
    new Date("2026-10-19T12:00:00.000Z")
  );
  assert.equal(openErr.code, "OPEN_PLEDGE_LIMIT");
  assert.equal(openErr.message, OPEN_PLEDGE_LIMIT_MESSAGE);

  const quarterErr = mapPledgeInsertError(
    {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "uniq_class9_10_one_pledge_per_quarter"',
    },
    new Date("2026-10-19T12:00:00.000Z")
  );
  assert.equal(quarterErr.code, "QUARTER_LIMIT");
  assert.equal(
    quarterErr.message,
    "Your investor class allows one campaign per quarter. You can invest again from 1 January 2027 (UTC)."
  );

  const genericErr = mapPledgeInsertError({
    code: "23505",
    message: 'duplicate key value violates unique constraint "some_other_index"',
  });
  assert.equal(genericErr.code, "PLEDGE_INSERT_FAILED");
});
