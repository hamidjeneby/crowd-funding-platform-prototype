# Investor Marketplace & Individual Project Page Specification

Comprehensive technical specification and operational guide for the **Investor Marketplace** (`/investor-portal/marketplace`) and **Individual Project Detail Page** (`/investor-portal/projects/[slug]`).

---

## 1. Overview & Core Philosophy

The Investor Marketplace and Project Detail pages form the primary discovery and investment portal for investors on the platform. The platform operates on five foundational principles:

1. **Class-Based Segmentation & Visibility**: Every investor is assigned an `investor_class` (1–10). This class governs maximum pledge ceilings, investor fee rates, conversion clause entitlements, and project visibility.
2. **Single-Pledge Rule**: An investor is permitted to make **only one active pledge per project**. Once an investor has pledged on a project, subsequent pledge attempts on that same project are blocked server-side and client-side.
3. **Live Funding Calculations from Pledges**: Raised funding metrics (total amount raised, percentage of target goal reached, and total pledged units) are calculated live by querying the `pledges` table (where `status != 'cancelled'`), independent of unit allocation or holdings issuance.
4. **UTC Date Standard**: All date and datetime values stored in the database and entered by users are assumed to be in **Coordinated Universal Time (UTC)** directly. Date strings are stored in ISO 8601 UTC format (`YYYY-MM-DDTHH:mm:ss.sssZ`) and rendered in UTC formats across cards, detail headers, and milestones.
5. **Frozen Pledge Snapshots**: At the moment a pledge is executed, key values (`investor_class_at_pledge`, `fee_percent_at_pledge`, `fee_amount`, `pledged_units`) are frozen on the `pledges` record.

---

## 2. Database Schemas & Sample Rows

Below are the exact database table schemas and sample data rows relevant to the marketplace and project detail views.

### 2.1 `projects` Table

Stores core campaign parameters, financial caps, Sharia contract classification, and campaign dates.

```sql
TABLE projects (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issuer_id BIGINT REFERENCES issuers(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, --unique name for the project to help build its unique url i.e /investor-portal/projects/[slug]
  summary TEXT,
  full_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_review', 'campaign_live', 'funded', 'completed', 'cancelled'
  sharia_contract_type TEXT NOT NULL, -- 'murabaha', 'mudarabah', 'ijara', 'spv_equity'
  shariah_compliance_status TEXT DEFAULT 'pending',
  shariah_certificate_doc_id BIGINT,
  visibility_tier TEXT DEFAULT '',
  min_eligible_investor_class INT DEFAULT 10, --Can be any number from 1-10 and is determined during onboarding review
  target_goal NUMERIC NOT NULL,
  soft_cap NUMERIC NOT NULL,
  hard_cap NUMERIC NOT NULL,
  min_investment_floor NUMERIC NOT NULL ,
  unit_price NUMERIC, -- The price per unit (e.g. AED 250 / sukuk or AED 50 / share) 
  expected_roi_percent NUMERIC,
  yield_type TEXT, -- 'rental', 'profit_margin', 'equity_appreciation' --Determined automatically based on contract type e.g if murabaha, profit_margin or if spv_equity, equity_appreciation or if ijara, rental
  currency TEXT NOT NULL DEFAULT 'AED', -- 'AED', 'MYR', 'USD', 'IDR'
  clearing_option TEXT NOT NULL, -- 'platform_clearing', 'custody_provider_clearing'
  is_spv BOOLEAN NOT NULL DEFAULT FALSE,
  current_step INT DEFAULT 1,
  cover_image_url TEXT,
  unit_type TEXT DEFAULT 'sukuk', -- 'sukuk', 'shares'
  campaign_end_date TIMESTAMPTZ
);
```

