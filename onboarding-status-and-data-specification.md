# Onboarding Status State Machine, Data Specification & Field Reference

Comprehensive technical specification covering `onboarding_status` states, **UI Access Block Matrix**, **Step-by-Step Onboarding Wizards**, **Database Schemas with Sample Data Rows**, **Field Encryption Protocol**, and **Storage Bucket Architecture**.

---

## 1. `onboarding_status` State Machine & UI Access Blocks

The `onboarding_status` field on the `investors` and `issuers` tables acts as the central compliance lifecycle gate.

```
                  +-----------------------+
                  |  incomplete / draft   |
                  +-----------------------+
                              |
                              | (User completes wizard)
                              v
                  +-----------------------+
                  |    pending review     |
                  +-----------------------+
                              |
                +-------------+-------------+
                |                           |
                v                           v
     +-------------------+         +-------------------+
     |     completed     |         |     rejected      |
     +-------------------+         +-------------------+
```

### 1.1 Status Definitions & Operational Meaning

| Status Value | Meaning & Operational Scope |
|---|---|
| `incomplete` / `draft` | User has initiated onboarding but has not completed all required steps or submitted documents. |
| `pending review` | User has submitted all required information, bank details, representatives, and documents. Currently awaiting compliance review. |
| `completed` / `approved` | Application reviewed and approved by compliance. Full un-gated feature access granted. |
| `rejected` | Application failed compliance verification. User must review rejection notes and re-submit corrected information/documents. |

---

### 1.2 UI Access Block & Feature Restriction Matrix

```
+-----------------------------------------------------------------------------------------+
| Status           | Marketplace View | Place Pledge | Wallet Debit | Create/Publish Project|
+------------------+------------------+--------------+--------------+-----------------------+
| `incomplete`     | Restrict / Warn  | Blocked      | Blocked      | Blocked               |
| `pending review` | Read-Only        | Blocked      | Blocked      | Blocked (Draft Only)  |
| `completed`      | Full Access      | Enabled      | Enabled      | Enabled               |
| `rejected`       | Restrict / Banner| Blocked      | Blocked      | Blocked               |
+-----------------------------------------------------------------------------------------+
```

#### Detailed Behavioral Scenarios

##### Scenario A: Investor with `onboarding_status = 'incomplete'`
- **Top Navigation Banner**: Displays orange warning banner: *"Your onboarding is incomplete. Please complete your onboarding steps to unlock investment features."*
- **Marketplace Access**: Can view public project listings in read-only mode.
- **Pledge Action**: Clicking "Place Pledge" triggers an inline modal blocking the pledge: *"Onboarding Incomplete. You must complete your investor onboarding before placing pledges."* with a button to `/investor-portal/onboarding`.
- **Wallet Top-Up / Withdrawal**: Top-up permitted, but withdrawals and pledge debits are blocked.

##### Scenario B: Investor with `onboarding_status = 'pending review'`
- **Top Navigation Banner**: Displays blue info banner: *"Your onboarding application has been submitted and is under compliance review. Investment features will activate once approved."*
- **Marketplace & Project Pages**: Full read-only access to campaign details, financials, and documents.
- **Pledge Action**: Clicking "Place Pledge" displays notice: *"Account Under Review. Your onboarding profile is currently being verified by compliance. Pledging will be enabled upon review approval."*

##### Scenario C: Issuer with `onboarding_status = 'incomplete'`
- **Portal Access**: Redirected automatically to `/issuer-portal/onboarding`.
- **Project Creation**: Accessing `/issuer-portal/projects/new` displays access blocked card: *"Issuer Verification Required. Please complete issuer entity onboarding before creating new projects."*

##### Scenario D: Issuer with `onboarding_status = 'pending review'`
- **Portal Access**: Can navigate issuer dashboard and draft project wizard (`/issuer-portal/projects/new`).
- **Campaign Launch**: Can save project drafts up to Step 6, but submitting for public review (`submitProjectForReview`) displays notice: *"Issuer Entity Under Review. Your company verification is pending review. Campaign review submission will activate once issuer onboarding is approved."*

