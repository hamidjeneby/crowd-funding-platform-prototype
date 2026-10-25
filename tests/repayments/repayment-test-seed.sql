-- ==============================================================================
-- REPAYMENT SIMULATION ENGINE — TEST SEED SCRIPT
-- ==============================================================================
-- Run this script in your Supabase SQL Editor.
--
-- This script creates 4 FUNDED projects (one for each Sharia contract type):
--   1. Murabaha    : 'test-repay-murabaha'
--   2. Ijara       : 'test-repay-ijara'
--   3. Mudarabah   : 'test-repay-mudarabah'
--   4. SPV Equity  : 'test-repay-spv-equity'
--
-- All 4 projects are in status 'funded' with allocation_status = 'complete'.
-- Each project has 2 allocated investor holdings (100,000 AED total capacity):
--   - Real Investor (You)       : 60,000 AED (60% holding / 60 units)
--   - Secondary Test Investor   : 40,000 AED (40% holding / 40 units)
--
-- To clean up all rows created by this script at any time, run:
--   tests/repayments/repayment-test-cleanup.sql
-- ==============================================================================

DO $$
DECLARE
  -- ============================================================================
  -- CONFIGURATION:
  -- Leave NULL to automatically detect your real issuer and investor IDs,
  -- or explicitly specify your integer IDs below:
  -- ============================================================================
  v_issuer_id        bigint := NULL; -- e.g. 1
  v_real_investor_id bigint := NULL; -- e.g. 1

  -- Synthetic secondary investor ID
  v_inv_secondary    bigint;

  -- Project IDs
  v_p_murabaha       bigint;
  v_p_ijara          bigint;
  v_p_mudarabah      bigint;
  v_p_equity         bigint;

  v_closed_at        timestamptz := now() - interval '1 day';
