# Investor Class Segmentation & Rules

Reference document for `investor_class` (1–10) — the single axis governing pledge
capacity, project visibility, fees, and special rights for every investor on the
platform. `subscription_tier` was evaluated earlier in this project and
deliberately dropped in favor of class alone; it may resurface later as a purely
commercial/cosmetic feature, but carries no access-control meaning today.

---

## 1. Class Segmentation Table

| Class | Max Pledge per Project | Visibility | Investor Fee | Conversion Clause Access | Can Underwrite? | Typical Profile |
|---|---|---|---|---|---|---|
| 1 | Unlimited (full project amount) | All projects, including pre-audit drafts | 0.5% | Yes — full economic benefit, no cap | Yes | Family offices, Islamic banks, anchor investors |
| 2 | AED 5,000,000 | All post-audit, live campaigns | 0.6% | Yes — capped at AED 1,000,000 conversion value | No | High-net-worth individuals |
| 3 | AED 2,000,000 | All live campaigns | 0.7% | Yes — capped at AED 500,000 conversion value | No | HNWI / corporate treasury |
| 4 | AED 1,000,000 | All live campaigns | 0.8% | Yes — capped at AED 250,000 conversion value | No | — |
| 5 | AED 500,000 | Live campaigns > AED 5M only | 0.9% | No — cash-only Sukuk | No | Mid-tier investors |
| 6 | AED 200,000 | Live campaigns > AED 10M only | 1.0% | No | No | — |
| 7 | AED 50,000 | Live campaigns > AED 15M only | 1.2% | No | No | — |
| 8 | AED 10,000 | Live campaigns > AED 20M only | 1.5% | No | No | — |
| 9 | AED 2,000 | Single campaign per quarter | 2.0% | No | No | Retail with higher risk awareness |
| 10 | AED 500 | Single campaign per quarter, max one active pledge at a time | 2.5% | No | No | General public |

---

## 2. Column Definitions, in plain terms

**Max Pledge per Project** — the absolute ceiling on how much this investor can put into any single project. Enforced server-side, never trusted from the client.

**Visibility** — which projects appear in this investor's marketplace at all. This is not just a pledge-size restriction — Classes 5–8 specifically only see campaigns *above* a minimum total raise size, and Class 1 is the only class that can see projects still sitting in pre-audit draft status, before they've been reviewed for the public.

**Investor Fee** — a percentage taken from the investor's own pledge amount (not the issuer's proceeds). Counterintuitively, the fee *increases* as class number increases — this is standard relationship-pricing logic: larger, more trusted investors (Class 1) get the best rate, the same way a bank offers better terms to a bigger account.

**Conversion Clause Access** — whether this investor's Sukuk holding can convert into real company shares if a project's conversion trigger fires (e.g. "share price crosses AED 10"). See §5 for full mechanics.

**Can Underwrite?** — whether this investor is eligible to personally cover a project's funding shortfall in exchange for compensation. See §6 for full mechanics.

---

## 3. How `investor_class` gets assigned

**Never self-selected.** Every field this table controls (fee rate, conversion rights, underwriter eligibility, which projects are even visible) is something an investor is financially incentivized to lie about, so class is always system-suggested and human-confirmed, never a free dropdown.

### Individual investors
- **Baseline onboarding** (ID + proof of address only) qualifies for the lowest class (Class 10) with light-touch, fast review — no financial disclosure required for a capped, low-risk pledge amount.
- **Requesting a higher class** is a separate, optional step: the investor declares net worth band, income band, and investment experience, backs it with supporting documents (income evidence / net worth evidence), and a compliance reviewer confirms or adjusts the suggested class against that evidence.
- Exact AED thresholds mapping declared bands to specific class numbers must be set by legal/compliance referencing current regulatory guidance — not hardcoded from guesswork.

### Institutional investors
- Class suggestion draws on entity type and audited financial statements rather than personal declarations — regulated financial institutions and government entities can qualify for Class 1 largely on entity type + verified registration alone.

