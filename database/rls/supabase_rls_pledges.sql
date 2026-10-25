-- ==============================================================================
-- FILE: database/rls/supabase_rls_pledges.sql
-- PURPOSE:
--   Configures Row-Level Security (RLS) on `public.pledges` and `public.pledge_docs`.
--
-- ARCHITECTURE & SECURITY NOTES:
-- 1. SELECT-ONLY CLIENT ACCESS:
--    Grants `SELECT` permissions only to `authenticated` users and revokes
--    `INSERT`, `UPDATE`, and `DELETE` from both `anon` and `authenticated`.
--    All pledge creations, status transitions, wallet deductions, and document
--    records are executed server-side using `SUPABASE_SERVICE_KEY` (`service_role`),
--    which bypasses RLS.
--
-- 2. CLERK JWT CLAIM MAPPING:
--    - `auth.jwt()->>'sub'` maps to the Clerk User ID (`investors.user_id`).
--    - `auth.jwt()->>'org_id'` maps to the Clerk Organization ID (`issuers.org_id`
--      and institutional `investors.org_id`).
--
-- 3. INTEGER FOREIGN KEYS:
--    - `pledges.investor_id` -> `investors.id` (bigint PK)
--    - `pledges.project_id`  -> `projects.id` (bigint PK)
--    - `projects.issuer_id`  -> `issuers.id` (bigint PK)
--    - `pledge_docs.pledge_id` -> `pledges.id` (bigint PK)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable Row-Level Security on `public.pledges` and `public.pledge_docs`
-- ------------------------------------------------------------------------------
-- Forces all queries from non-service-role clients to pass an explicit RLS policy.
ALTER TABLE IF EXISTS public.pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pledge_docs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Revoke write permissions from client-facing roles (defense-in-depth)
-- ------------------------------------------------------------------------------
-- Ensures browser/client tokens can never directly insert, modify, or delete
-- pledges or subscription agreement document records.
REVOKE INSERT, UPDATE, DELETE ON public.pledges FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pledge_docs FROM anon, authenticated;

GRANT SELECT ON public.pledges TO authenticated;
GRANT SELECT ON public.pledge_docs TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Drop existing policies before recreating (idempotent rollout)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "investors_select_own_pledges" ON public.pledges;
DROP POLICY IF EXISTS "issuers_select_project_pledges" ON public.pledges;
DROP POLICY IF EXISTS "investors_select_own_pledge_docs" ON public.pledge_docs;
DROP POLICY IF EXISTS "issuers_select_project_pledge_docs" ON public.pledge_docs;

-- ------------------------------------------------------------------------------
-- 4. `public.pledges` SELECT policies
-- ------------------------------------------------------------------------------

-- Policy 4A (`investors_select_own_pledges`):
-- Allows an authenticated investor to read a row in `public.pledges` if and only if
-- `pledges.investor_id` matches their `public.investors.id` row (resolved via Clerk
-- `sub` claim matching `investors.user_id` or `org_id` claim matching `investors.org_id`).
CREATE POLICY "investors_select_own_pledges"
ON public.pledges
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.investors
    WHERE public.investors.id = public.pledges.investor_id
      AND (
        (public.investors.user_id = (auth.jwt()->>'sub'))
        OR
        ((auth.jwt()->>'org_id') IS NOT NULL AND public.investors.org_id = (auth.jwt()->>'org_id'))
      )
  )
);

-- Policy 4B (`issuers_select_project_pledges`):
-- Allows an authenticated issuer to read pledges belonging to projects owned by
-- their organization (`projects.issuer_id = issuers.id` and `issuers.org_id = auth.jwt()->>'org_id'`).
CREATE POLICY "issuers_select_project_pledges"
ON public.pledges
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    JOIN public.issuers ON public.issuers.id = public.projects.issuer_id
    WHERE public.projects.id = public.pledges.project_id
      AND (
        ((auth.jwt()->>'org_id') IS NOT NULL AND public.issuers.org_id = (auth.jwt()->>'org_id'))
      )
  )
);

-- ------------------------------------------------------------------------------
-- 5. `public.pledge_docs` SELECT policies
-- ------------------------------------------------------------------------------

-- Policy 5A (`investors_select_own_pledge_docs`):
-- Allows an authenticated investor to read `public.pledge_docs` rows linked to
-- their own pledges (`pledge_docs.pledge_id -> pledges.id -> investors.id`).
CREATE POLICY "investors_select_own_pledge_docs"
ON public.pledge_docs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pledges
    JOIN public.investors ON public.investors.id = public.pledges.investor_id
    WHERE public.pledges.id = public.pledge_docs.pledge_id
      AND (
        (public.investors.user_id = (auth.jwt()->>'sub'))
        OR
        ((auth.jwt()->>'org_id') IS NOT NULL AND public.investors.org_id = (auth.jwt()->>'org_id'))
      )
  )
);

-- Policy 5B (`issuers_select_project_pledge_docs`):
-- Allows an authenticated issuer to read `public.pledge_docs` rows for pledges
-- on projects owned by their issuer organization.
CREATE POLICY "issuers_select_project_pledge_docs"
ON public.pledge_docs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pledges
    JOIN public.projects ON public.projects.id = public.pledges.project_id
    JOIN public.issuers ON public.issuers.id = public.projects.issuer_id
    WHERE public.pledges.id = public.pledge_docs.pledge_id
      AND (
        ((auth.jwt()->>'org_id') IS NOT NULL AND public.issuers.org_id = (auth.jwt()->>'org_id'))
      )
  )
);
