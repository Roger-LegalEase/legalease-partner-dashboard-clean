import {MD_CANNABIS_ROUTE,evaluateMarylandCannabis,marylandCannabisQuestions} from "@/lib/rcap-engine/maryland-cannabis-research";
import {adaptMarylandCannabisStructuredFacts} from "@/lib/rcap-engine/maryland-cannabis-structured-intake";
import {ROUTE,validateMdCannabis} from "@/lib/rcap-engine/maryland-cannabis-rules.mjs";

type Answers=Readonly<Record<string,unknown>>;
export type MarylandCannabisFactSnapshot={jurisdiction:string;pathwayId:string|null;verifiedAt:string;screeningAnswers:Answers;prefilledAnswers:Answers;packetAnswers:Answers;serverFacts:Answers};
const DOCUMENT_FIELDS=[
 ["md_cannabis_date_of_birth","person","dob",true,"What is your actual date of birth (YYYY-MM-DD)?","¿Cuál es su fecha de nacimiento real (AAAA-MM-DD)?"],
 ["md_cannabis_street_address","person","street",true,"What mailing street address is safe to disclose on this court petition? Do not substitute account contact details.","¿Qué dirección postal puede revelar de forma segura en esta petición judicial? No sustituya los datos de contacto de su cuenta."],
 ["md_cannabis_city_state_zip","person","cityStateZip",true,"What city, state and postal code belong to that mailing address? Keep leading zeroes; do not substitute the court location.","¿Qué ciudad, estado y código postal corresponden a esa dirección postal? Conserve los ceros iniciales; no sustituya la ubicación del tribunal."],
 ["md_cannabis_phone","person","phone",true,"What telephone number should appear on the petition?","¿Qué número de teléfono debe aparecer en la petición?"],
 ["md_cannabis_email","person","email",false,"What email address should appear, if any? Leave blank if none.","¿Qué correo electrónico debe aparecer, si tiene uno? Déjelo en blanco si no tiene."],
 ["md_cannabis_fax","person","fax",false,"What fax number should appear, if any? Leave blank if none.","¿Qué número de fax debe aparecer, si tiene uno? Déjelo en blanco si no tiene."],
 ["md_cannabis_court_option","court","option",true,"What is the actual filing court's exact official form entry, including (DC) or (CC), such as Carroll County (DC)? Confirm it from the docket; do not infer it from your residence.","¿Cuál es la entrada exacta del tribunal correspondiente en el formulario oficial, incluidos (DC) o (CC), por ejemplo Carroll County (DC)? Confírmela en el expediente; no la deduzca de su domicilio."],
 ["md_cannabis_court_address","court","address",true,"What is the actual filing court's mailing address? Do not substitute your address.","¿Cuál es la dirección postal real del tribunal correspondiente? No sustituya su propia dirección."],
 ["md_cannabis_court_phone","court","phone",true,"What is the actual filing court's telephone number?","¿Cuál es el número de teléfono real del tribunal correspondiente?"],
 ["case_identifier","case","number",true,"What is the actual TRIAL COURT case number? Do not enter a police, prosecution or tracking number here.","¿Cuál es el número real del caso del TRIBUNAL DE PRIMERA INSTANCIA? No ingrese aquí un número policial, de fiscalía ni de seguimiento."],
 ["md_cannabis_tracking_number","case","tracking",false,"What tracking number appears on the actual record, if any? Do not substitute the court case number.","¿Qué número de seguimiento aparece en el expediente real, si existe? No sustituya el número del caso judicial."],
 ["md_cannabis_event","case","event",true,"Was this an actual arrest, service of a summons, or service of a citation?","¿Se trató de un arresto real, de la entrega de una comparecencia judicial o de la entrega de una citación?"],
 ["md_cannabis_event_date","case","eventDate",true,"What was the actual date of that arrest, summons or citation (YYYY-MM-DD)? Do not use the conviction date instead.","¿Cuál fue la fecha real de ese arresto, comparecencia o citación (AAAA-MM-DD)? No use en su lugar la fecha de condena."],
 ["md_cannabis_arresting_agency","case","agency",true,"Which law-enforcement agency handled that event? Use its actual name, not the court or your own name.","¿Qué agencia policial intervino en ese hecho? Use su nombre real, no el del tribunal ni su propio nombre."],
 ["md_cannabis_event_locality","case","locality",true,"In what city or county did that event occur? Do not substitute your current residence.","¿En qué ciudad o condado ocurrió ese hecho? No sustituya su domicilio actual."],
 ["md_cannabis_incident","case","incident",true,"Describe the actual incident for the petition in your own words. Do not invent facts, signatures or attached exhibits.","Describa con sus propias palabras el hecho real para la petición. No invente hechos, firmas ni documentos adjuntos."]
] as const;
export const MARYLAND_CANNABIS_DOCUMENT_FACT_IDS=DOCUMENT_FIELDS.map(([id])=>id);
export const MARYLAND_CANNABIS_REQUIRED_DOCUMENT_FACT_IDS=DOCUMENT_FIELDS.filter(([, , ,required])=>required).map(([id])=>id);
export function marylandCannabisDocumentQuestions(routeKey:string){
 return routeKey!==MD_CANNABIS_ROUTE?[]:DOCUMENT_FIELDS.map(([id,,,required,prompt,promptEs])=>({id,required,prompt,promptEs,
  type:id==="md_cannabis_event"?"single_choice" as const:id.endsWith("_date")||id.endsWith("_birth")?"date_or_unknown" as const:"text_or_unknown" as const,
  ...(id==="md_cannabis_event"?{options:["arrest","summons","citation"],optionsEn:["Arrest","Served with a summons","Served with a citation"],optionsEs:["Arresto","Entrega de comparecencia judicial","Entrega de citación"]}:{})}));
}
export class MarylandCannabisDocumentFactsError extends Error{
 constructor(readonly code:"route_mismatch"|"invalid_snapshot"|"unknown_document_fact"|"conflicting_fact"|"case_not_qualifying"|"invalid_chronology"|"native_fact_refused",readonly factIds:string[]){super(`Maryland072D document facts: ${code}${factIds.length?` (${factIds.join(", ")})`:""}`);this.name="MarylandCannabisDocumentFactsError";}
}
function valueOf(raw:unknown):unknown{
 if(raw&&typeof raw==="object"&&!Array.isArray(raw)){if(Object.keys(raw).some(k=>k!=="value"&&k!=="unknown")||![undefined,false,true].includes((raw as {unknown?:boolean}).unknown))return undefined;return(raw as {unknown?:boolean}).unknown===true?undefined:(raw as {value?:unknown}).value;}
 return raw;
}
function text(raw:unknown):string|undefined{
 const v=valueOf(raw);if(typeof v!=="string"||!v.trim()||/[\x00-\x1f\x7f]|\{\{|\}\}|Morgan Sample|Acceptance Consumer|\[INSERT|placeholder/i.test(v))return undefined;
 const token=v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'").replace(/_/g," ").replace(/\s+/g," ").trim().toLowerCase();
 return["unknown","unsure","not sure","i am not sure","i'm not sure","i do not know","i don't know","no se","no estoy seguro","no estoy segura","prefer not to say","n/a","not applicable"].includes(token)?undefined:v.trim();
}
function exactDate(v:string):boolean{const at=new Date(`${v}T00:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!v.startsWith("0000")&&Number.isFinite(at.getTime())&&at.toISOString().slice(0,10)===v;}
function bool(raw:unknown):boolean|undefined{const v=valueOf(raw),t=typeof v==="string"?v.trim().toLowerCase():v;return[true,"true","yes"].includes(t as boolean|string)?true:[false,"false","no"].includes(t as boolean|string)?false:undefined;}
export function marylandCannabisDocumentAnswerKnown(routeKey:string,id:string,raw:unknown,asOf:string):boolean{
 if(routeKey!==MD_CANNABIS_ROUTE||!exactDate(asOf)||id!=="participant_full_legal_name"&&id!=="charge"&&!MARYLAND_CANNABIS_DOCUMENT_FACT_IDS.some(k=>k===id))return false;
 const v=text(raw);return v!==undefined&&(id!=="md_cannabis_event"||["arrest","summons","citation"].includes(v))&&(!id.endsWith("_date")&&!id.endsWith("_birth")||exactDate(v)&&v<=asOf);
}
export type MarylandCannabisNativeFacts={
 isSyntheticFixture:false;asOf:string;routeKey:string;person:Record<string,string>;court:Record<string,unknown>;
 case:Record<string,unknown>;records:Record<string,unknown>;confirmations:Record<string,unknown>;options:Record<string,unknown>;financial?:unknown;
};
/** Explicit participant transport only; caller separately authenticates, verifies and admits the render. */
export function marylandCannabisDocumentFromSnapshot(snapshot:MarylandCannabisFactSnapshot,matterId:string):{matterId:string;verifiedAt:string;nativeFacts:MarylandCannabisNativeFacts}{
 if(`${snapshot.jurisdiction}:${snapshot.pathwayId}`!==MD_CANNABIS_ROUTE)throw new MarylandCannabisDocumentFactsError("route_mismatch",[]);
 if(typeof snapshot.verifiedAt!=="string"||typeof matterId!=="string"||!matterId.trim()||!/^\d{4}-\d{2}-\d{2}T/.test(snapshot.verifiedAt)||!Number.isFinite(new Date(snapshot.verifiedAt).getTime())||!exactDate(snapshot.verifiedAt.slice(0,10))||new Date(snapshot.verifiedAt).toISOString().slice(0,10)!==snapshot.verifiedAt.slice(0,10)||[snapshot.screeningAnswers,snapshot.prefilledAnswers,snapshot.packetAnswers,snapshot.serverFacts].some(m=>!m||typeof m!=="object"||Array.isArray(m)))throw new MarylandCannabisDocumentFactsError("invalid_snapshot",[]);
 const maps=[snapshot.screeningAnswers,snapshot.prefilledAnswers,snapshot.packetAnswers],allQuestions=marylandCannabisQuestions({},true);
 const owned=[...MARYLAND_CANNABIS_DOCUMENT_FACT_IDS,"participant_full_legal_name","charge",...allQuestions.map(q=>q.id)];
 const injected=owned.filter(id=>Object.hasOwn(snapshot.serverFacts,id));if(injected.length)throw new MarylandCannabisDocumentFactsError("conflicting_fact",injected);
 const rawValues=(id:string)=>maps.filter(m=>Object.hasOwn(m,id)).map(m=>valueOf(m[id]));
 const read=(id:string,required=false):string|undefined=>{const values=rawValues(id).map(text);if(!values.length||values.some(v=>v===undefined)){if(required)throw new MarylandCannabisDocumentFactsError("unknown_document_fact",[id]);return undefined;}if(new Set(values).size!==1)throw new MarylandCannabisDocumentFactsError("conflicting_fact",[id]);return values[0];};
 const facts:Record<string,unknown>={},conflicts:string[]=[];
 for(const q of allQuestions){const raw=rawValues(q.id);if(!raw.length)continue;if(raw.some(v=>v===undefined||v===null||Array.isArray(v)||typeof v==="object"||typeof v==="string"&&!text(v))){facts[q.id]={unknown:true};continue;}const meaning=(v:unknown)=>q.type==="yes_no_unknown"?bool(v):typeof v==="string"?v.trim():v;if(new Set(raw.map(v=>JSON.stringify(meaning(v)))).size!==1){conflicts.push(q.id);facts[q.id]={unknown:true};}else facts[q.id]=structuredClone(raw[raw.length-1]);}
 // Match the existing protected eligibility projection; raw inactive history stays in its original maps.
 const active=new Set(marylandCannabisQuestions(facts).map(q=>q.id));
 const activeConflicts=conflicts.filter(id=>active.has(id));if(activeConflicts.length)throw new MarylandCannabisDocumentFactsError("conflicting_fact",activeConflicts);
 for(const q of allQuestions)if(!active.has(q.id))delete facts[q.id];
 facts.charge=read("charge",true);
 const asOf=snapshot.verifiedAt.slice(0,10),eligibility=evaluateMarylandCannabis(facts,asOf);if(eligibility.status!=="qualifying")throw new MarylandCannabisDocumentFactsError("case_not_qualifying",eligibility.missingFactIds);
 const {facts:adapted,missingFactIds}=adaptMarylandCannabisStructuredFacts(facts);if(missingFactIds.length)throw new MarylandCannabisDocumentFactsError("case_not_qualifying",missingFactIds);
 const person:Record<string,string>={name:read("participant_full_legal_name",true)!},court:Record<string,unknown>={},caseFacts:Record<string,unknown>={};const groups={person,court,case:caseFacts};
 for(const [id,group,destination,required]of DOCUMENT_FIELDS){const v=read(id,required);if(v!==undefined)groups[group][destination]=v;}
 for(const id of["md_cannabis_date_of_birth","md_cannabis_event_date"]){const v=read(id,true)!;if(!exactDate(v)||v>asOf)throw new MarylandCannabisDocumentFactsError("invalid_chronology",[id]);}
 const get=(id:string)=>text(adapted[id]),yes=(id:string)=>bool(adapted[id]),only=yes("md_cannabis_only_charge");
 if(person.dob>String(caseFacts.eventDate))throw new MarylandCannabisDocumentFactsError("invalid_chronology",["md_cannabis_date_of_birth","md_cannabis_event_date"]);
 const basis=get("md_cannabis_basis"),waiver=get("md_cannabis_fee_choice")==="waiver";
 const charges=only===true?[{id:get("md_cannabis_charge_id"),description:facts.charge,statute:get("md_cannabis_charge_statute"),substance:"cannabis",disposition:get("md_cannabis_charge_disposition"),convictionDate:get("md_cannabis_conviction_date"),basis,requested:true}]:adapted.md_cannabis_charge_inventory;
 Object.assign(court,{level:get("md_cannabis_court_level"),transfer:get("md_cannabis_court_transfer"),venueConfirmed:yes("md_cannabis_filing_court_confirmed"),appealed:yes("md_cannabis_case_appealed"),...(get("md_cannabis_court_transfer")==="adult"?{receivingCourtConfirmed:yes("md_cannabis_filing_court_confirmed")}:{}),...(yes("md_cannabis_case_appealed")===true?{isAppellateFilingCourt:yes("md_cannabis_appellate_court_confirmed")}:{}),...(waiver?{restrictedCaseType:yes("md_cannabis_restricted_case_type")}: {})});
 Object.assign(caseFacts,{basis,convictionDate:get("md_cannabis_conviction_date"),...(get("md_cannabis_completion_date")?{completionDate:get("md_cannabis_completion_date")}:{}),otherOffenses:only===false,charges,restitution:{status:get("md_cannabis_restitution_status"),...(yes("md_cannabis_restitution_inability_asserted")!==undefined?{inabilityAsserted:yes("md_cannabis_restitution_inability_asserted")}:{}),...(yes("md_cannabis_restitution_documentation")!==undefined?{documentationAvailable:yes("md_cannabis_restitution_documentation")}: {})}});
 const confirmations:Record<string,unknown>={allIncidentChargesListed:yes("md_cannabis_all_charges_listed"),pendingCriminalProceeding:yes("md_cannabis_pending_proceeding"),selectedRecitalTrue:yes("md_cannabis_recital_confirmed"),...(only===true?{unitEligible:true}:{}),actualObjection:false,hearingScheduled:false};
 for(const [id,key]of[["md_cannabis_conduct_no_longer_crime","conductNoLongerCrime"],["md_cannabis_sentence_complete","sentenceComplete"],["md_cannabis_new_conviction_during_wait","newCrimeDuringWaiting"],["md_cannabis_new_conviction_now_eligible","newConvictionNowEligible"]]){const v=yes(id);if(v!==undefined)confirmations[key]=v;}
 const options:Record<string,unknown>={feeTreatment:get("md_cannabis_fee_choice")};
 if(waiver)for(const [id,key]of[["md_cannabis_prepaid_waiver_requested","prepaidWaiverRequested"],["md_cannabis_unable_to_prepay","unableToPrepay"],["md_cannabis_final_costs_requested","finalOpenCostsRequested"],["md_cannabis_no_material_change","noMaterialChangeAnticipated"]]){const v=yes(id);if(v!==undefined)options[key]=v;}
 const nativeFacts:MarylandCannabisNativeFacts={isSyntheticFixture:false,asOf,routeKey:ROUTE,person,court,case:caseFacts,records:{caseSearchChecked:yes("md_cannabis_case_search_checked"),caseSearchResult:get("md_cannabis_case_search_result"),courtRecordStatus:get("md_cannabis_court_record_status"),confirmationReference:get("md_cannabis_record_reference")},confirmations,options,...(waiver?{financial:structuredClone(adapted.md_cannabis_financial_inventory)}:{})};
 try{const verified=validateMdCannabis(nativeFacts);if(verified.missing.length||!verified.mayMarkBasis)throw new MarylandCannabisDocumentFactsError("case_not_qualifying",verified.missing.map(m=>m.factId));}catch(error){if(error instanceof MarylandCannabisDocumentFactsError)throw error;throw new MarylandCannabisDocumentFactsError(error instanceof Error&&/DATE|DOB_AFTER|EVENT_AFTER|COMPLETION_BEFORE/.test(error.message)?"invalid_chronology":"native_fact_refused",[]);}
 return{matterId,verifiedAt:snapshot.verifiedAt,nativeFacts};
}
