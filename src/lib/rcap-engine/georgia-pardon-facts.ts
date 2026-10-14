import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";

// GA-02: October 13 owner-relayed counsel adoption, superseding register SHA
// 4ffc56d4cc8dfa9b882f64ad51f49be815704fe20009ee7425b429418b54ead2.
// Preserve the historical wire identity; its felony wording is not eligibility.
export const GA_PARDON_ROUTE = "restriction-and-sealing-of-a-pardoned-felony";
export const GA_PARDON_OLD_LABEL = "Restriction and sealing of a pardoned felony";
export const GA_PARDON_LABEL = { en: "Restriction and sealing of a pardoned conviction", es: "Restricción y sellado de una condena indultada" };
export const GA_PARDON_SOURCE = "GA-02:2026-10-13;GA.memo:ga-pardon-j7;OCGA35-3-37(j)(7)";

/** Presentation correction only; retain original compiled source bytes and IDs. */
export function withGeorgiaPardonPresentation(profile: EngineProfile): EngineProfile {
  if (profile.jurisdiction.code !== "GA") return profile;
  return { ...profile, pathways: profile.pathways.map(p => p.id !== GA_PARDON_ROUTE ? p : {
    ...p, label: GA_PARDON_LABEL.en,
    summary: "A conviction pardoned by the Georgia State Board of Pardons and Paroles may be considered under section 35-3-37(j)(7). The exact offense exclusions, convictions since the pardon, pending charges and the court's balancing decision apply. A pardon alone does not establish eligibility."
  }) };
}
export function georgiaPardonDisplay(state: string | null | undefined, route: string | null | undefined, text: string) {
  return state === "GA" && route === GA_PARDON_ROUTE && [GA_PARDON_OLD_LABEL, GA_PARDON_LABEL.en].includes(text) ? GA_PARDON_LABEL : null;
}