**Sample Row (`projects`):**
```json
[
  {
    "idx": 0,
    "id": 12,
    "created_at": "2026-09-13 19:29:34.64107+00",
    "issuer_id": 35,
    "title": "GreenGrid Solar Expansion Phase II",
    "slug": "greengrid-solar-expansion-phase-ii",
    "summary": "Expanding off-grid solar microgrids across rural Kenya to bring clean, reliable power to over 5,000 households and local businesses.",
    "full_description": "<h2>GreenGrid Solar Expansion Phase II</h2><p>Kenya Energy is scaling its localized renewable infrastructure...</p>",
    "status": "campaign_live",
    "sharia_contract_type": "mudarabah",
    "shariah_compliance_status": "pending",
    "shariah_certificate_doc_id": null,
    "visibility_tier": "",
    "min_eligible_investor_class": 5,
    "target_goal": 5500000,
    "soft_cap": 2000000,
    "hard_cap": 6000000,
    "min_investment_floor": 1000,
    "unit_price": 250,
    "expected_roi_percent": 14.5,
    "yield_type": "profit_margin",
    "currency": "AED",
    "clearing_option": "platform_clearing",
    "is_spv": true,
    "current_step": 6,
    "cover_image_url": "https://ddtxafswygsidegaclau.supabase.co/storage/v1/object/public/cover_img/org_3J6fjhVCJZWVqLgdVjQt1EQfiDm/5a3e99b4-6126-422b-aac3-e951ace0bed9.png",
    "unit_type": "sukuk",
    "campaign_end_date": "2027-12-31 21:00:00+00"
  }
]
```

---

### 2.2 `spv_details` Table

Stores Special Purpose Vehicle (SPV) legal entity registration details and conversion clause terms.

```sql
CREATE TABLE spv_details (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  spv_legal_name TEXT NOT NULL,
  registration_authority TEXT NOT NULL, -- 'DIFC', 'ADGM', 'LABUAN_IBFC', etc.
  registration_number TEXT NOT NULL,
  issuer_id BIGINT REFERENCES issuers(id),
  conversion_trigger_type TEXT DEFAULT 'share_price_above',
  conversion_enabled BOOLEAN DEFAULT FALSE,
  conversion_trigger_value NUMERIC, -- Trigger share price (e.g. 37.5)
  conversion_ratio_shares NUMERIC, -- 1 Sukuk unit converts to X shares (e.g. 5)
  conversion_deadline DATE, -- Conversion deadline date in UTC (e.g. '2028-01-01')
  total_shares_authorized NUMERIC,
  total_cost_authorized NUMERIC,
  spv_detail_verification_status TEXT DEFAULT 'pending'
);
```

**Sample Row (`spv_details`):**
```json
[
  {
    "idx": 0,
    "id": 4,
    "created_at": "2026-09-13 20:02:14.020648+00",
    "project_id": 12,
    "spv_legal_name": "GreenGrid Kenya SPV Limited",
    "registration_authority": "KRA",
    "registration_number": "112345678",
    "issuer_id": 35,
    "conversion_trigger_type": "share_price_above",
    "conversion_enabled": true,
    "conversion_trigger_value": 37.5,
    "conversion_ratio_shares": 5,
    "conversion_deadline": "2028-01-01",
    "total_shares_authorized": 50000,
    "total_cost_authorized": 2500000,
    "spv_detail_verification_status": "pending"
  }
]
```

---

### 2.3 `pledges` Table

Stores investor pledge commitments, frozen fee snapshots, and pledged units.

```sql
CREATE TABLE pledges (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id),
  investor_id BIGINT REFERENCES investors(id),
  pledged_amount NUMERIC NOT NULL,
  allocated_amount NUMERIC,
  investor_class_at_pledge INT NOT NULL, -- The class at the time of pledge
  fee_percent_at_pledge NUMERIC NOT NULL, -- The fee at the time of pledge
  fee_amount NUMERIC NOT NULL, -- The fee amount at the time of pledge |-------These three (investor_class_at_pledge, fee_percent_at_pledge, fee_amount) are frozen snapshots
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'allocated', 'cancelled'
  pledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  allocated_at TIMESTAMPTZ,
  payment_status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'refunded'
  pledged_units NUMERIC NOT NULL, -- Math.floor(pledged_amount / unit_price)
  conversion_eligible_units NUMERIC DEFAULT 0, -- Sukuk units eligible for equity conversion calculated at pledge time
  redeemed_at TIMESTAMPTZ -- Timestamp when pledge maturity/redemption is settled
);
```

