import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function isAuthorized(request) {
  // In development, allow local internal test invocations
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { action = "seed", clerkUserId, investorId: rawInvestorId } = body;

    // ----------------------------------------------------------------------
    // ACTION: CLEANUP
    // ----------------------------------------------------------------------
    if (action === "cleanup") {
      // 1. Delete notifications
      await supabaseAdmin
        .from("notifications")
        .delete()
        .filter(
          "project_id",
          "in",
          `(SELECT id FROM projects WHERE slug LIKE 'test-portfolio-%')`
        );

      // 2. Delete test pledges
      const { data: testProjects } = await supabaseAdmin
        .from("projects")
        .select("id")
        .like("slug", "test-portfolio-%");

      const testProjectIds = (testProjects || []).map((p) => p.id);

      let deletedPledgesCount = 0;
      if (testProjectIds.length > 0) {
        const { data: delP } = await supabaseAdmin
          .from("pledges")
          .delete()
          .in("project_id", testProjectIds)
          .select("id");
        deletedPledgesCount = (delP || []).length;
      }

      // 3. Delete test projects
      const { data: delPr } = await supabaseAdmin
        .from("projects")
        .delete()
        .like("slug", "test-portfolio-%")
        .select("id");

      return NextResponse.json({
        ok: true,
        action: "cleanup",
        deletedProjects: (delPr || []).length,
        deletedPledges: deletedPledgesCount,
        message: "Successfully cleaned up all test-portfolio-* campaigns and pledges.",
      });
    }

    // ----------------------------------------------------------------------
    // ACTION: SEED
    // ----------------------------------------------------------------------
    // 1. Resolve Investor ID (int8) - dynamically selects the latest investor
    let targetInvestorId = rawInvestorId ? Number(rawInvestorId) : null;

    if (!targetInvestorId && clerkUserId) {
      const { data: inv } = await supabaseAdmin
        .from("investors")
        .select("id")
        .eq("user_id", clerkUserId)
        .maybeSingle();
      if (inv) targetInvestorId = Number(inv.id);
    }

    if (!targetInvestorId) {
      // Dynamically select the latest registered investor in public.investors
      const { data: latestInv } = await supabaseAdmin
        .from("investors")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestInv) {
        targetInvestorId = Number(latestInv.id);
      }
    }

    if (!targetInvestorId) {
      return NextResponse.json(
        { ok: false, error: "No investor record found in public.investors." },
        { status: 404 }
      );
    }

    // 2. Resolve an Issuer ID to own the test campaigns
    const { data: issuer } = await supabaseAdmin
      .from("issuers")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!issuer) {
      return NextResponse.json(
        { ok: false, error: "No issuer found in public.issuers." },
        { status: 404 }
      );
    }

    // 3. Clean up previous test-portfolio-* rows first
    const { data: existingProjects } = await supabaseAdmin
      .from("projects")
      .select("id")
      .like("slug", "test-portfolio-%");

    const existingProjectIds = (existingProjects || []).map((p) => p.id);
    if (existingProjectIds.length > 0) {
      await supabaseAdmin.from("pledges").delete().in("project_id", existingProjectIds);
      await supabaseAdmin.from("projects").delete().in("id", existingProjectIds);
    }

    // 4. Create 12 Campaigns
    const projectDefs = [
      {
        issuer_id: issuer.id,
        title: "Al-Noor Cold-Chain Logistics Hub",
        slug: "test-portfolio-logistics-hub",
        unit_type: "debt_unit",
        sharia_contract_type: "murabaha",
        unit_price: 1000,
        currency: "AED",
        target_goal: 1000000,
        hard_cap: 1500000,
        status: "funded",
        is_spv: false,
      },
      {
        issuer_id: issuer.id,
        title: "Desert Sun Industrial Solar Park",
        slug: "test-portfolio-solar-grid",
        unit_type: "lease_unit",
        sharia_contract_type: "ijara",
        unit_price: 500,
        currency: "AED",
        target_goal: 800000,
        hard_cap: 1200000,
        status: "funded",
        is_spv: false,
      },
      {
        issuer_id: issuer.id,
        title: "QistPay GCC Embedded Credit Engine",
        slug: "test-portfolio-fintech-seed",
        unit_type: "equity_share",
        sharia_contract_type: "spv_equity",
        unit_price: 100,
        currency: "AED",
        target_goal: 500000,
        hard_cap: 750000,
        status: "funded",
        is_spv: true,
      },
      {
        issuer_id: issuer.id,
        title: "Barakah Hydroponic Vertical Farm",
        slug: "test-portfolio-agritech-farm",
        unit_type: "profit_share",
        sharia_contract_type: "mudarabah",
        unit_price: 250,
        currency: "AED",
        target_goal: 400000,
        hard_cap: 600000,
        status: "funded",
        is_spv: false,
      },
      {
        issuer_id: issuer.id,
        title: "Al-Shifa Community Medical Center",
        slug: "test-portfolio-healthcare-clinic",
        unit_type: "debt_unit",
        sharia_contract_type: "murabaha",
        unit_price: 1000,
        currency: "AED",
        target_goal: 600000,
        hard_cap: 900000,
        status: "funded",
        is_spv: false,
      },
      {
        issuer_id: issuer.id,
        title: "Madina Boulevard Retail Promenade",
        slug: "test-portfolio-retail-plaza",
        unit_type: "lease_unit",
        sharia_contract_type: "ijara",
        unit_price: 500,
        currency: "AED",
        target_goal: 500000,
        hard_cap: 750000,
        status: "funded",
        is_spv: false,
      },
      {
        issuer_id: issuer.id,
        title: "FalconShield Sovereign Cyber Defense",
        slug: "test-portfolio-cybersecurity-saas",
        unit_type: "equity_share",
        sharia_contract_type: "spv_equity",
        unit_price: 100,
        currency: "AED",
        target_goal: 300000,
        hard_cap: 450000,
        status: "funded",
        is_spv: true,
      },
      {
        issuer_id: issuer.id,
        title: "OmniHub Automated Fulfillment Center",
        slug: "test-portfolio-smart-warehousing",
        unit_type: "debt_unit",
        sharia_contract_type: "murabaha",
        unit_price: 500,
        currency: "AED",
        target_goal: 400000,
        hard_cap: 600000,
        status: "funded",
        is_spv: false,
      },
      {
        issuer_id: issuer.id,
        title: "Hikmah STEM Virtual Academy",
        slug: "test-portfolio-education-academy",
        unit_type: "profit_share",
        sharia_contract_type: "mudarabah",
        unit_price: 200,
        currency: "AED",
        target_goal: 250000,
        hard_cap: 350000,
        status: "funded",
        is_spv: false,
      },
      {
        issuer_id: issuer.id,
        title: "EcoTransit Fleet Electrification",
        slug: "test-portfolio-green-mobility",
        unit_type: "debt_unit",
        sharia_contract_type: "murabaha",
        unit_price: 250,
        currency: "AED",
        target_goal: 500000,
        hard_cap: 750000,
        status: "campaign_live",
        is_spv: false,
      },
      {
        issuer_id: issuer.id,
        title: "Jebel Ali Automated Cold Storage",
        slug: "test-portfolio-cold-storage",
        unit_type: "lease_unit",
        sharia_contract_type: "ijara",
        unit_price: 500,
        currency: "AED",
        target_goal: 300000,
        hard_cap: 450000,
        status: "funded",
        is_spv: false,
      },
      {
        issuer_id: issuer.id,
        title: "Neom Autonomous Delivery Drones",
        slug: "test-portfolio-ai-robotics",
        unit_type: "equity_share",
        sharia_contract_type: "spv_equity",
        unit_price: 100,
        currency: "AED",
        target_goal: 800000,
        hard_cap: 1200000,
        status: "failed",
        is_spv: true,
        failure_reason: "soft_cap_not_met",
      },
    ];

    const { data: createdProjects, error: prErr } = await supabaseAdmin
      .from("projects")
      .insert(projectDefs)
      .select("id, slug");

    if (prErr) throw prErr;

    const pMap = {};
    for (const pr of createdProjects) {
      pMap[pr.slug] = pr.id;
    }

    // 5. Create 12 Pledges
    const pledgeDefs = [
      {
        project_id: pMap["test-portfolio-logistics-hub"],
        investor_id: targetInvestorId,
        status: "allocated",
        pledged_amount: 45000,
        allocated_amount: 45000,
        pledged_units: 45,
        allocated_units: 45,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 225,
        payment_status: "completed",
        pledged_at: "2026-01-10T09:00:00Z",
        allocated_at: "2026-01-15T10:00:00Z",
        created_at: "2026-01-10T09:00:00Z",
      },
      {
        project_id: pMap["test-portfolio-solar-grid"],
        investor_id: targetInvestorId,
        status: "allocated",
        pledged_amount: 35000,
        allocated_amount: 35000,
        pledged_units: 70,
        allocated_units: 70,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 175,
        payment_status: "completed",
        pledged_at: "2026-02-05T11:00:00Z",
        allocated_at: "2026-02-10T11:00:00Z",
        created_at: "2026-02-05T11:00:00Z",
      },
      {
        project_id: pMap["test-portfolio-fintech-seed"],
        investor_id: targetInvestorId,
        status: "allocated",
        pledged_amount: 25000,
        allocated_amount: 25000,
        pledged_units: 250,
        allocated_units: 250,
        conversion_eligible_units: 250,
        requested_conversion_units: 250,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 125,
        payment_status: "completed",
        pledged_at: "2026-02-15T13:00:00Z",
        allocated_at: "2026-02-20T14:00:00Z",
        created_at: "2026-02-15T13:00:00Z",
      },
      {
        project_id: pMap["test-portfolio-agritech-farm"],
        investor_id: targetInvestorId,
        status: "allocated",
        pledged_amount: 20000,
        allocated_amount: 20000,
        pledged_units: 80,
        allocated_units: 80,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 100,
        payment_status: "completed",
        pledged_at: "2026-04-01T08:30:00Z",
        allocated_at: "2026-04-05T09:00:00Z",
        created_at: "2026-04-01T08:30:00Z",
      },
      {
        project_id: pMap["test-portfolio-healthcare-clinic"],
        investor_id: targetInvestorId,
        status: "allocated",
        pledged_amount: 20000,
        allocated_amount: 20000,
        pledged_units: 20,
        allocated_units: 20,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 100,
        payment_status: "completed",
        pledged_at: "2026-04-12T15:00:00Z",
        allocated_at: "2026-04-18T16:00:00Z",
        created_at: "2026-04-12T15:00:00Z",
      },
      {
        project_id: pMap["test-portfolio-retail-plaza"],
        investor_id: targetInvestorId,
        status: "allocated",
        pledged_amount: 15000,
        allocated_amount: 15000,
        pledged_units: 30,
        allocated_units: 30,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 75,
        payment_status: "completed",
        pledged_at: "2026-05-28T10:00:00Z",
        allocated_at: "2026-06-01T12:00:00Z",
        created_at: "2026-05-28T10:00:00Z",
      },
      {
        project_id: pMap["test-portfolio-cybersecurity-saas"],
        investor_id: targetInvestorId,
        status: "allocated",
        pledged_amount: 10000,
        allocated_amount: 10000,
        pledged_units: 100,
        allocated_units: 100,
        conversion_eligible_units: 100,
        requested_conversion_units: 100,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 50,
        payment_status: "completed",
        pledged_at: "2026-06-08T14:00:00Z",
        allocated_at: "2026-06-12T10:00:00Z",
        created_at: "2026-06-08T14:00:00Z",
      },
      {
        project_id: pMap["test-portfolio-smart-warehousing"],
        investor_id: targetInvestorId,
        status: "allocated",
        pledged_amount: 10000,
        allocated_amount: 5000,
        refunded_amount: 5000,
        pledged_units: 20,
        allocated_units: 10,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 50,
        payment_status: "completed",
        pledged_at: "2026-06-15T09:00:00Z",
        allocated_at: "2026-06-25T15:00:00Z",
        created_at: "2026-06-15T09:00:00Z",
      },
      {
        project_id: pMap["test-portfolio-education-academy"],
        investor_id: targetInvestorId,
        status: "allocated",
        pledged_amount: 5000,
        allocated_amount: 5000,
        pledged_units: 25,
        allocated_units: 25,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 25,
        payment_status: "completed",
        pledged_at: "2026-06-20T11:30:00Z",
        allocated_at: "2026-06-30T17:00:00Z",
        created_at: "2026-06-20T11:30:00Z",
      },
      {
        project_id: pMap["test-portfolio-green-mobility"],
        investor_id: targetInvestorId,
        status: "pending",
        pledged_amount: 15000,
        allocated_amount: null,
        pledged_units: 60,
        allocated_units: null,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 75,
        payment_status: "completed",
        pledged_at: "2026-07-05T10:00:00Z",
        created_at: "2026-07-05T10:00:00Z",
      },
      {
        project_id: pMap["test-portfolio-cold-storage"],
        investor_id: targetInvestorId,
        status: "rejected_oversubscribed",
        pledged_amount: 10000,
        allocated_amount: 0,
        refunded_amount: 10000,
        pledged_units: 20,
        allocated_units: 0,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 50,
        payment_status: "completed",
        pledged_at: "2026-05-10T12:00:00Z",
        created_at: "2026-05-10T12:00:00Z",
      },
      {
        project_id: pMap["test-portfolio-ai-robotics"],
        investor_id: targetInvestorId,
        status: "refunded",
        pledged_amount: 10000,
        allocated_amount: 0,
        refunded_amount: 10000,
        pledged_units: 100,
        allocated_units: 0,
        investor_class_at_pledge: 1,
        fee_percent_at_pledge: 0.5,
        fee_amount: 50,
        payment_status: "completed",
        pledged_at: "2026-04-20T16:00:00Z",
        created_at: "2026-04-20T16:00:00Z",
      },
    ];

    const { error: plErr } = await supabaseAdmin.from("pledges").insert(pledgeDefs);
    if (plErr) throw plErr;

    return NextResponse.json({
      ok: true,
      action: "seed",
      investorId: targetInvestorId,
      message: "Seeded 12 test projects and 12 pledges successfully.",
      expectedMetrics: {
        totalInvested: 180000,
        awaitingAllocation: 15000,
        holdingsCount: 9,
        largestHoldingPercent: 25.0,
        contractDistribution: {
          Murabaha: { amount: 70000, pct: 38.9 },
          Ijara: { amount: 50000, pct: 27.8 },
          SPV_Equity: { amount: 35000, pct: 19.4 },
          Mudarabah: { amount: 25000, pct: 13.9 },
        },
        pledgeOutcomes: {
          fullyAllocated: 8,
          partlyAllocated: 1,
          notAllocated: 1,
          refunded: 1,
        },
        conversionExposure: {
          totalReservedUnits: 350,
          projectsCount: 2,
        },
      },
    });
  } catch (error) {
    console.error("Error in test-portfolio route:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
