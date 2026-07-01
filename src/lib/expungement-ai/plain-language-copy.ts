export type CopyLanguage = "en" | "es";

export type CriticalCopyEntry = {
  id: string;
  surface:
    | "landing"
    | "state_picker"
    | "wilma_question"
    | "answer_choice"
    | "result_panel"
    | "payment_gate"
    | "briefcase"
    | "rcap_partner_flow"
    | "filing_readiness"
    | "external_document_checklist"
    | "checkout";
  en: string;
  es: string;
};

export const PAYMENT_GATE_COPY: CriticalCopyEntry[] = [
  {
    id: "payment.generate_self_help_packet",
    surface: "payment_gate",
    en: "Generate my self-help packet - $50",
    es: "Generar mi paquete de autoayuda - $50"
  },
  {
    id: "payment.supporting_copy",
    surface: "payment_gate",
    en: "The free check is complete. Based on your answers, we found a possible packet route. The $50 covers Expungement.ai packet generation. Court, agency, or background-report fees are separate.",
    es: "La revisión gratis está completa. Según sus respuestas, encontramos una posible ruta de paquete. Los $50 cubren la generación del paquete de Expungement.ai. Las cuotas del tribunal, de agencias o de informes de antecedentes son aparte."
  },
  {
    id: "payment.no_court_fee",
    surface: "checkout",
    en: "You are paying for self-help packet preparation and filing instructions. Court approval is not promised. Expungement.ai is not a law firm and does not provide legal advice.",
    es: "Usted paga por la preparación de un paquete de autoayuda y por instrucciones de presentación. No se promete la aprobación del tribunal. Expungement.ai no es un bufete de abogados y no brinda asesoría legal."
  }
];

export const RESULT_COPY: CriticalCopyEntry[] = [
  {
    id: "result.possible_packet_route",
    surface: "result_panel",
    en: "Based on your answers, there may be a packet route.",
    es: "Según sus respuestas, puede haber una ruta de paquete."
  },
  {
    id: "result.no_guarantee",
    surface: "result_panel",
    en: "This does not guarantee the court will grant your request.",
    es: "Esto no garantiza que el tribunal conceda su solicitud."
  },
  {
    id: "result.outside_documents",
    surface: "filing_readiness",
    en: "You may still need outside documents before filing. We'll explain what to get and where it goes.",
    es: "Es posible que aún necesite documentos externos antes de presentar. Le explicaremos qué conseguir y dónde incluirlo."
  },
  {
    id: "result.self_help_not_advice",
    surface: "result_panel",
    en: "This is a self-help packet. It is not legal advice.",
    es: "Este es un paquete de autoayuda. No es asesoría legal."
  }
];

export const EXTERNAL_DOCUMENT_COPY: CriticalCopyEntry[] = [
  {
    id: "external.patch_psp",
    surface: "external_document_checklist",
    en: "You may need a recent Pennsylvania PATCH or PSP background report before filing. This does not stop you from generating your packet.",
    es: "Es posible que necesite un informe reciente de antecedentes PATCH o PSP de Pennsylvania antes de presentar. Esto no le impide generar su paquete."
  },
  {
    id: "external.sbi",
    surface: "external_document_checklist",
    en: "You may need an SBI report or letter before filing. This is a filing step, not a checkout blocker.",
    es: "Es posible que necesite un informe o carta del SBI antes de presentar. Este es un paso de presentación, no un bloqueo para pagar."
  },
  {
    id: "external.criminal_history_report",
    surface: "external_document_checklist",
    en: "You may need a criminal-history report before filing. We'll explain what to get and where it goes.",
    es: "Es posible que necesite un informe de antecedentes penales antes de presentar. Le explicaremos qué conseguir y dónde incluirlo."
  },
  {
    id: "external.certified_disposition",
    surface: "external_document_checklist",
    en: "You may need a certified court record before filing. We will list it as a next step if your packet needs it.",
    es: "Es posible que necesite un registro certificado del tribunal antes de presentar. Lo pondremos como próximo paso si su paquete lo necesita."
  }
];

