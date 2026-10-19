import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const C=await import('../src/lib/expungement-ai/ca-prop64-contact-answer.ts');
const {caProp64ContactQuestions:questions}=await import('../src/lib/expungement-ai/ca-prop64-contact-questions.ts');
const {caProp64ProtectedDocumentPreparation:prepare}=await import('../src/lib/expungement-ai/ca-prop64-document-preparation.ts');
const {questionAnswerState}=await import('../src/lib/expungement-ai/question-answer-state.ts');
const {profileQuestionSchema}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {caProp64CaptionBindings:bind}=await import('./lib/ca-prop64-caption-bindings.mjs');
assert.equal(C.CA_CONTACT_CONTRACT,'ca_prop64_contacts_v2');
const rows=JSON.parse(fs.readFileSync('scripts/fixtures/ca-prop64-contact-predecessors.json')).rows;
const checks=[],current=[];const check=(name,a,b)=>checks.push({name,pass:JSON.stringify(a)===JSON.stringify(b),actual:a,expected:b});
for(const {id,verification:original}of rows){
 const before=JSON.stringify(original),m=P.protectedPacketInformationModelFor(original);
 check(id+' genuine verified baseline',original.status,'verified');check(id+' readable successor',Boolean(m),true);if(!m)continue;
 for(const fact of C.CA_CONTACT_IDS){check(id+' required '+fact,m.missingInputIds.includes(fact),true);check(id+' builder '+fact,m.builderQuestions.some(q=>q.id===fact),true);check(id+' editable '+fact,P.editablePacketInputIds(m).has(fact),true);}
 check(id+' no inherited verification',m.stage==='ready_to_generate',false);
 const context=C.caContactContext(m.initialAnswers);
 const filer={...C.emptyCaContact(C.CA_FILER_CONTACT,context),attorneyName:'Alex Counsel',barNumber:'012345',street:'100 Oak Avenue',city:'Woodland',state:'CA',zip:'95695',phone:{status:'known',value:'530-555-0100'},fax:{status:'absent',value:''},email:{status:'known',value:'filing@example.test'},firm:{status:'absent',value:''}};
 const court={...C.emptyCaContact(C.CA_COURT_CONTACT,context),street:'1000 Main Street',cityStateZip:'Woodland, CA 95695',mailingRelationship:'same',mailingAddress:''};
 const answers={[C.CA_FILER_CONTACT]:[JSON.stringify(filer)],[C.CA_COURT_CONTACT]:[JSON.stringify(court)]};
 for(const q of questions(m.initialAnswers)){check(id+' schema '+q.id,profileQuestionSchema.safeParse(q).success,true);check(id+' complete '+q.id,questionAnswerState(q,answers[q.id]),'known_valid');}
 const patch=P.packetInformationPatch({protectedVerification:original,answers});check(id+' saves',Boolean(patch),true);if(!patch)continue;
 const record=patch.protectedTransition.nextVerification,model=P.protectedPacketInformationModelFor(record),prep=prepare(record);
 check(id+' current contacts complete',model.missingInputIds.filter(x=>C.CA_CONTACT_IDS.includes(x)),[]);
 check(id+' save remains unverified',record.status==='verified',false);check(id+' prep incomplete',prep.missingContactFactIds,[]);
 const verified=P.packetInformationPatch({protectedVerification:record,answers:{},verify:true});check(id+' actual final verification',verified?.protectedTransition.nextVerification.status,'verified');
 const actor=filer.representation==='attorney'?'attorney':'participant';
 check(id+' exact actor phone',prep.facts[actor+'.phone'],filer.phone.value);check(id+' known optional obligation',prep.facts[actor+'.email'],filer.email.value);check(id+' explicit absent',prep.absentContactFactIds.includes(actor+'.fax'),true);
 const output=bind({familyId:'ca-prop64-set',facts:prep.facts,absentContactFactIds:prep.absentContactFactIds});check(id+' no missing collected contacts',output.missing,[]);
 check(id+' current self representation',actor==='participant'?prep.facts['participant.represented_party']:prep.facts['attorney.represented_party'],actor==='participant'?'Self-represented':context.defendantName);
 for(const status of ['', 'unknown','absent']){const optional={...filer,email:{status,value:'earlier@example.test'}};const wire=[JSON.stringify(optional)];check(id+' optional state '+status,C.caContactAnswerState(C.CA_FILER_CONTACT,wire,context),'known_valid');const saved=P.packetInformationPatch({protectedVerification:record,answers:{[C.CA_FILER_CONTACT]:wire}})?.protectedTransition.nextVerification;check(id+' optional not printed '+status,prepare(saved)?.facts[actor+'.email'],undefined);check(id+' raw optional preserved '+status,P.protectedPacketInformationModelFor(saved)?.initialAnswers[C.CA_FILER_CONTACT],wire);}
 for(const field of ['phone','street',...(actor==='attorney'?['barNumber','attorneyName']:[])])check(id+' unknown core '+field,C.caContactAnswerState(C.CA_FILER_CONTACT,[JSON.stringify({...filer,[field]:field==='phone'?{status:'unknown',value:'earlier number'}:'unknown'})],context),'uncertain');
 for(const [field,v] of [['ca_prop64_filer_representation',actor==='attorney'?'self_represented':'attorney'],['participant_full_legal_name','New Name'],['ca_prop64_filing_court_county','Alameda']]){
  const change=P.packetInformationPatch({protectedVerification:record,answers:{[field]:v}})?.protectedTransition.nextVerification;check(id+' identity save '+field,Boolean(change),true);if(!change)continue;
  const changed=P.protectedPacketInformationModelFor(change);const stale=field==='ca_prop64_filing_court_county'?C.CA_COURT_CONTACT:C.CA_FILER_CONTACT;
  check(id+' identity invalidates '+field,changed.missingInputIds.includes(stale),true);check(id+' identity keeps raw '+field,changed.initialAnswers[stale],answers[stale]);check(id+' identity no old projection '+field,prepare(change).facts[field==='ca_prop64_filing_court_county'?'court.street_address':actor+'.phone'],undefined);
 }
 for(const phone of [{status:'absent',value:'earlier number'},{status:'',value:''},{status:'unknown',value:'earlier number'},{status:'known',value:''},{status:'known',value:'None'},{status:'known',value:' N/A '},{status:'known',value:'sin teléfono'},{status:'known',value:'530-555-0102 ext 4'}]){
  const wire=[JSON.stringify({...filer,phone})],complete=phone.status==='absent'||phone.value==='530-555-0102 ext 4';
  check(id+' phone completion '+JSON.stringify(phone),C.caContactAnswerState(C.CA_FILER_CONTACT,wire,context),complete?'known_valid':'uncertain');
  const saved=P.packetInformationPatch({protectedVerification:record,answers:{[C.CA_FILER_CONTACT]:wire}})?.protectedTransition.nextVerification;
  const projection=prepare(saved), expected=phone.status==='absent'?'None':phone.value==='530-555-0102 ext 4'?phone.value:undefined;
  check(id+' phone projection '+JSON.stringify(phone),projection?.facts[actor+'.phone'],expected);
  check(id+' raw phone preserved '+JSON.stringify(phone),P.protectedPacketInformationModelFor(saved)?.initialAnswers[C.CA_FILER_CONTACT],wire);
  check(id+' email alternative preserved '+JSON.stringify(phone),projection?.facts[actor+'.email'],filer.email.value);
  check(id+' phone never grants generation '+JSON.stringify(phone),projection?.generationAllowed,false);
  const caption=bind({familyId:'ca-prop64-set',facts:projection.facts,absentContactFactIds:projection.absentContactFactIds});
  for(const form of ['CR-400','CR-401','CR-403']){
   const phoneField=Object.entries(caption.mappings[form]).find(([field])=>field.endsWith('.Phone[0]'));
   check(id+' '+form+' phone binding '+JSON.stringify(phone),Boolean(phoneField),complete);
   if(complete)check(id+' '+form+' literal '+JSON.stringify(phone),caption.facts[phoneField[1]],expected);
   else check(id+' '+form+' missing reason '+JSON.stringify(phone),caption.missing.find(x=>x.formNumber===form&&x.factId===actor+'.phone')?.status,'MISSING_HELD_FACT_APPLICABILITY_REVIEW');
  }
 }
 // The old wire stays old: parsing and read-only saves must not upgrade it.
 for(const phone of ['530-555-0100','None','N/A','unknown','']){
  const legacy={...filer,version:'ca_prop64_contacts_v1',phone},wire=[JSON.stringify(legacy)],before=JSON.stringify(wire);
  check(id+' v1 parse exact '+phone,C.parseCaContact(C.CA_FILER_CONTACT,wire),legacy);
  check(id+' v1 classification '+phone,C.caContactAnswerState(C.CA_FILER_CONTACT,wire,context),phone==='unknown'||phone===''?'uncertain':'known_valid');
  const saved=P.packetInformationPatch({protectedVerification:record,answers:{[C.CA_FILER_CONTACT]:wire}})?.protectedTransition.nextVerification;
  check(id+' v1 saved bytes '+phone,P.protectedPacketInformationModelFor(saved)?.initialAnswers[C.CA_FILER_CONTACT],wire);
  check(id+' v1 noop '+phone,P.packetInformationPatch({protectedVerification:saved,answers:{}})?.protectedTransition.nextVerification,saved);
  check(id+' v1 input untouched '+phone,JSON.stringify(wire),before);
 }
 for(const phone of ['530-555-0100',{status:'absent',value:'',extra:true},{status:'fictional',value:'x'}])check(id+' v2 malformed phone',C.parseCaContact(C.CA_FILER_CONTACT,[JSON.stringify({...filer,phone})]),null);
 const legacyCourt={...court,version:'ca_prop64_contacts_v1'};check(id+' v1 court parse',C.parseCaContact(C.CA_COURT_CONTACT,[JSON.stringify(legacyCourt)]),legacyCourt);
 const replacement=P.packetInformationPatch({protectedVerification:record,answers:{[C.CA_FILER_CONTACT]:[JSON.stringify({...filer,phone:{status:'known',value:'530-555-0101'}})]}})?.protectedTransition.nextVerification;
 check(id+' full old contact history',replacement?.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId===C.CA_FILER_CONTACT&&JSON.stringify(h.value)===JSON.stringify(answers[C.CA_FILER_CONTACT])),true);
 for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const [key,value]of Object.entries(original.snapshot[source]))check(id+' old raw '+source+'/'+key,record.draftSnapshot[source][key],value);
 for(const [name,edit]of [['family',s=>s.packetFamilyIdentifiers.mode='wrong'],['server',s=>s.serverFacts.extra='x'],['plan',s=>s.packetPlan.requiredInputIds.pop()],['required',s=>s.requiredInputIds.pop()],['source',s=>s.profileSourceFingerprint='0'.repeat(64)],['authority',s=>s.profileAuthorityFingerprint='0'.repeat(64)]]){
  const bad=structuredClone(original);bad.status='unverified';bad.snapshot=null;bad.hash=null;edit(bad.draftSnapshot);bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);check(id+' rehashed tuple refuses '+name,P.protectedPacketInformationModelFor(bad),null);
 }
 check(id+' baseline unchanged',JSON.stringify(original),before);check(id+' no authority',prep.generationAllowed,false);current.push({id,record,preparation:prep,verifiedRecord:verified?.protectedTransition.nextVerification});
 for(const raw of [true,42,{},['{}'],[JSON.stringify({...filer,extra:'x'})],[JSON.stringify(filer),JSON.stringify(filer)],[' '+JSON.stringify(filer)], [JSON.stringify({...filer,phone:{status:'known',value:'a\nb'}})]])check(id+' strict shape '+JSON.stringify(raw).slice(0,45),C.parseCaContact(C.CA_FILER_CONTACT,raw),null);
}
// Display translates only enum identities, never an owner's literal facts.
for(const locale of ['en','es']){
 const context={representation:'self_represented',defendantName:'known',county:'same'};
 const base={...C.emptyCaContact(C.CA_FILER_CONTACT,context),street:'same',city:'known',zip:'absent'};
 const formatted=C.formatCaContact(C.CA_FILER_CONTACT,[JSON.stringify(base)],locale);
 for(const key of ['street','city','zip','defendantName'])check(locale+' exact literal '+key,formatted.includes(C.CA_CONTACT_LABELS[key][locale]+': '+base[key]),true);
 for(const key of ['attorneyName','barNumber','firm'])check(locale+' inactive blank omitted '+key,formatted.includes(C.CA_CONTACT_LABELS[key][locale]),false);
 const prior={...base,attorneyName:'Prior Counsel',barNumber:'0009',firm:{status:'known',value:'Prior Firm'},email:{status:'absent',value:'earlier@example.test'}};
 const text=C.formatCaContact(C.CA_FILER_CONTACT,[JSON.stringify(prior)],locale),retained=locale==='es'?'Guardado, no se usará ni imprimirá':'Saved, will not be used or printed';
 for(const value of ['Prior Counsel','0009','earlier@example.test'])check(locale+' retained inactive meaning '+value,text.includes(retained+': '+value),true);
 check(locale+' inactive firm meaning',text.split('\n').find(line=>line.startsWith(C.CA_CONTACT_LABELS.firm[locale]+':')).includes(retained),true);
 const court={...C.emptyCaContact(C.CA_COURT_CONTACT,context),mailingRelationship:'same',mailingAddress:'Earlier court address'};
 check(locale+' inactive court address meaning',C.formatCaContact(C.CA_COURT_CONTACT,[JSON.stringify(court)],locale).includes(retained+': Earlier court address'),true);
}
// CA-CAPTION-CONTACT-01 / GA-15 / CA-08: an enrollment answer never relabels an old address.
const {caProp64ContactFacts,caSafeAtHomeQuestion,CA_SAFE_AT_HOME_COPY}=await import('../src/lib/expungement-ai/ca-prop64-contact-questions.ts');
const {prepayGateFactIds}=await import('../src/lib/expungement-ai/packet-collection.ts');
const adopted={"en": {"prompt": "Are you enrolled in California's Safe at Home address confidentiality program?", "helperYes": "Use the substitute mailing address designated by Safe at Home for these forms. Do not enter your confidential home address. California courts generally must accept the designated address, subject to the applicable legal exceptions. This service does not verify your enrollment. If the court raises a question about your address, contact the Safe at Home program and the court clerk for the applicable instructions.", "helperNotSure": "If you are not sure, check with the Safe at Home program before you file. Until then, do not enter a home address you need to keep confidential."}, "es": {"prompt": "¿Está inscrito en Safe at Home, el programa de confidencialidad de direcciones de California?", "helperYes": "Use en estos formularios la dirección postal sustituta que le haya asignado Safe at Home. No ingrese su domicilio confidencial. Por regla general, los tribunales de California deben aceptar la dirección designada, salvo las excepciones legales aplicables. Este servicio no verifica su inscripción. Si el tribunal tiene alguna duda sobre su dirección, consulte al programa Safe at Home y a la secretaría del tribunal para obtener las instrucciones aplicables.", "helperNotSure": "Si no está seguro, consulte al programa Safe at Home antes de presentar los documentos. Mientras tanto, no ingrese un domicilio que necesite mantener confidencial."}, "options": ["Yes", "No", "I am not sure"], "spanishLabels": {"Yes": "Sí", "No": "No", "I am not sure": "No estoy seguro"}};
assert.deepEqual(CA_SAFE_AT_HOME_COPY,adopted,'exact adopted CA-08 English/Spanish');
const privacyId=C.CA_SAFE_AT_HOME_ID,yesShapes=['Yes',true,' Yes ',{value:'Yes'},{value:'Yes',unknown:false}];
for(const {id,record}of current){
 const snapshot=record.draftSnapshot,base=P.protectedPacketInformationModelFor(record),prior=base.initialAnswers[C.CA_FILER_CONTACT],old=C.parseCaContact(C.CA_FILER_CONTACT,prior);assert(old?.kind==='filer');
 const selfRepresented=old.representation==='self_represented',actor=selfRepresented?'participant':'attorney';
 assert.equal(base.builderQuestions.find(q=>q.id===privacyId)?.required,false,'privacy question is optional in the actual builder');assert(P.editablePacketInputIds(base).has(privacyId));
 const collection=P.packetCollectionFor({jurisdiction:snapshot.jurisdiction,pathwayId:snapshot.pathwayId,requiredInputIds:snapshot.requiredInputIds,serverFacts:snapshot.serverFacts,screeningAnswers:snapshot.screeningAnswers,prefilledAnswers:snapshot.prefilledAnswers,savedAnswers:snapshot.packetAnswers});
 const about=base.builderSections.find(section=>section.id==='about_you');
 assert(about?.questionIds.includes(privacyId),'F2 privacy is on the address screen');
 assert(about.questionIds.indexOf(privacyId)<about.questionIds.indexOf(C.CA_FILER_CONTACT),'F2 privacy precedes filer address');
 const contextFact=collection.facts.find(f=>f.factId===privacyId);assert(contextFact?.active&&contextFact.optional);assert(!prepayGateFactIds(collection).includes(privacyId));assert(!snapshot.requiredInputIds.includes(privacyId));
 for(const participation of yesShapes)for(const version of ['ca_prop64_contacts_v1','ca_prop64_contacts_v2']){
  const ordinary={...old,version,...(version.endsWith('_v1')?{phone:'530-555-0100'}:{})},wire=[JSON.stringify(ordinary)];
  const input={...base.initialAnswers,[privacyId]:participation,[C.CA_FILER_CONTACT]:wire,account_address:'Must not be copied',residential_address:'Must not be copied'};
  const before=structuredClone(input),ctx=C.caContactContext(input),facts=caProp64ContactFacts(input).facts;
  assert.equal(Boolean(ctx.safeAtHome),selfRepresented,'F1 only self-represented address is designated');assert.equal(C.caContactAnswerState(C.CA_FILER_CONTACT,wire,ctx),selfRepresented?'uncertain':'known_valid');
  for(const key of ['street_address','city','state','zip'])assert.equal(facts[actor+'.'+key],selfRepresented?undefined:ordinary[key==='street_address'?'street':key],'old self address refused; counsel office remains ordinary');
  assert.deepEqual(input,before);checks.push({name:id+'/role-specific-ordinary-address/'+version+'/'+JSON.stringify(participation),pass:true});
 }
 for(const q of questions({...base.initialAnswers,[privacyId]:'Yes'}))assert(profileQuestionSchema.safeParse(q).success,'F5 contact question schema under Yes: '+q.id);
 const choice=caSafeAtHomeQuestion({...base.initialAnswers,[privacyId]:'Yes'});assert(profileQuestionSchema.safeParse(choice).success);assert.equal(choice.required,false);
 for(const locale of ['en','es']){const copy=locale==='en'?choice:choice.translations.es;assert.equal(copy.prompt,adopted[locale].prompt);assert.equal(copy.helperText,selfRepresented?adopted[locale].helperYes:undefined);}
 const patch=P.packetInformationPatch({protectedVerification:record,answers:{[privacyId]:'Yes'}});assert(patch);const held=patch.protectedTransition.nextVerification;
 const model=P.protectedPacketInformationModelFor(held);assert(model);assert.equal(model.missingInputIds.includes(C.CA_FILER_CONTACT),selfRepresented);assert(!model.missingInputIds.includes(privacyId));
 assert.deepEqual(held.draftSnapshot.requiredInputIds,snapshot.requiredInputIds);assert.deepEqual(held.draftSnapshot.packetPlan,snapshot.packetPlan);assert.deepEqual(model.initialAnswers[C.CA_FILER_CONTACT],prior);
 assert.deepEqual(P.packetInformationPatch({protectedVerification:held,answers:{}}).protectedTransition.nextVerification,held);
 const refused=prepare(held);assert(refused);assert.equal(refused.facts[actor+'.street_address'],selfRepresented?undefined:old.street);assert.equal(refused.generationAllowed,false);
 for(const form of ['CR-400','CR-401','CR-403'])assert.equal(bind({familyId:'ca-prop64-set',facts:refused.facts}).missing.some(x=>x.formNumber===form&&x.factId===actor+'.street_address'),selfRepresented);
 if(selfRepresented){
 const ctx=C.caContactContext(model.initialAnswers),designated={...C.emptyCaContact(C.CA_FILER_CONTACT,ctx),attorneyName:old.attorneyName,barNumber:old.barNumber,street:'PO Box 990099',city:'Sacramento',state:'CA',zip:'95899',phone:{status:'known',value:'916-555-0100'},fax:old.fax,email:old.email,firm:old.firm};
 assert.equal(designated.version,C.CA_DESIGNATED_ADDRESS_VERSION);
 for(const field of ['street','city','state','zip'])for(const missing of ['', 'unknown']){
  const wire=[JSON.stringify({...designated,[field]:missing})],facts=caProp64ContactFacts({...model.initialAnswers,[C.CA_FILER_CONTACT]:wire}).facts;
  assert.equal(C.caContactAnswerState(C.CA_FILER_CONTACT,wire,ctx),'uncertain');
  for(const key of ['street_address','city','state','zip'])assert.equal(facts[actor+'.'+key],undefined,'all designated mailing fields required before projection');
 }
 const wire=[JSON.stringify(designated)],saved=P.packetInformationPatch({protectedVerification:held,answers:{[C.CA_FILER_CONTACT]:wire}})?.protectedTransition.nextVerification;assert(saved);
 assert.equal(prepare(saved).facts[actor+'.street_address'],designated.street);assert.deepEqual(P.packetInformationPatch({protectedVerification:saved,answers:{}}).protectedTransition.nextVerification,saved);
 assert(Array.isArray(saved.draftSnapshot.dependencies.semanticAnswerHistory));assert(saved.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId===C.CA_FILER_CONTACT&&JSON.stringify(h.value)===JSON.stringify(prior)));
 }else{
  assert.equal(C.emptyCaContact(C.CA_FILER_CONTACT,C.caContactContext(model.initialAnswers)).version,C.CA_CONTACT_CONTRACT,'F1 counsel address stays ordinary');
  assert(!questions(model.initialAnswers).find(q=>q.id===C.CA_FILER_CONTACT).helperText.includes(adopted.en.helperYes),'F1 counsel is not told to substitute a PO box');
 }
 for(const value of ['No','I am not sure']){
  const ordinary=P.packetInformationPatch({protectedVerification:record,answers:{[privacyId]:value}})?.protectedTransition.nextVerification;assert(ordinary);
  assert.equal(prepare(ordinary).facts[actor+'.street_address'],old.street);assert.deepEqual(P.protectedPacketInformationModelFor(ordinary).initialAnswers[C.CA_FILER_CONTACT],prior);
  const question=caSafeAtHomeQuestion({...base.initialAnswers,[privacyId]:value});
  if(value==='I am not sure'){
   assert.equal(question.helperText,adopted.en.helperNotSure);assert.equal(question.translations.es.helperText,adopted.es.helperNotSure);
   const incomplete=[JSON.stringify({...old,street:'unknown'})],accepted=P.packetInformationPatch({protectedVerification:ordinary,answers:{[C.CA_FILER_CONTACT]:incomplete}})?.protectedTransition.nextVerification;assert(accepted,'uncertainty saves without disclosing a home address');assert.deepEqual(P.protectedPacketInformationModelFor(accepted).initialAnswers[C.CA_FILER_CONTACT],incomplete);
  }
 }
 checks.push({name:id+'/designated-positive-protected-history-plan-prepay-and-uncertainty',pass:true});
}
const declared=C.emptyCaContact(C.CA_FILER_CONTACT,{representation:'self_represented',defendantName:'Synthetic Filer',county:'Yolo',safeAtHome:true});
for(const malformed of [{...declared,phone:'legacy string'},{...declared,extra:'unexpected'},{...declared,street:'bad\naddress'}])assert.equal(C.parseCaContact(C.CA_FILER_CONTACT,[JSON.stringify(malformed)]),null,'designated wire retains strict boundary validation');
assert.equal(C.parseCaContact(C.CA_COURT_CONTACT,[JSON.stringify({...C.emptyCaContact(C.CA_COURT_CONTACT,{representation:'self_represented',defendantName:'Synthetic Filer',county:'Yolo'}),version:C.CA_DESIGNATED_ADDRESS_VERSION})]),null,'designated participant wire never applies to court address');
for(const raw of ['No',false,'I am not sure',{value:'Yes',unknown:true},{value:'Yes',extra:true},['Yes'],1])assert.notEqual(C.caContactContext({ca_prop64_filer_representation:'self_represented',[privacyId]:raw}).safeAtHome,true);
// F3: a held no-plan draft does not newly collect address context, but retains saved answers.
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(f=>f.pathwayKey==='CA:prop-64-currently-serving-petition-11361-8');
for(const retained of [false,true]){
 const answers=witness.answers;
 const authoritative=evaluate({jurisdiction:'CA',profileVersion:witness.profileVersion,matterId:'safe-home-held-probe',answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,packetAnswers:retained?{[privacyId]:'I am not sure'}:{},dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});
 const record={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
 const model=P.protectedPacketInformationModelFor(record);assert(model);assert.deepEqual(model.requiredInputIds,[]);
 assert.equal(model.builderQuestions.some(q=>q.id===privacyId),retained,'F3 no new privacy question on a no-plan draft');
 assert.equal(P.heldPacketCorrectionInputIds({...model,stateCode:'CA',pathwayId:seed.snapshot.pathwayId},authoritative.evaluation.resultCode).has(privacyId),retained,'F3 only held privacy corrections');
 assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}})?.protectedTransition.nextVerification,record,'F3 no-op preserves held answer');
 if(retained)assert.equal(model.initialAnswers[privacyId],'I am not sure');
 checks.push({name:'held no-plan privacy retained='+retained,pass:true});
}
// Actual controlled callbacks; only the locale hook is replaced, with no writes on mount.
register('data:text/javascript,'+encodeURIComponent('export async function load(u,c,n){return u.endsWith("/LocalizationProvider.tsx")?{format:"module",source:"export function useLocalization(){return {locale:globalThis.__caSafeHomeLocale,t:(_key,fallback)=>fallback,text:value=>value}}",shortCircuit:true}:n(u,c)}'));
const {FilingContactFields}=await import('../src/components/expungement-ai/screening/fields/FilingContactFields.tsx');
const {renderToStaticMarkup}=await import('react-dom/server');
const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'&&tree.props?[tree,...nodes(tree.props.children)]:[];
// N1: the privacy helper precedes filer selection; the address editor still needs the filer.
{
 const answers={[privacyId]:'Yes',participant_full_legal_name:'Synthetic Filer',ca_prop64_filing_court_county:'Yolo'},before=structuredClone(answers);
 const question=caSafeAtHomeQuestion(answers),context=C.caContactContext(answers),saves=[];
 assert.equal(question.helperText,adopted.en.helperYes,'N1 fresh Yes shows the adopted English helper');
 assert.equal(question.translations.es.helperText,adopted.es.helperYes,'N1 fresh Yes shows the adopted Spanish helper');
 assert.equal(context.representation,'');assert.equal(Boolean(context.safeAtHome),false);
 for(const locale of ['en','es']){
  globalThis.__caSafeHomeLocale=locale;
  const tree=FilingContactFields({id:'fresh-privacy',factId:C.CA_FILER_CONTACT,value:[],context,onChange:v=>saves.push(v),ariaLabelledBy:'fresh-privacy-question'});
  assert(nodes(tree).some(n=>n.props.role==='status'),'N1 editor still asks for filer confirmation');
  assert(!renderToStaticMarkup(tree).includes('<input'),'N1 address inputs remain locked before filer selection');
 }
 assert.equal(saves.length,0);assert.deepEqual(answers,before);
 checks.push({name:'N1 fresh Yes helper before filer selection; editor locked',pass:true});
}
for(const locale of ['en','es'])for(const representation of ['self_represented','attorney'])for(const version of ['ca_prop64_contacts_v1','ca_prop64_contacts_v2']){
 globalThis.__caSafeHomeLocale=locale;
 const context=C.caContactContext({ca_prop64_filer_representation:representation,participant_full_legal_name:'Synthetic Filer',ca_prop64_filing_court_county:'Yolo',[privacyId]:'Yes'}),old={...C.emptyCaContact(C.CA_FILER_CONTACT,{...context,safeAtHome:false}),version,street:'Old confidential residence',city:'Old city',state:'CA',zip:'95695',...(version.endsWith('_v1')?{phone:'530-555-0100'}:{})};
 const raw=[JSON.stringify(old)],before=structuredClone(raw),saves=[];
 const props={id:'privacy',factId:C.CA_FILER_CONTACT,value:raw,context,onChange:v=>saves.push(v),ariaLabelledBy:'privacy-question'};
 const tree=FilingContactFields(props);renderToStaticMarkup(tree);assert.equal(saves.length,0);assert.deepEqual(raw,before);
 if(representation==='attorney'){
  assert.equal(nodes(tree).find(n=>n.props.id==='privacy-street')?.props.value,old.street,'F1 attorney office remains editable');
  assert(!nodes(tree).some(n=>n.props.role==='status'&&String(n.props.children).includes('Safe at Home')));
  checks.push({name:'privacy editor ordinary counsel '+locale+'/'+version,pass:true});continue;
 }
 const status=nodes(tree).find(n=>n.props.role==='status');
 assert.equal(status?.props.children,locale==='es'?'Ingrese la dirección postal designada por Safe at Home; su dirección anterior seguirá guardada y no se usará en estos formularios.':'Enter your Safe at Home designated mailing address; your earlier address will stay saved and will not be used on these forms.','F4 accurate address re-entry reason');
 const reset=nodes(tree).find(n=>n.type==='button');assert(reset&&!reset.props.disabled);reset.props.onClick();assert.equal(saves.length,1);
 const fresh=C.parseCaContact(C.CA_FILER_CONTACT,saves[0]);assert(fresh?.kind==='filer');assert.equal(fresh.version,C.CA_DESIGNATED_ADDRESS_VERSION);for(const key of ['street','city','state','zip'])assert.equal(fresh[key],'','explicit re-entry never copies old address');assert.deepEqual(raw,before);
 const designated={...fresh,street:'PO Box 990099',city:'Sacramento',state:'CA',zip:'95899'},saved=[JSON.stringify(designated)];
 const ordinaryTree=FilingContactFields({...props,value:saved,context:{...context,safeAtHome:false}});
 const street=nodes(ordinaryTree).find(n=>n.props.id==='privacy-street');assert.equal(typeof street?.props.change,'function');street.props.change('New ordinary address');
 const edited=C.parseCaContact(C.CA_FILER_CONTACT,saves.at(-1));assert(edited);assert.equal(edited.version,C.CA_CONTACT_CONTRACT);assert.equal(C.caContactCurrent(edited,context),false,'switching back to Yes cannot reuse an ordinary edit');assert.deepEqual(saved,[JSON.stringify(designated)]);
 checks.push({name:'privacy editor '+locale+'/'+representation+'/'+version,pass:true});
}

