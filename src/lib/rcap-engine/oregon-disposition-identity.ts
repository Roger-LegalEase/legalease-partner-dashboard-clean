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
  declination: ["Confirm whether the prosecutor decided not to file charges. No filed court case alone does not establish that decision.", "Confirme si la fiscalía decidió no presentar cargos. La ausencia de un caso judicial por sí sola no establece esa decisión."],
  declination_date: ["Confirm the actual date of the prosecutor's decision not to file charges. The arrest date and a general elapsed-time answer do not replace it.", "Confirme la fecha real de la decisión de la fiscalía de no presentar cargos. La fecha del arresto y una respuesta general sobre el tiempo transcurrido no la sustituyen."],
  future_date: ["The decision date is in the future. Check the record and correct the date or keep it unknown.", "La fecha de la decisión está en el futuro. Revise el expediente y corrija la fecha o indique que no la sabe."],
  sixty_days: ["The 60-day period after the prosecutor's decision not to file charges has not finished. This result does not authorize filing.", "Aún no ha terminado el período de 60 días desde la decisión de la fiscalía de no presentar cargos. Este resultado no autoriza la presentación al tribunal."],
  no_conviction_scope: ["Confirm whether every record included in this request ended without a conviction. A conviction cannot be included in this acquittal or dismissal configuration.", "Confirme si todos los antecedentes incluidos en esta solicitud terminaron sin una condena. No puede incluir una condena en esta configuración de absolución o desestimación."],
  supported: ["The stated disposition and timing facts are supported. Filing details and packet availability still need to be resolved; this is not a finding that relief will be granted.", "Los datos indicados sobre el resultado y los plazos están respaldados. Aún deben resolverse los detalles para la presentación y la disponibilidad del paquete; esto no determina que se concederá el alivio solicitado."],
  pending: ["Clarify any pending case before preparing this request. This answer alone does not establish whether the requested records qualify.", "Aclare cualquier caso pendiente antes de preparar esta solicitud. Esta respuesta por sí sola no establece si los antecedentes solicitados reúnen los requisitos."],
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
  if (!OR_DISPOSITION_FACT_IDS.includes(id)) return true;
  if (jurisdiction !== "OR") return false;
  const identity = oregonDispositionIdentity(answers);
  if (id === OR_DISPOSITION_ID) return scalar(answers.case_outcome) === GROUPED || identity.status === "clarification";
  if (identity.status !== "identified") return false;
  const neverCharged = identity.configuration.configurationId === OR_DISPOSITION_CONFIGURATIONS.never_charged.configurationId;
  if (id === OR_NO_CONVICTION_SCOPE_ID) return !neverCharged;
  return neverCharged && (id !== OR_DECLINATION_DATE_ID || answers[OR_DECLINATION_ID] === "yes");
}

/** Exact remaining disposition predicates in the retained current configuration.
 * Court existence is already established by the explicit acquittal or filed-
 * charge dismissal answer. Neither sentence completion nor a conviction clock
 * proves these facts. Case/court identifiers remain document facts. */
