-- ==============================================================================
-- FILE: tests/pledge-limits/pledge-limits-test-cleanup.sql
-- PURPOSE:
--   Removes all synthetic test data created by `pledge-limits-test-seed.sql` and
--   any pledges/transactions generated during Tests 1–11.
--   Deletes in foreign-key dependency order inside a single transaction.
-- ==============================================================================

BEGIN;

-- 1. Delete wallet ledger rows (`pledge_debit`, `refund_credit`) belonging to
--    the synthetic `test.limits.*` investors or referencing `test-limit-*` pledges
DELETE FROM public.wallet_transactions
WHERE investor_id IN (SELECT id FROM public.investors WHERE email LIKE 'test.limits.%@example.com')
   OR pledge_id IN (
     SELECT pl.id FROM public.pledges pl
     JOIN public.projects pr ON pr.id = pl.project_id
     WHERE pr.slug LIKE 'test-limit-%'
   );

-- 2. Delete campaign closing log entries for `test-limit-*` projects
DELETE FROM public.project_close_log
WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%');

-- 3. Delete investor notifications created for `test-limit-*` projects or `test.limits.*` investors
DELETE FROM public.notifications
WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%')
   OR investor_id IN (SELECT id FROM public.investors WHERE email LIKE 'test.limits.%@example.com');

-- 4. Delete issuer portal notifications generated for `test-limit-*` projects
DELETE FROM public.issuer_notifications
WHERE action_url LIKE '/issuer-portal/projects/test-limit-%';

-- 5. Delete automatic project notification subscriptions for `test-limit-*` projects
DELETE FROM public.project_notification_subscriptions
WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%');

-- 6. Delete subscription agreement records (`pledge_docs`) for `test-limit-*` pledges
DELETE FROM public.pledge_docs
WHERE pledge_id IN (
  SELECT pl.id FROM public.pledges pl
  JOIN public.projects pr ON pr.id = pl.project_id
  WHERE pr.slug LIKE 'test-limit-%'
);

-- 7. Delete all pledges placed on `test-limit-*` projects or by `test.limits.*` investors
DELETE FROM public.pledges
WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%')
   OR investor_id IN (SELECT id FROM public.investors WHERE email LIKE 'test.limits.%@example.com');

-- 8. Delete system milestones automatically generated for `test-limit-*` projects
DELETE FROM public.project_milestones
WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%');

-- 9. Delete SPV detail rows (if any) for `test-limit-*` projects
DELETE FROM public.spv_details
WHERE project_id IN (SELECT id FROM public.projects WHERE slug LIKE 'test-limit-%');

-- 10. Delete the 3 synthetic `test-limit-*` projects
DELETE FROM public.projects
WHERE slug LIKE 'test-limit-%';

-- 11. Delete the 4 synthetic `test.limits.*` investors and `user_test_limits_*` users
DELETE FROM public.investors
WHERE email LIKE 'test.limits.%@example.com';

DELETE FROM public.users
WHERE user_id LIKE 'user_test_limits_%';

COMMIT;