// EN is the adopted Board-pardon question. ES and supplemental factual copy
// remain source-grounded draft strings, not an invented qualified translation.
type Option = [string, string, string];
const unknown: Option = ["unknown", "I am not sure", "No estoy seguro"];
const yesNo: Option[] = [["yes", "Yes", "Sí"], ["no", "No", "No"], unknown];
// Match a single final Georgia conviction citation, not an offense-name substring.
// Attempts, multiple counts, foreign citations and unparsed qualifications need
// record review; never silently discard text to manufacture an exact match.
export function georgiaConvictionCitation(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\u2010-\u2015]/g, "-");
  const match = /^(?:(?:O\.?C\.?G\.?A\.?|Georgia Code)\s*)?(?:§\s*)?(\d{1,2}-\d{1,2}-\d{1,3}(?:\.\d+)?)(\s*(?:\([a-zA-Z0-9.]+\)\s*)*)$/i.exec(normalized);
  return match ? { section: match[1], subsection: match[2].replace(/\s/g, "").toLowerCase() } : null;
}
function question(id: string, prompt: string, helperText: string, esPrompt: string, esHelper: string, options: Option[] | null, type = "single_choice"): PublicQuestion {
  return { id, stage: "pathway_routing", type, required: false, contextOnly: false,
    doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter", prompt, helperText,
    options: options?.map(([v]) => v) ?? null,
    ...(options ? { optionDisplay: Object.fromEntries(options.map(([v, label, es]) => [v, { label, translations: { es: { label: es } } }])) } : {}),
    translations: { es: { prompt: esPrompt, helperText: esHelper } } };
}
export const GA_PARDON_QUESTIONS: PublicQuestion[] = [
  question("ga_board_pardon", "Did the Georgia Board of Pardons and Paroles grant a pardon for this conviction? A pardon does not by itself guarantee that the record can be restricted.", "Check the actual pardon certificate. An application, restoration of rights or another kind of relief does not establish a Board pardon for this conviction.", "¿La Junta de Indultos y Libertad Condicional de Georgia concedió un indulto para esta condena? Un indulto por sí solo no garantiza que se pueda restringir el expediente.", "Consulte el certificado de indulto. Una solicitud, la restauración de derechos u otra medida no establece un indulto de la Junta para esta condena.", yesNo),
  question("ga_pardon_date", "On what date did the Board grant this pardon?", "Use the date on the pardon certificate, not the application date or the date you finished your sentence.", "¿En qué fecha concedió la Junta este indulto?", "Use la fecha del certificado de indulto, no la fecha de solicitud ni la fecha en que terminó su sentencia.", null, "date_or_unknown"),
  question("ga_pardoned_offense_section", "What exact Georgia Code section and subsection appear on the final conviction record?", "Copy the section and any subsection for the offense that was pardoned. Use the final conviction, including an amended charge, not the original arrest charge. Do not decide whether it is a legally excluded offense.", "¿Qué sección y subsección exactas del Código de Georgia aparecen en el documento de la condena final?", "Copie la sección y cualquier subsección del delito indultado. Use la condena final, incluido un cargo modificado, no el cargo original del arresto. No decida si el delito está legalmente excluido.", null, "text_or_unknown"),
  question("ga_convictions_since_pardon", "Since the Board granted this pardon, have you been convicted of any other offense in any jurisdiction?", "Include other states and federal courts. Report traffic convictions separately; the law excepts only nonserious traffic offenses. A pending charge is asked about separately.", "Desde que la Junta concedió este indulto, ¿ha sido condenado por otro delito en cualquier jurisdicción?", "Incluya otros estados y tribunales federales. Indique las condenas de tránsito por separado; la ley solo exceptúa infracciones de tránsito no graves. Los cargos pendientes se preguntan por separado.", [["none", "No other conviction since this pardon", "Ninguna otra condena desde este indulto"], ["traffic_only", "Traffic convictions only", "Solo condenas por infracciones de tránsito"], ["other", "At least one other conviction", "Al menos otra condena"], unknown]),
  question("ga_post_pardon_traffic_records", "What do the records show for each traffic conviction since this pardon?", "Include the offense, exact statute, jurisdiction and conviction date for each. Do not decide whether the offense is legally serious or nonserious.", "¿Qué indican los documentos de cada condena de tránsito desde este indulto?", "Incluya el delito, la disposición legal exacta, la jurisdicción y la fecha de cada condena. No decida si la infracción es legalmente grave o no grave.", null, "text_or_unknown"),
  question("ga_post_pardon_traffic_jurisdictions", "Were all of your traffic convictions since the pardon under Georgia state law?", "Use each final conviction record. A city ordinance or another state's law needs a separate comparison; do not classify the offense as serious or nonserious.", "¿Todas sus condenas de tránsito desde el indulto fueron conforme a la ley estatal de Georgia?", "Consulte cada documento de condena final. Una ordenanza municipal o la ley de otro estado requiere una comparación por separado; no clasifique la infracción como grave o no grave.", [["all_georgia", "All were under Georgia state law", "Todas fueron conforme a la ley estatal de Georgia"], ["other_jurisdiction", "At least one was under another law", "Al menos una fue conforme a otra ley"], unknown]),
  question("ga_post_pardon_traffic_citations", "What exact Georgia Code sections and subsections cover every traffic conviction since the pardon?", "Copy every final conviction citation, separated by commas or semicolons, including repeated convictions. For example: 40-6-181(b)(2). Keep offense names and dates in the traffic records answer. Do not omit a conviction because you consider it minor.", "¿Qué secciones y subsecciones exactas del Código de Georgia corresponden a todas sus condenas de tránsito desde el indulto?", "Copie cada referencia de condena final, separada por comas o puntos y coma, incluidas las condenas repetidas. Por ejemplo: 40-6-181(b)(2). Mantenga los nombres de las infracciones y las fechas en la respuesta sobre los antecedentes de tránsito. No omita una condena por considerarla menor.", null, "text_or_unknown"),
  question("ga_pardon_statutory_rape_age", "How old were you when the statutory-rape offense happened?", "Use your age at the time of that offense, not your current age or age when the pardon was granted. Do not enter the other person's name or date of birth.", "¿Qué edad tenía cuando ocurrió el delito de relaciones sexuales con una persona menor de la edad legal de consentimiento (statutory rape)?", "Use su edad en el momento de ese delito, no su edad actual ni su edad cuando se concedió el indulto. No ingrese el nombre ni la fecha de nacimiento de la otra persona.", [["under21", "Under 21", "Menos de 21 años"], ["21_or_older", "21 or older", "21 años o más"], unknown]),
  question("ga_pardon_pending_charges", "Are any criminal charges currently pending against you?", "Include charges in any jurisdiction. A pardon of this conviction does not resolve a different pending charge.", "¿Tiene actualmente algún cargo penal pendiente?", "Incluya cargos en cualquier jurisdicción. El indulto de esta condena no resuelve otro cargo pendiente.", yesNo),
  question("ga_pardon_assault_rape_intent", "Does the final aggravated-assault conviction include intent to rape?", "Use the final conviction record, not an earlier allegation. Other forms of aggravated assault are not automatically this sexual-offense exclusion.", "¿La condena final por agresión agravada incluye la intención de violar?", "Use el documento de la condena final, no una alegación anterior. Otras formas de agresión agravada no constituyen automáticamente esta exclusión por delito sexual.", yesNo),
  question("ga_pardon_imprisonment_under14", "Was the person held in the false-imprisonment offense under age 14?", "Use the person's age at the time of that offense. Do not enter the person's name or birth date.", "¿La persona retenida en el delito de privación ilegal de libertad era menor de 14 años?", "Use la edad de la persona en el momento del delito. No ingrese su nombre ni su fecha de nacimiento.", yesNo),
  question("ga_pardon_imprisonment_own_child", "Was the person held your child?", "This question concerns the relationship at the time of the false-imprisonment offense.", "¿La persona retenida era su hijo o hija?", "Esta pregunta se refiere a la relación en el momento del delito de privación ilegal de libertad.", yesNo),
  question("ga_pardon_sexual_battery_repeat", "Was this your second or later conviction for sexual battery?", "Use the sequence of sexual-battery convictions, including convictions before the pardon. Do not count an arrest that did not result in conviction.", "¿Fue esta su segunda condena o una condena posterior por agresión sexual (sexual battery)?", "Use el orden de las condenas por ese delito, incluidas las anteriores al indulto. No cuente un arresto que no terminó en condena.", yesNo)
];
export const GA_PARDON_FACT_IDS = GA_PARDON_QUESTIONS.map(q => q.id);
export function georgiaPardonRequested(a: Record<string, unknown>, pathway?: string | null) {
  // The factual route outranks an optional historical label. In particular,
  // an established First Offender journey must not gain pardon questions.
  if (pathway) return pathway === GA_PARDON_ROUTE;
  return a.ga_record_help === "pardon_record" || a.ga_record_help === undefined &&
    a.ga_original_first_offender !== "yes" &&
    [GA_PARDON_ROUTE, GA_PARDON_OLD_LABEL, GA_PARDON_LABEL.en].includes(String(a.possible_pathway_context));
}
export function georgiaPardonQuestionApplies(state: string, a: Record<string, unknown>, id: string, pathway?: string | null) {
  if (state !== "GA" || !GA_PARDON_FACT_IDS.includes(id)) return true;
  if (!georgiaPardonRequested(a, pathway)) return false;
  if (id === "ga_board_pardon") return true;
  if (a.ga_board_pardon !== "yes") return false;
  // Packet Information retains explicit-known wrappers; screening uses scalar
  // answers. Apply the same conditional visibility to both representations.
  const rawCitation = a.ga_pardoned_offense_section;
  const citation = rawCitation && typeof rawCitation === "object" && !Array.isArray(rawCitation)
    ? ((rawCitation as {unknown?: unknown}).unknown === false ? (rawCitation as {value?: unknown}).value : undefined)
    : rawCitation;
  const section = georgiaConvictionCitation(citation)?.section;
  if (id === "ga_pardon_statutory_rape_age") return section === "16-6-3";
  if (id === "ga_pardon_assault_rape_intent") return section === "16-5-21";
  if (id === "ga_pardon_imprisonment_under14") return section === "16-5-41";
  if (id === "ga_pardon_imprisonment_own_child") return section === "16-5-41" && a.ga_pardon_imprisonment_under14 === "yes";
  if (id === "ga_pardon_sexual_battery_repeat") return section === "16-6-22.1";
  if (["ga_post_pardon_traffic_records", "ga_post_pardon_traffic_jurisdictions"].includes(id)) return a.ga_convictions_since_pardon === "traffic_only";
  if (id === "ga_post_pardon_traffic_citations") return a.ga_convictions_since_pardon === "traffic_only" && a.ga_post_pardon_traffic_jurisdictions === "all_georgia";
  return true;
}
export const GA_PARDON_COPY = {
  excluded_offense: ["The final conviction and facts you reported match an offense excluded from this pardon procedure under sections 17-10-6.1 or 17-10-6.2. Check and correct the final conviction facts if necessary. This result does not decide every other remedy.", "La condena final y los datos que indicó corresponden a un delito excluido de este procedimiento de indulto conforme a las secciones 17-10-6.1 o 17-10-6.2. Revise y corrija los datos de la condena final si es necesario. Este resultado no determina todos los demás recursos."],
  citation_review: ["The final conviction citation needs review. Enter one exact Georgia Code section and its subsection from the final conviction record. An offense name, multiple citations or an attempted-offense description is not enough to apply these exclusions.", "La referencia legal de la condena final requiere revisión. Ingrese una sección exacta del Código de Georgia y su subsección según el documento de la condena final. El nombre de un delito, varias referencias o la descripción de una tentativa no bastan para aplicar estas exclusiones."],
  exception_review: ["This offense has a specific age, subsection or other exception that the supplied conviction record does not yet resolve. Review the exact final disposition and exception before continuing; a broad offense label does not establish exclusion or eligibility.", "Este delito tiene una excepción específica de edad, subsección u otra condición que el documento de condena proporcionado aún no resuelve. Revise la resolución final exacta y la excepción antes de continuar; una etiqueta general del delito no establece exclusión ni elegibilidad."],
  offense_class_conflict: ["The reported conviction class conflicts with the supplied offense or exception citation. Check the final disposition and explicitly correct the class or Code section. Neither saved answer has been discarded.", "La clase de condena indicada contradice la referencia proporcionada al delito o a la excepción. Consulte la resolución final y corrija expresamente la clase o la sección del Código. No se ha descartado ninguna respuesta guardada."],
  court_review: ["The reported conviction does not match the listed offense exclusions, and you reported no later convictions or pending charges. The court still decides whether the harm to you clearly outweighs the public interest in access to the record. This screening is not a court finding or authorization to buy or generate a packet.", "La condena indicada no corresponde a las exclusiones de delitos enumeradas, y usted indicó que no tiene condenas posteriores ni cargos pendientes. El tribunal aún debe decidir si el perjuicio para usted supera claramente el interés público en el acceso al expediente. Esta evaluación no es una decisión judicial ni una autorización para comprar o generar un paquete."],
  court_review_traffic: ["The reported conviction does not match the listed offense exclusions. The supplied Georgia traffic citations fall within the nonserious traffic exception, and you reported no pending charges. The court still decides whether the harm to you clearly outweighs the public interest in access to the record. This screening is not a court finding or authorization to buy or generate a packet.", "La condena indicada no corresponde a las exclusiones de delitos enumeradas. Las referencias de tránsito de Georgia proporcionadas corresponden a la excepción para infracciones de tránsito no graves, y usted indicó que no tiene cargos pendientes. El tribunal aún debe decidir si el perjuicio para usted supera claramente el interés público en el acceso al expediente. Esta evaluación no es una decisión judicial ni una autorización para comprar o generar un paquete."],
  classification: ["Check the final conviction record and correct how the case ended. Both misdemeanor and felony convictions may be considered under this pardon procedure; a generic pardon label does not identify the conviction class.", "Consulte el documento de la condena final y corrija cómo terminó el caso. Tanto las condenas por delitos menores como por delitos graves pueden considerarse conforme a este procedimiento de indulto; una etiqueta general de indulto no identifica la clase de condena."],
  missing: ["Check the requested facts from the Board pardon and conviction records. The saved generic pardon answer does not establish a Board pardon, its date or the conditions for this procedure.", "Revise los datos solicitados en los documentos del indulto de la Junta y de la condena. La respuesta general guardada sobre un indulto no establece un indulto de la Junta, su fecha ni las condiciones de este procedimiento."],
  no_board_pardon: ["This procedure requires a pardon granted by the Georgia Board of Pardons and Paroles for this conviction. Another form of relief or a pending pardon application does not establish that requirement.", "Este procedimiento exige un indulto concedido por la Junta de Indultos y Libertad Condicional de Georgia para esta condena. Otra medida o una solicitud de indulto pendiente no establece ese requisito."],
  later_conviction: ["The reported conviction since the pardon does not satisfy this procedure's condition concerning later convictions. Traffic-only records are considered separately; this does not decide every other record-clearing option.", "La condena indicada después del indulto no cumple la condición de este procedimiento sobre condenas posteriores. Los antecedentes que solo contienen infracciones de tránsito se consideran por separado; esto no determina todas las demás opciones para limpiar los antecedentes."],
  pending: ["This procedure requires no pending criminal charges. Review the pending charge's actual disposition before continuing.", "Este procedimiento exige que no haya cargos penales pendientes. Revise la resolución real del cargo pendiente antes de continuar."],
  record_review: ["The exact conviction and any later traffic convictions still need to be checked against this procedure's exclusions and exceptions. The court also decides whether the harm to you outweighs the public interest in access to the record. No eligibility or court finding is inferred from a pardon alone.", "La condena exacta y cualquier condena posterior de tránsito todavía deben compararse con las exclusiones y excepciones de este procedimiento. El tribunal también decide si el perjuicio para usted supera el interés público en el acceso al expediente. Un indulto por sí solo no permite inferir que cumple los requisitos ni una decisión judicial."],
  conflict: ["The saved answers about pending charges conflict. Correct the case facts explicitly; neither answer has been discarded.", "Las respuestas guardadas sobre cargos pendientes se contradicen. Corrija los datos del caso expresamente; ninguna respuesta se ha descartado."]
} as const;
type Decision = { status: "missing" | "review" | "excluded"; code: keyof typeof GA_PARDON_COPY; ids: string[] };
/** Source: https://www.legis.ga.gov/api/document/docs/default-source/joint-features-document-library/t17-(v15)-pdf.pdf pp130–131;
 * https://www.legis.ga.gov/api/document/docs/default-source/joint-features-document-library/t16-ch1-6-(v14)-pdf.pdf pp185–186;
 * https://www.legis.ga.gov/api/document/docs/default-source/joint-features-document-library/t16-ch12-17-(v14b)-2024-pdf.pdf pp99–100.
 * Adopted GA-02, O.C.G.A. 17-10-6.1(a), 17-10-6.2(a).
 * Exact record exceptions stay separate from a court's sentencing departure.
 * A mismatch never rewrites the participant's original conviction class.
 */
