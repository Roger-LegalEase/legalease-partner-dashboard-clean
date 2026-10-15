import type {EngineProfile,PublicQuestion} from "@/lib/rcap-engine/contracts";
export const WY_1501_ROUTE="misdemeanor-conviction-expungement-w-s-7-13-1501";
export const WY_1501_SOURCE="WY.memo:wy_misd_1501;WS7-13-1501;retained-wy-eligibility-reconciliation;Q-e2abe695fae9053d5c01";
const EXPECTED={
  "sourceRef": "section:60-82",
  "ruleClauses": [
    "A person who pled guilty, pled no contest, or was convicted of a Wyoming misdemeanor may petition the convicting court for expungement of records of conviction. (\"https://law.justia.com/codes/wyoming/title-7/chapter-13/article-15/section-7-13-1501/\")",
    "Case type Misdemeanor guilty plea, no-contest plea, or conviction",
    "Waiting period - status offense 1 year after expiration of sentence terms, including probation and court-ordered program completion",
    "Waiting period - non-status offense 5 years after expiration of sentence terms, including probation and court-ordered program completion",
    "Firearm bar Misdemeanor must not have involved use or attempted use of a firearm",
    "Health-care provider bar Health-care provider convicted under W.S. 6-2-313 against a patient is not eligible",
    "Danger finding Court must find petitioner is not a substantial danger to self, victim, or society",
    "One-time limit Only one expungement under 7-13-1501",
    "Service Verified petition served on prosecutor and DCI",
    "Objection window Prosecutor/victim has 30 days to object",
    "The statute sets the 5-year / 1-year timing rule, firearm bar, health-care provider bar, $100 filing fee, DCI/prosecutor service requirement, 30-day objection process, substantial-danger finding, and one-time limit. (",
    "\"https://law.justia.com/codes/wyoming/title-7/chapter-13/article-15/section-7-13-1501/\")",
    "is conduct that would not be a crime if committed by an adult, with statutory exceptions. In plain English: it is usually something illegal because of the person\u0019s age/status, not because the conduct is criminal for everyone. (\"https://law.justia.com/codes/wyoming/title-7/chapter-1/section-7-1-107/?utm_source=chatgpt.com\")",
    "Wilma trap: Do not assume all underage alcohol/nicotine/minor conduct is automatically a status offense for this statute. Verify the exact charge and statute."
  ],
  "waitingRules": [
    "Waiting period - status offense 1 year after expiration of sentence terms, including probation and court-ordered program completion",
    "Waiting period - non-status offense 5 years after expiration of sentence terms, including probation and court-ordered program completion",
    "Objection window Prosecutor/victim has 30 days to object"
  ],
  "exclusionRules": [
    "Health-care provider bar Health-care provider convicted under W.S. 6-2-313 against a patient is not eligible"
  ]
};
/** Exact retained source; this procedure correction confers no fulfillment authority. */
export function wy1501Contract(profile:EngineProfile|undefined,route:string|null|undefined=WY_1501_ROUTE):boolean {
 const p=profile?.pathways.find(p=>p.id===WY_1501_ROUTE) as (EngineProfile["pathways"][number] & {automatic?:boolean;filingRequired?:boolean;routeType?:string})|undefined,plan=profile?.packetGenerator.pathways.find(p=>p.pathwayId===WY_1501_ROUTE);
 const original=p?.automatic===true&&p.filingRequired===false&&p.routeType==="automatic"&&plan?.mode==="automatic_relief_verification_and_guidance"&&plan.formMappingStatus==="not_required";
 const corrected=p?.automatic===false&&p.filingRequired===true&&p.routeType==="court_filing"&&plan?.mode==="state_specific_custom_packet_from_source_rules"&&plan.formMappingStatus==="custom_or_manual_mapping_required";
 return Boolean(profile?.jurisdiction.code==="WY"&&route===WY_1501_ROUTE&&profile.profileVersion==="2026-06-19-source-conversion-1"&&profile.source?.sourceCorpusSha256==="8be51e84e828de3bece45e51b68744cc68ba6662c7db7991bba8d70a565e00aa"&&(original||corrected)&&p&&Object.entries(EXPECTED).every(([k,v])=>JSON.stringify((p as unknown as Record<string,unknown>)[k]??null)===JSON.stringify(v)));
}
export function withWyoming1501Procedure(profile:EngineProfile):EngineProfile {
 if(!wy1501Contract(profile))return profile;
 return {...profile,pathways:profile.pathways.map(p=>p.id!==WY_1501_ROUTE?p:{...p,automatic:false,filingRequired:true,routeType:"court_filing",suggestedResultCode:"needs_review",summary:"W.S. 7-13-1501 requires a verified petition to the convicting court. State-statute misdemeanor and completed misdemeanor-deferral cases use the source-specific one- or five-year period after all sentence, probation and court-ordered program terms expire. Relief is not automatic.",frontendBranch:{...(p as {frontendBranch?:Record<string,unknown>}).frontendBranch,matchedResult:"needs_review",paymentAllowed:false}}),packetGenerator:{...profile.packetGenerator,pathways:profile.packetGenerator.pathways.map(p=>p.pathwayId!==WY_1501_ROUTE?p:{...p,mode:"state_specific_custom_packet_from_source_rules",formMappingStatus:"custom_or_manual_mapping_required"})}};
}
export function wy1501Context(profile:EngineProfile|undefined,route:string|null|undefined,a:Readonly<Record<string,unknown>>):boolean {
 if(!wy1501Contract(profile))return false;
 if(route===WY_1501_ROUTE)return true;if(route!=null)return false;
 return a.possible_pathway_context===WY_1501_ROUTE||a.possible_pathway_context===profile!.pathways.find(p=>p.id===WY_1501_ROUTE)!.label;
}
type Choice=[string,string,string];const unsure:Choice=["unknown","I am not sure","No estoy seguro"],yn:Choice[]=[["yes","Yes","Sí"],["no","No","No"],unsure];
const q=(id:string,prompt:string,es:string,type="single_choice",choices?:Choice[]):PublicQuestion=>({id,prompt,type,required:false,stage:"timing_and_completion",contextOnly:false,doesNotSelectPathway:true,lifecyclePhase:"prepay_timing_gate",options:choices?.map(c=>c[0])??null,...(choices?{optionDisplay:Object.fromEntries(choices.map(([v,label,translated])=>[v,{label,translations:{es:{label:translated}}}]))}:{}),translations:{es:{prompt:es}}});
export const WY_1501_QUESTIONS:PublicQuestion[]=[
 q("wy_1501_record_origin","Does the court record identify a Wyoming state statute or a city or town ordinance?","¿Identifica el expediente una ley del estado de Wyoming o una ordenanza municipal?","single_choice",[["state_statute","Wyoming state statute","Ley del estado de Wyoming"],["municipal_ordinance","City or town ordinance","Ordenanza municipal"],["outside_wyoming","Federal, tribal or another state's law","Ley federal, tribal o de otro estado"],unsure]),
 q("wy_1501_disposition","What happened in this misdemeanor matter? Use the court's actual disposition.","¿Qué ocurrió en este asunto de delito menor? Use la resolución real del tribunal.","single_choice",[["misdemeanor_conviction","Misdemeanor guilty plea, no-contest plea or conviction","Declaración de culpabilidad o de no oposición, o condena, por un delito menor"],["completed_misdemeanor_deferral","Completed misdemeanor deferred adjudication, including dismissal after probation","Adjudicación diferida de un delito menor cumplida, incluida desestimación después de la libertad condicional"],["active_deferral","Deferred adjudication is still active","La adjudicación diferida sigue activa"],["felony","Felony conviction or felony deferral","Condena o resolución diferida por delito grave"],["chins","Juvenile Child in Need of Supervision (CHINS) adjudication","Adjudicación juvenil de menor que necesita supervisión (CHINS)"],unsure]),
 q("wy_1501_statute_section","What exact Wyoming statute section and subsection appears on your judgment or deferred-disposition record? For example: W.S. 12-6-101(c).","¿Qué artículo y apartado exactos de las leyes de Wyoming figuran en su sentencia o resolución diferida? Por ejemplo: W.S. 12-6-101(c).","text"),
 q("wy_1501_terms_expired","Have all court-imposed sentence terms expired, including probation and every court-ordered program? A payment or filing-fee waiver alone does not establish this.","¿Han terminado todos los términos de la sentencia impuestos por el tribunal, incluida la libertad condicional y todos los programas ordenados? Un pago o una exención de tasa por sí solos no acreditan esto.","single_choice",yn),
 q("wy_1501_terms_expiration_date","On what date did the last sentence, probation or court-ordered program term expire? This is not the arrest or conviction date.","¿En qué fecha terminó el último término de la sentencia, libertad condicional o programa ordenado? No es la fecha del arresto ni la condena.","date_or_unknown"),
 q("wy_1501_firearm","Did the offense involve use or attempted use of a firearm?","¿El delito implicó el uso o intento de uso de un arma de fuego?","single_choice",yn),
 q("wy_1501_prior_expungement","Have you previously received a misdemeanor expungement under W.S. 7-13-1501? This section permits one in a lifetime.","¿Ha recibido antes una eliminación de antecedentes por delito menor conforme a W.S. 7-13-1501? Este artículo permite una en toda la vida.","single_choice",yn),
 q("wy_1501_provider_patient","For this W.S. 6-2-313 offense, were you a health care provider and was the person a patient under your care?","En este delito conforme a W.S. 6-2-313, ¿era usted proveedor de atención médica y era la persona un paciente bajo su cuidado?","single_choice",yn),
 q("wy_1501_lesser_charge","Was a plea entered to a lesser charge arising from the same incident?","¿Se declaró culpable o no opuso defensa a un cargo menor derivado del mismo incidente?","single_choice",yn)
];
export const WY_1501_FACT_IDS=WY_1501_QUESTIONS.map(q=>q.id);
function text(raw:unknown):string|null {if(raw&&typeof raw==="object"&&!Array.isArray(raw)){const v=raw as Record<string,unknown>;if(v.unknown!==false||!Object.hasOwn(v,"value")||Object.keys(v).length!==2)return null;raw=v.value;}return typeof raw==="string"&&raw.trim()?raw.trim():null;}
function yesno(raw:unknown):boolean|undefined {const v=text(raw)?.toLowerCase();return v==="yes"?true:v==="no"?false:undefined;}
export function wy1501Section(raw:unknown):string|null {const v=text(raw)?.replace(/^W\.?\s*S\.?\s*/i,"").replace(/^§\s*/,"").replace(/\s/g,"").toLowerCase();return v&&/^\d+-\d+-\d+(?:\([a-z0-9]+\))*$/.test(v)?v:null;}
function date(raw:unknown):Date|null {const v=text(raw);if(!v||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const d=new Date(v+"T00:00:00.000Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v?d:null;}
export function wy1501FactIds(a:Readonly<Record<string,unknown>>,includeInactive=false):string[]{
 const ids=["wy_1501_record_origin","wy_1501_disposition"];
 if(!includeInactive&&(a.wy_1501_record_origin!=="state_statute"||!["misdemeanor_conviction","completed_misdemeanor_deferral"].includes(String(a.wy_1501_disposition))))return ids;
 if(!includeInactive&&/^14-3-(?:304|305)(?:\(|$)/.test(wy1501Section(a.wy_1501_statute_section)??""))return [...ids,"wy_1501_statute_section"];
 ids.push("wy_1501_statute_section","wy_1501_terms_expired","wy_1501_firearm","wy_1501_prior_expungement","wy_1501_lesser_charge");
 if(includeInactive||yesno(a.wy_1501_terms_expired)===true)ids.push("wy_1501_terms_expiration_date");
 if(includeInactive||/^6-2-313(?:\(|$)/.test(wy1501Section(a.wy_1501_statute_section)??""))ids.push("wy_1501_provider_patient");return ids;
}
export function wy1501QuestionApplies(profile:EngineProfile,route:string|null|undefined,a:Readonly<Record<string,unknown>>,id:string):boolean {
 const context=wy1501Context(profile,route,a);if(WY_1501_FACT_IDS.includes(id))return context&&wy1501FactIds(a).includes(id);
 // Replace the generic money/completion inference with the actual source-owned
 // term-expiration facts; raw historical answers remain in their original maps.
 return !context||!["financial_obligations","sentence_completion_date","court_requirements_completed","resolved_timing_bucket"].includes(id);
}
export const WY_1501_COPY={
 nicotine:["W.S. 14-3-304 and 14-3-305 use a separate expungement procedure by operation of law, not a W.S. 7-13-1501 petition. The separate procedure requires payment of the fine and six months after entry of conviction, rather than the one- or five-year period after sentence terms expire. It does not use the lifetime W.S. 7-13-1501 allowance. An earlier general payment answer does not establish that this fine was paid. Payment, the conviction date and the current court-record status remain unverified here; we do not confirm that expungement occurred or that you may deny the conviction. Confirm these facts with the court. This result authorizes no packet or payment through this service.","W.S. 14-3-304 y 14-3-305 tienen un procedimiento separado de eliminación por ministerio de la ley, no una petición conforme a W.S. 7-13-1501. El procedimiento separado exige pagar la multa y que transcurran seis meses desde la entrada de la condena, en lugar del plazo de uno o cinco años desde que terminan los términos de la sentencia. No consume la oportunidad de eliminación de por vida conforme a W.S. 7-13-1501. Una respuesta general anterior sobre pagos no acredita que se haya pagado esta multa. El pago, la fecha de la condena y el estado actual del expediente judicial siguen sin verificarse aquí; no confirmamos que se haya eliminado la condena ni que pueda negarla. Confirme estos datos con el tribunal. Este resultado no autoriza un paquete ni un pago mediante este servicio."],
 missing:["Confirm the court record's statute, misdemeanor disposition and actual sentence-term expiration. Unknown facts remain unknown; payment alone does not establish expiration.","Confirme la ley, la resolución por delito menor y la terminación real de los términos de la sentencia que constan en el expediente. Los datos desconocidos siguen siendo desconocidos; un pago por sí solo no acredita la terminación."],
 municipal:["Whether this city or town ordinance conviction falls within W.S. 7-13-1501 remains unresolved. Keep the ordinance and actual court information; do not substitute a state statute.","Aún no se ha resuelto si esta condena por ordenanza municipal está comprendida en W.S. 7-13-1501. Conserve la ordenanza y la información real del tribunal; no las sustituya por una ley estatal."],
 outside:["These facts do not fit this Wyoming misdemeanor petition. A CHINS adjudication, felony matter or record under another jurisdiction is not converted into this procedure.","Estos hechos no corresponden a esta petición de Wyoming por delito menor. Una adjudicación CHINS, un asunto por delito grave o un expediente de otra jurisdicción no se convierte en este procedimiento."],
 excluded:["The stated firearm or prior-expungement fact prevents relief under this misdemeanor section. Preserve the actual answer; no other procedure has been selected.","El hecho declarado sobre el arma de fuego o una eliminación anterior impide la reparación conforme a este artículo de delitos menores. Conserve la respuesta real; no se ha seleccionado otro procedimiento."],
 provider:["The stated health care provider and patient facts fall within this section's W.S. 6-2-313 exclusion.","Los hechos declarados sobre el proveedor de atención médica y el paciente corresponden a la exclusión de W.S. 6-2-313 prevista en este artículo."],
 lesser:["The lesser-charge plea changes the source analysis and requires review of the incident's court records before selecting this petition.","La declaración sobre un cargo menor cambia el análisis legal y requiere revisar los expedientes judiciales del incidente antes de seleccionar esta petición."],
 conflict:["The saved disposition or statute does not establish a consistent misdemeanor branch. Correct only inaccurate facts using the actual court record.","La resolución o la ley guardadas no acreditan una modalidad coherente de delito menor. Corrija únicamente los datos inexactos usando el expediente judicial real."],
 not_yet:["The source-specific sentence, probation or program term has not expired, or the applicable one- or five-year waiting period has not elapsed. Paying a balance does not replace this condition.","El término específico de la sentencia, libertad condicional o programa no ha terminado, o aún no ha transcurrido el plazo aplicable de uno o cinco años. Pagar un saldo no sustituye esta condición."],
 review:["The stated state-statute misdemeanor facts and source-specific waiting period support a W.S. 7-13-1501 petition, including a completed misdemeanor deferral. Relief is not automatic. This section permits one expungement in a lifetime; the court decides the substantial-danger finding and whether to grant relief. Further packet and source verification remains before preparation through this service. This section does not promise restored rights or permission to deny the record.","Los hechos declarados sobre el delito menor conforme a una ley estatal y el plazo específico permiten una petición según W.S. 7-13-1501, incluida una resolución diferida de delito menor cumplida. La reparación no es automática. Este artículo permite una eliminación en toda la vida; el tribunal decide sobre el peligro sustancial y si concede la reparación. Aún falta verificar el paquete y sus fuentes antes de prepararlo mediante este servicio. Este artículo no promete restituir derechos ni autoriza negar el expediente."]
} as const;
type Decision={status:"missing"|"review"|"excluded"|"not_yet";code:keyof typeof WY_1501_COPY;ids:string[];years?:number;earliest?:string};
export function wy1501Facts(a:Readonly<Record<string,unknown>>,today:string):Decision {
 const d=(status:Decision["status"],code:Decision["code"],ids:string[]=[]):Decision=>({status,code,ids});
 const origin=text(a.wy_1501_record_origin),disposition=text(a.wy_1501_disposition);
 if(origin==="outside_wyoming"||["chins","felony"].includes(disposition??""))return d("excluded","outside");
 if(origin==="municipal_ordinance")return d("review","municipal");
 if(disposition==="active_deferral")return d("not_yet","not_yet",["wy_1501_disposition"]);
 if(origin!=="state_statute"||!["misdemeanor_conviction","completed_misdemeanor_deferral"].includes(disposition??""))return d("missing","missing",[...(origin!=="state_statute"?["wy_1501_record_origin"]:[]),...(!["misdemeanor_conviction","completed_misdemeanor_deferral"].includes(disposition??"")?["wy_1501_disposition"]:[])]);
 if(a.offense_level==="Felony"||disposition==="completed_misdemeanor_deferral"&&["Misdemeanor conviction","Felony conviction"].includes(String(a.case_outcome)))return d("review","conflict",["offense_level","case_outcome","wy_1501_disposition"]);
 const section=wy1501Section(a.wy_1501_statute_section);
 // The retained decision assigns these exact sections to their own fine-dependent
 // six-month mechanism. No generic payment or term date proves its operation.
 if(/^14-3-(?:304|305)(?:\(|$)/.test(section??""))return d("review","nicotine");
 if(yesno(a.wy_1501_firearm)===true||yesno(a.wy_1501_prior_expungement)===true)return d("excluded","excluded");
 if(yesno(a.wy_1501_lesser_charge)===true)return d("review","lesser");
 if(!section||/^6-4-305$/.test(section))return d("missing","missing",["wy_1501_statute_section"]);
 if(/^14-6-402(?:\(|$)/.test(section))return d("excluded","outside");
 if(/^6-2-313(?:\(|$)/.test(section)&&yesno(a.wy_1501_provider_patient)===true)return d("excluded","provider");
 if(yesno(a.wy_1501_terms_expired)===false)return d("not_yet","not_yet",["wy_1501_terms_expired"]);
 const missing=wy1501FactIds(a).filter(id=>id.endsWith("_date")?!date(a[id]):["wy_1501_terms_expired","wy_1501_firearm","wy_1501_prior_expungement","wy_1501_lesser_charge","wy_1501_provider_patient"].includes(id)?yesno(a[id])===undefined:false);
 if(missing.length)return d("missing","missing",missing);
 const anchor=date(a.wy_1501_terms_expiration_date),now=date(today);if(!anchor||!now)return d("missing","missing",["wy_1501_terms_expiration_date"]);
 const years=/^6-4-305\(b\)(?:\(|$)/.test(section)?1:5,earliest=new Date(anchor.getTime());earliest.setUTCFullYear(earliest.getUTCFullYear()+years);
 return {...d(earliest>now?"not_yet":"review",earliest>now?"not_yet":"review"),years,earliest:earliest.toISOString().slice(0,10)};
}
