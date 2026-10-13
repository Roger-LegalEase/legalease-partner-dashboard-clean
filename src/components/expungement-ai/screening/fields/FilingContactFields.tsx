"use client";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { CA_FILER_CONTACT, CA_CONTACT_LABELS as labels, CA_CONTACT_OPTION_LABELS as options, parseCaContact, emptyCaContact, caContactCurrent, formatCaContact,
  type CaContact, type CaContactContext, type CaOptionalContact } from "@/lib/expungement-ai/ca-prop64-contact-answer";
const inputClass = "min-h-[48px] w-full rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]";
const buttonClass = "min-h-[44px] rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]";
function ContactText({ id, label, value, change, es }: { id: string; label: string; value: string; change: (v: string) => void; es: boolean }) {
  return <div className="grid gap-1"><label htmlFor={id} className="text-sm font-semibold">{label}</label>
    <input id={id} className={inputClass} value={value === "unknown" ? "" : value} disabled={value === "unknown"} onChange={e => change(e.target.value)} />
    <button className={`${buttonClass} justify-self-start`} type="button" aria-label={`${label}: ${value === "unknown" ? es ? "Ingresar una respuesta" : "Enter an answer" : es ? "No estoy seguro" : "I am not sure"}`} onClick={() => change(value === "unknown" ? "" : "unknown")}>
      {value === "unknown" ? es ? "Ingresar una respuesta" : "Enter an answer" : es ? "No estoy seguro" : "I am not sure"}</button>
    {value === "unknown" ? <span role="status">{es ? "No estoy seguro" : "I am not sure"}</span> : null}</div>;
}
/** Controlled editor: mounting never rewrites saved facts or their binding. */
export function FilingContactFields({ id, factId, value, context, onChange, ariaLabelledBy, ariaDescribedBy }: {
  id: string; factId: string; value: unknown; context: CaContactContext; onChange: (value: string[]) => void; ariaLabelledBy: string; ariaDescribedBy?: string;
}) {
  const { locale } = useLocalization(), es = locale === "es";
  const parsed = parseCaContact(factId, value), empty = value === undefined || value === null || value === "" || Array.isArray(value) && value.length === 0;
  const save = (v: CaContact) => onChange([JSON.stringify(v)]);
  if (!empty && !parsed) return <div role="group" aria-labelledby={ariaLabelledBy} className="grid gap-3">
    <p role="alert">{es ? "Revise la respuesta original antes de reemplazarla. Abrir esta página no la cambia." : "Review the original answer before replacing it. Opening this page does not change it."}</p>
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border p-3">{JSON.stringify(value, null, 2)}</pre>
    <button type="button" className={buttonClass} onClick={() => save(emptyCaContact(factId, context))}>{es ? "Reemplazar estos datos en mi borrador" : "Replace these details in my draft"}</button></div>;
  const contact = parsed ?? emptyCaContact(factId, context);
  const current = caContactCurrent(contact, context);
  const roleChanged = contact.kind === "filer" && contact.representation !== context.representation;
  if (!current) return <div role="group" aria-labelledby={ariaLabelledBy} className="grid gap-3">
    <p role="status">{es ? "Confirme primero el presentante, el nombre del acusado y el condado del tribunal. Los datos anteriores no se asignarán automáticamente a otra persona o tribunal." : "First confirm the filer, defendant name, and court county. Earlier details will not automatically be assigned to another person or court."}</p>
    {parsed ? <><pre className="whitespace-pre-wrap rounded border p-3">{formatCaContact(factId, value, locale)}</pre>
      <button type="button" className={buttonClass} disabled={!caContactCurrent(emptyCaContact(factId, context), context)} onClick={() => save(roleChanged ? emptyCaContact(factId, context) : contact.kind === "filer" ? { ...contact, representation: context.representation, defendantName: context.defendantName } : { ...contact, county: context.county })}>
        {roleChanged ? es ? "Ingresar los datos del presentante actual" : "Enter details for the current filer" : es ? "Revisé estos datos para el nombre o tribunal actual" : "I reviewed these details for the current name or court"}</button></> : null}</div>;
  const update = (key: string, v: string | CaOptionalContact) => save({ ...contact, [key]: v });
  const textFields = contact.kind === "filer" ? [...(contact.representation === "attorney" ? ["attorneyName", "barNumber"] : []), "street", "city", "state", "zip", "phone"] : ["street", "cityStateZip"];
  return <div role="group" aria-labelledby={ariaLabelledBy} aria-describedby={ariaDescribedBy} className="grid gap-4">
    <p className="text-sm">{factId === CA_FILER_CONTACT ? `${options[context.representation]?.[locale] ?? context.representation}: ${context.defendantName}` : `${labels.county[locale]}: ${context.county}`}</p>
    {textFields.map(key => <ContactText key={key} id={`${id}-${key}`} label={labels[key][locale]} value={String(contact[key as keyof CaContact] ?? "")} change={v => update(key, v)} es={es} />)}
    {contact.kind === "filer" ? (["fax", "email", ...(contact.representation === "attorney" ? ["firm"] : [])] as Array<"fax" | "email" | "firm">).map(key => <fieldset className="grid gap-2 rounded border p-3" key={key}>
      <legend>{labels[key][locale]}</legend><label className="sr-only" htmlFor={`${id}-${key}-status`}>{labels[key][locale]}</label>
      <select id={`${id}-${key}-status`} className={inputClass} value={contact[key].status} onChange={e => update(key, { ...contact[key], status: e.target.value as CaOptionalContact["status"] })}>
        {["", "known", "absent", "unknown"].map(v => <option key={v} value={v}>{options[v][locale]}</option>)}</select>
      {contact[key].status === "known" ? <><label htmlFor={`${id}-${key}`} className="sr-only">{labels[key][locale]}: {es ? "Valor" : "Value"}</label><input id={`${id}-${key}`} className={inputClass} value={contact[key].value} onChange={e => update(key, { ...contact[key], value: e.target.value })} /></>
        : contact[key].value ? <p className="break-words text-sm">{es ? "Valor anterior conservado, no se imprimirá: " : "Earlier value retained, will not print: "}{contact[key].value}</p> : null}
    </fieldset>) : <>
      <label htmlFor={`${id}-mailingRelationship`}>{labels.mailingRelationship[locale]}</label>
      <select className={inputClass} id={`${id}-mailingRelationship`} value={contact.mailingRelationship} onChange={e => update("mailingRelationship", e.target.value)}>
        {["", "same", "distinct", "unknown"].map(v => <option key={v} value={v}>{options[v][locale]}</option>)}</select>
      {contact.mailingRelationship === "distinct" ? <ContactText id={`${id}-mailingAddress`} label={labels.mailingAddress[locale]} value={contact.mailingAddress} change={v => update("mailingAddress", v)} es={es} /> : contact.mailingAddress ? <p className="text-sm">{es ? "Dirección anterior conservada, no se imprimirá: " : "Earlier address retained, will not print: "}{contact.mailingAddress}</p> : null}
    </>}
  </div>;
}