export const OR_DECLINATION_ID = "or_prosecutor_elected_not_to_proceed";
export const OR_DECLINATION_DATE_ID = "or_prosecutor_declination_date";
export const OR_NO_CONVICTION_SCOPE_ID = "or_no_conviction_in_scope";
export const OR_DISPOSITION_FACT_IDS = [OR_DISPOSITION_ID, OR_DECLINATION_ID, OR_DECLINATION_DATE_ID, OR_NO_CONVICTION_SCOPE_ID];
const yesNo = [
  ["yes", "Yes", "Sí"], ["no", "No", "No"], ["unknown", "I am not sure", "No estoy seguro"]
];
function factQuestion(id: string, prompt: string, es: string, helperText: string, esHelp: string, date = false): PublicQuestion {
  return { id, stage: "pathway_routing", type: date ? "date_or_unknown" : "single_choice", required: false,
    contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: date ? "prepay_timing_gate" : "prepay_route_splitter",
    prompt, helperText, options: date ? null : yesNo.map(([value]) => value),
    ...(!date ? { optionDisplay: Object.fromEntries(yesNo.map(([value,label,es]) => [value,{label,translations:{es:{label:es}}}])) } : {}),
    translations: { es: { prompt: es, helperText: esHelp } } };
}
OR_DISPOSITION_QUESTIONS.push(
  factQuestion(OR_DECLINATION_ID,
    "Has the prosecutor said they will not file charges for this arrest or citation?",
    "¿La fiscalía ha indicado que no presentará cargos por este arresto o citación?",
    "No court case by itself does not establish the prosecutor's decision. Use the actual notice or record of that decision, or keep an unsure answer.",
    "La ausencia de un caso judicial por sí sola no establece la decisión de la fiscalía. Use el aviso o registro de esa decisión, o indique que no está seguro."),
  factQuestion(OR_DECLINATION_DATE_ID,
    "On what date did the prosecutor say they would not file charges?",
    "¿En qué fecha indicó la fiscalía que no presentaría cargos?",
    "Use the date of the prosecutor's decision, not the arrest date or the date you checked the record. This date is used to check the 60-day period for a record with no charges filed.",
    "Use la fecha de la decisión de la fiscalía, no la del arresto ni la fecha en que consultó el expediente. Esta fecha se usa para comprobar el período de 60 días para un expediente sin cargos presentados.", true),
  factQuestion(OR_NO_CONVICTION_SCOPE_ID,
    "Do all records you want to include in this request end without a conviction?",
    "¿Todos los antecedentes que desea incluir en esta solicitud terminaron sin una condena?",
    "Check each charge included in this request. This acquittal or dismissal configuration cannot include a conviction; other convictions have their own rules.",
    "Revise cada acusación incluida en esta solicitud. Esta configuración de absolución o desestimación no puede incluir una condena; otras condenas tienen sus propias reglas.")
);
function exactDate(value: unknown): string | null {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>).unknown === false && Object.keys(value).every(key => key === "unknown" || key === "value")
      ? (value as Record<string, unknown>).value : undefined
    : value;
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === raw ? raw : null;
}
export function oregonDispositionFilingFacts(answers: Readonly<Record<string, unknown>>, today: string): {
  status: "not_applicable" | "missing" | "review" | "not_yet" | "supported";
  code: "identity" | "declination" | "declination_date" | "future_date" | "sixty_days" | "no_conviction_scope" | "disposition_facts_supported";
  ids: string[]; filingDate?: string;
} {
  const identity = oregonDispositionIdentity(answers);
  if (identity.status === "not_applicable") return { status: "not_applicable", code: "identity", ids: [] };
  if (identity.status === "clarification") return { status: "missing", code: "identity", ids: identity.ids };
  if (identity.configuration.configurationId !== OR_DISPOSITION_CONFIGURATIONS.never_charged.configurationId) {
    const answer = answers[OR_NO_CONVICTION_SCOPE_ID];
    if (answer !== "yes") return { status: answer === "no" ? "review" : "missing", code: "no_conviction_scope", ids: [OR_NO_CONVICTION_SCOPE_ID] };
    return { status: "supported", code: "disposition_facts_supported", ids: [] };
  }
  const declined = answers[OR_DECLINATION_ID];
  if (declined !== "yes") return { status: declined === "no" ? "not_yet" : "missing", code: "declination", ids: [OR_DECLINATION_ID] };
  const date = exactDate(answers[OR_DECLINATION_DATE_ID]);
  if (!date || !exactDate(today)) return { status: "missing", code: "declination_date", ids: [OR_DECLINATION_DATE_ID] };
  if (date > today) return { status: "review", code: "future_date", ids: [OR_DECLINATION_DATE_ID] };
  const eligible = new Date(`${date}T00:00:00.000Z`); eligible.setUTCDate(eligible.getUTCDate() + 60);
  const filingDate = eligible.toISOString().slice(0, 10);
  return filingDate > today ? { status: "not_yet", code: "sixty_days", ids: [], filingDate }
    : { status: "supported", code: "disposition_facts_supported", ids: [], filingDate };
}

export function oregonDispositionLegacyQuestionApplies(
  profile: { jurisdiction: { code: string }; profileVersion: string; source?: { sourceCorpusSha256?: string } },
  answers: Record<string, unknown>, id: string
): boolean {
  if (!["resolved_timing_bucket", "sentence_completion_date", "court_requirements_completed", "financial_obligations"].includes(id)) return true;
  if (profile.jurisdiction.code !== "OR" || profile.profileVersion !== OR_DISPOSITION_SOURCE.profileVersion
    || profile.source?.sourceCorpusSha256 !== OR_DISPOSITION_SOURCE.sourceFingerprint) return true;
  // A court-charge disposition or a never-charged arrest has no conviction
  // sentence-completion clock in these three adopted configurations. Existing
  // answers remain untouched and apply again when the record context changes.
  return oregonDispositionIdentity(answers).status !== "identified";
}
