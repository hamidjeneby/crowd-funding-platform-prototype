import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  checkInvestEligibility,
  getProjectDetailBySlug,
  parseInvestorClass,
} from "@/app/actions/marketplace";
import {
  executeCreatePledgeForInvestor,
  reverseWalletDebit,
} from "@/lib/pledgeCreateCore";
import { mapPledgeInsertError } from "@/lib/pledgeLimits";
import { generateWalletReferenceCode } from "@/lib/wallet";

function verifySecret(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      action = "pledge",
      investorId,
      slug: rawSlug,
      projectSlug,
      projectId,
      amount = 200,
      bypassEligibilityCheck = false,
      simulateDebitBeforeInsert = false,
    } = body || {};
    const slug = rawSlug || projectSlug;

    if (!investorId) {
      return NextResponse.json(
        { ok: false, error: "investorId is required" },
        { status: 400 }
      );
    }

    const { data: investorData, error: invErr } = await supabaseAdmin
      .from("investors")
      .select("*")
      .eq("id", Number(investorId))
      .maybeSingle();

    if (invErr || !investorData) {
      return NextResponse.json(
        { ok: false, error: `Investor ${investorId} not found` },
        { status: 404 }
      );
    }

    const classNum = await parseInvestorClass(investorData.investor_class);

    if (action === "check") {
      const projectDetail = await getProjectDetailBySlug(
        slug,
        classNum,
        investorData.id
      );
      const eligibility = await checkInvestEligibility(
        projectDetail,
        classNum,
        investorData.id
      );
      return NextResponse.json({
        ok: true,
        action: "check",
        investor_id: investorData.id,
        investor_class: classNum,
        wallet_balance: Number(investorData.wallet_balance || 0),
        eligibility: {
          allowed: eligibility.allowed,
          code: eligibility.code,
          message: eligibility.message,
        },
      });
    }

    // Optional Test 11 mode: simulate debit-before-insert hitting the unique index,
    // then reversing the debit and writing a refund_credit row into wallet_transactions.
    if (simulateDebitBeforeInsert) {
      const projectDetail = await getProjectDetailBySlug(
        slug,
        classNum,
        investorData.id
      );
      if (!projectDetail) {
        return NextResponse.json(
          { ok: false, error: "Project not found or not visible" },
          { status: 404 }
        );
      }

      const numericAmount = Number(amount) || 200;
      const feePercent = classNum === 10 ? 2.5 : classNum === 9 ? 2.0 : 1.5;
      const feeAmount = (numericAmount * feePercent) / 100;
      const totalDeducted = numericAmount + feeAmount;
      const initialBalance = Number(investorData.wallet_balance || 0);
      const debitedBalance = initialBalance - totalDeducted;

      // 1. Debit wallet and write pledge_debit ledger row
      await supabaseAdmin
        .from("investors")
        .update({ wallet_balance: debitedBalance })
        .eq("id", investorData.id);

      const referenceCode = generateWalletReferenceCode("pledge_debit");
      await supabaseAdmin.from("wallet_transactions").insert({
        investor_id: investorData.id,
        pledge_id: null,
        type: "pledge_debit",
        amount: totalDeducted,
        balance_after: debitedBalance,
        reference_code: referenceCode,
      });

      // 2. Attempt pledge insert (which will fail on the unique index if a pledge already exists)
      const signedAt = new Date().toISOString();
      const { data: insertedPledge, error: insertErr } = await supabaseAdmin
        .from("pledges")
        .insert({
          project_id: projectDetail.id,
          investor_id: investorData.id,
          pledged_amount: numericAmount,
          pledged_units: Math.floor(
            numericAmount / (Number(projectDetail.unit_price) || 100)
          ),
          requested_conversion_units: 0,
          investor_class_at_pledge: classNum,
          fee_percent_at_pledge: feePercent,
          fee_amount: feeAmount,
          status: "pending",
          pledged_at: signedAt,
          payment_status: "completed",
        })
        .select()
        .single();

      if (insertErr) {
        // 3. Reverse the debit and record refund_credit in wallet_transactions
        await reverseWalletDebit({
          investorId: investorData.id,
          pledgeId: null,
          amount: totalDeducted,
          restoredBalance: initialBalance,
          insertRefundLedgerRow: true,
        });

        const mapped = mapPledgeInsertError(insertErr, new Date(signedAt));
        const { data: afterInvestor } = await supabaseAdmin
          .from("investors")
          .select("wallet_balance")
          .eq("id", investorData.id)
          .single();

        return NextResponse.json({
          ok: true,
          result: {
            success: false,
            code: mapped.code,
            message: mapped.message,
            error: mapped.message,
          },
          wallet_balance_before: initialBalance,
          wallet_balance_after: Number(afterInvestor?.wallet_balance || 0),
          debit_reversed: true,
        });
      }

      return NextResponse.json({
        ok: true,
        result: { success: true, pledge: insertedPledge },
      });
    }

    const result = await executeCreatePledgeForInvestor({
      investorData,
      projectId,
      slug,
      amount,
      acceptedTerms: true,
      bypassEligibilityCheck: Boolean(bypassEligibilityCheck),
    });

    const { data: afterInvestor } = await supabaseAdmin
      .from("investors")
      .select("wallet_balance")
      .eq("id", investorData.id)
      .single();

    return NextResponse.json({
      ok: true,
      investor_id: investorData.id,
      investor_class: classNum,
      wallet_balance_before: Number(investorData.wallet_balance || 0),
      wallet_balance_after: Number(afterInvestor?.wallet_balance || 0),
      result,
    });
  } catch (err) {
    console.error("[test-pledge] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
