import { NY_FUTURE_ID, NY_FUTURE_CONTRACT, NY_FUTURE_FACT_IDS, nyFutureReferences, nyFutureApplicationsIssues } from "@/lib/expungement-ai/ny-16059-future-applications";
import { NY_SEALING_HISTORY_ID, NY_SEALING_HISTORY_CONTRACT, nySealingHistoryIssues, nyKnownPrior16058Application } from "@/lib/expungement-ai/ny-16059-sealing-history";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { NY_CASE_RECORDS_ID, NY_CASE_RECORDS_CONTRACT, NY_STATEMENT_ID, NY_STATEMENT_CONTRACT, parseNyCourtCaseRecords, nyCourtCaseRecordsState, nyApplicantStatementState } from "@/lib/expungement-ai/ny-16059-case-records";
import { nyPacketTextAnswerState } from "@/lib/expungement-ai/ny-16059-packet-facts";
import { nyClassificationAnswerCurrent } from "@/lib/expungement-ai/ny-16059-case-classification";
import { nyFilingVenueComparison } from "@/lib/expungement-ai/ny-16059-filing-venue";
import { nyStatutoryClassCoherent } from "@/lib/expungement-ai/ny-16059-statutory-class";

export const NY_CASE_COURT_TEXT_CONTRACT = "ny_16059_case_court_text_v1" as const;
export const NY_FILING_CASE_ID = "ny_16059_filing_case_id";
export const NY_OTHER_COURT_NAME = "ny_16059_other_filing_court_name";
export const NY_OTHER_COURT_COUNTY = "ny_16059_other_filing_court_county";
export const NY_CASE_RECONCILIATION_ID = "ny_16059_additional_case_reconciliation";
export const NY_PRE_VENUE_CASE_FACT_IDS = [NY_CASE_RECORDS_ID, NY_FILING_CASE_ID, NY_OTHER_COURT_NAME, NY_OTHER_COURT_COUNTY, NY_STATEMENT_ID, NY_CASE_RECONCILIATION_ID];
export const NY_COURT_DIRECTION_TEXT_IDS = ["ny_16059_court_direction_issuer", "ny_16059_court_direction_date_reference", "ny_16059_court_direction_instruction"];
export const NY_COURT_DIRECTION_CASES_ID = "ny_16059_court_direction_cases";
export const NY_COURT_DIRECTION_BASIS_ID = "ny_16059_court_direction_basis";
export const NY_COURT_DIRECTION_CONFIRMATION_ID = "ny_16059_court_direction_confirmation";
export const NY_VENUE_FACT_IDS = [NY_COURT_DIRECTION_BASIS_ID, ...NY_COURT_DIRECTION_TEXT_IDS, NY_COURT_DIRECTION_CASES_ID, NY_COURT_DIRECTION_CONFIRMATION_ID];
export const NY_HISTORY_FACT_IDS = [NY_SEALING_HISTORY_ID];
export const NY_CASE_FACT_IDS = [...NY_PRE_VENUE_CASE_FACT_IDS, ...NY_VENUE_FACT_IDS, ...NY_HISTORY_FACT_IDS, ...NY_FUTURE_FACT_IDS];
const question = (id: string, type: string, prompt: string, helperText: string, esPrompt: string, esHelper: string): ProfileQuestion => ({
  id, type, stage: "packet_information", contextOnly: false, required: true, options: null, prompt, helperText,
  translations: { es: { prompt: esPrompt, helperText: esHelper } }
});
export function nyCasePreparationQuestions(answers: Readonly<Record<string, unknown>> = {}): ProfileQuestion[] {
  const held = (id: string) => {
    const raw = answers[id];
    if (nyPacketTextAnswerState(id, raw) !== "known_valid") return undefined;
    return typeof raw === "string" ? raw : (raw as { value: string }).value;
  };
  const records = parseNyCourtCaseRecords(answers[NY_CASE_RECORDS_ID]) ?? [];
  const issues = nyCaseAssociationIssues(answers);
  const possibleDuplicate = nyHasPossibleDuplicateCases(answers);
  const duplicateCopy = { en: "Some entries have the same case numbers, court and county. Check whether they are distinct actual cases that share identifiers. Keep both only after reviewing that distinction. If they describe the same actual case, keep its convictions together in one entry; no entries are combined automatically.",
    es: "Algunas entradas tienen los mismos números de caso, tribunal y condado. Compruebe si son casos reales distintos que comparten identificadores. Conserve ambas solo después de revisar esa distinción. Si describen el mismo caso real, mantenga sus condenas juntas en una entrada; no se combinarán entradas automáticamente." };
  const filing = question(NY_FILING_CASE_ID, "single_choice", "Which court will receive this application?",
    "Choose the court of the covered case identified by the form's Where To File instructions, or record a different filing court. Your choice does not establish that the court is legally correct.",
    "¿Qué tribunal recibirá esta solicitud?", "Elija el tribunal del caso incluido que corresponda según las instrucciones del formulario sobre dónde presentar la solicitud, o indique otro tribunal. Su elección no establece que el tribunal sea legalmente correcto.");
  const display = (value: string, en: string, es: string) => nyApplicantStatementState(value) === "known_valid" ? { en: value, es: value } : { en, es };
  filing.options = [...records.map(record => `case:${record.id}`), "different_court", "unknown"];
  filing.optionDisplay = Object.fromEntries(records.map(record => [`case:${record.id}`, {
    label: `${display(record.courtName, "Court not recorded", "Tribunal no registrado").en} — ${display(record.caseNumbers, "Case numbers not recorded", "Números de caso no registrados").en}`,
    translations: { es: { label: `${display(record.courtName, "Court not recorded", "Tribunal no registrado").es} — ${display(record.caseNumbers, "Case numbers not recorded", "Números de caso no registrados").es}` } }
  }]));
  filing.optionDisplay.different_court = { label: "A different filing court", translations: { es: { label: "Otro tribunal para presentar la solicitud" } } };
  filing.optionDisplay.unknown = { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } };
  const directionBasis = question(NY_COURT_DIRECTION_BASIS_ID, "single_choice", "Why is the filing court different from the recorded conviction courts?",
    "Record the actual reason for review. Court assignment after filing and the court where an application is first filed are separate matters. A saved explanation does not approve the destination.",
    "¿Por qué el tribunal de presentación es distinto de los tribunales de las condenas?", "Indique el motivo real para su revisión. La asignación después de presentar una solicitud y el tribunal donde se presenta inicialmente son cuestiones distintas. Guardar una explicación no aprueba el destino.");
  const bases = { court_direction: ["An actual court instruction or order", "Una instrucción u orden real del tribunal"], same_court_name: ["Another name for the same court", "Otro nombre del mismo tribunal"], other: ["Another reason", "Otro motivo"], unknown: ["I am not sure", "No estoy seguro"] };
  directionBasis.options = Object.keys(bases);
  directionBasis.optionDisplay = Object.fromEntries(Object.entries(bases).map(([value, labels]) => [value, { label: labels[0], translations: { es: { label: labels[1] } } }]));
  const directionCases = question(NY_COURT_DIRECTION_CASES_ID, "multi_select", "Which recorded cases does that instruction or explanation concern?", "Select the actual case entries. Keep the other case records; this selection does not combine cases or establish a legal conviction count.",
    "¿A qué casos registrados se refiere esa instrucción o explicación?", "Seleccione las entradas de los casos reales. Conserve los demás expedientes; esta selección no combina casos ni establece un número legal de condenas.");
  directionCases.options = records.map(record => `case:${record.id}`);
  directionCases.optionDisplay = Object.fromEntries(records.map(record => [`case:${record.id}`, filing.optionDisplay![`case:${record.id}`]]));
  const directionConfirmation = question(NY_COURT_DIRECTION_CONFIRMATION_ID, "single_choice", "Have you reviewed this destination and its supporting information against the current cases?",
    "Confirm only what you have recorded, including any unknown details. This sends no request to a court and does not approve the destination. Review again if the destination, instruction or cases change.",
    "¿Ha revisado este destino y sus datos de respaldo con los casos actuales?", "Confirme solo lo que ha registrado, incluidos los detalles desconocidos. Esto no envía una solicitud a un tribunal ni aprueba el destino. Revise de nuevo si cambian el destino, la instrucción o los casos.");
  const directionToken = nyCourtDirectionConfirmation(answers);
  directionConfirmation.options = [...(directionToken ? [directionToken] : []), "unknown"];
  directionConfirmation.optionDisplay = { ...(directionToken ? { [directionToken]: { label: "I reviewed these saved facts for review", translations: { es: { label: "Revisé estos datos guardados para su revisión" } } } } : {}), unknown: { label: "I still need to check", translations: { es: { label: "Todavía necesito revisarlo" } } } };
  const reconciliation = question(NY_CASE_RECONCILIATION_ID, "single_choice", "Have you matched every saved additional-case number to the case cards?",
    `Review the earlier additional-case text against all the cards. Correct either answer if anything is missing or wrong. Saved additional-case text: ${held("ny_16059_additional_case_numbers") ?? "Not recorded"}`,
    "¿Ha asociado cada número guardado de los casos adicionales con las tarjetas de los casos?",
    `Compare el texto anterior de los casos adicionales con todas las tarjetas. Corrija cualquier respuesta si falta algo o es incorrecto. Texto guardado de casos adicionales: ${held("ny_16059_additional_case_numbers") ?? "No registrado"}`);
  if (possibleDuplicate) {
    reconciliation.helperText += ` ${duplicateCopy.en}`;
    reconciliation.translations!.es!.helperText += ` ${duplicateCopy.es}`;
  }
  const confirmation = nyAdditionalCaseConfirmation(answers);
  reconciliation.options = [...(confirmation ? [confirmation] : []), "unknown"];
  reconciliation.optionDisplay = { ...(confirmation ? { [confirmation]: { label: "I reviewed the saved numbers and every additional case is listed correctly", translations: { es: { label: "Revisé los números guardados y todos los casos adicionales están enumerados correctamente" } } } } : {}), unknown: { label: "I still need to check", translations: { es: { label: "Todavía necesito revisarlo" } } } };
  return [
    { ...question(NY_FUTURE_ID, "future_applications", "Review each intended future sealing application", "Record the law or laws and each actual case for every intended application. Keep future plans separate from already filed applications and the convictions included in this request. Recording intent does not establish eligibility or file another application.", "Revise cada solicitud de sellado futura prevista", "Indique la ley o las leyes y cada caso real de todas las solicitudes previstas. Mantenga los planes futuros separados de las solicitudes ya presentadas y de las condenas incluidas en esta solicitud. Registrar la intención no establece la elegibilidad ni presenta otra solicitud."), answerContract: NY_FUTURE_CONTRACT, futureApplicationReferences: nyFutureReferences(answers) },
    { ...question(NY_SEALING_HISTORY_ID, "sealing_history", "Review earlier sealing applications and entered orders", "Keep applications under CPL 160.58 and CPL 160.59 separate from the orders actually entered. Reuse your saved application and granted-order answers, and correct any disagreement. Missing copies can be obtained later; saving these facts does not attach or sign documents.",
      "Revise las solicitudes de sellado anteriores y las órdenes concedidas", "Mantenga separadas las solicitudes bajo CPL 160.58 y CPL 160.59 de las órdenes realmente concedidas. Use sus respuestas guardadas y corrija cualquier discrepancia. Las copias faltantes pueden obtenerse después; guardar estos datos no adjunta ni firma documentos."), answerContract: NY_SEALING_HISTORY_CONTRACT, ...(nyKnownPrior16058Application(answers) ? { prior16058ApplicationKnown: true as const } : {}) },
    { ...question(NY_CASE_RECORDS_ID, "court_case_records", "Review each court case covered by this application",
      "Keep each actual case with its court, convictions, sentence events and certificate information. Include every case even if related cases may be counted together. Do not copy a date from another case or from probation or parole completion.",
      "Revise cada caso judicial incluido en esta solicitud", "Mantenga cada caso real con su tribunal, condenas, sentencias e información del certificado. Incluya todos los casos aunque algunos relacionados puedan contarse juntos. No copie fechas de otro caso ni de la finalización de la libertad condicional o supervisada."),
      answerContract: NY_CASE_RECORDS_CONTRACT,
      ...(issues.length || possibleDuplicate ? { helperText: [...issues.map(issue => issue.en), ...(possibleDuplicate ? [duplicateCopy.en] : [])].join(" "), translations: { es: { prompt: "Revise cada caso judicial incluido en esta solicitud", helperText: [...issues.map(issue => issue.es), ...(possibleDuplicate ? [duplicateCopy.es] : [])].join(" ") } } } : {}),
      caseRecordReferences: { firstCaseNumbers: held("ny_16059_first_case_numbers"), additionalCaseNumbers: held("ny_16059_additional_case_numbers") } },
    filing,
    { ...question(NY_OTHER_COURT_NAME, "text_or_unknown", "What is the name of the different court receiving this application?", "Use the actual filing destination. Keep the courts that handled the covered cases unchanged.",
      "¿Cómo se llama el otro tribunal que recibirá esta solicitud?", "Use el destino real de presentación. Mantenga sin cambios los tribunales que atendieron los casos incluidos."), answerContract: NY_CASE_COURT_TEXT_CONTRACT },
    { ...question(NY_OTHER_COURT_COUNTY, "text_or_unknown", "Which county is that filing court in?", "This is the filing court's county, not your home county or an assumed prosecutor's location.",
      "¿En qué condado está ese tribunal?", "Se trata del condado del tribunal donde se presentará la solicitud, no de su condado de residencia ni de una ubicación supuesta del fiscal."), answerContract: NY_CASE_COURT_TEXT_CONTRACT },
    directionBasis,
    { ...question(NY_COURT_DIRECTION_TEXT_IDS[0], "text_or_unknown", "Who gave the court instruction, or what source identifies the same court?", "Record the issuing court and the person's name or role, or identify the source of the court-name explanation. Do not invent an issuer if there was no instruction.",
      "¿Quién dio la instrucción del tribunal, o qué fuente identifica al mismo tribunal?", "Indique el tribunal emisor y el nombre o cargo de la persona, o identifique la fuente de la explicación del nombre del tribunal. No invente un emisor si no hubo una instrucción."), answerContract: NY_CASE_COURT_TEXT_CONTRACT },
    { ...question(NY_COURT_DIRECTION_TEXT_IDS[1], "text_or_unknown", "What is the date and reference of that instruction or source?", "Record the date and order, case, letter or source reference that actually exists. If unavailable, save I am not sure for review. No upload or new court order is required to save this preparation.",
      "¿Cuál es la fecha y referencia de esa instrucción o fuente?", "Indique la fecha y la referencia de la orden, caso, carta o fuente que realmente exista. Si no dispone de ella, guarde No estoy seguro para revisión. No se exige cargar un documento ni obtener una orden nueva para guardar esta preparación."), answerContract: NY_CASE_COURT_TEXT_CONTRACT },
    { ...question(NY_COURT_DIRECTION_TEXT_IDS[2], "text_or_unknown", "What exactly does the court instruction or source say about the destination?", "Keep the actual wording and explain how it concerns the cases selected below. This is evidence for review, not permission to choose an unrelated court.",
      "¿Qué dice exactamente la instrucción o fuente sobre el destino?", "Conserve el texto real y explique cómo se refiere a los casos seleccionados a continuación. Esto constituye información para revisión, no permiso para elegir un tribunal ajeno."), answerContract: NY_CASE_COURT_TEXT_CONTRACT },
    directionCases,
    directionConfirmation,
    { ...question(NY_STATEMENT_ID, "text_or_unknown", "Why are you asking the court to seal these convictions?", "Write your own reasons. Keep your paragraphs. Supporting documents do not replace this statement. Saving text does not sign, date or affirm it.",
      "¿Por qué solicita al tribunal que selle estas condenas?", "Escriba sus propios motivos. Conserve sus párrafos. Los documentos de apoyo no reemplazan esta declaración. Guardar el texto no lo firma, fecha ni afirma."), answerContract: NY_STATEMENT_CONTRACT, multiline: true },
    reconciliation
  ];
}

