"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { isValidIBAN } from "ibantools";
import { encrypt, decrypt } from "@/app/utils/crypto";
import { generateWalletReferenceCode } from "@/lib/wallet";

export async function getInvestorPortalData() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investor = null;

  if (orgId) {
    const { data: instData } = await supabaseAdmin
      .from("investors")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (instData) investor = instData;
  }

  if (!investor) {
    const { data: indData } = await supabaseAdmin
      .from("investors")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (indData) investor = indData;
  }

  if (!investor) {
    // Default fallback object if no investor record found
    return {
      wallet_balance: 0,
      investor_class: null,
      bank_verification_status: "unverified",
      bank_details: {},
      type: orgId ? "institutional" : "individual",
      onboarding_status: "incomplete",
      kyc_documents: [],
      representatives: [],
    };
  }

  // Parse bank_details if stored as string
  let rawBankDetails = investor.bank_details || {};
  if (typeof rawBankDetails === "string") {
    try {
      rawBankDetails = JSON.parse(rawBankDetails);
    } catch (e) {
      console.error("Error parsing bank_details JSON:", e);
      rawBankDetails = {};
    }
  }

  // Decrypt IBAN if present
  if (rawBankDetails?.iban) {
    const decryptedIban = decrypt(rawBankDetails.iban);
    if (decryptedIban) {
      rawBankDetails.iban = decryptedIban;
    }
  }

  return {
    id: investor.id,
    user_id: investor.user_id,
    org_id: investor.org_id,
    type: investor.type,
    onboarding_status: investor.onboarding_status,
    wallet_balance: Number(investor.wallet_balance || 0),
    investor_class: investor.investor_class || null,
    bank_verification_status: investor.bank_verification_status || "pending",
    bank_verification_rejection_reason: investor.bank_verification_rejection_reason || null,
    bank_details: rawBankDetails,
    legal_name: investor.legal_name || investor.full_name || investor.legal_entity_name || "Investor",
    email: investor.email || "",
    phone: investor.phone || "",
    kyc_documents: investor.kyc_documents || investor.documents || [],
    representatives: investor.representatives || [],
    created_at: investor.created_at,
  };
}

export async function topUpWallet(amount) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: "Invalid amount entered." };
  }

  let investorId = null;
  let currentBalance = 0;

  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id, wallet_balance")
      .eq("org_id", orgId)
      .maybeSingle();

    if (data) {
      investorId = data.id;
      currentBalance = Number(data.wallet_balance || 0);
    }
  }

  if (!investorId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id, wallet_balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      investorId = data.id;
      currentBalance = Number(data.wallet_balance || 0);
    }
  }

  if (!investorId) {
    return { success: false, error: "Investor record not found." };
  }

  const newBalance = currentBalance + numericAmount;

  const { error } = await supabaseAdmin
    .from("investors")
    .update({ wallet_balance: newBalance })
    .eq("id", investorId);

  if (error) {
    console.error("Error topping up wallet:", error);
    return { success: false, error: "Failed to update wallet balance." };
  }

  const referenceCode = generateWalletReferenceCode("top_up");
  const { error: txError } = await supabaseAdmin
    .from("wallet_transactions")
    .insert({
      investor_id: investorId,
      pledge_id: null,
      type: "top_up",
      amount: numericAmount,
      balance_after: newBalance,
      reference_code: referenceCode,
    });

  if (txError) {
    console.error("Error inserting wallet_transactions top_up row:", txError);
  }

  revalidatePath("/investor-portal");
  revalidatePath("/investor-portal/wallet");

  return { success: true, newBalance };
}

