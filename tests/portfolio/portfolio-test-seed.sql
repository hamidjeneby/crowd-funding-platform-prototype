-- ==============================================================================
-- FILE: tests/portfolio/portfolio-test-seed.sql
-- PURPOSE:
--   Seeds comprehensive test data to preview and verify all visual components
--   of the Investor Portfolio page (/investor-portal/portfolio).
--
-- CREATES:
--   1. 12 test campaigns in `public.projects` (slugs starting with `test-portfolio-*`):
--      - 4 Murabaha campaigns
--      - 3 Ijara campaigns
--      - 3 SPV Equity campaigns (with conversion clauses)
--      - 2 Mudarabah campaigns
--   2. 12 pledges linked to your investor account:
--      - 9 Active Holdings across 9 distinct projects (Total Invested: AED 180,000)
--      - 1 Pending Pledge in a live campaign (Awaiting Allocation: AED 15,000)
--      - 1 Rejected Oversubscribed Pledge (Pledge Outcomes: Not Allocated)
--      - 1 Refunded Pledge (Pledge Outcomes: Refunded)
--      - 1 Partial Fill (Pledge Outcomes: Partly Allocated, 10k pledged -> 5k allocated)
--      - 2 Convertible Holdings (Conversion Exposure: 350 reserved units)
--      - Timeline spanning Jan, Feb, Apr, Jun 2026 (demonstrating Mar & May zero-fill)
--      - Top 8 projects + "Other" (9th project aggregated into Other)
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard -> SQL Editor.
--   2. Paste and run this script.
--   3. Visit http://localhost:3000/investor-portal/portfolio.
--
-- TO CLEAN UP:
--   Run `tests/portfolio/portfolio-test-cleanup.sql` in Supabase SQL Editor.
-- ==============================================================================

DO $$
DECLARE
  v_investor_id bigint;
  v_issuer_id   bigint;

  -- Project IDs
  v_p1_murabaha_logistics bigint;
  v_p2_ijara_solar        bigint;
  v_p3_spv_fintech        bigint;
  v_p4_mudarabah_farm     bigint;
  v_p5_murabaha_clinic    bigint;
  v_p6_ijara_retail       bigint;
  v_p7_spv_cyber          bigint;
  v_p8_murabaha_warehouse bigint;
  v_p9_mudarabah_academy  bigint;
  v_p10_pending_mobility  bigint;
  v_p11_rejected_cold     bigint;
  v_p12_refunded_robotics bigint;

