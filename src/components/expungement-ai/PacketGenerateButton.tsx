"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

export function PacketGenerateButton({ briefcaseItemId }: { briefcaseItemId: string }) {
  const router = useRouter();
  const { t: translate } = useLocalization();
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");

  async function generate() {
    setStatus("generating");
    const response = await fetch("/api/expungement-ai/packet/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefcaseItemId })
    }).catch(() => null);
    if (!response?.ok) {
      setStatus("error");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={status === "generating"}
        onClick={() => void generate()}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-[#0B1320] px-4 text-[13px] font-bold text-white disabled:opacity-60"
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        {status === "generating" ? translate("briefcase.generating_packet", "Generating packet...") : translate("briefcase.generate_packet", "Generate my packet")}
      </button>
      {status === "error" ? (
        <p className="mt-2 text-[13px] font-semibold text-[#B23036]">
          {translate("briefcase.generate_error", "We could not generate the packet right now. Try again or contact support.")}
        </p>
      ) : null}
    </div>
  );
}
