import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

/** Reuses the retained TF-810 contact map. This is not a finding that a case
 * qualifies under Rule 40, a current-source approval, or fulfillment authority. */
export const AK_COURTVIEW_PATHWAY = "confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40";
export const AK_TF810_CONTACT_SOURCE = {
  familyId: "ak-courtview-set", formId: "TF-810", revision: "5/25",
  sourceSha256: "c5e55ce0c0bb2a008ad9cde5e62c4900f413c8fb64a913e94c81554c64b69582",
  mapPath: "data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/production-field-map.json",
  mapSha256: "81a8b5b107e728884555c313c1bbb797d2cb06512dab4094c0b1246650f1225b",
  profileVersion: "2026-06-19-source-conversion-1",
  profileSourceFingerprint: "8b11231dee9fe53f5a41a541dd07ff435778d94aa410ed6064783ecb5e6ea40a",
  profileAuthorityFingerprint: "558957e7eb015305f3db9ce1ceaf266869151ed9138afe3ef9d3d37f6b7e807a"
} as const;
export const AK_TF810_PUBLIC_ID = "ak_tf810_case_still_public";
export const AK_TF810_CONTACT_FIELDS = [
  { id: "ak_tf810_contact_address", field: "address", participantKey: "street_address", optional: false },
  { id: "ak_tf810_contact_phone", field: "phoneNo", participantKey: "phone", optional: false },
  { id: "ak_tf810_contact_email", field: "email", participantKey: "email", optional: true },
  { id: "ak_tf810_case_number", field: "caseNo", matterKey: "case_number", optional: false }
] as const;
// AK TF-810 MODE 2: official 5/25 choices; only the participant selects a ground.
export const AK_TF810_GROUND_ID = "ak_tf810_ground";
export const AK_TF810_GROUND_IDS = [AK_TF810_GROUND_ID, "ak_tf810_ground_2_detail", "ak_tf810_ground_3_detail", "ak_tf810_ground_rule"];
export const AK_TF810_GROUND_CHOICES = [
  {
    "id": "lead-in",
    "en": "The above case should be removed from the online public index (CourtView), because it is",
    "es": "El caso indicado arriba debe retirarse del índice público en línea (CourtView) porque es"
  },
  {
    "id": "1",
    "en": "A criminal case in which 60 days have passed since the date of acquittal or dismissal, and • Defendant was acquitted of all charges; or • all charges against Defendant were dismissed (including after suspended entry of judgment), and dismissal was not part of a plea agreement in another criminal case; or • all charges against Defendant were resolved by a combination of the above.",
    "es": "Un caso penal en el que han pasado 60 días desde la fecha de la absolución o de la desestimación, y • el acusado fue absuelto de todos los cargos; o • todos los cargos contra el acusado fueron desestimados (incluso después de una suspensión del dictado de la sentencia [suspended entry of judgment]), y la desestimación no formó parte de un acuerdo de culpabilidad en otro caso penal; o • todos los cargos contra el acusado se resolvieron mediante una combinación de lo anterior."
  },
  {
    "id": "2",
    "en": "A criminal case that was dismissed, because",
    "es": "Un caso penal que fue desestimado porque"
  },
  {
    "id": "2a",
    "en": "a judicial officer found no probable cause under Criminal Rule 4(a)(1) or 5(d).",
    "es": "un funcionario judicial determinó que no había causa probable conforme a Criminal Rule 4(a)(1) o 5(d)."
  },
  {
    "id": "2b",
    "en": "Defendant was a minor and was wrongly charged in adult court with an offense within the jurisdiction for delinquency proceedings under AS 47.12.020.",
    "es": "el acusado era menor de edad y fue acusado por error en un tribunal de adultos de un delito que correspondía a la jurisdicción de los procedimientos de delincuencia juvenil conforme a AS 47.12.020."
  },
  {
    "id": "3",
    "en": "A criminal or minor offense case that was dismissed, because",
    "es": "Un caso penal o de infracción menor (minor offense) que fue desestimado porque"
  },
  {
    "id": "3a",
    "en": "the prosecutor decided not to file a charging document.",
    "es": "la fiscalía decidió no presentar un documento de acusación."
  },
  {
    "id": "3b",
    "en": "there was an identity error under Criminal Rule 43(d) or Minor Offense Rule 11(c).",
    "es": "hubo un error de identidad conforme a Criminal Rule 43(d) o Minor Offense Rule 11(c)."
  },
  {
    "id": "4",
    "en": "A criminal case in which Defendant (1) received a suspended imposition of sentence (SIS), (2) completed the terms of the sentence, and (3) was acquitted of (or had dismissed or set aside) all other charges in the same case. [Attach proof of SIS and/or order setting aside.]",
    "es": "Un caso penal en el que el acusado (1) recibió una suspensión de la imposición de la sentencia (SIS), (2) cumplió los términos de la sentencia y (3) fue absuelto de todos los demás cargos del mismo caso (o estos fueron desestimados o anulados). [Adjunte prueba de la SIS, de la orden de anulación, o de ambas.]"
  },
  {
    "id": "5",
    "en": "A criminal or minor offense case in which all of the charges were one of the following underage alcohol offenses (or equivalent municipal ordinance): AS 04.16.049, AS 04.16.050, AS 04.16.060(g), AS 28.35.280, AS 28.35.285, or AS 28.35.290.",
    "es": "Un caso penal o de infracción menor en el que todos los cargos fueron alguno de los siguientes delitos relacionados con el alcohol cometidos por personas menores de la edad legal (o una ordenanza municipal equivalente): AS 04.16.049, AS 04.16.050, AS 04.16.060(g), AS 28.35.280, AS 28.35.285 o AS 28.35.290."
  },
  {
    "id": "6",
    "en": "A criminal case in which Defendant (1) was convicted for possessing less than one ounce of marijuana, (2) was at least 21 years old at the time of offense, and (3) was not convicted of any other criminal charges in the same case. [Conviction under current or prior version of AS 11.71.060 or equivalent municipal ordinance.]",
    "es": "Un caso penal en el que el acusado (1) fue condenado por poseer menos de una onza de marihuana, (2) tenía al menos 21 años en el momento del delito y (3) no fue condenado por ningún otro cargo penal en el mismo caso. [Condena conforme a la versión actual o anterior de AS 11.71.060 o una ordenanza municipal equivalente.]"
  },
  {
    "id": "7",
    "en": "A domestic violence, stalking, or sexual assault protective order case that is closed, and no protective order was issued at any time in the case.",
    "es": "Un caso de orden de protección por violencia doméstica, acecho (stalking) o agresión sexual que está cerrado y en el que nunca se emitió una orden de protección."
  },
  {
    "id": "8",
    "en": "A domestic violence protective order issued by a United States (US) federal court, another state or territorial court of the US, a tribal court in the US, or a US military tribunal.",
    "es": "Una orden de protección por violencia doméstica emitida por un tribunal federal de los Estados Unidos (EE. UU.), un tribunal de otro estado o territorio de EE. UU., un tribunal tribal en EE. UU. o un tribunal militar de EE. UU."
  },
  {
    "id": "9",
    "en": "Confidential or sealed by judicial order under Admin. Rule 37.6. [Attach copy of order.]",
    "es": "Confidencial o sellado por orden judicial conforme a Admin. Rule 37.6. [Adjunte una copia de la orden.]"
  },
  {
    "id": "10",
    "en": "Otherwise subject to removal from the public index by Alaska statute or court rule: [List specific rule or statute number.]",
    "es": "Sujeto de otro modo a retiro del índice público por una ley de Alaska o una regla judicial: [Indique el número específico de la regla o la ley.]"
  }
] as const;
export const AK_TF810_GROUND_BOXES: Readonly<Record<string, string>> = {
  "1": "Check Box1.0", "2": "Check Box2.0", "2a": "Check Box2.1", "2b": "Check Box2.2",
  "3": "Check Box3.0", "3a": "Check Box3.1", "3b": "Check Box3.2", "4": "Check Box4.0",
  "5": "Check Box5.0", "6": "Check Box6.0", "7": "Check Box7.0", "8": "Check Box8.0",
  "9": "Check Box8.1", "10": "Check Box8.2"
};
export function akCourtviewGroundInputs(answers: Record<string, unknown>) {
  const selectionsFromHeldFacts: Record<string, { checked: true; basis: string }> = {};
  const unresolvedIds: string[] = [];
  let rule: string | null = null;
  if (knownText(answers[AK_TF810_PUBLIC_ID]) !== "Yes") return { selectionsFromHeldFacts, unresolvedIds, rule };
  const ground = knownText(answers[AK_TF810_GROUND_ID]);
  if (!ground || !["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].includes(ground)) {
    return { selectionsFromHeldFacts, unresolvedIds: [AK_TF810_GROUND_ID], rule };
  }
  selectionsFromHeldFacts[AK_TF810_GROUND_BOXES[ground]] = { checked: true, basis: `Explicit participant answer ${AK_TF810_GROUND_ID}=${ground}; no eligibility inference.` };
  if (ground === "2" || ground === "3") {
    const id = `ak_tf810_ground_${ground}_detail`, detail = knownText(answers[id]);
    if (detail && [ground + "a", ground + "b"].includes(detail)) {
      selectionsFromHeldFacts[AK_TF810_GROUND_BOXES[detail]] = { checked: true, basis: `Explicit participant answer ${id}=${detail}.` };
    } else unresolvedIds.push(id);
  }
  if (ground === "10") {
    rule = knownText(answers.ak_tf810_ground_rule);
    if (rule === null) unresolvedIds.push("ak_tf810_ground_rule");
  }
  return { selectionsFromHeldFacts, unresolvedIds, rule };
}
export const AK_TF810_CONTACT_IDS = [AK_TF810_PUBLIC_ID, ...AK_TF810_CONTACT_FIELDS.map(f => f.id), ...AK_TF810_GROUND_IDS];
export function isAkCourtviewContact(state: string, pathwayId: string | null) {
  return state === "AK" && pathwayId === AK_COURTVIEW_PATHWAY;
}
function knownText(raw: unknown): string | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entry = raw as Record<string, unknown>;
    if (Object.keys(entry).some(k => k !== "value" && k !== "unknown") || entry.unknown !== false) return null;
    raw = entry.value;
  }
  return typeof raw === "string" && raw.trim() && !/^(?:unknown|i am not sure|not sure|no estoy seguro)$/i.test(raw.trim()) ? raw : null;
}
export type AkCourtviewSalesAnswers = Partial<Record<"screeningAnswers" | "prefilledAnswers" | "packetAnswers", Record<string, unknown>>>;

