# Pledging Process — Complete Flow Documentation

> This document describes the end-to-end pledging process for the crowd-funding
> platform, from the moment an investor clicks "Invest Now" on a project detail
> page to the final recorded entries in the database.

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Conditions Before Pledging](#pre-conditions-before-pledging)
3. [Step-by-Step Pledge Flow](#step-by-step-pledge-flow)
4. [Fee Calculation](#fee-calculation)
5. [Wallet Balance Mechanics](#wallet-balance-mechanics)
6. [Database Records Created](#database-records-created)
7. [Unit & Conversion Computation](#unit--conversion-computation)
8. [Validation & Guard Rails](#validation--guard-rails)
9. [Post-Pledge State & Progress Calculation](#post-pledge-state--progress-calculation)
10. [Pledge Lifecycle & Status Transitions](#pledge-lifecycle--status-transitions)
11. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Overview

The pledging process is the core investor action on the platform. When an
investor pledges into a Sharia-compliant project, the system must:

1. Verify the investor's eligibility (class, status, limits)
2. Check that the investor has not already pledged to this project (Single Pledge per Project rule)
3. Validate the amount against floor, ceiling, and hard cap
4. Calculate the investor fee based on their class at the time of pledge
5. Calculate `pledged_units` = `floor(pledged_amount / unit_price)`
6. Verify sufficient wallet balance for both the pledge amount and fee
7. Create a **pledge** record in the `pledges` table (including `pledged_units`)
8. Deduct the total (pledge + fee) from the investor's wallet
9. Freeze the investor's class and fee rate at pledge time (snapshot rule)

*Note: Holding records in the `holdings` table are created later during the post-campaign allocation and Sukuk/share issuance phase, not at initial pledge time.*

---

## Pre-Conditions Before Pledging

Before the "Invest Now" button is even enabled, the following must be true:

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
| Project has not reached hard cap | Hard cap check | Server-side |

If any condition fails, the invest button is disabled and a reason is shown.

---

## Step-by-Step Pledge Flow

### Phase 1: Investor Opens Pledge Modal

```
Investor clicks "Invest Now"
  → Modal opens with:
    - Current wallet balance displayed
    - Input field pre-filled with min_investment_floor
    - Class max pledge limit shown
    - Fee rate for their class shown
```

### Phase 2: Investor Enters Amount

```
Investor enters a pledge amount
  → Client instantly computes and displays:
    - Fee amount = pledged_amount × (fee_percent / 100)
    - Total wallet deduction = pledged_amount + fee_amount
    - Estimated units acquired = floor(pledged_amount / unit_price)
    - Remaining wallet balance after pledge
    - Warning if insufficient funds
```

### Phase 3: Investor Submits Pledge

```
Investor clicks "Confirm Pledge"
  → Client calls server action: createPledge({ projectId, slug, amount })
```

### Phase 4: Server-Side Validation (in order)

```
1. Auth check — reject if not logged in
2. Parse & validate amount — reject if ≤ 0 or NaN
3. Fetch investor data — reject if no profile
4. Fetch project with visibility check — reject if not found/visible
5. Re-verify eligibility (including Single Pledge per Project check) — reject if campaign not live, already pledged, or limits exceeded
6. Min floor check — reject if amount < min_investment_floor
7. Max pledge check — reject if amount > CLASS_CONFIG[class].maxPledge
8. Hard cap check — reject if live_raised + amount > hard_cap
9. Fee calculation — fee_percent from CLASS_CONFIG, fee_amount computed
10. Units calculation — pledged_units = floor(amount / unit_price)
11. Wallet check — reject if wallet_balance < (amount + fee_amount)
```

### Phase 5: Database Writes (atomic sequence)

```
1. INSERT into pledges table:
   {
     project_id,
     investor_id,
     pledged_amount,
     pledged_units,                    // Number of units purchased
     allocated_amount: null,           // Set later during allocation phase
     investor_class_at_pledge,         // FROZEN snapshot
     fee_percent_at_pledge,            // FROZEN snapshot
     fee_amount,                       // Computed fee
     status: "pending",
     pledged_at: now(),
     allocated_at: null,
     payment_status: "completed"       // Wallet was debited
   }

2. UPDATE investors table:
   SET wallet_balance = wallet_balance - (pledged_amount + fee_amount)
   WHERE id = investor_id
```

### Phase 6: Response & UI Update

```
Server returns:
  { success: true, pledge, feeAmount, totalDeducted, newBalance }

Client shows:
  - Success confirmation with pledge details
  - Fee breakdown recap
  - Updated wallet balance
  - Link to portfolio to view pledge
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

## Database Records Created

### Pledges Table Row

| Field | Value | Source |
|---|---|---|
| `project_id` | Project's ID | From project lookup |
| `investor_id` | Investor's ID | From investor profile |
| `pledged_amount` | The amount the investor committed | User input (validated) |
| `pledged_units` | Units purchased | `floor(pledged_amount / unit_price)` |
| `allocated_amount` | null (initially) | Set during allocation phase |
| `investor_class_at_pledge` | e.g., 3 | Frozen from investor's current class |
| `fee_percent_at_pledge` | e.g., 0.7 | Frozen from CLASS_CONFIG |
| `fee_amount` | Computed fee | `pledged_amount × fee_percent / 100` |
| `status` | `"pending"` | Initial pledge status |
| `pledged_at` | Current timestamp | Server-generated |
| `allocated_at` | null | Set during allocation phase |
| `payment_status` | `"completed"` | Wallet was debited |

*Note: The `holdings` table row is created upon campaign close and funding allocation.*

---

## Unit & Conversion Computation

### Pledging Units (Stored on `pledges.pledged_units`)

```
pledged_units = Math.floor(pledged_amount / unit_price)
```

If `unit_price` is not set or is 0, `pledged_units` defaults to 0.

### Conversion Eligible Units (Classes 1–4 Only, Evaluated at Allocation)

Only applies when:
- `sharia_contract_type` is Murabaha, Mudarabah, or Ijara
- `is_spv = true`
- Investor is Class 1, 2, 3, or 4

---

## Validation & Guard Rails

### Server-Side Validations (in order of evaluation)

| # | Check | Error Message |
|---|---|---|
| 1 | User is authenticated | "You must be logged in to pledge an investment." |
| 2 | Amount is a valid positive number | "Please enter a valid investment amount." |
| 3 | Investor profile exists | "Investor profile not found. Please complete onboarding first." |
| 4 | Project is visible to class | "Project not found or not eligible for your investor class." |
| 5 | Campaign is live | "Campaign is not currently live." |
| 6 | Single pledge per project | "You have already pledged to this project. Each investor is limited to one pledge per project." |
| 7 | Amount ≥ min_investment_floor | "Investment amount cannot be lower than the minimum floor of {currency} {floor}." |
| 8 | Amount ≤ CLASS_CONFIG[class].maxPledge | "Investment amount exceeds your Class {n} maximum pledge limit of {currency} {max}." |
| 9 | live_raised + amount ≤ hard_cap | "This pledge would exceed the campaign's hard cap. Maximum remaining: {currency} {remaining}." |
| 10 | Wallet ≥ amount + fee | "Insufficient wallet balance. You need {currency} {total} but have {currency} {balance}. Please top up your wallet." |
| 11 | Active pledge limit (Class 10) | "Class 10 investors are limited to 1 active pledge at a time." |

### Single Pledge per Project Rule

Investors are restricted to **a single pledge per project**. If an investor attempts to make a second pledge on a project they have already pledged into (where `status` is not `cancelled` or `refunded`), the system blocks the request both at page load (disabling the invest button) and at server action submission.

---

## Post-Pledge State & Progress Calculation

After a successful pledge:

### Live Raised Amount Calculation
Project funding totals on `/investor-portal/marketplace` and `/investor-portal/projects/[slug]` are live-calculated by querying the `pledges` table:
```sql
SELECT project_id, SUM(pledged_amount) 
FROM pledges 
WHERE project_id IN (...) AND status NOT IN ('cancelled', 'refunded') 
GROUP BY project_id;
```

### Funding Percentage Calculation
The funding progress percentage is computed using total pledged amounts divided by `target_goal`, formatted to **1 decimal place**:
```javascript
const rawPercent = targetGoal > 0 ? (liveRaisedAmount / targetGoal) * 100 : 0;
const progressPercent = Math.min(rawPercent, 100).toFixed(1);
```

---

## Pledge Lifecycle & Status Transitions

### Pledge Statuses

```
pending → allocated → active → completed
                  ↘ cancelled
pending → cancelled (if investor cancels before allocation)
pending → refunded (if campaign fails)
```

| Status | Meaning |
|---|---|
| `pending` | Pledge recorded, wallet debited, awaiting campaign close & allocation |
| `allocated` | Campaign closed successfully, funds allocated to project |
| `active` | Sukuk/shares have been formally issued |
| `completed` | Investment has matured/redeemed |
| `cancelled` | Pledge was cancelled (wallet refund triggered) |
| `refunded` | Campaign failed, full refund processed |

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