export const ROUTE_LABEL_COPY: CriticalCopyEntry[] = [
  { id: "route.ak.courtview_removal", surface: "result_panel", en: "CourtView Removal", es: "Eliminación de CourtView" },
  { id: "route.nv.record_sealing", surface: "result_panel", en: "Record Sealing", es: "Sellado de antecedentes" },
  { id: "route.ma.cori_sealing", surface: "result_panel", en: "CORI Sealing", es: "Sellado de CORI" },
  { id: "route.ma.dismissed_case_sealing", surface: "result_panel", en: "Dismissed Case Sealing", es: "Sellado de caso desestimado" },
  { id: "route.ma.marijuana_expungement", surface: "result_panel", en: "Marijuana Expungement", es: "Borrado de antecedente de marihuana" },
  { id: "route.pa.court_case_expungement", surface: "result_panel", en: "Court Case Expungement", es: "Borrado de caso judicial" },
  { id: "route.pa.summary_expungement", surface: "result_panel", en: "Summary Expungement", es: "Borrado de condena sumaria" },
  { id: "route.pa.limited_access", surface: "result_panel", en: "Limited Access / Sealing", es: "Acceso limitado / sellado" },
  { id: "route.hi.admin_application", surface: "result_panel", en: "Administrative Application", es: "Solicitud administrativa" },
  { id: "route.de.discretionary_expungement", surface: "result_panel", en: "Discretionary Expungement Packet", es: "Paquete de borrado discrecional" }
];

export const NO_PAYMENT_COPY: CriticalCopyEntry[] = [
  { id: "no_payment.guidance_only", surface: "result_panel", en: "We can give you next steps for your state.", es: "Podemos darle próximos pasos para su estado." },
  { id: "no_payment.needs_more_info", surface: "result_panel", en: "We need a few more details.", es: "Necesitamos algunos detalles más." },
  { id: "no_payment.not_yet", surface: "result_panel", en: "You may need to wait.", es: "Es posible que tenga que esperar." },
  { id: "no_payment.needs_review", surface: "result_panel", en: "This needs review before a packet is generated.", es: "Esto necesita revisión antes de generar un paquete." },
  { id: "no_payment.hard_stop", surface: "result_panel", en: "We cannot help with this type of record.", es: "No podemos ayudar con este tipo de antecedente." }
];

export const BRIEFCASE_COPY: CriticalCopyEntry[] = [
  { id: "briefcase.guidance_saved", surface: "briefcase", en: "Guidance saved", es: "Guía guardada" },
  { id: "briefcase.packet_ready", surface: "briefcase", en: "Ready to file", es: "Listo para presentar" },
  { id: "briefcase.needs_attention", surface: "briefcase", en: "Needs your attention", es: "Necesita su atención" },
  { id: "briefcase.waiting_period", surface: "briefcase", en: "Waiting period", es: "Período de espera" },
  { id: "briefcase.extra_care", surface: "briefcase", en: "Extra care", es: "Revisión cuidadosa" }
];

export const CRITICAL_COPY_CATALOG: CriticalCopyEntry[] = [
  ...PAYMENT_GATE_COPY,
  ...RESULT_COPY,
  ...EXTERNAL_DOCUMENT_COPY,
  ...ROUTE_LABEL_COPY,
  ...NO_PAYMENT_COPY,
  ...BRIEFCASE_COPY
];

export function routeLabelForState(stateName: string, pathwayId?: string) {
  const state = stateName.toLowerCase();
  const pathway = (pathwayId ?? "").toLowerCase();
  if (state === "alaska") return "CourtView Removal";
  if (state === "nevada") return "Record Sealing";
  if (state === "hawaii") return "Administrative Application";
  if (state === "delaware") return "Discretionary Expungement Packet";
  if (state === "massachusetts") {
    if (pathway.includes("marijuana")) return "Marijuana Expungement";
    if (pathway.includes("dismiss") || pathway.includes("non-conviction")) return "Dismissed Case Sealing";
    return "CORI Sealing";
  }
  if (state === "pennsylvania") {
    if (pathway.includes("summary") || pathway.includes("490")) return "Summary Expungement";
    if (pathway.includes("limited") || pathway.includes("seal") || pathway.includes("791")) return "Limited Access / Sealing";
    return "Court Case Expungement";
  }
  return `${stateName} record-clearing`;
}

export function routeExplanationForState(stateName: string, pathwayId?: string) {
  const label = routeLabelForState(stateName, pathwayId);
  if (stateName === "Alaska") {
    return "This asks to remove the case from Alaska's public online court index. It does not erase all criminal-history records.";
  }
  if (stateName === "Nevada") return "Nevada uses record sealing, not expungement.";
  if (stateName === "Pennsylvania") {
    return "A PATCH or PSP report may be needed before filing, but it is not needed before payment.";
  }
  return `This looks like a possible ${label} route based on the information you provided.`;
}