BEGIN
  -- ----------------------------------------------------------------------------
  -- 0. Resolve v_issuer_id if not specified
  -- ----------------------------------------------------------------------------
  IF v_issuer_id IS NULL THEN
    SELECT id INTO v_issuer_id
    FROM public.issuers
    ORDER BY id DESC
    LIMIT 1;
  END IF;

  IF v_issuer_id IS NULL THEN
    RAISE EXCEPTION 'No issuer profile found in public.issuers. Please create an issuer first.';
  END IF;

  -- ----------------------------------------------------------------------------
  -- 0B. Resolve v_real_investor_id if not specified
  -- ----------------------------------------------------------------------------
  IF v_real_investor_id IS NULL THEN
    SELECT id INTO v_real_investor_id
    FROM public.investors
    WHERE (email IS NULL OR email NOT LIKE 'test.repay.%@example.com')
      AND (user_id IS NULL OR user_id NOT LIKE 'user_test_repay_%')
    ORDER BY id DESC
    LIMIT 1;
  END IF;

  IF v_real_investor_id IS NULL THEN
    RAISE EXCEPTION 'No investor found in public.investors. Please register an investor account first.';
  END IF;

  -- Ensure the real investor has a valid bank_details account_number so payments do not fail unexpectedly
  UPDATE public.investors
  SET bank_details = COALESCE(
    bank_details,
    '{"account_holder_name": "Verified Investor", "account_number": "1234567890", "bank_name": "Emirates NBD"}'::jsonb
  )
  WHERE id = v_real_investor_id;

  RAISE NOTICE '==> Seeding Repayment Test Projects using:';
  RAISE NOTICE '    Issuer ID: %', v_issuer_id;
  RAISE NOTICE '    Real Investor ID: %', v_real_investor_id;

  -- ----------------------------------------------------------------------------
  -- 1. Pre-clean existing test-repay-* projects and secondary test investor
  -- ----------------------------------------------------------------------------
  DELETE FROM public.repayments
  WHERE payout_period_id IN (
    SELECT id FROM public.payout_periods
    WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-repay-%')
  );

  DELETE FROM public.payout_periods
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-repay-%');

  DELETE FROM public.pledges
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-repay-%');

  DELETE FROM public.spv_details
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-repay-%');

  DELETE FROM public.projects
  WHERE slug LIKE 'test-repay-%';

  -- ----------------------------------------------------------------------------
  -- 2. Create or reuse synthetic secondary investor
  -- ----------------------------------------------------------------------------
  INSERT INTO public.users (user_id, email, first_name, last_name, role)
  VALUES ('user_test_repay_secondary', 'test.repay.secondary@example.com', 'Secondary', 'Investor', 'investor')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO v_inv_secondary
  FROM public.investors
  WHERE email = 'test.repay.secondary@example.com'
  LIMIT 1;

  IF v_inv_secondary IS NULL THEN
    INSERT INTO public.investors (
      user_id, email, full_name, type, onboarding_status, investor_class, wallet_balance, bank_details
    ) VALUES (
      'user_test_repay_secondary',
      'test.repay.secondary@example.com',
      'Secondary Test Investor',
      'individual',
      'approved',
      2,
      250000,
      '{"account_holder_name": "Secondary Investor", "account_number": "9876543210", "bank_name": "Abu Dhabi Islamic Bank"}'::jsonb
    ) RETURNING id INTO v_inv_secondary;
  ELSE
    UPDATE public.investors
    SET bank_details = '{"account_holder_name": "Secondary Investor", "account_number": "9876543210", "bank_name": "Abu Dhabi Islamic Bank"}'::jsonb
    WHERE id = v_inv_secondary;
  END IF;

  -- ----------------------------------------------------------------------------
  -- 3. PROJECT 1: MURABAHA (Fixed ROI 8.0%, Quarterly, At Maturity)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status, contract_terms
  ) VALUES (
    v_issuer_id,
    'Test Repayment Murabaha (Sukuk Al-Murabaha)',
    'test-repay-murabaha',
    'Quarterly Sharia profit distribution with full principal repayment at maturity.',
    'funded',
    'murabaha',
    false,
    'sukuk',
    'AED',
    100000, 50000, 100000, 1000, 5000,
    8.0, 12, v_closed_at, 'complete',
    '{"expected_roi_percent": 8.0, "payment_frequency": "quarterly", "tenor_months": 12, "principal_repayment": "at_maturity"}'::jsonb
  ) RETURNING id INTO v_p_murabaha;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, allocated_amount, allocated_units,
    investor_class_at_pledge, fee_percent_at_pledge, fee_amount, status, pledged_at, allocated_at, payment_status, allocation_rank
  ) VALUES
    (v_p_murabaha, v_real_investor_id, 60000, 60, 60000, 60, 2, 0.6, 360, 'allocated', v_closed_at - interval '3 days', v_closed_at, 'completed', 1),
    (v_p_murabaha, v_inv_secondary,    40000, 40, 40000, 40, 2, 0.6, 240, 'allocated', v_closed_at - interval '2 days', v_closed_at, 'completed', 2);

  -- ----------------------------------------------------------------------------
  -- 4. PROJECT 2: IJARA (Rental Yield 6.0%, Quarterly, Sale to Issuer)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    expected_roi_percent, tenor_months, campaign_end_date, allocation_status, contract_terms
  ) VALUES (
    v_issuer_id,
    'Test Repayment Ijara (Equipment Lease Sukuk)',
    'test-repay-ijara',
    'Quarterly rental yield distribution with end-of-term asset sale to issuer.',
    'funded',
    'ijara',
    false,
    'sukuk',
    'AED',
    100000, 50000, 100000, 1000, 5000,
    6.0, 12, v_closed_at, 'complete',
    '{"expected_roi_percent": 6.0, "payment_frequency": "quarterly", "tenor_months": 12, "end_of_term": "sale_to_issuer", "end_of_term_price": 100000}'::jsonb
  ) RETURNING id INTO v_p_ijara;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, allocated_amount, allocated_units,
    investor_class_at_pledge, fee_percent_at_pledge, fee_amount, status, pledged_at, allocated_at, payment_status, allocation_rank
  ) VALUES
    (v_p_ijara, v_real_investor_id, 60000, 60, 60000, 60, 2, 0.6, 360, 'allocated', v_closed_at - interval '3 days', v_closed_at, 'completed', 1),
    (v_p_ijara, v_inv_secondary,    40000, 40, 40000, 40, 2, 0.6, 240, 'allocated', v_closed_at - interval '2 days', v_closed_at, 'completed', 2);

  -- ----------------------------------------------------------------------------
  -- 5. PROJECT 3: MUDARABAH (Profit Sharing 70/30, Quarterly Reporting)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    tenor_months, campaign_end_date, allocation_status, contract_terms
  ) VALUES (
    v_issuer_id,
    'Test Repayment Mudarabah (Profit-Sharing Partnership)',
    'test-repay-mudarabah',
    'Quarterly periodic profit disclosures with 70% investor pool share and 100% capital return.',
    'funded',
    'mudarabah',
    false,
    'sukuk',
    'AED',
    100000, 50000, 100000, 1000, 5000,
    12, v_closed_at, 'complete',
    '{"investor_profit_share_percent": 70.0, "mudarib_profit_share_percent": 30.0, "profit_reporting_frequency": "quarterly", "tenor_months": 12}'::jsonb
  ) RETURNING id INTO v_p_mudarabah;

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, allocated_amount, allocated_units,
    investor_class_at_pledge, fee_percent_at_pledge, fee_amount, status, pledged_at, allocated_at, payment_status, allocation_rank
  ) VALUES
    (v_p_mudarabah, v_real_investor_id, 60000, 60, 60000, 60, 2, 0.6, 360, 'allocated', v_closed_at - interval '3 days', v_closed_at, 'completed', 1),
    (v_p_mudarabah, v_inv_secondary,    40000, 40, 40000, 40, 2, 0.6, 240, 'allocated', v_closed_at - interval '2 days', v_closed_at, 'completed', 2);

  -- ----------------------------------------------------------------------------
  -- 6. PROJECT 4: SPV EQUITY (1,000 Ordinary Shares, Dividends & Exit)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.projects (
    issuer_id, title, slug, summary, status, sharia_contract_type, is_spv, unit_type,
    currency, target_goal, soft_cap, hard_cap, unit_price, min_investment_floor,
    campaign_end_date, allocation_status, contract_terms
  ) VALUES (
    v_issuer_id,
    'Test Repayment SPV Equity (Growth Equity Holding)',
    'test-repay-spv-equity',
    'DIFC SPV equity holding for dividend pool declarations and final exit proceeds settlement.',
    'funded',
    'spv_equity',
    true,
    'shares',
    'AED',
    100000, 50000, 100000, 100, 1000,
    v_closed_at, 'complete',
    '{"existing_shares_outstanding": 0, "target_equity_percent": 10.0}'::jsonb
  ) RETURNING id INTO v_p_equity;

  INSERT INTO public.spv_details (
    project_id, issuer_id, spv_legal_name, registration_authority, registration_number,
    total_shares_authorized, conversion_enabled
  ) VALUES (
    v_p_equity, v_issuer_id, 'Test Repay SPV Ltd', 'DIFC', 'SPV-REPAY-001',
    1000, false
  );

  INSERT INTO public.pledges (
    project_id, investor_id, pledged_amount, pledged_units, allocated_amount, allocated_units,
    investor_class_at_pledge, fee_percent_at_pledge, fee_amount, status, pledged_at, allocated_at, payment_status, allocation_rank, ownership_percentage
  ) VALUES
    (v_p_equity, v_real_investor_id, 60000, 600, 60000, 600, 2, 0.6, 360, 'allocated', v_closed_at - interval '3 days', v_closed_at, 'completed', 1, 60.0000),
    (v_p_equity, v_inv_secondary,    40000, 400, 40000, 400, 2, 0.6, 240, 'allocated', v_closed_at - interval '2 days', v_closed_at, 'completed', 2, 40.0000);

  -- ----------------------------------------------------------------------------
  -- Summary Output
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'SUCCESS: 4 Funded Projects created and ready for repayment simulation:';
  RAISE NOTICE '  1. Murabaha   : ID % | slug: test-repay-murabaha', v_p_murabaha;
  RAISE NOTICE '  2. Ijara      : ID % | slug: test-repay-ijara', v_p_ijara;
  RAISE NOTICE '  3. Mudarabah  : ID % | slug: test-repay-mudarabah', v_p_mudarabah;
  RAISE NOTICE '  4. SPV Equity : ID % | slug: test-repay-spv-equity', v_p_equity;
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Next steps to release funds for any project:';
  RAISE NOTICE '  ALLOW_SIM=true node scripts/simulation/release.js --project=%', v_p_murabaha;
  RAISE NOTICE '  ALLOW_SIM=true node scripts/simulation/release.js --project=%', v_p_ijara;
  RAISE NOTICE '  ALLOW_SIM=true node scripts/simulation/release.js --project=%', v_p_mudarabah;
  RAISE NOTICE '  ALLOW_SIM=true node scripts/simulation/release.js --project=%', v_p_equity;
  RAISE NOTICE '====================================================================';
END $$;
