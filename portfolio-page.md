# Investor Portfolio Page Specification & Architecture (`portfolio-page.md`)

This document describes the design, architecture, data flow, calculations, accessibility implementation, and test procedures for the **Investor Portfolio** page (`/investor-portal/portfolio`).

---

## 1. Purpose of the Page & Distinction from "My Investments"

The platform separates portfolio analytics from pledge management:
- **My Investments (`/investor-portal/investments`)**: A tactical, card-based management dashboard. Investors review submitted pledges, view transaction fees, download executed subscription agreements, monitor individual campaign progress, and inspect live conversion clause rights.
- **Portfolio (`/investor-portal/portfolio`)**: A strategic, analytical overview. It presents high-level long-term totals, asset concentration, Sharia contract distributions, cumulative capital deployment over time, historical allocation success rates, and reserved equity conversion exposure. It is informational and does **not** duplicate individual pledge cards.

---

## 2. Security Architecture & Query Pattern

The Portfolio page follows the platform's standard protected data access and integer foreign key resolution conventions:
1. **Server-Side Authentication & Int8 ID Resolution**: Data fetching is executed via `getInvestorPortfolioPledges()` (`app/actions/investor-portal.js`). The session is verified server-side with Clerk's `auth()`.
2. **Integer Primary & Foreign Key Resolution**: In accordance with the platform's schema rules, relational keys (`investor_id`, `project_id`, `pledges.id`) are `bigint` (`int8`). The function resolves the investor's internal integer primary key (`investors.id`) where `investors.user_id = clerkUserId` (or `org_id = clerkOrgId`) before querying `pledges`.
3. **Prevention of UUID Casting Crashes**: Supabase's default `auth.uid()` function casts the JWT `sub` claim to `uuid`. Because Clerk IDs are text strings (`user_...`), direct client-side PostgREST queries evaluate `auth.uid()::uuid` and fail with `invalid input syntax for type uuid`. The server action queries `pledges` with `supabaseAdmin` filtered strictly by the resolved integer `investor_id`, eliminating UUID type errors and preventing data leakage.
4. **Vague Frontend Error Sanitization**: Technical database exceptions and sensitive user/clerk IDs are logged to server console only. The frontend UI (`PortfolioError.jsx`) renders a generic, user-safe message: *"Unable to load your investment positions at this time. Please try again or refresh the page."*
5. **No Database Writes**: The page performs zero mutations (`INSERT`, `UPDATE`, `DELETE`, or RPC calls). It is strictly read-only.
6. **Single Unified Query**:
   ```javascript
   const { data, error } = await supabaseAdmin
     .from("pledges")
     .select(`
       id,
       status,
       pledged_amount,
       allocated_amount,
       allocated_units,
       allocated_at,
       pledged_at,
       conversion_eligible_units,
       investor_class_at_pledge,
       project_id,
       projects (
         title,
         slug,
         sharia_contract_type,
         currency,
         status
       )
     `)
     .eq("investor_id", investorId)
     .order("pledged_at", { ascending: false });
   ```

---

## 3. Status Definitions & Inclusions

| Status | Category | Included In | Notes |
| :--- | :--- | :--- | :--- |
| `'allocated'` | Active Holding | Summary Strip (Invested, Holdings, Largest), Contract Type Doughnut, Project Bar, Capital Over Time Bar, Outcomes, Conversion Exposure | Represents active capital deployed. Measured strictly at `allocated_amount` (which may be less than `pledged_amount` on partial fills). |
| `'active'` | Active Holding | Same as `'allocated'` | Post-allocation active holding lifecycle state. |
| `'completed'` | Active Holding | Same as `'allocated'` | Matured / fully completed holding position. |
| `'pending'` | Awaiting Allocation | Summary Strip ("Awaiting allocation" only) | Represents commitments in campaigns that have not yet closed. **Excluded** from Total Invested and all charts. |
| `'rejected_oversubscribed'` | Closed / Inactive | Pledge Outcomes Card only | Pledge rejected due to campaign oversubscription. **Excluded** from all invested totals and distribution charts. |
| `'refunded'` | Closed / Inactive | Pledge Outcomes Card only | Pledge refunded due to soft cap failure or late submission. **Excluded** from all invested totals and distribution charts. |
| `'cancelled'` | Void | Excluded from everything | Cancelled pledges are completely omitted from all summaries and charts. |

