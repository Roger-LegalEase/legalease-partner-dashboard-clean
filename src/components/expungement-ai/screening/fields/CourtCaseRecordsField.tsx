"use client";

import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { parseNyCourtCaseRecords, encodeNyCourtCaseRecords, emptyNyCourtCaseRecord, emptyNyConvictionRecord, emptyNySentenceEvent,
  type NyCourtCaseRecord, type NyConvictionRecord, type NySentenceEvent } from "@/lib/expungement-ai/ny-16059-case-records";

const inputClass = "min-h-[48px] w-full rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]";
const buttonClass = "min-h-[44px] rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]";
const nextId = () => crypto.randomUUID();

function RecordText({ id, label, value, change, es, multiline = false, date = false }: {
  id: string; label: string; value: string; change: (value: string) => void; es: boolean; multiline?: boolean; date?: boolean;
}) {
  const unknown = value === "unknown";
  const visibleValue = unknown ? "" : value;
  return <div className="grid gap-1">
    <label htmlFor={id} className="text-sm font-semibold">{label}</label>
    {multiline ? <textarea id={id} className={inputClass} rows={3} value={visibleValue} disabled={unknown} onChange={event => change(event.target.value)} />
      : <input id={id} className={inputClass} value={visibleValue} disabled={unknown} onChange={event => change(event.target.value)} aria-describedby={date ? `${id}-format` : undefined} />}
    {unknown ? <span role="status" className="text-sm">{es ? "No estoy seguro" : "I am not sure"}</span> : null}
    {date ? <span id={`${id}-format`} className="text-xs text-[#475569]">{es ? "Año-mes-día (AAAA-MM-DD). Puede guardar una fecha incompleta para revisarla después." : "Year-month-day (YYYY-MM-DD). You can save an incomplete date to review later."}</span> : null}
    <button type="button" className={`${buttonClass} justify-self-start`} aria-label={`${label}: ${unknown ? es ? "Ingresar una respuesta" : "Enter an answer" : es ? "No estoy seguro" : "I am not sure"}`} onClick={() => change(unknown ? "" : "unknown")}>{unknown ? es ? "Ingresar una respuesta" : "Enter an answer" : es ? "No estoy seguro" : "I am not sure"}</button>
  </div>;
}

/** Controlled case editor. Stable identities survive reorder and edits; every
 * action returns the full structured draft, including inactive release and
 * certificate explanation text. This control grants no filing authority. */
