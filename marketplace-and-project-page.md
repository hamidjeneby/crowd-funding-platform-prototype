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
   - Total Pledged Amount = `SUM(pledges.pledged_amount)` for this project where `status != 'cancelled'`.
   - Target Goal = `projects.target_goal`.
   - Funding Percentage = `((total_pledged / target_goal) * 100).toFixed(1)` (e.g., `18.2%`).
   - Funding Progress Bar: Visual bar capped at 100%.
5. **Conversion Pool Percentage Bar (Classes 1–4 Only)**:
   - Visible **ONLY** to Class 1, 2, 3, and 4 investors when conversion is enabled. **Hidden for Classes 5–10.**
   - Total Convertible Units = `floor(total_shares_authorized / conversion_ratio_shares)`.
   - Pledged Converted Units = `SUM(pledges.conversion_eligible_units)` for this project.
   - Conversion Percentage = `((pledged_converted_units / total_convertible_units) * 100).toFixed(1)`.
6. **Campaign Deadline Badge**:
   - Formatted in UTC: `formatUtcDate(campaign_end_date)` -> e.g. `31 Dec 2027, 21:00 UTC`.
7. **Key Metrics**:
   - Min Floor: `currency min_investment_floor` (e.g. `AED 1,000`).
   - Unit Price: `currency unit_price` (e.g. `AED 250 / sukuk`).
   - Expected ROI: `${expected_roi_percent}% ROI` (hidden for `spv_equity`).
8. **Action Button**: "View Project Details" -> routes to `/investor-portal/projects/${slug}`.

---

## 5. Individual Project Page (`/investor-portal/projects/[slug]`)

The Individual Project page presents deep due-diligence data and the interactive **Investment Action Panel**.

### 5.1 Hero Banner & Overview Section
- **Title & Issuer Name**: Official project title and issuing entity legal name.
- **Contract & Compliance Badges**: Sharia contract type, Sharia compliance status (`pending` / `verified`), `Conversion Available` badge (if applicable), SPV structure badge.
- **Cover Image & Primary Action**: Large hero visual.

### 5.2 Detailed Content Sections
1. **Overview**:
   - Rendered HTML full description (`full_description`) sanitized via DOMPurify.
   - Highlights the core problem, solution, revenue model, and market impact.
2. **Roadmap & Milestones**:
   - Displays combined list of **Issuer Milestones** and **System Milestones** (`campaign_live`, `campaign_funded`, `custody_transfer_complete`).
   - Ordered chronologically by `target_date`.
   - Dates displayed in UTC (`formatUtcDateOnly` / `formatUtcDate`).
3. **Document Vault**:
   - Secure links to project documents (`pitch_deck`, `balance_sheet`, `valuation_report`, `cap_table`, `spv_registration`).
4. **Media Gallery**:
   - Grid gallery of supplementary images from `project_media` with interactive modal viewer.
5. **SPV & Legal Entity Details**:
   - Legal entity name, registration authority, registration number, Sharia compliance certificate link.
6. **Dedicated Equity Conversion Privileges & Terms Card (Classes 1–4 Only)**:
   - Visible **ONLY** to Class 1–4 investors when project has conversion enabled.
   - Displays:
     - Conversion Trigger Share Price (`conversion_trigger_price`).
     - Conversion Ratio (`1 Sukuk unit = X shares`).
     - Conversion Cutoff / Deadline formatted in **UTC** (`conversion_deadline`).
     - Investor Class Conversion Value Cap (Class 1: Unlimited, Class 2: AED 1M, Class 3: AED 500k, Class 4: AED 250k).
     - Conversion Pool Capacity Progress Bar & Remaining Pool Units.
     - Conversion Clauses & Governing Legal Terms (`conversion_clauses`).

---

## 6. Interactive Investment Action Panel & Pledging Logic

The right-hand column on the project page contains the live pledging widget.

### 6.1 Live Funding Headroom & Percentage
- **Raised Amount**: Sum of all active pledges for this project (`SUM(pledged_amount)`).
- **Target Goal**: `projects.target_goal`.
- **Hard Cap**: `projects.hard_cap`.
- **Funding Percentage**: `(total_pledged / target_goal) * 100` rounded to 1 decimal place (`.toFixed(1)`).

### 6.2 Single-Pledge Restriction Check
Before allowing the investor to input an amount, the system executes:
```javascript
const { eligible, reason, existingPledge } = await checkInvestEligibility(projectId, investor.id);
```
- If `existingPledge` is found (`pledges` table has a record with matching `project_id` and `investor_id`):
  - The pledge form is **disabled**.
  - An inline alert card is displayed:
    > **Already Pledged**
    > You have already placed a pledge of **AED {existingPledge.pledged_amount}** ({existingPledge.pledged_units} units) on this project. Investors are allowed a maximum of one pledge per project.

### 6.3 Real-Time Pledge Calculator
When eligible to pledge:
1. **Pledge Amount Input**:
   - Validated against `min_investment_floor` (e.g. >= 1,000 AED).
   - Validated against Investor Class Ceiling (from `class-rules.md`, e.g. Class 4 max pledge is AED 1,000,000).
   - Validated against Hard Cap headroom (`hard_cap - total_pledged`).
2. **Pledged Units Calculation**:
   $$\text{pledged\_units} = \left\lfloor \frac{\text{pledged\_amount}}{\text{unit\_price}} \right\rfloor$$
3. **Fee Calculation**:
   - `fee_percent` looked up from `class-rules.md` (e.g. Class 4 fee = 0.8%).
   $$\text{fee\_amount} = \text{pledged\_amount} \times \left( \frac{\text{fee\_percent}}{100} \right)$$
4. **Total Debit Calculation**:
   $$\text{total\_debit} = \text{pledged\_amount} + \text{fee\_amount}$$
5. **Wallet Balance Check**:
   - If `total_debit > wallet_balance`, submit button displays "Insufficient Wallet Balance" with top-up link.

### 6.4 Pledge Execution Workflow
Upon clicking **"Confirm & Place Pledge"**:
1. Server action `createPledge(projectId, pledgeAmount)` executes inside [app/actions/pledge.js](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/app/actions/pledge.js).
2. Server verifies session, investor record, active pledge status, class limits, and wallet balance.
3. Server debits investor wallet:
   $$\text{new\_wallet\_balance} = \text{wallet\_balance} - (\text{pledged\_amount} + \text{fee\_amount})$$
4. Server inserts new row into `pledges` table with frozen snapshots:
   - `pledged_amount`: `pledgeAmount`
   - `investor_class_at_pledge`: `investor.investor_class`
   - `fee_percent_at_pledge`: `feePercent`
   - `fee_amount`: `feeAmount`
   - `pledged_units`: `pledgedUnits`
   - `status`: `'pending'`
   - `payment_status`: `'completed'`
   - `pledged_at`: `new Date().toISOString()` (UTC)
5. **Holdings Table Exclusion**: No row is created in `holdings` table at pledge time. Holdings are created later upon campaign completion.
6. Server revalidates path and returns success response.

---

## 7. Conversion Entitlements Summary

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

## 8. Summary Checklist for Developers & Auditors

- [x] All funding progress values query `pledges` table (`status != 'cancelled'`).
- [x] Funding progress % formatted to 1 decimal place (`.toFixed(1)`).
- [x] `campaign_end_date` rendered in UTC format (`DD MMM YYYY, HH:mm UTC`).
- [x] Single-pledge rule enforced server-side and client-side per project per investor.
- [x] No `holdings` table row created at pledge time.
- [x] Frozen snapshot fields saved on `pledges` row.
