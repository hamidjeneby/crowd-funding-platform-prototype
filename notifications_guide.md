# Notification System Architecture & Implementation Guide

This document details the design, database schemas, subscription flows, threshold calculations, cron deadline triggers, UI components, and future milestone triggers for the notification engine in the Crowd Funding Platform.

---

## 1. Database Schema Overview

### 1.1 `notifications` Table
Stores individual notification messages sent to specific investors.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID / PK | Unique notification record identifier |
| `investor_id` | UUID / BIGINT (FK -> `investors.id`) | Recipient investor ID |
| `project_id` | UUID / BIGINT / NULL (FK -> `projects.id`) | Associated project ID (Nullable; `NULL` for account-level notifications such as onboarding and bank verification) |
| `type` | TEXT | Category (`campaign_alert`, `funding_threshold`, `conversion_pool`, `milestone`, `onboarding`, `banking`) |
| `notification_text` | TEXT | Specific code identifier (e.g. `30_days_to_deadline`, `50_percent_funded`, `system_milestone`, `onboarding_approved`, `onboarding_sent_back`, `onboarding_rejected`, `bank_verified`, `bank_rejected`) |
| `title` | TEXT | User-facing title |
| `message` | TEXT | Concise notification message text |
| `read_status` | BOOLEAN / TEXT | Read state (`FALSE` when created, updated to `TRUE` when dismissed) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### 1.2 `project_notification_subscriptions` Table
Stores investor notification preferences per project.

| Field | Type | Description |
| :--- | :--- | :--- |
| `investor_id` | UUID (FK -> `investors.id`) | Subscriber investor ID |
| `project_id` | UUID (FK -> `projects.id`) | Subscribed project ID |
| `notify_milestones` | BOOLEAN | Receive updates when project milestones are completed |
| `notify_funding_thresholds` | BOOLEAN | Receive updates when project funding reaches 25%, 50%, 75%, or 100% |
| `notify_conversion_pool` | BOOLEAN | Receive updates when conversion pool reaches 25%, 50%, 75%, or 100% (Class 1–4 only) |
| `notify_campaign_alerts` | BOOLEAN | Receive deadline alerts (60 days, 30 days, 7 days, 24 hours) |

---

## 2. Notification Subscriptions

### 2.1 Manual Subscriptions
- Located on each project details page (`/investor-portal/projects/[slug]`) via the **"Enable Notifications"** button.
- Displays a modal (`NotificationSettingsModal.jsx`) allowing investors to toggle preferences.
- **Class Restriction**: `notify_conversion_pool` is strictly limited to Class 1, 2, 3, and 4 investors. For Class 5 to 10 investors, this option is disabled in the UI and automatically set to `FALSE` upon saving.

### 2.2 Automatic Subscriptions (Pledge Trigger)
- When an investor submits a pledge (`createPledge` in `app/actions/pledge.js`), `ensureAutomaticPledgeSubscription()` is executed.
- If a row already exists in `project_notification_subscriptions` for `(investor_id, project_id)`, it updates `notify_milestones = TRUE` and `notify_campaign_alerts = TRUE`.
- If no row exists, it inserts a new row with both fields set to `TRUE`.

---

## 3. Asynchronous Threshold Notifications

When a new pledge is executed, `evaluateThresholdNotifications({ projectId, pledgeId })` runs asynchronously to verify funding and conversion pool milestones.

### 3.1 Funding Threshold Notifications
1. Sums all non-cancelled pledges for the project before and after the current pledge.
2. Calculates `percentage_before = (previous_total / target_goal) * 100` and `percentage_after = (current_total / target_goal) * 100`.
3. Evaluates boundary crossing:
   - **25% Funded**: `percentage_before < 25 <= percentage_after` (`notification_text: "25_percent_funded"`)
   - **50% Funded**: `percentage_before < 50 <= percentage_after` (`notification_text: "50_percent_funded"`)
   - **75% Funded**: `percentage_before < 75 <= percentage_after` (`notification_text: "75_percent_funded"`)
   - **100% Funded**: `percentage_after === 100` (`notification_text: "100_percent_funded"`)
4. Inserts notifications for all subscribers with `notify_funding_thresholds = TRUE`.

### 3.2 Conversion Pool Threshold Notifications
1. Evaluates conversion eligible units cross-over for projects with SPV conversion enabled.
2. Only subscribers in **Class 1 to 4** with `notify_conversion_pool = TRUE` receive these alerts (`notification_text: "25_percent_conversion_pool"`, etc.).

---

## 4. Backend Cron Deadline Endpoint (`/api/cron/campaign-alerts`)

Triggered every 24 hours via automated cron.

### 4.1 Time Window Matching
Checks all projects with `status = 'campaign_live'` and computes hours remaining until `deadline`:

