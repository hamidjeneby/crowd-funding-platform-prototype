-- =============================================================================
-- FILE: database/schema/class_limits_backstop.sql
-- PURPOSE:
--   Database-level backstop enforcing the Class 9 and Class 10 investor pledge
--   limits against concurrent race conditions:
--     1. Class 10: at most 1 open ('pending') pledge at a time across all projects.
--     2. Class 9 & Class 10: at most 1 campaign pledge per UTC calendar quarter
--        (where status is 'pending', 'allocated', 'active', or 'completed').
--
-- HOW TO RUN:
--   Run each step in order in the Supabase SQL Editor. All DDL statements use
--   IF NOT EXISTS, so re-running this script is safe and idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Add stored generated column `pledge_quarter` on `public.pledges`
-- -----------------------------------------------------------------------------
-- Computes the first day of the UTC calendar quarter (Jan 1, Apr 1, Jul 1, Oct 1)
-- from `pledged_at` converted to UTC. Stored physically so it can be indexed in
-- a B-tree unique index.
ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS pledge_quarter date
  GENERATED ALWAYS AS ((date_trunc('quarter', pledged_at AT TIME ZONE 'UTC'))::date) STORED;

-- -----------------------------------------------------------------------------
-- STEP 2: Pre-flight diagnostic queries (verify no existing violations)
-- -----------------------------------------------------------------------------
-- Query 2A: Finds any Class 10 investor who currently has more than 1 'pending'
-- pledge. Must return ZERO rows before creating `uniq_class10_one_active_pledge`.
SELECT investor_id, count(*) AS pending_count
FROM public.pledges
WHERE investor_class_at_pledge = 10 AND status = 'pending'
GROUP BY investor_id HAVING count(*) > 1;

-- Query 2B: Finds any Class 9 or Class 10 investor who has more than 1 counted
-- pledge ('pending', 'allocated', 'active', 'completed') in the same UTC quarter.
-- Must return ZERO rows before creating `uniq_class9_10_one_pledge_per_quarter`.
SELECT investor_id, pledge_quarter, count(*) AS pledges_in_quarter
FROM public.pledges
WHERE investor_class_at_pledge IN (9, 10)
  AND status IN ('pending', 'allocated', 'active', 'completed')
GROUP BY investor_id, pledge_quarter HAVING count(*) > 1;
-- If either query above returns rows, cancel or clean up the duplicate test pledges first.

-- -----------------------------------------------------------------------------
-- STEP 3: Create partial unique indexes (concurrency backstop)
-- -----------------------------------------------------------------------------
-- Index 3A (`uniq_class10_one_active_pledge`):
-- Guarantees at the database level that a Class 10 investor can only have one
-- row with `status = 'pending'` at any moment. Once the pledge transitions to
-- 'allocated', 'rejected_oversubscribed', 'refunded', or 'cancelled', it leaves
-- this partial index and frees the open-pledge slot.
-- When violated by concurrent requests, Postgres raises SQLSTATE 23505, which
-- `createPledge` maps to code `OPEN_PLEDGE_LIMIT`.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_class10_one_active_pledge
ON public.pledges (investor_id)
WHERE investor_class_at_pledge = 10
  AND status = 'pending';

-- Index 3B (`uniq_class9_10_one_pledge_per_quarter`):
-- Guarantees at the database level that a Class 9 or Class 10 investor can only
-- have one counted pledge per `(investor_id, pledge_quarter)`.
-- Pledges with status 'cancelled', 'refunded', or 'rejected_oversubscribed' are
-- excluded from the index predicate so they do not consume the investor's quarter.
-- When violated by concurrent requests, Postgres raises SQLSTATE 23505, which
-- `createPledge` maps to code `QUARTER_LIMIT`.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_class9_10_one_pledge_per_quarter
ON public.pledges (investor_id, pledge_quarter)
WHERE investor_class_at_pledge IN (9, 10)
  AND status IN ('pending', 'allocated', 'active', 'completed');

-- -----------------------------------------------------------------------------
-- STEP 4: Verification query
-- -----------------------------------------------------------------------------
-- Confirms that both partial unique indexes exist on `public.pledges`.
-- Expected output: 2 rows (`uniq_class10_one_active_pledge`, `uniq_class9_10_one_pledge_per_quarter`).
SELECT indexname
FROM pg_indexes
WHERE tablename = 'pledges'
  AND indexname IN ('uniq_class10_one_active_pledge', 'uniq_class9_10_one_pledge_per_quarter');
