"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { ConsumerCheckoutButton } from "@/app/expungement-ai/pay/ConsumerCheckoutButton";
import { PacketGenerateButton } from "@/components/expungement-ai/PacketGenerateButton";
import {
  packetVerificationActions,
  requestPacketVerification,
  type VerificationMode
} from "@/components/expungement-ai/packet-verification-client";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import type { BriefcaseCommercialActions } from "@/lib/expungement-ai/briefcase-presentation-authority";
import { packetSaveErrorCopy } from "@/lib/expungement-ai/packet-save-contract";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

function sponsoredReviewCopy(verified: boolean, packetReady: boolean) {
  return verified
    ? {
        eyebrow: "Covered by your partner program",
        heading: "Packet facts verified and current.",
        body: packetReady
          ? "Your covered packet remains available in this matter."
          : "Packet generation is available only after the server confirms this matter can be prepared."
      }
    : {
        eyebrow: "Covered by your partner program",
        heading: "Confirm your information before we prepare your packet.",
        body: "Confirm that the saved packet facts match the participant’s records."
      };
}

export function PacketVerificationAction({
  itemId,
  expectedRevision,
  verificationAnswers,
  initiallyVerified,
  canVerify,
  packetReady = false,
  commercialActions,
  mode
}: {
  itemId: string;
  expectedRevision: number;
  verificationAnswers: Record<string, AnswerValue>;
  initiallyVerified: boolean;
  canVerify: boolean;
  packetReady?: boolean;
  commercialActions: BriefcaseCommercialActions;
  mode: VerificationMode;
}) {
  const router = useRouter();
  const { text: localizeText, locale } = useLocalization();
  const copy = (en: string, es: string) => locale === "es" ? es : en;
  const [allowedActions, setAllowedActions] = useState(commercialActions);
  const [verified, setVerified] = useState(initiallyVerified);
  const [verifying, setVerifying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [failureStatus, setFailureStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | { en: string; es: string } | null>(null);
  const sponsoredCopy = sponsoredReviewCopy(verified, packetReady);
  const nextActions = packetVerificationActions({ verified, packetReady, mode, commercialActions: allowedActions });

  async function verify() {
    if (verifying || !canVerify) return;
    setVerifying(true);
    setError(null); setFailureStatus(null);
    const result = await requestPacketVerification({ itemId, answers: verificationAnswers, expectedRevision });
    setVerifying(false);
    if (!result.ok || !result.readyToGenerate) {
      if (!result.ok) {
        const message = packetSaveErrorCopy(result.status, result.errorCode ?? undefined);
        setError(message);
        setFailureStatus(result.status);
      } else {
        setError({ en: "Your answers were saved, but the packet is not ready for final verification. Review the remaining requirements before continuing.", es: "Sus respuestas se guardaron, pero el paquete aún no está listo para la verificación final. Revise los requisitos pendientes antes de continuar." });
      }
      return;
    }
    setVerified(true);
    setAllowedActions(result.commercialActions);
    if (mode === "sponsored" && result.commercialActions.generationAllowed) {
      setPreparing(true);
      const generated = await fetch("/api/expungement-ai/packet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefcaseItemId: itemId })
      }).catch(() => null);
      const outcome = !generated?.ok ? await generated?.json().catch(() => null) : null;
      if (generated?.status === 409) {
        if (outcome?.outcome === "sponsor_capacity_exhausted") {
          setPreparing(false);
          router.refresh();
          return;
        }
      }
      if (!generated?.ok) {
        setPreparing(false);
        setError(typeof outcome?.resultCode === "string" && typeof outcome?.error === "string"
          ? outcome.error
          : "We verified your facts, but could not prepare the clinic packet right now. Try again from this review.");
        router.refresh();
        return;
      }
      router.push(`/briefcase/${encodeURIComponent(itemId)}`);
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-5 rounded-[16px] bg-[#0B1320] p-6 text-white" data-packet-verification-state={verified ? "verified" : "unverified"}>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7FE9DE]">
        {mode === "sponsored" ? copy(sponsoredCopy.eyebrow, "Cubierto por su programa asociado") : verified ? copy("Information confirmed", "Información confirmada") : copy("Review and confirm", "Revisar y confirmar")}
      </p>
      <h2 className="mt-2 text-xl font-extrabold">
        {mode === "sponsored"
          ? copy(sponsoredCopy.heading, verified ? "Los datos del paquete están verificados y actualizados." : "Confirme su información antes de que preparemos su paquete.")
          : verified
            ? copy("Your packet facts are verified and current.", "Los datos de su paquete están verificados y actualizados.")
            : copy("Confirm these facts before continuing.", "Confirme estos datos antes de continuar.")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/75">
        {mode === "sponsored"
          ? packetReady && verified ? copy(sponsoredCopy.body, "Su paquete cubierto sigue disponible en este caso.") : !verified ? copy(sponsoredCopy.body, "Confirme que los datos guardados del paquete coincidan con los expedientes del participante.") : localizeText(sponsoredCopy.body)
          : mode === "paid" && verified && packetReady
            ? allowedActions.generationAllowed ? copy("Your existing packet remains available. You can also prepare an updated packet for this same matter.", "Su paquete existente sigue disponible. También puede preparar un paquete actualizado para este mismo caso.") : copy("Your existing packet remains available.", "Su paquete existente sigue disponible.")
            : copy("Check every answer against your records. Changing an answer will require verification again.", "Compare cada respuesta con sus expedientes. Si cambia una respuesta, deberá verificar la información de nuevo.")}
      </p>

      {!allowedActions.fulfillmentAvailable ? (
        <p className="mt-4 rounded-[10px] bg-white/10 px-4 py-3 text-sm" role="status">
          {localizeText("A packet is not available for this route yet. Your eligibility result and saved information remain available.")}
        </p>
      ) : null}

      {!verified ? (
        canVerify ? (
          <button
            className="mt-5 min-h-11 rounded-[10px] bg-[#C2350A] px-5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
            disabled={verifying || preparing}
            onClick={() => void verify()}
            type="button"
          >
            {preparing
              ? copy("Preparing clinic packet...", "Preparando el paquete de la clínica...")
              : verifying
                ? mode === "sponsored" ? copy("Verifying and preparing...", "Verificando y preparando...") : copy("Verifying packet facts...", "Verificando los datos del paquete...")
                : mode === "sponsored" && allowedActions.fulfillmentAvailable ? copy("Verify and prepare clinic packet", "Verificar y preparar el paquete de la clínica") : copy("I verified these packet facts", "He verificado estos datos del paquete")}
          </button>
        ) : (
          <p className="mt-4 rounded-[10px] bg-white/10 px-4 py-3 text-sm font-semibold">
            {copy("Finish the rest of your information before you continue.", "Complete el resto de su información antes de continuar.")}
          </p>
        )
      ) : (
        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          {nextActions.openPacket ? (
            <Link className="inline-flex min-h-11 items-center rounded-[10px] bg-[#C2350A] px-5 text-sm font-bold text-white" href={`/briefcase/${encodeURIComponent(itemId)}`}>
              {copy("Open my packet", "Abrir mi paquete")}
            </Link>
          ) : null}
          {nextActions.generation?.mode === "sponsored_sync" ? (
            <div className="[&_button]:mt-0 [&_button]:bg-[#C2350A]">
              <PacketGenerateButton briefcaseItemId={itemId} mode="sponsored_sync" label={copy("Prepare clinic packet", "Preparar el paquete de la clínica")} />
            </div>
          ) : null}
          {nextActions.generation?.mode === "paid_durable" ? (
            <div className="[&_button]:mt-0 [&_button]:bg-[#C2350A]">
              <PacketGenerateButton
                briefcaseItemId={itemId}
                mode="paid_durable"
                label={nextActions.generation.label}
              />
            </div>
          ) : null}
          {nextActions.checkout ? (
            <ConsumerCheckoutButton briefcaseItemId={itemId} label={copy("Pay $50 and generate my packet", "Pagar $50 y generar mi paquete")} />
          ) : null}
        </div>
      )}

      {failureStatus === 401 || failureStatus === 403 ? <a className="mt-3 inline-flex min-h-11 items-center underline" href={`/expungement-ai/sign-in?next=${encodeURIComponent(`/briefcase/${itemId}/review`)}`} target="_blank" rel="noopener noreferrer">{copy("Open sign-in in a new tab", "Abrir el inicio de sesión en una pestaña nueva")}</a> : failureStatus !== null ? <Link className="mt-3 inline-flex min-h-11 items-center underline" href={`/briefcase/${encodeURIComponent(itemId)}/packet-information`}>{copy("Open saved packet information", "Abrir la información guardada del paquete")}</Link> : null}
      {error ? (
        <p className="mt-4 rounded-[10px] bg-[#7F1D1D] px-4 py-3 text-sm font-semibold" role="alert" aria-live="assertive">
          {typeof error === "string" ? localizeText(error) : error[locale]}
        </p>
      ) : null}
    </div>
  );
}
