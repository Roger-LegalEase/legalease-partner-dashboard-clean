import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { NY_CASE_RECORDS_ID, NY_CASE_RECORDS_CONTRACT, NY_STATEMENT_ID, NY_STATEMENT_CONTRACT, parseNyCourtCaseRecords, nyCourtCaseRecordsState, nyApplicantStatementState } from "@/lib/expungement-ai/ny-16059-case-records";
import { nyPacketTextAnswerState } from "@/lib/expungement-ai/ny-16059-packet-facts";

export const NY_CASE_COURT_TEXT_CONTRACT = "ny_16059_case_court_text_v1" as const;
export const NY_FILING_CASE_ID = "ny_16059_filing_case_id";
export const NY_OTHER_COURT_NAME = "ny_16059_other_filing_court_name";
export const NY_OTHER_COURT_COUNTY = "ny_16059_other_filing_court_county";
export const NY_CASE_RECONCILIATION_ID = "ny_16059_additional_case_reconciliation";
export const NY_CASE_FACT_IDS = [NY_CASE_RECORDS_ID, NY_FILING_CASE_ID, NY_OTHER_COURT_NAME, NY_OTHER_COURT_COUNTY, NY_STATEMENT_ID, NY_CASE_RECONCILIATION_ID];
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
  const issues: Array<{ id: string; code: string; en: string; es: string }> = [];
  const records = parseNyCourtCaseRecords(answers[NY_CASE_RECORDS_ID]);
  if (!records?.length) return issues;
  const scalar = (id: string) => {
    const raw = answers[id];
    return typeof raw === "string" ? raw : raw && typeof raw === "object" && !Array.isArray(raw) && (raw as { unknown?: unknown }).unknown !== true ? (raw as { value?: unknown }).value : undefined;
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
  if (typeof filing === "string" && filing.startsWith("case:") && !records.some(record => `case:${record.id}` === filing)) issues.push({ id: NY_FILING_CASE_ID, code: "filing_case_removed",
    en: "The case previously chosen for the filing court is no longer in this list. Choose the intended filing court again.",
    es: "El caso elegido anteriormente para el tribunal de presentación ya no está en esta lista. Vuelva a elegir el tribunal donde desea presentar la solicitud." });
  return issues;
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