export function nyCaseCourtTextState(raw: unknown) {
  const scalar = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as { value?: unknown }).value : raw;
  if (typeof scalar === "string" && /[\x00-\x1f\x7f]/.test(scalar)) return "invalid" as const;
  return nyApplicantStatementState(raw);
}

/** Reconcile actual saved identities, never infer legal conviction groups from cards. */
export function nyCaseAssociationIssues(answers: Readonly<Record<string, unknown>>) {
  const issues: Array<{ id: string; code: string; en: string; es: string }> = [...nySealingHistoryIssues(answers), ...nyFutureApplicationsIssues(answers)];
  const records = parseNyCourtCaseRecords(answers[NY_CASE_RECORDS_ID]);
  if (!records?.length) return issues;
  const scalar = (id: string) => {
    const raw = answers[id];
    return typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? raw : raw && typeof raw === "object" && !Array.isArray(raw) && (raw as { unknown?: unknown }).unknown !== true ? (raw as { value?: unknown }).value : undefined;
  };
  const first = scalar("ny_16059_first_case_numbers");
  if (nyPacketTextAnswerState("ny_16059_first_case_numbers", answers.ny_16059_first_case_numbers) === "known_valid") {
    const reference = records.find(record => record.priorCaseReference === "first");
    if (!reference || reference.caseNumbers !== first) issues.push({ id: NY_CASE_RECORDS_ID, code: "first_case_association",
      en: "Use the saved first-case numbers on the matching case card. If those numbers need correction, edit the earlier first-case answer as well. The two answers must agree.",
      es: "Use los números guardados del primer caso en la tarjeta correspondiente. Si necesita corregirlos, edite también la respuesta anterior del primer caso. Las dos respuestas deben coincidir." });
  }
  const additional = scalar("ny_16059_additional_cases");
  if (additional === "No" && records.length > 1 || additional === "Yes" && records.length < 2) issues.push({ id: "ny_16059_additional_cases", code: "additional_case_inventory",
    en: "Review whether this application covers additional court cases and make that answer agree with the cases listed here. Related cases remain separate entries even if counted together under the law.",
    es: "Revise si esta solicitud incluye casos judiciales adicionales y haga que esa respuesta coincida con los casos enumerados aquí. Los casos relacionados siguen siendo entradas separadas aunque se cuenten juntos según la ley." });
  const validDate = (value: unknown): value is string => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
  };
  const convictions = records.flatMap(record => record.convictions);
  const classes = convictions.filter(conviction => nyClassificationAnswerCurrent(conviction, "recordClass"));
  const felony = classes.some(conviction => conviction.classification!.recordClass.value === "felony");
  for (const id of ["ny_16059_history_felonies", "ny_16059_requested_felonies"]) {
    if (felony && (scalar(id) === 0 || typeof scalar(id) === "string" && /^0+$/.test(scalar(id) as string))) issues.push({ id, code: "declared_felony_conflict",
      en: `An included conviction is identified as a felony, but the saved ${id === "ny_16059_history_felonies" ? "complete-history" : "requested-conviction"} felony count is zero. Review that conviction's classification and the earlier count; correct the answer that is wrong. No cases or convictions are grouped automatically.`,
      es: `Una condena incluida está identificada como delito grave, pero el número guardado de delitos graves ${id === "ny_16059_history_felonies" ? "en todos sus antecedentes" : "en esta solicitud"} es cero. Revise la clasificación de esa condena y el número anterior; corrija la respuesta incorrecta. No se agrupan casos ni condenas automáticamente.` });
  }
  const excluded = convictions.filter(conviction => nyClassificationAnswerCurrent(conviction, "excluded"));
  const actualCategories = excluded.flatMap(conviction => conviction.classification!.excluded.value).filter(value => value !== "none" && value !== "unknown");
  // Match the existing evaluator's accepted negative spellings, without
  // changing the saved value or importing its server-only module into the editor.
  const no = (id: string) => {
    const value = scalar(id);
    const text = typeof value === "string" ? value.trim().toLowerCase() : value === false ? "false" : "";
    return text === "no" || text === "false" || text.startsWith("no,");
  };
  if (actualCategories.length && no("ny_16059_requested_excluded")) issues.push({ id: "ny_16059_requested_excluded", code: "declared_exclusion_conflict",
    en: "An included conviction has an excluded category selected, but the saved answer says none of the requested convictions is excluded. Review both answers against the record and correct the answer that is wrong.",
    es: "Una condena incluida tiene seleccionada una categoría excluida, pero la respuesta guardada dice que ninguna condena solicitada está excluida. Revise ambas respuestas con el expediente y corrija la respuesta incorrecta." });
  if (actualCategories.includes("registration_6c") && no("ny_16059_sex_offender_registration")) issues.push({ id: "ny_16059_sex_offender_registration", code: "declared_registration_conflict",
    en: "A conviction is marked as requiring sex-offender registration, but the saved registration answer is No. Review both answers against the registration record; do not assume that a completed sentence ended registration.",
    es: "Una condena está marcada como sujeta a inscripción en el registro de delincuentes sexuales, pero la respuesta guardada sobre la inscripción es No. Revise ambas respuestas con el registro; no suponga que cumplir la sentencia terminó la obligación de inscribirse." });
  if (classes.some(conviction => conviction.classification!.recordClass.value === "violation")) issues.push({ id: NY_CASE_RECORDS_ID, code: "declared_noncrime_request",
    en: "An included record is classified as a violation rather than a misdemeanor or felony. Review its classification and whether it belongs in this CPL 160.59 conviction application. The record has not been removed or assigned to another procedure.",
    es: "Un expediente incluido está clasificado como infracción (violation), en lugar de delito menor o grave. Revise su clasificación y si corresponde a esta solicitud de condenas bajo CPL 160.59. No se ha eliminado el expediente ni asignado a otro procedimiento." });
  const felonyOnly = new Set(["article_125_felony", "violent_felony_70_02", "class_a_felony", "article_105_ineligible_felony", "ineligible_felony_attempt"]);
  if (classes.some(conviction => ["misdemeanor", "violation"].includes(conviction.classification!.recordClass.value)
    && nyClassificationAnswerCurrent(conviction, "excluded") && conviction.classification!.excluded.value.some(value => felonyOnly.has(value)))) issues.push({ id: NY_CASE_RECORDS_ID, code: "declared_class_category_conflict",
    en: "A conviction's classification disagrees with a selected category that applies only to felonies. Review both answers for that conviction; no classification is inferred from the offense text.",
    es: "La clasificación de una condena no coincide con una categoría seleccionada que solo corresponde a delitos graves. Revise ambas respuestas de esa condena; no se deduce la clasificación del texto del delito." });
  const convictionDates = convictions.map(conviction => conviction.convictionDate).filter(validDate);
  const earliest = scalar("ny_16059_earliest_conviction_date");
  const knownInventory = nyCourtCaseRecordsState(answers[NY_CASE_RECORDS_ID]) === "known_valid"
    && !issues.some(issue => ["first_case_association", "additional_case_inventory"].includes(issue.code))
    && (additional === "No" && records.length === 1 || additional === "Yes" && scalar(NY_CASE_RECONCILIATION_ID) === nyAdditionalCaseConfirmation(answers));
  if (validDate(earliest) && convictionDates.length && (convictionDates.some(date => date < earliest)
    || knownInventory && [...convictionDates].sort()[0] !== earliest)) issues.push({ id: "ny_16059_earliest_conviction_date", code: "earliest_conviction_conflict",
    en: "The earliest conviction date saved for this request does not agree with the included case records. Review that date and each case's conviction dates; correct the answer that is wrong.",
    es: "La fecha de la primera condena guardada para esta solicitud no coincide con los expedientes incluidos. Revise esa fecha y las fechas de condena de cada caso; corrija la respuesta incorrecta." });
  const sentence = scalar("sentencing_date");
  // A conviction after the claimed latest conviction's sentence is inconsistent.
  // An older conviction's later resentencing event does NOT establish this bound.
  if (validDate(sentence) && convictionDates.some(date => date > sentence)) issues.push({ id: "sentencing_date", code: "latest_conviction_conflict",
    en: "An included conviction is later than the saved sentence date for your latest criminal conviction. Review the conviction records and that earlier answer. Do not replace it with an unrelated resentencing date.",
    es: "Una condena incluida es posterior a la fecha guardada de la sentencia de su condena penal más reciente. Revise los expedientes y esa respuesta anterior. No la reemplace con una fecha de nueva sentencia que no corresponda." });
  const custody = convictions.flatMap(conviction => conviction.sentences).filter(sentence => sentence.postSentenceCustody === "yes");
  if (scalar("ny_16059_incarceration_history") === "none" && custody.length) issues.push({ id: "ny_16059_incarceration_history", code: "incarceration_history_conflict",
    en: "A covered case lists incarceration, but the saved history says there was none since the earliest included conviction. Review both answers and correct the record; no custody period is filled in for you.",
    es: "Un caso incluido indica encarcelamiento, pero los antecedentes guardados dicen que no hubo ninguno desde la primera condena incluida. Revise ambas respuestas y corrija el registro; no se completará ningún período por usted." });
  const release = scalar("release_date");
  if (validDate(release) && custody.some(sentence => sentence.releases.some(event => validDate(event.releaseDate) && event.releaseDate > release))) issues.push({ id: "release_date", code: "latest_release_conflict",
    en: "A covered case lists a release after the saved latest release date. Review the release dates and incarceration history before continuing.",
    es: "Un caso incluido indica una liberación posterior a la última fecha de liberación guardada. Revise las fechas de liberación y los antecedentes de encarcelamiento antes de continuar." });
  const filing = scalar(NY_FILING_CASE_ID);
  const venue = nyFilingVenueComparison(records);
  if (convictions.some(conviction => nyStatutoryClassCoherent(conviction) && nyClassificationAnswerCurrent(conviction, "excluded")
    && conviction.classification!.excluded.value.length && !conviction.classification!.excluded.value.includes("unknown")
    && (conviction.statutoryClass!.value === "felony_a") !== conviction.classification!.excluded.value.includes("class_a_felony"))) issues.push({ id: NY_CASE_RECORDS_ID, code: "statutory_class_a_category_conflict",
    en: "The specific class and the class A felony exclusion answer disagree for a conviction. CPL 160.59 excludes class A felonies. Review both answers against the record; neither answer has been replaced automatically.",
    es: "La clase específica y la respuesta sobre la exclusión de delitos graves de clase A no coinciden para una condena. CPL 160.59 excluye los delitos graves de clase A. Revise ambas respuestas con el expediente; ninguna se ha reemplazado automáticamente." });
  if (venue.conflictingClassConvictionIds.length) issues.push({ id: NY_CASE_RECORDS_ID, code: "statutory_class_conflict",
    en: "A specific offense class disagrees with the felony or misdemeanor answer. Review both declarations against that conviction's record.",
    es: "Una clase específica no coincide con la respuesta de delito grave o menor. Revise ambas declaraciones con el expediente de esa condena." });
  if (venue.missingClassConvictionIds.length) issues.push({ id: NY_CASE_RECORDS_ID, code: "filing_class_detail_required",
    en: "The cases involve different courts. Record the specific offense classes needed to compare their filing destinations; a general felony or misdemeanor answer is not enough for these competing convictions.",
    es: "Los casos corresponden a tribunales distintos. Indique las clases específicas necesarias para comparar los destinos de presentación; una respuesta general de delito grave o menor no basta para estas condenas." });
  if (venue.reviewReason) issues.push({ id: NY_FILING_CASE_ID, code: "filing_comparison_review_required",
    en: "The recorded classes leave more than one possible court and do not establish the comparison needed to choose between them. Keep the recorded facts for review; do not change a class or date merely to select a court.",
    es: "Las clases registradas dejan más de un tribunal posible y no establecen la comparación necesaria para elegir entre ellos. Conserve los datos registrados para revisión; no cambie una clase o fecha solo para seleccionar un tribunal." });
  if (typeof filing === "string" && filing.startsWith("case:") && records.some(record => `case:${record.id}` === filing)
    && venue.candidateCaseIds.length && !venue.candidateCaseIds.some(id => `case:${id}` === filing)) issues.push({ id: NY_FILING_CASE_ID, code: "filing_destination_conflict",
    en: "The chosen court conflicts with the recorded offense classes or conviction dates under the form's Where To File instructions. Review the destination and case facts. If an actual court instruction identifies a different destination, record it using A different filing court for review.",
    es: "El tribunal elegido no coincide con las clases de delitos o fechas de condena registradas según las instrucciones del formulario sobre dónde presentar la solicitud. Revise el destino y los datos de los casos. Si una instrucción real del tribunal indica otro destino, regístrela mediante Otro tribunal para revisión." });
  if (filing === "different_court") issues.push({ id: NY_FILING_CASE_ID, code: "filing_direction_review_required",
    en: "The different destination and its instruction or explanation need review. You can save the destination and supporting facts and continue preparing the other information. An explanation alone does not resolve a conflicting filing court.",
    es: "El destino distinto y su instrucción o explicación necesitan revisión. Puede guardar el destino y los datos de respaldo y seguir preparando la demás información. Una explicación por sí sola no resuelve un tribunal de presentación contradictorio." });
  if (filing === "different_court" && (!nyCourtDirectionConfirmation(answers) || scalar(NY_COURT_DIRECTION_CONFIRMATION_ID) !== nyCourtDirectionConfirmation(answers))) issues.push({ id: NY_COURT_DIRECTION_CONFIRMATION_ID, code: "filing_direction_scope_review",
    en: "Review the saved direction or explanation against this destination and the current case records. A previous confirmation does not apply after those facts change.",
    es: "Revise la instrucción o explicación guardada con este destino y los expedientes actuales. Una confirmación anterior no se aplica después de que cambien esos datos." });
  if (typeof filing === "string" && filing.startsWith("case:") && !records.some(record => `case:${record.id}` === filing)) issues.push({ id: NY_FILING_CASE_ID, code: "filing_case_removed",
    en: "The case previously chosen for the filing court is no longer in this list. Choose the intended filing court again.",
    es: "El caso elegido anteriormente para el tribunal de presentación ya no está en esta lista. Vuelva a elegir el tribunal donde desea presentar la solicitud." });
  return issues;
}