/** AK-TF810-SALES-POLICY: an explicit public case is necessary, never authority to charge. */
export function akCourtviewSalesPolicy(state: string, pathwayId: string | null, answers: AkCourtviewSalesAnswers) {
  if (!isAkCourtviewContact(state, pathwayId)) return null;
  const values = [answers.screeningAnswers, answers.prefilledAnswers, answers.packetAnswers]
    .filter(map => map && Object.hasOwn(map, AK_TF810_PUBLIC_ID))
    .map(map => knownText(map![AK_TF810_PUBLIC_ID]));
  const confirmed = values.length > 0 && values.every(value => value !== null && value === values[0]);
  if (confirmed && values[0] === "Yes") return { allowed: true as const };
  const notNeeded = confirmed && values[0] === "No";
  const conflicting = values.some(value => value !== values[0]);
  return {
    allowed: false as const,
    reason: notNeeded ? "ak_tf810_request_not_needed" : "ak_tf810_public_status_unconfirmed",
    guidance: notNeeded ? {
      en: "Because this case no longer appears on CourtView's public index, TF-810 is not needed for it. No payment is taken for this request.",
      es: "Como este caso ya no aparece en el índice público de CourtView, no se necesita el formulario TF-810 para este caso. No se cobra por esta solicitud."
    } : conflicting ? {
      en: "Your saved answers to this question do not match each other, so no payment is taken. Your answers have not been changed. Contact support for help.",
      es: "Sus respuestas guardadas para esta pregunta no coinciden entre sí, así que no se cobra. Sus respuestas no se han cambiado. Contacte a soporte para recibir ayuda."
    } : {
      en: "Check CourtView, the Alaska court system's public case search, for this case first. If it still appears there, come back and answer Yes. No payment is taken until you confirm that.",
      es: "Primero busque este caso en CourtView, la búsqueda pública de casos del sistema judicial de Alaska. Si todavía aparece, vuelva y responda Sí. No se cobra hasta que lo confirme."
    },
    qualifiedSpanishReview: "pending" as const
  };
}
// Exact standalone non-facts only: never inspect substrings, infer an address,
// require court approval for ordinary contact facts, or rewrite saved answers.
const UNAVAILABLE_CONTACT = ["none", "ninguno", "ninguna", "unavailable", "not available", "no disponible", "confidential", "confidencial"];
const NON_CONTACT_FACTS: Record<string, ReadonlySet<string>> = {
  ak_tf810_contact_address: new Set([...UNAVAILABLE_CONTACT, "no address", "no mailing address", "sin dirección", "sin dirección postal", "no tengo dirección"]),
  ak_tf810_contact_phone: new Set([...UNAVAILABLE_CONTACT, "no phone", "no phone number", "no telephone", "no telephone number", "sin teléfono", "sin número de teléfono", "no tengo teléfono"]),
  ak_tf810_contact_email: new Set([...UNAVAILABLE_CONTACT, "none", "no email", "no email address", "ninguno", "ninguna", "sin correo electrónico", "no tengo correo electrónico"])
};
export function akCourtviewContactText(id: string, raw: unknown): string | null {
  const value = knownText(raw);
  return value !== null && !NON_CONTACT_FACTS[id]?.has(value.trim().toLocaleLowerCase("en-US")) ? value : null;
}
export function akCourtviewContactAnswerState(
  state: string, pathwayId: string | null, id: string, raw: unknown,
  generic: "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined"
) {
  return isAkCourtviewContact(state, pathwayId) && Object.hasOwn(NON_CONTACT_FACTS, id)
    && generic === "known_valid" && akCourtviewContactText(id, raw) === null ? "invalid" : generic;
}
export function akCourtviewContactIds(state: string, pathwayId: string | null, answers: Record<string, unknown>, includeInactive = false): string[] {
  if (!isAkCourtviewContact(state, pathwayId)) return [];
  if (includeInactive) return [...AK_TF810_CONTACT_IDS];
  if (knownText(answers[AK_TF810_PUBLIC_ID]) !== "Yes") return [AK_TF810_PUBLIC_ID];
  const ground = knownText(answers[AK_TF810_GROUND_ID]);
  return [AK_TF810_PUBLIC_ID, ...AK_TF810_CONTACT_FIELDS.map(f => f.id), AK_TF810_GROUND_ID,
    ...(ground === "2" || ground === "3" ? [`ak_tf810_ground_${ground}_detail`] : []),
    ...(ground === "10" ? ["ak_tf810_ground_rule"] : [])];
}
const textQuestion = (id: string, prompt: string, helperText: string, es: string, esHelper: string, required: boolean): ProfileQuestion => ({
  id, stage: "packet_information", type: "text_or_unknown", required, contextOnly: false,
  lifecyclePhase: "postpay_official_form_field", options: null, prompt, helperText,
  translations: { es: { prompt: es, helperText: esHelper } }
});
function groundQuestion(id: string, choices: string[], promptId: string, helperText: string, esHelper: string): ProfileQuestion {
  const prompt = AK_TF810_GROUND_CHOICES.find(c => c.id === promptId)!;
  return { id, stage: "packet_information", type: "single_choice", required: true, contextOnly: false,
    lifecyclePhase: "postpay_official_form_field", prompt: prompt.en, helperText,
    translations: { es: { prompt: prompt.es, helperText: esHelper } }, options: [...choices, "I am not sure"],
    optionDisplay: Object.fromEntries([...AK_TF810_GROUND_CHOICES.filter(c => choices.includes(c.id)).map(c =>
      [c.id, { label: c.en, translations: { es: { label: c.es } } }]),
      ["I am not sure", { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }]]) };
}
const QUESTIONS: ProfileQuestion[] = [
  groundQuestion(AK_TF810_GROUND_ID, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], "lead-in",
    "Choose the printed ground you believe applies. Only your explicit choice marks the form; earlier screening answers never select it. An incomplete draft is not ready to file. For ground 4 you supply proof of SIS and/or the order setting aside; for ground 9 you supply the sealing or confidentiality order. Sign and date the form yourself; the clerk completes the Response block.",
    "Elija el motivo impreso que usted considere aplicable. Solo su elección explícita marca el formulario; las respuestas anteriores de la evaluación nunca lo seleccionan. Un borrador incompleto no está listo para presentarse. Para el motivo 4, usted aporta la prueba de la SIS, de la orden de anulación, o de ambas; para el motivo 9, usted aporta la orden de sellado o de confidencialidad. Firme y feche el formulario personalmente; la secretaría del tribunal completa el bloque de respuesta (Response)."),
  groundQuestion("ak_tf810_ground_2_detail", ["2a", "2b"], "2", "Select the printed reason for ground 2. No sub-choice is inferred from the main ground or earlier answers.",
    "Seleccione la razón impresa para el motivo 2. No se deduce ninguna subopción a partir del motivo principal ni de respuestas anteriores."),
  groundQuestion("ak_tf810_ground_3_detail", ["3a", "3b"], "3", "Select the printed reason for ground 3. No sub-choice is inferred from the main ground or earlier answers.",
    "Seleccione la razón impresa para el motivo 3. No se deduce ninguna subopción a partir del motivo principal ni de respuestas anteriores."),
  { id: "ak_tf810_ground_rule", stage: "packet_information", type: "text_or_unknown", required: true, contextOnly: false,
    lifecyclePhase: "postpay_official_form_field", options: null, prompt: "List specific rule or statute number.",
    helperText: "For ground 10, enter the specific Alaska rule or statute you rely on. It is copied as your answer, not supplied or verified by the platform. If unknown, leave the draft incomplete.",
    translations: { es: { prompt: "Indique el número específico de la regla o la ley.",
      helperText: "Para el motivo 10, indique la regla o ley específica de Alaska en la que se basa. Se copia como su respuesta; la plataforma no la proporciona ni la verifica. Si no la sabe, deje el borrador incompleto." } } },
  { id: AK_TF810_PUBLIC_ID, stage: "packet_information", type: "single_choice", required: false, contextOnly: false,
    lifecyclePhase: "postpay_official_form_field", options: ["Yes", "No", "I am not sure"],
    prompt: "Is this case still showing on the public CourtView website?",
    helperText: "TF-810 is a request to correct a case that should have been removed but still appears. Check the actual case. This answer does not establish a legal ground for removal or permission to file.",
    optionDisplay: { Yes: { label: "Yes", translations: { es: { label: "Sí" } } }, No: { label: "No", translations: { es: { label: "No" } } }, "I am not sure": { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } } },
    translations: { es: { prompt: "¿Este caso todavía aparece en el sitio web público de CourtView?",
      helperText: "TF-810 es una solicitud para corregir un caso que debería haberse retirado pero que todavía aparece. Verifique el caso real. Esta respuesta no establece un fundamento legal para retirarlo ni permiso para presentar la solicitud." } } },
  textQuestion("ak_tf810_case_number", "What is the case number for this TF-810 request?",
    "Copy the case number from the actual court record. If you do not know it, keep that answer; do not substitute another case number.",
    "¿Cuál es el número de caso para esta solicitud TF-810?",
    "Copie el número de caso del expediente judicial correspondiente. Si no lo conoce, conserve esa respuesta; no sustituya el número de otro caso.", true),
  textQuestion("ak_tf810_contact_address", "What address should appear for the person requesting removal on TF-810?",
    "Enter the requester’s contact address exactly as it should appear. Do not substitute the court address, residence history or arrest location. If unavailable, confidential or unknown, keep that answer and obtain the court’s applicable instructions; do not invent an address.",
    "¿Qué dirección debe aparecer en TF-810 para la persona que solicita retirar el caso?",
    "Ingrese la dirección de contacto de la persona solicitante tal como debe aparecer. No sustituya la dirección del tribunal, el historial de residencia ni el lugar del arresto. Si no está disponible, es confidencial o la desconoce, conserve esa respuesta y obtenga las instrucciones aplicables del tribunal; no invente una dirección.", true),
  textQuestion("ak_tf810_contact_phone", "What phone number should appear for the person requesting removal on TF-810?",
    "Use the requester’s actual contact number, including any extension. If there is no phone number or it is unknown, preserve that answer and check the court’s instructions. Do not use the court’s or another party’s number.",
    "¿Qué número de teléfono debe aparecer en TF-810 para la persona que solicita retirar el caso?",
    "Use el número de contacto real de la persona solicitante, incluida cualquier extensión. Si no tiene teléfono o desconoce el número, conserve esa respuesta y consulte las instrucciones del tribunal. No use el número del tribunal ni de otra parte.", true),
  textQuestion("ak_tf810_contact_email", "What email address, if any, does the requester choose to provide on TF-810?",
    "Email is optional. TF-810 says: “By providing an email address, you agree that the court and other parties can send court documents to you at this email address.” Leave it blank if you do not choose this delivery method. An account email or earlier contact answer is not selected automatically.",
    "¿Qué dirección de correo electrónico, si la hay, decide proporcionar la persona solicitante en TF-810?",
    "El correo electrónico es opcional. El formulario TF-810 dice (traducción): «Al proporcionar una dirección de correo electrónico, usted acepta que el tribunal y las demás partes puedan enviarle documentos judiciales a esta dirección de correo electrónico». Déjela en blanco si no elige este método de envío. No se selecciona automáticamente el correo de una cuenta ni una respuesta de contacto anterior.", false)
];
export function akCourtviewContactQuestions(state: string, pathwayId: string | null, answers: Record<string, unknown>, includeInactive = false,
  copies: AkCourtviewSalesAnswers = { packetAnswers: answers }): ProfileQuestion[] {
  const ids = new Set(akCourtviewContactIds(state, pathwayId, answers, includeInactive));
  const policy = akCourtviewSalesPolicy(state, pathwayId, copies);
  return QUESTIONS.filter(q => ids.has(q.id)).map(q => {
    const question = structuredClone(q);
    if (question.id === AK_TF810_PUBLIC_ID) {
      // A saved value outside the choices (e.g. an older Spanish label) stays saved;
      // the shared notice asks for an explicit current choice instead of guessing one.
      const saved = answers[AK_TF810_PUBLIC_ID];
      const text = saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, unknown>).value : saved;
      if (typeof text === "string" && text.trim() && !question.options!.includes(text)) question.savedAnswerNeedsClarification = true;
      if (policy?.allowed === false) {
        question.helperText += ` ${policy.guidance.en}`;
        question.translations!.es!.helperText += ` ${policy.guidance.es}`;
      }
    }
    return question;
  });
}

