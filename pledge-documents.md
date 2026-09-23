# Investor Pledge Documents

Reference for the documents generated over the life of a pledge, excluding
Allocation Confirmation (handled separately) and Key Investment Information
(kept as a `project_docs` entry, not a pledge document — see note at the end).

All documents described here are **platform-generated from a fixed template**,
never authored freehand by the issuer — the same principle applied to every
other compliance-sensitive document in this build. An issuer has an inherent
incentive to write investor-facing terms in their own favor, and inconsistent
wording across projects is a real compliance liability. Legal drafts one
master template per document type with placeholder fields; the backend fills
those fields with live data from `pledges`, `projects`, and `spv_details` at
the relevant trigger point, and renders the result to PDF.

Stored in the `pledge_docs` bucket, recorded in the `pledge_docs` table, and
served to investors through the same signed-URL pattern used for every other
private document on the platform.

---

## `pledge_docs` table shape

| Column       | Type            | Notes                                                                 |
| ------------ | --------------- | --------------------------------------------------------------------- |
| id           | PK              |                                                                       |
| pledge_id    | FK → pledges.id |                                                                       |
| doc_type     | enum            | `subscription_agreement / sukuk_certificate / distribution_statement` |
| file_url     | text            | private bucket, signed URL on access                                  |
| generated_at | timestamp       |                                                                       |

---

## 1. Subscription Agreement

**Stage generated:** The moment a pledge is submitted (`pledges.status =
'pending'`) — before campaign close, before allocation is known.

**What it represents:** This is a conditional legal commitment, not a
completed sale. It must be written and understood as an offer to subscribe,
subject to final acceptance — because the actual allocated amount may come in
lower than what was pledged if the campaign is oversubscribed. The document
should say this explicitly, not imply a guaranteed position.

**Contents:**

- Investor identity (name/legal entity name, matching onboarding records)
- Project and issuer/SPV identity (the investor is contracting with the
  issuer/SPV, not with the platform — the platform is the facilitator)
- Pledged amount
- `investor_class_at_pledge`
- `fee_percent_at_pledge` and computed fee amount
- Unit price and estimated units (`pledged_amount ÷ unit_price`)
- Sharia contract type and a plain-terms summary of how it works (Murabaha /
  Mudarabah / Ijara / SPV Equity mechanics)
- Conversion clause terms, if enabled on the project (trigger price, ratio,
  deadline) — only included when applicable
- Explicit clause stating the subscription is conditional on final allocation
  and may be filled in full, in part, or not at all
- E-signature capture: timestamp and IP, same pattern as onboarding consent

---

## 2. Sukuk / Share Certificate

**Stage generated:** Once the holding is formally issued and active — after
allocation is finalized and funds have settled (post campaign-close, not at
pledge time).

**What it represents:** Formal proof of what the investor actually holds,
now that the conditional subscription above has been finalized into a real
position.

**Contents:**

- Investor identity
- Project and issuer/SPV identity
- Final allocated amount and unit/share count (this may differ from the
  originally pledged amount and units under oversubscription — use the final
  allocated figures, not the original pledge figures)
- Unit type (Sukuk certificate or SPV share, depending on contract type)
- Issuance date
- Terms summary: yield type, and either the redemption/maturity structure (for
  Sukuk) or a note that there is no maturity date (for SPV Equity holdings)
- Conversion terms, if applicable, restated from the Subscription Agreement
  for continuity
- For conversion-related certificates specifically: reference the custody
  provider's own registry file (`registry_file_url`, returned via the
  `conversion_completed` webhook) rather than treating the platform's
  certificate as the sole record — the custodian's registry is the
  authoritative source for the conversion event itself

---

## 3. Distribution Statement

**Stage generated:** Each time a payout/distribution runs against this
holding — recurring, not a one-time document. Applies for the life of the
holding, for as long as distributions continue.

**What it represents:** A record of one distribution event, tied to one
holding.

**Contents:**

- Investor identity
- Project identity
- Distribution period covered
- Distribution amount
- Which holding/pledge this distribution applies to
- For fixed-return contract types (Murabaha, Ijara): the pre-agreed rate this
  payment corresponds to
- For profit-sharing (Mudarabah): the reported profit figure this
  distribution is based on, and a note that it reflects actual performance
  rather than a fixed rate

---

## Note on Key Investment Information

Not included in `pledge_docs` — this lives as a `doc_type` on `project_docs`
instead, since it's project-level information shown to every prospective
investor before they pledge, not something generated per-pledge. Reviewed
during the project audit step the same as every other project document.