---

## 2. Step-by-Step Onboarding Wizard Workflows

### 2.1 Individual Investor Onboarding Workflow (5 Steps)

Located in [app/investor-portal/onboarding/components/individual/](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/app/investor-portal/onboarding/components/individual/):

```
Step 1: Personal Info -> Step 2: Financial Profile -> Step 3: Bank Account -> Step 4: Identity Docs -> Step 5: Consent
```

1. **Step 1: Personal Information**: Full Name, ID Number (encrypted), Date of Birth (`YYYY-MM-DD`), Nationality, Phone Number, Country of Residence, City.
2. **Step 2: Financial Profile & Experience**: Net Worth Band, Annual Income Band, Investment Experience Years (e.g. `5` years).
3. **Step 3: Bank Account Setup**: Bank Name, Account Holder Name, Account Number (encrypted), IBAN (encrypted), SWIFT/BIC Code, Currency, Bank Address. Sets `bank_verification_status = 'pending'`.
4. **Step 4: Verification Documents**: Upload National ID / Passport scan and Proof of Address / Utility Bill to `investor_docs` storage bucket.
5. **Step 5: Declaration & Final Consent**: Captures `consent_timestamp` (UTC), `consent_ip`, and `consent_user_profile` (User-Agent string). Updates `onboarding_status = 'completed'` (or `'pending_review'`).

---

### 2.2 Institutional Investor Onboarding Workflow (5 Steps)

