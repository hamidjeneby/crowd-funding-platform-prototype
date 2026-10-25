# Class 9 & Class 10 Pledge Limits Test Suite (`tests/pledge-limits/`)

This folder contains the unit tests, SQL seed/cleanup scripts, and live verification guide for enforcing the **Class 9** and **Class 10** pledge limits:
- **Class 10 (`maxOpenPledges: 1`, code `OPEN_PLEDGE_LIMIT`)**: Only **1 open (`status = 'pending'`) pledge** at a time across all projects. Freed when the pledge becomes `allocated`, `rejected_oversubscribed`, `refunded`, or `cancelled`.
- **Class 9 & Class 10 (`maxCampaignsPerQuarter: 1`, code `QUARTER_LIMIT`)**: Only **1 campaign per UTC calendar quarter** (`Jan–Mar`, `Apr–Jun`, `Jul–Sep`, `Oct–Dec`), measured by `pledged_at` in UTC (`[window.start, window.nextStart)`). Statuses that count: `pending`, `allocated`, `active`, `completed`. Statuses excluded: `cancelled`, `refunded`, `rejected_oversubscribed`.
- **Classes 1–8**: Unaffected.

---

## Files in This Folder

| File | Purpose |
| :--- | :--- |
| [`test-pledge-limits.mjs`](./test-pledge-limits.mjs) | Pure `node:test` unit test suite (no DB connection needed) testing `getQuarterWindow`, `QUARTER_COUNTED_STATUSES`, `OPEN_PLEDGE_STATUSES`, `CLASS_CONFIG`, UTC quarter boundary rollovers (`31 Mar 23:59:59 UTC` vs `1 Apr 00:00:00 UTC`, `31 Dec` vs `1 Jan`), leap-year dates (`29 Feb`), and Postgres `23505` error mapping. |
| [`pledge-limits-test-seed.sql`](./pledge-limits-test-seed.sql) | Supabase SQL seed script that cleans up any prior `test.limits.*` / `test-limit-*` test rows and inserts 4 synthetic investors (Class 10, Class 9, Class 7, Class 8) and 3 live campaigns (`test-limit-project-a`, `test-limit-project-b`, `test-limit-project-c`). |
| [`pledge-limits-test-cleanup.sql`](./pledge-limits-test-cleanup.sql) | Supabase SQL cleanup script that deletes all synthetic `test.limits.*` investors, `test-limit-*` projects, and their associated pledges, notifications, and wallet transactions. |

---

## Part 1: Running the Unit Tests (`node:test`)

Run from the repository root:

```bash
npm run test:pledge-limits
# or directly:
node --test tests/pledge-limits/test-pledge-limits.mjs
```

### Expected Outcome
All **8 unit tests** pass (`pass 8`, `fail 0`):
1. `QUARTER_COUNTED_STATUSES` (`['pending','allocated','active','completed']`) and `OPEN_PLEDGE_STATUSES` (`['pending']`) match specification.
2. `CLASS_CONFIG` defines `maxCampaignsPerQuarter: 1` on Class 9 & 10, `maxOpenPledges: 1` on Class 10, and neither key on Classes 1–8.
3. `getQuarterWindow` returns exact UTC `start` and `nextStart` `Date` objects for Q1, Q2, Q3, and Q4.
4. `31 March 23:59:59 UTC` falls in Q1 (`2026-01-01T00:00:00.000Z` $\rightarrow$ `2026-04-01T00:00:00.000Z`) while `1 April 00:00:00 UTC` falls in Q2.
5. `31 December 23:59:59 UTC` falls in Q4 while `1 January 00:00:00 UTC` rolls over into Q1 of the next year.
6. Leap-year dates (`2024-02-29` and `2028-02-29`) resolve to Q1 of their respective years.
7. `formatQuarterLimitMessage` and `OPEN_PLEDGE_LIMIT_MESSAGE` produce exact user-facing strings.
8. `mapPledgeInsertError` maps Postgres `23505` violations on `uniq_class10_one_active_pledge` $\rightarrow$ `OPEN_PLEDGE_LIMIT` and `uniq_class9_10_one_pledge_per_quarter` $\rightarrow$ `QUARTER_LIMIT`.

---

## Part 2: Running the Live Integration Tests (Tests 1–11)

