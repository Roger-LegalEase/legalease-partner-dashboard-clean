import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

/** Aug 29's three configurations share forms, not legal identity. This bridge
 * identifies a record only. It does not establish the remaining filing facts,
 * install a packet specification or authorize payment/generation. */
export const OR_DISPOSITION_SOURCE = {
  profileVersion: "2026-06-19-source-conversion-1",
  sourceFingerprint: "c24020602e6fbf2f0b66e16d300b99397596cfe6b754f393e480e945d00a74cd",
  configurationSha256: "8de1133bce33edc0a43c1f620b5d49fd69bc9f6566fef52c0853e449b367ebad"
} as const;
export const OR_DISPOSITION_COPY = {
  held: ["This Oregon record has a distinct set-aside route. More review is needed before a filing packet can be prepared.", "Este expediente de Oregon tiene una vía específica para anular antecedentes. Se necesita más revisión antes de preparar un paquete para presentar al tribunal."],
  held_reason: ["The record identifies a current disposition-specific configuration; remaining filing facts and packet authorization are unresolved.", "El expediente identifica una configuración vigente para ese resultado; quedan sin resolver otros hechos necesarios para la presentación y la autorización del paquete."],
  caution: ["Identifying this route does not establish eligibility, waive the Oregon State Police step, or authorize a filing packet.", "Identificar esta vía no establece que reúna los requisitos, no elimina el trámite ante la Policía Estatal de Oregon ni autoriza un paquete para presentar al tribunal."],
  clarify: ["Confirm what happened to the Oregon charge before choosing the correct set-aside route.", "Confirme el resultado de la acusación de Oregon antes de elegir la vía correcta para anular antecedentes."],
  clarify_reason: ["The grouped or conflicting disposition answers do not establish one of the three current configurations.", "Las respuestas agrupadas o contradictorias sobre el resultado no establecen una de las tres configuraciones vigentes."],
  next: ["Check the exact record, remaining filing facts and required agency steps before preparing a packet. No packet is authorized by this result.", "Consulte el expediente exacto, los demás hechos necesarios para la presentación y los trámites requeridos ante las agencias antes de preparar un paquete. Este resultado no autoriza ningún paquete."],
  never_charged: ["Set aside an arrest or citation with no court charge filed", "Anular antecedentes de un arresto o citación sin acusación presentada ante el tribunal"],
  acquittal: ["Set aside an acquittal", "Anular antecedentes de una absolución"],
  ordinary_dismissal: ["Set aside an ordinary dismissal", "Anular antecedentes de una desestimación ordinaria"]
} satisfies Record<string, [string, string]>;
export const OR_RETIRED_NONCONVICTION_PATH = "set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c";
export const OR_DISPOSITION_ID = "or_disposition_record";
export const OR_DISPOSITION_CONFIGURATIONS = {
  never_charged: {
    pathwayId: "set-aside-of-a-citation-or-arrest-with-no-accusatory-instrument-under-ors-137-225-1-c",
    packetFamily: "rcap-or-official-pdf-fill", packetSetId: "or_arrest_no_charges-set",
    trackId: "or_arrest_no_charges", configurationId: "or-never-charged-137-225-1-c",
    label: "Set aside an arrest or citation with no court charge filed", formOption: "Option 3",
    specificationSha256: "454463c1aecfc39d6a87cea50ddaa80cd833049d692c1adf0ced67fa7ae870f3"
  },
  acquittal: {
    pathwayId: "set-aside-of-an-acquittal-under-ors-137-225-1-d",
    packetFamily: "rcap-or-official-pdf-fill", packetSetId: "or_acquittal-set",
    trackId: "or_acquittal", configurationId: "or-acquittal-137-225-1-d",
    label: "Set aside an acquittal", formOption: "Option 2",
    specificationSha256: "edc630b6d66724aa98b325464b2113be0d0388c8168bc0e6b301053c5dffa855"
  },
  ordinary_dismissal: {
    pathwayId: "set-aside-of-an-ordinary-dismissal-under-ors-137-225-1-d",
    packetFamily: "rcap-or-official-pdf-fill", packetSetId: "or_dismissed_charge-set",
    trackId: "or_dismissed_charge", configurationId: "or-ordinary-dismissal-137-225-1-d",
    label: "Set aside an ordinary dismissal", formOption: "Option 2",
    specificationSha256: "321a7dd4c4d0be28d85a38044c6f15e5f8eb9658b6b58ff87a1fb426849cf2d2"
  }
} as const;
export type OregonDispositionConfiguration = typeof OR_DISPOSITION_CONFIGURATIONS[keyof typeof OR_DISPOSITION_CONFIGURATIONS];
const NO_CHARGE = "Arrest or citation with no charge filed";
const ACQUITTAL = "Acquitted or found not guilty";
const GROUPED = "Dismissed, no-billed, nolle prosequi, or not prosecuted";
const choices = [
  ["never_charged", "No charge was ever filed in court", "Nunca se presentó una acusación ante el tribunal"],
  ["ordinary_dismissal", "A filed court charge was dismissed (not an acquittal)", "Se desestimó una acusación presentada ante el tribunal (no fue una absolución)"],
  ["acquittal", "The court found me not guilty", "El tribunal me declaró no culpable"],
  ["other", "Another outcome, or different outcomes for different charges", "Otro resultado, o resultados distintos para diferentes acusaciones"],
  ["unknown", "I am not sure", "No estoy seguro"]
];
export const OR_DISPOSITION_QUESTIONS: PublicQuestion[] = [{
  id: OR_DISPOSITION_ID, stage: "pathway_routing", type: "single_choice", required: false,
  contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter",
  prompt: "What does the record show happened to this arrest or charge?",
  helperText: "The earlier grouped answer covers different records. Distinguish a charge that was never filed from a filed charge that was dismissed. If a program was involved, use the final court disposition; completing a program alone is not a dismissal. Choose another outcome if the charges had different outcomes. This identifies the record; it does not establish eligibility.",
  options: choices.map(([value]) => value),
  optionDisplay: Object.fromEntries(choices.map(([value, label, es]) => [value, { label, translations: { es: { label: es } } }])),
  translations: { es: {
    prompt: "¿Qué indica el expediente sobre el resultado de este arresto o acusación?",
    helperText: "La respuesta anterior agrupaba expedientes distintos. Distinga una acusación que nunca se presentó de una acusación presentada que fue desestimada. Si hubo un programa, use el resultado judicial final; completar un programa por sí solo no es una desestimación. Elija otro resultado si las acusaciones tuvieron resultados distintos. Esto identifica el expediente; no establece que reúna los requisitos."
  } }
}];
// These are public single-choice values, not free text or record wrappers.
// Unrecognized shapes stay in the caller's raw answers and require correction.
function scalar(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
export function oregonDispositionIdentity(answers: Readonly<Record<string, unknown>>):
  | { status: "not_applicable" }
  | { status: "clarification"; ids: string[] }
  | { status: "identified"; configuration: OregonDispositionConfiguration } {
  const outcome = scalar(answers.case_outcome);
  const explicit = scalar(answers[OR_DISPOSITION_ID]);
  const hasExplicit = Object.hasOwn(answers, OR_DISPOSITION_ID);
  if (![NO_CHARGE, ACQUITTAL, GROUPED].includes(typeof outcome === "string" ? outcome : "")) {
    return hasExplicit ? { status: "clarification", ids: ["case_outcome", OR_DISPOSITION_ID] } : { status: "not_applicable" };
  }
  const known = outcome === NO_CHARGE ? "never_charged" : outcome === ACQUITTAL ? "acquittal" : null;
  if (hasExplicit && (!choices.some(([value]) => explicit === value) || explicit === "unknown" || explicit === "other")) {
    return { status: "clarification", ids: [OR_DISPOSITION_ID] };
  }
  if (known) {
    if (hasExplicit && explicit !== known) return { status: "clarification", ids: ["case_outcome", OR_DISPOSITION_ID] };
    return { status: "identified", configuration: OR_DISPOSITION_CONFIGURATIONS[known] };
  }
  // The grouped answer cannot silently be treated as a filed-case dismissal.
  if (explicit === "never_charged" || explicit === "ordinary_dismissal") {
    return { status: "identified", configuration: OR_DISPOSITION_CONFIGURATIONS[explicit] };
  }
  return { status: "clarification", ids: explicit === "acquittal" ? ["case_outcome", OR_DISPOSITION_ID] : [OR_DISPOSITION_ID] };
}
export function oregonDispositionQuestionApplies(jurisdiction: string, answers: Record<string, unknown>, id: string): boolean {
  if (id !== OR_DISPOSITION_ID) return true;
  if (jurisdiction !== "OR") return false;
  return scalar(answers.case_outcome) === GROUPED || oregonDispositionIdentity(answers).status === "clarification";
}
