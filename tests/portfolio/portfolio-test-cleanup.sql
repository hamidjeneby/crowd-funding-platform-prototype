-- ==============================================================================
-- FILE: tests/portfolio/portfolio-test-cleanup.sql
-- PURPOSE:
--   Cleans up all test campaigns and test pledges created by
--   `tests/portfolio/portfolio-test-seed.sql` (or via /api/internal/test-portfolio).
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard -> SQL Editor.
--   2. Paste and run this script.
--   3. All `test-portfolio-*` records are deleted safely.
-- ==============================================================================

DO $$
DECLARE
  v_deleted_pledges  integer := 0;
  v_deleted_projects integer := 0;
BEGIN
  -- 1. Delete notifications related to test portfolio campaigns
  DELETE FROM public.notifications
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE slug LIKE 'test-portfolio-%'
  );

  -- 2. Delete wallet transactions related to test portfolio pledges
  DELETE FROM public.wallet_transactions
  WHERE pledge_id IN (
    SELECT pl.id FROM public.pledges pl
    JOIN public.projects pr ON pr.id = pl.project_id
    WHERE pr.slug LIKE 'test-portfolio-%'
  );

  -- 3. Delete pledge documents (subscription agreements) related to test pledges
  DELETE FROM public.pledge_docs
  WHERE pledge_id IN (
    SELECT pl.id FROM public.pledges pl
    JOIN public.projects pr ON pr.id = pl.project_id
    WHERE pr.slug LIKE 'test-portfolio-%'
  );

  -- 4. Delete all test portfolio pledges
  WITH deleted_p AS (
    DELETE FROM public.pledges
    WHERE project_id IN (
      SELECT id FROM public.projects WHERE slug LIKE 'test-portfolio-%'
    )
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_pledges FROM deleted_p;

  -- 5. Delete all test portfolio projects
  WITH deleted_pr AS (
    DELETE FROM public.projects
    WHERE slug LIKE 'test-portfolio-%'
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_projects FROM deleted_pr;

  RAISE NOTICE 'SUCCESS: Cleaned up % test pledges and % test projects.', v_deleted_pledges, v_deleted_projects;
END $$;
