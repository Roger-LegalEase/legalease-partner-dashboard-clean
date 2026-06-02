"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function PartnerCheckoutButton({
  packageId,
  partnerId,
  partnerSlug
}: {
  packageId: string;
  partnerId: string;
  partnerSlug: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function beginCheckout() {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/partners/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ packageId, partnerId, partnerSlug })
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to create a checkout session.");
      }

      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to create a checkout session.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button type="button" className="min-h-11 px-5" disabled={isSubmitting} onClick={beginCheckout}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Creating Checkout
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            Begin Stripe Checkout
          </>
        )}
      </Button>
      {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}