// CA-08: count the helper across the actual question renderer, including the fresh N1 state.
const React=(await import('react')).default;
const {QuestionField}=await import('../src/components/expungement-ai/screening/QuestionField.tsx');
for(const locale of ['en','es'])for(const representation of [undefined,'self_represented','attorney']){
 globalThis.__caSafeHomeLocale=locale;
 const answers={[privacyId]:'Yes',ca_prop64_filer_representation:representation,participant_full_legal_name:'Synthetic Filer',ca_prop64_filing_court_county:'Yolo'},before=structuredClone(answers);
 const all=[caSafeAtHomeQuestion(answers),...questions(answers)];
 const html=renderToStaticMarkup(React.createElement(React.Fragment,null,...all.map(question=>React.createElement(QuestionField,{key:question.id,question,stateCode:'CA',value:answers[question.id],onChange(){throw Error('render must not save')}}))));
 const needle=renderToStaticMarkup(React.createElement('p',null,adopted[locale].helperYes)).slice(3,-4);
 check('CA-08 actual helper count '+locale+'/'+representation,html.split(needle).length-1,representation==='attorney'?0:1);assert.deepEqual(answers,before);
 // Uncertain enrollment keeps the existing filer warning; no new address claim.
 const unknown=questions({...answers,[privacyId]:'I am not sure'}).find(q=>q.id===C.CA_FILER_CONTACT);
 assert((locale==='es'?unknown.translations.es.helperText:unknown.helperText).includes(adopted[locale].helperNotSure));
}
const failed=checks.filter(x=>!x.pass),report={status:failed.length?'FAIL':'PASS',checks:checks.length,failed,details:checks,current,limits:['Engineering fact collection only. Source/legal/language/visual/fulfillment approvals pending.','Authenticated owner and rendered source PDF acceptance separately required.']};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:checks.length,failed:failed.map(x=>({name:x.name,actual:x.actual,expected:x.expected}))}));assert.equal(failed.length,0);
