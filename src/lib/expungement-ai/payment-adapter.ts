import "server-only";

import type { ExpungementAiEligibilityResult } from "@/lib/expungement-ai/types";
import { isConsumerPaymentAllowed } from "@/lib/expungement-ai/eligibility-adapter";

export type ConsumerPaymentIntent = {
  enabled: boolean;
  amountCents?: 5000;
  label: string;
};

export function createConsumerPaymentPlaceholder(result: ExpungementAiEligibilityResult): ConsumerPaymentIntent {
  const enabled = isConsumerPaymentAllowed(result.resultCode, result.paymentAllowed);

  return {
    enabled,
    amountCents: enabled ? 5000 : undefined,
    label: enabled ? "$50 one-time self-help packet payment" : "No payment available for this result"
  };
}