**Sample Row (`pledges`):**
```json
[
  {
    "idx": 0,
    "id": 3,
    "created_at": "2026-09-21 19:05:54.787928+00",
    "project_id": 12,
    "investor_id": 30,
    "pledged_amount": 1000000,
    "allocated_amount": null,
    "investor_class_at_pledge": 4,
    "fee_percent_at_pledge": 0.8,
    "fee_amount": 8000,
    "status": "pending",
    "pledged_at": "2026-09-21 19:05:54.409+00",
    "allocated_at": null,
    "payment_status": "completed",
    "pledged_units": 4000
  }
]
```

---

### 2.4 Supporting Tables: `project_milestones`, `project_media`, `project_docs`

```sql
-- project_milestones
CREATE TABLE project_milestones (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE, -- Stored as UTC date string YYYY-MM-DD
  milestone_source TEXT NOT NULL, -- 'issuer' or 'system'
  linked_system_event TEXT, -- 'campaign_live', 'campaign_funded', 'custody_transfer_complete'
  status TEXT DEFAULT 'upcoming',
  issuer_id BIGINT REFERENCES issuers(id)
);

-- project_media
CREATE TABLE project_media (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  display_order INT DEFAULT 1,
  issuer_id BIGINT REFERENCES issuers(id)
);

-- project_docs
CREATE TABLE project_docs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- 'pitch_deck', 'balance_sheet', 'valuation_report', 'cap_table', 'spv_registration'
  file_url TEXT NOT NULL,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  issuer_id BIGINT REFERENCES issuers(id)
);
```

---

## 3. Related Documentation References

- **[class-rules.md]**: Governs `investor_class` (1–10) rules, pledge ceilings, fee rates, visibility filtering, and conversion eligibility caps.
- **[pledging-process.md]**: Governs server-side pledge validation rules, wallet balance deduction logic, frozen snapshot values, and single-pledge enforcement.
- **[project-creation-wizard.md]**: Governs issuer project creation, financial terms definition, SPV setup, and review submission.

---

## 4. Investor Marketplace (`/investor-portal/marketplace`)

The Marketplace page displays all active crowdfunding campaigns available to the authenticated investor.

### 4.1 Investor Context & Header Banner
The header of the marketplace displays key investor metadata:
- **Class Badge**: Displays current `investor_class` (e.g. `Class 4`).
- **Wallet Balance**: Displays current `wallet_balance` formatted with currency.
- **Quick Top-Up**: Link to `/investor-portal/wallet` for topping up funds.

### 4.2 Visibility Filtering Logic
The marketplace queries `getVisibleProjects(investorClass)` in [app/actions/marketplace.js](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/app/actions/marketplace.js):

| Investor Class | Allowed Project Visibility |
|---|---|
| **Class 1** | All projects, including pre-audit `draft` and `pending_review` status |
| **Classes 2–4** | All live campaigns (`status = 'campaign_live'`) |
| **Class 5** | Live campaigns with `target_goal > AED 5,000,000` |
| **Class 6** | Live campaigns with `target_goal > AED 10,000,000` |
| **Class 7** | Live campaigns with `target_goal > AED 15,000,000` |
| **Class 8** | Live campaigns with `target_goal > AED 20,000,000` |
| **Classes 9–10** | Live campaigns (subject to quarterly pledge frequency limits) |

### 4.3 Client-Side Filters & Controls
- **Search Input**: Case-insensitive filtering against project title, summary, and description.
- **Contract Type Filter Tabs**:
  - `All Structures`
  - `Murabaha`
  - `Mudarabah`
  - `Ijara`
  - `SPV Equity`

