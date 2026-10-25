-- =============================================================================
-- Repayment simulation: tables, RLS, and the payment function
-- Run in the Supabase SQL editor, in order. Safe to re-run.
-- Writes happen server-side only (service key). Clients get SELECT only.
-- =============================================================================

-- STEP 0 (check first, no changes): which status values are allowed today?
-- The simulation needs projects.status to allow 'active' and 'completed', and
-- pledges.status to allow 'active' and 'completed'. If either is missing, tell
-- me before continuing and we add them.
SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.projects'::regclass, 'public.pledges'::regclass)
  AND contype = 'c';

SELECT t.typname, e.enumlabel
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname ILIKE '%status%'
ORDER BY t.typname, e.enumsortorder;

-- STEP 1: columns the simulation relies on (no-ops if they already exist)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS funds_released_at timestamptz;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS maturity_date date;
ALTER TABLE public.pledges  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz;

-- STEP 2: payout_periods (one row per payment period of a project)
-- Fixed types (murabaha, ijara): all periods created at fund release.
-- Mudarabah: one reporting period per reporting date, amount reported by the issuer.
-- SPV equity: rows created when the issuer declares a dividend or records an exit.
CREATE TABLE IF NOT EXISTS public.payout_periods (
  id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id              bigint NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_no               integer NOT NULL CHECK (period_no > 0),
  kind                    text NOT NULL CHECK (kind IN ('profit','rent','profit_share','dividend','exit')),
  due_date                timestamptz,
  status                  text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','reported','paid')),
  is_final                boolean NOT NULL DEFAULT false,
  -- what the issuer reported: mudarabah profit, equity dividend total, exit proceeds,
  -- or ijara third-party sale proceeds
  reported_amount         numeric(18,2) CHECK (reported_amount IS NULL OR reported_amount >= 0),
  -- mudarabah final period only: share of capital returned (100 = full, lower = loss case)
  capital_return_percent  numeric(5,2) CHECK (capital_return_percent IS NULL OR (capital_return_percent >= 0 AND capital_return_percent <= 100)),
  notes                   text,
  reported_at             timestamptz,
  reported_by             text,
  total_paid              numeric(18,2),
  paid_at                 timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, period_no)
);
CREATE INDEX IF NOT EXISTS idx_payout_periods_project_status ON public.payout_periods (project_id, status);

-- STEP 3: repayments (one row per pledge per payment line)
CREATE TABLE IF NOT EXISTS public.repayments (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payout_period_id   bigint NOT NULL REFERENCES public.payout_periods(id) ON DELETE CASCADE,
  pledge_id          bigint NOT NULL REFERENCES public.pledges(id),
  investor_id        bigint NOT NULL REFERENCES public.investors(id),
  type               text NOT NULL CHECK (type IN ('profit','principal','rent','dividend','capital_return','sale_proceeds')),
  amount             numeric(18,2) NOT NULL CHECK (amount >= 0),
  status             text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','processing','paid','failed')),
  paid_at            timestamptz,
  payment_reference  text,      -- simulated bank reference, e.g. SIM-000123
  bank_last4         text,      -- masked destination only, never the full account
  failure_reason     text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payout_period_id, pledge_id, type)   -- makes a double payment impossible
);
CREATE INDEX IF NOT EXISTS idx_repayments_investor ON public.repayments (investor_id);
CREATE INDEX IF NOT EXISTS idx_repayments_pledge   ON public.repayments (pledge_id);

-- STEP 4: RLS. SELECT only. All writes are server-side with the service key.
ALTER TABLE public.payout_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayments     ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.payout_periods FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.repayments     FROM anon, authenticated;
GRANT SELECT ON public.payout_periods TO authenticated;
GRANT SELECT ON public.repayments     TO authenticated;

DROP POLICY IF EXISTS "investors_select_project_payout_periods" ON public.payout_periods;
DROP POLICY IF EXISTS "issuers_select_own_payout_periods"       ON public.payout_periods;
DROP POLICY IF EXISTS "investors_select_own_repayments"         ON public.repayments;

-- Investors can see the periods of projects they hold a pledge in
CREATE POLICY "investors_select_project_payout_periods"
ON public.payout_periods FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pledges p
    JOIN public.investors i ON i.id = p.investor_id
    WHERE p.project_id = public.payout_periods.project_id
      AND p.status IN ('allocated','active','completed')
      AND (
        i.user_id = (auth.jwt()->>'sub')
        OR ((auth.jwt()->>'org_id') IS NOT NULL AND i.org_id = (auth.jwt()->>'org_id'))
      )
  )
);

-- Issuers can see the periods of their own projects (totals only, no investor rows).
-- Same org_id pattern as the pledges policies. If the Clerk JWT has no org_id claim yet,
-- issuer pages must read this through the server instead.
CREATE POLICY "issuers_select_own_payout_periods"
ON public.payout_periods FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects pr
    JOIN public.issuers s ON s.id = pr.issuer_id
    WHERE pr.id = public.payout_periods.project_id
      AND (auth.jwt()->>'org_id') IS NOT NULL
      AND s.org_id = (auth.jwt()->>'org_id')
  )
);

