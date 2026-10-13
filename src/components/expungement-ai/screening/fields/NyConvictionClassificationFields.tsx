"use client";

import type { NyConvictionRecord } from "@/lib/expungement-ai/ny-16059-case-records";
import { nyClassificationAnswerCurrent, withNyClassificationAnswer, NY_RECORD_CLASS_LABELS, NY_EXCLUDED_CATEGORY_LABELS,
  type NyRecordClass, type NyConvictionClassification } from "@/lib/expungement-ai/ny-16059-case-classification";

export function NyConvictionClassificationFields({ id, conviction, es, onChange }: {
  id: string; conviction: NyConvictionRecord; es: boolean; onChange: (classification: NyConvictionClassification) => void;
}) {
  const locale = es ? "es" : "en";
  const held = conviction.classification;
  const classCurrent = nyClassificationAnswerCurrent(conviction, "recordClass");
  const excludedCurrent = nyClassificationAnswerCurrent(conviction, "excluded");
  const choices = excludedCurrent ? held!.excluded.value : [];
  const stale = es ? "La respuesta anterior corresponde a otro texto del expediente. Revísela y responda de nuevo; no se ha borrado la respuesta guardada." : "The earlier answer belongs to different record text. Review it and answer again; the saved answer has not been erased.";
  return <div className="grid gap-4">
    <div className="grid gap-1">
      <label className="text-sm font-semibold" htmlFor={`${id}-classification`}>{es ? "¿Qué clasificación indica el expediente para esta condena?" : "What classification does the record give this conviction?"}</label>
      <p id={`${id}-classification-help`} className="text-sm">{es ? "Use la condena final del expediente. No deduzca la clasificación del nombre del delito, del arresto original ni de la duración de la sentencia." : "Use the final conviction in the record. Do not infer its classification from the offense name, original arrest or sentence length."}</p>
      {held && !classCurrent ? <p role="status" className="text-sm text-[#92400E]">{stale} {NY_RECORD_CLASS_LABELS[held.recordClass.value][locale]}</p> : null}
      <select id={`${id}-classification`} className="min-h-[48px] w-full rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-[#00A99D]"
        aria-describedby={`${id}-classification-help`} value={classCurrent ? held!.recordClass.value : ""}
        onChange={event => onChange(withNyClassificationAnswer(conviction, "recordClass", event.target.value as NyRecordClass))}>
        {Object.entries(NY_RECORD_CLASS_LABELS).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}
      </select>
    </div>
    <fieldset className="grid gap-2 rounded-lg border border-[#CBD5E1] p-3" aria-describedby={`${id}-excluded-help`}>
      <legend className="px-2 text-sm font-semibold">{es ? "¿Qué categorías excluidas corresponden a esta condena?" : "Which excluded categories apply to this conviction?"}</legend>
      <p id={`${id}-excluded-help`} className="text-sm">{es ? "Revise cada categoría con el expediente y la ley aplicable. Seleccione todas las que correspondan o indique que no está seguro. No deje de incluir una tentativa o conspiración sin revisar el delito al que se refiere." : "Check each category against the record and applicable law. Select every category that applies or say you are not sure. Do not rule out an attempt or conspiracy without checking its underlying offense."} <a className="underline" href="https://www.nysenate.gov/legislation/laws/CPL/160.59" target="_blank" rel="noreferrer">CPL 160.59(1)(a)</a></p>
      {held && !excludedCurrent ? <p role="status" className="text-sm text-[#92400E]">{stale} {held.excluded.value.map(value => NY_EXCLUDED_CATEGORY_LABELS[value][locale]).join("; ")}</p> : null}
      {(Object.keys(NY_EXCLUDED_CATEGORY_LABELS) as Array<keyof typeof NY_EXCLUDED_CATEGORY_LABELS>).map(value => <label key={value} className="flex min-h-[44px] items-center gap-3 text-sm" htmlFor={`${id}-excluded-${value}`}>
        <input type="checkbox" id={`${id}-excluded-${value}`} className="h-5 w-5 shrink-0" checked={choices.includes(value)}
          onChange={event => {
            const next = event.target.checked ? value === "none" || value === "unknown" ? [value]
              : [...choices.filter(choice => choice !== "none" && choice !== "unknown"), value] : choices.filter(choice => choice !== value);
            onChange(withNyClassificationAnswer(conviction, "excluded", next as NyConvictionClassification["excluded"]["value"]));
          }} />
        {NY_EXCLUDED_CATEGORY_LABELS[value][locale]}
      </label>)}
    </fieldset>
  </div>;
}
