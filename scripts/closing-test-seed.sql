-- ==============================================================================
-- CAMPAIGN CLOSING SYSTEM — TEST SEED DATA (SCENARIOS S1–S15)
-- ==============================================================================
-- Run this script in the Supabase SQL Editor AFTER running:
--   1. closing_schema.sql
--   2. closing_function.sql
--
-- Everything created by this script uses:
--   - Project slugs starting with 'test-closing-'
--   - Synthetic investor emails matching 'test.closing.%@example.com'
--   - Synthetic user_ids matching 'user_test_closing_%'
--
-- To clean up all rows created by this script at any time, run:
--   scripts/closing-test-cleanup.sql
-- ==============================================================================

DO $$
DECLARE
  -- ============================================================================
  -- CONFIGURATION VARIABLES (Plug in your real IDs here, or leave NULL to auto-detect)
  -- ============================================================================
  v_issuer_id        bigint := NULL; -- Set to your issuers.id (e.g. 1), or leave NULL to use latest issuer
  v_real_investor_id bigint := NULL; -- Set to your Clerk-backed investors.id, or leave NULL to auto-detect

  -- Synthetic test investors (Classes 1, 2, 3, 4, 5)
  v_inv_c1  bigint;
  v_inv_c2  bigint;
  v_inv_c2b bigint;
  v_inv_c3  bigint;
  v_inv_c3b bigint;
  v_inv_c4  bigint;
  v_inv_c5  bigint;

  -- Project IDs for S1–S15
  v_p_s1  bigint;
  v_p_s2  bigint;
  v_p_s3  bigint;
  v_p_s4  bigint;
  v_p_s5  bigint;
  v_p_s6  bigint;
  v_p_s7  bigint;
  v_p_s8  bigint;
  v_p_s9  bigint;
  v_p_s10 bigint;
  v_p_s11 bigint;
  v_p_s12 bigint;
  v_p_s13 bigint;
  v_p_s14 bigint;
  v_p_s15 bigint;

  v_deadline timestamptz := now() - interval '2 hours';