### Prerequisites
1. Ensure [`database/schema/class_limits_backstop.sql`](../../database/schema/class_limits_backstop.sql) has been run in the Supabase SQL Editor.
2. Start the Next.js dev server (`npm run dev` on `http://localhost:3000`) and export `CRON_SECRET` in your terminal:
   ```bash
   export CRON_SECRET="your-cron-secret-from-env-local"
   ```
3. Run [`pledge-limits-test-seed.sql`](./pledge-limits-test-seed.sql) in the Supabase SQL Editor and note the returned IDs:
   - `<C10_ID>`: Class 10 investor ID
   - `<C9_ID>`: Class 9 investor ID
   - `<C7_ID>`: Class 7 investor ID
   - `<C8_ID>`: Class 8 investor ID
   - `<PROJ_A_ID>`, `<PROJ_B_ID>`, `<PROJ_C_ID>`: Project IDs for `test-limit-project-a`, `b`, `c`

---

### Test 1: Class 10 investor pledges to Project A
```bash
curl -s -X POST http://localhost:3000/api/internal/test-pledge \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"action":"pledge","investorId":<C10_ID>,"slug":"test-limit-project-a","amount":100}' | jq .
```
- **Expected Outcome**: `result.success: true`, `result.pledge.status: "pending"`, `wallet_balance_before: 10000`, `wallet_balance_after: 9897.5` (`100` principal + `2.5` fee).

---

### Test 2: Same Class 10 investor pledges to Project B while Project A is still `pending`
```bash
curl -s -X POST http://localhost:3000/api/internal/test-pledge \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"action":"pledge","investorId":<C10_ID>,"slug":"test-limit-project-b","amount":100}' | jq .
```
- **Expected Outcome**: `result.success: false`, `result.code: "OPEN_PLEDGE_LIMIT"`, `result.message: "Your investor class allows one open pledge at a time. You can pledge again after your current pledge is allocated or closed."`. Wallet balance stays `9897.5`; no new row created.

---

### Test 3: Close Project A so the pledge becomes `allocated`; try Project B in the same quarter
1. In Supabase SQL Editor, set Project A's deadline to 1 second ago (after the pledge's `pledged_at`):
   ```sql
   UPDATE public.projects SET campaign_end_date = now() - interval '1 second' WHERE id = <PROJ_A_ID>;
   ```
2. Close Project A and attempt to pledge to Project B:
   ```bash
   curl -s -X POST http://localhost:3000/api/internal/close-project \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"projectId":<PROJ_A_ID>}' | jq .

   curl -s -X POST http://localhost:3000/api/internal/test-pledge \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"action":"pledge","investorId":<C10_ID>,"slug":"test-limit-project-b","amount":100}' | jq .
   ```
- **Expected Outcome**:
  - Close worker returns `outcome: "funded"` and transitions the pledge on Project A to `status: "allocated"`.
  - Pledging to Project B in the same quarter is rejected with `result.code: "QUARTER_LIMIT"` and `result.message: "Your investor class allows one campaign per quarter. You can invest again from <Next Quarter Start Date> (UTC)."`.

---

### Test 4: Class 10 pledge becomes `refunded` or `rejected_oversubscribed` at close $\rightarrow$ can pledge again in same quarter
1. If a Class 10 investor's pledge is closed as `refunded` (e.g., campaign fails soft cap or pledge is late) or `rejected_oversubscribed`, both the open-pledge slot and the quarterly slot are freed.
2. Pledging to another live project in the same quarter returns `result.success: true` and `status: "pending"`.

---

### Test 5: Class 9 quarterly limit & holding multiple `pending` pledges across different quarters
1. Re-open Projects A and B if closed:
   ```sql
   UPDATE public.projects
   SET status = 'campaign_live', allocation_status = 'pending', campaign_end_date = now() + interval '7 days', closed_at = NULL
   WHERE id IN (<PROJ_A_ID>, <PROJ_B_ID>);
   ```
2. Class 9 (`<C9_ID>`) pledges to Project A (`amount: 100`) $\rightarrow$ **Expected**: `result.success: true`, `status: "pending"`, `wallet_balance_after: 9898`.
3. Class 9 (`<C9_ID>`) tries Project B in the same quarter $\rightarrow$ **Expected**: `result.success: false`, `result.code: "QUARTER_LIMIT"`.
4. Move the first pledge's `pledged_at` to a previous quarter in SQL:
   ```sql
   UPDATE public.pledges SET pledged_at = '2026-05-15 12:00:00+00' WHERE investor_id = <C9_ID> AND project_id = <PROJ_A_ID>;
   ```
