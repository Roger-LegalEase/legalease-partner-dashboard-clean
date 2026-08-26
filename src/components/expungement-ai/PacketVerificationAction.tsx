"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { ConsumerCheckoutButton } from "@/app/expungement-ai/pay/ConsumerCheckoutButton";
import { PacketGenerateButton } from "@/components/expungement-ai/PacketGenerateButton";
import { requestPacketVerification } from "@/components/expungement-ai/packet-verification-client";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

type VerificationMode = "consumer" | "paid" | "sponsored";

function sponsoredReviewCopy(verified: boolean) {
  return verified
    ? {
        eyebrow: "Covered by your partner program",
        heading: "Packet facts verified and current.",
        body: "Covered packet generation is now available."
      }
    : {
        eyebrow: "Covered by your partner program",
        heading: "Complete final verification before covered generation.",
        body: "Confirm that the saved packet facts match the participant’s records."
      };
}

export function PacketVerificationAction({
  itemId,
  verificationAnswers,
  initiallyVerified,
  canVerify,
  packetReady = false,
  mode
}: {
  itemId: string;
  verificationAnswers: Record<string, AnswerValue>;
  initiallyVerified: boolean;
  canVerify: boolean;
  packetReady?: boolean;
  mode: VerificationMode;
}) {
  const router = useRouter();
  const [verified, setVerified] = useState(initiallyVerified);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sponsoredCopy = sponsoredReviewCopy(verified);

  async function verify() {
    if (verifying || !canVerify) return;
    setVerifying(true);
    setError(null);
    const result = await requestPacketVerification({ itemId, answers: verificationAnswers });
    setVerifying(false);
    if (!result.ok || !result.readyToGenerate) {
      setError("We could not verify these packet facts. Review your answers and try again.");
      return;
    }
    setVerified(true);
    router.refresh();
  }

  return (
    <div className="mt-5 rounded-[16px] bg-[#0B1320] p-6 text-white" data-packet-verification-state={verified ? "verified" : "unverified"}>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7FE9DE]">
        {mode === "sponsored" ? sponsoredCopy.eyebrow : verified ? "Packet facts verified" : "Final verification"}
      </p>
      <h2 className="mt-2 text-xl font-extrabold">
        {mode === "sponsored"
          ? sponsoredCopy.heading
          : verified
            ? "Your packet facts are verified and current."
            : "Confirm these facts before continuing."}
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/75">
        {mode === "sponsored"
          ? sponsoredCopy.body
          : "Check every answer against your records. Editing any answer will require verification again."}
      </p>

      {!verified ? (
        canVerify ? (
          <button
            className="mt-5 min-h-11 rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
            disabled={verifying}
            onClick={() => void verify()}
            type="button"
          >
            {verifying ? "Verifying packet facts..." : "I verified these packet facts"}
          </button>
        ) : (
          <p className="mt-4 rounded-[10px] bg-white/10 px-4 py-3 text-sm font-semibold">
            Complete every required packet detail before final verification.
          </p>
        )
      ) : packetReady ? (
        <Link className="mt-5 inline-flex min-h-11 items-center rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/briefcase/${encodeURIComponent(itemId)}`}>
          Open my packet
        </Link>
      ) : mode === "sponsored" ? (
        <div className="mt-5 [&_button]:bg-[#FF3B00]">
          <PacketGenerateButton briefcaseItemId={itemId} mode="sponsored_sync" />
        </div>
      ) : mode === "paid" ? (
        <div className="mt-5 [&_button]:bg-[#FF3B00]">
          <PacketGenerateButton briefcaseItemId={itemId} mode="paid_durable" label="Prepare updated packet" />
        </div>
      ) : (
        <ConsumerCheckoutButton briefcaseItemId={itemId} label="Pay $50 and generate my packet" />
      )}

      {error ? (
        <p className="mt-4 rounded-[10px] bg-[#7F1D1D] px-4 py-3 text-sm font-semibold" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
