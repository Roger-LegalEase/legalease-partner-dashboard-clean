"use client";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { NY_HISTORY_OPTIONS, parseNySealingHistory, encodeNySealingHistory, emptyNySealingHistory, emptyNyPriorApplication, emptyNyPriorOrder, emptyNySealedConviction,
  type NySealingHistory, type NyPriorApplication, type NyPriorOrder, type NySealedConviction } from "@/lib/expungement-ai/ny-16059-sealing-history";
const inputClass = "min-h-[48px] w-full rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]";
const buttonClass = "min-h-[44px] rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]";
function Text({ id, label, value, change, es }: { id: string; label: string; value: string; change: (v: string) => void; es: boolean }) {
  const unknown = value === "unknown";
  return <div className="grid gap-1"><label className="text-sm font-semibold" htmlFor={id}>{label}</label>
    <input id={id} className={inputClass} value={unknown ? "" : value} disabled={unknown} onChange={e => change(e.target.value)} />
    {unknown ? <p role="status">{es ? "No estoy seguro" : "I am not sure"}</p> : null}
    <button type="button" className={`${buttonClass} justify-self-start`} aria-label={`${label}: ${unknown ? es ? "Ingresar una respuesta" : "Enter an answer" : es ? "No estoy seguro" : "I am not sure"}`} onClick={() => change(unknown ? "" : "unknown")}>{unknown ? es ? "Ingresar una respuesta" : "Enter an answer" : es ? "No estoy seguro" : "I am not sure"}</button></div>;
}
function Select({ id, label, value, group, change, es }: { id: string; label: string; value: string; group: keyof typeof NY_HISTORY_OPTIONS; change: (v: string) => void; es: boolean }) {
  return <label className="grid gap-1 text-sm font-semibold" htmlFor={id}>{label}<select id={id} className={inputClass} value={value} onChange={e => change(e.target.value)}>{Object.entries(NY_HISTORY_OPTIONS[group]).map(([key, labels]) => <option key={key} value={key}>{labels[es ? 1 : 0]}</option>)}</select></label>;
}
/** Controlled records retain inactive details. Copy status never performs an
 * upload, and recording an order never signs or approves it. */