BEGIN
  -- ----------------------------------------------------------------------------
  -- 1. Dynamically resolve the latest Investor ID (Supabase internal PK: int8)
  -- ----------------------------------------------------------------------------
  SELECT id INTO v_investor_id
  FROM public.investors
  ORDER BY id DESC
  LIMIT 1;

  IF v_investor_id IS NULL THEN
    RAISE EXCEPTION 'No investor record found in public.investors. Please sign up or complete investor onboarding first.';
  END IF;

  -- ----------------------------------------------------------------------------
  -- 2. Identify an Issuer Account to own the test campaigns
  -- ----------------------------------------------------------------------------
  SELECT id INTO v_issuer_id
  FROM public.issuers
  ORDER BY id DESC
  LIMIT 1;

  IF v_issuer_id IS NULL THEN
    RAISE EXCEPTION 'No issuer record found in public.issuers.';
  END IF;

  -- ----------------------------------------------------------------------------
  -- 3. Clean up any previous test-portfolio-* rows for idempotency
  -- ----------------------------------------------------------------------------
  DELETE FROM public.pledges
  WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-portfolio-%');

  DELETE FROM public.projects
  WHERE slug LIKE 'test-portfolio-%';

  -- ----------------------------------------------------------------------------
  -- 4. Create 12 Test Campaigns
  -- ----------------------------------------------------------------------------
  -- 1. Murabaha Logistics (Funded)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'Al-Noor Cold-Chain Logistics Hub', 'test-portfolio-logistics-hub',
    'debt_unit', 'murabaha', 1000, 'AED', 1000000, 1500000, 'funded', false
  ) RETURNING id INTO v_p1_murabaha_logistics;

  -- 2. Ijara Solar (Funded)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'Desert Sun Industrial Solar Park', 'test-portfolio-solar-grid',
    'lease_unit', 'ijara', 500, 'AED', 800000, 1200000, 'funded', false
  ) RETURNING id INTO v_p2_ijara_solar;

  -- 3. SPV Equity FinTech (Funded, Convertible)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'QistPay GCC Embedded Credit Engine', 'test-portfolio-fintech-seed',
    'equity_share', 'spv_equity', 100, 'AED', 500000, 750000, 'funded', true
  ) RETURNING id INTO v_p3_spv_fintech;

  -- 4. Mudarabah Farm (Funded)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'Barakah Hydroponic Vertical Farm', 'test-portfolio-agritech-farm',
    'profit_share', 'mudarabah', 250, 'AED', 400000, 600000, 'funded', false
  ) RETURNING id INTO v_p4_mudarabah_farm;

  -- 5. Murabaha Clinic (Funded)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'Al-Shifa Community Medical Center', 'test-portfolio-healthcare-clinic',
    'debt_unit', 'murabaha', 1000, 'AED', 600000, 900000, 'funded', false
  ) RETURNING id INTO v_p5_murabaha_clinic;

  -- 6. Ijara Retail (Funded)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'Madina Boulevard Retail Promenade', 'test-portfolio-retail-plaza',
    'lease_unit', 'ijara', 500, 'AED', 500000, 750000, 'funded', false
  ) RETURNING id INTO v_p6_ijara_retail;

  -- 7. SPV Equity Cyber (Funded, Convertible)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'FalconShield Sovereign Cyber Defense', 'test-portfolio-cybersecurity-saas',
    'equity_share', 'spv_equity', 100, 'AED', 300000, 450000, 'funded', true
  ) RETURNING id INTO v_p7_spv_cyber;

  -- 8. Murabaha Smart Warehousing (Funded, Partial Fill Project)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'OmniHub Automated Fulfillment Center', 'test-portfolio-smart-warehousing',
    'debt_unit', 'murabaha', 500, 'AED', 400000, 600000, 'funded', false
  ) RETURNING id INTO v_p8_murabaha_warehouse;

  -- 9. Mudarabah Education (Funded, 9th project -> shows Top 8 + Other)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'Hikmah STEM Virtual Academy', 'test-portfolio-education-academy',
    'profit_share', 'mudarabah', 200, 'AED', 250000, 350000, 'funded', false
  ) RETURNING id INTO v_p9_mudarabah_academy;

  -- 10. Live Campaign (Open for pledges)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'EcoTransit Fleet Electrification', 'test-portfolio-green-mobility',
    'debt_unit', 'murabaha', 250, 'AED', 500000, 750000, 'campaign_live', false
  ) RETURNING id INTO v_p10_pending_mobility;

  -- 11. Closed Campaign (Oversubscribed)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv
  ) VALUES (
    v_issuer_id, 'Jebel Ali Automated Cold Storage', 'test-portfolio-cold-storage',
    'lease_unit', 'ijara', 500, 'AED', 300000, 450000, 'funded', false
  ) RETURNING id INTO v_p11_rejected_cold;

  -- 12. Failed Campaign (Soft cap not met)
  INSERT INTO public.projects (
    issuer_id, title, slug, unit_type, sharia_contract_type, unit_price,
    currency, target_goal, hard_cap, status, is_spv, failure_reason
  ) VALUES (
    v_issuer_id, 'Neom Autonomous Delivery Drones', 'test-portfolio-ai-robotics',
    'equity_share', 'spv_equity', 100, 'AED', 800000, 1200000, 'failed', true, 'soft_cap_not_met'
  ) RETURNING id INTO v_p12_refunded_robotics;

  -- ----------------------------------------------------------------------------
  -- 5. Seed 12 Realistic Pledges for the Investor
  -- ----------------------------------------------------------------------------

  -- Holding 1: Murabaha (AED 45,000 allocated in Jan 2026) -> Largest single holding (25.0%)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount,
    pledged_units, allocated_units, investor_class_at_pledge, fee_percent_at_pledge,
    fee_amount, payment_status, pledged_at, allocated_at, created_at
  ) VALUES (
    v_p1_murabaha_logistics, v_investor_id, 'allocated', 45000, 45000,
    45, 45, 1, 0.5, 225, 'completed',
    '2026-01-10 09:00:00+00', '2026-01-15 10:00:00+00', '2026-01-10 09:00:00+00'
  );

  -- Holding 2: Ijara (AED 35,000 allocated in Feb 2026)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount,
    pledged_units, allocated_units, investor_class_at_pledge, fee_percent_at_pledge,
    fee_amount, payment_status, pledged_at, allocated_at, created_at
  ) VALUES (
    v_p2_ijara_solar, v_investor_id, 'allocated', 35000, 35000,
    70, 70, 1, 0.5, 175, 'completed',
    '2026-02-05 11:00:00+00', '2026-02-10 11:00:00+00', '2026-02-05 11:00:00+00'
  );

  -- Holding 3: SPV Equity (AED 25,000 allocated in Feb 2026, 250 convertible units)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount,
    pledged_units, allocated_units, conversion_eligible_units, requested_conversion_units,
    investor_class_at_pledge, fee_percent_at_pledge, fee_amount, payment_status,
    pledged_at, allocated_at, created_at
  ) VALUES (
    v_p3_spv_fintech, v_investor_id, 'allocated', 25000, 25000,
    250, 250, 250, 250,
    1, 0.5, 125, 'completed',
    '2026-02-15 13:00:00+00', '2026-02-20 14:00:00+00', '2026-02-15 13:00:00+00'
  );

  -- Holding 4: Mudarabah (AED 20,000 allocated in Apr 2026 -> Mar 2026 is zero-filled gap)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount,
    pledged_units, allocated_units, investor_class_at_pledge, fee_percent_at_pledge,
    fee_amount, payment_status, pledged_at, allocated_at, created_at
  ) VALUES (
    v_p4_mudarabah_farm, v_investor_id, 'allocated', 20000, 20000,
    80, 80, 1, 0.5, 100, 'completed',
    '2026-04-01 08:30:00+00', '2026-04-05 09:00:00+00', '2026-04-01 08:30:00+00'
  );

  -- Holding 5: Murabaha (AED 20,000 allocated in Apr 2026)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount,
    pledged_units, allocated_units, investor_class_at_pledge, fee_percent_at_pledge,
    fee_amount, payment_status, pledged_at, allocated_at, created_at
  ) VALUES (
    v_p5_murabaha_clinic, v_investor_id, 'allocated', 20000, 20000,
    20, 20, 1, 0.5, 100, 'completed',
    '2026-04-12 15:00:00+00', '2026-04-18 16:00:00+00', '2026-04-12 15:00:00+00'
  );

  -- Holding 6: Ijara (AED 15,000 allocated in Jun 2026 -> May 2026 is zero-filled gap)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount,
    pledged_units, allocated_units, investor_class_at_pledge, fee_percent_at_pledge,
    fee_amount, payment_status, pledged_at, allocated_at, created_at
  ) VALUES (
    v_p6_ijara_retail, v_investor_id, 'allocated', 15000, 15000,
    30, 30, 1, 0.5, 75, 'completed',
    '2026-05-28 10:00:00+00', '2026-06-01 12:00:00+00', '2026-05-28 10:00:00+00'
  );

  -- Holding 7: SPV Equity (AED 10,000 allocated in Jun 2026, 100 convertible units)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount,
    pledged_units, allocated_units, conversion_eligible_units, requested_conversion_units,
    investor_class_at_pledge, fee_percent_at_pledge, fee_amount, payment_status,
    pledged_at, allocated_at, created_at
  ) VALUES (
    v_p7_spv_cyber, v_investor_id, 'allocated', 10000, 10000,
    100, 100, 100, 100,
    1, 0.5, 50, 'completed',
    '2026-06-08 14:00:00+00', '2026-06-12 10:00:00+00', '2026-06-08 14:00:00+00'
  );

  -- Holding 8: Murabaha (Pledged 10k, Partially Allocated 5k, Refunded 5k in Jun 2026)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount, refunded_amount,
    pledged_units, allocated_units, investor_class_at_pledge, fee_percent_at_pledge,
    fee_amount, payment_status, pledged_at, allocated_at, created_at
  ) VALUES (
    v_p8_murabaha_warehouse, v_investor_id, 'allocated', 10000, 5000, 5000,
    20, 10, 1, 0.5, 50, 'completed',
    '2026-06-15 09:00:00+00', '2026-06-25 15:00:00+00', '2026-06-15 09:00:00+00'
  );

  -- Holding 9: Mudarabah (AED 5,000 allocated in Jun 2026) -> 9th Project (Grouped into "Other")
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount,
    pledged_units, allocated_units, investor_class_at_pledge, fee_percent_at_pledge,
    fee_amount, payment_status, pledged_at, allocated_at, created_at
  ) VALUES (
    v_p9_mudarabah_academy, v_investor_id, 'allocated', 5000, 5000,
    25, 25, 1, 0.5, 25, 'completed',
    '2026-06-20 11:30:00+00', '2026-06-30 17:00:00+00', '2026-06-20 11:30:00+00'
  );

  -- Pledge 10: Pending (AED 15,000 committed to live campaign -> Awaiting Allocation)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount,
    pledged_units, allocated_units, investor_class_at_pledge, fee_percent_at_pledge,
    fee_amount, payment_status, pledged_at, created_at
  ) VALUES (
    v_p10_pending_mobility, v_investor_id, 'pending', 15000, NULL,
    60, NULL, 1, 0.5, 75, 'completed',
    '2026-07-05 10:00:00+00', '2026-07-05 10:00:00+00'
  );

  -- Pledge 11: Rejected Oversubscribed (AED 10,000 -> Outcomes: Not Allocated)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount, refunded_amount,
    pledged_units, allocated_units, investor_class_at_pledge, fee_percent_at_pledge,
    fee_amount, payment_status, pledged_at, created_at
  ) VALUES (
    v_p11_rejected_cold, v_investor_id, 'rejected_oversubscribed', 10000, 0, 10000,
    20, 0, 1, 0.5, 50, 'completed',
    '2026-05-10 12:00:00+00', '2026-05-10 12:00:00+00'
  );

  -- Pledge 12: Refunded Soft Cap Failed (AED 10,000 -> Outcomes: Refunded)
  INSERT INTO public.pledges (
    project_id, investor_id, status, pledged_amount, allocated_amount, refunded_amount,
    pledged_units, allocated_units, investor_class_at_pledge, fee_percent_at_pledge,
    fee_amount, payment_status, pledged_at, created_at
  ) VALUES (
    v_p12_refunded_robotics, v_investor_id, 'refunded', 10000, 0, 10000,
    100, 0, 1, 0.5, 50, 'completed',
    '2026-04-20 16:00:00+00', '2026-04-20 16:00:00+00'
  );

  RAISE NOTICE 'SUCCESS: Seeded 12 test projects and 12 pledges for Investor ID: %', v_investor_id;
  RAISE NOTICE 'Expected Total Invested: AED 180,000 | Awaiting Allocation: AED 15,000 | Active Holdings: 9';
  RAISE NOTICE 'Expected Largest Holding Share: 25.0%% (AED 45,000 on Logistics Hub)';
END $$;
