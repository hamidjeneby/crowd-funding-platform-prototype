-- ==============================================================================
-- FILE: tests/pledge-limits/pledge-limits-test-seed.sql
-- PURPOSE:
--   Seeds isolated test data for verifying Class 9 and Class 10 pledge limits
--   (Tests 1–11 in `tests/pledge-limits/README.md`).
--   Creates:
--     1. 4 synthetic test users in `public.users` (`user_test_limits_c10`, `c9`, `c7`, `c8`)
--     2. 4 synthetic test investors in `public.investors` (Classes 10, 9, 7, 8)
--     3. 3 live test campaigns in `public.projects` (`test-limit-project-a`, `b`, `c`)
--        configured with `target_goal = 25,000,000` (visible to Classes 9 and 10)
--        and `min_investment_floor = 100`.
--
-- HOW TO RUN:
--   Run in the Supabase SQL Editor AFTER running `database/schema/class_limits_backstop.sql`.
--   To clean up all rows created by this script, run `tests/pledge-limits/pledge-limits-test-cleanup.sql`.
-- ==============================================================================

DO $$
DECLARE
  v_issuer_id bigint;
  v_inv_c10   bigint;
  v_inv_c9    bigint;
  v_inv_c7    bigint;
  v_inv_c8    bigint;
  v_proj_a    bigint;
  v_proj_b    bigint;
  v_proj_c    bigint;
