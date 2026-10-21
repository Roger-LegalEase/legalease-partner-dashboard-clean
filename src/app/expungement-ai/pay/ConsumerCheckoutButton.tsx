"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { trackFunnelEvent } from "@/lib/analytics/client";

export function ConsumerCheckoutButton({ briefcaseItemId, label }: { briefcaseItemId: string; label?: string }) {
  const { t: translate } = useLocalization();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function startCheckout() {
    setIsLoading(true);
    setError(null);

    // Fire-and-forget funnel event; never blocks or delays the checkout request.
    trackFunnelEvent("checkout_started", { product_surface: "expungement_ai" });

    try {
      const response = await fetch("/api/expungement-ai/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ briefcaseItemId })
      });
      const payload = await response.json().catch(() => null) as { checkoutUrl?: string; error?: string } | null;

      if (!response.ok || !payload?.checkoutUrl) {
        setError(payload?.error ?? translate("payment.error", "We could not start checkout right now. Please try again."));
        return;
      }

      window.location.assign(payload.checkoutUrl);
    } catch {
      setError(translate("payment.error", "We could not start checkout right now. Please try again."));
    } finally {
      setIsLoading(false);
    }
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
        {isLoading ? translate("payment.starting", "Starting checkout...") : label ?? translate("payment.generate_packet", "Pay $50 and generate my packet")}
      </button>
      {error ? <p className="mt-3 text-sm font-semibold text-[#B42318]" role="alert" aria-live="assertive">{error}</p> : null}
    </div>
  );
}