/** Resolve only explicit source-owned facts across protected maps. No parsing of
 * old aggregate contact/location, account identity, legal grounds or signatures. */
export function akCourtviewContactInputs(snapshot: {
  jurisdiction: string; pathwayId: string | null; selectedTrackId?: string | null;
  profileVersion: string; profileSourceFingerprint: string | null; profileAuthorityFingerprint: string | null;
  screeningAnswers: Record<string, unknown>; prefilledAnswers: Record<string, unknown>; packetAnswers: Record<string, unknown>;
}) {
  if (!isAkCourtviewContact(snapshot.jurisdiction, snapshot.pathwayId)
    || snapshot.selectedTrackId != null && snapshot.selectedTrackId !== "ak-courtview"
    || snapshot.profileVersion !== AK_TF810_CONTACT_SOURCE.profileVersion
    || snapshot.profileSourceFingerprint !== AK_TF810_CONTACT_SOURCE.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== AK_TF810_CONTACT_SOURCE.profileAuthorityFingerprint) return null;
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  const read = (id: string) => {
    const entries = maps.filter(m => Object.hasOwn(m, id)).map(m => knownText(m[id]));
    return entries.length && entries.every(value => value !== null && value === entries[0]) ? entries[0] : null;
  };
  if (read(AK_TF810_PUBLIC_ID) !== "Yes") return null;
  const writes = AK_TF810_CONTACT_FIELDS.flatMap(field => {
    const value = akCourtviewContactText(field.id, read(field.id));
    const destination = "participantKey" in field ? { participantKey: field.participantKey } : { matterKey: field.matterKey };
    return value === null ? [] : [{ factId: field.id, documentId: "TF-810", field: field.field, ...destination, value }];
  });
  const ground = akCourtviewGroundInputs(Object.fromEntries([AK_TF810_PUBLIC_ID, ...AK_TF810_GROUND_IDS].map(id => [id, read(id)])));
  return { source: AK_TF810_CONTACT_SOURCE,
    writes: [...writes, ...(ground.rule === null ? [] : [{ factId: "ak_tf810_ground_rule", documentId: "TF-810", field: "rule", matterKey: "ak_tf810_ground_rule", value: ground.rule }])],
    selectionsFromHeldFacts: ground.selectionsFromHeldFacts,
    unresolvedIds: [...AK_TF810_CONTACT_FIELDS.filter(field => !field.optional && !writes.some(w => w.factId === field.id)).map(f => f.id), ...ground.unresolvedIds],
    sourceCurrency: "existing_hold_preserved" as const, qualifiedSpanishReview: "pending" as const,
    generationAllowed: false as const, deliveryAllowed: false as const, admissionGranted: false as const };
}
