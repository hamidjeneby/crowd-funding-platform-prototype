# "Request, Then Allocate" Pledge Model & Privacy Verification (`tests/pledge-model/`)

This directory contains the verification script for the platform's core pledge mechanics, conversion limits, and issuer privacy aggregation rules.

---

## Files in This Folder

| File | Purpose |
| :--- | :--- |
| [`test-pledge-model.mjs`](./test-pledge-model.mjs) | Live script that connects to Supabase using `.env.local` to verify schema integrity, constants, calculation formulas, webhook payloads, and issuer-facing class band privacy merging rules. |

---

## How to Run

Run from the repository root:

```bash
npm run test:pledge
# or directly:
node --env-file=.env.local tests/pledge-model/test-pledge-model.mjs
```

---

## What It Verifies

1. **Config & Constants Integrity**:
   - `MAX_OVERSUBSCRIPTION_PERCENT` is `150`.
   - `PLEDGE_TERMS_VERSION` is `'v1.0'`.
   - Class 1 conversion cap is `Infinity` (uncapped).
   - Class 2 conversion cap is `1,000,000`.
   - Disclosures and checkbox label constants are exported.
2. **Conversion & Ceiling Math**:
   - `requested_conversion_units` formula correctly applies unit price and class caps.
   - Pledges exactly meeting the 150% oversubscription ceiling are permitted; pledges exceeding 150% are blocked.
3. **Database Schema Integrity**:
   - Live check that `public.pledges` has `status`, `pledged_amount`, `requested_conversion_units`, `conversion_eligible_units`, `allocated_amount`, `allocation_rank`, `refunded_amount`.
   - Live check that `public.pledge_docs` has `terms_version`, `signed_at`, `signed_ip`.
   - Live check that `public.investors` has `user_id`, `org_id`, `investor_class`, `wallet_balance`.
4. **Server Action Query Aggregations**:
   - Verifies that active pledges queries properly exclude `cancelled`, `refunded`, and `rejected_oversubscribed` rows.
5. **Webhook Payload Privacy**:
   - Ensures subscription agreement webhooks contain agreement audit fields (`terms_version`, `signed_at`, `signed_ip`) without leaking investor names or emails (PII).
6. **Issuer Class Band Privacy Merging (k-Anonymity)**:
   - Verifies the rule that Classes 1–4 are grouped together as `"Class 1–4"` when fewer than 3 investors are present in either tier, preserving high-net-worth investor confidentiality.
