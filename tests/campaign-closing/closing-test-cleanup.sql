-- ==============================================================================
-- CAMPAIGN CLOSING SYSTEM — TEST CLEANUP SCRIPT
-- ==============================================================================
-- Removes all rows created by scripts/closing-test-seed.sql (projects with slug
-- starting with 'test-closing-' and synthetic investors matching
-- 'test.closing.%@example.com').
-- ==============================================================================

BEGIN;

-- 0. Reverse any test refund_credit amounts credited to real (non-synthetic) investors
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

-- 1. Delete wallet_transactions referencing test pledges or synthetic test investors
DELETE FROM public.wallet_transactions
WHERE pledge_id IN (
  SELECT pl.id
  FROM public.pledges pl
  JOIN public.projects pr ON pr.id = pl.project_id
  WHERE pr.slug LIKE 'test-closing-%'
)
OR investor_id IN (
  SELECT id FROM public.investors WHERE email LIKE 'test.closing.%@example.com'
);

-- 2. Delete project_close_log entries for test projects
DELETE FROM public.project_close_log
WHERE project_id IN (
  SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%'
);

-- 3. Delete investor notifications for test projects or synthetic test investors
DELETE FROM public.notifications
WHERE project_id IN (
  SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%'
)
OR investor_id IN (
  SELECT id FROM public.investors WHERE email LIKE 'test.closing.%@example.com'
);

-- 4. Delete issuer notifications for test projects
DELETE FROM public.issuer_notifications
WHERE action_url LIKE '/issuer-portal/projects/test-closing-%'
   OR notification_text IN (
     SELECT 'campaign_closed:project_' || id::text
     FROM public.projects
     WHERE slug LIKE 'test-closing-%'
   );

-- 5. Delete project notification subscriptions for test projects
DELETE FROM public.project_notification_subscriptions
WHERE project_id IN (
  SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%'
);

-- 6. Delete pledge_docs for test projects
DELETE FROM public.pledge_docs
WHERE pledge_id IN (
  SELECT pl.id
  FROM public.pledges pl
  JOIN public.projects pr ON pr.id = pl.project_id
  WHERE pr.slug LIKE 'test-closing-%'
);

-- 7. Delete pledges for test projects
DELETE FROM public.pledges
WHERE project_id IN (
  SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%'
);

-- 8. Delete milestones for test projects
DELETE FROM public.project_milestones
WHERE project_id IN (
  SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%'
);

-- 9. Delete SPV details for test projects
DELETE FROM public.spv_details
WHERE project_id IN (
  SELECT id FROM public.projects WHERE slug LIKE 'test-closing-%'
);

-- 10. Delete test projects
DELETE FROM public.projects
WHERE slug LIKE 'test-closing-%';

-- 11. Delete synthetic test investors and users
DELETE FROM public.investors
WHERE email LIKE 'test.closing.%@example.com';

DELETE FROM public.users
WHERE user_id LIKE 'user_test_closing_%';

COMMIT;
