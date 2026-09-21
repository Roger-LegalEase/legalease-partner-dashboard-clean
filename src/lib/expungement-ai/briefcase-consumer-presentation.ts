import "server-only";

import { decorateBriefcaseItemForPresentation, type BriefcasePresentationItem } from "@/lib/expungement-ai/briefcase-presentation-authority";
import { readConsumerPaymentHistory, type ConsumerPaymentHistory } from "@/lib/expungement-ai/consumer-payment-receipt";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";

export type ConsumerPaymentHistoryItem = BriefcasePresentationItem & {
  paymentHistory: ConsumerPaymentHistory | null;
};

/** Financial history is independent of current legal, generation and artifact authority. */
export async function decorateConsumerBriefcaseItemForPresentation(input: {
  consumerAuthUserId: string;
  item: ConsumerBriefcaseItem;
}): Promise<ConsumerPaymentHistoryItem> {
  const item = await decorateBriefcaseItemForPresentation(input);
  const paymentHistory = await readConsumerPaymentHistory({
    consumerAuthUserId: input.consumerAuthUserId, briefcaseItemId: input.item.id
  }).catch(() => null);
  return { ...item, paymentHistory };
}

export async function decorateConsumerBriefcaseItemsForPresentation(input: {
  consumerAuthUserId: string;
  items: ConsumerBriefcaseItem[];
}): Promise<ConsumerPaymentHistoryItem[]> {
  return Promise.all(input.items.map(item => decorateConsumerBriefcaseItemForPresentation({
    consumerAuthUserId: input.consumerAuthUserId, item
  })));
}
