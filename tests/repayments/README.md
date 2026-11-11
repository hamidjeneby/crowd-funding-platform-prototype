# Repayment Simulation Engine — Testing Guide & Verification Walkthrough

> **Companion guide for running live repayment simulations across all four Sharia contract types (`murabaha`, `ijara`, `mudarabah`, and `spv_equity`).**

---

## 1. Quick Start Overview

| Step | Action | Command / Tool |
| :--- | :--- | :--- |
| **1. Seed Data** | Seed 4 funded test projects in Supabase | Run [`tests/repayments/repayment-test-seed.sql`](repayment-test-seed.sql) in SQL Editor |
| **2. Release Funds** | Release escrow and generate payout schedule | `ALLOW_SIM=true node scripts/simulation/release.js --project=<ID>` |
| **3. Fast-Forward Time** | Make next period due immediately | `ALLOW_SIM=true node scripts/simulation/advance.js --project=<ID>` |
| **4. Execute Payout** | Authorize simulated payment as Issuer | Visit `/issuer-portal/projects/<slug>/manage` → **Repayments** tab |
| **5. Inspect Investor** | Review realized yield and charts | Visit `/investor-portal/portfolio` and `/investor-portal/investments` |
| **6. Cleanup** | Purge all test data | Run [`tests/repayments/repayment-test-cleanup.sql`](repayment-test-cleanup.sql) in SQL Editor |

---

## 2. Step 1: Seeding the Test Projects

1. Open your **Supabase Project Dashboard** → **SQL Editor**.
2. Paste and run the contents of [`tests/repayments/repayment-test-seed.sql`](repayment-test-seed.sql).
3. The script automatically detects your existing issuer and investor accounts, or you can explicitly provide `v_issuer_id` and `v_real_investor_id` at the top of the script.
4. Review the script's output in the **Messages** pane:
   ```
   ==> Seeding Repayment Test Projects using:
       Issuer ID: 1
       Real Investor ID: 1
   ====================================================================
   SUCCESS: 4 Funded Projects created and ready for repayment simulation:
     1. Murabaha   : ID 101 | slug: test-repay-murabaha
     2. Ijara      : ID 102 | slug: test-repay-ijara
     3. Mudarabah  : ID 103 | slug: test-repay-mudarabah
     4. SPV Equity : ID 104 | slug: test-repay-spv-equity
   ====================================================================
   ```
   *(Note down the project IDs returned in your SQL output).*

---

## 3. What to Expect on Relevant Pages (Before Fund Release)

At this stage, all 4 projects are in **`funded`** status (campaign closed successfully, awaiting administrative escrow disbursement).

### A. Issuer Project Management Page (`/issuer-portal/projects/[slug]/manage`)
- Select any of the seeded projects (e.g., `test-repay-murabaha`).
- Click the **"Repayments"** tab.
- **Expected View**:
  - The tab renders an amber notice box:
    > **"Funds have not been released yet."**
    > *"This project has closed successfully and is currently funded in escrow. Once milestone verification and administrative fund release are finalized, repayment schedules and periodic distribution reporting will be generated and displayed here."*
  - No payment buttons or tables are active yet.

### B. Investor "My Investments" Page (`/investor-portal/investments`)
- Sign in as your investor account.
- Click the **"Holdings"** tab.
- **Expected View**:
  - You will see 4 new holding cards for `Test Repayment Murabaha`, `Test Repayment Ijara`, `Test Repayment Mudarabah`, and `Test Repayment SPV Equity`.
  - Status badge: **"Allocated"** (teal/emerald).
  - Allocated Amount: `AED 60,000.00`.
  - Repayments Overview Strip:
    - **Received so far**: `AED 0.00`
    - **Next payment**: `—`

---

## 4. Testing Contract Type 1: Murabaha (Fixed Profit & Installments)

### Step 4.1 — Release Funds
In your terminal, execute the release script using the Murabaha project ID:
```bash
ALLOW_SIM=true node scripts/simulation/release.js --project=<MURABAHA_ID>
```
*Expected Output*:
```
[RELEASE] Releasing funds for project <ID> (murabaha)...
[RELEASE] Created 4 payout periods and scheduled repayment rows.
[RELEASE] Project <ID> activated successfully. Maturity date: 2027-10-25.
```