export async function getInvestorWalletTransactions() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investorId = null;

  if (orgId) {
    const { data: instData } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();
    if (instData) investorId = instData.id;
  }

  if (!investorId) {
    const { data: indData } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (indData) investorId = indData.id;
  }

  if (!investorId) {
    return [];
  }

  const { data: txList, error } = await supabaseAdmin
    .from("wallet_transactions")
    .select(`
      id,
      investor_id,
      pledge_id,
      type,
      amount,
      balance_after,
      reference_code,
      created_at,
      pledges (
        id,
        project_id,
        pledged_amount,
        allocated_amount,
        status,
        projects (
          id,
          title,
          slug,
          currency
        )
      )
    `)
    .eq("investor_id", investorId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching wallet transactions:", error);
    return [];
  }

  return (txList || []).map((tx) => {
    const pledge = Array.isArray(tx.pledges) ? tx.pledges[0] : tx.pledges;
    const project = pledge
      ? Array.isArray(pledge.projects)
        ? pledge.projects[0]
        : pledge.projects
      : null;

    return {
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount || 0),
      balance_after: Number(tx.balance_after || 0),
      reference_code: tx.reference_code || null,
      created_at: tx.created_at,
      pledge_id: tx.pledge_id,
      pledge: pledge
        ? {
            id: pledge.id,
            status: pledge.status,
            pledged_amount: Number(pledge.pledged_amount || 0),
            allocated_amount:
              pledge.allocated_amount != null
                ? Number(pledge.allocated_amount)
                : null,
            project: project
              ? {
                  id: project.id,
                  title: project.title,
                  slug: project.slug,
                  currency: project.currency || "AED",
                }
              : null,
          }
        : null,
    };
  });
}

export async function requestClassUpgrade(reason) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "Please provide a reason for the upgrade." };
  }

  // Record upgrade request or update metadata
  let investorId = null;

  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();
    if (data) investorId = data.id;
  }

  if (!investorId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) investorId = data.id;
  }

  if (investorId) {
    await supabaseAdmin
      .from("investors")
      .update({
        class_upgrade_request: {
          requested_at: new Date().toISOString(),
          reason: reason.trim(),
          status: "under_review",
        },
      })
      .eq("id", investorId);
  }

  return { success: true };
}

export async function updateBankDetails(bankDetails) {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!bankDetails.bank_name || bankDetails.bank_name.trim().length < 2) {
    return { success: false, error: "Bank name is required." };
  }

  if (!bankDetails.account_name || bankDetails.account_name.trim().length < 2) {
    return { success: false, error: "Account holder name is required." };
  }

  if (!bankDetails.account_number || String(bankDetails.account_number).trim().length <= 6) {
    return { success: false, error: "Account number must be more than 6 characters." };
  }

  const cleanIban = String(bankDetails.iban || "").replace(/\s+/g, "");
  if (!cleanIban || (!cleanIban.includes(":") && !isValidIBAN(cleanIban))) {
    return { success: false, error: "Invalid IBAN number." };
  }

  if (!bankDetails.swift_code || bankDetails.swift_code.trim().length < 8 || !/^[A-Z0-9]+$/i.test(bankDetails.swift_code.trim())) {
    return { success: false, error: "SWIFT/BIC code must be at least 8 uppercase alphanumeric characters." };
  }

  if (!bankDetails.currency) {
    return { success: false, error: "Currency must be selected." };
  }

  if (!bankDetails.bank_address || bankDetails.bank_address.trim().length < 5) {
    return { success: false, error: "Bank address is required." };
  }

  let investorId = null;

  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();
    if (data) investorId = data.id;
  }

  if (!investorId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) investorId = data.id;
  }

  if (!investorId) {
    return { success: false, error: "Investor profile not found." };
  }

  // Encrypt IBAN before saving if plaintext IBAN provided
  const bankDetailsToSave = {
    ...bankDetails,
    iban: cleanIban,
  };

  if (!cleanIban.includes(":")) {
    const encryptedIban = encrypt(cleanIban);
    if (encryptedIban) {
      bankDetailsToSave.iban = encryptedIban;
    }
  }

  const { error } = await supabaseAdmin
    .from("investors")
    .update({
      bank_details: bankDetailsToSave,
      bank_verification_status: "pending",
      bank_verification_rejection_reason: null,
    })
    .eq("id", investorId);

  if (error) {
    console.error("Error updating bank details:", error);
    return { success: false, error: "Failed to update bank details." };
  }

  revalidatePath("/investor-portal/account");

  return { success: true };
}