---

## 4. Page Layout & Component Specifications

### 4.1 Summary Strip (`components/portfolio/SummaryStrip.jsx`)
Four high-level metrics displayed in responsive metric cards:
1. **Total Invested**:
   $$\text{Total Invested} = \sum_{\text{holdings}} \text{allocated\_amount}$$
2. **Awaiting Allocation**:
   $$\text{Awaiting Allocation} = \sum_{\text{pending}} \text{pledged\_amount}$$
3. **Holdings Count**:
   $$\text{Holdings} = \operatorname{count}(\text{holdings})$$
4. **Largest Holding Share**:
   $$\text{Concentration} = \left(\frac{\max_{\text{holdings}}(\text{allocated\_amount})}{\text{Total Invested}}\right) \times 100 \quad (\text{rounded to 1 decimal place})$$
   *(If $\text{Total Invested} = 0$, concentration displays $0.0\%$)*.

### 4.2 Allocation by Contract Type (`components/portfolio/ContractTypeDoughnut.jsx`)
- **Visual**: Chart.js Doughnut (`cutout: '68%'`).
- **Data**: Groups holdings by `projects.sharia_contract_type`. Formats labels as Murabaha, Ijara, Mudarabah, SPV Equity.
- **Tooltip**: Displays contract name, currency, formatted amount, and portfolio share:
  `Ijara: AED 30,000 (30.0%)`
- **Legend**: Displays contract names with percentages alongside point markers.

### 4.3 Allocation by Project (`components/portfolio/ProjectHorizontalBar.jsx`)
- **Visual**: Chart.js Horizontal Bar (`indexAxis: 'y'`).
- **Data**: Aggregates holdings per project, sorting descending by `allocated_amount`.
- **Top 8 + Other Rule**: The top 8 projects are shown individually. All remaining positions (9th and below) are summed into an `"Other"` bar so the chart stays legible regardless of portfolio size.
- **Ties**: Deterministic tie-breaking by project title alphabetically.
- **Tooltip**: Displays full, un-truncated project title, allocated amount, and percentage.

### 4.4 Capital Invested Over Time (`components/portfolio/CapitalOverTimeBar.jsx`)
- **Visual**: Chart.js Vertical Bar.
- **Timeline**: Buckets capital by UTC month of `allocated_at` (falls back to `pledged_at` if `allocated_at` is null on older rows).
- **Continuous Axis**: Spans continuously from the earliest holding month to the latest holding month. Intermediate months with zero investments are populated with `0` so the timeline has no temporal skips.
- **Axis Label**: Explicitly labeled `Timeline (UTC)`.

### 4.5 Pledge Outcomes (`components/portfolio/PledgeOutcomesCard.jsx`)
- **Visual**: 4 categorized metric tiles:
  - **Fully Allocated**: `allocated_amount >= pledged_amount`
  - **Partly Allocated**: `0 < allocated_amount < pledged_amount`
  - **Not Allocated**: `rejected_oversubscribed`
  - **Refunded**: `refunded`
- **Mandatory Footnote**:
  > *"Pledges are requests. When a campaign closes, allocation is by investor class, then amount, then time."*

### 4.6 Conversion Exposure (`components/portfolio/ConversionExposureCard.jsx`)
- **Conditional Rendering**: Renders **only** if the investor has at least one active holding with `conversion_eligible_units > 0`.
- **Contents**: Total reserved conversion units across all holdings, with horizontal bar indicators per project showing allocated Sukuk units and conversion rights.
- **Mandatory Footnote**:
  > *"Reserved units are not guaranteed to convert."*

### 4.7 Repayments & Distributions Panel (`components/portfolio/RepaymentsPanel.jsx`)
- **Informational Placeholder**:
  > *"Repayment details will appear here once your projects are funded and released."*
- **Constraint**: No estimated returns, profit percentages, maturity dates, or synthetic zeros are rendered.

---

## 5. Currency Handling Rule

The platform primarily operates in **AED**. However, if an investor's holdings span multiple currencies:
1. Amounts are **never** added across different currencies without an exchange rate.
2. A prominent multi-currency warning banner appears above the summary strip.
3. The banner provides a clean breakdown of Total Invested and Awaiting Allocation segregated per currency.

---

## 6. What Is NOT Shown and Why

