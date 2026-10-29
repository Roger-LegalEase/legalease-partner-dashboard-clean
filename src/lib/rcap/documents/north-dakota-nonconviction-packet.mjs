import {createHash} from "node:crypto";
import census from "../../../../data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill/field-census.census-v1.json" with {type:"json"};
import fieldMap from "../../../../data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill/production-field-map.json" with {type:"json"};
import {ND_NONCONVICTION_ROUTE,ND_NONCONVICTION_DOCUMENT_MANIFEST,ND_NONCONVICTION_OFFICIAL_SOURCE_SHA256,evaluateNorthDakotaNonconviction} from "@/lib/rcap-engine/north-dakota-nonconviction-facts";
import {finalizeOfficialForm} from "../../../../scripts/rcap-official-forms/rcap-official-form-finalize.mjs";
export {ND_NONCONVICTION_OFFICIAL_SOURCE_SHA256};
/** Existing official six-page fill only; no composed-pleading fallback or authority grant. */
export async function renderNorthDakotaNonconvictionPacket(input,sourceBytes){
 if(input.routeId!==ND_NONCONVICTION_ROUTE||evaluateNorthDakotaNonconviction(input.routeId,input.materialScreeningFacts,input.asOf)?.status!=="qualifying")throw new Error("ND initial district-court petition facts remain unresolved");
 if(sourceBytes.byteLength!==1319263||createHash("sha256").update(sourceBytes).digest("hex")!==ND_NONCONVICTION_OFFICIAL_SOURCE_SHA256)throw new Error("ND official six-page source identity changed");
 const doc=census.documents[0],map=fieldMap.documents[0];
 const overflows=map.fields.flatMap(field=>{const measured=doc.fields.find(row=>row.name===field.field),held=field.factId?input.facts[field.factId]:undefined;return measured?.maxLength&&held&&held.length>measured.maxLength?[{field:field.field,class:"declared_max_length_exceeded"}]:[];});
 const result=await finalizeOfficialForm({sourceBytes,expectedSha256:ND_NONCONVICTION_OFFICIAL_SOURCE_SHA256,census:doc.fields,facts:input.facts,explicitMappings:map.explicitMappings,
  unwritableFields:[...map.roleRefusals.map(row=>({field:row.field,class:row.class})),...overflows],captionOnly:doc.captionOnly,documentTextLines:[],suppressSynthesizedAppearances:true});
 const allowed=new Set(map.fields.filter(row=>row.decision==="write").map(row=>row.field));
 if(result.report.written.some(row=>!allowed.has(row.field)))throw new Error("ND official fill wrote outside its existing participant field map");
 return{bytes:result.bytes,artifactSha256:createHash("sha256").update(result.bytes).digest("hex"),pageCount:6,sourceSha256:ND_NONCONVICTION_OFFICIAL_SOURCE_SHA256,documents:structuredClone(ND_NONCONVICTION_DOCUMENT_MANIFEST),
  written:result.report.written,refused:result.report.refused,unfittable:result.report.unfittable,filingReady:false,
  manualCompletion:{petitionElections:"Read and select the actual applicable dismissal/acquittal statements from your court record; no election is invented.",proposedOrder:"Review the proposed-order caption against the petition; complete any remaining caption blanks and the participant paragraph3 selections as the official instructions direct. Leave judicial findings, order date and judge signature blank.",execution:"Complete the actual place/date of signing and your signature only when you execute the declaration.",judicialDistrict:input.manualJudicialDistrict??null}};
}