export async function getInvestorHoldingsAndPledges() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let investor = null;

  if (orgId) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id, investor_class, wallet_balance")
      .eq("org_id", orgId)
      .maybeSingle();
    if (data) investor = data;
  }

  if (!investor) {
    const { data } = await supabaseAdmin
      .from("investors")
      .select("id, investor_class, wallet_balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) investor = data;
  }

  if (!investor) {
    return { investorClass: null, holdings: [], pledges: [] };
  }

  const investorId = investor.id;
  const investorClass = investor.investor_class || 10;

  // Fetch all pledge rows for investor from pledges table
  const { data: pledgesData, error: pledgesErr } = await supabaseAdmin
    .from("pledges")
    .select(`
      *,
      projects (
        id,
        title,
        slug,
        unit_type,
        sharia_contract_type,
        is_spv,
        unit_price,
        currency,
        expected_roi_percent,
        spv_details (*)
      )
    `)
    .eq("investor_id", investorId)
    .order("pledged_at", { ascending: false });

  if (pledgesErr) {
    console.error("Error fetching pledges:", pledgesErr);
  }

  const allPledges = pledgesData || [];

  // Separate pledges vs holdings according to status field:
  // - status in ["pending", "rejected_oversubscribed", "refunded"]: Pledges tab (pending allocation, not allocated, or refunded)
  // - status in ["allocated", "active", "completed"]: Portfolio holding (uses allocated_amount)
  // - status === "cancelled": Excluded
  const pledges = allPledges.filter(
    (p) =>
      p.status &&
      ["pending", "rejected_oversubscribed", "refunded"].includes(p.status.toLowerCase())
  );

  const rawHoldings = allPledges.filter(
    (p) =>
      p.status &&
      ["allocated", "active", "completed"].includes(p.status.toLowerCase())
  );

  // Fetch repayments and payout periods for these holdings to show received so far and next payment
  let holdings = rawHoldings;
  if (rawHoldings.length > 0) {
    try {
      const holdingIds = rawHoldings.map((h) => h.id);
      const heldProjIds = Array.from(new Set(rawHoldings.map((h) => h.project_id).filter(Boolean)));

      const [repsRes, periodsRes] = await Promise.all([
        supabaseAdmin
          .from("repayments")
          .select("id, pledge_id, amount, status, paid_at, payout_periods(id, due_date, status, kind)")
          .in("pledge_id", holdingIds),
        heldProjIds.length > 0
          ? supabaseAdmin
              .from("payout_periods")
              .select("id, project_id, due_date, status, kind")
              .in("project_id", heldProjIds)
          : Promise.resolve({ data: [] }),
      ]);

      const repsByPledge = new Map();
      for (const r of repsRes.data || []) {
        if (!repsByPledge.has(r.pledge_id)) {
          repsByPledge.set(r.pledge_id, []);
        }
        repsByPledge.get(r.pledge_id).push(r);
      }

      const periodsByProject = new Map();
      for (const p of periodsRes.data || []) {
        if (!periodsByProject.has(p.project_id)) {
          periodsByProject.set(p.project_id, []);
        }
        periodsByProject.get(p.project_id).push(p);
      }

      holdings = rawHoldings.map((h) => {
        const reps = repsByPledge.get(h.id) || [];
        const received = reps
          .filter((r) => r.status === "paid")
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const nextUnpaid = reps
          .filter((r) => (r.status === "scheduled" || r.status === "unpaid") && Number(r.amount) > 0)
          .sort((a, b) => new Date(a.payout_periods?.due_date || a.paid_at || 0) - new Date(b.payout_periods?.due_date || b.paid_at || 0))[0];

        const contractType = h.projects?.sharia_contract_type;
        let nextReportDueDate = null;
        if (contractType === "mudarabah") {
          const projsPeriods = periodsByProject.get(h.project_id) || [];
          const nextMudarabahPeriod = projsPeriods
            .filter((p) => p.kind === "profit_share" && p.status !== "paid")
            .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))[0];
          if (nextMudarabahPeriod) {
            nextReportDueDate = nextMudarabahPeriod.due_date;
          }
        }

        return {
          ...h,
          received_so_far: Math.round(received * 100) / 100,
          next_payment_amount: nextUnpaid ? Number(nextUnpaid.amount) : null,
          next_payment_due_date: nextUnpaid ? nextUnpaid.payout_periods?.due_date : null,
          next_report_due_date: nextReportDueDate,
        };
      });
    } catch (repErr) {
      console.warn("Could not load repayments for holdings:", repErr);
    }
  }

  return {
    investorClass,
    holdings,
    pledges,
  };
}