- **Fees & Refunds**: Fees are transaction expenses paid at commitment, and refunds are cash returned to the wallet. They are tracked on My Investments and My Wallet, not as invested assets.
- **Profit / Returns / Performance**: Financial performance metrics (IRR, actual profit generated) depend on operational reporting from issuers after fund release. Displaying estimated yields before distribution would violate regulatory transparency.
- **Repayment Schedules & Valuations**: Post-closing repayment schedules and SPV asset valuations will be introduced in a future release once issuer escrow milestones are released.

---

## 7. Future Repayments Architecture

When repayments are enabled, the platform will introduce a `public.repayment_schedules` table populated upon campaign fund release:
- Each repayment installment will be split pro-rata across holdings based on `pledges.allocated_amount`.
- A dedicated schedule engine will feed:
  1. **Total Received**: Sum of settled distributions.
  2. **Next Upcoming Payment**: Next scheduled distribution date and amount.
  3. **Distribution Timeline Chart**: Calendar projection of principal redemptions and Sharia profit payouts.

---

## 8. Accessibility (a11y) Implementation

1. **Screen-Reader Data Tables**: Every chart container contains an accessible `<table className="sr-only">` with a descriptive `<caption>`, column headers (`<th scope="col">`), and data rows reflecting the exact figures plotted in the chart.
2. **ARIA Region Landmarks**: Each chart card is wrapped in a `<div role="region" aria-label="[Chart Description]">`.
3. **Contrast & Color-Independence**: Data is not conveyed by color alone. Legends, direct labels, tooltips, and screen-reader tables present numeric figures and percentages textually.

---

## 9. Empty, Loading, and Error States

- **Loading**: Rendered by `PortfolioSkeleton.jsx` using responsive shimmering skeleton cards matching the page layout.
- **Fetch Error**: Rendered by `PortfolioError.jsx` with an accessible alert banner and a `Retry` button that triggers a re-fetch.
- **Empty Portfolio**: If an investor has no holdings, no pending pledges, and no closed outcomes, the charts are hidden and a clean welcome state is shown with a button directing them to `/investor-portal/marketplace`.
- **Chart Empty State**: If an investor has holdings but a specific chart has no data points, that chart renders a minimal `"Not enough data yet"` card.

---

## 10. Automated Unit Tests

The pure aggregation engine in `lib/portfolio/aggregate.js` is verified by `node:test` in `tests/portfolio/test-portfolio-aggregate.mjs`.

### How to Run:
```bash
npm run test:portfolio
# or directly:
node --test tests/portfolio/test-portfolio-aggregate.mjs
```

### Test Coverage:
1. `buildSummary`: Hand-computed verification of 4 metrics, largest holding share, and single-currency reporting.
2. `byContractType`: Label normalization and 1-decimal percentage calculation.
3. `byProject`: Top 8 sorting, deterministic tie breaking, and `"Other"` grouping.
4. `byMonth`: Continuous UTC timeline filling gap months with 0, and fallback from null `allocated_at` to `pledged_at`.
5. `outcomes`: Categorization of full, partial, oversubscribed, and refunded pledges; exclusion of cancelled.
6. `conversionExposure`: Filtering to holdings where `conversion_eligible_units > 0`.
7. `Mixed Currencies`: Segregated reporting without cross-currency addition.
8. `Empty Pledges`: Safe zeroed responses without throwing runtime errors.

---

## 11. Manual Verification Guide (Tests 1–13)

Follow these steps to verify the Portfolio page interactively:

### Test 1: Investor with no pledges
1. Sign in as a test investor with 0 pledges (or clean test rows).
2. Visit `/investor-portal/portfolio`.
3. **Expected**:
   - Empty state view renders with the message: *"You currently do not have any active holdings or submitted pledges in your portfolio."*
   - "Explore Marketplace" button links to `/investor-portal/marketplace`.
   - All charts are hidden.

### Test 2: One pending pledge only
1. Submit a pledge for AED 5,000 on an open campaign.
2. Visit `/investor-portal/portfolio`.
3. **Expected**:
   - Summary Strip shows: Total Invested = `AED 0`, Awaiting Allocation = `AED 5,000`, Holdings = `0`.
   - Charts render `"Not enough data yet"`.

