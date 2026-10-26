import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),load=p=>import(pathToFileURL(root+'/'+p));
register(pathToFileURL(root+'/scripts/lib/ts-esm-loader.mjs'));
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {contactRepresentationHash:hash}=await load('src/lib/expungement-ai/contact-representation.ts');
const {reviewedPacketContractSuccessor:successor}=await load('src/lib/expungement-ai/packet-contract-successors.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const contracts=JSON.parse(fs.readFileSync(root+'/src/lib/expungement-ai/reviewed-packet-contract-successors.json'));
const route='ND:first-offense-possession-sealing',contract=contracts.routes[route];
// Exact source-plan bytes retained from accepted 7c4 EN/ES owner snapshots; no participant values.
const previousPlan={
  "mode": "state_specific_custom_packet_from_source_rules",
  "pathwayId": "first-offense-possession-sealing",
  "sourceFormIds": [],
  "sourceRuleRefs": [
    "section:90-95",
    "corpus-unit:38"
  ],
  "packetReadyWhen": [
    "backend result is packet_ready or packet_ready_with_caution",
    "every source-defined pathway fact is answered",
    "all waiting and completion conditions are satisfied",
    "no exclusion, ambiguity, or required-review flag remains",
    "the selected form revision and filing location pass source-freshness checks"
  ],
  "requiredInputIds": [
    "age_at_offense",
    "case_outcome",
    "charge",
    "contact_information",
    "court",
    "criminal_history",
    "disposition_date",
    "financial_obligations",
    "jurisdiction",
    "offense_category",
    "offense_level",
    "pardon_status",
    "participant_full_legal_name",
    "pathway_id",
    "prior_relief",
    "record_type",
    "residency_or_location",
    "sentence_completion_date",
    "trafficking_status",
    "case_number",
    "nd_charged_quantity",
    "nd_first_offense_confirmation"
  ],
  "formMappingStatus": "custom_or_manual_mapping_required"
};
const witness=JSON.parse(fs.readFileSync(root+'/data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(x=>x.pathwayKey===route);
const authority=evaluate({jurisdiction:'ND',profileVersion:witness.profileVersion,matterId:'synthetic-contract-successor',answers:witness.answers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:authority,screeningAnswers:witness.answers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});assert(seed);
const snapshot={...seed.snapshot,packetPlan:previousPlan,requiredInputIds:previousPlan.requiredInputIds,packetAnswers:{...seed.snapshot.packetAnswers,case_number:{value:'Original recorded case',unknown:true},nd_charged_quantity:'Original quantity prose',nd_first_offense_confirmation:'Unknown'}};
const synthetic={status:'unverified',reason:'synthetic_source_plan_compatibility',revision:0,draftHash:P.protectedPacketDraftHash(snapshot),draftSnapshot:snapshot,hash:null,snapshot:null};
const actualPaths=process.argv.slice(2);
const records=[{label:'portable synthetic retained-plan contract',record:synthetic},...actualPaths.map(file=>({label:file.split('/').at(-1),record:JSON.parse(fs.readFileSync(file))}))];
let checks=0;const check=(label,fn)=>{try{fn();checks++}catch(e){e.message=label+': '+e.message;throw e}};
check('exact current and predecessor contract pins',()=>{assert.equal(hash(previousPlan),contract.previousPlanSha256);assert.equal(hash(previousPlan.requiredInputIds),contract.previousRequiredIdsSha256);assert.equal(hash(authority.evaluation.packetPlan),contract.currentPlanSha256)});
for(const {label,record} of records){
 const before=structuredClone(record),s=record.draftSnapshot,projected=successor(s,authority.evaluation.packetPlan),model=P.protectedPacketInformationModelFor(record);
 check(label+' exact original integrity and current projection',()=>{assert.equal(P.protectedPacketDraftHash(s),record.draftHash);assert(projected);assert(model);assert.equal(model.stateCode,'ND');assert.equal(model.pathwayId,'first-offense-possession-sealing');assert.deepEqual(projected.packetPlan,authority.evaluation.packetPlan);assert.deepEqual(record,before)});
 check(label+' plan-only projection retains every authority and raw field',()=>{const {packetPlan:oldPlan,requiredInputIds:oldIds,...oldRest}=s;const {packetPlan:newPlan,requiredInputIds:newIds,...newRest}=projected;assert.deepEqual(newRest,oldRest);assert.equal(s.resultCode,'needs_review');assert.equal(s.paymentAllowed,false);assert.notEqual(record.status,'verified');assert.equal(P.packetAccountEmailSuggestion(model,'account@example.test'),null)});
 const item={id:'synthetic-contract-successor',jurisdiction:'ND',artifactRefs:{}};
 const noop=P.packetInformationPatch({existingItem:item,answers:{},protectedVerification:record});
 check(label+' ordinary no-op retains entire old protected record',()=>{assert(noop);assert.deepEqual(noop.protectedTransition.nextVerification,record);assert.deepEqual(record,before)});
 const changed={value:'Explicit changed optional mailing address',unknown:false};
 const patch=P.packetInformationPatch({existingItem:item,answers:{mailing_address:changed},protectedVerification:record});
 check(label+' ordinary material correction uses current plan without authority uplift',()=>{assert(patch);const next=patch.protectedTransition.nextVerification,n=next.draftSnapshot;assert.deepEqual(n.packetPlan,authority.evaluation.packetPlan);assert.equal(n.paymentAllowed,false);assert.equal(n.resultCode,s.resultCode);assert.equal(n.pathwayId,s.pathwayId);assert.equal(n.selectedTrackId,s.selectedTrackId);assert.notEqual(next.status,'verified');assert.deepEqual(n.packetAnswers.mailing_address,changed);assert(P.protectedPacketInformationModelFor(next));for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const [id,value]of Object.entries(s[source]))if(id!=='mailing_address')assert.deepEqual(n[source][id],value,source+'.'+id);for(const entry of s.dependencies.semanticAnswerHistory??[])assert(n.dependencies.semanticAnswerHistory.some(value=>hash(value)===hash(entry)));assert.deepEqual(record,before)});
 for(const [key,value]of [['profileVersion','wrong'],['profileSourceFingerprint','wrong'],['profileAuthorityFingerprint','wrong'],['pathwayId','wrong'],['jurisdiction','KS'],['selectedTrackId','wrong'],['resultCode','eligible'],['paymentAllowed',true]])check(label+' refuses '+key+' drift',()=>{const r=structuredClone(record);r.draftSnapshot[key]=value;r.draftHash=P.protectedPacketDraftHash(r.draftSnapshot);assert.equal(P.protectedPacketInformationModelFor(r),null)});
 for(const mutate of [s=>s.requiredInputIds.push('unreviewed'),s=>s.requiredInputIds.reverse(),s=>s.packetPlan.requiredInputIds.push('unreviewed'),s=>s.packetPlan.sourceFormIds.push('unreviewed'),s=>s.packetPlan.mode='wrong'])check(label+' refuses changed old required IDs/plan',()=>{const r=structuredClone(record);mutate(r.draftSnapshot);r.draftHash=P.protectedPacketDraftHash(r.draftSnapshot);assert.equal(P.protectedPacketInformationModelFor(r),null);assert.equal(successor(r.draftSnapshot,authority.evaluation.packetPlan),null)});
 check(label+' refuses invalid original integrity',()=>assert.equal(P.protectedPacketInformationModelFor({...record,draftHash:'wrong'}),null));
 for(const mutate of [p=>p.requiredInputIds.push('unreviewed'),p=>p.requiredInputIds.reverse(),p=>p.sourceFormIds.push('unreviewed'),p=>p.mode='wrong'])check(label+' refuses changed current plan',()=>{const plan=structuredClone(authority.evaluation.packetPlan);mutate(plan);assert.equal(successor(s,plan),null)});
 check(label+' original record still byte-equivalent',()=>assert.deepEqual(record,before));
}
console.log(JSON.stringify({status:'PASS_ND_EXACT_CONTRACT_SUCCESSOR',checks,actualRecords:actualPaths.length,noDatabase:true,noRender:true}));
