// Observation only, loaded solely by the local payment verifier. Return the
// unchanged decision; never inject a record, verdict or admission result.
export async function load(url, context, nextLoad) {
  const result=await nextLoad(url,context);
  if(!url.endsWith('/src/lib/rcap/fulfillment/grade-a-admission.ts'))return result;
  const source=String(result.source);
  const start=source.indexOf('export function admitCommercial(');
  const end=source.indexOf('\n}',start);
  if(start<0||end<0)throw new Error('admission trace cannot locate exact function');
  const block=source.slice(start,end);
  if(!block.includes('return admitCommercialAction({'))throw new Error('admission trace shape changed');
  const traced=block.replace('return admitCommercialAction({','const observedDecision = admitCommercialAction({')
    +'\n  globalThis.__rcapPaymentAdmissionTrace?.({ admissionPoint, request, decision: observedDecision });\n  return observedDecision;';
  return {...result,source:source.slice(0,start)+traced+source.slice(end)};
}
