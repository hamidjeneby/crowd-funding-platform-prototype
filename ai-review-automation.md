# AI Review Automation — Implementation Reference

Documents the AI-assisted review automation as actually built and tested in
Make, using Gemini across all review steps. This reflects real behavior
observed from production sample rows, not the original design proposal —
where the two differ, it's noted explicitly.

---

## Shared table: `ai_review_results`

One row is created **per individual review action**, not one row per entity —
a project with 3 documents and 4 media files produces 7 separate rows plus any
suggestion-step rows, not one combined row.

| Column              | Behavior as implemented                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity_type`       | One of: `investor_document_review`, `investor_onboarding`, `issuer_document_review`, `milestone_review`, `project_media_review`, `project_document_review`, `project_min_visibility_class_review`                                                                                                                                                           |
| `entity_id`         | The id of the specific row being reviewed (a document id, investor profile id, milestone id, or project id) — scoped within its own table per `entity_type`, not a single universal id space. The same numeric id can legitimately appear under different `entity_type`s referring to completely different records.                                         |
| `suggested_outcome` | `approved` / `rejected`, or `null` for suggestion-only steps that don't make a pass/fail call (investor class suggestion, visibility class suggestion)                                                                                                                                                                                                      |
| `suggested_class`   | Populated only on `investor_onboarding` (investor class) rows. Not used elsewhere.                                                                                                                                                                                                                                                                          |
| `confidence_score`  | 0–1, present on every row type                                                                                                                                                                                                                                                                                                                              |
| `flags`             | An array of strings, one for each flag raised by the LLM ["first flag", "second flag", "third flag"] |
| `raw_model_output`  | The full LLM response, stored as a stringified JSON string (double-encoded) — kept for audit/debugging, not meant to be the primary read for the auditor UI.                                                                                                                                                                                                |
| `reasoning_summary` | Plain-language 2–3 sentence summary, extracted from the model output — this is the field the auditor-facing suggestion panel should actually read, not `raw_model_output`.                                                                                                                                                                                  |
| `auto_rejected`     | `true` only on the Milestone Review auto-decided path currently. Not yet active for onboarding/project document rejections — see note under each workflow below.                                                                                                                                                                                            |
| `reviewed_by`       | `null` until a human acts. **`0` is a reserved sentinel meaning the AI applied the decision automatically** (Milestone Review only) — not a real user id. Must be special-cased in any UI/query, not treated as an actual reviewer.                                                                                                                         |
| `final_decision`    | `null` until reviewed — set immediately alongside `reviewed_by: 0` for AI-auto-decided milestones, otherwise set only by a human.                                                                                                                                                                                                                           |

---

## 1. Investor Onboarding Review

**Trigger:** Investor completes onboarding → data sent to webhook.

**Step 1 — Document review (per document):**
Each uploaded document is scanned and reviewed individually by Gemini. One row
is created per document, `entity_type: investor_document_review`,
`entity_id` = the document's id.

Example (a mountain landscape image submitted as a source-of-funds document):

```json
{
  "entity_type": "investor_document_review",
  "entity_id": 21,
  "suggested_outcome": "rejected",
  "confidence_score": 1,
  "reasoning_summary": "The provided document is an image of a mountain landscape, not a valid source of funds document. It fails all authenticity and content checks for KYC onboarding.",
  "raw_model_output": {
    "doc_type": "source_of_funds",
    "document_appears_genuine": false,
    "name_matches_declared": false,
    "is_current": "not_applicable",
    "type_matches_declared": false,
    "concerns": [
      "Document is an image of a mountain instead of a source of funds document",
      "No text, name, or financial identifiers present"
    ]
  }
}
```

**Step 2 — Investor class suggestion (once all documents are reviewed):**
The investor's declared data (type, net worth, income, experience) is sent to
Gemini, which suggests an `investor_class`. One row, `entity_type:
investor_onboarding`, `entity_id` = investor profile id. `suggested_outcome`
is left `null` here — this step produces a class suggestion, not a pass/fail
call; only the document-review rows carry an explicit `approved`/`rejected`
outcome.

Example:

```json
{
  "entity_type": "investor_onboarding",
  "entity_id": 30,
  "suggested_outcome": null,
  "suggested_class": 1,
  "confidence_score": 0.9,
  "reasoning_summary": "Based on the institutional investor type and extremely high net worth with extensive experience, Class 1 is the most appropriate suggestion.",
  "flags": "Class 1 always requires enhanced due diligence regardless of this suggestion."
}
```

**Step 3 — Human review, always.** Regardless of what the AI outputs — high
confidence, rejected documents, a Class 1 suggestion — the case is always
routed to a human auditor for final decision. There is currently no
auto-approve or auto-reject branch in this workflow.

---

## 2. Issuer Onboarding Review

**Trigger:** Issuer submits onboarding.

Simpler than investor review by design — only documents are reviewed, since
there's no class to suggest for an issuer. Same per-document review process
as investor documents, `entity_type: issuer_document_review`.

**One step unique to this workflow:** the issuer's `trade_licence_number`
field is stored encrypted, so it's decrypted within the automation before
being passed to the LLM, so the model can actually compare it against the
licence number visible on the uploaded trade certificate.

Example (a helicopter image submitted as a trade certificate):

```json
{
  "entity_type": "issuer_document_review",
  "entity_id": 21,
  "suggested_outcome": "rejected",
  "confidence_score": 1,
  "reasoning_summary": "The uploaded document is not a trade certificate, but an image of a helicopter in a savannah setting at sunset. It fails all validity checks for KYB onboarding.",
  "raw_model_output": {
    "doc_type": "trade_certificate",
    "document_appears_genuine": false,
    "entity_name_matches": false,
    "is_current": false,
    "concerns": [
      "Uploaded document is an image of a helicopter, not a trade certificate",
      "Entity name and licence number cannot be verified from the image",
      "Document is completely irrelevant to business verification"
    ]
  }
}
```

Same as investor review: always routed to a human for final decision,
regardless of AI confidence or outcome.

---

## 3. Milestone Review

**Trigger:** New milestone submitted → webhook fires.

**Context gathering:** before the review step runs, the automation also
pulls the project's other existing milestones and relevant project details,
giving the LLM surrounding context rather than judging the new milestone in
isolation.

**Review step:** a single LLM call evaluates the new milestone against that
context — is it genuine/coherent content, is the target date plausible —
and returns `suggested_outcome` and `confidence_score`, same as every other
step in this workflow.

**This is the only one of the four workflows with an automatic decision
path:**

- `confidence_score > 0.8` → the AI's decision is applied automatically.
  `reviewed_by` is set to `0` (the AI sentinel), `final_decision` is set to
  match `suggested_outcome`, and `auto_rejected: true` if rejected.
- `confidence_score ≤ 0.8` → left for a human reviewer, `reviewed_by` and
  `final_decision` stay `null`.

Example (auto-rejected, confidence 1 — inappropriate content and a nonsensical
target date):

```json
{
  "entity_type": "milestone_review",
  "entity_id": 63,
  "suggested_outcome": "rejected",
  "confidence_score": 1,
  "reasoning_summary": "The submitted milestone contains inappropriate, non-professional content (spam/gibberish) and features a target date in the year 2000, which precedes the project timeline and is nonsensical.",
  "auto_rejected": true,
  "reviewed_by": 0,
  "final_decision": "rejected"
}
```

---

## 4. Project Review

**Trigger:** Project submitted for review.

**Step 1 — Media review (per image):**
Each `project_media` image is reviewed individually, one row per image,
`entity_type: project_media_review`, checking both appropriateness and
whether the image is genuinely related to the stated project.

Example (a safari/hiking stock photo attached to a solar energy project):

```json
{
  "entity_type": "project_media_review",
  "entity_id": 29,
  "suggested_outcome": "rejected",
  "confidence_score": 0.99,
  "reasoning_summary": "The image depicts a group of hikers walking through a lush forest with wildlife (elephants and antelope), which is completely unrelated to the solar microgrid expansion project described.",
  "raw_model_output": {
    "appropriate": true,
    "appears_related_to_project": false,
    "concern": "The image appears to be a generic stock photo of a safari or hiking trek in a forest, showing no connection to solar energy infrastructure or rural electrification in Kenya."
  }
}
```

**Step 2 — Document review (per document):**
`entity_type: project_document_review`, intended to run the same
authenticity/correctness check as the other two document-review workflows.

> **⚠ Observed inconsistency, worth verifying before relying on this:** the
> sample row captured for this step (below) has the **media-review** output
> shape (`appropriate`, `appears_related_to_project`) rather than the
> document-review shape (`document_appears_genuine`, `entity_name_matches`,
> `type_matches_declared`) used by `investor_document_review` and
> `issuer_document_review`. This suggests the project document review step
> may currently be calling the media-review module/prompt instead of a
> dedicated document-review one — meaning project documents (pitch deck,
> balance sheet, etc.) could be getting judged on image relevance rather than
> on document authenticity and identity-matching. Worth checking this
> specific Make scenario step before treating it as equivalent to the other
> two document-review workflows.

```json
{
  "entity_type": "project_document_review",
  "entity_id": 21,
  "suggested_outcome": "rejected",
  "confidence_score": 0.99,
  "reasoning_summary": "The image displays an abstract art deco pattern with a green emerald gem, which is completely unrelated to solar energy infrastructure or off-grid microgrids in Kenya.",
  "raw_model_output": {
    "appropriate": true,
    "appears_related_to_project": false,
    "concern": "The image is an unrelated decorative stock graphic and does not depict solar panels, energy infrastructure, or any context related to rural Kenya."
  }
}
```

**Step 3 — Minimum visibility class suggestion:**
A separate LLM step, `entity_type: project_min_visibility_class_review`. The
platform's standard visibility rules are already automatic (driven by
campaign size), so this step exists only to flag rare, special cases that
might warrant an _additional_ restriction on top of those standard rules —
most projects result in no extra restriction, as in the example below.

```json
{
  "entity_type": "project_min_visibility_class_review",
  "entity_id": 12,
  "suggested_outcome": null,
  "suggested_class": null,
  "confidence_score": 0.95,
  "reasoning_summary": "The project is a standard Mudarabah structure utilizing an SPV with a target goal of AED 5,500,000. While Mudarabah involves profit-sharing and loss-bearing partnership risks, the use of an SPV provides standard structural containment. The campaign size (AED 5.5M) is appropriately managed by the platform's standard automatic visibility and pledge limits. There are no extraordinary risk factors, complex hybrid instruments, or severe distress indicators that necessitate imposing an additional minimum investor class restriction beyond the baseline rules.",
  "flags": null
}
```

Same as the onboarding workflows: project review is always routed to a human
for final decision, regardless of AI output.

---

## Workflow comparison

| Workflow            | What's reviewed                                                         | Output type(s)                                                               | Auto-decides?                | Always human-reviewed?     |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------- | -------------------------- |
| Investor Onboarding | Documents (per doc) + declared financial data                           | `suggested_outcome` per doc, `suggested_class` overall                       | No                           | Yes                        |
| Issuer Onboarding   | Documents (per doc) only                                                | `suggested_outcome` per doc                                                  | No                           | Yes                        |
| Milestone Review    | New milestone + surrounding context                                     | `suggested_outcome`                                                          | **Yes, if confidence > 0.8** | Only when confidence ≤ 0.8 |
| Project Review      | Media (per image) + documents (per doc) + visibility special-case check | `suggested_outcome` per media/doc, optional `suggested_class` for visibility | No                           | Yes                        |
