"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { trackFunnelEvent } from "@/lib/analytics/client";

export function PacketGenerateButton({
  briefcaseItemId,
  mode,
  label,
  initiallyPreparing = false,
  initiallyFailed = false,
  initiallyRetryable = false
}: {
  briefcaseItemId: string;
  mode: "sponsored_sync" | "paid_durable";
  label?: string;
  initiallyPreparing?: boolean;
  initiallyFailed?: boolean;
  initiallyRetryable?: boolean;
}) {
  const router = useRouter();
  const { t: translate, text: localizeText } = useLocalization();
  const [status, setStatus] = useState<"idle" | "submitting" | "preparing" | "error">(initiallyFailed ? "error" : initiallyPreparing ? "preparing" : "idle");
  const [refusal, setRefusal] = useState<string | null>(initiallyFailed ? initiallyRetryable ? "Packet preparation failed. Your payment is preserved. Retry preparation without another charge." : "Packet preparation needs support. Your payment is preserved." : null);
  const [retryAllowed, setRetryAllowed] = useState(!initiallyFailed || initiallyRetryable);
  const [watching, setWatching] = useState(initiallyPreparing || initiallyFailed && initiallyRetryable);
  const durable = mode === "paid_durable";

  useEffect(() => {
    if (!durable || !watching) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let checks = 0;
    async function check() {
      const response = await fetch(`/api/expungement-ai/packet/status?briefcaseItemId=${encodeURIComponent(briefcaseItemId)}`, { cache: "no-store", signal: controller.signal }).catch(() => null);
      const body = await response?.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (response?.ok && body?.packetStatus === "ready" && body.canDownload === true) {
        setWatching(false);
        setStatus("idle");
        router.push(`/briefcase/${encodeURIComponent(briefcaseItemId)}`);
        router.refresh();
        return;
      }
      checks++;
      if (body?.packetStatus === "failed" || !response?.ok || checks >= 60) {
        setRetryAllowed(body?.packetStatus !== "failed" || body.retryable === true);
        setRefusal(body?.packetStatus === "failed"
          ? body.retryable ? "Packet preparation failed. Your payment is preserved. Retry preparation without another charge." : "Packet preparation needs support. Your payment is preserved."
          : "Your payment is preserved. We could not confirm the completed packet yet. Retry the status check or return to this matter later.");
        setStatus("error");
        if (!body?.retryable || checks >= 60) { setWatching(false); return; }
      }
      timer = setTimeout(check, 2000);
    }
    timer = setTimeout(check, 500);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [briefcaseItemId, durable, router, watching]);

  async function generate() {
    setStatus("submitting");
    setRefusal(null);
    trackFunnelEvent("packet_builder_started", { product_surface: "expungement_ai" });
    const response = await fetch(durable
      ? "/api/expungement-ai/packet/render"
      : "/api/expungement-ai/packet/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefcaseItemId })
    }).catch(() => null);
    const result = !response?.ok ? await response?.json().catch(() => null) : null;
    if (response?.status === 409) {
      if (result?.outcome === "sponsor_capacity_exhausted") {
        router.push(`/briefcase/${encodeURIComponent(briefcaseItemId)}/review`);
        router.refresh();
        setStatus("idle");
        return;
      }
    }
    if (!response?.ok || (durable && response.status !== 202)) {
      if (typeof result?.resultCode === "string" && typeof result?.error === "string") setRefusal(result.error);
      setStatus("error");
      return;
    }
    if (durable) {
      // A 202 means durable work was accepted. The worker, not this click,
      // owns the eventual packet-ready transition and generated event.
      setStatus("preparing");
      setWatching(true);
      router.push(`/briefcase/${encodeURIComponent(briefcaseItemId)}`);
      router.refresh();
      return;
    }
    trackFunnelEvent("packet_generated", { product_surface: "expungement_ai" });
    router.refresh();
  }

  return (
    <div className="mt-4">
      {durable && !retryAllowed ? <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-4 text-sm font-bold text-white" href={`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(briefcaseItemId)}`}>{localizeText("Contact support")}</Link> : <button
        type="button"
        disabled={status === "submitting" || status === "preparing"}
        onClick={() => void generate()}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-[#0B1320] px-4 text-[13px] font-bold text-white disabled:opacity-60"
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        {status === "preparing"
          ? localizeText("Preparing packet")
          : status === "submitting"
            ? (durable ? localizeText("Starting packet preparation...") : translate("briefcase.generating_packet", "Generating packet..."))
            : status === "error" && durable ? localizeText("Retry packet preparation") : label ? localizeText(label) : translate("briefcase.generate_packet", "Generate my packet")}
      </button>}
      {status === "preparing" ? <p className="mt-2 text-sm" role="status" aria-live="polite">{localizeText("Your payment is confirmed. We are preparing your packet; this page will open it when it is ready.")}</p> : null}
      {status === "error" ? (
        <p className="mt-2 text-[13px] font-semibold text-[#B23036]" role="alert" aria-live="assertive">
          {refusal ? localizeText(refusal) : durable
            ? localizeText("We could not start packet preparation right now. Try again or contact support.")
            : translate("briefcase.generate_error", "We could not generate the packet right now. Try again or contact support.")}
        </p>
      ) : null}
    </div>
  );
}