export function georgiaPardonOffense(a: Record<string, unknown>): "not_listed" | "excluded" | "exception_review" | "citation_review" | "offense_class_conflict" {
  const citation = georgiaConvictionCitation(a.ga_pardoned_offense_section);
  if (!citation) return "citation_review";
  const { section, subsection } = citation;
  const felony = a.case_outcome === "Felony conviction";
  const misdemeanor = a.case_outcome === "Misdemeanor conviction";
  const felonyExclusion = felony ? "excluded" : "offense_class_conflict";
  if (["16-5-1", "16-8-41", "16-5-40", "16-6-1", "16-6-22.2"].includes(section)) return felony ? "excluded" : "offense_class_conflict";
  if (section === "16-5-21") return a.ga_pardon_assault_rape_intent === "yes" ? felonyExclusion : a.ga_pardon_assault_rape_intent === "no" ? "not_listed" : "exception_review";
  if (section === "16-5-41") {
    if (a.ga_pardon_imprisonment_under14 === "no" || a.ga_pardon_imprisonment_own_child === "yes") return "not_listed";
    return a.ga_pardon_imprisonment_under14 === "yes" && a.ga_pardon_imprisonment_own_child === "no" ? felonyExclusion : "exception_review";
  }
  if (section === "16-6-22.1") return a.ga_pardon_sexual_battery_repeat === "yes" ? "excluded" : a.ga_pardon_sexual_battery_repeat === "no" ? "not_listed" : "exception_review";
  if (section === "16-6-22") return felonyExclusion;
  const exceptions: Record<string, string[]> = { "16-6-2": ["(d)"], "16-6-4": ["(b)(2)", "(d)(2)"], "16-6-5": ["(c)"] };
  if (exceptions[section]) {
    if (exceptions[section].includes(subsection)) return misdemeanor ? "not_listed" : "offense_class_conflict";
    if (felony) return "excluded";
    return "exception_review";
  }
  // §17-10-6.2(a)(4) uses the offender's age, not the offense label alone.
  if (section === "16-6-3") {
    if (subsection === "(c)") return misdemeanor && a.ga_pardon_statutory_rape_age === "under21" ? "not_listed" : "offense_class_conflict";
    return a.ga_pardon_statutory_rape_age === "21_or_older" ? felonyExclusion : a.ga_pardon_statutory_rape_age === "under21" ? "not_listed" : "exception_review";
  }
  // Match the actual disposition's punishment subsection. Broad labels and
  // historical subsection (f)(2), revised in 2021, do not resolve its exception.
  if (section === "16-6-5.1") {
    if (["(f)(2)(a)", "(g)(2)"].includes(subsection)) return misdemeanor ? "not_listed" : "offense_class_conflict";
    if (["(f)(1)", "(f)(2)(b)", "(g)(1)", "(g)(3)"].includes(subsection)) return felonyExclusion;
    return "exception_review";
  }
  // §17-10-6.2(a)(10) expressly excepts both §16-12-100(f)(2) and (3).
  if (section === "16-12-100") {
    if (["(c)", "(f)(2)", "(f)(3)"].includes(subsection)) return misdemeanor ? "not_listed" : "offense_class_conflict";
    return felony ? "excluded" : "exception_review";
  }
  return "not_listed";
}
/** Source: https://gov.georgia.gov/document/2020-signed-legislation/sb-288/download;
 * https://www.legis.ga.gov/api/document/docs/default-source/joint-features-document-library/t40-ch6-16-(v29)-2018-pdf.pdf pp153–154 and Article15;
 * https://www.legis.ga.gov/api/document/docs/default-source/joint-features-document-library/t40-ch6-16-(v29)-pdf.pdf Article15.
 * §35-3-37(a)(4),(j)(7): a bare "traffic only" answer is not the exception.
 * Exact current Georgia offense sections only. The source-backed positive
 * subset is Article9 §§40-6-180/181 (basic/maximum speed); names, foreign
 * equivalents, unknown sections and procedural Article15 citations need review.
 * Never parse or rewrite the participant's preserved narrative to infer facts.
 */
