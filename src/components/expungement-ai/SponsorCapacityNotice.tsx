"use client";
import { useLocalization } from "./LocalizationProvider";

export function SponsorCapacityNotice({ paid = false }: { paid?: boolean }) {
  const { locale } = useLocalization();
  return <p role="status" className="my-4 rounded-xl border border-[#D9DEE8] bg-white p-4 text-sm leading-6 text-[#334155]" data-sponsor-capacity="exhausted">
    {locale === "es"
      ? paid
        ? "La capacidad del patrocinador se agotó. El pago de este mismo asunto está confirmado. Tu solicitud de la clínica, tus respuestas y tu verificación se conservan."
        : "La capacidad del patrocinador se agotó. El patrocinador no pagará este paquete. Puedes continuar con el pago habitual de $50 para este mismo asunto verificado. Tus respuestas y tu verificación se conservan; no necesitas empezar de nuevo. No prepararemos el paquete hasta confirmar el pago."
      : paid
        ? "Sponsor capacity was exhausted. Payment for this same matter is confirmed. Your Clinic application, answers and verification are preserved."
        : "Sponsor capacity is exhausted. The sponsor will not pay for this packet. You can continue with the standard $50 purchase for this same verified matter. Your answers and verification are saved; you do not need to start again. We will prepare the packet only after payment is confirmed."}
  </p>;
}


export function SponsorCapacityEntryNotice({ consumerUrl }: { consumerUrl: string }) {
  const { text } = useLocalization();
  return <section className="rounded-2xl border border-[#E8DED3] bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-black">{text("Sponsored coverage is unavailable")}</h1>
    <p role="status" className="mt-4">{text("This sponsor has reached its capacity. You can continue through the standard consumer service. Screening is free; an eligible packet costs $50 after required information and verification. The sponsor will not pay for this packet.")}</p>
    <a href={consumerUrl} className="mt-6 inline-flex min-h-12 items-center rounded-md bg-[#0F1E3D] px-5 py-3 font-bold text-white">{text("Continue with standard consumer service")}</a>
  </section>;
}