### Step 4.2 — Advance Period 1 Due Date
Make Period 1 immediately due without waiting 3 months:
```bash
ALLOW_SIM=true node scripts/simulation/advance.js --project=<MURABAHA_ID>
```
*Expected Output*:
```
[ADVANCE] Project <ID> Period 1 due_date advanced to now: ...
```

### Step 4.3 — Issuer Portal Execution
1. Refresh `/issuer-portal/projects/test-repay-murabaha/manage` → **Repayments** tab.
2. **Expected View**:
   - The table renders **4 quarterly periods**.
   - Period 1 status is **"Scheduled"** with a green **"Due now"** label.
   - An active **"Pay investors"** button appears on Period 1.
3. Click **"Pay investors"**:
   - The confirmation modal opens.
   - Notice: *"Simulated payment, no money moves."*
   - Total Amount: `AED 2,000.00` (8% p.a. on 100k for 1 quarter).
   - Eligible Investors: `2 investors` (Real Investor + Secondary Investor).
4. Click **"Confirm & Pay"**:
   - A success banner appears: *"Simulated payment executed successfully: 2 investors paid (AED 2,000.00)."*
   - Period 1 status transitions to **"Paid"** with a green checkmark and timestamp.

### Step 4.4 — Investor Portal Verification
1. Open `/investor-portal/portfolio`:
   - **Summary Strip**:
     - *Received to Date*: Increased by **`AED 1,200.00`** (60% share of 2,000 AED).
     - *Expected Remaining*: Displays remaining contractual cash flow.
     - *Next Payment*: Displays Period 2 amount and due date.
   - **Payments Received per Month Bar Chart**: Displays a bar for the current month showing your realized distribution.
   - **Cumulative Received vs Expected Line Chart**: Plots the target amortization schedule against your realized payment.
2. Open `/investor-portal/investments`:
   - Murabaha card shows:
     - **Received so far**: `AED 1,200.00`
     - **Next payment**: `AED 1,200.00 • <Period 2 Date>`
3. Open `/investor-portal/notifications`:
   - New notification: *"Payment received: AED 1,200.00 for Test Repayment Murabaha"*.
   - Click **"View in Portfolio"** to deep-link directly to your portfolio.

---

## 5. Testing Contract Type 2: Ijara (Rental Yield & Asset Sale)

Ijara Sukuk represents an equipment or property lease. Payout periods distribute quarterly rental yield, while the final period settles the asset outcome according to the contract's `end_of_term` clause.

### The 2 Ijara End-of-Term Variants:
1. **`sale_to_issuer` (Default Seeded)**: The issuer signed a binding unilateral purchase undertaking (`wa'd`) to repurchase the asset at a fixed price (`end_of_term_price`, e.g., AED 100,000.00). The full final amount (`AED 101,500.00` = AED 1,500 rent + AED 100,000 buyback) is pre-scheduled upfront. When Period 4 is due, the issuer directly clicks **"Pay investors"**.
2. **`sale_to_third_party`**: The asset is auctioned or sold on the open market at term completion. Because market sale proceeds cannot be known in advance, Period 4 requires the issuer to click **"Report sale proceeds"**, disclose the gross proceeds realized from the third-party buyer, and then click **"Pay investors"** to disburse the proceeds pro-rata.

---

### Step 5.1 — Release Funds
```bash
ALLOW_SIM=true node scripts/simulation/release.js --project=<IJARA_ID>
```

### Step 5.2 — Advance & Pay Period 1 (Quarter 1 Rent)
1. Advance Period 1 due date to today:
   ```bash
   ALLOW_SIM=true node scripts/simulation/advance.js --project=<IJARA_ID>
   ```
2. In `/issuer-portal/projects/test-repay-ijara/manage` → **Repayments** tab:
   - Period 1 status transitions to **"Scheduled • Due now"**.
   - Click **"Pay investors"** → confirmation modal previews `AED 1,500.00` total across 2 investors.
   - Click **"Confirm & Pay"** → Period 1 is marked **"Paid"** with timestamp.

