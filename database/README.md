# Database SQL Reference (`database/`)

This directory contains all non-test PostgreSQL / Supabase SQL scripts for the crowdfunding platform, organized by purpose into **Schema & Indexes**, **RPC Functions**, and **Row-Level Security (RLS) Policies**.

---

## Directory Structure & Execution Order

| Order | File | Category | What It Does |
| :---: | :--- | :--- | :--- |
| **1** | [`rls/supabase_rls_pledges.sql`](./rls/supabase_rls_pledges.sql) | Row-Level Security | Enables RLS on `public.pledges` and `public.pledge_docs`, revokes client-side write access (`INSERT`, `UPDATE`, `DELETE`) from `anon` and `authenticated` roles, and creates `SELECT`-only policies so investors only read their own pledges/docs and issuers only read pledges/docs for campaigns they own. |
| **2** | [`schema/closing_schema.sql`](./schema/closing_schema.sql) | Schema Migration | Adds campaign-closing tracking columns to `public.projects` and `public.pledges`, updates status constraints to allow `'closing'`, `'funded'`, and `'failed'`, creates `public.wallet_transactions` (with duplicate-prevention unique index and investor `SELECT` RLS policy), and creates the `public.project_close_log` audit table. |
| **3** | [`rpc/closing_function.sql`](./rpc/closing_function.sql) | Postgres RPC Functions | Defines three `SECURITY DEFINER` Postgres RPC functions restricted to `service_role`: `apply_project_close` (atomically applies pledge allocations, processes wallet refunds with ledger rows, marks `projects` as `'funded'` or `'failed'`, and completes the `campaign_funded` system milestone), `claim_overdue_projects_for_closing` (batch cron lock), and `claim_single_project_for_closing` (single-project worker lock). |
| **4** | [`schema/class_limits_backstop.sql`](./schema/class_limits_backstop.sql) | Schema & Unique Indexes | Adds the stored generated column `pledges.pledge_quarter` (UTC calendar quarter start date of `pledged_at`) and creates two partial unique indexes (`uniq_class10_one_active_pledge` and `uniq_class9_10_one_pledge_per_quarter`) as a database-level concurrency backstop for Class 9 and Class 10 pledge limits. |

---

## Key Conventions

- **Integer Foreign Keys**: All foreign key columns (`investor_id`, `issuer_id`, `project_id`, `pledge_id`) use `bigint` referencing internal table primary keys (`investors.id`, `issuers.id`, `projects.id`, `pledges.id`), never Clerk string IDs (`user_...` or `org_...`).
- **Server-Only Mutations**: Client roles (`anon`, `authenticated`) have no write privileges on `pledges`, `pledge_docs`, `wallet_transactions`, or `project_close_log`. All writes and RPC executions run server-side via `supabaseAdmin` (`SUPABASE_SERVICE_KEY`).
