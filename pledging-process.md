# Pledging Process — Complete Flow Documentation

> This document describes the end-to-end pledging process for the crowd-funding
> platform, from the moment an investor clicks "Invest Now" on a project detail
> page to the final recorded entries in the database and their representation as
> pledges or active holdings in the investor portfolio.

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Conditions Before Pledging](#pre-conditions-before-pledging)
3. [Step-by-Step Pledge Flow](#step-by-step-pledge-flow)
4. [Fee Calculation](#fee-calculation)
5. [Wallet Balance Mechanics](#wallet-balance-mechanics)
6. [Database Records & Architectural Single-Table Model](#database-records--architectural-single-table-model)
7. [Unit & Conversion Computation](#unit--conversion-computation)
8. [Validation & Guard Rails](#validation--guard-rails)
9. [Post-Pledge State & Progress Calculation](#post-pledge-state--progress-calculation)
10. [Pledge Lifecycle, Status Transitions & Holdings Derivation Rules](#pledge-lifecycle-status-transitions--holdings-derivation-rules)
11. [Portfolio Page Calculation Rules](#portfolio-page-calculation-rules)
12. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Overview

The platform uses a **"request, then allocate"** pledge model. Pledges made during an active campaign represent conditional investment requests with `status = 'pending'`, rather than immediate guaranteed allocations or first-come-first-served asset claims.

At campaign close, a single centralized allocation run prioritizes all active requests according to deterministic rules:
1. **Investor Class** (Class 1 highest priority down to Class 10 lowest priority)
2. **Pledge Amount** (larger pledges prioritized over smaller pledges within the same class)
3. **Pledged Timestamp** (`pledged_at` earliest first within the same class and amount tier)

This priority allocation governs both project principal capacity and conversion pool rights, replacing older first-come-first-served consumption.

When an investor submits a pledge request, the system:
1. Verifies the investor's eligibility (class, KYC/onboarding status, class ceilings)
2. Checks that the investor has not already pledged to this project (Single Pledge per Project rule)
3. Verifies the campaign's oversubscription ceiling (`MAX_OVERSUBSCRIPTION_PERCENT = 150%` of capacity, where capacity is `hard_cap || target_goal`)
4. Verifies mandatory acceptance of subscription terms (`acceptedTerms === true`)
5. Captures audit signing metadata (`signed_at` UTC timestamp and `signed_ip` client IP)
6. Calculates the investor fee based on their frozen class at pledge time
7. Calculates `pledged_units` = `floor(pledged_amount / unit_price)`
8. Calculates `requested_conversion_units` = `floor(min(pledged_amount, classCap) / unit_price)` for Classes 1–4 on eligible projects
9. Verifies sufficient wallet balance for total deduction (pledge principal + investor fee)
10. Inserts a pending record into `pledges` with snapshot metadata
11. Inserts a `subscription_agreement` record into `pledge_docs` (`file_url: null`, `terms_version: "v1.0"`)
12. Dispatches an asynchronous fire-and-forget webhook to Make for background PDF generation & emailing
13. Deducts the total commitment from the investor's wallet balance into escrow

---

## Pre-Conditions Before Pledging

Before the "Invest Now" / "Submit Pledge Request" button is enabled, the following must be true:

| Condition | Checked By | Enforcement |
|---|---|---|
| Investor is logged in | Clerk auth | Server-side |
| Investor profile exists | `getInvestorPortalData()` | Server-side |
| Investor has a class assigned | `investor_class` field | Server-side |
| Onboarding is complete | `onboarding_status` | Page-level gate |
| Project is visible to investor's class | `checkProjectVisibilityInternal()` | Server-side query filter |
| Project status is `campaign_live` | `checkInvestEligibility()` | Server-side |
| Investor has **NOT** already pledged to this project | `checkInvestEligibility()` | Server-side (`pledges` table lookup) |
| Investor's class max pledge ≥ project's min floor | `checkInvestEligibility()` | Server-side |
| Active pledge limit not exceeded (Class 10) | `checkInvestEligibility()` | Server-side |
| Campaign oversubscription ceiling not exceeded | Ceiling check (`≤ 150%`) | Server-side |

If any condition fails, the invest button is disabled and a clear reason is displayed.

---

## Step-by-Step Pledge Flow

### Phase 1: Investor Opens Pledge Modal
```
Investor clicks "Invest Now" / "Submit Pledge Request"
  → Modal titled "Pledge request" opens with:
    - Current wallet balance displayed
    - Input field pre-filled with min_investment_floor
    - Class maximum pledge limit shown
    - Investor fee rate for their class shown
    - Estimated units acquired = floor(amount / unit_price)
    - Eligible conversion units (maximum) and customizable requested conversion units input with reduction/opt-out controls (Classes 1–4 on eligible convertible projects)
    - "How your pledge works" disclosure panel (PLEDGE_DISCLOSURES)
    - Unchecked-by-default legal agreement checkbox: "I've read and accept the subscription terms for this pledge"
```

### Phase 2: Investor Enters Amount & Customizes Options
```
Investor enters pledge amount and reviews disclosures
  → Client instantly computes and displays:
    - Fee amount = pledged_amount × (fee_percent / 100)
    - Total wallet deduction = pledged_amount + fee_amount
    - Estimated units and maximum eligible conversion units
    - Option for Class 1–4 investors to reduce requested conversion units (down to 0) if they prefer not to convert all Sukuk to shares
    - Remaining wallet balance after deduction
    - Warning if insufficient wallet balance
Investor checks the subscription terms checkbox
  → "Submit pledge" button becomes active (disabled if checkbox unchecked)
```

### Phase 3: Investor Submits Pledge
```
Investor clicks "Submit pledge"
  → Client calls server action:
    createPledge({ projectId, slug, amount, acceptedTerms: true })
```

### Phase 4: Server-Side Validation (in order)
```
1. Auth check — reject if not authenticated
2. Terms acceptance check — reject if acceptedTerms !== true
3. Parse & validate amount — reject if ≤ 0 or NaN
4. Fetch investor data — reject if no profile
5. Fetch project with visibility check — reject if not found/visible
6. Re-verify eligibility (including Single Pledge per Project check) — reject if campaign not live, already pledged, or limits exceeded
7. Min floor check — reject if amount < min_investment_floor
8. Max pledge check — reject if amount > CLASS_CONFIG[class].maxPledge
9. Oversubscription ceiling check — reject if currentLiveSubscribed + amount > capacity * 1.5
10. Fee calculation — fee_percent from CLASS_CONFIG, fee_amount computed
11. Unit & conversion calculation — pledged_units & requested_conversion_units computed
12. Wallet check — reject if wallet_balance < (amount + fee_amount)
13. Client IP & Timestamp capture — signed_at = now() (ISO), signed_ip from request headers
```

### Phase 5: Database Writes & Webhook Dispatch
```
1. INSERT into pledges table:
   {
     project_id,
     investor_id,
     pledged_amount,
     pledged_units,
     requested_conversion_units,       // Computed demand for Classes 1–4
     conversion_eligible_units: null,  // Decided upon campaign close allocation
     allocated_amount: null,           // Populated upon campaign allocation
     allocated_units: null,
     allocation_rank: null,
     investor_class_at_pledge,         // FROZEN snapshot
     fee_percent_at_pledge,            // FROZEN snapshot
     fee_amount,                       // Computed fee
     refunded_amount: 0,
     refunded_fee: 0,
     status: "pending",
     pledged_at: signed_at,
     payment_status: "completed"
   }

2. INSERT into pledge_docs table:
   {
     pledge_id: pledgeRow.id,
     doc_type: "subscription_agreement",
     terms_version: "v1.0",
     signed_at: signed_at,
     signed_ip: signed_ip,
     file_url: null,
     generated_at: null
   }

3. UPDATE investors table:
   SET wallet_balance = wallet_balance - (pledged_amount + fee_amount)
   WHERE id = investor_id

4. DISPATCH Make Webhook (sendSubscriptionAgreementWebhook):
   Fire-and-forget POST to MAKE_SUBSCRIPTION_AGREEMENT_WEBHOOK_URL / MAKE_WEBHOOK_URL
   with x-make-apikey header. Errors logged without rolling back the pledge.
```

### Phase 6: Response & UI Update
```
Server returns:
  { success: true, pledge, feeAmount, totalDeducted, newBalance }

Client shows:
  - Success screen: "Pledge Submitted!"
  - Confirmation message: "Pledge submitted. Allocation happens when the campaign closes. Your subscription agreement will be emailed to you shortly."
  - Financial breakdown recap
  - Button to view in Portfolio
```

---

## Fee Calculation

Fees are taken from the **investor's** pledge amount, not the issuer's proceeds.
The fee rate is determined by the investor's class at the time of pledge and is
permanently frozen on the pledge record.

| Class | Fee Rate | Example: AED 100,000 Pledge |
|---|---|---|
| 1 | 0.5% | Fee: AED 500 → Total deducted: AED 100,500 |
| 2 | 0.6% | Fee: AED 600 → Total deducted: AED 100,600 |
| 3 | 0.7% | Fee: AED 700 → Total deducted: AED 100,700 |
| 4 | 0.8% | Fee: AED 800 → Total deducted: AED 100,800 |
| 5 | 0.9% | Fee: AED 900 → Total deducted: AED 100,900 |
| 6 | 1.0% | Fee: AED 1,000 → Total deducted: AED 101,000 |
| 7 | 1.2% | Fee: AED 1,200 → Total deducted: AED 101,200 |
| 8 | 1.5% | Fee: AED 1,500 → Total deducted: AED 101,500 |
| 9 | 2.0% | Fee: AED 2,000 → Total deducted: AED 102,000 |
| 10 | 2.5% | Fee: AED 2,500 → Total deducted: AED 102,500 |

**Formula:**
```
fee_amount = pledged_amount × (fee_percent_for_class / 100)
total_wallet_deduction = pledged_amount + fee_amount
```

**Snapshot Rule:** Once `fee_percent_at_pledge` is frozen on the `pledges` row, it
never changes — even if the investor's class is later upgraded or downgraded.

---

## Wallet Balance Mechanics

The investor's `wallet_balance` field in the `investors` table acts as a
pre-funded escrow balance. Money enters the wallet via the existing
`topUpWallet()` action and exits via pledging.

### Deduction at Pledge Time

```
new_balance = current_wallet_balance - (pledged_amount + fee_amount)
```

The wallet balance must be ≥ the total deduction. If insufficient:
- Server returns an error with the shortfall amount
- Client shows a warning with a "Top Up Wallet" link
- Pledge is not created

---

## Database Records & Architectural Single-Table Model

The platform uses a unified, single-table architecture centered on the `pledges` table.
The separate `holdings` database table has been **completely removed**.

### Pledges Table Row Fields

| Field | Value | Source & Role |
|---|---|---|
| `id` | Unique ID | Primary Key (bigint / integer) |
| `project_id` | Project's ID | Foreign key to `projects` |
| `investor_id` | Investor's ID | Foreign key to `investors` (internal integer PK) |
| `pledged_amount` | The amount committed by investor | User input at pledge time |
| `pledged_units` | Units requested | `floor(pledged_amount / unit_price)` |
| `requested_conversion_units` | Convertible units requested | `floor(min(pledged_amount, classCap) / unit_price)` (Classes 1–4 only) |
| `conversion_eligible_units` | Allocated convertible units | Set at campaign close during allocation (`null` during campaign) |
| `allocated_amount` | Final allocated holding value | Set during campaign allocation phase (null while `status = 'pending'`) |
| `allocated_units` | Final allocated unit count | Set during campaign close allocation |
| `allocation_rank` | Deterministic priority rank | Calculated during allocation run |
| `investor_class_at_pledge` | e.g., 3 | Frozen snapshot from investor's profile |
| `fee_percent_at_pledge` | e.g., 0.7 | Frozen snapshot from CLASS_CONFIG |
| `fee_amount` | Computed fee | `pledged_amount × fee_percent / 100` |
| `refunded_amount` | Principal refunded | Set if pledge is partially allocated or rejected |
| `refunded_fee` | Proportionate fee refunded | Set if pledge is partially allocated or rejected |
| `status` | `"pending"`, `"allocated"`, `"rejected_oversubscribed"`, `"active"`, `"completed"`, `"cancelled"`, or `"refunded"` | Lifecycle state of pledge |
| `pledged_at` | Timestamp | Set at pledge submission (ISO UTC) |
| `allocated_at` | Timestamp | Set when campaign completes and allocation occurs |
| `redeemed_at` | Timestamp | Set when investment matures/redeems |
| `payment_status` | `"completed"` | Wallet debit status |

---

## Unit & Conversion Computation

### Pledging Units (Stored on `pledges.pledged_units`)

```
pledged_units = Math.floor(pledged_amount / unit_price)
```

If `unit_price` is not set or is 0, `pledged_units` defaults to 0.

### Conversion Demand Computation (Stored on `pledges.requested_conversion_units`)

Under the **request, then allocate** model, conversion pool units are not consumed first-come-first-served. Instead, requested conversion units are captured at pledge creation and allocated by priority at campaign close:

- Project must not be `spv_equity`
- `conversion_enabled = true` on `spv_details`
- Investor must be Class 1, 2, 3, or 4 (Classes 5–10 receive 0 requested conversion units)

**Pledge-Time Formula:**
1. **Apply Investor Class Conversion Cap:**
   - Class 1: Unlimited
   - Class 2: AED 1,000,000
   - Class 3: AED 500,000
   - Class 4: AED 250,000
   $$\text{effective\_amount} = \min(\text{pledged\_amount}, \text{class\_conversion\_cap})$$
2. **Compute Maximum Eligible Conversion Units:**
   $$\text{max\_eligible\_conversion\_units} = \left\lfloor \frac{\text{effective\_amount}}{\text{unit\_price}} \right\rfloor$$
3. **Investor Customization (Reduction Option):**
   - The pledge modal displays the maximum conversion units the investor is eligible for.
   - Eligible investors (Classes 1–4) can choose to reduce their requested conversion units (down to 0 via numeric input, "0 (Opt Out)" button, or "Max" button).
   - If reduced, $\text{requested\_conversion\_units} = \max(0, \min(\text{user\_units}, \text{max\_eligible\_conversion\_units}))$.
   - Any units not requested for conversion remain as standard non-convertible Sukuk.
4. `conversion_eligible_units` is set to `null` on the pledge record during the campaign. Official conversion units are formally granted during the campaign close allocation run, prioritized by:
   - Investor Class (Class 1 highest)
   - Pledge Amount (largest first)
   - Timestamp `pledged_at` (earliest first)

---

## Validation & Guard Rails

### Server-Side Validations (in order of evaluation)

| # | Check | Error Message |
|---|---|---|
| 1 | User is authenticated | "You must be logged in to pledge an investment." |
| 2 | Terms accepted | "You must read and accept the subscription terms to submit a pledge." |
| 3 | Amount is a valid positive number | "Please enter a valid investment amount." |
| 4 | Investor profile exists | "Investor profile not found. Please complete onboarding first." |
| 5 | Project is visible to class | "Project not found or not eligible for your investor class." |
| 6 | Campaign is live | "Campaign is not currently live." |
| 7 | Single pledge per project | "You have already pledged to this project. Each investor is limited to one pledge per project." |
| 8 | Amount ≥ min_investment_floor | "Investment amount cannot be lower than the minimum floor of {currency} {floor}." |
| 9 | Amount ≤ CLASS_CONFIG[class].maxPledge | "Investment amount exceeds your Class {n} maximum pledge limit of {currency} {max}." |
| 10 | Oversubscription ceiling check (`≤ 150%`) | "This pledge would exceed the campaign's maximum oversubscription limit (150% of capacity). Maximum remaining: {currency} {remaining}." |
| 11 | Wallet balance ≥ amount + fee | "Insufficient wallet balance. You need {currency} {total} but have {currency} {balance}. Please top up your wallet." |
| 12 | Active pledge limit (Class 10) | "Class 10 investors are limited to 1 active pledge at a time." |

### Single Pledge per Project Rule

Investors are restricted to **a single pledge per project**. If an investor attempts to make a second pledge on a project they have already pledged into (where `status` is not in `('cancelled', 'refunded', 'rejected_oversubscribed')`), the system blocks the request both at page load (disabling the invest button) and at server action submission.

---

## Post-Pledge State & Progress Calculation

After a successful pledge:

### Live Subscribed Amount Calculation
Project funding totals on `/investor-portal/marketplace`, `/investor-portal/projects/[slug]`, and issuer dashboards are calculated live from active pledges:
```sql
SELECT project_id, SUM(pledged_amount) 
FROM pledges 
WHERE project_id IN (...) 
  AND status NOT IN ('cancelled', 'refunded', 'rejected_oversubscribed') 
GROUP BY project_id;
```

### Display Terminology & Progress Formatting
- **Live Campaign Label**: Uses **"Subscribed so far"** and **"X% Subscribed"** (NOT "Raised" or "Funded"). Post-allocation, campaigns switch to "Funded".
- **Unconstrained Display Percentage**: Displayed percentages are unconstrained (e.g. `124.5% Subscribed`).
- **Clamped Visual Bars**: Visual progress bars are clamped at 100% width.
- **Oversubscribed Badge**: An amber "Oversubscribed" badge is rendered whenever `rawPercent > 100%`.

---

## Pledge Lifecycle, Status Transitions & Allocation Rules

Holdings and pledges are unified in the `pledges` table and categorized according to their `status` field.

### Status Field Mapping Rules

```
pledges table row status
   │
   ├── "pending" ────────────────────────► PLEDGE REQUEST (Awaiting campaign close)
   │                                       - Displayed in "Pledges" tab as "Pending allocation"
   │                                       - Valuation = pledged_amount
   │
   ├── "allocated" | "active" | "completed" ──► ALLOCATED HOLDING (Campaign closed & allocated)
   │                                           - Displayed in "Holdings" tab & Portfolio Page
   │                                           - allocated_amount and allocated_units populated
   │                                           - ownership_percentage populated for spv_equity
   │                                           - Valuation = allocated_amount
   │
   ├── "rejected_oversubscribed" ────────► NOT ALLOCATED (Oversubscription priority cutoff)
   │                                       - Displayed in "Pledges" tab as "Not allocated"
   │                                       - Full principal & fee refunded to wallet
   │
   ├── "refunded" ───────────────────────► REFUNDED (Campaign failed or late pledge)
   │                                       - Displayed in "Pledges" tab as "Refunded"
   │                                       - Full principal & fee refunded to wallet
   │
   └── "cancelled" ──────────────────────► CANCELLED (Prior to campaign_end_date)
                                           - Excluded from holdings & portfolio
```

### Allocation & Refund Rules at Campaign Close
> See [project-closing.md](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/project-closing.md) for full technical documentation of the automated campaign closing pipeline (`lib/closing/`, `/api/cron/close-campaigns`, `/api/internal/close-project`, and `apply_project_close`).

1. **Deadline Enforcement & Late Pledges:**
   - `createPledge`, `checkInvestEligibility`, and `cancelPledge` reject new pledges or cancellations once `now() >= campaign_end_date`.
   - Any `pending` pledge with `pledged_at > campaign_end_date` is excluded from allocation, marked `status = 'refunded'`, and refunded in full (`pledged_amount + fee_amount`).
2. **Allocation Priority Order:**
   - **Criterion 1 (Investor Class):** Class 1 pledges are allocated first, then Class 2, Class 3, ..., down to Class 10.
   - **Criterion 2 (Pledge Amount):** Larger pledge amounts within the same class are allocated before smaller amounts.
   - **Criterion 3 (Submission Time):** Earliest `pledged_at` timestamps break any ties.
3. **Whole-Unit Rounding & Minimum Floor:**
   - Allocations round down to whole units (`floor(amount / unit_price) * unit_price`) across all contract types.
   - If a rounded fill is below `min_investment_floor`, that pledge receives `0` and the allocation loop continues to the next pledge in priority order.
4. **Partial Allocations & Unit Rounding Remainders:**
   - When a pledge is partially filled (or has a unit-rounding remainder), `allocated_amount` and `allocated_units` reflect the filled whole units.
   - Only the unallocated principal (`pledged_amount - allocated_amount`) is refunded to the investor's wallet; the platform fee is **not** refunded on partial fills.
5. **Rejected Oversubscribed & Failed Campaign Pledges:**
   - Pledges receiving `0` units on a funded campaign receive `status = 'rejected_oversubscribed'` (preserving their `allocation_rank`) and a 100% refund of principal + fee (`pledged_amount + fee_amount`).
   - If total allocated funds (plus `applyUnderwriting`, currently stubbed to `0`) are below `soft_cap`, the campaign fails (`status = 'failed'`, `failure_reason = 'soft_cap_not_met'` or `'no_pledges'`) and all pledges receive `status = 'refunded'` and a 100% refund of principal + fee.
6. **Wallet Transactions Ledger (`wallet_transactions`):**
   - Every wallet movement records a ledger entry with `balance_after`: `top_up` on wallet top-ups, `pledge_debit` on pledge submission, and `refund_credit` (protected by `UNIQUE (pledge_id, type) WHERE pledge_id IS NOT NULL`) inside the `apply_project_close` database transaction.

---

## Subscription Agreement Webhook (Make Integration)

Upon every successful pledge submission, the backend dispatches a webhook to Make for automated subscription agreement generation and delivery.

### Security Guarantees
- **No PII**: No investor names, email addresses, phone numbers, or residential addresses are transmitted in the payload.
- **No Financial Secrets**: No wallet balances, bank accounts, or credentials are sent.
- **Audit Metadata Only**: Transmits public project identifiers, financial parameters, timestamp, client IP, and terms version.

### Payload Schema
```json
{
  "eventType": "subscription_agreement_requested",
  "pledgeId": 12345,
  "investorId": 678,
  "projectId": 90,
  "projectSlug": "greengrid-solar-phase-ii",
  "pledgedAmount": 10000,
  "estimatedUnits": 40,
  "requestedConversionUnits": 40,
  "investorClass": 2,
  "feePercent": 0.6,
  "feeAmount": 60,
  "currency": "AED",
  "shariaContractType": "mudarabah",
  "termsVersion": "v1.0",
  "signedAt": "2026-10-12T16:00:00.000Z",
  "signedIp": "192.0.2.1",
  "timestamp": "2026-10-12T16:00:00.000Z"
}
```
### Detailed Status Definitions

| Status | Category | Meaning & Behavior |
|---|---|---|
| `pending` | **Pledge** | Pledge submitted and wallet debited; campaign is live and awaiting close & allocation. Displayed in "Pledges" tab as "Pending allocation". |
| `allocated` | **Holding** | Campaign closed successfully and funds allocated. The row officially becomes an active **Holding**. The `allocated_amount` and `allocated_units` fields are populated with the final allocated amount. |
| `rejected_oversubscribed` | **Pledge** | Campaign closed oversubscribed and this pledge was ranked below the priority cutoff. Not allocated. 100% of principal and fee refunded to wallet. Displayed in "Pledges" tab as "Not allocated". |
| `active` | **Holding** | Sukuk or equity certificates formally issued to investor. Treated as an active holding using `allocated_amount`. |
| `completed` | **Holding** | Investment matured or redeemed. Retained as a historical holding position using `allocated_amount`. |
| `cancelled` | **None** | Pledge was cancelled prior to allocation. Wallet refunded. **Excluded from both pledges and holdings.** |
| `refunded` | **Pledge** | Campaign failed to reach soft cap goal (or pledge arrived after `campaign_end_date`). Full refund of principal and fee issued to wallet. Displayed in "Pledges" tab as "Refunded". |

---

## Portfolio Page Calculation Rules

The Portfolio Page (`/investor-portal/portfolio`) displays financial health, asset allocation, and rolled-up metrics.

### Portfolio Metric Computation Rules

1. **Source Data Query:**
   - Reads rows from `pledges` table where `investor_id = current_investor_id`.
   - Filters rows where `status` is in `['allocated', 'active', 'completed']`.
   - Ignores rows where `status` is `pending`, `cancelled`, or `refunded`.

2. **Capital Deployed Calculation:**
   - For each holding row, the holding value is `allocated_amount` (falling back to `pledged_amount` if `allocated_amount` is null).
   $$\text{Total Capital Deployed} = \sum_{\text{holdings}} \text{allocated\_amount}$$

3. **Holding Count & Diversification:**
   - `Holdings Count` = number of rows with status `allocated`, `active`, or `completed`.
   - `Asset Categories` = distinct `sharia_contract_type` values across active holdings.
   - `Asset Allocation Percentages` = $(\text{holding.allocated\_amount} / \text{Total Capital Deployed}) \times 100$.

4. **Empty Portfolio State:**
   - If no rows have status `allocated`, `active`, or `completed`, the page displays the "No Active Portfolio Holdings" empty state with a direct button to the marketplace.

---

## Edge Cases & Error Handling

### Race Condition: Hard Cap

Multiple investors could pledge simultaneously, causing the total to exceed the
hard cap. Mitigation:
- The hard cap check reads `live_raised_amount` from `pledges` at pledge time.

### Single Pledge Limit Enforcement

Prevents duplicate or accidental double-pledging. Checked dynamically from the database.

### Investor Class Changes After Pledge

Per the snapshot rule in [class-rules.md](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/class-rules.md) §5:
the class and fee frozen on the pledge record never change, even if the investor is subsequently upgraded or downgraded.
