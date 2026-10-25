-- =============================================================================
-- FILE: database/rpc/closing_function.sql
-- PURPOSE:
--   Defines the PostgreSQL RPC functions used by the Campaign Closing Engine:
--     1. `public.apply_project_close(p_project_id, p_results, p_project)`
--        Atomically applies calculated pledge allocations, credits wallet refunds,
--        inserts `wallet_transactions` ledger rows, updates the `projects` row to
--        `'funded'` or `'failed'`, and completes the `'campaign_funded'` system
--        milestone inside a single database transaction.
--     2. `public.claim_overdue_projects_for_closing()`
--        Atomically claims all expired `'campaign_live'` projects (or stale
--        `'closing'` projects stuck > 15 minutes) for the batch cron route.
--     3. `public.claim_single_project_for_closing(p_project_id)`
--        Atomically claims one specific expired project for the worker route.
--
-- HOW TO RUN:
--   Run this in the Supabase SQL Editor AFTER `database/schema/closing_schema.sql`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RPC 1: `public.apply_project_close`
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_project_close(
  p_project_id bigint,
  p_results jsonb,
  p_project jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project record;
  v_item jsonb;
  v_pledge_id bigint;
  v_investor_id bigint;
  v_pledge_status text;
  v_allocated_amount numeric;
  v_allocated_units integer;
  v_allocation_rank integer;
  v_conversion_eligible_units integer;
  v_ownership_percentage numeric;
  v_refunded_amount numeric;
  v_current_balance numeric;
  v_new_balance numeric;
  v_tx_id bigint;
  v_project_status text;
  v_allocated_total numeric;
  v_subscribed_total_at_close numeric;
  v_failure_reason text;
  v_pledges_updated integer := 0;
  v_refunds_processed integer := 0;
  v_total_refunded numeric := 0;
  v_rows_affected integer := 0;
BEGIN
  -- Step 1: Acquire a row-level lock (`FOR UPDATE`) on the target project row
  -- so no concurrent worker can modify or close the same project simultaneously.
  SELECT *
  INTO v_project
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project % not found', p_project_id;
  END IF;

  -- Idempotency check: if `allocation_status` is already `'complete'`, return
  -- immediately without re-applying allocations or double-crediting refunds.
  IF v_project.allocation_status = 'complete' THEN
    RETURN jsonb_build_object(
      'already_complete', true,
      'project_id', p_project_id,
      'status', v_project.status,
      'allocation_status', v_project.allocation_status
    );
  END IF;

  -- Step 2: Iterate over each computed pledge outcome in `p_results` JSONB array
  IF p_results IS NOT NULL AND jsonb_typeof(p_results) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_results)
    LOOP
      v_pledge_id := (v_item->>'pledge_id')::bigint;
      IF v_pledge_id IS NULL THEN
        v_pledge_id := (v_item->>'id')::bigint;
      END IF;

      v_pledge_status := v_item->>'status';
      v_allocated_amount := COALESCE((v_item->>'allocated_amount')::numeric, 0);
      v_allocated_units := (v_item->>'allocated_units')::integer;
      v_allocation_rank := (v_item->>'allocation_rank')::integer;
      v_conversion_eligible_units := (v_item->>'conversion_eligible_units')::integer;
      v_ownership_percentage := (v_item->>'ownership_percentage')::numeric;
      v_refunded_amount := COALESCE((v_item->>'refunded_amount')::numeric, 0);

      -- Update the pledge row ONLY if its current status is still `'pending'`.
      -- This prevents overwriting a pledge that was already processed.
      UPDATE public.pledges
      SET
        status = v_pledge_status,
        allocated_amount = v_allocated_amount,
        allocated_units = v_allocated_units,
        allocated_at = now(),
        allocation_rank = v_allocation_rank,
        conversion_eligible_units = v_conversion_eligible_units,
        ownership_percentage = v_ownership_percentage,
        refunded_amount = v_refunded_amount
      WHERE id = v_pledge_id
        AND project_id = p_project_id
        AND status = 'pending'
      RETURNING investor_id INTO v_investor_id;

      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

      IF v_rows_affected > 0 THEN
        v_pledges_updated := v_pledges_updated + 1;

        -- Step 3: If this pledge has a positive refund (`refunded` or `rejected_oversubscribed`),
        -- lock the investor row, record a `refund_credit` ledger entry, and credit `wallet_balance`.
        IF v_refunded_amount > 0 AND v_investor_id IS NOT NULL THEN
          SELECT wallet_balance
          INTO v_current_balance
          FROM public.investors
          WHERE id = v_investor_id
          FOR UPDATE;

          v_new_balance := COALESCE(v_current_balance, 0) + v_refunded_amount;
          v_tx_id := NULL;

          -- Insert `refund_credit` into `wallet_transactions`.
          -- `ON CONFLICT (pledge_id, type) WHERE pledge_id IS NOT NULL DO NOTHING`
          -- guarantees a pledge can never be refunded more than once.
          INSERT INTO public.wallet_transactions (
            investor_id,
            pledge_id,
            type,
            amount,
            balance_after,
            reference_code
          )
          VALUES (
            v_investor_id,
            v_pledge_id,
            'refund_credit',
            v_refunded_amount,
            v_new_balance,
            'TXN-REF-' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6))
          )
          ON CONFLICT (pledge_id, type) WHERE pledge_id IS NOT NULL DO NOTHING
          RETURNING id INTO v_tx_id;

          -- Only increment `investors.wallet_balance` if the ledger row was newly inserted
          IF v_tx_id IS NOT NULL THEN
            UPDATE public.investors
            SET wallet_balance = v_new_balance
            WHERE id = v_investor_id;

            v_refunds_processed := v_refunds_processed + 1;
            v_total_refunded := v_total_refunded + v_refunded_amount;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Step 4: Finalize the `projects` row status ('funded' or 'failed') and mark
  -- `allocation_status = 'complete'`.
  v_project_status := p_project->>'status';
  IF v_project_status NOT IN ('funded', 'failed') THEN
    RAISE EXCEPTION 'Invalid target project status in apply_project_close: %', v_project_status;
  END IF;

  v_allocated_total := COALESCE((p_project->>'allocated_total')::numeric, 0);
  v_subscribed_total_at_close := COALESCE((p_project->>'subscribed_total_at_close')::numeric, 0);
  v_failure_reason := p_project->>'failure_reason';

  UPDATE public.projects
  SET
    status = v_project_status,
    allocation_status = 'complete',
    allocated_total = v_allocated_total,
    subscribed_total_at_close = v_subscribed_total_at_close,
    failure_reason = v_failure_reason,
    closed_at = COALESCE(closed_at, now())
  WHERE id = p_project_id;

  -- Step 5: If the project succeeded ('funded'), automatically mark its system
  -- milestone `'campaign_funded'` as `'complete'`.
  IF v_project_status = 'funded' THEN
    UPDATE public.project_milestones
    SET status = 'complete'
    WHERE project_id = p_project_id
      AND milestone_source = 'system'
      AND linked_system_event = 'campaign_funded';
  END IF;

  -- Step 6: Return a structured JSONB summary of all updates performed
  RETURN jsonb_build_object(
    'already_complete', false,
    'project_id', p_project_id,
    'status', v_project_status,
    'allocation_status', 'complete',
    'allocated_total', v_allocated_total,
    'subscribed_total_at_close', v_subscribed_total_at_close,
    'failure_reason', v_failure_reason,
    'pledges_updated', v_pledges_updated,
    'refunds_processed', v_refunds_processed,
    'total_refunded', v_total_refunded
  );