Located in [app/investor-portal/onboarding/components/institutional/](file:///Users/marchakimmwai/Desktop/unoffical-projects/crowd-funding-platform-prototype/app/investor-portal/onboarding/components/institutional/):

```
Step 1: Corporate Profile -> Step 2: Representatives -> Step 3: Corporate Bank -> Step 4: Corporate Docs -> Step 5: Consent
```

1. **Step 1: Corporate Profile**: Legal Entity Name, Business Type (e.g. `Public Limited Company (PLC)`), Trade License Number (encrypted), Licensing Authority (e.g. `DIFC`), Country of Incorporation, City, Business Phone, Business Email.
2. **Step 2: Key Representatives (`investor_reps`)**:
   - Representative Full Name.
   - Representative Role Toggles: `is_authorized_signatory` (boolean), `is_director` (boolean), `is_ubo` (boolean).
   - UBO Percentage Ownership (`ubo_percentage`, e.g. `55%`).
   - ID Type & Encrypted ID Number.
   - ID Document Scan uploaded to `investor_reps` storage bucket.
3. **Step 3: Corporate Bank Account**: Bank Name, Account Name, Encrypted Account Number, Encrypted IBAN, SWIFT Code, Currency (`AED`), Bank Address.
4. **Step 4: Corporate Verification Documents (`investor_docs`)**: Upload Trade License Certificate (`trade_certificate`), Memorandum of Association, Board Resolution, and Certificate of Incorporation to `investor_docs` bucket.
5. **Step 5: Declaration & Consent**: Captures `consent_timestamp`, `consent_ip`, and `consent_user_profile`. Updates `onboarding_status = 'pending_review'`.

---

### 2.3 Issuer Onboarding Workflow (5 Steps)

Located in [app/issuer-portal/onboarding/]:

```
Step 1: Entity Details -> Step 2: Representatives -> Step 3: Corporate Bank -> Step 4: Issuer Docs -> Step 5: Attestation
```

1. **Step 1: Corporate Entity Details**: Legal Entity Name, Business Type, License Authority (`DIFC`, `ADGM`, etc.), Trade License Number (encrypted), Country (`AE`), City, Business Phone Number, Business Email.
2. **Step 2: Authorized Representatives (`issuer_reps`)**:
   - Full Name.
   - Roles: `is_authorized_signatory`, `is_director`, `is_ubo` (with `ubo_percentage`, e.g. `30%`).
   - ID Type (`National ID` / `Passport`) and Encrypted ID Number.
   - ID Scan uploaded to `issuer_reps` storage bucket.
3. **Step 3: Corporate Bank Account**: Bank Name, Account Name, Encrypted Account Number, Encrypted IBAN, SWIFT Code, Currency (`USD` / `AED`), Bank Address.
4. **Step 4: Issuer Corporate Documents (`issuer_docs`)**: Upload Commercial Trade Certificate (`trade_certificate`), Articles of Incorporation, and Audited Financial Statements to `issuer_docs` bucket.
5. **Step 5: Final Attestation & Submission**: Captures `consent_timestamp`, `consent_ip`, and `consent_user_profile`. Updates `onboarding_status = 'pending review'`.

---

## 3. Database Schemas & Sample Rows

Below are the exact database table schemas and sample data rows.

### 3.1 `investors` Table

```sql
CREATE TABLE investors (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT, -- Clerk User ID (individual)
  org_id TEXT, -- Clerk Organization ID (institutional)
  type TEXT NOT NULL DEFAULT 'individual', -- 'individual', 'institutional'
  full_name TEXT,
  legal_entity_name TEXT,
  trade_license_number TEXT, -- AES-256-GCM Encrypted
  net_worth NUMERIC,
  annual_income NUMERIC,
  investment_experience_years INT,
  investor_class INT DEFAULT 10,
  subscription_tier TEXT,
  onboarding_status TEXT DEFAULT 'incomplete', -- 'incomplete', 'pending_review', 'completed', 'rejected'
  current_step INT DEFAULT 1, --Outlines the current step in the onboarding process (1,2,3,4,5)
  bank_details JSONB, -- Contains encrypted IBAN and account_number and other details
  bank_verification_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'unverified'
  consent_timestamp TIMESTAMPTZ, --The timestamp in UTC the user agrees to terms and conditions (basically also the timestamp that the user completes onboarding)
  consent_ip TEXT, -- IP address of the user who agreed to terms and conditions
  consent_user_profile TEXT, -- User-Agent string of the user who agreed to terms and conditions (example: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36)
  country TEXT,
  city TEXT,
  license_authority TEXT,
  license_verification_status TEXT DEFAULT 'pending',
  business_type TEXT,
  phone TEXT,
  email TEXT,
  id_number TEXT, -- AES-256-GCM Encrypted
  nationality TEXT,
  DOB DATE,
  wallet_balance NUMERIC NOT NULL DEFAULT 0
);
```

**Sample Row (`investors`):**
```json
[
  {
    "idx": 0,
    "id": 30,
    "created_at": "2026-09-14 17:17:21.723962+00",
    "user_id": null,
    "type": "institutional",
    "full_name": null,
    "legal_entity_name": "Google",
    "trade_license_number": "aw1k1EWINlMNrYn/7LIP3Q==:Q1hHHULiv6QlssfhUQVh/A==:zc6ld5TMlzg=",
    "net_worth": 2000000000,
    "annual_income": null,
    "investment_experience_years": 45,
    "investor_class": 4,
    "subscription_tier": null,
    "onboarding_status": "completed",
    "current_step": 5,
    "bank_details": "{\"iban\": \"GLgvueEKZyyrLuh2YZHUYg==:0YFc4h8P/DAIQgjL2ip4Fw==:mLDhjEF0SO8it1Nio90dTP+hTaicdw==\", \"currency\": \"AED\", \"bank_name\": \"My Bank\", \"swift_code\": \"EQBIX123\", \"account_name\": \"Google\", \"bank_address\": \"Nairobi, Kenya\", \"account_number\": \"12345\"}",
    "bank_verification_status": "approved",
    "consent_timestamp": "2026-09-14 17:22:30.767+00",
    "consent_ip": "::1",
    "country": "United Arab Emirates",
    "city": "Abu Dhabi Municipality",
    "license_authority": "DIFC",
    "license_verification_status": "pending",
    "business_type": "Public Limited Company (PLC)",
    "phone": "+254759955671",
    "email": "mailtemporary765@gmail.com",
    "id_number": null,
    "nationality": null,
    "DOB": null,
    "consent_user_profile": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "org_id": "org_3JKOPyX3rRypIc8n5dwT21a5a6K",
    "wallet_balance": 23994984
  }
]
```

---

### 3.2 `issuers` Table

```sql
CREATE TABLE issuers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id TEXT NOT NULL UNIQUE, -- Clerk Organization ID
  legal_entity_name TEXT,
  trade_license_number TEXT, -- AES-256-GCM Encrypted
  license_authority TEXT,
  license_verification_status TEXT DEFAULT 'pending',
  license_expiry_date DATE,
  country TEXT,
  city TEXT,
  business_type TEXT,
  business_phone_number TEXT,
  business_email TEXT,
  onboarding_status TEXT DEFAULT 'incomplete', -- 'incomplete', 'pending review', 'approved', 'rejected'
  current_step INT DEFAULT 1,
  bank_details JSONB, -- Contains encrypted IBAN and account_number
  bank_verification_status TEXT DEFAULT 'pending',
  consent_timestamp TIMESTAMPTZ,
  consent_ip TEXT,
  consent_user_profile TEXT
);
```

**Sample Row (`issuers`):**
```json
[
  {
    "idx": 0,
    "id": 35,
    "created_at": "2026-09-09 20:43:01.999942+00",
    "legal_entity_name": "Kenya Energy",
    "trade_license_number": "Uu2ki2eeL5/1l8koVv5G/A==:jMYh/JY+nn49fy7aP3cr/g==:v23t113oLFk=",
    "license_authority": "DIFC",
    "license_verification_status": null,
    "license_expiry_date": null,
    "country": "AE",
    "onboarding_status": "pending review",
    "consent_timestamp": "2026-09-09 20:54:42.477+00",
    "consent_ip": "::1",
    "consent_user_profile": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "bank_details": "{\"iban\": \"CdKtvokpneXMiFb6RrDA7w==:4vJE+mgea7zL/ZfP2QP69A==:OX7SMwyCPG4Z2z4E3cA/SB9XE4tc+A==\", \"currency\": \"USD\", \"bank_name\": \"My Bank\", \"swift_code\": \"EQBIX123\", \"account_name\": \"Issuer One\", \"bank_address\": \"Nairobi, Kenya\", \"account_number\": \"12345678\"}",
    "bank_verification_status": "pending",
    "city": "Abu Dhabi Municipality",
    "business_email": "mailtemporary765@gmail.com",
    "business_phone_number": "+254759955671",
    "business_type": "Public Limited Company (PLC)",
    "org_id": "org_3J6fjhVCJZWVqLgdVjQt1EQfiDm",
    "current_step": 5
  }
]
```

---

### 3.3 `issuer_reps` & `investor_reps` Tables

```sql
-- issuer_reps
CREATE TABLE issuer_reps (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issuer_id BIGINT REFERENCES issuers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  is_authorized_signatory BOOLEAN DEFAULT FALSE,
  is_director BOOLEAN DEFAULT FALSE,
  is_ubo BOOLEAN DEFAULT FALSE,
  ubo_percentage NUMERIC,
  other_designation TEXT,
  id_type TEXT NOT NULL, -- 'National ID', 'Passport'
  id_number TEXT NOT NULL, -- AES-256-GCM Encrypted
  id_url TEXT NOT NULL -- Supabase Storage URL in issuer_reps bucket --URL points to the ID document itself
);

-- investor_reps
CREATE TABLE investor_reps (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  investor_id BIGINT REFERENCES investors(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  is_authorized_signatory BOOLEAN DEFAULT FALSE,
  is_director BOOLEAN DEFAULT FALSE,
  is_ubo BOOLEAN DEFAULT FALSE,
  ubo_percentage NUMERIC,
  other_designation TEXT,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL, -- AES-256-GCM Encrypted
  id_url TEXT NOT NULL -- Supabase Storage URL in investor_reps bucket --URL points to the ID document itself
);
```

**Sample Row (`issuer_reps`):**
```json
[
  {
    "idx": 0,
    "id": 16,
    "created_at": "2026-09-09 20:44:18.720393+00",
    "issuer_id": 35,
    "full_name": "Issuer One",
    "is_authorized_signatory": true,
    "id_type": "National ID",
    "id_number": "0fyt7K7JHRPKoc2LyWZZuA==:7sdZB7wGdqENk7IxvkZakQ==:tkqSJQIVfw==",
    "id_url": "https://ddtxafswygsidegaclau.supabase.co/storage/v1/object/public/issuer_reps/org_3J6fjhVCJZWVqLgdVjQt1EQfiDm/1788986655165_issuer_one.png",
    "is_director": true,
    "is_ubo": true,
    "other_designation": null,
    "ubo_percentage": 30
  }
]
```

**Sample Row (`investor_reps`):**
```json
[
  {
    "idx": 0,
    "id": 6,
    "created_at": "2026-09-14 17:20:22.639094+00",
    "investor_id": 30,
    "full_name": "Investor One",
    "is_authorized_signatory": true,
    "id_type": "National ID",
    "id_number": "EGHx2k0q0Fh5ITUiQJliWA==:HFgkOmuob28AB9twwM7Dvg==:Z4pYe98Jq6s=",
    "id_url": "https://ddtxafswygsidegaclau.supabase.co/storage/v1/object/public/investor_reps/org_3JKOPyX3rRypIc8n5dwT21a5a6K/1789406417093_investor_one.png",
    "is_director": true,
    "is_ubo": true,
    "other_designation": null,
    "ubo_percentage": 55
  }
]
```

---

### 3.4 `issuer_docs` & `investor_docs` Tables

```sql
-- issuer_docs
CREATE TABLE issuer_docs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issuer_id BIGINT REFERENCES issuers(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- 'trade_certificate', 'certificate_of_incorporation', etc.
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  rejection_reason TEXT,
  expiry_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  document_password TEXT
);

-- investor_docs
CREATE TABLE investor_docs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  investor_id BIGINT REFERENCES investors(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- 'trade_certificate', 'memorandum_association', 'passport', etc.
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  expiry_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  document_password TEXT
);
```

**Sample Row (`issuer_docs`):**
```json
[
  {
    "idx": 0,
    "id": 21,
    "created_at": "2026-09-09 20:46:01.99546+00",
    "issuer_id": 35,
    "doc_type": "trade_certificate",
    "url": "https://ddtxafswygsidegaclau.supabase.co/storage/v1/object/public/issuer_docs/org_3J6fjhVCJZWVqLgdVjQt1EQfiDm/trade_certificate_1788986758692.png",
    "status": "pending",
    "rejection_reason": null,
    "expiry_date": null,
    "uploaded_at": "2026-09-09 20:46:01.423+00",
    "reviewed_by": null,
    "reviewed_at": null,
    "document_password": null
  }
]
```

**Sample Row (`investor_docs`):**
```json
[
  {
    "idx": 0,
    "id": 18,
    "created_at": "2026-09-14 17:21:15.202769+00",
    "investor_id": 30,
    "doc_type": "trade_certificate",
    "url": "https://ddtxafswygsidegaclau.supabase.co/storage/v1/object/public/investor_docs/org_3JKOPyX3rRypIc8n5dwT21a5a6K/trade_certificate_1789406470842.png",
    "status": "pending",
    "rejection_reason": null,
    "expiry_date": null,
    "uploaded_at": "2026-09-14 17:21:14.834+00",
    "reviewed_by": null,
    "reviewed_at": null,
    "document_password": null
  }
]
```

---

### 3.5 System Tables: `memberships`, `users`, `organizations`

```sql
-- users
CREATE TABLE users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT UNIQUE NOT NULL, -- Clerk User ID
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'issuer','investor'
  updated_at TIMESTAMPTZ
);

-- organizations
CREATE TABLE organizations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id TEXT UNIQUE NOT NULL, -- Clerk Organization ID
  created_by TEXT, -- Clerk User ID
  type TEXT NOT NULL, -- 'investor', 'issuer'
  org_name TEXT NOT NULL
);

-- memberships
CREATE TABLE memberships (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  org_id TEXT NOT NULL, -- Clerk Organization ID
  membership_id TEXT UNIQUE NOT NULL, -- Clerk Membership ID
  user_id TEXT NOT NULL, -- Clerk User ID
  role TEXT NOT NULL DEFAULT 'member' -- 'admin', 'member'
);
```

**Sample Row (`users`):**
```json
[
  {
    "idx": 0,
    "id": 28,
    "created_at": "2026-09-09 20:42:41.354672+00",
    "user_id": "user_3J6fhv5Y9GNcjvcgdYt9wRTPneX",
    "first_name": "Issuer",
    "last_name": "One",
    "email": "mailtemporary765@gmail.com",
    "role": "issuer"
  }
]
```

**Sample Row (`organizations`):**
```json
[
  {
    "idx": 0,
    "id": 12,
    "created_at": "2026-09-09 20:42:56.620741+00",
    "org_id": "org_3J6fjhVCJZWVqLgdVjQt1EQfiDm",
    "created_by": "user_3J6fhv5Y9GNcjvcgdYt9wRTPneX",
    "type": "issuer",
    "org_name": "Kenya Energy"
  }
]
```

**Sample Row (`memberships`):**
```json
[
  {
    "idx": 0,
    "id": 21,
    "created_at": "2026-09-09 20:43:01.370026+00",
    "org_id": "org_3J6fjhVCJZWVqLgdVjQt1EQfiDm",
    "membership_id": "mem_org_3J6fjhVCJZWVqLgdVjQt1EQfiDm_user_3J6fhv5Y9GNcjvcgdYt9wRTPneX",
    "user_id": "user_3J6fhv5Y9GNcjvcgdYt9wRTPneX",
    "role": "admin"
  }
]
```

---

## 4. Field Encryption Protocol & Storage Architecture

### 4.1 AES-256-GCM Field Encryption Standard
All sensitive identification and financial fields are encrypted before writing to the PostgreSQL database using AES-256-GCM cryptography ([app/utils/crypto.ts]):

- **Encrypted Fields**:
  - `trade_license_number` (in `investors` and `issuers` tables)
  - `id_number` (in `investors`, `investor_reps`, and `issuer_reps` tables)
  - `iban` (inside `bank_details` JSONB)
- **Encrypted Format String**: `iv_base64:auth_tag_base64:ciphertext_base64`
  - Example: `"aw1k1EWINlMNrYn/7LIP3Q==:Q1hHHULiv6QlssfhUQVh/A==:zc6ld5TMlzg="`

---

### 4.2 Supabase Storage Bucket Architecture

All file uploads during onboarding and project creation are stored in dedicated Supabase Storage public buckets:

| Bucket Name | Purpose | Upload Source | Folder Path Convention |
|---|---|---|---|
| `investor_docs` | Institutional & individual investor verification docs | Step 4 Investor Onboarding | `org_xxx/` or `user_xxx/` |
| `issuer_docs` | Corporate issuer trade license & incorporation docs | Step 4 Issuer Onboarding | `org_yyy/` |
| `investor_reps` | ID document scans for investor representatives | Step 2 Institutional Onboarding | `org_xxx/` |
| `issuer_reps` | ID document scans for issuer representatives | Step 2 Issuer Onboarding | `org_yyy/` |

---

## 5. Summary Checklist for Compliance & System Integrations

- [x] All user creations synced to `users` table via Svix-verified webhooks.
- [x] All organization creations synced to `organizations` and `issuers`/`investors` tables.
- [x] Multi-member memberships tracked in `memberships` table.
- [x] Sensitive identification numbers and IBANs encrypted with AES-256-GCM before DB write.
- [x] `onboarding_status` enforced across navigation banners, pledge forms, and project launch buttons.
- [x] Cross-portal navigation attempts caught by layout Triple Gate and rendered as Access Restricted Screen.
