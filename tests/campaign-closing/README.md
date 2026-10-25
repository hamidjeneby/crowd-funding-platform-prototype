# Campaign Closing & Allocation Engine Test Suite (`tests/campaign-closing/`)

This directory contains the unit tests, database seed/cleanup scripts, and documentation for the **Campaign Closing and Allocation Engine** (`lib/closing/`).

---

## Files in This Folder

| File | Purpose |
| :--- | :--- |
| [`test-closing.mjs`](./test-closing.mjs) | Pure `node:test` unit test suite verifying `allocatePledges`, `allocateConversionPool`, and `computeRefunds` across all 15 campaign close scenarios without database dependencies. |
| [`closing-test-seed.sql`](./closing-test-seed.sql) | Supabase SQL seed script creating synthetic investors (Classes 1–5) and 15 overdue test campaigns (`test-closing-s1` through `test-closing-s15`) with pre-seeded pledges covering all edge cases. |
| [`closing-test-cleanup.sql`](./closing-test-cleanup.sql) | Supabase SQL cleanup script safely reverting test refund credits on real investors and deleting all `test-closing-*` campaigns, pledges, and notifications. |

---

## Part 1: Running the Pure Unit Tests (`node:test`)

Run from the repository root:

```bash
npm run test:closing
# or directly:
node --test tests/campaign-closing/test-closing.mjs
```

### What It Tests
- **S1 (Exact Target)**: Full allocation of all pledges when subscribed total equals hard cap.
- **S2 (Soft Cap Met Below Target)**: Campaign funded when allocated total $\ge$ soft cap; pledges allocated in full.
- **S3 (Soft Cap Not Met)**: Campaign fails; 100% refund of principal and fees for all investors.
- **S4 (No Pledges)**: Campaign marked as failed with `failure_reason = 'no_pledges'`.
- **S5 (Class Waterfall Oversubscription)**: Higher investor classes (Class 1, 2) allocated first; lower class (Class 5) rejected with full refund.
- **S6 (Tiebreak by Timestamp)**: When investors share the same class, earlier `pledged_at` wins allocation.
- **S7 (Late Pledges)**: Pledges placed after `campaign_end_date` are rejected (`is_late: true`) and refunded.
- **S8 (SPV Conversion Pool)**: SPV conversion pool units allocated up to authorized share ceiling.
- **S9 (SPV Equity Ownership)**: Ownership percentage calculated based on allocated units vs. total authorized shares.

---

## Part 2: Running Live Campaign Closing Engine Tests

### Prerequisites (These have already been done so you can skip)
1. Run [`database/schema/closing_schema.sql`](../../database/schema/closing_schema.sql) in the Supabase SQL Editor.
2. Run [`database/rpc/closing_function.sql`](../../database/rpc/closing_function.sql) in the Supabase SQL Editor.
3. Start the Next.js dev server (`npm run dev`) and export your `CRON_SECRET`:
   ```bash
   export CRON_SECRET="your-cron-secret-from-env-local"
   ```

### Step 1: Seed the Test Scenarios
Run [`closing-test-seed.sql`](./closing-test-seed.sql) in the Supabase SQL Editor. It outputs the generated project IDs for S1 through S15.

### Step 2: Trigger the Closing Worker
You can close a single project or trigger the cron to close all overdue campaigns:

**Single Project Worker:**
```bash
curl -s -X POST http://localhost:3000/api/internal/close-project \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"projectId": <PROJECT_ID>}' | jq .
```

**Batch Cron (all overdue campaigns):**
```bash
curl -s -X GET http://localhost:3000/api/cron/close-projects \
  -H "Authorization: Bearer $CRON_SECRET" | jq .
```

### Step 3: Cleanup Test Data
When done, run [`closing-test-cleanup.sql`](./closing-test-cleanup.sql) in the Supabase SQL Editor to wipe all synthetic test rows.