export function CourtCaseRecordsField({ id, value, onChange, firstCaseNumbers, additionalCaseNumbers, ariaLabelledBy, ariaDescribedBy }: {
  id: string; value: unknown; onChange: (value: string[]) => void; firstCaseNumbers?: string; additionalCaseNumbers?: string;
  ariaLabelledBy: string; ariaDescribedBy?: string;
}) {
  const { locale } = useLocalization();
  const es = locale === "es";
  const parsed = parseNyCourtCaseRecords(value);
  const records = parsed ?? [];
  const save = (next: NyCourtCaseRecord[]) => onChange(encodeNyCourtCaseRecords(next));
  const updateCase = (caseId: string, change: Partial<NyCourtCaseRecord>) => save(records.map(record => record.id === caseId ? { ...record, ...change } : record));
  const updateConviction = (record: NyCourtCaseRecord, convictionId: string, change: Partial<NyConvictionRecord>) => updateCase(record.id, {
    convictions: record.convictions.map(conviction => conviction.id === convictionId ? { ...conviction, ...change } : conviction)
  });
  const updateSentence = (record: NyCourtCaseRecord, conviction: NyConvictionRecord, sentenceId: string, change: Partial<NySentenceEvent>) => updateConviction(record, conviction.id, {
    sentences: conviction.sentences.map(sentence => sentence.id === sentenceId ? { ...sentence, ...change } : sentence)
  });
  if (value !== undefined && value !== null && value !== "" && parsed === null) return <div className="grid gap-3" role="group" aria-labelledby={ariaLabelledBy}>
    <p role="alert">{es ? "La lista guardada no se puede mostrar en este editor. Revise la información original antes de reemplazarla. Abrir esta página no cambia la lista guardada." : "The saved list cannot be shown in this editor. Review the original information before replacing it. Opening this page does not change the saved list."}</p>
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border p-3 text-sm">{JSON.stringify(value, null, 2)}</pre>
    <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => onChange([])}>{es ? "Reemplazar esta lista en mi borrador" : "Replace this list in my draft"}</button>
  </div>;
  return <div role="group" aria-labelledby={ariaLabelledBy} aria-describedby={ariaDescribedBy} className="grid gap-5">
    {firstCaseNumbers || additionalCaseNumbers ? <div className="rounded-xl bg-[#F1F5F9] p-4 text-sm">
      <p className="font-semibold">{es ? "Números de caso ya guardados" : "Case numbers already saved"}</p>
      {firstCaseNumbers ? <p>{es ? "Primer caso: " : "First case: "}{firstCaseNumbers}</p> : null}
      {additionalCaseNumbers ? <p className="whitespace-pre-wrap">{es ? "Casos adicionales: " : "Additional cases: "}{additionalCaseNumbers}</p> : null}
      <p>{es ? "Mantenga cada número con el caso y tribunal correctos. No se dividirá este texto automáticamente." : "Keep each number with its correct case and court. This text will not be split automatically."}</p>
    </div> : null}
    {records.map((record, index) => <fieldset key={record.id} className="grid gap-4 rounded-xl border border-[#CBD5E1] p-4">
      <legend className="px-2 font-bold">{es ? "Caso judicial" : "Court case"} {index + 1}</legend>
      <div className="flex flex-wrap gap-2">
        {firstCaseNumbers ? <button type="button" className={buttonClass} onClick={() => save(records.map(candidate => ({ ...candidate,
          priorCaseReference: candidate.id === record.id ? "first" : "",
          ...(candidate.id === record.id ? { caseNumbers: firstCaseNumbers } : {})
        })))}>{es ? "Usar los números guardados del primer caso aquí" : "Use the saved first-case numbers here"}</button> : null}
        <button type="button" className={buttonClass} disabled={index === 0} onClick={() => { const moved = [...records]; [moved[index - 1], moved[index]] = [moved[index], moved[index - 1]]; save(moved); }}>{es ? "Subir este caso" : "Move this case up"}</button>
        <button type="button" className={buttonClass} onClick={() => save(records.filter(candidate => candidate.id !== record.id))}>{es ? "Quitar este caso" : "Remove this case"}</button>
      </div>
      {record.priorCaseReference === "first" ? <p className="text-sm">{es ? "Asociado explícitamente con el primer caso descrito anteriormente." : "Explicitly associated with the first case described earlier."}</p> : null}
      <RecordText id={`${id}-${record.id}-numbers`} label={es ? "Todos los números de este caso judicial" : "All court case numbers for this case"} value={record.caseNumbers} change={caseNumbers => updateCase(record.id, { caseNumbers })} es={es} />
      <RecordText id={`${id}-${record.id}-court`} label={es ? "Tribunal donde se dictaron la condena y la sentencia" : "Court where the conviction and sentence were entered"} value={record.courtName} change={courtName => updateCase(record.id, { courtName })} es={es} />
      <RecordText id={`${id}-${record.id}-county`} label={es ? "Condado de ese tribunal" : "That court's county"} value={record.courtCounty} change={courtCounty => updateCase(record.id, { courtCounty })} es={es} />
      {record.convictions.map((conviction, convictionIndex) => <fieldset key={conviction.id} className="grid gap-4 rounded-lg border border-[#E2E8F0] p-3">
        <legend className="px-2 font-semibold">{es ? "Condena" : "Conviction"} {convictionIndex + 1}</legend>
        <RecordText id={`${id}-${conviction.id}-charge`} label={es ? "Delito tal como aparece en el expediente" : "Offense as shown in the record"} value={conviction.charge} change={charge => updateConviction(record, conviction.id, { charge })} es={es} />
        <RecordText id={`${id}-${conviction.id}-section`} label={es ? "Ley, sección y subsección exactas" : "Exact law, section and subsection"} value={conviction.section} change={section => updateConviction(record, conviction.id, { section })} es={es} />
        <RecordText id={`${id}-${conviction.id}-grade`} label={es ? "Nivel o clase del delito según el expediente" : "Offense level or class shown in the record"} value={conviction.grade} change={grade => updateConviction(record, conviction.id, { grade })} es={es} />
        <RecordText id={`${id}-${conviction.id}-date`} label={es ? "Fecha de esta condena" : "Date of this conviction"} value={conviction.convictionDate} change={convictionDate => updateConviction(record, conviction.id, { convictionDate })} es={es} date />
        {conviction.sentences.map((sentence, sentenceIndex) => <fieldset key={sentence.id} className="grid gap-3 rounded-lg bg-[#F8FAFC] p-3">
          <legend className="px-2 font-semibold">{es ? "Sentencia" : "Sentence event"} {sentenceIndex + 1}</legend>
          <RecordText id={`${id}-${sentence.id}-date`} label={es ? "Fecha en que se impuso esta sentencia" : "Date this sentence was imposed"} value={sentence.sentenceDate} change={sentenceDate => updateSentence(record, conviction, sentence.id, { sentenceDate })} es={es} date />
          <RecordText id={`${id}-${sentence.id}-terms`} label={es ? "Términos de esta sentencia" : "Terms of this sentence"} value={sentence.sentenceTerms} change={sentenceTerms => updateSentence(record, conviction, sentence.id, { sentenceTerms })} es={es} multiline />
          <label className="grid gap-1 text-sm font-semibold" htmlFor={`${id}-${sentence.id}-custody`}>
            {es ? "¿Estuvo encarcelado después de que se impuso esta sentencia, por esta condena?" : "Were you incarcerated after this sentence was imposed, for this conviction?"}
            <select id={`${id}-${sentence.id}-custody`} className={inputClass} value={sentence.postSentenceCustody} onChange={event => updateSentence(record, conviction, sentence.id, { postSentenceCustody: event.target.value as NySentenceEvent["postSentenceCustody"] })}>
              <option value="">{es ? "Seleccione una respuesta" : "Choose an answer"}</option><option value="yes">{es ? "Sí" : "Yes"}</option><option value="no">No</option><option value="unknown">{es ? "No estoy seguro" : "I am not sure"}</option>
            </select>
          </label>
          {sentence.postSentenceCustody === "yes" ? <div className="grid gap-3">
            <p className="text-sm">{es ? "Use las fechas reales de liberación de esa detención. No use la fecha de finalización de la libertad condicional o supervisada." : "Use actual release dates for that custody. Do not use probation or parole completion dates."}</p>
            {sentence.releases.map((release, releaseIndex) => <div key={release.id} className="grid gap-2">
              <RecordText id={`${id}-${release.id}-release`} label={`${es ? "Fecha de liberación" : "Release date"} ${releaseIndex + 1}`} value={release.releaseDate} change={releaseDate => updateSentence(record, conviction, sentence.id, { releases: sentence.releases.map(candidate => candidate.id === release.id ? { ...candidate, releaseDate } : candidate) })} es={es} date />
              <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => updateSentence(record, conviction, sentence.id, { releases: sentence.releases.filter(candidate => candidate.id !== release.id) })}>{es ? "Quitar esta fecha de liberación" : "Remove this release event"}</button>
            </div>)}
            <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => updateSentence(record, conviction, sentence.id, { releases: [...sentence.releases, { id: nextId(), releaseDate: "" }] })}>{es ? "Agregar una fecha de liberación" : "Add a release event"}</button>
          </div> : null}
          <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => updateConviction(record, conviction.id, { sentences: conviction.sentences.filter(candidate => candidate.id !== sentence.id) })}>{es ? "Quitar esta sentencia" : "Remove this sentence event"}</button>
        </fieldset>)}
        <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => updateConviction(record, conviction.id, { sentences: [...conviction.sentences, emptyNySentenceEvent(nextId())] })}>{es ? "Agregar una sentencia de esta condena" : "Add a sentence event for this conviction"}</button>
        <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => updateCase(record.id, { convictions: record.convictions.filter(candidate => candidate.id !== conviction.id) })}>{es ? "Quitar esta condena" : "Remove this conviction"}</button>
      </fieldset>)}
      <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => updateCase(record.id, { convictions: [...record.convictions, emptyNyConvictionRecord(nextId())] })}>{es ? "Agregar una condena de este caso" : "Add a conviction in this case"}</button>
      <label className="grid gap-1 text-sm font-semibold" htmlFor={`${id}-${record.id}-certificate`}>
        {es ? "Certificado de disposición de este caso" : "Certificate of disposition for this case"}
        <select id={`${id}-${record.id}-certificate`} className={inputClass} value={record.certificateStatus} onChange={event => updateCase(record.id, { certificateStatus: event.target.value as NyCourtCaseRecord["certificateStatus"] })}>
          <option value="">{es ? "Seleccione una respuesta" : "Choose an answer"}</option>
          <option value="available">{es ? "Ya tengo un original o una copia legible" : "I already have an original or legible copy"}</option>
          <option value="request_needed">{es ? "Necesito obtener una copia" : "I need to obtain a copy"}</option>
          <option value="unavailable">{es ? "No puedo obtenerlo" : "I cannot obtain it"}</option>
          <option value="unknown">{es ? "No estoy seguro" : "I am not sure"}</option>
        </select>
      </label>
      {record.certificateStatus === "unavailable" ? <RecordText id={`${id}-${record.id}-explanation`} label={es ? "Explique por qué no puede obtener el certificado de este caso" : "Explain why you cannot obtain this case's certificate"} value={record.certificateExplanation} change={certificateExplanation => updateCase(record.id, { certificateExplanation })} es={es} multiline /> : null}
      <p className="text-sm text-[#475569]">{es ? "Guardar esta respuesta no adjunta el certificado ni la explicación a la solicitud." : "Saving this answer does not attach the certificate or explanation to the application."}</p>
    </fieldset>)}
    <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => save([...records, emptyNyCourtCaseRecord(nextId())])}>{es ? "Agregar un caso judicial incluido" : "Add a covered court case"}</button>
  </div>;
}
