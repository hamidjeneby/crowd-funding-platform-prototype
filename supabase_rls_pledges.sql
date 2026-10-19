-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR PLEDGES AND PLEDGE_DOCS
-- ==============================================================================
-- Target Tables:
--   - public.pledges
--   - public.pledge_docs
--
-- ARCHITECTURE & SECURITY NOTES:
-- 1. SELECT-ONLY ACCESS:
--    These policies grant SELECT permissions only to authenticated users.
--    INSERT, UPDATE, and DELETE operations are intentionally NOT granted to
--    'authenticated' or 'anon' roles.
--    All pledge creations, status transitions, wallet deductions, and document
--    records are handled strictly server-side using the service role key
--    (supabaseAdmin / SUPABASE_SERVICE_KEY), which automatically bypasses RLS.
--
-- 2. CLERK JWT CLAIM REQUIREMENTS:
--    - 'auth.jwt()->>''sub''' maps to the Clerk User ID (stored in investors.user_id).
--    - 'auth.jwt()->>''org_id''' maps to the Clerk Organization ID (stored in issuers.org_id and institutional investors.org_id).
--    IMPORTANT: In Clerk, session tokens do NOT include 'org_id' in Supabase JWTs
--    unless explicitly mapped in your Clerk Dashboard JWT Template (e.g., "org_id": "{{org.id}}").
--    For investors, if 'org_id' is null or absent from the JWT, the condition falls back safely
--    to 'investors.user_id = auth.jwt()->>''sub'''.
--
-- 3. FOREIGN KEY RELATIONSHIPS:
--    - pledges.investor_id references investors.id (bigint / integer internal PK)
--    - pledges.project_id references projects.id (bigint / integer internal PK)
--    - projects.issuer_id references issuers.id (bigint / integer internal PK)
--    - pledge_docs.pledge_id references pledges.id (bigint / integer internal PK)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable RLS on pledges and pledge_docs
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pledge_docs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Revoke write permissions from client-facing roles (Defense-in-depth)
-- ------------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.pledges FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pledge_docs FROM anon, authenticated;

GRANT SELECT ON public.pledges TO authenticated;
GRANT SELECT ON public.pledge_docs TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Drop existing policies if any (Clean idempotent rollout)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "investors_select_own_pledges" ON public.pledges;
DROP POLICY IF EXISTS "issuers_select_project_pledges" ON public.pledges;
DROP POLICY IF EXISTS "investors_select_own_pledge_docs" ON public.pledge_docs;
DROP POLICY IF EXISTS "issuers_select_project_pledge_docs" ON public.pledge_docs;

-- ------------------------------------------------------------------------------
-- 4. PLEDGES POLICIES (SELECT-ONLY)
-- ------------------------------------------------------------------------------

-- Policy 4A: Investors can select their own pledges
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

-- Policy 4B: Issuers can select pledges for campaigns they own
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
-- 5. PLEDGE_DOCS POLICIES (SELECT-ONLY)
-- ------------------------------------------------------------------------------

-- Policy 5A: Investors can select document records for their own pledges
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

-- Policy 5B: Issuers can select document records for pledges on campaigns they own
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