export async function getInvestorMilestonesPageData() {
  const investor = await getInvestorPortalData();
  if (!investor?.id) {
    return { investor, heldProjects: [] };
  }

  const investorId = investor.id;

  // 1. Fetch all pledges for investor with joined projects data
  const { data: pledgesData, error: pledgesErr } = await supabaseAdmin
    .from("pledges")
    .select(`
      *,
      projects (
        id,
        title,
        slug,
        unit_type,
        sharia_contract_type,
        currency,
        target_goal,
        status,
        spv_details (*)
      )
    `)
    .eq("investor_id", investorId)
    .order("pledged_at", { ascending: false });

  if (pledgesErr) {
    console.error("Error fetching investor pledges for milestones:", pledgesErr);
  }

  const validPledges = (pledgesData || []).filter(
    (p) => !["cancelled", "refunded", "rejected_oversubscribed"].includes((p.status || "").toLowerCase())
  );

  // 2. Group pledges by project ID
  const projectMap = new Map();
  validPledges.forEach((p) => {
    const proj = p.projects;
    if (!proj) return;

    const existing = projectMap.get(proj.id) || {
      id: proj.id,
      title: proj.title,
      slug: proj.slug,
      category: proj.spv_details?.asset_class || proj.unit_type || "Investment Asset",
      currency: proj.currency || "AED",
      holdingAmount: 0,
      pledgesCount: 0,
      milestones: [],
    };

    existing.holdingAmount += Number(p.allocated_amount || p.pledged_amount || 0);
    existing.pledgesCount += 1;
    projectMap.set(proj.id, existing);
  });

  const heldProjectIds = Array.from(projectMap.keys());

  // 3. Fetch milestones for all held projects
  if (heldProjectIds.length > 0) {
    const { data: milestonesData, error: msErr } = await supabaseAdmin
      .from("project_milestones")
      .select("*")
      .in("project_id", heldProjectIds)
      .order("target_date", { ascending: true });

    if (msErr) {
      console.error("Error fetching project milestones:", msErr);
    }

    (milestonesData || []).forEach((m) => {
      const rawStatus =
        m.mileston_verification_status ??
        m.milestone_verification_status ??
        m.verification_status;
      const vStatus = rawStatus ? String(rawStatus).trim().toLowerCase() : null;

      // Investor visibility filter: exclude pending or rejected issuer milestones
      if (m.milestone_source !== "system" && (vStatus === "pending" || vStatus === "rejected")) {
        return;
      }

      const projObj = projectMap.get(m.project_id);
      if (projObj) {
        projObj.milestones.push(m);
      }
    });
  }

  const heldProjects = Array.from(projectMap.values());

  return {
    investor,
    heldProjects,
  };
}