export function SealingHistoryField({ id, value, onChange, ariaLabelledBy, ariaDescribedBy, knownPriorApplication = false }: {
  id: string; value: unknown; onChange: (v: string[]) => void; ariaLabelledBy: string; ariaDescribedBy?: string; knownPriorApplication?: boolean;
}) {
  const { locale } = useLocalization(), es = locale === "es";
  const parsed = parseNySealingHistory(value), history = parsed ?? emptyNySealingHistory();
  const save = (next: NySealingHistory) => onChange(encodeNySealingHistory(next));
  const app = (key: string, patch: Partial<NyPriorApplication>) => save({ ...history, applications: history.applications.map(a => a.id === key ? { ...a, ...patch } : a) });
  const order = (key: string, patch: Partial<NyPriorOrder>) => save({ ...history, orders: history.orders.map(o => o.id === key ? { ...o, ...patch } : o) });
  const conviction = (o: NyPriorOrder, key: string, patch: Partial<NySealedConviction>) => order(o.id, { convictions: o.convictions.map(c => c.id === key ? { ...c, ...patch } : c) });
  if (value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && !value.length) && !parsed) return <div role="group" aria-labelledby={ariaLabelledBy} className="grid gap-3">
    <p role="alert">{es ? "El registro guardado necesita revisión. Abrir esta página no lo reemplaza." : "The saved record needs review. Opening this page does not replace it."}</p>
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap border p-3">{JSON.stringify(value, null, 2)}</pre>
    <button type="button" className={buttonClass} onClick={() => save(emptyNySealingHistory())}>{es ? "Reemplazar este registro en mi borrador" : "Replace this record in my draft"}</button></div>;
  return <div role="group" aria-labelledby={ariaLabelledBy} aria-describedby={ariaDescribedBy} className="grid gap-5">
    {knownPriorApplication && ["", "yes"].includes(history.prior16058Application) ? <p role="status">{es ? "Su respuesta guardada ya indica una solicitud anterior bajo CPL 160.58. Registre sus detalles a continuación." : "Your saved answer already establishes an earlier CPL 160.58 application. Record its details below."}</p> : <Select id={`${id}-prior16058`} label={es ? "¿Presentó alguna solicitud anterior bajo CPL 160.58?" : "Did you file any earlier application under CPL 160.58?"} value={history.prior16058Application} group="declaration" es={es} change={v => save({ ...history, prior16058Application: v as NySealingHistory["prior16058Application"] })} />}
    <p className="text-sm">{es ? "Use la respuesta guardada sobre solicitudes bajo CPL 160.59 y registre cada solicitud real bajo cualquiera de las dos leyes, incluso si fue denegada, retirada o sigue pendiente. Una orden iniciada por el tribunal no demuestra que usted presentó una solicitud." : "Use your saved CPL 160.59 application answer and record each actual application under either law, including denied, withdrawn and pending applications. An order initiated by the court does not establish that you filed an application."}</p>
    {history.applications.map((a, i) => <fieldset key={a.id} className="grid gap-4 rounded-xl border border-[#CBD5E1] p-4"><legend className="px-2 font-bold">{es ? "Solicitud anterior" : "Earlier application"} {i + 1}</legend>
      <Select id={`${id}-${a.id}-law`} label={es ? "Ley de esta solicitud" : "Law for this application"} value={a.law} group="law" es={es} change={v => app(a.id, { law: v as NyPriorApplication["law"] })} />
      <Text id={`${id}-${a.id}-court`} label={es ? "Tribunal donde se presentó" : "Court where it was filed"} value={a.courtName} es={es} change={courtName => app(a.id, { courtName })} />
      <Text id={`${id}-${a.id}-cases`} label={es ? "Todos los números de caso incluidos en esa solicitud" : "All case numbers covered by that application"} value={a.caseNumbers} es={es} change={caseNumbers => app(a.id, { caseNumbers })} />
      <Select id={`${id}-${a.id}-outcome`} label={es ? "Resultado de esa solicitud" : "Outcome of that application"} value={a.outcome} group="outcome" es={es} change={v => app(a.id, { outcome: v as NyPriorApplication["outcome"] })} />
      {a.outcome === "partial" || a.outcome === "other" || a.outcomeDetails ? <Text id={`${id}-${a.id}-details`} label={es ? "Explique el resultado real" : "Explain the actual outcome"} value={a.outcomeDetails} es={es} change={outcomeDetails => app(a.id, { outcomeDetails })} /> : null}
      <Select id={`${id}-${a.id}-copy`} label={es ? "Copia de esta solicitud para adjuntar más adelante" : "Copy of this application for later attachment"} value={a.copyStatus} group="copyStatus" es={es} change={v => app(a.id, { copyStatus: v as NyPriorApplication["copyStatus"] })} />
      {a.copyStatus === "unavailable" || a.copyExplanation ? <Text id={`${id}-${a.id}-copy-explanation`} label={es ? "Explique la dificultad para obtener la copia" : "Describe the difficulty obtaining the copy"} value={a.copyExplanation} es={es} change={copyExplanation => app(a.id, { copyExplanation })} /> : null}
      <p className="text-sm">{es ? "Guardar esta respuesta no adjunta una copia. Puede seguir preparando la solicitud mientras obtiene las copias." : "Saving this answer does not attach a copy. You can continue preparing the application while obtaining copies."}</p>
      <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => save({ ...history, applications: history.applications.filter(x => x.id !== a.id) })}>{es ? "Quitar esta solicitud del borrador" : "Remove this application from the draft"}</button>
    </fieldset>)}
    <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => save({ ...history, applications: [...history.applications, emptyNyPriorApplication(crypto.randomUUID())] })}>{es ? "Agregar una solicitud anterior" : "Add an earlier application"}</button>
    <p className="text-sm">{es ? "Registre por separado cada orden de sellado ya concedida y las condenas que realmente selló. Incluya las órdenes iniciadas por el tribunal. No registre una solicitud pendiente o denegada como una orden concedida. Conserve los datos desconocidos para revisión." : "Separately record every entered sealing order and the convictions it actually sealed. Include orders initiated by the court. Do not record a pending or denied application as an entered order. Keep unknown details for review."}</p>
    {history.orders.map((o, i) => <fieldset key={o.id} className="grid gap-4 rounded-xl border border-[#CBD5E1] p-4"><legend className="px-2 font-bold">{es ? "Orden concedida" : "Entered order"} {i + 1}</legend>
      <Select id={`${id}-${o.id}-law`} label={es ? "Ley de esta orden" : "Law for this order"} value={o.law} group="law" es={es} change={v => order(o.id, { law: v as NyPriorOrder["law"] })} />
      <Text id={`${id}-${o.id}-court`} label={es ? "Tribunal que dictó la orden" : "Court that entered the order"} value={o.courtName} es={es} change={courtName => order(o.id, { courtName })} />
      <Text id={`${id}-${o.id}-reference`} label={es ? "Referencia de la orden o números de caso" : "Order reference or case numbers"} value={o.reference} es={es} change={reference => order(o.id, { reference })} />
      <Text id={`${id}-${o.id}-date`} label={es ? "Fecha de la orden (AAAA-MM-DD)" : "Date the order was entered (YYYY-MM-DD)"} value={o.enteredDate} es={es} change={enteredDate => order(o.id, { enteredDate })} />
      <Select id={`${id}-${o.id}-current-status`} label={es ? "Estado actual de la orden o del sellado" : "Current status of the order or sealing"} value={o.currentStatus} group="currentStatus" es={es} change={v => order(o.id, { currentStatus: v as NyPriorOrder["currentStatus"] })} />
      {o.currentStatus === "unsealed" || o.currentStatus === "modified" || o.statusDetails ? <Text id={`${id}-${o.id}-status-details`} label={es ? "Cambio posterior según los registros" : "Later change shown in the records"} value={o.statusDetails} es={es} change={statusDetails => order(o.id, { statusDetails })} /> : null}
      {o.convictions.map((c, j) => <fieldset key={c.id} className="grid gap-3 rounded-lg border p-3"><legend className="px-2 font-semibold">{es ? "Condena realmente sellada" : "Conviction actually sealed"} {j + 1}</legend>
        {([['caseNumbers', 'All case numbers for this conviction', 'Todos los números de caso de esta condena'], ['courtName', 'Conviction court', 'Tribunal de la condena'], ['charge', 'Offense as shown in the order', 'Delito tal como aparece en la orden'], ['section', 'Exact law, section and subsection', 'Ley, sección y subsección exactas'], ['grade', 'Offense level or class in the record', 'Nivel o clase del delito según el expediente']] as const).map(([key, en, spanish]) => <Text key={key} id={`${id}-${c.id}-${key}`} label={es ? spanish : en} value={c[key]} es={es} change={v => conviction(o, c.id, { [key]: v })} />)}
        <Select id={`${id}-${c.id}-role`} label={es ? "Componente que identifica la orden" : "Component identified by the order"} value={c.role} group="role" es={es} change={v => conviction(o, c.id, { role: v as NySealedConviction["role"] })} />
        <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => order(o.id, { convictions: o.convictions.filter(x => x.id !== c.id) })}>{es ? "Quitar esta condena de la orden en el borrador" : "Remove this conviction from the draft order"}</button>
      </fieldset>)}
      <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => order(o.id, { convictions: [...o.convictions, emptyNySealedConviction(crypto.randomUUID())] })}>{es ? "Agregar una condena sellada por esta orden" : "Add a conviction sealed by this order"}</button>
      <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => save({ ...history, orders: history.orders.filter(x => x.id !== o.id) })}>{es ? "Quitar esta orden del borrador" : "Remove this order from the draft"}</button>
    </fieldset>)}
    <button type="button" className={`${buttonClass} justify-self-start`} onClick={() => save({ ...history, orders: [...history.orders, emptyNyPriorOrder(crypto.randomUUID())] })}>{es ? "Agregar una orden de sellado concedida" : "Add an entered sealing order"}</button>
  </div>;
}
