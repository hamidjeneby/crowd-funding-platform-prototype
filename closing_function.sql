-- =============================================================================
-- Campaign Closing System — Transactional Close Function (closing_function.sql)
-- Run this second in the Supabase SQL Editor after closing_schema.sql.
-- =============================================================================

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
  -- 1. Lock the project row for this transaction
  SELECT *
  INTO v_project
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project % not found', p_project_id;
  END IF;

  -- Idempotency guard: if already complete, do nothing
  IF v_project.allocation_status = 'complete' THEN
    RETURN jsonb_build_object(
      'already_complete', true,
      'project_id', p_project_id,
      'status', v_project.status,
      'allocation_status', v_project.allocation_status
    );
  END IF;

  -- 2. Process each pledge result
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

      -- Update pledge only where status is still 'pending'
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

        -- 3. Process refund if refunded_amount > 0
        IF v_refunded_amount > 0 AND v_investor_id IS NOT NULL THEN
          -- Lock the investor row to compute accurate balance_after
          SELECT wallet_balance
          INTO v_current_balance
          FROM public.investors
          WHERE id = v_investor_id
          FOR UPDATE;

          v_new_balance := COALESCE(v_current_balance, 0) + v_refunded_amount;
          v_tx_id := NULL;

          INSERT INTO public.wallet_transactions (
            investor_id,
            pledge_id,
            type,
            amount,
            balance_after
          )
          VALUES (
            v_investor_id,
            v_pledge_id,
            'refund_credit',
            v_refunded_amount,
            v_new_balance
          )
          ON CONFLICT (pledge_id, type) WHERE pledge_id IS NOT NULL DO NOTHING
          RETURNING id INTO v_tx_id;

          -- Only increment wallet_balance if the ledger row was newly inserted
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

  -- 4. Update the project row from p_project
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

  -- 5. If funded, mark the system milestone 'campaign_funded' as complete
  IF v_project_status = 'funded' THEN
    UPDATE public.project_milestones
    SET status = 'complete'
    WHERE project_id = p_project_id
      AND milestone_source = 'system'
      AND linked_system_event = 'campaign_funded';
  END IF;

  -- 6. Return summary jsonb
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

-- Security: service_role only
REVOKE EXECUTE ON FUNCTION public.apply_project_close(bigint, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_project_close(bigint, jsonb, jsonb) TO service_role;

-- -----------------------------------------------------------------------------
-- Atomic Claim Helper Functions for Cron & Worker Routes
-- -----------------------------------------------------------------------------

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

