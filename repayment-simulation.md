# Repayment Simulation Engine — Architecture & Technical Guide (`repayment-simulation.md`)

> **Comprehensive reference documentation for the multi-contract Sharia repayment simulation engine across Murabaha, Ijara, Mudarabah, and SPV Equity.**

---

## Table of Contents

1. [Executive Overview & Simulation Boundaries](#1-executive-overview--simulation-boundaries)
2. [Database Schema & Security Architecture](#2-database-schema--security-architecture)
3. [Pure Calculation Engine (`lib/repayments/calc.js`)](#3-pure-calculation-engine)
4. [Fund Release Engine & CLI Tooling](#4-fund-release-engine--cli-tooling)
5. [Issuer Actions & Execution Safeguards](#5-issuer-actions--execution-safeguards)
6. [Investor Portal & Portfolio Visualization](#6-investor-portal--portfolio-visualization)
7. [Decisions for Sharia Reviewer Confirmation](#7-decisions-for-sharia-reviewer-confirmation)
8. [Future Production Migration Path](#8-future-production-migration-path)
9. [Manual Testing Walkthrough & SQL Queries](#9-manual-testing-walkthrough--sql-queries)

---

## 1. Executive Overview & Simulation Boundaries

The Repayment Simulation Engine provides a realistic, high-fidelity lifecycle for Sharia investment distributions across all four contract structures offered on the platform (`murabaha`, `ijara`, `mudarabah`, `spv_equity`).

### What Is Simulated vs. What Is NOT Simulated

| Domain | In the Simulation | Out of Scope / Real Production Behavior |
| :--- | :--- | :--- |
| **Cash Transfer** | **Simulated**: A payment marks repayment rows as `'paid'` and records a simulated bank reference (`SIM-0001-0012-PRO`). | **No real money moves**: No actual banking rails (WPS/SWIFT/SEPA) or custody transfers are initiated. |
| **Investor Wallet** | **Untouched by design**: Wallet balances are strictly used for initial pledging and refunds; wallet has no withdrawal rails. | No wallet deductions or credits occur during repayments. |
| **Investor Bank Details** | **Real Decryption & Masking**: The investor's encrypted IBAN is decrypted server-side with AES-256-GCM and masked to the last 4 characters (`bank_last4`). | Decrypted values are never logged or stored in plaintext. |
| **Missing Bank Account** | **Realistic Failure**: If an investor has no bank account on file, their repayment row is marked `'failed'` with `failure_reason = 'No bank account on file'`. | The issuer cannot fix investor details and receives an aggregate failure notice with retry capability. |
| **Profit Disclosures** | **Automated Acceptance**: Mudarabah periodic profit reports, Ijara third-party sale proceeds, and SPV Equity dividends are accepted upon issuer submission. | In production, an external Sharia auditor or fund administrator reviews and ratifies the audit report before disbursement. |
| **Equity Conversions** | **Independent Holdings**: Converted units stopping Sukuk cash distributions is **not** simulated in this version. | In production, conversion execution permanently redeems Sukuk units into SPV shares. |
| **Investor Notifications** | **Live In-App Notifications**: Real notifications (`type: 'repayment'`) are inserted in bulk for each paid investor and deep-linked to the Portfolio page. | Distribution statement PDFs and Make webhooks are out of scope. |

---

## 2. Database Schema & Security Architecture

The simulation engine runs on two core relational tables created in [`repayment_simulation.sql`](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/repayment_simulation.sql) and an atomic PL/pgSQL RPC function.

### A. Table: `payout_periods`
Represents one distribution period or milestone reporting event for a project:

```sql
CREATE TABLE public.payout_periods (
  id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id              bigint NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_no               integer NOT NULL CHECK (period_no > 0),
  kind                    text NOT NULL CHECK (kind IN ('profit','rent','profit_share','dividend','exit')),
  due_date                timestamptz,
  status                  text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','reported','paid')),
  is_final                boolean NOT NULL DEFAULT false,
  reported_amount         numeric(18,2) CHECK (reported_amount IS NULL OR reported_amount >= 0),
  capital_return_percent  numeric(5,2) CHECK (capital_return_percent IS NULL OR (capital_return_percent >= 0 AND capital_return_percent <= 100)),
  notes                   text,
  reported_at             timestamptz,
  reported_by             text,
  total_paid              numeric(18,2),
  paid_at                 timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, period_no)
);
```

### B. Table: `repayments`
Represents the individual cash distribution line item for each investor holding:

```sql
CREATE TABLE public.repayments (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payout_period_id   bigint NOT NULL REFERENCES public.payout_periods(id) ON DELETE CASCADE,
  pledge_id          bigint NOT NULL REFERENCES public.pledges(id),
  investor_id        bigint NOT NULL REFERENCES public.investors(id),
  type               text NOT NULL CHECK (type IN ('profit','principal','rent','dividend','capital_return','sale_proceeds')),
  amount             numeric(18,2) NOT NULL CHECK (amount >= 0),
  status             text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','processing','paid','failed')),
  paid_at            timestamptz,
  payment_reference  text,
  bank_last4         text,
  failure_reason     text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payout_period_id, pledge_id, type)
);
```

### C. Row-Level Security (RLS) & Issuer Privacy Shield
- **Clients have `SELECT` access only**: All database writes (`INSERT`, `UPDATE`, `DELETE`) happen server-side via `SUPABASE_SERVICE_KEY`.
- **Investor Access**: Investors can read their own repayments (`WHERE investor_id = current_investor_id()`).
- **Issuer Privacy Shield**: Issuers have **no RLS access** to the `repayments` table. Issuers view period totals and recipient counts only via the server action [`getProjectRepaymentPeriods(projectId)`](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/app/actions/repayments.js). Individual investor names, holdings, and account numbers are strictly protected.

### D. Why `apply_payout_period` is an Atomic RPC
Payment execution must be transactional:
1. It updates candidate `repayments` rows to `'paid'` or `'failed'` with `bank_last4` and reference codes using `ON CONFLICT (payout_period_id, pledge_id, type) DO UPDATE`.
2. It aggregates `total_paid` and verifies whether all rows succeeded.
3. If all rows succeeded, `payout_periods.status` transitions to `'paid'`.
4. If this was the final period (`is_final = true`), it sets `pledges.redeemed_at = now()`, transitions pledges to `'completed'`, and transitions `projects.status = 'completed'`.
Executing this in a single atomic SQL transaction prevents partial payout states during server restarts.

---

## 3. Pure Calculation Engine (`lib/repayments/calc.js`)

All mathematical logic is encapsulated in [`lib/repayments/calc.js`](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/lib/repayments/calc.js). It has **zero database dependencies**, no aliased path imports, and is unit tested using Node.js's native test runner (`npm run test:repayments`).

### Financial Rounding & Calendar Clamping Rules
- **2-Decimal Rounding (`round2`)**: Standard half-up rounding (`Math.round((x + Number.EPSILON) * 100) / 100`).
- **Rounding Remainder**: When an aggregate amount is split across multiple periods, the sum of rounded values is compared to the total, and the rounding remainder is placed in the **final period**.
- **UTC Month-End Clamping (`addMonths(date, n)`)**: Prevents month-skipping on short months:
  $$\text{31 Jan 2026} + 1 \text{ month} \longrightarrow \text{28 Feb 2026 (UTC)}$$

### Mathematical Formulas by Sharia Contract Type

#### 1. Murabaha
- **Profit Formula**:
  $$\text{profit} = \text{round2}\left(\text{allocated\_amount} \times \frac{\text{expected\_roi\_percent}}{100} \times \frac{\text{monthsPerPeriod}}{12}\right)$$
  *(Calculated flat on the original allocated principal for each period).*
- **Principal Repayment**:
  - `with_instalments`: Principal is split equally across all $N$ periods, with rounding adjustments assigned to the final period.
  - `at_maturity`: Principal repayment is zero in periods $1 \dots N-1$, and $100\%$ allocated principal is disbursed in period $N$.

#### 2. Ijara (Islamic Lease)
- **Rental Payout**:
  $$\text{rent} = \text{round2}\left(\text{allocated\_amount} \times \frac{\text{expected\_roi\_percent}}{100} \times \frac{\text{monthsPerPeriod}}{12}\right)$$
- **End-of-Term Asset Settlement (Final Period)**:
  - `sale_to_issuer`:
    $$\text{sale\_proceeds} = \text{round2}\left(\text{end\_of\_term\_price} \times \frac{\text{allocated\_amount}}{\text{total\_allocated}}\right)$$
  - `sale_to_third_party`: Calculated once the issuer reports the actual realized sale proceeds:
    $$\text{sale\_proceeds} = \text{round2}\left(\text{reported\_amount} \times \frac{\text{allocated\_amount}}{\text{total\_allocated}}\right)$$

#### 3. Mudarabah (Profit-Sharing Partnership)
- **Periodic Profit Pool**:
  $$\text{investor\_pool} = \text{round2}\left(\text{reported\_amount} \times \frac{\text{investor\_profit\_share\_percent}}{100}\right)$$
  Each holding receives:
  $$\text{holding\_profit} = \text{distributeProRata}(\text{investor\_pool}, \text{holdings}, \text{"allocated\_amount"})$$
  *(Note: Investor class does not alter the Sharia profit ratio).*
- **Final Period Capital Return**:
  $$\text{capital\_return} = \text{round2}\left(\text{allocated\_amount} \times \frac{\text{capital\_return\_percent}}{100}\right)$$
  *(Default is $100\%$; can be reduced in the simulation to demonstrate capital impairment).*

#### 4. SPV Equity
- **Periodic Dividend / Final Exit Distribution**:
  $$\text{holding\_payout} = \text{distributeProRata}(\text{reported\_amount}, \text{holdings}, \text{"allocated\_units"})$$
  - Kind `'dividend'` produces repayment type `'dividend'`.
  - Kind `'exit'` produces repayment type `'sale_proceeds'`.

---

## 4. Fund Release Engine & CLI Tooling

Fund release is the transition point where escrowed capital is disbursed to the issuer and distribution schedules activate.

### Core Release Function: `lib/repayments/release.js`
The function `releaseFunds(projectId)` executes in an idempotent, crash-safe sequence:
1. **Validation**: Verifies project status is `'funded'` and `funds_released_at` is null.
2. **Purge & Generate**: Deletes any partial `payout_periods` for the project. For fixed contracts (`murabaha` and `ijara`), it builds all periods and pre-generates scheduled repayment rows for every active holding. For `mudarabah`, it creates empty reporting periods across the tenor. For `spv_equity`, no periods are created until declared.
3. **Activation**: Atomically sets `projects.funds_released_at = now()`, `projects.maturity_date = addMonths(now(), tenor)`, `projects.status = 'active'`, and transitions all allocated pledges to `'active'`.

### CLI Simulation Scripts (`scripts/simulation/`)
All CLI scripts require the environment flag `ALLOW_SIM=true` to prevent accidental execution against live production environments.

- **`node scripts/simulation/release.js --project=<ID>`**: Releases funds, activates the project, and initializes the schedule.
- **`node scripts/simulation/advance.js --project=<ID>`**: Advances the `due_date` of the next unpaid period to `now()` so developers do not have to wait months for periods to become due.
- **`node scripts/simulation/reset.js --project=<ID>`**: Deletes periods and repayment rows, resets project status back to `'funded'`, and reverts pledges to `'allocated'`.
- **`node scripts/simulation/status.js --project=<ID>`**: Inspects and prints period statuses, scheduled amounts, and paid totals.

---

## 5. Issuer Actions & Execution Safeguards

All issuer interactions are handled via server actions in [`app/actions/repayments.js`](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/app/actions/repayments.js).

### The Pay Flow Step-by-Step
1. **Ownership & Project Validation**: Authenticates Clerk user, verifies organization membership, and ensures the signed-in issuer owns `project_id`. Re-fetches the project server-side to ensure status is `'active'`.
2. **Sequential Ordering Invariant**: Period $K$ can only be reported or paid if all earlier periods $1 \dots K-1$ are in `'paid'` status.
3. **Server-Side Preview**: The client never calculates payout totals. Before opening the payment confirmation dialog, the UI calls `previewPeriodPayout(periodId)` to compute the total cash and recipient count server-side.
4. **Bank Account Decryption & Masking**:
   - The engine loads the investor's JSONB `bank_details`.
   - If an encrypted IBAN exists, it decrypts it using AES-256-GCM via `decrypt()` in [`app/utils/crypto.js`](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/app/utils/crypto.js).
   - It extracts the last 4 characters (`bank_last4`) and discards the decrypted value immediately.
   - If no valid bank account or IBAN exists, the row status is set to `'failed'` with `failure_reason = 'No bank account on file'`.
5. **Idempotency & Double-Click Protection**:
   - The unique database constraint `UNIQUE (payout_period_id, pledge_id, type)` guarantees a payment line cannot be duplicated.
   - A second click on an already paid period returns `{ already_paid: true }` without executing SQL mutations.
6. **Retry Mechanism**:
   - When a period has failed rows, the issuer can click **"Retry failed"**.
   - The engine queries existing rows, filters out already paid lines, and re-evaluates the failed lines (e.g., after the investor updates their bank profile).
7. **Zero-Profit Periods**:
   - A Mudarabah cycle with zero profit still goes through `payPeriod`. The RPC marks the period `'paid'` with `total_paid = 0` and zero rows.
8. **Asynchronous Investor Notifications**:
   - Upon successful RPC execution, bulk notifications (`type: 'repayment'`) are inserted into `notifications` for all paid investors. Notification insertion never blocks or rolls back the financial RPC.

---

## 6. Investor Portal & Portfolio Visualization

### Investor Portfolio Page (`/investor-portal/portfolio`)
The placeholder panel has been replaced with [`RepaymentsPanel.jsx`](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/components/portfolio/RepaymentsPanel.jsx):
1. **Summary Metric Strip**:
   - **Received to Date**: Total cash received from realized payouts.
   - **Expected Remaining**: Contractual principal and profit remaining (fixed contracts only; dashes for variable contracts).
   - **Next Payment**: Amount and date for fixed contracts, or `"Next profit report due {date}"` for Mudarabah.
2. **Monthly Realized Receipts Bar Chart**:
   - Visualizes payments received per UTC calendar month.
   - Screen-reader accessible data table (`<table className="sr-only">`) with semantic headers and scope attributes.
3. **Cumulative Received vs. Expected Line Chart**:
   - Visualizes target amortization schedule vs. realized cash receipts for Murabaha and Ijara holdings.
   - Includes full screen-reader data table. Displays an informative guidance message for variable-return portfolios.

### My Investments Page (`/investor-portal/investments`)
Holding cards in [`MyInvestmentsClient.jsx`](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/app/investor-portal/%28protected%29/investments/MyInvestmentsClient.jsx) render:
- **Status Badge**: Supports `'Active'` (emerald) and `'Completed'` (purple).
- **Repayment Details Strip**: Displays **"Received so far"** and **"Next payment"** (or profit reporting milestone date).

---

## 7. Decisions for Sharia Reviewer Confirmation

When presenting this prototype to the Sharia board or compliance reviewer, verify the following design decisions:

1. **Flat Murabaha Profit Calculation**:
   - *Current Implementation*: Profit per period is calculated as:
     $$\text{profit} = \text{allocated\_amount} \times \frac{\text{expected\_roi\_percent}}{100} \times \frac{\text{monthsPerPeriod}}{12}$$
     This applies a constant flat profit rate across all periods based on the original investment amount, even when principal is amortized in installments (`with_instalments`).
   - *Alternative*: Declining balance profit rate where periodic profit reduces as principal is repaid.
   - *Recommendation*: Confirm whether the flat profit convention conforms to the specific Murabaha fatwa adopted by the platform.

2. **Mudarabah Capital Impairment (Loss Sharing)**:
   - *Current Implementation*: In the final period, the issuer specifies `capital_return_percent` (default $100\%$). If a business loss occurs without negligence (*ta'addi* or *tafrit*), the capital return can be less than $100\%$, allocating the capital loss to the Rabb-ul-Mal (investors).
   - *Recommendation*: Confirm whether administrative documentation or an independent auditor's report is mandatory before allowing an issuer to report a capital loss percentage below $100\%$.

---

## 8. Future Production Migration Path

When upgrading from the simulation to live banking and custody execution:

```
[Current Simulation Flow]
Issuer clicks "Pay" ──► payPeriod() ──► decrypts bank last4 ──► apply_payout_period RPC ──► status: 'paid'

[Future Production Flow]
Issuer clicks "Pay" ──► initiatePayoutBatch() ──► status: 'processing'
                                                      │
                                                      ▼
                                       Banking API (WPS / Custody Vault)
                                                      │
                                    Bank Webhook (/api/webhooks/banking)
                                                      │
                                                      ▼
                                        apply_payout_period RPC ──► status: 'paid'
```

1. **Transition to Asynchronous Processing**:
   - `repayments.status` and `payout_periods.status` will transition to `'processing'` upon authorization.
   - Live bank execution will be submitted via an institutional custody or banking API.
2. **Webhook Settlement**:
   - An inbound webhook route (`/api/webhooks/banking`) receives the clearing confirmation from the bank.
   - Upon receiving the transfer reference, the webhook calls `apply_payout_period` to mark rows as `'paid'`.
3. **Wallet Unchanged**:
   - The investor wallet architecture remains unchanged because distributions are credited directly to investor bank accounts.

---

## 9. Manual Testing Walkthrough & SQL Queries

### Step-by-Step Test Procedure

#### Step 1: Fund & Release a Project
Select a funded project (e.g., project `12`):
```bash
ALLOW_SIM=true node scripts/simulation/release.js --project=12
```
*Expected Console Output*:
```
[RELEASE] Releasing funds for project 12...
[RELEASE] Deleted existing payout periods.
[RELEASE] Created 4 payout periods and scheduled repayment rows.
[RELEASE] Project 12 activated successfully. Maturity date: 2027-10-25.
```

#### Step 2: Verify in Supabase SQL Editor
```sql
SELECT id, status, funds_released_at, maturity_date FROM public.projects WHERE id = 12;
SELECT period_no, kind, status, due_date FROM public.payout_periods WHERE project_id = 12 ORDER BY period_no;
SELECT count(*), status, sum(amount) FROM public.repayments WHERE payout_period_id IN (SELECT id FROM public.payout_periods WHERE project_id = 12) GROUP BY status;
```

#### Step 3: Advance the Due Date
To simulate time passing without waiting months:
```bash
ALLOW_SIM=true node scripts/simulation/advance.js --project=12
```

#### Step 4: Pay Period in Issuer Portal
1. Navigate to `/issuer-portal/projects/<slug>/manage`.
2. Click the **"Repayments"** tab.
3. Observe Period 1 in `'Scheduled'` or `'Reported'` status.
4. Click **"Pay investors"**.
5. Verify the modal displays: *"Simulated payment, no money moves. This will mark {total} as paid across {count} investors."*
6. Click **"Confirm & Pay"**.
7. Observe row status transition to **"Paid"** with checkmark and payment date.

#### Step 5: Check Investor Portfolio & Notification
1. Sign in as an investor who pledged to project `12`.
2. Open `/investor-portal/notifications`:
   - Verify notification: *"Payment received: AED ... for {Project Title}"*.
   - Click **"View in Portfolio"**.
3. On `/investor-portal/portfolio`:
   - Verify **"Received to Date"** reflects the payment.
   - Verify **"Payments Received per Month"** bar chart has plotted the monthly bucket.
   - Verify **"Cumulative Received vs Expected"** line chart displays realized cash line.
4. On `/investor-portal/investments`:
   - Verify holding card shows **"Received so far"** and **"Next payment"**.

#### Step 6: Test Reset
```bash
ALLOW_SIM=true node scripts/simulation/reset.js --project=12
```
*Expected SQL Result*:
```sql
SELECT count(*) FROM public.payout_periods WHERE project_id = 12; -- 0
SELECT status, funds_released_at FROM public.projects WHERE id = 12; -- 'funded', NULL
```

---

## Related Documentation Links
- [Campaign Closing System Documentation](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/project-closing.md)
- [Investor Portfolio Page Architecture](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/portfolio-page.md)
