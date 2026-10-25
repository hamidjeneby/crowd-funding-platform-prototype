import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  formatUtcDateTime,
  formatUtcDateOnly,
  formatAmount,
  formatPercent,
  composeCertificateSection4,
  buildSukukCertificatePayload,
  getUnitTypeLabel,
  getShariaContractTypeLabel,
  getYieldTypeLabel,
} from "../../lib/closing/certificate.js";
import { encrypt } from "../../app/utils/crypto.js";

// Mock env for crypto key
process.env.CUSTOM_HASHING_SALT = process.env.CUSTOM_HASHING_SALT || "test-salt-secret-at-least-32-chars-long";

test("Date and currency formatters", () => {
  assert.equal(formatUtcDateTime("2026-10-22T14:30:00Z"), "22/10/2026 14:30");
  assert.equal(formatUtcDateOnly("2028-01-15"), "15/01/2028");
  assert.equal(formatUtcDateOnly("2028-01-15T00:00:00Z"), "15/01/2028");
  assert.equal(formatAmount(1000), "1,000.00");
  assert.equal(formatAmount(150000.5), "150,000.50");
  assert.equal(formatPercent(8.5), "8.5");
  assert.equal(formatPercent(15), "15");
  assert.equal(formatPercent(33.3333), "33.33");
});

test("Section 4 Composition: Murabaha", () => {
  const project = {
    sharia_contract_type: "murabaha",
    tenor_months: 12,
    expected_roi_percent: 8.5,
    currency: "AED",
    contract_terms: {
      payment_frequency: "quarterly",
      principal_repayment: "at_maturity",
      asset_description: "Commercial refrigeration units",
    },
  };
  const pledge = { allocated_amount: 100000 };

  const sec4 = composeCertificateSection4({ project, pledge });
  assert.equal(
    sec4.term_text,
    "12 months, starting on the date the funds are released to the issuer. The maturity date is confirmed at release."
  );
  assert.equal(
    sec4.return_text,
    "Annual profit rate of 8.5%, contractually owed on the allocated amount."
  );
  assert.equal(
    sec4.payments_text,
    "Paid quarterly. Principal is repaid at maturity."
  );
  assert.equal(
    sec4.end_of_term_text,
    "Principal is repaid at maturity, after which the certificate is redeemed."
  );
  assert.equal(sec4.asset_text, "Commercial refrigeration units");
});

test("Section 4 Composition: Murabaha at_maturity payment frequency", () => {
  const project = {
    sharia_contract_type: "murabaha",
    tenor_months: 6,
    expected_roi_percent: 7,
    currency: "AED",
    contract_terms: {
      payment_frequency: "at_maturity",
      principal_repayment: "at_maturity",
      asset_description: "Warehouse inventory stock",
    },
  };
  const sec4 = composeCertificateSection4({ project, pledge: { allocated_amount: 50000 } });
  assert.equal(sec4.payments_text, "Profit and principal are paid at maturity.");
});

test("Section 4 Composition: Ijara (sale to issuer)", () => {
  const project = {
    sharia_contract_type: "ijara",
    tenor_months: 24,
    expected_roi_percent: 9.2,
    currency: "AED",
    contract_terms: {
      payment_frequency: "monthly",
      asset_description: "Solar inverter system",
      asset_value: 500000,
      end_of_term: "sale_to_issuer",
      end_of_term_price: 450000,
    },
  };
  const sec4 = composeCertificateSection4({ project, pledge: { allocated_amount: 50000 } });
  assert.equal(
    sec4.return_text,
    "Annual rental yield of 9.2%, paid from the rent on the leased asset."
  );
  assert.equal(sec4.payments_text, "Rent is paid monthly.");
  assert.equal(
    sec4.end_of_term_text,
    "The asset is sold to the issuer at the end of the term for 450,000.00 AED."
  );
  assert.equal(
    sec4.asset_text,
    "Solar inverter system, valued at 500,000.00 AED."
  );
});