### Class 1, specifically
- **Always requires enhanced due diligence** — source of funds and audited financials — regardless of how an investor became eligible (initial onboarding or later upgrade). No path to Class 1 skips this.

---

## 4. Class movement after onboarding

**Upgrade** — an investor becomes *eligible* after 3 successful Sukuk redemptions with zero defaults. Eligibility is not automatic promotion: a reviewer still confirms the upgrade, and Class 1 specifically always requires the enhanced due diligence step above regardless of redemption history.

**Downgrade** — automatic and immediate, no review delay. Triggered by either an early exit (where Sharia-permitted) or missing two pledge payments. This is deliberately faster than upgrade: downgrade is protective, so it shouldn't wait on a human in the loop the way a promotion should.

**Equity holdings and redemption:** SPV Equity holdings have no maturity date and never "redeem" in the traditional sense — recommend treating a realized exit event (sale, acquisition, IPO) as equivalent to a successful redemption for upgrade-eligibility purposes, since otherwise an equity-only investor could never become upgrade-eligible through that path at all.

---

## 5. Pledge-time snapshot rule

`investor_class_at_pledge` and `fee_percent_at_pledge` are captured and frozen at the moment a pledge is made, on the `pledges` table — never looked up live from the investor's current class. An investor's class can change after they've pledged (upgrade/downgrade), but the terms of a pledge already made must stay exactly as agreed at the time, for audit integrity and fairness.

---

## 6. Conversion clause rules

- Only available when `sharia_contract_type` is Murabaha, Mudarabah, or Ijara, **and** `is_spv = true`. Never available for the SPV Equity contract type — those investors already hold real shares directly, so there's nothing to convert into.
- **Only Classes 1–4 have any conversion rights at all.** Classes 5–10 hold cash-only Sukuk regardless of what the project offers — the trigger firing has no effect on their holding.
- Per-class conversion caps (the portion of a holding eligible to convert, regardless of total amount pledged):
  - Class 1 — full holding, no cap
  - Class 2 — capped at AED 1,000,000 conversion value
  - Class 3 — capped at AED 500,000 conversion value
  - Class 4 — capped at AED 250,000 conversion value