export async function getInvestorPortfolioPledges() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized", pledges: [] };
    }

    let investor = null;

    if (orgId) {
      const { data: instData } = await supabaseAdmin
        .from("investors")
        .select("id, investor_class")
        .eq("org_id", orgId)
        .maybeSingle();
      if (instData) investor = instData;
    }

    if (!investor) {
      const { data: indData } = await supabaseAdmin
        .from("investors")
        .select("id, investor_class")
        .eq("user_id", userId)
        .maybeSingle();
      if (indData) investor = indData;
    }

    if (!investor?.id) {
      return { success: true, pledges: [], repayments: [], periods: [] };
    }

    // Resolve internal integer primary key (investors.id is int8/bigint)
    const investorId = investor.id;

    const { data: pledgesData, error: pledgesError } = await supabaseAdmin
      .from("pledges")
      .select(`
        id,
        status,
        pledged_amount,
        allocated_amount,
        allocated_units,
        allocated_at,
        pledged_at,
        conversion_eligible_units,
        investor_class_at_pledge,
        project_id,
        projects (
          id,
          title,
          slug,
          sharia_contract_type,
          currency,
          status
        )
      `)
      .eq("investor_id", investorId)
      .order("pledged_at", { ascending: false });

    if (pledgesError) {
      console.error("Error fetching portfolio pledges:", pledgesError);
      return { success: false, error: "Database error", pledges: [], repayments: [], periods: [] };
    }

    // Fetch investor's repayment records joined with payout_periods and projects
    const { data: repaymentsData, error: repError } = await supabaseAdmin
      .from("repayments")
      .select(`
        id,
        payout_period_id,
        pledge_id,
        investor_id,
        type,
        amount,
        status,
        paid_at,
        payment_reference,
        bank_last4,
        failure_reason,
        payout_periods (
          id,
          project_id,
          period_no,
          kind,
          due_date,
          status,
          is_final,
          reported_amount,
          capital_return_percent,
          projects (
            id,
            title,
            slug,
            sharia_contract_type,
            currency,
            status
          )
        )
      `)
      .eq("investor_id", investorId)
      .order("paid_at", { ascending: true, nullsFirst: false });

    if (repError) {
      console.error("Error fetching investor repayments:", repError);
    }

    // Normalize repayments to expose due_date and sharia_contract_type directly
    const normalizedRepayments = (repaymentsData || []).map((r) => ({
      ...r,
      due_date: r.payout_periods?.due_date || r.paid_at,
      sharia_contract_type: r.payout_periods?.projects?.sharia_contract_type,
      project: r.payout_periods?.projects || null,
    }));

    // Fetch payout periods for projects the investor has allocated or active holdings in
    const heldProjectIds = Array.from(
      new Set(
        (pledgesData || [])
          .filter(
            (p) =>
              p.status === "allocated" ||
              p.status === "active" ||
              p.status === "completed"
          )
          .map((p) => p.project_id)
          .filter(Boolean)
      )
    );

    let periodsData = [];
    if (heldProjectIds.length > 0) {
      const { data: pData, error: pErr } = await supabaseAdmin
        .from("payout_periods")
        .select(`
          id,
          project_id,
          period_no,
          kind,
          due_date,
          status,
          is_final,
          reported_amount,
          capital_return_percent,
          projects (
            id,
            title,
            slug,
            sharia_contract_type,
            currency,
            status
          )
        `)
        .in("project_id", heldProjectIds)
        .order("due_date", { ascending: true });

      if (pErr) {
        console.error("Error fetching payout periods:", pErr);
      } else {
        periodsData = pData || [];
      }
    }

    return {
      success: true,
      pledges: pledgesData || [],
      repayments: normalizedRepayments,
      periods: periodsData,
    };
  } catch (err) {
    console.error("Unexpected error in getInvestorPortfolioPledges:", err);
    return { success: false, error: "Server error", pledges: [], repayments: [], periods: [] };
  }
}

/**
 * Fetches all official documents for the current investor.
 * Inspects the `shariah_certificates` storage bucket (stored by pledge_id folder)
 * as well as associated `pledge_docs` records.
 */