test("Section 4 Composition: Ijara (sale to third party & return asset)", () => {
  const p1 = {
    sharia_contract_type: "ijara",
    tenor_months: 12,
    expected_roi_percent: 8,
    currency: "AED",
    contract_terms: {
      payment_frequency: "annual",
      asset_description: "Logistics fleet vans",
      asset_value: 200000,
      end_of_term: "sale_to_third_party",
    },
  };
  const sec4a = composeCertificateSection4({ project: p1, pledge: { allocated_amount: 20000 } });
  assert.equal(
    sec4a.end_of_term_text,
    "The asset is sold to a third party and the proceeds are distributed to holders."
  );

  const p2 = { ...p1, contract_terms: { ...p1.contract_terms, end_of_term: "return_asset" } };
  const sec4b = composeCertificateSection4({ project: p2, pledge: { allocated_amount: 20000 } });
  assert.equal(sec4b.end_of_term_text, "The asset is returned at the end of the term.");
});

test("Section 4 Composition: Mudarabah", () => {
  const project = {
    sharia_contract_type: "mudarabah",
    tenor_months: 18,
    expected_roi_percent: 11,
    allocated_total: 200000,
    contract_terms: {
      investor_profit_share_percent: 70,
      profit_reporting_frequency: "quarterly",
    },
  };
  const pledge = { allocated_amount: 50000 }; // 50k / 200k = 25%

  const sec4 = composeCertificateSection4({ project, pledge });
  assert.equal(
    sec4.return_text,
    "Profit sharing, not a fixed rate. Investors together receive 70% of the project's profit; the issuer keeps the rest. Your share of the investors' portion is 25%. Target annual return 11%, not guaranteed. Actual returns depend on profit and can be zero."
  );
  assert.equal(sec4.payments_text, "Profit is reported quarterly.");
  assert.equal(
    sec4.end_of_term_text,
    "Capital is returned at the end of the term, subject to the project's performance."
  );
  assert.equal(
    sec4.asset_text,
    "The business activity described in the project listing."
  );
});

test("Section 4 Composition: SPV Equity", () => {
  const project = {
    sharia_contract_type: "spv_equity",
    contract_terms: {
      existing_shares_outstanding: 8000,
      voting_rights: false,
      dividend_policy: "discretionary",
      target_exit_horizon_years: 5,
    },
  };
  const pledge = {
    allocated_amount: 25000,
    ownership_percentage: 12.5,
  };
  const spvDetails = { spv_legal_name: "Apex Global SPV Ltd" };

  const sec4 = composeCertificateSection4({ project, pledge, spvDetails });
  assert.equal(
    sec4.term_text,
    "No fixed term and no maturity date. This holding is not redeemable by the issuer."
  );
  assert.equal(
    sec4.return_text,
    "No fixed return. Value comes from dividends, if declared, and any change in the value of the shares. Not guaranteed."
  );
  assert.equal(
    sec4.payments_text,
    "Dividends at the issuer's discretion. Voting rights: No."
  );
  assert.equal(
    sec4.end_of_term_text,
    "An exit (sale, acquisition or listing) is possible but not guaranteed. Indicative exit horizon: 5 years."
  );
  assert.equal(
    sec4.asset_text,
    "Shares in Apex Global SPV Ltd, representing 12.5% of the issued share capital after this raise."
  );
});