BEGIN
  -- ----------------------------------------------------------------------------
  -- 1. Resolve an existing issuer ID to own the 3 synthetic test campaigns
  -- ----------------------------------------------------------------------------
  SELECT id INTO v_issuer_id
  FROM public.issuers
  ORDER BY id DESC
  LIMIT 1;

  IF v_issuer_id IS NULL THEN
    RAISE EXCEPTION 'No issuer found in public.issuers.';
  END IF;

  -- ----------------------------------------------------------------------------
  -- 2. Pre-clean any existing `test.limits.*` / `test-limit-*` rows so this
  --    seed script can be safely re-run at any time without duplicate key errors
  -- ----------------------------------------------------------------------------
  -- Delete wallet ledger entries for test investors or test project pledges
  DELETE FROM public.wallet_transactions
  WHERE investor_id IN (SELECT id FROM public.investors WHERE email LIKE 'test.limits.%@example.com')
     OR pledge_id IN (
       SELECT pl.id FROM public.pledges pl
       JOIN public.projects pr ON pr.id = pl.project_id
       WHERE pr.slug LIKE 'test-limit-%'
     );

  -- Delete closing audit logs for test projects
  DELETE FROM public.project_close_log
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%');

  -- Delete investor notifications for test projects or test investors
  DELETE FROM public.notifications
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%')
     OR investor_id IN (SELECT id FROM public.investors WHERE email LIKE 'test.limits.%@example.com');

  -- Delete issuer notifications pointing to test projects
  DELETE FROM public.issuer_notifications
  WHERE action_url LIKE '/issuer-portal/projects/test-limit-%';

  -- Delete notification subscriptions for test projects
  DELETE FROM public.project_notification_subscriptions
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%');

  -- Delete subscription agreement document records for test pledges
  DELETE FROM public.pledge_docs
  WHERE pledge_id IN (
    SELECT pl.id FROM public.pledges pl
    JOIN public.projects pr ON pr.id = pl.project_id
    WHERE pr.slug LIKE 'test-limit-%'
  );

  -- Delete test pledges
  DELETE FROM public.pledges
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%')
     OR investor_id IN (SELECT id FROM public.investors WHERE email LIKE 'test.limits.%@example.com');

  -- Delete system/custom milestones for test projects
  DELETE FROM public.project_milestones
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%');

  -- Delete SPV details for test projects
  DELETE FROM public.spv_details
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%');

  -- Delete the test projects themselves
  DELETE FROM public.projects
  WHERE slug LIKE 'test-limit-%';

  -- Delete the synthetic test investors and users
  DELETE FROM public.investors
  WHERE email LIKE 'test.limits.%@example.com';

  DELETE FROM public.users
  WHERE user_id LIKE 'user_test_limits_%';

  -- ----------------------------------------------------------------------------
  -- 3. Insert synthetic user rows into `public.users`
  -- ----------------------------------------------------------------------------
  INSERT INTO public.users (user_id, email, first_name, last_name, role)
  VALUES
    ('user_test_limits_c10', 'test.limits.c10@example.com', 'Test', 'LimitClass10', 'investor'),
    ('user_test_limits_c9',  'test.limits.c9@example.com',  'Test', 'LimitClass9',  'investor'),
    ('user_test_limits_c7',  'test.limits.c7@example.com',  'Test', 'LimitClass7',  'investor'),
    ('user_test_limits_c8',  'test.limits.c8@example.com',  'Test', 'LimitClass8',  'investor')
  ON CONFLICT (user_id) DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- 4. Insert synthetic investor rows into `public.investors`
  -- ----------------------------------------------------------------------------
  -- Class 10 investor (Tests 1, 2, 3, 4, 7, 11)
  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_limits_c10', 'test.limits.c10@example.com', 'Test Investor Class 10', 'individual', 'approved', 10, 10000)
  RETURNING id INTO v_inv_c10;

  -- Class 9 investor (Tests 5, 6)
  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_limits_c9', 'test.limits.c9@example.com', 'Test Investor Class 9', 'individual', 'approved', 9, 10000)
  RETURNING id INTO v_inv_c9;

  -- Class 7 investor (Test 8: downgraded to Class 9 after placing 2 pending pledges)
  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_limits_c7', 'test.limits.c7@example.com', 'Test Investor Class 7', 'individual', 'approved', 7, 100000)
  RETURNING id INTO v_inv_c7;

  -- Class 8 investor (Test 10: unaffected by Class 9/10 limits)
  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_limits_c8', 'test.limits.c8@example.com', 'Test Investor Class 8', 'individual', 'approved', 8, 100000)
  RETURNING id INTO v_inv_c8;

  -- ----------------------------------------------------------------------------
  -- 5. Insert 3 live test campaigns visible to Classes 7, 8, 9, and 10
  --    (`target_goal = 25,000,000` > Class 10 `minTargetGoal` of 20,000,000;
  --     `min_eligible_investor_class = 10`; `min_investment_floor = 100`)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type,
    currency, target_goal, soft_cap, hard_cap, min_investment_floor, unit_price, unit_type,
    min_eligible_investor_class, campaign_end_date, is_spv, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Limit Project A', 'test-limit-project-a',
    'Live campaign A for testing Class 9 and 10 pledge limits', 'campaign_live', 'murabaha',
    'AED', 25000000, 100, 25000000, 100, 100, 'sukuk',
    10, now() + interval '7 days', false, 'pending'
  ) RETURNING id INTO v_proj_a;

  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type,
    currency, target_goal, soft_cap, hard_cap, min_investment_floor, unit_price, unit_type,
    min_eligible_investor_class, campaign_end_date, is_spv, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Limit Project B', 'test-limit-project-b',
    'Live campaign B for testing Class 9 and 10 pledge limits', 'campaign_live', 'murabaha',
    'AED', 25000000, 100, 25000000, 100, 100, 'sukuk',
    10, now() + interval '7 days', false, 'pending'
  ) RETURNING id INTO v_proj_b;

  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type,
    currency, target_goal, soft_cap, hard_cap, min_investment_floor, unit_price, unit_type,
    min_eligible_investor_class, campaign_end_date, is_spv, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Limit Project C', 'test-limit-project-c',
    'Live campaign C for testing Class 9 and 10 pledge limits', 'campaign_live', 'murabaha',
    'AED', 25000000, 100, 25000000, 100, 100, 'sukuk',
    10, now() + interval '7 days', false, 'pending'
  ) RETURNING id INTO v_proj_c;

  RAISE NOTICE 'Seeded: Class10=% Class9=% Class7=% Class8=% | ProjectA=% ProjectB=% ProjectC=%',
    v_inv_c10, v_inv_c9, v_inv_c7, v_inv_c8, v_proj_a, v_proj_b, v_proj_c;
END $$;

-- ------------------------------------------------------------------------------
-- 6. Output the newly created Investor IDs and Project IDs for curl test commands
-- ------------------------------------------------------------------------------
SELECT 'investor' AS kind, id, email AS identifier, investor_class, wallet_balance
FROM public.investors
WHERE email LIKE 'test.limits.%@example.com'
UNION ALL
SELECT 'project' AS kind, id, slug AS identifier, min_eligible_investor_class AS investor_class, target_goal AS wallet_balance
FROM public.projects
WHERE slug LIKE 'test-limit-%'
ORDER BY kind, id;
