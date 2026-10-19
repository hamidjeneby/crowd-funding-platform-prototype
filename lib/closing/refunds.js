/**
 * Pure refund calculation over plain objects (no DB calls).
 *
 * Refund rules (Decisions 1, 4, 5):
 * - Campaign failed or late pledge (status === 'refunded'):
 *     refunded_amount = pledged_amount + fee_amount (full refund including fee)
 * - Not allocated at all on a funded campaign (status === 'rejected_oversubscribed' or allocated_amount === 0):
 *     refunded_amount = pledged_amount + fee_amount (full refund including fee)
 * - Partial fill (including rounding remainder) on a funded campaign (0 < allocated_amount < pledged_amount):
 *     refunded_amount = pledged_amount - allocated_amount (unallocated principal only; fee is NOT refunded)
 * - Full fill (allocated_amount === pledged_amount):
 *     refunded_amount = 0 (fee is NOT refunded)
 */
export function computeRefunds(pledges = [], projectStatus = "funded") {
  const isFailed = projectStatus === "failed";

  return pledges.map((p) => {
    const pledgedAmount = Number(p.pledged_amount) || 0;
    const feeAmount = Number(p.fee_amount) || 0;
    const allocatedAmount = isFailed ? 0 : Number(p.allocated_amount) || 0;

    let refundedAmount = 0;
    let feeRefunded = false;

    if (
      isFailed ||
      p.status === "refunded" ||
      p.status === "rejected_oversubscribed" ||
      allocatedAmount <= 0
    ) {
      refundedAmount = pledgedAmount + feeAmount;
      feeRefunded = true;
    } else if (allocatedAmount < pledgedAmount) {
      refundedAmount = pledgedAmount - allocatedAmount;
      feeRefunded = false;
    } else {
      refundedAmount = 0;
      feeRefunded = false;
    }

    // Round to 2 decimal places to avoid floating-point drift on currency amounts
    refundedAmount = Math.round(refundedAmount * 100) / 100;

    return {
      ...p,
      refunded_amount: refundedAmount,
      fee_refunded: feeRefunded,
    };
  });
}
