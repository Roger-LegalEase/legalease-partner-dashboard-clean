"use client";

import { useId, useRef, useState } from "react";
import { PROGRAM_JURISDICTIONS } from "@/lib/partners/onboarding/program-defaults";

/** Codes are persisted; readable names and ordinary checkboxes need no modifier keys. */
export function JurisdictionPicker({ value, onChange, allowed = Object.keys(PROGRAM_JURISDICTIONS), disabled = false, spanish = false }: {
  value: string[];
  onChange: (codes: string[]) => void;
  allowed?: readonly string[];
  disabled?: boolean;
  spanish?: boolean;
}) {
  const id = useId();
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const choices = Object.entries(PROGRAM_JURISDICTIONS).filter(([code, name]) => allowed.includes(code) && `${code} ${name}`.toLowerCase().includes(query.trim().toLowerCase()));
  const change = (code: string, selected: boolean) => onChange(selected ? [...new Set([...value, code])].sort() : value.filter(item => item !== code));
  return <fieldset disabled={disabled} className="min-w-0 rounded-lg border p-4">
    <legend className="px-2 font-bold">{spanish ? "Jurisdicciones" : "Jurisdictions"}</legend>
    <p id={`${id}-help`} className="text-sm">{spanish ? "Seleccione las jurisdicciones de su programa. La descripción no amplía este alcance." : "Select the program’s jurisdictions. Service-area wording does not expand this scope."}</p>
    <p role="status" className="mt-2 text-sm font-semibold">{value.length} {spanish ? "seleccionadas" : "selected"}</p>
    <ul className="mt-2 flex flex-wrap gap-2" aria-label={spanish ? "Jurisdicciones seleccionadas" : "Selected jurisdictions"}>
      {value.map(code => <li key={code}><button type="button" className="min-h-11 rounded-full border bg-slate-50 px-3 text-sm" aria-label={`${spanish ? "Quitar" : "Remove"} ${PROGRAM_JURISDICTIONS[code] ?? code}`} onClick={() => { change(code, false); search.current?.focus(); }}>{PROGRAM_JURISDICTIONS[code] ?? code} <span aria-hidden="true">×</span></button></li>)}
    </ul>
    <label className="mt-3 block text-sm font-semibold" htmlFor={id}>{spanish ? "Buscar un estado o DC" : "Search states and DC"}</label>
    <input ref={search} id={id} type="search" aria-describedby={`${id}-help`} value={query} onChange={event => setQuery(event.target.value)} className="mt-2 min-h-11 w-full rounded border px-3 font-normal" />
    <div className="mt-3 grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
      {choices.map(([code, name]) => <label key={code} className="flex min-h-11 items-center gap-3 rounded px-2 text-sm font-normal hover:bg-slate-50"><input type="checkbox" checked={value.includes(code)} onChange={event => change(code, event.target.checked)} />{name}</label>)}
    </div>
    {!choices.length ? <p className="mt-3 text-sm">{allowed.length ? spanish ? "No hay coincidencias." : "No matching jurisdictions." : spanish ? "LegalEase debe configurar el alcance autorizado de este programa." : "LegalEase must configure this program’s permitted jurisdictions."}</p> : null}
  </fieldset>;
}