- **60 Days Away**: 1416 to 1440 hours (`notification_text: "60_days_to_deadline"`)
- **30 Days Away**: 696 to 720 hours (`notification_text: "30_days_to_deadline"`)
- **7 Days Away**: 144 to 168 hours (`notification_text: "7_days_to_deadline"`)
- **24 Hours Away**: 0 to 24 hours (`notification_text: "24_hours_to_deadline"`)

### 4.2 Duplicate Prevention (Deduplication Rule)
Before inserting notifications, the cron script queries the `notifications` table for existing rows matching:
`project_id = project.id AND type = 'campaign_alert' AND notification_text = matched_text`

If any matching rows exist, insertion is skipped to prevent duplicate alerts.

---

## 5. Milestone Notifications Engine & Architecture

### 5.1 Auditor vs. Issuer Responsibilities

1. **Auditor Milestone Review (Compliance Phase)**:
   - When an issuer submits milestones during project creation or adds new milestones, the auditor reviews them in `/auditor-portal/milestone-review` or `/auditor-portal/project-creation/[id]`.
   - The auditor's decision only updates `verification_status` to `"approved"` or `"rejected"`.
   - **Crucial Rule**: The auditor does **NOT** mark the milestone as completed. The milestone remains `upcoming` / `pending` until it is actually executed in real life. Therefore, **no milestone completion notifications are sent during auditor review**.

2. **Issuer Milestone Execution (Operational Phase)**:
   - Once a campaign is live and the auditor has verified the milestone definition, the issuer fulfills the work.
   - When deliverables are ready, **only the issuer** can mark the milestone as reached via the Issuer Project Management page (`/issuer-portal/projects/[slug]/manage` -> Roadmap tab).
   - This calls `markMilestoneReached(projectId, milestoneId)`, which updates `status = 'completed'` and immediately executes `notifyInvestorsOnMilestoneCompleted`.

---

### 5.2 Application-Level Notification Execution Flow

When an issuer marks an approved milestone as reached:

1. **Step 1: Project Presence Check**:
   The engine queries `project_notification_subscriptions` where `project_id = target_project_id` to confirm that at least one investor has subscribed to notifications for this campaign. If count is 0, execution halts cleanly.

2. **Step 2: Milestone Subscriber Filtering**:
   Queries all subscription records for that `project_id` where `notify_milestones = TRUE`.

3. **Step 3: Milestone & Project Data Resolution**:
   Fetches milestone details (`title`, `description`, `milestone_source`) and project title.
   - **Notification Type**: `milestone`
   - **Notification Text**: `issuer_milestone` (for issuer deliverables) or `system_milestone` (for platform milestones).
   - **Notification Title**: Milestone title formatted (e.g. `"Site Inspection Reached"`).
   - **Notification Message**: Clear achievement statement: `"{milestone_title} has been reached."` (does not use raw milestone description text).

4. **Step 4: Deduplication Filter**:
   Queries the `notifications` table for existing records matching `(investor_id, project_id, type = 'milestone', title)`. Any investor who has already received this milestone notification is excluded to prevent repeated or duplicate notifications.

5. **Step 5: Batch Record Insertion**:
   Inserts new notification rows with `read_status = 'false'`, immediately making them visible in the investor's top-right toast deck and notifications center.

---

### 5.4 Trigger Points in Platform Workstations

| Workflow Stage | Location | Action | Notification Dispatched? |
| :--- | :--- | :--- | :--- |
| **Auditor Review** | `/auditor-portal/milestone-review` | Auditor approves milestone (`verification_status = 'approved'`) | ❌ No (Milestone is verified, not yet completed) |
| **Issuer Execution** | `/issuer-portal/projects/[slug]/manage` | Issuer marks milestone as reached (`status = 'completed'`) | ✅ Yes (Fires `notifyInvestorsOnMilestoneCompleted`) |


---

## 6. User Interface Architecture

### 6.1 Stacked Toast UI Deck (`ToastNotificationStack.jsx`)
- Mounted globally in `app/investor-portal/(protected)/layout.jsx`.
- Displays top-right stacked toast notifications for all unread items (`read_status = FALSE`).
- Features:
  - Individual **'X' button** to mark a single notification as read.
  - **"Dismiss All" button** to clear all active notifications simultaneously.
  - Layered stacked pages aesthetic with expandable view.

### 6.2 Notifications Center (`/investor-portal/notifications`)
- Full-page database-driven feed reading directly from the `notifications` table.
- Filterable tabs for All Notifications, Onboarding Updates, Bank Verification, Campaign Alerts, Funding Thresholds, Conversion Pool Alerts, and Milestones.

---

## 7. Investor Onboarding & Bank Verification Notifications (Auditor Portal)

