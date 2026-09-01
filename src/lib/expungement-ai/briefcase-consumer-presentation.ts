import "server-only";

import {
  decorateBriefcaseItemForPresentation,
  type BriefcasePresentationItem
} from "@/lib/expungement-ai/briefcase-presentation-authority";
import { createConsumerPaymentReceiptAction } from "@/lib/expungement-ai/consumer-payment-receipt";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";

/**
 * Adds consumer-commerce presentation to the legal/artifact presentation.
 * Receipt authority stays separate and is never required for a sponsored or
 * unpaid matter.
 */
export async function decorateConsumerBriefcaseItemForPresentation(input: {
  consumerAuthUserId: string;
  item: ConsumerBriefcaseItem;
}): Promise<BriefcasePresentationItem> {
  const item = await decorateBriefcaseItemForPresentation(input);
  if (item.paymentState !== "paid") return item;
  const paymentReceipt = await createConsumerPaymentReceiptAction({
    consumerAuthUserId: input.consumerAuthUserId,
    briefcaseItemId: input.item.id
  });
  return paymentReceipt ? { ...item, paymentReceipt } : item;
}

export async function decorateConsumerBriefcaseItemsForPresentation(input: {
  consumerAuthUserId: string;
  items: ConsumerBriefcaseItem[];
}): Promise<BriefcasePresentationItem[]> {
  return Promise.all(input.items.map((item) => decorateConsumerBriefcaseItemForPresentation({
    consumerAuthUserId: input.consumerAuthUserId,
    item
  })));
}
