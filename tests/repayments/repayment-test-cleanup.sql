-- ==============================================================================
-- REPAYMENT SIMULATION ENGINE — TEST CLEANUP SCRIPT
-- ==============================================================================
-- Run this script in your Supabase SQL Editor to remove all test data created
-- by `tests/repayments/repayment-test-seed.sql` and any simulated repayments,
-- payout periods, and notifications.
--
-- Safe to re-run. Only targets rows where projects.slug LIKE 'test-repay-%'
-- and the synthetic secondary investor.
-- ==============================================================================

DO $$
DECLARE
  v_cleaned_projects   integer := 0;
  v_cleaned_periods    integer := 0;
  v_cleaned_repayments integer := 0;
  v_cleaned_pledges    integer := 0;
  v_cleaned_notifs     integer := 0;
BEGIN
  -- 1. Delete notifications created during simulation payouts
  WITH deleted_notifs AS (
    DELETE FROM public.notifications
    WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-repay-%')
    RETURNING id
  )
  SELECT count(*) INTO v_cleaned_notifs FROM deleted_notifs;

  -- 2. Delete repayments
  WITH deleted_reps AS (
    DELETE FROM public.repayments
    WHERE payout_period_id IN (
      SELECT id FROM public.payout_periods
      WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-repay-%')
    )
    RETURNING id
  )
  SELECT count(*) INTO v_cleaned_repayments FROM deleted_reps;

  -- 3. Delete payout periods
  WITH deleted_periods AS (
    DELETE FROM public.payout_periods
    WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-repay-%')
    RETURNING id
  )
  SELECT count(*) INTO v_cleaned_periods FROM deleted_periods;

  -- 4. Delete pledges
  WITH deleted_pledges AS (
    DELETE FROM public.pledges
    WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-repay-%')
    RETURNING id
  )
  SELECT count(*) INTO v_cleaned_pledges FROM deleted_pledges;

  -- 5. Delete SPV details
  DELETE FROM public.spv_details
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-repay-%');

  -- 6. Delete project milestones (if any were created)
  DELETE FROM public.project_milestones
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-repay-%');

  -- 7. Delete projects
  WITH deleted_projects AS (
    DELETE FROM public.projects
    WHERE slug LIKE 'test-repay-%'
    RETURNING id
  )
  SELECT count(*) INTO v_cleaned_projects FROM deleted_projects;

  -- 8. Clean up synthetic secondary test investor
  DELETE FROM public.investors
  WHERE email = 'test.repay.secondary@example.com'
     OR user_id = 'user_test_repay_secondary';

  DELETE FROM public.users
  WHERE user_id = 'user_test_repay_secondary';

  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'CLEANUP COMPLETED:';
  RAISE NOTICE '  Projects deleted      : %', v_cleaned_projects;
  RAISE NOTICE '  Pledges deleted       : %', v_cleaned_pledges;
  RAISE NOTICE '  Payout periods deleted: %', v_cleaned_periods;
  RAISE NOTICE '  Repayments deleted    : %', v_cleaned_repayments;
  RAISE NOTICE '  Notifications deleted : %', v_cleaned_notifs;
  RAISE NOTICE '====================================================================';
END $$;
