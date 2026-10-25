# Sukuk / Share Certificate template (only section 4 restructured)

Sections 1, 2, 3, 5 and the signature block are exactly as in your original file. Only the
"Redemption Frame" part of section 4 is replaced by the Term, Repayment and Redemption block below.
All dates are UTC, format dd/mm/yyyy hh:mm.

---

SUKUK / SHARE CERTIFICATE OF HOLDING
CERTIFICATE OF BENEFICIAL OWNERSHIP & ALLOCATION

## 1. CERTIFICATE IDENTIFICATION
Certificate ID: {{certificate_id}}
Pledge ID: {{pledge_id}}
Issuance Date: {{allocated_at}}

## 2. HOLDER & ISSUER DETAILS
Certificate Holder
Legal Name: {{investor_full_name}}
Legal ID / Entity Registration: {{investor_legal_id}}
Issuer / SPV Entity
SPV Legal Name: {{spv_legal_name}}
Registration Number: {{spv_registration_no}}
Underlying Project Name: {{project_name}}

## 3. HOLDING & ALLOCATION DETAILS
Holding Unit Type: {{unit_type}}
Final Allocated Amount: {{allocated_amount}} {{currency}}
Final Allocated Units / Shares: {{allocated_units}}
Unit Price: {{unit_price}} {{currency}}

## 4. TERMS & RETURN STRUCTURE
Sharia Compliance & Governance
Sharia Contract Type: {{sharia_contract_type}}
Return / Yield Type: {{yield_type}}

**Term, Repayment & Redemption  (NEW, replaces "Redemption Frame")**
Term: {{term_text}}
Return: {{return_text}}
Payments / Reporting: {{payments_text}}
End of Term: {{end_of_term_text}}
Underlying Asset / Activity: {{asset_text}}

## 5. RESTATED CONVERSION TERMS & AUTHORITATIVE REGISTRY
Conversion Rights
Conversion Eligibility: {{is_conversion_enabled}}
Conversion Trigger Price: {{conversion_trigger_price}}
Restated Conversion Terms: Eligible for conversion into {{conversion_eligible_units}} units prior to {{conversion_deadline}} at a conversion ratio of {{conversion_ratio_shares}} share(s) per unit.
Custody & Ownership Record
Authoritative Custody Registry File: {{registry_file_url}}

Note: In the event of conversion, corporate action, or ledger reconciliation, the official register maintained within the custodian's authoritative registry file shall constitute the definitive and sole legal record of title.

## EXECUTION & ATTESTATION
This Certificate is issued electronically and governed by the terms of the underlying SPV agreement and applicable Sharia standards.
Person / Authorized Signatory: {{spv_legal_name}}
Date: Date of Authentication

---

## What the five new lines say, by contract type
The server composes these from fields collected in the project wizard (Step 3 repayment terms).
Bracketed values come from the project. Wording needs legal and Sharia approval.

### Murabaha
- Term: [tenor_months] months, starting on the date the funds are released to the issuer. The
  maturity date is confirmed at release.
- Return: Annual profit rate of [expected_roi_percent]%, contractually owed on the allocated amount.
- Payments / Reporting: Paid [payment_frequency]. Principal is repaid [with each instalment | at
  maturity]. (If payment_frequency is at_maturity: Profit and principal are paid at maturity.)
- End of Term: Principal is repaid [with instalments | at maturity], after which the certificate is
  redeemed.
- Underlying Asset: [asset_description]

### Ijara
- Term: same as Murabaha.
- Return: Annual rental yield of [expected_roi_percent]%, paid from the rent on the leased asset.
- Payments / Reporting: Rent is paid [payment_frequency].
- End of Term: [sale_to_issuer: The asset is sold to the issuer at the end of the term for
  [end_of_term_price] [currency]. | sale_to_third_party: The asset is sold to a third party and the
  proceeds are distributed to holders. | return_asset: The asset is returned at the end of the term.]
- Underlying Asset: [asset_description], valued at [asset_value] [currency].

### Mudarabah
- Term: same as Murabaha.
- Return: Profit sharing, not a fixed rate. Investors together receive
  [investor_profit_share_percent]% of the project's profit; the issuer keeps the rest. Your share of
  the investors' portion is [allocated_amount / project allocated_total, as %]. Target annual return
  [expected_roi_percent]%, not guaranteed. Actual returns depend on profit and can be zero.
- Payments / Reporting: Profit is reported [profit_reporting_frequency].
- End of Term: Capital is returned at the end of the term, subject to the project's performance.
- Underlying Asset / Activity: The business activity described in the project listing.

### SPV equity
- Term: No fixed term and no maturity date. This holding is not redeemable by the issuer.
- Return: No fixed return. Value comes from dividends, if declared, and any change in the value of
  the shares. Not guaranteed.
- Payments / Reporting: [dividend_policy: No dividends planned | Dividends at the issuer's
  discretion | Target dividend payout]. Voting rights: [Yes | No].
- End of Term: An exit (sale, acquisition or listing) is possible but not guaranteed. Indicative exit
  horizon: [target_exit_horizon_years] years.
- Underlying Asset: Shares in [spv_legal_name], representing [ownership_percentage]% of the issued
  share capital after this raise.