### Step 5.3 — Advance Through Remaining Periods
To advance and simulate through Periods 2, 3, and 4:
```bash
# Advance Period 2 to now:
ALLOW_SIM=true node scripts/simulation/advance.js --project=<IJARA_ID>
# In Issuer Portal: Pay Period 2 (AED 1,500 rent)

# Advance Period 3 to now:
ALLOW_SIM=true node scripts/simulation/advance.js --project=<IJARA_ID>
# In Issuer Portal: Pay Period 3 (AED 1,500 rent)

# Advance Period 4 (Final Period) to now:
ALLOW_SIM=true node scripts/simulation/advance.js --project=<IJARA_ID>
# In Issuer Portal:
# - For sale_to_issuer: Directly click "Pay investors" for AED 101,500.00 (AED 1,500 rent + AED 100,000 buyback).
# - For sale_to_third_party: Click "Report sale proceeds", enter realized sale amount, then click "Pay investors".
```

---

## 6. Testing Contract Type 3: Mudarabah (Profit Sharing & Loss Scenarios)

In Mudarabah, periodic profit is not guaranteed. The issuer must submit a quarterly performance report before payment can be executed.

### Step 6.1 — Release & Advance
```bash
ALLOW_SIM=true node scripts/simulation/release.js --project=<MUDARABAH_ID>
ALLOW_SIM=true node scripts/simulation/advance.js --project=<MUDARABAH_ID>
```

### Step 6.2 — Submit Profit Report as Issuer
1. Open `/issuer-portal/projects/test-repay-mudarabah/manage` → **Repayments** tab.
2. Period 1 status is **"Scheduled"** and displays the **"Report profit"** button.
3. Click **"Report profit"**:
   - Enter **Reported Amount**: e.g., `40000` (40,000 AED gross project profit).
   - Enter **Notes**: *"Q1 operational revenue after audit."*
   - Click **"Submit Report"**.
4. **Expected View**:
   - Period 1 status transitions to **"Reported"** (`AED 40,000.00`).
   - The button changes to **"Pay investors"**.
5. Click **"Pay investors"**:
   - Preview calculates investor profit pool: $40,000 \times 70\% = \text{AED } 28,000.00$.
   - Real Investor 60% share: **`AED 16,800.00`**.
   - Secondary Investor 40% share: **`AED 11,200.00`**.
   - Authorize payment.
6. **Zero-Profit Test**:
   - Advance Period 2: `ALLOW_SIM=true node scripts/simulation/advance.js --project=<MUDARABAH_ID>`.
   - Click **"Report profit"** and enter `0`.
   - Click **"Pay investors"**: The system marks the period `'paid'` with total `0` without errors.

---

## 7. Testing Contract Type 4: SPV Equity (Dividends & Exit Settlement)

For SPV Equity projects, payout periods are declared dynamically by the issuer via board resolutions.

### Step 7.1 — Release Funds
```bash
ALLOW_SIM=true node scripts/simulation/release.js --project=<EQUITY_ID>
```

### Step 7.2 — Declare a Dividend
1. Navigate to `/issuer-portal/projects/test-repay-spv-equity/manage` → **Repayments** tab.
2. Above the table, click **"Declare Dividend"**:
   - Total Dividend Pool: `16000` (`AED 16,000.00`).
   - Notes: *"Approved by Board Resolution #1."*
   - Click **"Create Dividend Period"**.
3. **Expected View**:
   - Period 1 appears in the table with type **"Dividend"**, status **"Reported"**, and amount **`AED 16,000.00`**.
4. Click **"Pay investors"**:
   - Real Investor receives 60% of units = **`AED 9,600.00`**.
   - Authorize payment.

### Step 7.3 — Record Final Exit
1. Click **"Record Exit"** (above the table):
   - Total Exit Proceeds: `200000` (`AED 200,000.00`).
   - Notes: *"M&A Trade Sale Acquisition Proceeds."*
   - Click **"Record Final Exit"**.
2. Period 2 appears with type **"Exit"**, marked with the purple **"Final"** badge.
3. Click **"Pay investors"**:
   - Disburses exit capital pro-rata across shares.
   - Pledges and project transition to **`completed`**!
4. In `/investor-portal/investments`, your holding card status badge updates to purple **"Completed"**.

---

## 8. Step 6: Cleaning Up Test Data

When you have finished testing, execute [`tests/repayments/repayment-test-cleanup.sql`](repayment-test-cleanup.sql) in the Supabase SQL Editor.

It removes all 4 test projects, associated pledges, payout periods, repayments, SPV records, and notifications, leaving zero orphaned records.
