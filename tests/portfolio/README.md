# Portfolio Page Test & Live Verification Suite (`tests/portfolio/`)

This directory contains the unit tests, live database seeding/cleanup scripts, API endpoint documentation, and expected outcomes for verifying the **Investor Portfolio** page (`/investor-portal/portfolio`).

---

## Files in This Directory

| File | Purpose |
| :--- | :--- |
| [`test-portfolio-aggregate.mjs`](./test-portfolio-aggregate.mjs) | Pure `node:test` unit test suite (8 tests) validating calculations: `buildSummary`, `byContractType`, `byProject`, `byMonth`, `outcomes`, `conversionExposure`, and multi-currency safety. |
| [`portfolio-test-seed.sql`](./portfolio-test-seed.sql) | Supabase SQL seed script. Creates 12 test campaigns (`test-portfolio-*`) across 4 Sharia contract types and links 12 pledges to your investor account to populate all cards, charts, timelines, and conversion entitlements. |
| [`portfolio-test-cleanup.sql`](./portfolio-test-cleanup.sql) | Supabase SQL cleanup script. Deletes all `test-portfolio-*` campaigns, pledges, notifications, and documents cleanly without touching production data. |
| [`../../app/api/internal/test-portfolio/route.js`](../../app/api/internal/test-portfolio/route.js) | Internal API endpoint (`POST /api/internal/test-portfolio`) supporting automated seeding and cleanup via `curl`. |

---

## Part 1: Running the Pure Unit Tests

Run from the repository root:

```bash
npm run test:portfolio
# or directly:
node --test tests/portfolio/test-portfolio-aggregate.mjs
```

### Expected Outcome
All **8 unit tests** pass (`pass 8`, `fail 0`):
1. `buildSummary` computes correct 4 strip metrics and largest holding share.
2. `byContractType` aggregates amounts and percentages with friendly display labels.
3. `byProject` sorts descending by amount, breaks ties by title, and groups 9th+ projects into "Other".
4. `byMonth` produces a continuous UTC monthly axis with intermediate inactive months filled with `0`.
5. `outcomes` categorizes fully allocated, partly allocated, not allocated, and refunded.
6. `conversionExposure` aggregates only holdings with `conversion_eligible_units > 0`.
7. Mixed currencies are segregated without un-denominated addition.
8. Empty pledges return safe zeroed structures without throwing.

---

## Part 2: Seeding Test Data for Live UI Preview

You can seed the test data using **either** the Supabase SQL Editor (Method A) **or** a `curl` API call (Method B).

### Method A: Supabase SQL Editor (Recommended)
1. Open the **Supabase Dashboard** $\rightarrow$ **SQL Editor**.
2. Open [`tests/portfolio/portfolio-test-seed.sql`](./portfolio-test-seed.sql).
3. Click **Run**.
   - *Note*: The script dynamically resolves the latest registered investor in `public.investors` (`ORDER BY id DESC LIMIT 1`) to obtain their internal Supabase `int8` ID (`investors.id`). Zero hardcoded user strings or fixed IDs are used.

### Method B: Via Terminal `curl`
If your Next.js development server is running (`npm run dev` on port 3000):

```bash
curl -s -X POST "http://localhost:3000/api/internal/test-portfolio" \
  -H "Content-Type: application/json" \
  -d '{"action": "seed"}' | jq .
```

*Expected JSON output:*
```json
{
  "ok": true,
  "action": "seed",
  "investorId": <LATEST_INVESTOR_ID>,
  "message": "Seeded 12 test projects and 12 pledges successfully.",
  "expectedMetrics": {
    "totalInvested": 180000,
    "awaitingAllocation": 15000,
    "holdingsCount": 9,
    "largestHoldingPercent": 25.0
  }
}
```

---

## Part 3: What to Expect on `/investor-portal/portfolio`

After seeding, navigate to:
```
http://localhost:3000/investor-portal/portfolio
```