/** Owner review of exact saved facts, including uncertainty. Not a legal
 * approval. Reorder is harmless; every case/fact edit requires another review. */
export function nyCourtDirectionConfirmation(answers: Readonly<Record<string, unknown>>) {
  if (answers[NY_FILING_CASE_ID] !== "different_court") return null;
  const records = parseNyCourtCaseRecords(answers[NY_CASE_RECORDS_ID]);
  const selected = answers[NY_COURT_DIRECTION_CASES_ID];
  if (!records?.length || !Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length
    || !selected.every(value => typeof value === "string" && records.some(record => `case:${record.id}` === value))) return null;
  const ids = [NY_OTHER_COURT_NAME, NY_OTHER_COURT_COUNTY, NY_COURT_DIRECTION_BASIS_ID, ...NY_COURT_DIRECTION_TEXT_IDS];
  if (ids.some(id => !Object.hasOwn(answers, id))) return null;
  // JSON/JSONB object-key order is not an owner fact. Keep every value and
  // nested array order exact, including unknown flags and answer wrappers.
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])])) : value;
  return `reviewed:${JSON.stringify(canonical({ facts: Object.fromEntries(ids.map(id => [id, answers[id]])), cases: [...records].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), selected: [...selected].sort() }))}`;
}

/** Exact comparison token, not a signature or source/legal approval. Sorting only
 * the identity inventory makes reorder harmless; no participant text is parsed. */