### 4.4 Project Card Data & Calculations
Each project card in the marketplace grid renders:
1. **Cover Image**: `cover_image_url` or default gradient fallback.
2. **Top Badges**:
   - Status Tag: `Pre-Audit / Unreviewed` (Class 1) or `Live Campaign`.
   - **Conversion Available Badge**: Displayed if `is_conversion_enabled = true` and `sharia_contract_type != 'spv_equity'`.
   - Sharia Contract Tag: Badged by contract type (e.g., `MUDARABAH`, `SPV EQUITY`).
3. **Title & Summary**: Project title and 2-line truncated summary.
4. **Live Funding Progress**:
   - Total Subscribed Amount = `SUM(pledges.pledged_amount)` for this project where `status NOT IN ('cancelled', 'refunded', 'rejected_oversubscribed')`.
   - Target Goal = `projects.target_goal`.
   - Subscription Percentage = `((total_subscribed / target_goal) * 100).toFixed(1)` (unconstrained, e.g. `124.5% Subscribed`).
   - Funding Progress Bar: Clamped at 100% visual fill.
   - **Oversubscribed Badge**: Renders when `rawPercent > 100%`.
5. **Requested Conversion Demand Bar (Classes 1–4 Only)**:
   - Visible **ONLY** to Class 1, 2, 3, and 4 investors when conversion is enabled. **Hidden for Classes 5–10.**
   - Total Convertible Units = `floor(total_shares_authorized / conversion_ratio_shares)`.
   - Requested Converted Units = `SUM(pledges.requested_conversion_units ?? pledges.conversion_eligible_units)`.
   - Demand Percentage = `((requested_units / total_convertible_units) * 100).toFixed(1)`.
   - Label: `Requested demand ({percent}%)`.
6. **Campaign Deadline Badge**:
   - Formatted in UTC: `formatUtcDate(campaign_end_date)` -> e.g. `31 Dec 2027, 21:00 UTC`.
7. **Key Metrics**:
   - Min Floor: `currency min_investment_floor` (e.g. `AED 1,000`).
   - Unit Price: `currency unit_price` (e.g. `AED 250 / sukuk`).
   - Expected ROI: `${expected_roi_percent}% ROI` (hidden for `spv_equity`).
8. **Action Button**: "View Project Details" -> routes to `/investor-portal/projects/${slug}`.

---

## 5. Individual Project Page (`/investor-portal/projects/[slug]`)

The Individual Project page presents deep due-diligence data, segmented allocation analytics, and the interactive **Investment Action Panel**.

### 5.1 Hero Banner & Overview Section
- **Title & Issuer Name**: Official project title and issuing entity legal name.
- **Contract & Compliance Badges**: Sharia contract type, Sharia compliance status (`pending` / `verified`), `Conversion Available` badge (if applicable), SPV structure badge.
- **Cover Image & Primary Action**: Large hero visual.
- **Capitalization Metrics**: "Subscribed so far", unconstrained display percentage (e.g. `130% Subscribed`), and "Oversubscribed" badge.

### 5.2 Segmented Visual Progress Analytics

#### A. Class Band Subscription Bar ("Subscribed so far")
Displays the distribution of live pledge commitments segmented by investor class band:
- **Priority Color Grading**: Darker emerald tones represent higher allocation priority (Class 1 darkest `#022c22`, Class 2 `#064e3b`, Class 3 `#047857`, Class 4 `#0d9488`, Retail `#34d399`).
- **Viewer Band Highlight**: Outlined with an amber highlight ring to identify the viewer's position in the capital stack.
- **100% Target Marker**: Vertical indicator when oversubscribed showing where the campaign target/capacity sits relative to total commitments.
- **Soft Cap Marker**: Dashed indicator showing the minimum viable capitalization threshold.
- **Privacy Threshold**:
  - *Standard Contracts*: Privacy merging applies strictly to high-class tiers (Class 1 and Class 2–4). If either has fewer than 3 pledges, they merge into **Class 1–4** (maximum grouping). Lower tiers (**Class 5–7** and **Class 8–10**) never merge, remaining distinct regardless of pledge count to ensure retail tiers are never conflated with high-net-worth tiers.
  - *SPV Equity Projects (`spv_equity`)*: Because SPV equity projects are restricted to Class 1–4 investors only, the subscription bar splits into two distinct bands: **Class 1–2** (`#022c22`) and **Class 3–4** (`#047857`). No 3-pledge privacy merge is applied: even if there is only 1 pledge in a tier, it renders separately as **Class 1–2** or **Class 3–4** with its respective percentage.