END;
$$;

-- Restrict execution of `apply_project_close` to `service_role` only
REVOKE EXECUTE ON FUNCTION public.apply_project_close(bigint, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_project_close(bigint, jsonb, jsonb) TO service_role;

-- -----------------------------------------------------------------------------
-- RPC 2: `public.claim_overdue_projects_for_closing`
-- -----------------------------------------------------------------------------
-- Atomically transitions all overdue `'campaign_live'` projects (where
-- `campaign_end_date <= now()`) or stalled `'closing'` projects (where
-- `allocation_status <> 'complete'` and `closed_at <= now() - interval '15 minutes'`)
-- into `status = 'closing'` and increments `close_attempts`.
CREATE OR REPLACE FUNCTION public.claim_overdue_projects_for_closing()
RETURNS TABLE (
  id bigint,
  title text,
  status text,
  allocation_status text,
  closed_at timestamptz,
  close_attempts integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.projects AS p
  SET
    status = 'closing',
    closed_at = now(),
    close_attempts = COALESCE(p.close_attempts, 0) + 1
  WHERE
    (
      p.status = 'campaign_live'
      AND p.campaign_end_date IS NOT NULL
      AND p.campaign_end_date <= now()
    )
    OR (
      p.status = 'closing'
      AND COALESCE(p.allocation_status, 'pending') <> 'complete'
      AND (p.closed_at IS NULL OR p.closed_at <= now() - interval '15 minutes')
    )
  RETURNING
    p.id,
    p.title,
    p.status,
    p.allocation_status,
    p.closed_at,
    p.close_attempts;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_overdue_projects_for_closing() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_overdue_projects_for_closing() TO service_role;

-- -----------------------------------------------------------------------------
-- RPC 3: `public.claim_single_project_for_closing`
-- -----------------------------------------------------------------------------
-- Atomically claims a single overdue `'campaign_live'` project (or stalled
-- `'closing'` project) by ID (`p_project_id`) for `/api/internal/close-project`.
CREATE OR REPLACE FUNCTION public.claim_single_project_for_closing(p_project_id bigint)
RETURNS TABLE (
  id bigint,
  title text,
  status text,
  allocation_status text,
  closed_at timestamptz,
  close_attempts integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.projects AS p
  SET
    status = 'closing',
    closed_at = now(),
    close_attempts = COALESCE(p.close_attempts, 0) + 1
  WHERE p.id = p_project_id
    AND (
      (
        p.status = 'campaign_live'
        AND p.campaign_end_date IS NOT NULL
        AND p.campaign_end_date <= now()
      )
      OR (
        p.status = 'closing'
        AND COALESCE(p.allocation_status, 'pending') <> 'complete'
        AND (p.closed_at IS NULL OR p.closed_at <= now() - interval '15 minutes')
      )
    )
  RETURNING
    p.id,
    p.title,
    p.status,
    p.allocation_status,
    p.closed_at,
    p.close_attempts;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_single_project_for_closing(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_single_project_for_closing(bigint) TO service_role;
