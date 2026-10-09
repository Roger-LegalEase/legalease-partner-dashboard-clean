"use client";
import { ONBOARDING_SCHEMA_REGISTRY } from "@/lib/partners/onboarding/schema";

export function PreparedCollectionEditor({ fieldKey, rows, onChange }: {
  fieldKey: string; rows: Record<string, unknown>[]; onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const fields = ONBOARDING_SCHEMA_REGISTRY.filter(field => field.parentCollection === fieldKey && field.ownership === "partner_editable");
  return <div className="space-y-4">{rows.map((row, index) => <fieldset key={String(row.stable_row_id)} className="rounded border p-4">
    <legend className="font-bold">Person {index + 1}</legend>
    <div className="grid gap-3 sm:grid-cols-2">{fields.map(field => <div key={field.key} className="text-sm font-bold"><span>{field.label}</span>
      {field.enumValues && field.dataType.endsWith("_array") ? <div>{field.enumValues.map(option => <label key={option} className="flex min-h-11 items-center gap-2 font-normal"><input type="checkbox" checked={Array.isArray(row[field.dataKey]) && (row[field.dataKey] as string[]).includes(option)} onChange={event => { const selected = Array.isArray(row[field.dataKey]) ? row[field.dataKey] as string[] : []; onChange(rows.map((value, i) => i === index ? {...value, [field.dataKey]: event.target.checked ? [...selected, option] : selected.filter(item => item !== option)} : value)); }} />{option.replaceAll("_", " ")}</label>)}</div> : field.enumValues ? <select aria-label={field.label} className="min-h-11 w-full rounded border p-2" value={String(row[field.dataKey] ?? "")} onChange={event => onChange(rows.map((value, i) => i === index ? {...value, [field.dataKey]: event.target.value} : value))}>
        <option value="">Choose</option>{field.enumValues.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
      </select> : field.dataType === "boolean" ? <input aria-label={field.label} type="checkbox" checked={row[field.dataKey] === true} onChange={event => onChange(rows.map((value, i) => i === index ? {...value, [field.dataKey]: event.target.checked} : value))} /> :
      <input aria-label={field.label} className="min-h-11 w-full rounded border p-2" type={field.dataType === "email" ? "email" : "text"} value={Array.isArray(row[field.dataKey]) ? (row[field.dataKey] as string[]).join(", ") : String(row[field.dataKey] ?? "")} onChange={event => onChange(rows.map((value, i) => i === index ? {...value, [field.dataKey]: field.dataType.endsWith("_array") ? event.target.value.split(",").map(text => text.trim()).filter(Boolean) : event.target.value} : value))} />}
    </div>)}</div>
    <button type="button" className="mt-2 min-h-11 underline" onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove person {index + 1}</button>
  </fieldset>)}<button type="button" className="min-h-11 rounded border px-4" onClick={() => onChange([...rows, {...Object.fromEntries(fields.filter(field => field.dataType === "boolean" || field.dataType.endsWith("_array")).map(field => [field.dataKey, field.dataType === "boolean" ? false : []])), stable_row_id: crypto.randomUUID()}])}>Add person</button></div>;
}
