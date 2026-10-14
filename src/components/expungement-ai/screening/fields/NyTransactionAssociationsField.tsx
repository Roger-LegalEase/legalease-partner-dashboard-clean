"use client";

import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { parseNyCourtCaseRecords } from "@/lib/expungement-ai/ny-16059-case-records";
import { emptyNyTransactionAssociations, emptyNyTransactionGroup, encodeNyTransactionAssociations, nyTransactionMemberFor,
  parseNyTransactionAssociations, NY_TRANSACTION_QUESTIONS as copy, NY_TRANSACTION_OPTIONS as options, nyTransactionQuestionApplies,
  type NyTransactionGroup, type NyTransactionMember } from "@/lib/expungement-ai/ny-16059-transaction-facts";

const inputClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
const buttonClass = "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium";
export function NyTransactionAssociationsField({ id, value, caseRecords, onChange, ...aria }: {
  id: string; value: AnswerValue | undefined; caseRecords?: string[]; onChange: (value: AnswerValue) => void;
  "aria-labelledby"?: string; "aria-describedby"?: string;
}) {
  const { locale } = useLocalization(), es = locale === "es", language = es ? "es" : "en";
  const parsed = parseNyTransactionAssociations(value), associations = parsed ?? emptyNyTransactionAssociations();
  const cases = parseNyCourtCaseRecords(caseRecords) ?? [];
  const save = (groups: NyTransactionGroup[]) => onChange(encodeNyTransactionAssociations({ ...associations, groups }));
  const update = (groupId: string, change: Partial<NyTransactionGroup>) => save(associations.groups.map(g => g.id === groupId ? { ...g, ...change } : g));
  const updateMember = (g: NyTransactionGroup, position: number, change: Partial<NyTransactionMember>) => update(g.id, { members: g.members.map((m, index) => index === position ? { ...m, ...change } : m) });
  const nextId = () => { let n = 1; while (associations.groups.some(g => g.id === `group-${n}`)) n++; return `group-${n}`; };
  const textField = (fieldId: string, label: string, text: string, changed: (value: string) => void, date = false) => <label key={fieldId} htmlFor={fieldId} className="grid gap-1 text-sm">
    <span>{label}</span>{date ? <input id={fieldId} className={inputClass} type="text" placeholder="YYYY-MM-DD" value={text} onChange={event => changed(event.target.value)} />
      : <textarea id={fieldId} className={inputClass} rows={3} value={text} onChange={event => changed(event.target.value)} />}
  </label>;
  function choice(g: NyTransactionGroup, key: "timeCircumstance" | "purposeRelation" | "sharedProceedingOnly" | "victims" | "recordSupport" | "disputed") {
    const choices = key === "sharedProceedingOnly" || key === "disputed" ? options.yesNoUnknown : options[key];
    return <label key={key} htmlFor={`${id}-${g.id}-${key}`} className="grid gap-1 text-sm"><span>{copy[key][language]}</span>
      <select id={`${id}-${g.id}-${key}`} className={inputClass} value={g[key]} onChange={event => update(g.id, { [key]: event.target.value } as Partial<NyTransactionGroup>)}>
        {Object.entries(choices).map(([value, labels]) => <option key={value} value={value}>{labels[es ? 1 : 0]}</option>)}
      </select></label>;
  }
  return <div id={id} {...aria} className="grid gap-5" data-ny-transaction-associations>
    {!cases.length && <p role="status">{es ? "Primero revise los casos judiciales incluidos. No se infieren condenas ni grupos de un número de expediente." : "First review the covered court cases. No convictions or groups are inferred from a case number."}</p>}
    {!parsed && value !== undefined && value !== "" && <p role="status">{es ? "El valor anterior permanece guardado. Registre asociaciones explícitas para corregirlo." : "The previous value remains saved. Record explicit associations to correct it."}</p>}
    {associations.groups.map((g, index) => <fieldset key={g.id} className="grid gap-4 rounded-lg border border-slate-300 p-4">
      <legend className="px-1 font-semibold">{es ? "Grupo" : "Group"} {index + 1}</legend>
      <fieldset className="grid gap-2"><legend className="text-sm font-medium">{copy.members[language]}</legend>
        {cases.flatMap(c => c.convictions.map(v => {
          const selected = g.members.some(m => m.caseId === c.id && m.convictionId === v.id), key = `${id}-${g.id}-${c.id}-${v.id}`;
          return <label key={key} htmlFor={key} className="flex items-start gap-2 text-sm"><input id={key} type="checkbox" checked={selected} onChange={event => update(g.id, { members: event.target.checked
            ? [...g.members, nyTransactionMemberFor(c, v)] : g.members.filter(m => m.caseId !== c.id || m.convictionId !== v.id) })} />
            <span>{c.caseNumbers} — {c.courtName}: {v.charge} ({v.section}); {v.convictionDate}</span></label>;
        }))}
      </fieldset>
      {g.members.map((m, position) => {
        const currentCase = cases.find(c => c.id === m.caseId), current = currentCase?.convictions.find(v => v.id === m.convictionId);
        const binding = currentCase && current ? nyTransactionMemberFor(currentCase, current).record : null;
        const stale = !binding || Object.keys(binding).some(key => binding[key as keyof typeof binding] !== m.record[key as keyof typeof m.record]);
        return <fieldset key={`${m.caseId}-${m.convictionId}-${position}`} className="grid gap-3 border-l-2 border-slate-200 pl-3">
          <legend className="text-sm font-medium">{m.record.caseNumbers}: {m.record.charge} ({m.record.section})</legend>
          {stale && <div role="status" className="grid gap-2 text-sm"><p>{es ? "El registro vinculado cambió o ya no figura en los casos actuales. Revise esta asociación; se conservan los datos anteriores." : "The linked record changed or is no longer in the current cases. Review this association; the previous details are retained."}</p>
            {binding && <button type="button" className={buttonClass} onClick={() => updateMember(g, position, { record: binding })}>{es ? "Vincular explícitamente al registro actual" : "Explicitly link to the current record"}</button>}
            <button type="button" className={buttonClass} onClick={() => update(g.id, { members: g.members.filter((_, i) => i !== position) })}>{es ? "Quitar de este grupo" : "Remove from this group"}</button></div>}
          {g.members.length > 1 && <>
            {textField(`${id}-${g.id}-${position}-start`, copy.conductStart[language], m.conductStart, text => updateMember(g, position, { conductStart: text }), true)}
            {textField(`${id}-${g.id}-${position}-end`, copy.conductEnd[language], m.conductEnd, text => updateMember(g, position, { conductEnd: text }), true)}
            {(["conductDescription", "chargingRecordReference", "dispositionRecordReference"] as const).map(key => textField(`${id}-${g.id}-${position}-${key}`, copy[key][language], m[key], text => updateMember(g, position, { [key]: text })))}
          </>}
        </fieldset>;
      })}
      {g.members.length > 1 && <>
        {choice(g, "timeCircumstance")}{choice(g, "purposeRelation")}
        {textField(`${id}-${g.id}-relationship`, copy.relationshipDescription[language], g.relationshipDescription, text => update(g.id, { relationshipDescription: text }))}
        {(["interveningConduct", "interveningRecordReference"] as const).filter(key => nyTransactionQuestionApplies(g, key)).map(key => textField(`${id}-${g.id}-${key}`, copy[key][language], g[key], text => update(g.id, { [key]: text })))}
        {choice(g, "sharedProceedingOnly")}{choice(g, "victims")}
        {g.victims !== "none" && textField(`${id}-${g.id}-victimRelationship`, copy.victimRelationship[language], g.victimRelationship, text => update(g.id, { victimRelationship: text }))}
        {choice(g, "recordSupport")}{choice(g, "disputed")}
      </>}
      <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => save(associations.groups.filter(group => group.id !== g.id))}>{es ? "Quitar este grupo; conservar los casos" : "Remove this group; keep the cases"}</button>
    </fieldset>)}
    <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => save([...associations.groups, emptyNyTransactionGroup(nextId())])}>{es ? "Agregar un grupo" : "Add a group"}</button>
  </div>;
}