### 7.1 Overview
Unlike campaign, milestone, or funding threshold alerts, onboarding review and bank verification notifications are **account-level events**.
- **No Project ID**: `project_id` is explicitly set to `NULL` (since these events pertain to investor identity & banking accounts, not a specific project).
- **Target Recipient**: Dispatched directly to the specific investor (`investor_id`).
- **Actionable & Concise**: Each notification clearly informs the investor of the decision and provides direct, concise next steps.

---

### 7.2 Onboarding Review Scenarios (3 Outcomes)
Triggered when an auditor reviews and finalizes the investor's onboarding submission from the Auditor Portal (`/auditor-portal/investor-onboarding/[id]` via `submitInvestorFinalOnboardingDecision` or `/auditor-portal/case/investor/[id]` via `submitAuditorDecision`).

#### Scenario 1: Approved (`decision = 'approve'` or `'approved'`)
- **Status**: Investor onboarding is verified and approved.
- **Investor Next Step**: Can now explore live campaigns and start investing.
- **Table Record**:
  ```json
  {
    "investor_id": 30,
    "project_id": null,
    "type": "onboarding",
    "notification_text": "onboarding_approved",
    "title": "Onboarding Approved",
    "message": "Your investor onboarding has been approved. You can now explore live campaigns and start investing.",
    "read_status": false
  }
  ```

#### Scenario 2: Sent Back (`decision = 'send_back'` or `'sent_back'`)
- **Status**: Investor submission requires adjustments or missing information.
- **Investor Next Step**: Review auditor feedback, update profile/documents, and resubmit for review.
- **Table Record**:
  ```json
  {
    "investor_id": 30,
    "project_id": null,
    "type": "onboarding",
    "notification_text": "onboarding_sent_back",
    "title": "Onboarding Action Required",
    "message": "Your application was sent back for updates. Please review the feedback, update your details, and resubmit.",
    "read_status": false
  }
  ```

#### Scenario 3: Rejected (`decision = 'reject'` or `'rejected'`)
- **Status**: Investor onboarding application has been declined.
- **Investor Next Step**: Contact platform support for assistance or appeal guidance.
- **Table Record**:
  ```json
  {
    "investor_id": 30,
    "project_id": null,
    "type": "onboarding",
    "notification_text": "onboarding_rejected",
    "title": "Onboarding Rejected",
    "message": "Your investor onboarding application has been rejected. Please contact support for assistance.",
    "read_status": false
  }
  ```

---

### 7.3 Bank Details Verification Scenarios (2 Outcomes)
Triggered when an auditor reviews the investor's bank details and bank letter from the Auditor Portal (`/auditor-portal/investor-onboarding/[id]` via `updateInvestorBankDecision` or `/auditor-portal/bank-review` via `updateBankVerificationDecision`).

#### Scenario 4: Approved (`decision = 'approved'` or `'approve'`)
- **Status**: Bank account details and verification proof have been validated.
- **Investor Next Step**: Wallet withdrawals and payout distributions are now active and accessible.
- **Table Record**:
  ```json
  {
    "investor_id": 30,
    "project_id": null,
    "type": "banking",
    "notification_text": "bank_verified",
    "title": "Bank Details Verified",
    "message": "Your bank account has been verified. Wallet withdrawals and payout distributions are now active.",
    "read_status": false
  }
  ```

#### Scenario 5: Rejected (`decision = 'rejected'` or `'reject'`)
- **Status**: Bank account details could not be validated.
- **Investor Next Step**: Update banking details in settings with valid proof documents.
- **Table Record**:
  ```json
  {
    "investor_id": 30,
    "project_id": null,
    "type": "banking",
    "notification_text": "bank_rejected",
    "title": "Bank Verification Rejected",
    "message": "Your submitted bank details could not be verified. Please update your banking information in settings with valid proof.",
    "read_status": false
  }
  ```

---

### 7.4 Trigger Points in Platform Workstations

| Workflow Event | Portal Location | Server Action | Notification Dispatched |
| :--- | :--- | :--- | :--- |
| **Onboarding Final Decision** | `/auditor-portal/investor-onboarding/[id]` | `submitInvestorFinalOnboardingDecision` | `notifyInvestorOnboardingDecision(investorId, decision, reviewNotes)` |
| **Case Review Decision** | `/auditor-portal/case/investor/[id]` | `submitAuditorDecision` (type: `"investor"`) | `notifyInvestorOnboardingDecision(numId, decision, rejectionReason)` |
| **Onboarding Bank Review** | `/auditor-portal/investor-onboarding/[id]` | `updateInvestorBankDecision` | `notifyInvestorBankVerificationDecision(investorId, decision)` |
| **Dedicated Bank Queue** | `/auditor-portal/bank-review` | `updateBankVerificationDecision` (entityType: `"investor"`) | `notifyInvestorBankVerificationDecision(numId, decision, rejectionReason)` |