5. Class 9 (`<C9_ID>`) pledges to Project B again $\rightarrow$ **Expected**: `result.success: true`, `status: "pending"` (Class 9 now holds two `pending` pledges simultaneously across different quarters).

---

### Test 6: UTC Quarter Boundary (`00:00:00 UTC` vs `23:59:59 UTC`)
1. Set the Class 9 pledge on Project B to the **first second of the current UTC quarter** (e.g., `'2026-10-01 00:00:00+00'` for Q4 2026) and try pledging to Project C:
   - **Expected Outcome**: Rejected with `result.code: "QUARTER_LIMIT"`.
2. Shift that pledge back 1 second to the **last second of the previous UTC quarter** (e.g., `'2026-09-30 23:59:59+00'`) and try pledging to Project C:
   - **Expected Outcome**: Accepted (`result.success: true`, `status: "pending"`).

---

### Test 7: Concurrency Race & Unique Index Backstop (`23505`)
1. Reset Class 10 investor `<C10_ID>` in SQL:
   ```sql
   DELETE FROM public.wallet_transactions WHERE investor_id = <C10_ID>;
   DELETE FROM public.pledge_docs WHERE pledge_id IN (SELECT id FROM public.pledges WHERE investor_id = <C10_ID>);
   DELETE FROM public.notifications WHERE investor_id = <C10_ID>;
   DELETE FROM public.pledges WHERE investor_id = <C10_ID>;
   UPDATE public.investors SET wallet_balance = 10000 WHERE id = <C10_ID>;
   ```
2. Fire two simultaneous requests with `bypassEligibilityCheck: true`:
   ```bash
   curl -s -X POST http://localhost:3000/api/internal/test-pledge \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"action":"pledge","investorId":<C10_ID>,"slug":"test-limit-project-a","amount":100,"bypassEligibilityCheck":true}' | jq . & \
   curl -s -X POST http://localhost:3000/api/internal/test-pledge \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"action":"pledge","investorId":<C10_ID>,"slug":"test-limit-project-b","amount":100,"bypassEligibilityCheck":true}' | jq . & \
   wait
   ```
- **Expected Outcome**: Exactly one succeeds (`status: "pending"`, wallet debited once to `9897.5`); the other hits `uniq_class10_one_active_pledge` (`23505`) and returns `result.code: "OPEN_PLEDGE_LIMIT"` with the friendly message and no extra debit.

---

### Test 8: Investor Class Downgrade (Class 7 $\rightarrow$ Class 9)
1. Class 7 investor (`<C7_ID>`) places two `pending` pledges in the current quarter (Project A and Project B) $\rightarrow$ **Expected**: Both succeed.
2. Downgrade `<C7_ID>` to Class 9 in SQL:
   ```sql
   UPDATE public.investors SET investor_class = 9 WHERE id = <C7_ID>;
   ```
3. Attempt a third pledge on Project C $\rightarrow$ **Expected**: Existing two `pending` pledges remain untouched (`investor_class_at_pledge = 7`), and the new pledge is rejected with `result.code: "QUARTER_LIMIT"`.

---

### Test 10: Class 8 (and below) Unaffected
- Class 8 investor (`<C8_ID>`) places three `pending` pledges in the same quarter across Projects A, B, and C $\rightarrow$ **Expected**: All three succeed (`status: "pending"`).

---

### Test 11: Wallet Safety (Debit Reversal on Insert Failure)
```bash
curl -s -X POST http://localhost:3000/api/internal/test-pledge \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"action":"pledge","investorId":<C10_ID>,"slug":"test-limit-project-b","amount":100,"simulateDebitBeforeInsert":true}' | jq .
```
- **Expected Outcome**:
  - `debit_reversed: true`, `wallet_balance_before: 9897.5`, `wallet_balance_after: 9897.5`, `result.code: "OPEN_PLEDGE_LIMIT"`.
  - Querying `public.wallet_transactions` for `investor_id = <C10_ID>` shows both the `pledge_debit` row (`102.5`) and the compensating `refund_credit` row (`102.5`, `balance_after: 9897.5`).

---

### Cleanup
When finished testing, run [`pledge-limits-test-cleanup.sql`](./pledge-limits-test-cleanup.sql) in the Supabase SQL Editor.