- **Viewer Callout Alert**: Dynamic copy below the bar communicating projected allocation:
  - Band fully within 100%: *"At current subscription levels, your class band is projected to be fully allocated at campaign close."*
  - Band spans across 100%: *"At current subscription levels, your class band may be partially allocated. Allocation prioritises larger pledges, then earlier pledges."*
  - Band entirely beyond 100%: *"At current subscription levels, pledges in your class are not projected to be allocated unless higher-priority pledges are cancelled before close."*

#### B. Conversion Demand Bar (Classes 1–4 Only)
Replaces the old first-come-first-served conversion pool bar:
- Displays **"Requested demand"** with total requested units vs authorized pool units.
- **Low Demand Coarse State**: If fewer than 3 pledges have requested conversion units, displays a privacy-safe "Low demand" badge without disclosing exact pledge counts.
- **Viewer Priority Marker**: Displays a vertical indicator marking pledges at or above the viewer's investor class.
- **Oversubscribed Indicator**: Alerts investors when total demand exceeds available equity conversion capacity, noting that units will be allocated by class priority at close.

### 5.3 Detailed Content Sections
1. **Overview**: Rendered HTML full description sanitized via DOMPurify.
2. **Financial & Offer Terms**:
   - **Funding Targets**: Target Goal, Soft Cap, Hard Cap, and Campaign Deadline in UTC.
   - **Unit Terms**:
     - Price label is dynamically rendered: displays **"Share Price:"** when `unit_type === 'shares'` (or `sharia_contract_type === 'spv_equity'`), and **"Unit / Sukuk Price:"** when `unit_type === 'sukuk'`.
     - Displays Unit Type and Total Authorized Units.
   - **Returns & Frequency**:
     - Displays Expected ROI, Distribution Frequency, and Total Cost Authorized for standard debt/sukuk contracts.
     - **SPV Equity Rule**: Suppressed entirely when `sharia_contract_type === 'spv_equity'` (no fixed returns or coupon distributions apply to equity structures). When suppressed, the Financial Terms grid adapts seamlessly to a 2-column balanced layout.
3. **Roadmap & Milestones**: Verified platform and issuer milestones in UTC.
4. **Document Vault**: Pitch deck, financials, valuation report, cap table.
5. **Media Gallery**: Supplementary campaign visuals.
6. **SPV & Legal Entity Details**:
   - Renders SPV Legal Name and Registration Authority (e.g., ADGM, DIFC).
   - **Privacy Rule**: The internal SPV registration number is suppressed on the public/investor-facing project page.
7. **Conversion Terms Card**: Dedicated summary of trigger share price, ratio, cutoff deadline, and class value cap.

---

## 6. Interactive Investment Action Panel & Pledging Logic

The right-hand column on the project page contains the live pledging widget.