export async function getInvestorDocuments() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized", documents: [] };
    }

    let investor = null;
    if (orgId) {
      const { data: instData } = await supabaseAdmin
        .from("investors")
        .select("id, type, org_id, user_id")
        .eq("org_id", orgId)
        .maybeSingle();
      if (instData) investor = instData;
    }

    if (!investor) {
      const { data: indData } = await supabaseAdmin
        .from("investors")
        .select("id, type, org_id, user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (indData) investor = indData;
    }

    if (!investor?.id) {
      return { success: true, documents: [] };
    }

    const investorId = investor.id;

    // 1. Fetch all pledges for this investor with their project and pledge_docs
    const { data: pledges, error: pledgesErr } = await supabaseAdmin
      .from("pledges")
      .select(`
        id,
        status,
        pledged_amount,
        allocated_amount,
        allocated_units,
        pledged_at,
        allocated_at,
        conversion_eligible_units,
        projects (
          id,
          title,
          slug,
          unit_type,
          sharia_contract_type,
          is_spv,
          unit_price,
          currency,
          expected_roi_percent,
          tenor_months
        ),
        pledge_docs (
          id,
          doc_type,
          file_url,
          created_at,
          terms_version
        )
      `)
      .eq("investor_id", investorId)
      .order("id", { ascending: false });

    if (pledgesErr) {
      console.error("Error fetching investor pledges for documents:", pledgesErr);
      return { success: false, error: "Database error", documents: [] };
    }

    if (!pledges || pledges.length === 0) {
      return { success: true, documents: [] };
    }

    const documents = [];

    // 2. Check each pledge for files in the storage bucket 'shariah_certificates'
    await Promise.all(
      pledges.map(async (pledge) => {
        const project = Array.isArray(pledge.projects)
          ? pledge.projects[0]
          : pledge.projects;
        const pledgeIdStr = String(pledge.id);

        try {
          const { data: storageFiles, error: listErr } = await supabaseAdmin
            .storage
            .from("shariah_certificates")
            .list(pledgeIdStr);

          if (!listErr && storageFiles && storageFiles.length > 0) {
            for (const file of storageFiles) {
              if (
                !file.name ||
                file.name.startsWith(".") ||
                file.name === ".emptyFolderPlaceholder"
              ) {
                continue;
              }

              const filePath = `${pledgeIdStr}/${file.name}`;
              const { data: signedData } = await supabaseAdmin
                .storage
                .from("shariah_certificates")
                .createSignedUrl(filePath, 7200);

              const formattedContract =
                project?.sharia_contract_type
                  ? project.sharia_contract_type.charAt(0).toUpperCase() +
                    project.sharia_contract_type.slice(1).replace("_", " ")
                  : "Murabaha";

              documents.push({
                id: `shariah_cert_${pledge.id}_${file.name}`,
                category: "shariah_certificates",
                category_label: "Shariah Certificate",
                doc_type: "sukuk_certificate",
                title: `${project?.title || "Investment"} — Sukuk Certificate`,
                file_name: file.name,
                file_size: file.metadata?.size || null,
                file_type: file.metadata?.mimetype || "application/pdf",
                url: signedData?.signedUrl || null,
                file_path: filePath,
                bucket: "shariah_certificates",
                created_at: file.created_at || pledge.allocated_at || pledge.pledged_at,
                pledge_details: {
                  pledge_id: pledge.id,
                  project_title: project?.title || "Project",
                  project_slug: project?.slug || "",
                  sharia_contract_type: formattedContract,
                  unit_type: project?.unit_type || "Sukuk unit",
                  currency: project?.currency || "AED",
                  pledged_amount: Number(pledge.pledged_amount || 0),
                  allocated_amount: Number(pledge.allocated_amount || pledge.pledged_amount || 0),
                  allocated_units:
                    pledge.allocated_units != null
                      ? Number(pledge.allocated_units)
                      : null,
                  unit_price: Number(project?.unit_price || 0),
                  expected_roi_percent:
                    project?.expected_roi_percent != null
                      ? Number(project.expected_roi_percent)
                      : null,
                  tenor_months: project?.tenor_months || null,
                  status: pledge.status,
                  pledged_at: pledge.pledged_at,
                  allocated_at: pledge.allocated_at,
                },
              });
            }
          }
        } catch (storageErr) {
          console.error(
            `Error listing shariah_certificates for pledge ${pledge.id}:`,
            storageErr
          );
        }

        // Also check any existing non-certificate docs in pledge_docs if present
        for (const pDoc of pledge.pledge_docs || []) {
          if (pDoc.doc_type === "subscription_agreement" && pDoc.file_url) {
            documents.push({
              id: `sub_agree_${pDoc.id}`,
              category: "subscription_agreements",
              category_label: "Subscription Agreement",
              doc_type: "subscription_agreement",
              title: `${project?.title || "Investment"} — Subscription Agreement`,
              file_name: "subscription_agreement.pdf",
              file_size: null,
              file_type: "application/pdf",
              url: pDoc.file_url,
              file_path: pDoc.file_url,
              bucket: null,
              created_at: pDoc.created_at || pledge.pledged_at,
              pledge_details: {
                pledge_id: pledge.id,
                project_title: project?.title || "Project",
                project_slug: project?.slug || "",
                sharia_contract_type: project?.sharia_contract_type || "Murabaha",
                unit_type: project?.unit_type || "Sukuk unit",
                currency: project?.currency || "AED",
                pledged_amount: Number(pledge.pledged_amount || 0),
                allocated_amount: Number(pledge.allocated_amount || pledge.pledged_amount || 0),
                allocated_units:
                  pledge.allocated_units != null
                    ? Number(pledge.allocated_units)
                    : null,
                unit_price: Number(project?.unit_price || 0),
                expected_roi_percent:
                  project?.expected_roi_percent != null
                    ? Number(project.expected_roi_percent)
                    : null,
                tenor_months: project?.tenor_months || null,
                status: pledge.status,
                pledged_at: pledge.pledged_at,
                allocated_at: pledge.allocated_at,
              },
            });
          }
        }
      })
    );

    // Sort latest first
    documents.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return { success: true, documents };
  } catch (err) {
    console.error("Unexpected error in getInvestorDocuments:", err);
    return { success: false, error: "Server error", documents: [] };
  }
}