BEGIN
  -- ----------------------------------------------------------------------------
  -- 0. Resolve v_issuer_id and v_real_investor_id if left NULL
  -- ----------------------------------------------------------------------------
  IF v_issuer_id IS NULL THEN
    SELECT id INTO v_issuer_id
    FROM public.issuers
    ORDER BY id DESC
    LIMIT 1;
  END IF;

  IF v_issuer_id IS NULL THEN
    RAISE EXCEPTION 'No issuer found in public.issuers. Please create an issuer or set v_issuer_id.';
  END IF;

  IF v_real_investor_id IS NULL THEN
    SELECT id INTO v_real_investor_id
    FROM public.investors
    WHERE (email IS NULL OR email NOT LIKE 'test.closing.%@example.com')
      AND (user_id IS NULL OR user_id NOT LIKE 'user_test_closing_%')
    ORDER BY id DESC
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Seeding closing test scenarios with v_issuer_id = %, v_real_investor_id = %',
    v_issuer_id, v_real_investor_id;

  -- ----------------------------------------------------------------------------
  -- 1. Pre-clean any existing test-closing-* rows so this script is re-runnable
  -- ----------------------------------------------------------------------------
  UPDATE public.investors inv
  SET wallet_balance = GREATEST(0, COALESCE(inv.wallet_balance, 0) - sub.total_test_refund)
  FROM (
    SELECT wt.investor_id, SUM(wt.amount) AS total_test_refund
    FROM public.wallet_transactions wt
    JOIN public.pledges pl ON pl.id = wt.pledge_id
    JOIN public.projects pr ON pr.id = pl.project_id
    WHERE pr.slug LIKE 'test-closing-%'
      AND wt.type = 'refund_credit'
    GROUP BY wt.investor_id
  ) sub
  WHERE inv.id = sub.investor_id
    AND (inv.email IS NULL OR inv.email NOT LIKE 'test.closing.%@example.com');

  DELETE FROM public.wallet_transactions
  WHERE pledge_id IN (
    SELECT pl.id FROM public.pledges pl
    JOIN public.projects pr ON pr.id = pl.project_id
    WHERE pr.slug LIKE 'test-closing-%'
  )
  OR investor_id IN (
    SELECT id FROM public.investors WHERE email LIKE 'test.closing.%@example.com'
  );

  DELETE FROM public.project_close_log
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%');

  DELETE FROM public.notifications
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%')
     OR investor_id IN (SELECT id FROM public.investors WHERE email LIKE 'test.closing.%@example.com');

  DELETE FROM public.issuer_notifications
  WHERE action_url LIKE '/issuer-portal/projects/test-closing-%'
     OR notification_text IN (
       SELECT 'campaign_closed:project_' || id::text
       FROM public.projects
       WHERE slug LIKE 'test-closing-%'
     );

  DELETE FROM public.project_notification_subscriptions
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%');

  DELETE FROM public.pledge_docs
  WHERE pledge_id IN (
    SELECT pl.id FROM public.pledges pl
    JOIN public.projects pr ON pr.id = pl.project_id
    WHERE pr.slug LIKE 'test-closing-%'
  );

  DELETE FROM public.pledges
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%');

  DELETE FROM public.project_milestones
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%');

  DELETE FROM public.spv_details
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%');

  DELETE FROM public.projects
  WHERE slug LIKE 'test-closing-%';

  DELETE FROM public.investors
  WHERE email LIKE 'test.closing.%@example.com';

  DELETE FROM public.users
  WHERE user_id LIKE 'user_test_closing_%';

  -- ----------------------------------------------------------------------------
  -- 2. Create synthetic users & investors across classes (starting wallet: 500,000)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.users (user_id, email, first_name, last_name, role)
  VALUES
    ('user_test_closing_c1',  'test.closing.c1@example.com',  'Test', 'Class1',  'investor'),
    ('user_test_closing_c2',  'test.closing.c2@example.com',  'Test', 'Class2',  'investor'),
    ('user_test_closing_c2b', 'test.closing.c2b@example.com', 'Test', 'Class2B', 'investor'),
    ('user_test_closing_c3',  'test.closing.c3@example.com',  'Test', 'Class3',  'investor'),
    ('user_test_closing_c3b', 'test.closing.c3b@example.com', 'Test', 'Class3B', 'investor'),
    ('user_test_closing_c4',  'test.closing.c4@example.com',  'Test', 'Class4',  'investor'),
    ('user_test_closing_c5',  'test.closing.c5@example.com',  'Test', 'Class5',  'investor')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_closing_c1', 'test.closing.c1@example.com', 'Test Investor Class 1', 'individual', 'approved', 1, 500000)
  RETURNING id INTO v_inv_c1;

  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_closing_c2', 'test.closing.c2@example.com', 'Test Investor Class 2', 'individual', 'approved', 2, 500000)
  RETURNING id INTO v_inv_c2;

  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_closing_c2b', 'test.closing.c2b@example.com', 'Test Investor Class 2B', 'individual', 'approved', 2, 500000)
  RETURNING id INTO v_inv_c2b;

  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_closing_c3', 'test.closing.c3@example.com', 'Test Investor Class 3', 'individual', 'approved', 3, 500000)
  RETURNING id INTO v_inv_c3;

  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_closing_c3b', 'test.closing.c3b@example.com', 'Test Investor Class 3B', 'individual', 'approved', 3, 500000)
  RETURNING id INTO v_inv_c3b;

  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_closing_c4', 'test.closing.c4@example.com', 'Test Investor Class 4', 'individual', 'approved', 4, 500000)
  RETURNING id INTO v_inv_c4;

  INSERT INTO public.investors (user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance)
  VALUES ('user_test_closing_c5', 'test.closing.c5@example.com', 'Test Investor Class 5', 'individual', 'approved', 5, 500000)
  RETURNING id INTO v_inv_c5;

  -- ----------------------------------------------------------------------------
  -- S1: Exact target (Murabaha, capacity 100,000, pledges = 60,000 + 40,000)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S1 — Exact Target', 'test-closing-s1-exact-target',
    'Scenario S1: Subscribed total exactly matches hard cap.',
    'campaign_live', 'murabaha', false, 'sukuk',
    'AED', 100000, 50000, 100000, 1000, 5000,
    8.5, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s1;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s1, v_inv_c2, 60000, 60, 2, 0.6, 360, 'pending', v_deadline - interval '5 days', 'completed'),
    (v_p_s1, v_inv_c5, 40000, 40, 5, 0.9, 360, 'pending', v_deadline - interval '4 days', 'completed');

  -- If real investor exists, subscribe them to S1 campaign alerts (no pledge on S1)
  IF v_real_investor_id IS NOT NULL THEN
    INSERT INTO public.project_notification_subscriptions (
      project_id, investor_id, notify_campaign_alerts, notify_milestones, notify_funding_thresholds, notify_conversion_pool
    ) VALUES (v_p_s1, v_real_investor_id, true, true, false, false);
  END IF;

  -- ----------------------------------------------------------------------------
  -- S2: Soft cap met below target (Murabaha, soft_cap 50,000, target 100,000)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S2 — Soft Cap Met Below Target', 'test-closing-s2-soft-cap-met',
    'Scenario S2: Subscribed meets soft cap (50k) but below target goal (100k).',
    'campaign_live', 'murabaha', false, 'sukuk',
    'AED', 100000, 50000, 100000, 1000, 5000,
    8.0, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s2;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s2, v_inv_c3, 55000, 55, 3, 0.7, 385, 'pending', v_deadline - interval '3 days', 'completed');

  IF v_real_investor_id IS NOT NULL THEN
    INSERT INTO public.pledges (
      project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
      fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
    ) VALUES
      (v_p_s2, v_real_investor_id, 10000, 10, 2, 0.6, 60, 'pending', v_deadline - interval '2 days', 'completed');
  END IF;

  -- ----------------------------------------------------------------------------
  -- S3: Oversubscribed with partial fill and rejections (capacity 100,000)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S3 — Oversubscribed Partial & Rejected', 'test-closing-s3-oversubscribed',
    'Scenario S3: C1 70k full fill, C2 50k -> 30k partial fill (20k refunded, fee kept), C4 20k rejected (20,160 refunded with fee).',
    'campaign_live', 'murabaha', false, 'sukuk',
    'AED', 100000, 50000, 100000, 1000, 5000,
    9.0, 18, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s3;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s3, v_inv_c1, 70000, 70, 1, 0.5, 350, 'pending', v_deadline - interval '5 days', 'completed'),
    (v_p_s3, v_inv_c2, 50000, 50, 2, 0.6, 300, 'pending', v_deadline - interval '4 days', 'completed'),
    (v_p_s3, v_inv_c4, 20000, 20, 4, 0.8, 160, 'pending', v_deadline - interval '3 days', 'completed');

  -- ----------------------------------------------------------------------------
  -- S4: Class priority beating size (C1 30k beats C5 90k)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S4 — Class Priority Beats Size', 'test-closing-s4-class-priority',
    'Scenario S4: Class 1 smaller pledge (30k) ranks #1 ahead of Class 5 larger pledge (90k).',
    'campaign_live', 'murabaha', false, 'sukuk',
    'AED', 100000, 50000, 100000, 1000, 5000,
    8.5, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s4;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s4, v_inv_c5, 90000, 90, 5, 0.9, 810, 'pending', v_deadline - interval '10 days', 'completed'),
    (v_p_s4, v_inv_c1, 30000, 30, 1, 0.5, 150, 'pending', v_deadline - interval '1 day',  'completed');

  -- ----------------------------------------------------------------------------
  -- S5: Size tie-break within same class (Class 3: 80k beats 40k)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S5 — Size Tie-Break', 'test-closing-s5-size-tiebreak',
    'Scenario S5: Same class (Class 3), larger pledge (80k) ranks #1 ahead of earlier smaller pledge (40k).',
    'campaign_live', 'murabaha', false, 'sukuk',
    'AED', 100000, 50000, 100000, 1000, 5000,
    8.5, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s5;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s5, v_inv_c3,  40000, 40, 3, 0.7, 280, 'pending', v_deadline - interval '8 days', 'completed'),
    (v_p_s5, v_inv_c3b, 80000, 80, 3, 0.7, 560, 'pending', v_deadline - interval '2 days', 'completed');

  -- ----------------------------------------------------------------------------
  -- S6: Timestamp tie-break within same class and size (Class 2: 60k earlier beats 60k later)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S6 — Timestamp Tie-Break', 'test-closing-s6-timestamp-tiebreak',
    'Scenario S6: Same class (Class 2) and size (60k), earlier timestamp gets 100% of 60k cap.',
    'campaign_live', 'murabaha', false, 'sukuk',
    'AED', 60000, 50000, 60000, 1000, 5000,
    8.5, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s6;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s6, v_inv_c2,  60000, 60, 2, 0.6, 360, 'pending', v_deadline - interval '2 days', 'completed'),
    (v_p_s6, v_inv_c2b, 60000, 60, 2, 0.6, 360, 'pending', v_deadline - interval '6 days', 'completed');

  -- ----------------------------------------------------------------------------
  -- S7: Rounding down to whole units (12,750 at unit_price 1,000 -> 12,000 allocated, 750 refunded, fee kept)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S7 — Unit Rounding Remainder', 'test-closing-s7-rounding',
    'Scenario S7: 12,750 pledge rounds down to 12 units (12,000); 750 remainder refunded, fee kept.',
    'campaign_live', 'murabaha', false, 'sukuk',
    'AED', 50000, 10000, 50000, 1000, 5000,
    8.5, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s7;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s7, v_inv_c1, 12750, 12, 1, 0.5, 63.75, 'pending', v_deadline - interval '3 days', 'completed');

  -- ----------------------------------------------------------------------------
  -- S8: Fill below min_investment_floor skipped and next pledge filled
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S8 — Floor Skip & Continue', 'test-closing-s8-floor-skip',
    'Scenario S8: Unit price 6,000, floor 10,000. C2 pledge 11,000 rounds to 6,000 (< floor) -> skipped; C3 pledge 12,000 gets the remaining 2 units.',
    'campaign_live', 'murabaha', false, 'sukuk',
    'AED', 72000, 50000, 72000, 6000, 10000,
    8.5, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s8;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s8, v_inv_c1, 60000, 10, 1, 0.5, 300, 'pending', v_deadline - interval '5 days', 'completed'),
    (v_p_s8, v_inv_c2, 11000, 1,  2, 0.6, 66,  'pending', v_deadline - interval '4 days', 'completed'),
    (v_p_s8, v_inv_c3, 12000, 2,  3, 0.7, 84,  'pending', v_deadline - interval '3 days', 'completed');

  -- ----------------------------------------------------------------------------
  -- S9: Below soft cap fails (soft_cap_not_met, full refund including fee)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S9 — Below Soft Cap Fails', 'test-closing-s9-below-soft-cap',
    'Scenario S9: Subscribed total (35k–40k) is below soft_cap (50k) -> fails with soft_cap_not_met.',
    'campaign_live', 'ijara', false, 'sukuk',
    'AED', 100000, 50000, 100000, 1000, 5000,
    7.5, 24, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s9;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s9, v_inv_c1, 20000, 20, 1, 0.5, 100, 'pending', v_deadline - interval '4 days', 'completed'),
    (v_p_s9, v_inv_c2, 15000, 15, 2, 0.6, 90,  'pending', v_deadline - interval '3 days', 'completed');

  IF v_real_investor_id IS NOT NULL THEN
    INSERT INTO public.pledges (
      project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
      fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
    ) VALUES
      (v_p_s9, v_real_investor_id, 5000, 5, 2, 0.6, 30, 'pending', v_deadline - interval '2 days', 'completed');
  END IF;

  -- ----------------------------------------------------------------------------
  -- S10: Zero pledges fails (no_pledges)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S10 — Zero Pledges Fails', 'test-closing-s10-zero-pledges',
    'Scenario S10: Overdue campaign with zero pledges -> fails with no_pledges.',
    'campaign_live', 'mudarabah', false, 'sukuk',
    'AED', 100000, 50000, 100000, 1000, 5000,
    10.0, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s10;

  -- ----------------------------------------------------------------------------
  -- S11: Conversion pool exhausted (pool = floor(100 / 2) = 50 units)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S11 — Conversion Pool Exhausted', 'test-closing-s11-conversion-exhausted',
    'Scenario S11: Pool = 50 units. C1 requests 35 -> gets 35; C3 requests 25 -> gets remaining 15; C5 gets 0.',
    'campaign_live', 'murabaha', true, 'sukuk',
    'AED', 100000, 50000, 100000, 1000, 5000,
    8.5, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s11;

  INSERT INTO public.spv_details (
    project_id, issuer_id, spv_legal_name, registration_authority, registration_number,
    total_shares_authorized, conversion_enabled, conversion_trigger_type,
    conversion_trigger_value, conversion_ratio_shares
  ) VALUES (
    v_p_s11, v_issuer_id, 'Test S11 SPV Ltd', 'DIFC', 'SPV-S11-001',
    100, true, 'share_price_above', 15, 2
  );

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, requested_conversion_units,
    investor_class_at_pledge, fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s11, v_inv_c1, 40000, 40, 35, 1, 0.5, 200, 'pending', v_deadline - interval '5 days', 'completed'),
    (v_p_s11, v_inv_c3, 30000, 30, 25, 3, 0.7, 210, 'pending', v_deadline - interval '4 days', 'completed'),
    (v_p_s11, v_inv_c5, 20000, 20, 0,  5, 0.9, 180, 'pending', v_deadline - interval '3 days', 'completed');

  -- ----------------------------------------------------------------------------
  -- S12: Partial fill shrinks conversion below requested
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S12 — Partial Fill Shrinks Conversion', 'test-closing-s12-conversion-shrunk',
    'Scenario S12: C2 requests 45 conversion units on 50k pledge, but partial fill only allocates 20 units -> conversion_eligible_units = 20.',
    'campaign_live', 'mudarabah', true, 'sukuk',
    'AED', 80000, 50000, 80000, 1000, 5000,
    9.5, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s12;

  INSERT INTO public.spv_details (
    project_id, issuer_id, spv_legal_name, registration_authority, registration_number,
    total_shares_authorized, conversion_enabled, conversion_trigger_type,
    conversion_trigger_value, conversion_ratio_shares
  ) VALUES (
    v_p_s12, v_issuer_id, 'Test S12 SPV Ltd', 'ADGM', 'SPV-S12-001',
    200, true, 'share_price_above', 12, 1
  );

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, requested_conversion_units,
    investor_class_at_pledge, fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s12, v_inv_c1, 60000, 60, 60, 1, 0.5, 300, 'pending', v_deadline - interval '5 days', 'completed'),
    (v_p_s12, v_inv_c2, 50000, 50, 45, 2, 0.6, 300, 'pending', v_deadline - interval '4 days', 'completed');

  -- ----------------------------------------------------------------------------
  -- S13: SPV Equity capacity & ownership_percentage
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    campaign_end_date, allocation_status, contract_terms
  ) VALUES (
    v_issuer_id, 'Test Closing S13 — SPV Equity Ownership', 'test-closing-s13-spv-equity',
    'Scenario S13: 2,000 authorized shares @ AED 100 (capacity 200k), 8,000 existing shares. C1 gets 1,500 shares (15%), C2 gets 500 shares (5%).',
    'campaign_live', 'spv_equity', true, 'shares',
    'AED', 200000, 100000, 200000, 100, 1000,
    v_deadline, 'pending', '{"existing_shares_outstanding": 8000}'::jsonb
  ) RETURNING id INTO v_p_s13;

  INSERT INTO public.spv_details (
    project_id, issuer_id, spv_legal_name, registration_authority, registration_number,
    total_shares_authorized, conversion_enabled
  ) VALUES (
    v_p_s13, v_issuer_id, 'Test S13 Equity SPV Ltd', 'DIFC', 'SPV-S13-001',
    2000, false
  );

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s13, v_inv_c1, 150000, 1500, 1, 0.5, 750, 'pending', v_deadline - interval '5 days', 'completed'),
    (v_p_s13, v_inv_c2, 80000,  800,  2, 0.6, 480, 'pending', v_deadline - interval '4 days', 'completed');

  -- ----------------------------------------------------------------------------
  -- S14: Idempotency & Late Pledge Refund
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status
  ) VALUES (
    v_issuer_id, 'Test Closing S14 — Idempotency & Late Pledge', 'test-closing-s14-idempotency',
    'Scenario S14: Close twice to verify no double refunds/notifications; also includes a late pledge after campaign_end_date.',
    'campaign_live', 'murabaha', false, 'sukuk',
    'AED', 100000, 50000, 100000, 1000, 5000,
    8.5, 12, v_deadline, 'pending'
  ) RETURNING id INTO v_p_s14;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s14, v_inv_c1, 60000, 60, 1, 0.5, 300, 'pending', v_deadline - interval '4 days',    'completed'),
    (v_p_s14, v_inv_c2, 50000, 50, 2, 0.6, 300, 'pending', v_deadline - interval '3 days',    'completed'),
    (v_p_s14, v_inv_c4, 15000, 15, 4, 0.8, 120, 'pending', v_deadline + interval '10 minutes', 'completed');

  -- ----------------------------------------------------------------------------
  -- S15: Stuck 'closing' older than 15 minutes re-claimed by cron
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date,
    allocation_status, closed_at, close_attempts
  ) VALUES (
    v_issuer_id, 'Test Closing S15 — Stale Closing Retry', 'test-closing-s15-stuck-closing',
    'Scenario S15: Stuck in status=closing with closed_at 20 minutes ago; cron re-claims and finishes closing.',
    'closing', 'murabaha', false, 'sukuk',
    'AED', 100000, 50000, 100000, 1000, 5000,
    8.5, 12, v_deadline,
    'pending', now() - interval '20 minutes', 1
  ) RETURNING id INTO v_p_s15;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, investor_class_at_pledge,
    fee_percent_at_pledge, fee_amount, status, pledged_at, payment_status
  ) VALUES
    (v_p_s15, v_inv_c1, 60000, 60, 1, 0.5, 300, 'pending', v_deadline - interval '3 days', 'completed');

  -- ----------------------------------------------------------------------------
  -- 3. Create system milestones ('campaign_funded') for all 15 test projects
  -- ----------------------------------------------------------------------------
  INSERT INTO public.project_milestones (
    project_id, issuer_id, title, description, linked_system_event,
    milestone_source, status, target_date, verification_status
  )
  SELECT
    p.id,
    NULL,
    'Campaign funded',
    'Campaign target goal successfully reached by the deadline.',
    'campaign_funded',
    'system',
    'upcoming',
    p.campaign_end_date,
    'approved'
  FROM public.projects p
  WHERE p.slug LIKE 'test-closing-%';

  RAISE NOTICE 'Successfully seeded 15 test projects (test-closing-s1 through test-closing-s15).';
END $$;

-- Display seeded projects and their IDs for convenient testing
SELECT id, slug, status, allocation_status, close_attempts, sharia_contract_type, soft_cap, target_goal, hard_cap
FROM public.projects
WHERE slug LIKE 'test-closing-%'
ORDER BY id;