- **The trigger price, conversion ratio, and deadline are proposed by the issuer but finalized by compliance/Sharia review** before the campaign goes live — never accepted as raw, unreviewed issuer input, since these terms directly affect fairness and Sharia compliance. Once a campaign is live and investors have pledged against the published terms, they're locked.
- **Shared conversion pool:** `total_shares_authorized` on `spv_details` sets a hard ceiling on total shares the project can ever hand out via conversion. Because Class 1–4 investors are competing for a shared, finite pool (their individual per-class caps don't guarantee pool availability), each investor's actual `conversion_eligible_units` is computed as:
  ```
  MIN(per-class cap for this investor, remaining pool capacity at time of allocation)
  ```
  This is effectively first-come-first-served among conversion-eligible pledges — an investor's Sukuk itself is always valid regardless of pool depletion, but their conversion upside may be partial if the pool runs low by the time they're allocated.
- **`hard_cap` relationship to shares differs by contract type:**
  - **SPV Equity:** `hard_cap` ≤ `total_shares_authorized × unit_price` (and `target_goal` is auto-calculated from the same formula) — every AED raised directly buys a share, so there's no room for oversell.
  - **Conversion-enabled non-equity Sukuk:** `hard_cap` is *not* bounded by the share pool in the same direct way, because Classes 5–10 money never touches the conversion pool at all — only Class 1–4 pledges compete for it, so the total raise can exceed what the reserved shares could back in the worst case, without over-promising, since most classes have zero conversion rights to begin with.

---

## 7. Underwriting rules

- **Class 1 only.** No other class is eligible to underwrite, given the financial capacity and trust required.
- **Opt-in, paid feature for the issuer** — `underwriter_mode_enabled` is set by the issuer at project creation, and only takes effect if they've paid for the service.
- **Arranged before campaign launch, not reactively.** This is a relationship-driven, platform-facilitated match, not a public marketplace investors browse — during the audit step, the reviewer offers the project to a shortlist of qualified Class 1 investors. This mirrors real-world syndicate formation, where underwriters are selected based on financial capacity and track record, not a first-come-first-served public listing.
- **Investors set their own commitment ceiling** — never a blank-check "cover whatever's short." Each underwriter states the maximum they're willing to cover.
- **Multiple underwriters can co-cover one project (a syndicate).** If more than one Class 1 investor commits to the same project, whoever committed the largest amount becomes the lead — a coordination role, not additional financial obligation.
- **At campaign close, if a shortfall actually occurs,** it's drawn proportionally across all committed underwriters, in proportion to what each committed — and never more than any individual committed, even if the shortfall exceeds what one of them alone offered.
- **If total committed underwriting capacity is less than the actual shortfall,** the uncovered remainder is treated as genuine undersubscription — normal refund/failure handling applies to that portion.
- *Proposed, not yet confirmed built:* a distinct underwriting fee/premium, separate from the standard investor fee, compensating underwriters specifically for the additional risk of standing ready to cover a shortfall.

---

## 8. Visibility enforcement — architecture

- **Backend owns this, as the single source of truth.** A shared function (e.g. `getVisibleProjectsQuery(investorClass)`) encodes the full visibility table from §1 as application logic — this is where the rules live, and the only place that needs updating when thresholds change.
- **RLS is a coarse safety net only**, not a reimplementation of the full table — e.g. a simple rule blocking non-Class-1 investors from ever seeing `draft`/pre-audit status projects, regardless of anything else. Deliberately not encoding the detailed numeric visibility thresholds (">AED 10M", ">AED 15M", etc.) in RLS, since compound, frequently-tuned business rules are fragile and hard to maintain as raw SQL.
- **Frontend never independently enforces visibility** — it only renders what the backend already filtered.

---

## 9. Min investment floor — interaction with class

`min_investment_floor` is a project-level minimum set by the issuer, independent of and layered on top of any class-based maximum. Because Class 10's ceiling is only AED 500, any project with a floor set above that becomes completely inaccessible to Class 10 investors — worth surfacing as a warning in the issuer wizard when a floor is set that excludes an entire class, since it may not be an intentional choice.

---

## 10. SPV Equity — special case summary

- No `expected_roi_percent` — returns come from dividends and share price appreciation, not a fixed periodic rate, so this field is hidden entirely rather than shown as a projection.
- `yield_type` is auto-locked to Equity Appreciation, not user-selectable.
- Conversion clause is unavailable (see §6) — the "enable conversion" option is not shown at all when this contract type is selected.
- `hard_cap` and `target_goal` are both derived from `total_shares_authorized × unit_price`, not entered independently.
- `is_spv = true` is enforced automatically and cannot be unchecked when this contract type is selected — SPV Equity requires an SPV to exist by definition.

---

## 11. Key fields quick-reference

| Field | Table | Purpose |
|---|---|---|
| `investor_class` | `investor_profiles` | Current class, reviewer-assigned |
| `investor_class_at_pledge` | `pledges` | Frozen snapshot at time of pledge |
| `fee_percent_at_pledge` | `pledges` | Frozen fee rate at time of pledge |
| `conversion_eligible_units` | `holdings` | Actual convertible portion, capped by class + pool |
| `total_shares_authorized` | `spv_details` | Ceiling on all shares a project can ever issue/convert |
| `underwriter_mode_enabled` | `projects` / `financial_terms` | Issuer's paid opt-in for underwriting |
| `min_investment_floor` | `projects` | Project-level minimum pledge, independent of class |
| `redeemed_at` | `holdings` | Feeds the 3-redemption upgrade eligibility count |