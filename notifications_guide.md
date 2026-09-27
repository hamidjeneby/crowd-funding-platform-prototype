# Notification System Architecture & Implementation Guide

This document details the design, database schemas, subscription flows, threshold calculations, cron deadline triggers, UI components, and future milestone triggers for the notification engine in the Crowd Funding Platform.

---

## 1. Database Schema Overview

### 1.1 `notifications` Table
Stores individual notification messages sent to specific investors.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID / PK | Unique notification record identifier |
| `investor_id` | UUID (FK -> `investors.id`) | Recipient investor ID |
| `project_id` | UUID (FK -> `projects.id`) | Associated project ID |
| `type` | TEXT | Category (`campaign_alert`, `funding_threshold`, `conversion_pool`, `milestone`) |
| `notification_text` | TEXT | Specific code identifier (e.g. `30_days_to_deadline`, `50_percent_funded`, `system_milestone`) |
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

## 5. Milestone Notifications Specification (Future Implementation)

When milestone notification logic is implemented:

- **Trigger**: Fired when the `status` field of a record in `project_milestones` changes to `completed`.
- **Notification Type**: `milestone`
- **Notification Text**:
  - `system_milestone` when `milestone_source = 'system'`
  - `issuer_milestone` when `milestone_source = 'issuer'`
- **Target Audience**: All investors subscribed to `project_notification_subscriptions` with `notify_milestones = TRUE` for that `project_id`.

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
- Filterable tabs for All Events, Campaign Alerts, Funding Thresholds, Conversion Pool Alerts, and Milestones.
