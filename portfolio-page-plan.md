# Investor Portfolio Page — Metrics & Visualization Plan

## Core principle

The four Sharia contract types genuinely behave differently as investments —
Murabaha and Ijara pay a fixed, known rate; Mudarabah pays a variable share of
actual profit; SPV Equity pays nothing periodic at all and only realizes value
at exit. A single blended "expected return" number across a mixed portfolio
would misrepresent all four. Every return-related metric below is segmented by
contract type rather than shown as one blended figure — this is the design
decision the rest of this plan follows from.

Two real data dependencies this plan assumes, flagged here rather than
silently assumed:

- A **payouts/distributions table** (referenced conceptually earlier in this
  build, `pledge_id`, `amount`, `period`, `distribution_date`) — several
  metrics below need actual payout history, not just pledge data.
- **`spv_valuations`** (designed earlier for conversion tracking) — equity
  value metrics need at least one recorded valuation to show anything beyond
  "at cost."

One open schema gap worth resolving before building the fixed-return
projections below: there's currently no **maturity/redemption date** distinct
from `campaign_end_date` (which marks funding close, not investment maturity).
"Expected total return by maturity" can't be computed without this — worth
deciding whether it lives on `projects` or on the holding itself.

---

## 1. Top summary bar (always visible, contract-type agnostic)

| Metric                         | Source                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Total capital deployed         | `SUM(allocated_amount)` where status IN (allocated, active, completed)                                           |
| Pending (awaiting allocation)  | `SUM(pledged_amount)` where status = pending — kept separate, since this money could still be partially rejected |
| Total returns received to date | `SUM(distributions.amount)` across all holdings                                                                  |
| Total fees paid                | `SUM(fee_amount)` across all pledges — transparency metric                                                       |
| Active positions               | Count of pledges with status IN (allocated, active)                                                              |
| Projects invested in           | `COUNT(DISTINCT project_id)`                                                                                     |

---

## 2. Portfolio allocation by contract type

**Chart: donut or stacked bar.** Percentage of total capital deployed in
Murabaha vs. Mudarabah vs. Ijara vs. SPV Equity. This is the single most
important chart on the page — it's the risk-profile summary at a glance, and
it's what determines which of the sections below are even relevant to a given
investor (someone with no equity holdings doesn't need to see the equity
section at all).

---

## 3. Returns tracking — split by contract type, not shown as one chart

### Murabaha & Ijara (fixed-rate types)

**Chart: "Expected vs. received" progress bar or bullet chart**, per holding
or aggregated. Projected total return (from `expected_roi_percent` and the
still-missing maturity date) compared against actual distributions received
so far. These are the two contract types where a projection is honest to show,
since the rate is fixed at issuance.

### Mudarabah (profit-sharing)

**Chart: distribution history, bar chart over time.** No fixed projection
exists to compare against — showing an "expected" line here would misrepresent
a variable-profit instrument. Instead, show actual period-by-period payouts
received, so the investor sees real performance trend rather than a promise.

### SPV Equity

**Not shown alongside the two return charts above at all — a different
metric entirely: unrealized gain/loss.**

- Current estimated value = `latest spv_valuations.price_per_share × units_held`
- Compared against original principal invested
- If no valuation has been recorded yet for that SPV, show "at cost" rather
  than fabricating a current value
- Note: dividends are possible but irregular for equity holdings — if any
  have been paid, list them separately as a small secondary line, not blended
  into the unrealized gain/loss figure

---

## 4. Conversion tracking (only shown to Class 1–4 investors holding conversion-enabled positions)

- **Trigger progress bar**: current share price (latest `spv_valuations`
  entry) vs. the project's `conversion_trigger_value` — e.g. "AED 7.20 of AED
  10.00 target." This is a genuinely useful visual specifically because it's
  the one number an investor is actively watching.
- **Conversion eligibility summary**: `conversion_eligible_units` for this
  holding, and what portion of the total pledge that represents (recall the
  per-class cap and shared-pool mechanics from earlier — this number may be
  less than their full holding).
- **Already-converted holdings**: shown distinctly from cash Sukuk holdings,
  with share count and current estimated value based on the latest valuation
  — these behave like equity from this point forward, not like Sukuk anymore.

---

## 5. Pledge status breakdown

**Chart: small bar or donut.** Count of pledges by status (pending / allocated
/ active / completed / cancelled / refunded). Useful specifically because
`pending` pledges are still at risk of partial or full rejection under
oversubscription — this chart makes that risk visible rather than implying
every pledge is a done deal.

---

## 6. Capital deployed over time

**Chart: cumulative line chart.** Running total of capital committed, plotted
against `pledged_at` dates. Shows growth trajectory of the investor's activity
on the platform — more of a "here's your journey" chart than a financial
performance one, but useful for an investor with a long history on the
platform to see at a glance.

---

## 7. What NOT to duplicate here

A detailed per-project list (project name, individual amounts, individual
statuses) belongs on **My Investments**, not Portfolio — per the earlier
sidebar design, these two pages are deliberately different views of the same
underlying data: My Investments is the list, Portfolio is the aggregate. Avoid
rebuilding a full holdings table on this page; link out to My Investments for
that instead.

Current `investor_class` and fee rate belong on **Account**, not here — this
page is about performance and allocation, not identity/status information.
