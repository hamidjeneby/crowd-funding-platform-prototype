-- =============================================================================
-- FILE: database/schema/custody_and_clearing.sql
-- PURPOSE:
--   Creates the `public.custody_and_clearing` table referenced in the Sukuk /
--   Share Certificate template (authoritative registry file record).
--
-- HOW TO RUN:
--   Run this script in the Supabase SQL Editor if third-party custody registry
--   integration is enabled.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.custody_and_clearing (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_id bigint NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  custodian_name text,
  custody_account_number text,
  registry_file_url text, -- Storage or external URL to the custodian's authoritative registry file
  clearing_status text NOT NULL DEFAULT 'pending' CHECK (clearing_status IN ('pending', 'in_escrow', 'settled', 'failed')),
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_custody_and_clearing_project UNIQUE (project_id)
);

-- Enable Row-Level Security
ALTER TABLE public.custody_and_clearing ENABLE ROW LEVEL SECURITY;

-- Revoke write permissions from client-facing roles (writes happen via service_role)
REVOKE INSERT, UPDATE, DELETE ON public.custody_and_clearing FROM anon, authenticated;
GRANT SELECT ON public.custody_and_clearing TO authenticated;

-- Allow investors with allocated pledges to read the custody registry file
DROP POLICY IF EXISTS "investors_select_project_custody" ON public.custody_and_clearing;
CREATE POLICY "investors_select_project_custody"
ON public.custody_and_clearing
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pledges
    JOIN public.investors ON public.investors.id = public.pledges.investor_id
    WHERE public.pledges.project_id = public.custody_and_clearing.project_id
      AND public.pledges.status = 'allocated'
      AND (
        (public.investors.user_id = (auth.jwt()->>'sub'))
        OR
        ((auth.jwt()->>'org_id') IS NOT NULL AND public.investors.org_id = (auth.jwt()->>'org_id'))
      )
  )
);

-- Allow issuers to read custody record for their projects
DROP POLICY IF EXISTS "issuers_select_project_custody" ON public.custody_and_clearing;
CREATE POLICY "issuers_select_project_custody"
ON public.custody_and_clearing
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    JOIN public.issuers ON public.issuers.id = public.projects.issuer_id
    WHERE public.projects.id = public.custody_and_clearing.project_id
      AND (
        ((auth.jwt()->>'org_id') IS NOT NULL AND public.issuers.org_id = (auth.jwt()->>'org_id'))
      )
  )
);

COMMIT;
