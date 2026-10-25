# Master Test & Verification Index (`tests/`)

This directory contains all automated test suites, database seeding/cleanup scripts, live verification guides, and diagnostic utilities for the crowdfunding platform.

---

## Directory Overview

```text
tests/
├── README.md                          # This master index
├── pledge-limits/                     # Class 9 & Class 10 Pledge Limits Suite
│   ├── README.md                      # Comprehensive guide (Tests 1–11 instructions & expected outcomes)
│   ├── test-pledge-limits.mjs         # Pure unit tests (node:test)
│   ├── pledge-limits-test-seed.sql    # Supabase SQL seed script
│   └── pledge-limits-test-cleanup.sql # Supabase SQL cleanup script
├── campaign-closing/                  # Campaign Closing & Allocation Engine Suite
│   ├── README.md                      # Scenarios S1–S15 guide & API curl instructions
│   ├── test-closing.mjs               # Pure unit tests (node:test)
│   ├── closing-test-seed.sql          # Supabase SQL seed script (S1–S15)
│   └── closing-test-cleanup.sql       # Supabase SQL cleanup script
├── portfolio/                         # Investor Portfolio Page Test & Preview Suite
│   ├── README.md                      # Verification guide, expected outcomes & SQL queries
│   ├── test-portfolio-aggregate.mjs   # Pure unit tests (node:test)
│   ├── portfolio-test-seed.sql        # Supabase SQL seed script (12 campaigns, 12 pledges)
│   └── portfolio-test-cleanup.sql     # Supabase SQL cleanup script
├── pledge-model/                      # "Request, Then Allocate" Pledge Model Suite
│   ├── README.md                      # Verification guide & description
│   └── test-pledge-model.mjs          # Live Supabase schema & privacy band verification
└── diagnostics/                       # Storage & Connectivity Diagnostic Scripts
    ├── README.md                      # Short explanation of diagnostic scripts
    ├── test-db.js                     # Supabase DB connection test
    ├── test-service-upload.js         # Supabase Storage direct upload test
    └── test-upsert.js                 # Signed upload URL generation test
```

---

## Quick Command Reference

| Test Suite | Command | Requirements |
| :--- | :--- | :--- |
| **Portfolio Unit Tests** | `npm run test:portfolio` | Node.js only (no DB required) |
| **Pledge Limits Unit Tests** | `npm run test:pledge-limits` | Node.js only (no DB required) |
| **Campaign Closing Unit Tests** | `npm run test:closing` | Node.js only (no DB required) |
| **Pledge Model Live Verification** | `npm run test:pledge` | Requires `.env.local` with Supabase credentials |
| **Database Diagnostics** | `node --env-file=.env.local tests/diagnostics/test-db.js` | Requires `.env.local` |
| **Storage Diagnostics** | `node --env-file=.env.local tests/diagnostics/test-service-upload.js` | Requires `.env.local` |

---

## Production Database SQL Scripts

For production schema migrations, Postgres RPC functions, and Row-Level Security policies, see the [`database/`](../database/README.md) directory:
- [`database/schema/`](../database/schema/): Tables, constraints, and partial unique index backstops.
- [`database/rpc/`](../database/rpc/): Postgres transactional functions (`apply_project_close`, `claim_overdue_projects_for_closing`).
- [`database/rls/`](../database/rls/): Row-Level Security policies on `pledges` and `pledge_docs`.