test("Full Sukuk Certificate Payload builds all template placeholders", () => {
  const templatePath = path.resolve(process.cwd(), "sukuk_certificate_template.md");
  const templateContent = fs.readFileSync(templatePath, "utf-8");

  // Extract all {{placeholder}} variables from the template
  const placeholderRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const matches = new Set();
  let match;
  while ((match = placeholderRegex.exec(templateContent)) !== null) {
    matches.add(match[1]);
  }

  const project = {
    id: 101,
    title: "Apex Logistics Sukuk",
    slug: "apex-logistics",
    currency: "AED",
    sharia_contract_type: "murabaha",
    is_spv: true,
    unit_price: 1000,
    tenor_months: 12,
    expected_roi_percent: 8.5,
    contract_terms: {
      payment_frequency: "quarterly",
      principal_repayment: "at_maturity",
      asset_description: "Cold chain logistics transport fleet",
    },
  };

  const spvDetails = {
    spv_legal_name: "Apex Logistics SPV Ltd",
    registration_number: "DIFC-2026-999",
    conversion_enabled: true,
    conversion_ratio_shares: 2,
    conversion_deadline: "2027-12-31",
    conversion_trigger_value: 25.5,
  };

  const investor = {
    id: 30,
    type: "individual",
    full_name: "Tariq Mansoor",
    email: "tariq@example.com",
    id_number: encrypt("784-1985-1234567-1"),
  };

  const pledge = {
    id: 501,
    pledge_id: 501,
    status: "allocated",
    allocated_amount: 150000,
    allocated_units: 150,
    allocated_at: "2026-10-22T14:30:00Z",
    conversion_eligible_units: 30,
  };

  const payload = buildSukukCertificatePayload({
    project,
    pledge,
    investor,
    spvDetails,
    pledgeDocId: 88,
  });

  // Verify Make routing keys
  assert.equal(payload.pledge_doc_id, 88);
  assert.equal(payload.doc_type, "sukuk_certificate");
  assert.equal(payload.investor_email, "tariq@example.com");

  // Verify derived Certificate ID format: SC-{YYYY of allocated_at}-{pledge_docs.id padded to 6 digits}
  assert.equal(payload.certificate_id, "SC-2026-000088");
  assert.equal(payload.pledge_id, 501);
  assert.equal(payload.allocated_at, "22/10/2026 14:30");

  // Verify decrypted legal ID & aliases
  assert.equal(payload.investor_legal_id, "784-1985-1234567-1");
  assert.equal(payload.investor_id, "784-1985-1234567-1");
  assert.equal(payload.investor_db_id, 30);
  assert.equal(payload.investor_full_name, "Tariq Mansoor");
  assert.equal(payload.spv_legal_name, "Apex Logistics SPV Ltd");
  assert.equal(payload.spv_registration_no, "DIFC-2026-999");
  assert.equal(payload.unit_type, "Murabaha Sukuk unit");
  assert.equal(payload.allocated_amount, "150,000.00");
  assert.equal(payload.allocated_units, 150);
  assert.equal(payload.unit_price, "1,000.00");
  assert.equal(payload.currency, "AED");
  assert.equal(payload.sharia_contract_type, "Murabaha");
  assert.equal(payload.yield_type, "Fixed profit rate");

  // Verify conversion terms
  assert.equal(payload.is_conversion_enabled, "Yes");
  assert.equal(payload.conversion_eligible_units, 30);
  assert.equal(payload.conversion_ratio_shares, 2);
  assert.equal(payload.conversion_deadline, "31/12/2027");
  assert.equal(payload.conversion_trigger_price, "25.50");

  // Verify that EVERY placeholder from the markdown template exists as a key in payload!
  for (const ph of matches) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(payload, ph),
      `Payload must include placeholder {{${ph}}} found in sukuk_certificate_template.md`
    );
    assert.notEqual(payload[ph], undefined, `Payload key ${ph} must not be undefined`);
  }
});

test("Institutional investor and non-SPV issuer fallback", () => {
  const project = {
    id: 102,
    title: "Gulf Trade Murabaha",
    currency: "USD",
    sharia_contract_type: "murabaha",
    is_spv: false,
    unit_price: 500,
    tenor_months: 6,
    expected_roi_percent: 6.5,
    contract_terms: {
      payment_frequency: "quarterly",
      principal_repayment: "at_maturity",
      asset_description: "Commodity inventory",
    },
  };

  const issuer = {
    legal_entity_name: "Gulf Trading Corp",
    trade_license_number: encrypt("TL-GULF-2026-888"),
  };

  const investor = {
    id: 42,
    type: "institutional",
    legal_entity_name: "Oasis Holdings LLC",
    email: "invest@oasis.com",
    trade_license_number: encrypt("TL-OASIS-999"),
  };

  const pledge = {
    id: 777,
    status: "allocated",
    allocated_amount: 50000,
    allocated_units: 100,
    allocated_at: "2026-05-15T10:00:00Z",
    conversion_eligible_units: 0,
  };

  const payload = buildSukukCertificatePayload({
    project,
    pledge,
    investor,
    issuer,
    pledgeDocId: 15,
  });

  assert.equal(payload.certificate_id, "SC-2026-000015");
  assert.equal(payload.investor_full_name, "Oasis Holdings LLC");
  assert.equal(payload.investor_legal_id, "TL-OASIS-999");
  assert.equal(payload.spv_legal_name, "Gulf Trading Corp");
  assert.equal(payload.spv_registration_no, "TL-GULF-2026-888");
  assert.equal(payload.is_conversion_enabled, "No");
  assert.equal(payload.conversion_eligible_units, "N/A");
  assert.equal(payload.conversion_ratio_shares, "N/A");
  assert.equal(payload.conversion_deadline, "N/A");
  assert.equal(payload.conversion_trigger_price, "N/A");
});