### 1. Summary Strip (4 Cards)
| Card | Expected Value | Calculation Rationale |
| :--- | :--- | :--- |
| **Total Invested** | **AED 180,000** | Sum of `allocated_amount` across all 9 active holdings (45k + 35k + 25k + 20k + 20k + 15k + 10k + 5k + 5k). |
| **Active Holdings** | **9** | Count of distinct holdings with `status = 'allocated'`. |
| **Awaiting Allocation** | **AED 15,000** | Pledged amount on the live `test-portfolio-green-mobility` campaign (`status = 'pending'`). |
| **Largest Holding** | **25.0%** | Logistics Hub holding (`AED 45,000` / `AED 180,000` = 25.0% concentration). |

### 2. Contract Type Distribution (Doughnut Chart)
- **Murabaha**: `AED 70,000` (**38.9%**) — 3 projects (Logistics 45k + Clinic 20k + Warehouse 5k)
- **Ijara**: `AED 50,000` (**27.8%**) — 2 projects (Solar 35k + Retail 15k)
- **SPV Equity**: `AED 35,000` (**19.4%**) — 2 projects (FinTech 25k + Cyber 10k)
- **Mudarabah**: `AED 25,000` (**13.9%**) — 2 projects (Farm 20k + Academy 5k)
- *Total*: `AED 180,000` (**100.0%**).

### 3. Allocation by Project (Horizontal Bar Chart)
Shows **Top 8 projects** individually, plus the 9th aggregated into **"Other"**:
1. `Al-Noor Cold-Chain Logistics Hub`: **AED 45,000** (25.0%)
2. `Desert Sun Industrial Solar Park`: **AED 35,000** (19.4%)
3. `QistPay GCC Embedded Credit Engine`: **AED 25,000** (13.9%)
4. `Al-Shifa Community Medical Center`: **AED 20,000** (11.1%)
5. `Barakah Hydroponic Vertical Farm`: **AED 20,000** (11.1%)
6. `Madina Boulevard Retail Promenade`: **AED 15,000** (8.3%)
7. `FalconShield Sovereign Cyber Defense`: **AED 10,000** (5.6%)
8. `OmniHub Automated Fulfillment Center`: **AED 5,000** (2.8%)
- **Other** (`Hikmah STEM Virtual Academy`): **AED 5,000** (2.8%)

### 4. Capital Invested Over Time (Timeline Bar Chart)
Continuous monthly timeline in UTC with zero-filled gaps:
- **Jan 2026 (UTC)**: `AED 45,000` (Logistics)
- **Feb 2026 (UTC)**: `AED 60,000` (Solar 35k + FinTech 25k)
- **Mar 2026 (UTC)**: **AED 0** *(Zero-fill demonstration: no allocations occurred in March)*
- **Apr 2026 (UTC)**: `AED 40,000` (Farm 20k + Clinic 20k)
- **May 2026 (UTC)**: **AED 0** *(Zero-fill demonstration: no allocations occurred in May)*
- **Jun 2026 (UTC)**: `AED 35,000` (Retail 15k + Cyber 10k + Warehouse 5k + Academy 5k)

### 5. Historical Pledge Outcomes Card
- **Fully Allocated**: **8** (All holdings where `allocated_amount = pledged_amount`)
- **Partly Allocated**: **1** (Warehouse: `10,000` pledged $\rightarrow$ `5,000` allocated, `5,000` refunded)
- **Not Allocated**: **1** (Cold Storage: `status = 'rejected_oversubscribed'`)
- **Refunded**: **1** (Robotics: `status = 'refunded'` due to failed soft cap)

### 6. Conversion Exposure Card
Appears because the investor holds active convertible SPV equity units:
- **Total Reserved Units**: **350 units**
- Projects listed:
  - `QistPay GCC Embedded Credit Engine`: **250 units** (AED 25,000 holding)
  - `FalconShield Sovereign Cyber Defense`: **100 units** (AED 10,000 holding)

### 7. Repayments & Profit Distribution Panel
- Displays the informational notice regarding post-maturity yield and rental cash flows.

---

## Part 4: Verification SQL Query

Run this query in Supabase SQL Editor to cross-reference every UI metric directly against the database:

```sql
-- 1. Summary Strip & Concentration
SELECT
  COUNT(*) FILTER (WHERE pl.status = 'allocated') AS holdings_count,
  COALESCE(SUM(pl.allocated_amount) FILTER (WHERE pl.status = 'allocated'), 0) AS total_invested,
  COALESCE(SUM(pl.pledged_amount) FILTER (WHERE pl.status = 'pending'), 0) AS awaiting_allocation,
  ROUND(
    MAX(pl.allocated_amount) FILTER (WHERE pl.status = 'allocated') * 100.0 /
    NULLIF(SUM(pl.allocated_amount) FILTER (WHERE pl.status = 'allocated'), 0), 1
  ) AS largest_holding_pct
FROM public.pledges pl
JOIN public.projects pr ON pr.id = pl.project_id
WHERE pr.slug LIKE 'test-portfolio-%';

-- 2. Sharia Contract Breakdown
SELECT
  pr.sharia_contract_type,
  SUM(pl.allocated_amount) AS contract_total,
  ROUND(SUM(pl.allocated_amount) * 100.0 / SUM(SUM(pl.allocated_amount)) OVER (), 1) AS pct
FROM public.pledges pl
JOIN public.projects pr ON pr.id = pl.project_id
WHERE pr.slug LIKE 'test-portfolio-%' AND pl.status = 'allocated'
GROUP BY pr.sharia_contract_type
ORDER BY contract_total DESC;

-- 3. Outcomes Breakdown
SELECT
  COUNT(*) FILTER (WHERE pl.status = 'allocated' AND pl.allocated_amount >= pl.pledged_amount) AS fully_allocated,
  COUNT(*) FILTER (WHERE pl.status = 'allocated' AND pl.allocated_amount < pl.pledged_amount) AS partly_allocated,
  COUNT(*) FILTER (WHERE pl.status = 'rejected_oversubscribed') AS not_allocated,
  COUNT(*) FILTER (WHERE pl.status = 'refunded') AS refunded
FROM public.pledges pl
JOIN public.projects pr ON pr.id = pl.project_id
WHERE pr.slug LIKE 'test-portfolio-%';
```

---

## Part 5: How to Clean Up All Test Data

When you are done testing, you can delete all `test-portfolio-*` records:

### Option A: Supabase SQL Editor
Open and execute [`tests/portfolio/portfolio-test-cleanup.sql`](./portfolio-test-cleanup.sql).

### Option B: Terminal `curl`
```bash
curl -s -X POST "http://localhost:3000/api/internal/test-portfolio" \
  -H "Content-Type: application/json" \
  -d '{"action": "cleanup"}' | jq .
```

*Expected JSON output:*
```json
{
  "ok": true,
  "action": "cleanup",
  "deletedProjects": 12,
  "deletedPledges": 12,
  "message": "Successfully cleaned up all test-portfolio-* campaigns and pledges."
}
```

---

## Part 6: Technical Note — Why Manually Changing Status to 'Allocated' Shows Empty Data / 0%

When a pledge is created during an active campaign, its record in the database has:
- `pledged_amount = <amount>` (e.g. `100`)
- `allocated_amount = NULL`
- `allocated_units = NULL`
- `allocated_at = NULL`

If you manually execute:
```sql
UPDATE public.pledges SET status = 'allocated' WHERE id = ...;
```
Without running an official campaign close, **`allocated_amount` remains `NULL`**.

### The Mathematical Impact on the Portfolio Engine:
1. **Holdings Count Card**:
   Counts rows where `status IN ('allocated', 'active', 'completed')`. It finds 2 rows, so it displays **2**.
2. **Total Invested Card**:
   Sums `allocated_amount`. Since `allocated_amount` is `NULL`, `allocated_amount ?? 0` is `0`. The sum is **AED 0**.
3. **Largest Holding Card**:
   Calculates $(\text{maxHoldingAmount} / \text{totalInvested}) \times 100$. Because `totalInvested` is `0`, the division-by-zero protection returns **`0%`**.
4. **All Charts (Contracts, Projects, Timeline, Conversion)**:
   Charts aggregate capital strictly by `allocated_amount`. Since deployed capital is `0`, charts show "Not enough data yet" or empty bars.

### How Campaign Closing Resolves This:
When a campaign closes normally (via the `apply_project_close` database RPC or automated cron), the allocation engine executes:
```sql
UPDATE public.pledges
SET
  status = 'allocated',
  allocated_amount = pledged_amount, -- (or partial fill amount)
  allocated_units = pledged_units,
  allocated_at = now()
WHERE ...;
```
Setting `allocated_amount` populates the actual deployed capital, which powers the charts and percentage calculations.