/**
 * Generates a fresh signed download URL for an authorized investor document.
 */
export async function getDocumentSignedUrl(bucket, filePath) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const parts = String(filePath || "").split("/");
    const pledgeIdNum = parseInt(parts[0], 10);

    if (isNaN(pledgeIdNum)) {
      throw new Error("Invalid document path");
    }

    let investor = null;
    if (orgId) {
      const { data } = await supabaseAdmin
        .from("investors")
        .select("id")
        .eq("org_id", orgId)
        .maybeSingle();
      if (data) investor = data;
    }
    if (!investor) {
      const { data } = await supabaseAdmin
        .from("investors")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) investor = data;
    }
    if (!investor?.id) throw new Error("Investor record not found");

    const { data: pledge } = await supabaseAdmin
      .from("pledges")
      .select("id")
      .eq("id", pledgeIdNum)
      .eq("investor_id", investor.id)
      .maybeSingle();

    if (!pledge) {
      throw new Error("Unauthorized: Document does not belong to this investor account");
    }

    const { data: signedData, error: signErr } = await supabaseAdmin
      .storage
      .from(bucket || "shariah_certificates")
      .createSignedUrl(filePath, 7200);

    if (signErr || !signedData?.signedUrl) {
      throw new Error("Failed to generate secure URL");
    }

    return { success: true, signedUrl: signedData.signedUrl };
  } catch (err) {
    console.error("Error in getDocumentSignedUrl:", err);
    return {
      success: false,
      error: err?.message || "Failed to generate document link",
    };
  }
}


