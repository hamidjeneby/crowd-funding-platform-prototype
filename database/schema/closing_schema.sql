-- =============================================================================
-- FILE: database/schema/closing_schema.sql
-- PURPOSE:
--   Schema migration for the Campaign Closing & Allocation System:
--     1. Adds closing lifecycle and summary columns to `public.projects`.
--     2. Updates `projects.status` enum/check constraints to allow `'closing'`,
--        `'funded'`, and `'failed'`.
--     3. Adds post-close allocation and refund columns + composite index to
--        `public.pledges`.
--     4. Creates `public.wallet_transactions` ledger table with idempotency
--        unique index and investor SELECT-only RLS policy.
--     5. Creates `public.project_close_log` audit table for closing runs.
--
-- HOW TO RUN:
--   Run this script in the Supabase SQL Editor BEFORE `database/rpc/closing_function.sql`.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. `public.projects` table additions & status constraint updates
-- -----------------------------------------------------------------------------
-- Adds columns to track:
--   - allocation_status: 'pending' | 'running' | 'complete' (idempotency state)
--   - closed_at: timestamp when the campaign was claimed/closed
--   - close_attempts: counter of how many times closing was attempted
--   - allocated_total: final sum of allocated pledge principal amounts
--   - subscribed_total_at_close: total eligible principal subscribed before cap
--   - failure_reason: 'soft_cap_not_met' | 'no_pledges' (null when funded)
--   - close_notifications_sent_at: idempotency timestamp for close notifications
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS allocation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allocated_total numeric,
  ADD COLUMN IF NOT EXISTS subscribed_total_at_close numeric,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS close_notifications_sent_at timestamptz;

-- Enforce valid values for `projects.allocation_status`
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_allocation_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_allocation_status_check
  CHECK (allocation_status IN ('pending', 'running', 'complete'));

-- Enforce valid values for `projects.failure_reason`
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_failure_reason_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_failure_reason_check
  CHECK (failure_reason IS NULL OR failure_reason IN ('soft_cap_not_met', 'no_pledges'));

-- Dynamically inspect `projects.status`:
--   - If `status` uses a custom PostgreSQL ENUM type, add 'closing', 'funded', and 'failed'.
--   - If `status` has a legacy CHECK constraint that restricts status values, drop it so
--     the closing engine can transition projects to 'closing', 'funded', and 'failed'.
DO $$
DECLARE
  v_udt_name text;
  v_constraint_name text;
BEGIN
  SELECT udt_name INTO v_udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'projects'
    AND column_name = 'status';

  IF v_udt_name IS NOT NULL AND v_udt_name NOT IN ('text', 'varchar', 'bpchar') THEN
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', v_udt_name, 'closing');
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', v_udt_name, 'funded');
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', v_udt_name, 'failed');
  END IF;

  FOR v_constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'projects'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
      AND con.conname <> 'projects_allocation_status_check'
  LOOP
    EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. `public.pledges` table additions & lookup index
-- -----------------------------------------------------------------------------
-- Adds columns populated when a campaign closes:
--   - allocated_amount: principal amount allocated to this pledge (0 if rejected/refunded)
--   - allocated_units: integer number of Sukuk/equity units allocated
--   - allocated_at: timestamp when allocation was finalized
--   - allocation_rank: 1-based priority rank used during Class 1->10 waterfall allocation
--   - conversion_eligible_units: final conversion units granted from the SPV conversion pool
--   - ownership_percentage: investor's SPV equity ownership percentage (for spv_equity projects)
--   - refunded_amount: total cash returned to investor's wallet (principal + fee on full refund)
ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS allocated_amount numeric,
  ADD COLUMN IF NOT EXISTS allocated_units integer,
  ADD COLUMN IF NOT EXISTS allocated_at timestamptz,
  ADD COLUMN IF NOT EXISTS allocation_rank integer,
  ADD COLUMN IF NOT EXISTS conversion_eligible_units integer,
  ADD COLUMN IF NOT EXISTS ownership_percentage numeric,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0;

-- Composite index on `(project_id, status)` to speed up fetching all 'pending'
-- pledges for a project during campaign closing and live raised-amount queries.
CREATE INDEX IF NOT EXISTS idx_pledges_project_id_status
  ON public.pledges (project_id, status);

-- -----------------------------------------------------------------------------
-- 3. `public.wallet_transactions` ledger table & RLS policy
-- -----------------------------------------------------------------------------
-- Immutable audit ledger recording every wallet balance change:
--   - 'pledge_debit': deducted when a pledge is submitted
--   - 'refund_credit': credited when a pledge is refunded/rejected or a failed debit is reversed
--   - 'top_up': credited when an investor adds funds to their wallet
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  investor_id bigint NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  pledge_id bigint REFERENCES public.pledges(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('pledge_debit', 'refund_credit', 'top_up')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  reference_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index on `(pledge_id, type) WHERE pledge_id IS NOT NULL`:
-- Ensures a given pledge can never be debited twice or refunded twice by
-- `apply_project_close` (`ON CONFLICT (pledge_id, type) WHERE pledge_id IS NOT NULL DO NOTHING`).
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_pledge_type_unique
  ON public.wallet_transactions (pledge_id, type)
  WHERE pledge_id IS NOT NULL;

-- Index for fast investor wallet history lookups sorted newest-first
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_investor_id
  ON public.wallet_transactions (investor_id, created_at DESC);

-- Enable Row-Level Security and restrict writes to `service_role` only
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM anon, authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;

-- SELECT-only RLS policy: allows an authenticated investor to view only their
-- own wallet transactions (matching by Clerk `sub` -> `investors.user_id` or `org_id`).
DROP POLICY IF EXISTS "investor_select_own_wallet_transactions" ON public.wallet_transactions;

CREATE POLICY "investor_select_own_wallet_transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.investors i
    WHERE i.id = wallet_transactions.investor_id
      AND (
        i.user_id = (auth.jwt()->>'sub')
        OR (
          (auth.jwt()->>'org_id') IS NOT NULL
          AND i.org_id = (auth.jwt()->>'org_id')
        )
      )
  )
);

-- -----------------------------------------------------------------------------
-- 4. `public.project_close_log` audit table
-- -----------------------------------------------------------------------------
-- Stores an execution log row for every campaign close run (started_at,
-- finished_at, outcome, error message, and full JSONB allocation summary).
CREATE TABLE IF NOT EXISTS public.project_close_log (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_id bigint NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  outcome text CHECK (outcome IN ('funded', 'failed', 'error')),
  error text,
  summary jsonb
);

CREATE INDEX IF NOT EXISTS idx_project_close_log_project_id
  ON public.project_close_log (project_id, started_at DESC);

-- Internal audit table: RLS enabled with no client policies (`service_role` only)
ALTER TABLE public.project_close_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_close_log FROM anon, authenticated;

COMMIT;