export function georgiaPardonTraffic(a: Record<string, unknown>): "nonserious" | "serious" | "review" {
  if (a.ga_post_pardon_traffic_jurisdictions !== "all_georgia" || typeof a.ga_post_pardon_traffic_citations !== "string") return "review";
  const entries = a.ga_post_pardon_traffic_citations.split(/[,;\n]/).map(s => georgiaConvictionCitation(s));
  if (!entries.length || entries.some(c => !c)) return "review";
  // Article15 prohibitions, excluding procedural/evidentiary/forfeiture sections.
  const serious = ["40-6-390", "40-6-390.1", "40-6-391", "40-6-393", "40-6-393.1", "40-6-394", "40-6-395", "40-6-397"];
  if (entries.some(c => c && serious.includes(c.section))) return "serious";
  const speedSubsections = ["", "(a)", "(b)", "(b)(1)", "(b)(1.1)", "(b)(2)", "(b)(3)", "(b)(4)", "(b)(5)", "(c)"];
  return entries.every(c => c && (c.section === "40-6-180" && c.subsection === "" || c.section === "40-6-181" && speedSubsections.includes(c.subsection))) ? "nonserious" : "review";
}
export function georgiaPardonFacts(a: Record<string, unknown>, today: string): Decision {
  const fail = (status: Decision["status"], code: Decision["code"], ids: string[] = []): Decision => ({ status, code, ids });
  if (!["Misdemeanor conviction", "Felony conviction"].includes(String(a.case_outcome))) {
    return fail("missing", "classification", ["case_outcome"]);
  }
  if (a.ga_board_pardon === "no") return fail("review", "no_board_pardon");
  if (a.ga_board_pardon !== "yes") return fail("missing", "missing", ["ga_board_pardon"]);
  // The evaluator has already selected this route, including normalized legacy
  // context labels. Do not reselect it using the raw, historical label.
  const missing = GA_PARDON_QUESTIONS.filter(q => georgiaPardonQuestionApplies("GA", a, q.id, GA_PARDON_ROUTE)).filter(q => {
    const v = a[q.id];
    if (Array.isArray(q.options)) return typeof v !== "string" || !q.options.includes(v) || v === "unknown";
    if (typeof v !== "string" || !v.trim() || /^(unknown|i am not sure)$/i.test(v.trim())) return true;
    if (q.type !== "date_or_unknown") return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return true;
    const d = new Date(v + "T00:00:00.000Z");
    return !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== v || v > today;
  }).map(q => q.id);
  if (missing.length) return fail("missing", "missing", missing);
  if (["Yes", true].includes(a.pending_cases as string | boolean) && a.ga_pardon_pending_charges === "no"
    || ["No", false].includes(a.pending_cases as string | boolean) && a.ga_pardon_pending_charges === "yes") return fail("review", "conflict", ["pending_cases", "ga_pardon_pending_charges"]);
  if (a.ga_convictions_since_pardon === "other") return fail("excluded", "later_conviction");
  if (a.ga_pardon_pending_charges === "yes") return fail("excluded", "pending");
  const offense = georgiaPardonOffense(a);
  if (offense === "excluded") return fail("excluded", "excluded_offense");
  if (offense !== "not_listed") return fail("review", offense, ["ga_pardoned_offense_section", "case_outcome"]);
  if (a.ga_convictions_since_pardon === "traffic_only") {
    const traffic = georgiaPardonTraffic(a);
    if (traffic === "serious") return fail("excluded", "later_conviction");
    return fail("review", traffic === "nonserious" ? "court_review_traffic" : "record_review");
  }
  return fail("review", "court_review");
}
