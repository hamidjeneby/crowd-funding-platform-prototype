export const MAX_OVERSUBSCRIPTION_PERCENT = 150;

export const PLEDGE_TERMS_VERSION = "v1.0";

export const PLEDGE_TERMS_CHECKBOX_LABEL =
  "I understand this pledge is a conditional request that will be allocated at campaign close. If not allocated, funds and fee are returned to my wallet. I've read and accept the subscription terms.";

export const PLEDGE_DISCLOSURES = {
  title: "How your pledge works",
  items: [
    "Your pledge is a request to invest, not a guaranteed allocation.",
    "Allocation happens when the campaign closes. If the campaign is oversubscribed, pledges are allocated by investor class first (Class 1 has priority), then by pledge amount, then by time of pledge.",
    "Your pledge may be filled in full, in part, or not at all.",
    "If your pledge isn't allocated, or the campaign doesn't reach its minimum, the full amount and your fee are returned to your wallet.",
    "If your pledge is only partly filled, the unallocated amount is returned to your wallet. The fee isn't refunded.",
  ],
  conversionItem:
    "Conversion units shown are the most you could receive. Final conversion units are set at allocation and depend on the shared conversion pool.",
  acceptanceCheckbox: PLEDGE_TERMS_CHECKBOX_LABEL,
  map(fn) {
    return (this.items || []).map(fn);
  },
  [Symbol.iterator]() {
    return (this.items || [])[Symbol.iterator]();
  },
};