### 6.1 Oversubscription Ceiling & Eligibility
- **Oversubscription Ceiling**: Total pending pledges are permitted up to **150% of capacity** (`MAX_OVERSUBSCRIPTION_PERCENT = 150`, where capacity is `hard_cap || target_goal`). Pledges attempting to exceed 150% are rejected.
- **Single-Pledge Restriction Check**: Checked dynamically (`status NOT IN ('cancelled', 'refunded', 'rejected_oversubscribed')`).
- **Pledge Request Modal**:
  - Titled **"Pledge request"**.
  - Displays investor wallet balance, floor, and class cap.
  - **Live Pre-Confirmation Cost Breakdown**: Displays real-time breakdown of Pledge Principal, Pledge Charge / Investor Fee (by investor class percentage), and Total Amount (total debited from wallet) before the user clicks to submit the pledge.
  - Computes estimated units and maximum eligible conversion units.
  - **Sukuk-to-Equity Conversion Controls (Classes 1–4)**: Displays the maximum eligible conversion units and provides interactive reduction controls (numeric input, `0 (Opt Out)` and `Max` buttons) so investors can reduce their requested conversion units if they prefer to retain standard Sukuk without converting to shares.
  - Presents **"How your pledge works"** disclosure panel (`PLEDGE_DISCLOSURES`).
  - Contains mandatory terms acceptance checkbox: *"I've read and accept the subscription terms for this pledge"*.
  - Confirm button: **"Submit pledge"** (disabled until terms accepted and balance verified).
  - Captures `signed_at` and `signed_ip` audit metadata.
  - Inserts `pledge_docs` record (`doc_type: 'subscription_agreement'`).
  - Dispatches fire-and-forget Make webhook payload for background legal PDF generation and emailing.

---

## 7. Row-Level Security (RLS) Architecture

Client access to pledges and documents is protected via Postgres Row-Level Security:
- **SELECT-Only Policies**: Authenticated investors may only query their own pledges and pledge documents (`investors.user_id = auth.jwt()->>'sub'` or `investors.org_id = auth.jwt()->>'org_id'`). Issuers may only select pledges and documents for projects they own.
- **Mutations Blocked**: INSERT, UPDATE, and DELETE permissions are revoked from `anon` and `authenticated` roles. All pledge creations, status transitions, and document records are executed strictly server-side via `supabaseAdmin` using `SUPABASE_SERVICE_KEY`.
- **Clerk JWT Org Mapping**: Requires `"org_id": "{{org.id}}"` mapped in Clerk Dashboard Supabase JWT template for organization-scoped lookups.
---

## 8. Conversion Entitlements Summary

Conversion rights display dynamically on the project page based on `class-rules.md`:

| Investor Class | Conversion Rights | Conversion Cap |
|---|---|---|
| **Class 1** | Yes — full economic benefit | Unlimited (Full holding) |
| **Class 2** | Yes — capped | AED 1,000,000 conversion value |
| **Class 3** | Yes — capped | AED 500,000 conversion value |
| **Class 4** | Yes — capped | AED 250,000 conversion value |
| **Classes 5–10** | No — Cash-only Sukuk | AED 0 (No conversion rights) |
| **SPV Equity** | Direct shareholding | N/A (Already equity) |

---

## 9. Summary Checklist for Developers & Auditors

- [x] All funding progress queries filter out `cancelled`, `refunded`, and `rejected_oversubscribed` pledges.
- [x] Subscription progress % displayed unconstrained (e.g. `130% Subscribed`), visual bars clamped to 100%.
- [x] "Oversubscribed" badge rendered when `rawPercent > 100%`.
- [x] Class Band Subscription Bar renders segmented bands with priority color grading and viewer band callout.
- [x] Conversion Demand Bar reflects requested demand and coarse "Low demand" state for < 3 pledges.
- [x] Single-pledge rule enforced server-side and client-side per project per investor.
- [x] Oversubscription ceiling enforced at `150%` of capacity (`MAX_OVERSUBSCRIPTION_PERCENT = 150`).
- [x] Mandatory terms acceptance checkbox required at pledge time (`acceptedTerms === true`).
- [x] Audit metadata (`signed_at`, `signed_ip`, `terms_version`) captured and written to `pledge_docs`.
- [x] Asynchronous Make webhook dispatched for subscription agreement generation.
- [x] RLS SELECT-only policies configured on `pledges` and `pledge_docs`.
