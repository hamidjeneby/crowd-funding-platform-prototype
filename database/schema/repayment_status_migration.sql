-- =============================================================================
-- FILE: database/schema/repayment_status_migration.sql
-- PURPOSE:
--   Step 0 Migration for Repayment Simulation:
--   Ensures `projects.status` and `pledges.status` allow 'active' and 'completed',
--   and ensures `projects` has `funds_released_at` and `maturity_date` columns.
--
-- HOW TO RUN:
--   Run this in the Supabase SQL Editor BEFORE running `repayment_simulation.sql`.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Ensure `projects.status` permits 'active' and 'completed'
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_udt_name text;
  v_constraint_name text;
BEGIN
  -- If `projects.status` uses a custom PostgreSQL ENUM type, add 'active' and 'completed'
  SELECT udt_name INTO v_udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'projects'
    AND column_name = 'status';

  IF v_udt_name IS NOT NULL AND v_udt_name NOT IN ('text', 'varchar', 'bpchar') THEN
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', v_udt_name, 'active');
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', v_udt_name, 'completed');
  END IF;

  -- Drop any legacy CHECK constraints on `projects.status` that would restrict new values
  FOR v_constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'projects'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
      AND con.conname NOT IN ('projects_allocation_status_check', 'projects_failure_reason_check')
  LOOP
    EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Ensure `pledges.status` permits 'active' and 'completed'
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_udt_name text;
  v_constraint_name text;
BEGIN
  -- If `pledges.status` uses a custom PostgreSQL ENUM type, add 'active' and 'completed'
  SELECT udt_name INTO v_udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'pledges'
    AND column_name = 'status';

  IF v_udt_name IS NOT NULL AND v_udt_name NOT IN ('text', 'varchar', 'bpchar') THEN
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', v_udt_name, 'active');
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', v_udt_name, 'completed');
  END IF;

  -- Drop any legacy CHECK constraints on `pledges.status` that would restrict new values
  FOR v_constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'pledges'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.pledges DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Ensure required lifecycle columns exist on `projects` and `pledges`
-- -----------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS funds_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS maturity_date date;

ALTER TABLE public.pledges
  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz;

COMMIT;