-- Investors see only their own repayment rows. Issuers get NO policy on repayments:
-- per-investor payments must never be visible to them.
CREATE POLICY "investors_select_own_repayments"
ON public.repayments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.investors i
    WHERE i.id = public.repayments.investor_id
      AND (
        i.user_id = (auth.jwt()->>'sub')
        OR ((auth.jwt()->>'org_id') IS NOT NULL AND i.org_id = (auth.jwt()->>'org_id'))
      )
  )
);

-- STEP 5: payment function. One transaction per period. Service role only.
-- p_rows: array of {pledge_id, investor_id, type, amount, status ('paid'|'failed'),
--                   payment_reference, bank_last4, failure_reason}
-- Re-running it never pays twice: paid rows are left alone, failed rows can be retried.
-- The period becomes 'paid' only when every repayment row of the period is paid.
-- On the final period it also completes the holdings and the project.
CREATE OR REPLACE FUNCTION public.apply_payout_period(p_period_id bigint, p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period        record;
  v_item          jsonb;
  v_status        text;
  v_pledge_id     bigint;
  v_investor_id   bigint;
  v_rc            integer;
  v_paid_count    integer := 0;
  v_failed_count  integer := 0;
  v_total         numeric := 0;
  v_all_paid      boolean;
BEGIN
  SELECT * INTO v_period FROM public.payout_periods WHERE id = p_period_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout period % not found', p_period_id;
  END IF;

  IF v_period.status = 'paid' THEN
    RETURN jsonb_build_object('already_paid', true, 'period_id', p_period_id, 'period_status', 'paid');
  END IF;

  IF p_rows IS NOT NULL AND jsonb_typeof(p_rows) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
      v_status := v_item->>'status';
      IF v_status NOT IN ('paid', 'failed') THEN
        RAISE EXCEPTION 'Invalid repayment status %', v_status;
      END IF;

      v_pledge_id   := (v_item->>'pledge_id')::bigint;
      v_investor_id := (v_item->>'investor_id')::bigint;

      -- the pledge must be a held position in THIS project
      IF NOT EXISTS (
        SELECT 1 FROM public.pledges
        WHERE id = v_pledge_id
          AND project_id = v_period.project_id
          AND investor_id = v_investor_id
          AND status IN ('allocated', 'active', 'completed')
      ) THEN
        RAISE EXCEPTION 'Pledge % is not a holding of project %', v_pledge_id, v_period.project_id;
      END IF;

      INSERT INTO public.repayments (
        payout_period_id, pledge_id, investor_id, type, amount,
        status, paid_at, payment_reference, bank_last4, failure_reason
      )
      VALUES (
        p_period_id, v_pledge_id, v_investor_id, v_item->>'type', (v_item->>'amount')::numeric,
        v_status,
        CASE WHEN v_status = 'paid' THEN now() ELSE NULL END,
        v_item->>'payment_reference', v_item->>'bank_last4', v_item->>'failure_reason'
      )
      ON CONFLICT (payout_period_id, pledge_id, type) DO UPDATE
        SET amount            = EXCLUDED.amount,
            status            = EXCLUDED.status,
            paid_at           = EXCLUDED.paid_at,
            payment_reference = EXCLUDED.payment_reference,
            bank_last4        = EXCLUDED.bank_last4,
            failure_reason    = EXCLUDED.failure_reason
        WHERE public.repayments.status <> 'paid';

      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc > 0 THEN
        IF v_status = 'paid' THEN
          v_paid_count := v_paid_count + 1;
        ELSE
          v_failed_count := v_failed_count + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.repayments WHERE payout_period_id = p_period_id AND status <> 'paid'
  ) INTO v_all_paid;

  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.repayments WHERE payout_period_id = p_period_id AND status = 'paid';

  IF v_all_paid THEN
    UPDATE public.payout_periods
       SET status = 'paid', paid_at = now(), total_paid = v_total
     WHERE id = p_period_id;

    IF v_period.is_final THEN
      UPDATE public.pledges
         SET status = 'completed', redeemed_at = now()
       WHERE project_id = v_period.project_id AND status IN ('allocated', 'active');

      UPDATE public.projects SET status = 'completed' WHERE id = v_period.project_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'already_paid', false,
    'period_id', p_period_id,
    'period_status', CASE WHEN v_all_paid THEN 'paid' ELSE v_period.status END,
    'paid_count', v_paid_count,
    'failed_count', v_failed_count,
    'total_paid', v_total,
    'final', v_period.is_final AND v_all_paid
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_payout_period(bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_payout_period(bigint, jsonb) TO service_role;