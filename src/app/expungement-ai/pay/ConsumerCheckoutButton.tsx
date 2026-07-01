"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

export function ConsumerCheckoutButton({ briefcaseItemId }: { briefcaseItemId: string }) {
  const { t: translate } = useLocalization();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function startCheckout() {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/expungement-ai/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ briefcaseItemId })
    });
    const payload = await response.json().catch(() => null) as { checkoutUrl?: string; error?: string } | null;

    if (!response.ok || !payload?.checkoutUrl) {
      setError(payload?.error ?? translate("payment.error", "Checkout is not available right now."));
      setIsLoading(false);
      return;
    }

    window.location.assign(payload.checkoutUrl);
  }

  return (
    <div className="mt-6">
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
        onClick={startCheckout}
        type="button"
      >
        <CreditCard className="h-4 w-4" aria-hidden="true" />
        {isLoading ? translate("payment.starting", "Starting checkout...") : translate("payment.generate_packet", "Generate my self-help packet - $50")}
      </button>
      {error ? <p className="mt-3 text-sm font-semibold text-[#B42318]">{error}</p> : null}
    </div>
  );
}
