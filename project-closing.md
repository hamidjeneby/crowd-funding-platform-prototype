# Campaign Closing System — Complete Technical Documentation

> Reference documentation for the automated and manual campaign closing pipeline, deterministic priority allocation, conversion pool pass, wallet refund ledger, notifications, and end-to-end manual verification.

---

## Table of Contents

1. [End-to-End Flow](#1-end-to-end-flow)
2. [Trigger, Claiming & Background Execution](#2-trigger-claiming--background-execution)
3. [Priority Order & Late Pledge Exclusion](#3-priority-order--late-pledge-exclusion)
4. [Contract-Type Hooks Table](#4-contract-type-hooks-table)
5. [Soft Cap & Underwriting](#5-soft-cap--underwriting)
6. [Conversion Pool Pass](#6-conversion-pool-pass)
7. [Refund Rules & Wallet Ledger](#7-refund-rules--wallet-ledger)
8. [Atomic Database Transaction & Idempotency](#8-atomic-database-transaction--idempotency)
9. [Notifications & Make Webhooks](#9-notifications--make-webhooks)
10. [Failure Handling & Retries](#10-failure-handling--retries)
11. [Portal Display Changes](#11-portal-display-changes)
12. [Manual Test Guide](#manual-test-guide)

---

## 1. End-to-End Flow

When a live campaign reaches its `campaign_end_date`, the platform transitions the project from `"request"` mode (`campaign_live`) to final settlement (`funded` or `failed`):

```
Hourly Cron (/api/cron/close-campaigns)
  │
  ├─► Atomic Claim (claim_overdue_projects_for_closing)
  │     - Claims 'campaign_live' projects where campaign_end_date <= now()
  │     - Re-claims stale 'closing' projects where allocation_status != 'complete'
  │       and closed_at <= now() - interval '15 minutes'
  │     - Sets status = 'closing', closed_at = now(), close_attempts = close_attempts + 1
  │
  └─► Background Worker per Project (Next.js after() / /api/internal/close-project)
        │
        ├─► 1. Load project, spv_details, contract_terms, and 'pending' pledges
        ├─► 2. Split pledges into eligible (pledged_at <= campaign_end_date) and late
        ├─► 3. Sort eligible pledges by Class ASC, Amount DESC, Timestamp ASC
        ├─► 4. Run contract-type capacity & whole-unit allocation pass
        ├─► 5. Check soft_cap (and underwriting stub) → determine 'funded' or 'failed'
        ├─► 6. Run conversion pool pass (if funded and allowed by contract hook)
        ├─► 7. Compute per-pledge refunds
        ├─► 8. Commit everything in one SQL transaction via apply_project_close() RPC
        └─► 9. Post-commit: bulk-insert notifications, fire Make webhook in chunks of 50,
               set close_notifications_sent_at, and record project_close_log
```

---

## 2. Trigger, Claiming & Background Execution

### Cron Route (`app/api/cron/close-campaigns/route.js`)
- Scheduled hourly (`0 * * * *`) in `3rd party cronjob`.
- Requires `Authorization: Bearer <CRON_SECRET>` (`401 Unauthorized` otherwise).
- Calls `public.claim_overdue_projects_for_closing()` to atomically claim overdue `campaign_live` projects and stale `closing` projects (`closed_at <= now() - interval '15 minutes'`) in a single SQL `UPDATE ... RETURNING`.
- Schedules `closeProjectById(id)` inside Next.js 16's native `after()` hook from `next/server`, returning `{ claimedCount, claimedIds }` immediately so the cron request never times out waiting for sequential project closes.

### Worker Route (`app/api/internal/close-project/route.js`)
- Requires `Authorization: Bearer <CRON_SECRET>`.
- Accepts `POST { "projectId": <number> }`.
- Supports `?dryRun=true`: runs the pure calculation pipeline (`runClosingCalculations`) on any `campaign_live` (overdue or not) or `closing` project and returns `{ dryRun: true, projectOutcome, projectUpdate, summary, pledgeResults }` with **zero database writes, zero status changes, and zero notifications**.
- On a live run (`?dryRun` omitted or `false`):
  - If the project is still `campaign_live` and `campaign_end_date <= now()`, it atomically claims the project via `claim_single_project_for_closing(p_project_id)`. It **never** claims a `campaign_live` project whose deadline has not passed.
  - If `allocation_status === 'complete'` and `close_notifications_sent_at` is already set, it returns a no-op `{ noop: true, alreadyComplete: true }`.

---

## 3. Priority Order & Late Pledge Exclusion

### Late Pledges (Decision 4)
Any `pending` pledge with `pledged_at > campaign_end_date` is excluded from allocation and from `subscribed_total_at_close`. It receives:
- `status = 'refunded'`
- `allocated_amount = 0`, `allocated_units = 0`
- `allocation_rank = null`, `conversion_eligible_units = null`, `ownership_percentage = null`
- `refunded_amount = pledged_amount + fee_amount` (100% principal + 100% fee refunded)

### Eligible Pledges Priority Sort
Eligible pledges (`pledged_at <= campaign_end_date`) are sorted deterministically in `lib/closing/allocate.js`:
1. **`investor_class_at_pledge` ascending** (Class 1 highest priority down to Class 10 lowest priority)
2. **`pledged_amount` descending** (larger pledges prioritized ahead of smaller pledges within the same class)
3. **`pledged_at` ascending** (earlier timestamp breaks ties within the same class and amount)
4. **`id` ascending** (deterministic final tie-breaker)

`allocation_rank` is assigned as the 1-based position (`1, 2, 3, ...`) in this sorted order. On a failed campaign, `allocation_rank` is reset to `null`.

---

## 4. Contract-Type Hooks Table

Each Sharia contract type defines four hooks in `lib/closing/types/{murabaha,ijara,mudarabah,spv_equity}.js`:

| Contract Type | `capacity(project)` | `roundAllocation(amount, project)` | `conversionPass` | `afterAllocation(project, pledges)` |
|---|---|---|---|---|
| `murabaha` | `hard_cap \|\| target_goal` | `floor(amount / unit_price) * unit_price` (whole units) | `true` (when `is_spv` and `spv_details.conversion_enabled`) | No-op |
| `ijara` | `hard_cap \|\| target_goal` | `floor(amount / unit_price) * unit_price` (whole units) | `true` (when `is_spv` and `spv_details.conversion_enabled`) | No-op |
| `mudarabah` | `hard_cap \|\| target_goal` | `floor(amount / unit_price) * unit_price` (whole units) | `true` (when `is_spv` and `spv_details.conversion_enabled`) | No-op |
| `spv_equity` | `total_shares_authorized * unit_price` (fallback `hard_cap \|\| target_goal`) | `floor(amount / unit_price) * unit_price` (whole shares) | `false` | Sets `ownership_percentage = round((allocated_units / (existing_shares_outstanding + total_allocated_shares)) * 100, 6)` |

### Minimum Floor & Rounding Rules (Decisions 1 & 2)
For each eligible pledge in rank order:
1. `rawFill = min(pledged_amount, remainingCapacity)`
2. `roundedFill = hook.roundAllocation(rawFill, project)`
3. If `roundedFill < project.min_investment_floor`, `fill = 0` and the loop continues to the next pledge (leaving `remainingCapacity` available for a subsequent pledge that can meet the floor).
4. Otherwise `allocated_amount = roundedFill`, `allocated_units = floor(allocated_amount / unit_price)`, and `remainingCapacity -= allocated_amount`.

---

## 5. Soft Cap & Underwriting

- **Zero Eligible Pledges**: Fails immediately with `status = 'failed'`, `failure_reason = 'no_pledges'`.
- **Soft Cap Check**:
  - If `allocated_total >= soft_cap`, the campaign succeeds (`status = 'funded'`, `failure_reason = null`).
  - If `allocated_total < soft_cap`, the pipeline invokes `applyUnderwriting(project, shortfall)`.
  - Per Decision 3, `applyUnderwriting(project, shortfall)` is currently a stub returning `0`.
  - Because `allocated_total + 0 < soft_cap`, the campaign fails with `status = 'failed'`, `failure_reason = 'soft_cap_not_met'`, and all pledges are marked `status = 'refunded'` with `allocated_amount = 0`, `allocated_units = 0`, `allocation_rank = null`, `conversion_eligible_units = null`.

---

## 6. Conversion Pool Pass

Implemented as a pure function in `lib/closing/conversion.js` (`allocateConversionPool`):
- Runs **only** when the campaign is `funded`, the contract hook has `conversionPass = true`, `project.is_spv = true`, and `spv_details.conversion_enabled = true`.
- Pool ceiling in Sukuk units:
  $$\text{pool\_units} = \left\lfloor \frac{\text{total\_shares\_authorized}}{\text{conversion\_ratio\_shares}} \right\rfloor$$
- Walks allocated pledges in priority order (`allocation_rank` ascending):
  - **Classes 1–4**:
    $$\text{conversion\_eligible\_units} = \min(\text{requested\_conversion\_units}, \text{allocated\_units}, \text{pool\_units\_remaining})$$
    Subtracts `conversion_eligible_units` from `pool_units_remaining`.
  - **Classes 5–10** (or `rejected_oversubscribed` pledges on a convertible project): `conversion_eligible_units = 0`.
- When conversion is not active on a project (or when the campaign fails), `conversion_eligible_units` is `null`.

---

## 7. Refund Rules & Wallet Ledger

### Refund Calculation Rules (Decisions 1, 4, 5)

| Scenario | Final Pledge Status | `allocated_amount` | `refunded_amount` Credited to Wallet | Investor Fee |
|---|---|---|---|---|
| **Full fill** (`allocated_amount == pledged_amount`) | `allocated` | `pledged_amount` | `0` | Kept by platform |
| **Partial fill or unit-rounding remainder** (`0 < allocated_amount < pledged_amount`) | `allocated` | Filled whole-unit amount | `pledged_amount - allocated_amount` (unallocated principal only) | **Not refunded** (kept in full) |
| **Not allocated on funded campaign** (`allocated_amount == 0`) | `rejected_oversubscribed` | `0` | `pledged_amount + fee_amount` | **Refunded in full** |
| **Campaign failed** (`soft_cap_not_met`) | `refunded` | `0` | `pledged_amount + fee_amount` | **Refunded in full** |
| **Late pledge** (`pledged_at > campaign_end_date`) | `refunded` | `0` | `pledged_amount + fee_amount` | **Refunded in full** |

### `wallet_transactions` Ledger Table
Every movement of investor wallet funds is recorded in `public.wallet_transactions`:
- `top_up`: Recorded in `topUpWallet` (`app/actions/investor-portal.js`) when an investor adds funds (`pledge_id = null`).
- `pledge_debit`: Recorded in `createPledge` (`app/actions/pledge.js`) when a pledge is submitted (`amount = pledged_amount + fee_amount`, `balance_after` = post-debit balance).
- `refund_credit`: Recorded inside `apply_project_close` (`closing_function.sql`) when `refunded_amount > 0` at campaign close (`amount = refunded_amount`, `balance_after` = post-refund balance).

---

## 8. Atomic Database Transaction & Idempotency

All database writes for closing a campaign happen inside a single `SECURITY DEFINER` PL/pgSQL function `public.apply_project_close(p_project_id, p_results, p_project)` in `closing_function.sql`:

1. **Row Lock**: `SELECT ... FROM public.projects WHERE id = p_project_id FOR UPDATE`.
2. **Idempotency Guard**: If `allocation_status = 'complete'`, immediately returns `{"already_complete": true}` without touching pledges or balances.
3. **Pending Pledge Update**: Updates each pledge in `p_results` **only where `status = 'pending'`**.
4. **Exactly-Once Refund Guard**:
   - Inserts into `public.wallet_transactions (investor_id, pledge_id, type, amount, balance_after)` with `type = 'refund_credit'` and `ON CONFLICT (pledge_id, type) WHERE pledge_id IS NOT NULL DO NOTHING`.
   - Checks `FOUND`: **only if the `wallet_transactions` row was newly inserted** does it increment `investors.wallet_balance = wallet_balance + refunded_amount` and update `balance_after`. This guarantees that no investor can ever be refunded twice for the same pledge.
5. **Project Finalization**: Sets `status` (`funded` or `failed`), `allocation_status = 'complete'`, `allocated_total`, `subscribed_total_at_close`, `failure_reason`, and `closed_at`.
6. **System Milestone Completion**: When `status = 'funded'`, marks the `campaign_funded` system milestone in `public.project_milestones` as `status = 'complete'`.

---

## 9. Notifications & Make Webhooks

Executed after `apply_project_close` commits (`lib/closing/notify.js`). Notification errors are caught and logged so they never roll back the financial transaction. `projects.close_notifications_sent_at` is set only after the notification fan-out finishes, and repeat runs skip notifications when `close_notifications_sent_at` is already populated.

1. **Investors with a Pledge (`public.notifications`, mandatory, bulk-inserted)**:
   - `allocation_full`: Full allocation confirmed.
   - `allocation_partial`: States allocated amount, unallocated principal returned to wallet, and explicitly notes that the platform fee was not refunded.
   - `allocation_none`: States that the pledge was not allocated due to priority cutoff and that the full pledge + fee were returned to the wallet.
   - `campaign_failed`: States that the campaign did not reach its minimum funding threshold and that the full pledge + fee were returned to the wallet.
2. **Issuer (`public.issuer_notifications`, deduplicated by `notification_text = 'campaign_closed:project_<id>'`)**:
   - `campaign_funded` (with `allocated_total` vs `target_goal`) or `campaign_failed` (with `failure_reason`), `requires_action = false`, `action_url = '/issuer-portal/projects/<slug>/manage'`.
3. **Subscribed Non-Pledging Investors (`public.notifications`, bulk-inserted)**:
   - Investors in `project_notification_subscriptions` with `notify_campaign_alerts = true` who do **not** have a pledge on the project receive a `campaign_closed` notification.
4. **Make Allocation Confirmation Webhook (`sendAllocationConfirmationWebhook` in `lib/webhook.js`)**:
   - Sent in chunks of **50 pledges** to `MAKE_ALLOCATION_CONFIRMATION_WEBHOOK_URL` (falling back to `MAKE_WEBHOOK_URL`) with header `x-make-apikey: process.env.WEBHOOK_API_KEY`.
   - Includes per-pledge `pledgeId`, `investorName`, `investorEmail`, `status`, `pledgedAmount`, `allocatedAmount`, `allocatedUnits`, `refundedAmount`, `conversionEligibleUnits`, and `ownershipPercentage`.

---

## 10. Failure Handling & Retries

- If an unexpected error occurs while closing a project:
  - The project remains in `status = 'closing'` with `allocation_status != 'complete'`.
  - A row is written to `public.project_close_log` with `outcome = 'error'` and the error message.
  - When `close_attempts >= 2`, `sendProjectCloseErrorWebhook` sends an alert payload (`eventType: 'project_close_error'`) to `MAKE_CLOSE_ERROR_WEBHOOK_URL` / `MAKE_WEBHOOK_URL`.
- Any project stuck in `status = 'closing'` with `allocation_status != 'complete'` and `closed_at <= now() - interval '15 minutes'` is automatically re-claimed by the next cron run.

---

## 11. Portal Display Changes

- **Marketplace (`/investor-portal/marketplace`)**: Continues to list only `campaign_live` projects.
- **Project Detail Page (`/investor-portal/projects/[slug]`)**:
  - Accessible after close (`closing`, `funded`, `failed`, `completed`) to any investor who holds a non-cancelled pledge on that project.
  - Displays a status banner at the top (`"Allocation in progress..."`, `"Campaign funded — ..."`, or `"Campaign did not reach its minimum goal — all pledges have been refunded in full."`).
  - Uses `allocated_total` for the progress bar on `funded` / `completed` campaigns and disables the invest button whenever the campaign is not live or `now() >= campaign_end_date`.
- **My Investments (`/investor-portal/investments`)**:
  - **Holdings tab**: Shows `allocated`, `active`, and `completed` pledges with `allocated_amount`, `allocated_units`, `conversion_eligible_units`, and `ownership_percentage` (for `spv_equity`).
  - **Pledges tab**: Shows `pending`, `rejected_oversubscribed` ("Not allocated"), and `refunded` ("Refunded") pledges alongside `refunded_amount` returned to wallet.
- **Issuer Portal**:
  - Recognizes `closing`, `funded`, and `failed` statuses across the Issuer Dashboard, Projects list, Project Manage header, Overview tab (showing `allocated_total`, `subscribed_total_at_close`, `closed_at`, and `failure_reason`), and Issuer Notifications.

---

## Manual test guide

Follow the 6 blocks below in order to verify the campaign closing system end-to-end.

### Prerequisites
1. In the **Supabase SQL Editor**, run:
   - `closing_schema.sql`
   - `closing_function.sql`
2. Ensure your `.env.local` has `CRON_SECRET` set (for example `CRON_SECRET=my-local-cron-secret`) and your local dev server is running (`npm run dev` on `http://localhost:3000`).
3. Open `scripts/closing-test-seed.sql`, optionally set `v_issuer_id` and `v_real_investor_id` at the top of the `DO $$ DECLARE` block (or leave them `NULL` to auto-select your latest issuer and real investor), and run `scripts/closing-test-seed.sql` in the Supabase SQL Editor. Note the returned `id` for each `test-closing-s1` ... `test-closing-s15` project.

---

### Block 1 — Dry Run (`?dryRun=true`)

Run a dry run against **S3 (`test-closing-s3-oversubscribed`)** and **S13 (`test-closing-s13-spv-equity`)** (replace `<S3_PROJECT_ID>` and `<S13_PROJECT_ID>` with the IDs returned by the seed script):

```bash
curl -s -X POST "http://localhost:3000/api/internal/close-project?dryRun=true" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"projectId": <S3_PROJECT_ID>}' | jq .

curl -s -X POST "http://localhost:3000/api/internal/close-project?dryRun=true" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"projectId": <S13_PROJECT_ID>}' | jq .
```

**Verify in Supabase SQL Editor that nothing was written:**
```sql
SELECT id, slug, status, allocation_status, allocated_total, close_attempts
FROM public.projects
WHERE slug IN ('test-closing-s3-oversubscribed', 'test-closing-s13-spv-equity');
```
- Both projects must still have `status = 'campaign_live'`, `allocation_status = 'pending'`, `allocated_total IS NULL`, and `close_attempts = 0`.
- In the S3 JSON response: `projectOutcome = "funded"`, rank 1 (`70,000` allocated, `0` refunded), rank 2 (`30,000` allocated, `20,000` refunded, fee kept), rank 3 (`rejected_oversubscribed`, `0` allocated, `20,160` refunded including fee).
- In the S13 JSON response: `projectOutcome = "funded"`, `capacity = 200000`, rank 1 has `allocated_units = 1500` and `ownership_percentage = 15`, rank 2 has `allocated_units = 500` and `ownership_percentage = 5`.

---

### Block 2 — Funded Campaign Close (S3 Oversubscribed & S11/S12/S13)

Close **S3 (`test-closing-s3-oversubscribed`)**, **S11 (`test-closing-s11-conversion-exhausted`)**, **S12 (`test-closing-s12-conversion-shrunk`)**, and **S13 (`test-closing-s13-spv-equity`)** for real:

```bash
for PID in <S3_PROJECT_ID> <S11_PROJECT_ID> <S12_PROJECT_ID> <S13_PROJECT_ID>; do
  curl -s -X POST "http://localhost:3000/api/internal/close-project" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"projectId\": $PID}" | jq .
done
```

**Verify in Supabase SQL Editor:**
```sql
-- 1. Check project statuses and totals
SELECT id, slug, status, allocation_status, allocated_total, subscribed_total_at_close, close_notifications_sent_at
FROM public.projects
WHERE slug IN (
  'test-closing-s3-oversubscribed',
  'test-closing-s11-conversion-exhausted',
  'test-closing-s12-conversion-shrunk',
  'test-closing-s13-spv-equity'
)
ORDER BY slug;

-- 2. Check S3 pledges, ranks, and refunds
SELECT pl.id, pl.investor_class_at_pledge, pl.pledged_amount, pl.fee_amount,
       pl.status, pl.allocation_rank, pl.allocated_amount, pl.allocated_units, pl.refunded_amount
FROM public.pledges pl
JOIN public.projects pr ON pr.id = pl.project_id
WHERE pr.slug = 'test-closing-s3-oversubscribed'
ORDER BY pl.allocation_rank;

-- 3. Check S11 & S12 conversion_eligible_units and S13 ownership_percentage
SELECT pr.slug, pl.investor_class_at_pledge, pl.pledged_units, pl.allocated_units,
       pl.requested_conversion_units, pl.conversion_eligible_units, pl.ownership_percentage
FROM public.pledges pl
JOIN public.projects pr ON pr.id = pl.project_id
WHERE pr.slug IN (
  'test-closing-s11-conversion-exhausted',
  'test-closing-s12-conversion-shrunk',
  'test-closing-s13-spv-equity'
)
ORDER BY pr.slug, pl.allocation_rank;

-- 4. Check wallet_transactions and campaign_funded milestone
SELECT wt.type, wt.amount, wt.balance_after, wt.pledge_id
FROM public.wallet_transactions wt
JOIN public.pledges pl ON pl.id = wt.pledge_id
JOIN public.projects pr ON pr.id = pl.project_id
WHERE pr.slug = 'test-closing-s3-oversubscribed';

SELECT pr.slug, pm.linked_system_event, pm.status
FROM public.project_milestones pm
JOIN public.projects pr ON pr.id = pm.project_id
WHERE pr.slug = 'test-closing-s3-oversubscribed'
  AND pm.linked_system_event = 'campaign_funded';
```

---

### Block 3 — Failed Campaigns (S9 Below Soft Cap & S10 Zero Pledges)

Close **S9 (`test-closing-s9-below-soft-cap`)** and **S10 (`test-closing-s10-zero-pledges`)**:

```bash
curl -s -X POST "http://localhost:3000/api/internal/close-project" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"projectId": <S9_PROJECT_ID>}' | jq .

curl -s -X POST "http://localhost:3000/api/internal/close-project" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"projectId": <S10_PROJECT_ID>}' | jq .
```

**Verify in Supabase SQL Editor:**
```sql
SELECT slug, status, allocation_status, allocated_total, subscribed_total_at_close, failure_reason
FROM public.projects
WHERE slug IN ('test-closing-s9-below-soft-cap', 'test-closing-s10-zero-pledges');

SELECT pl.id, pl.pledged_amount, pl.fee_amount, pl.status, pl.allocated_amount,
       pl.allocation_rank, pl.conversion_eligible_units, pl.refunded_amount
FROM public.pledges pl
JOIN public.projects pr ON pr.id = pl.project_id
WHERE pr.slug = 'test-closing-s9-below-soft-cap';
```
- `test-closing-s9-below-soft-cap` has `status = 'failed'`, `failure_reason = 'soft_cap_not_met'`, and every pledge has `status = 'refunded'`, `allocation_rank IS NULL`, and `refunded_amount = pledged_amount + fee_amount`.
- `test-closing-s10-zero-pledges` has `status = 'failed'` and `failure_reason = 'no_pledges'`.

---

### Block 4 — Idempotency & Late Pledge Refund (S14)

Call `/api/internal/close-project` **twice** in a row on **S14 (`test-closing-s14-idempotency`)**:

```bash
curl -s -X POST "http://localhost:3000/api/internal/close-project" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"projectId": <S14_PROJECT_ID>}' | jq .

curl -s -X POST "http://localhost:3000/api/internal/close-project" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"projectId": <S14_PROJECT_ID>}' | jq .
```

**Verify in Supabase SQL Editor:**
```sql
-- Verify late pledge was excluded and refunded in full, and only 1 refund_credit exists per refunded pledge
SELECT pl.id, pl.investor_class_at_pledge, pl.pledged_amount, pl.fee_amount,
       pl.status, pl.allocation_rank, pl.allocated_amount, pl.refunded_amount,
       COUNT(wt.id) AS refund_tx_count
FROM public.pledges pl
JOIN public.projects pr ON pr.id = pl.project_id
LEFT JOIN public.wallet_transactions wt ON wt.pledge_id = pl.id AND wt.type = 'refund_credit'
WHERE pr.slug = 'test-closing-s14-idempotency'
GROUP BY pl.id;

-- Verify notifications were not duplicated on the second call
SELECT COUNT(*) AS notification_count
FROM public.notifications n
JOIN public.projects pr ON pr.id = n.project_id
WHERE pr.slug = 'test-closing-s14-idempotency';
```
- The second curl call returns `{"ok": true, "noop": true, "alreadyComplete": true}`.
- `refund_tx_count` is `1` (never `2`) for the partially filled C2 pledge and late C4 pledge, and `notification_count` is `3` (one per investor, never duplicated).

---

### Block 5 — Cron Route & Stale Retry (Remaining Projects + S15)

Trigger the cron route to claim and close all remaining overdue projects (including **S15 `test-closing-s15-stuck-closing`**, which was seeded in `status = 'closing'` with `closed_at` 20 minutes ago):

```bash
curl -s -X GET "http://localhost:3000/api/cron/close-campaigns" \
  -H "Authorization: Bearer $CRON_SECRET" | jq .
```

**Verify in Supabase SQL Editor (after a few seconds for background `after()` tasks to finish):**
```sql
SELECT id, slug, status, allocation_status, close_attempts, allocated_total, failure_reason
FROM public.projects
WHERE slug LIKE 'test-closing-%'
ORDER BY id;

SELECT project_id, outcome, error, summary->>'allocated_total' AS allocated_total
FROM public.project_close_log
WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%')
ORDER BY id;
```
- All 15 `test-closing-*` projects now have `allocation_status = 'complete'` and `status IN ('funded', 'failed')`.
- `test-closing-s15-stuck-closing` has `close_attempts = 2` and `status = 'funded'`.

---

### Block 6 — UI Verification & Cleanup

1. **Investor Portal**:
   - Visit `/investor-portal/investments`:
     - Under **Holdings**, verify your allocated test holding (on `test-closing-s2-soft-cap-met`) shows its final `allocated_amount` and `allocated_units`.
     - Under **Pledges**, verify your refunded test pledge (on `test-closing-s9-below-soft-cap`) appears with the `"Refunded"` badge and shows the refunded amount returned to wallet.
   - Visit `/investor-portal/projects/test-closing-s2-soft-cap-met` and `/investor-portal/projects/test-closing-s9-below-soft-cap`:
     - Verify both closed project pages load for your investor account, display the funded/failed banner at the top, and keep the pledge button disabled.
   - Visit `/investor-portal/notifications`:
     - Verify you received `allocation_full` (for S2), `campaign_failed` (for S9), and `campaign_closed` (for S1 subscription).
2. **Issuer Portal**:
   - Visit `/issuer-portal/projects` and `/issuer-portal/notifications` to verify the `Funded` and `Failed` badges, the overview summary cards, and the `campaign_funded` / `campaign_failed` issuer notifications.
3. **Clean Up All Test Data**:
   - Run `scripts/closing-test-cleanup.sql` in the Supabase SQL Editor and verify zero `test-closing-%` rows remain:
   ```sql
   SELECT COUNT(*) FROM public.projects WHERE slug LIKE 'test-closing-%';
   SELECT COUNT(*) FROM public.investors WHERE email LIKE 'test.closing.%@example.com';
   ```