### Test 3: Closing scenario with a partial fill
1. Create a pledge for AED 2,000 that closes with `allocated_amount = 1,000` (partially allocated).
2. Visit `/investor-portal/portfolio`.
3. **Expected**:
   - Total Invested increments by `AED 1,000` (not 2,000).
   - Pledge Outcomes displays `1` under "Partly Allocated".

### Test 4: Rejected oversubscribed and refunded pledges
1. Create one pledge with `status = 'rejected_oversubscribed'` and one with `status = 'refunded'`.
2. Visit `/investor-portal/portfolio`.
3. **Expected**:
   - Total Invested and Awaiting Allocation remain unaffected.
   - Pledge Outcomes displays `1` under "Not Allocated" and `1` under "Refunded".

### Test 5: Holdings in at least two contract types
1. Hold positions in Murabaha (`AED 60,000`) and Ijara (`AED 40,000`).
2. Visit `/investor-portal/portfolio`.
3. **Expected**:
   - Doughnut displays 60.0% Murabaha and 40.0% Ijara.
   - SQL comparison query:
     ```sql
     SELECT pr.sharia_contract_type, SUM(pl.allocated_amount) AS total,
            ROUND(SUM(pl.allocated_amount) * 100.0 / SUM(SUM(pl.allocated_amount)) OVER (), 1) AS pct
     FROM public.pledges pl
     JOIN public.projects pr ON pr.id = pl.project_id
     WHERE pl.investor_id = <INVESTOR_ID> AND pl.status IN ('allocated', 'active', 'completed')
     GROUP BY pr.sharia_contract_type;
     ```

### Test 6: More than 8 holdings
1. Ensure the investor holds positions across 10 distinct projects.
2. **Expected**:
   - Project bar chart shows top 8 projects sorted by amount.
   - The 9th and 10th projects are combined into an `"Other"` bar.
   - Total of the 8 bars plus `"Other"` equals Total Invested.

### Test 7: Holdings across three different months with a gap
1. Seed holding A in Jan 2026 and holding B in Apr 2026.
2. **Expected**:
   - Capital Invested Over Time renders 4 bars: `Jan 2026 (UTC)`, `Feb 2026 (UTC)`, `Mar 2026 (UTC)`, `Apr 2026 (UTC)`.
   - Feb and Mar bars display `AED 0`.

### Test 8: Class 1–4 investor with conversion units vs. Class 6 investor
1. When signed in as a Class 1–4 investor holding convertible units:
   - "Conversion Exposure" card appears with reserved unit count and project bars.
2. When signed in as a Class 6 investor without conversion units:
   - "Conversion Exposure" card is completely hidden.

### Test 9: Data Isolation / Multi-Tenant RLS
1. Sign in as Investor A and note metrics.
2. Sign in as Investor B.
3. **Expected**: Investor B sees only their own holdings and pledges. Zero data from Investor A is visible.

### Test 10: Mobile responsiveness (375px)
1. Open Chrome DevTools and toggle device mode (iPhone SE, 375px width).
2. **Expected**: No horizontal scrollbar appears. Charts resize smoothly without clipped labels.

### Test 11: Screen-reader accessibility check
1. Inspect the DOM in DevTools.
2. **Expected**: Every chart card contains a `<table className="sr-only">` with a `<caption>` and complete data rows matching the visual charts.

### Test 12: Fetch failure & retry
1. Simulate network failure (e.g., block `/rest/v1/pledges` in DevTools Network tab) and refresh.
2. **Expected**: Inline error message displays with a "Retry" button. Unblocking and clicking "Retry" restores the page.

### Test 13: Zero database writes
1. Open DevTools Network tab and filter by `Fetch/XHR`.
2. Reload `/investor-portal/portfolio`.
3. **Expected**: Only HTTP `GET` requests are sent to Supabase PostgREST. No `POST`, `PATCH`, or `DELETE` requests are dispatched.

---

## 10. Sharia Repayment Simulation & Payout Schedule Integration

The Portfolio page includes the live **Repayments & Sharia Distributions Panel** ([`RepaymentsPanel.jsx`](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/components/portfolio/RepaymentsPanel.jsx)) tracking realized payouts, monthly distributions, and cumulative amortization across Murabaha, Ijara, Mudarabah, and SPV Equity.

For the complete technical specification of the simulation engine, database schema (`payout_periods`, `repayments`), and calculation formulas, see:
- [Repayment Simulation Engine Documentation](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/repayment-simulation.md)