export function nyAdditionalCaseConfirmation(answers: Readonly<Record<string, unknown>>) {
  const raw = answers.ny_16059_additional_case_numbers;
  if (nyPacketTextAnswerState("ny_16059_additional_case_numbers", raw) !== "known_valid") return null;
  const text = typeof raw === "string" ? raw : (raw as { value: string }).value;
  const records = parseNyCourtCaseRecords(answers[NY_CASE_RECORDS_ID]);
  if (!records || records.length < 2 || !records.some(record => record.priorCaseReference === "first")) return null;
  const firstRaw = answers.ny_16059_first_case_numbers;
  if (nyPacketTextAnswerState("ny_16059_first_case_numbers", firstRaw) !== "known_valid") return null;
  const first = typeof firstRaw === "string" ? firstRaw : (firstRaw as { value: string }).value;
  if (records.find(record => record.priorCaseReference === "first")?.caseNumbers !== first) return null;
  const cases = records.map(({ id, priorCaseReference, caseNumbers, courtName, courtCounty }) => ({ id, priorCaseReference, caseNumbers, courtName, courtCounty })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (cases.some(record => [record.caseNumbers, record.courtName, record.courtCounty].some(value => nyApplicantStatementState(value) !== "known_valid"))) return null;
  return `confirmed:${JSON.stringify({ text, cases })}`;
}

/** Literal possible-duplicate signal only. Distinct stable records are never merged. */
export function nyHasPossibleDuplicateCases(answers: Readonly<Record<string, unknown>>) {
  const records = parseNyCourtCaseRecords(answers[NY_CASE_RECORDS_ID]);
  const seen = new Set<string>();
  for (const record of records ?? []) {
    const identity = [record.caseNumbers, record.courtName, record.courtCounty];
    if (identity.some(value => nyApplicantStatementState(value) !== "known_valid")) continue;
    const key = JSON.stringify(identity);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}
