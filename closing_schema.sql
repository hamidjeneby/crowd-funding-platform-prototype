-- =============================================================================
-- Campaign Closing System — Schema Migration (closing_schema.sql)
-- Run this first in the Supabase SQL Editor before closing_function.sql.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. projects table additions
-- -----------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS allocation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS close_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allocated_total numeric,
  ADD COLUMN IF NOT EXISTS subscribed_total_at_close numeric,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS close_notifications_sent_at timestamptz;

-- Ensure allocation_status check constraint
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_allocation_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_allocation_status_check
  CHECK (allocation_status IN ('pending', 'running', 'complete'));

-- Ensure failure_reason check constraint
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_failure_reason_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_failure_reason_check
  CHECK (failure_reason IS NULL OR failure_reason IN ('soft_cap_not_met', 'no_pledges'));

-- If projects.status uses an enum type in Postgres, add 'closing', 'funded', 'failed'.
-- If projects.status uses a CHECK constraint, update it to include 'closing', 'funded', 'failed'.
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

  -- Drop any existing status CHECK constraint on projects so 'closing', 'funded', 'failed' are permitted
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
-- 2. pledges table additions & index
-- -----------------------------------------------------------------------------
ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS allocated_amount numeric,
  ADD COLUMN IF NOT EXISTS allocated_units integer,
  ADD COLUMN IF NOT EXISTS allocated_at timestamptz,
  ADD COLUMN IF NOT EXISTS allocation_rank integer,
  ADD COLUMN IF NOT EXISTS conversion_eligible_units integer,
  ADD COLUMN IF NOT EXISTS ownership_percentage numeric,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0;

-- Composite index on pledges (project_id, status) for fast campaign close queries
CREATE INDEX IF NOT EXISTS idx_pledges_project_id_status
  ON public.pledges (project_id, status);

-- -----------------------------------------------------------------------------
-- 3. wallet_transactions table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  investor_id bigint NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  pledge_id bigint REFERENCES public.pledges(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('pledge_debit', 'refund_credit', 'top_up')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index: UNIQUE (pledge_id, type) WHERE pledge_id IS NOT NULL
-- Prevents duplicate pledge_debit or refund_credit entries for the same pledge.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_pledge_type_unique
  ON public.wallet_transactions (pledge_id, type)
  WHERE pledge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_investor_id
  ON public.wallet_transactions (investor_id, created_at DESC);

-- Enable Row-Level Security on wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Revoke write privileges from anon and authenticated; service_role bypasses RLS
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM anon, authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;

-- SELECT-only RLS policy: Investor reads only their own wallet transactions
-- (Matches the ownership resolution logic in supabase_rls_pledges.sql)
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
-- 4. project_close_log table
-- -----------------------------------------------------------------------------
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

-- RLS enabled with no policies (service key / service_role access only)
ALTER TABLE public.project_close_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_close_log FROM anon, authenticated;

COMMIT;
