"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { trackFunnelEvent } from "@/lib/analytics/client";

export function PacketGenerateButton({
  briefcaseItemId,
  mode,
  label
}: {
  briefcaseItemId: string;
  mode: "sponsored_sync" | "paid_durable";
  label?: string;
}) {
  const router = useRouter();
  const { t: translate } = useLocalization();
  const [status, setStatus] = useState<"idle" | "submitting" | "preparing" | "error">("idle");
  const durable = mode === "paid_durable";

  async function generate() {
    setStatus("submitting");
    trackFunnelEvent("packet_builder_started", { product_surface: "expungement_ai" });
    const response = await fetch(durable
      ? "/api/expungement-ai/packet/render"
      : "/api/expungement-ai/packet/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefcaseItemId })
    }).catch(() => null);
    if (!response?.ok || (durable && response.status !== 202)) {
      setStatus("error");
      return;
    }
    if (durable) {
      // A 202 means durable work was accepted. The worker, not this click,
      // owns the eventual packet-ready transition and generated event.
      setStatus("preparing");
      router.refresh();
      return;
    }
    trackFunnelEvent("packet_generated", { product_surface: "expungement_ai" });
    router.refresh();
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={status === "submitting" || status === "preparing"}
        onClick={() => void generate()}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-[#0B1320] px-4 text-[13px] font-bold text-white disabled:opacity-60"
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        {status === "preparing"
          ? "Preparing packet"
          : status === "submitting"
            ? (durable ? "Starting packet preparation..." : translate("briefcase.generating_packet", "Generating packet..."))
            : label ?? translate("briefcase.generate_packet", "Generate my packet")}
      </button>
      {status === "error" ? (
        <p className="mt-2 text-[13px] font-semibold text-[#B23036]" role="alert" aria-live="assertive">
          {durable
            ? "We could not start packet preparation right now. Try again or contact support."
            : translate("briefcase.generate_error", "We could not generate the packet right now. Try again or contact support.")}
        </p>
      ) : null}
    </div>
  );
}
