"use client";

/** Address lines remain the existing canonical string; legacy text is preserved. */
export function ProgramAddressEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const lines = value.split("\n");
  const fields = ["Street address or PO box", "Unit, building, or second address line", "City, region, and postal code", "Country or additional address lines"];
  function change(index: number, next: string) {
    const updated = Array.from({ length: 4 }, (_, position) => position === 3 ? lines.slice(3).join("\n") : lines[position] ?? "");
    updated[index] = next;
    onChange(updated.join("\n").replace(/\n+$/, ""));
  }
  return <fieldset className="rounded border p-4"><legend className="px-2 font-bold">Primary address (optional)</legend><p className="mb-3 text-sm">Enter the organization’s address in separate lines, starting with the street address or PO box. This does not change the selected screening jurisdictions.</p><div className="grid gap-3 sm:grid-cols-2">{fields.map((label, index) => <label key={label} className="block text-sm font-bold">{label}{index === 3 && lines.length > 4 ? <textarea className="mt-1 min-h-11 w-full rounded border p-2 font-normal" value={lines.slice(3).join("\n")} maxLength={1500} onChange={event => change(index, event.target.value)}/> : <input className="mt-1 min-h-11 w-full rounded border p-2 font-normal" value={lines[index] ?? ""} required={index === 0 && lines.slice(1).some(line => Boolean(line.trim()))} maxLength={500} autoComplete={index === 0 ? "address-line1" : index === 1 ? "address-line2" : undefined} onChange={event => change(index, event.target.value)}/>}</label>)}</div></fieldset>;
}
