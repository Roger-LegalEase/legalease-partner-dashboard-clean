// GA-20/O17 Q-73bd8ae566887c633a11: keep exact pre-containment drafts readable, never payable.
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';
const root=fileURLToPath(new URL('..',import.meta.url));
register('./lib/ts-esm-loader.mjs',import.meta.url);
if(process.argv.includes('--mutation=successor')) {
  const file='src/lib/expungement-ai/packet-information.ts';
  const original=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const start=original.indexOf('const LEGAL_AUTHORITY_METADATA_SUCCESSORS = [');
  const before=original.slice(0,start), after=original.slice(start);
  const pattern=/  \{\n    "jurisdiction": "CA",\n    "pathwayId": "tool-3-petition-based-felony-sealing",[\s\S]*?\n  \},\n/;
  assert(pattern.test(after));
  const source=ts.transpileModule(before+after.replace(pattern,''),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){if(u.endsWith("/src/lib/expungement-ai/packet-information.ts"))return{format:"module",source:d.source,shortCircuit:true};return n(u,c)}'),{data:{source}});
}
const P=await import(pathToFileURL(root+'/src/lib/expungement-ai/packet-information.ts'));
const {evaluateAuthoritativeScreeningResult:evaluate}=await import(pathToFileURL(root+'/src/lib/expungement-ai/authoritative-screening-result.ts'));
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await import(pathToFileURL(root+'/src/lib/expungement-ai/briefcase-presentation-authority.ts'));
const rows=JSON.parse(fs.readFileSync(new URL('./fixtures/ca-tool3-saved-predecessors.json', import.meta.url),'utf8')).rows;
for(const {kind,record} of rows){
 const prior=structuredClone(record),auth=P.evaluateProtectedPacketFacts(record.draftSnapshot),model=P.protectedPacketInformationModelFor(record);
 console.log(kind,'current evaluation',auth.evaluation.resultCode,auth.evaluation.paymentAllowed,'model',!!model);
 assert(model,kind+': original saved draft remains readable');
 const presented=await decorate({consumerAuthUserId:'synthetic-ca-owner',item:{id:'synthetic-ca-tool3',jurisdiction:'CA',artifactRefs:{}}},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:record}),readTrustedPendingSource:async()=>({ok:false,reason:'no_source'}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
 assert.notEqual(presented.authorityStatus,'unavailable',kind+': Briefcase presentation remains readable');
 assert.equal(presented.resultCode,auth.evaluation.resultCode,'Briefcase shows the current held result');
 const patch=P.packetInformationPatch({protectedVerification:record,answers:{}});
 console.log(kind,'presentation',presented.resultCode,'patch',!!patch);
 assert(patch,kind+': save/resume no-op returns');
 assert.deepEqual(record,prior,'reads/no-ops never alter original record');
 for(const key of ['screeningAnswers','prefilledAnswers','packetAnswers','dependencies'])assert.deepEqual(patch.protectedTransition.nextVerification.draftSnapshot[key],record.draftSnapshot[key],kind+': preserve '+key);
 assert.deepEqual(patch.protectedTransition.nextVerification,record,'Semantic no-op preserves the exact original record');
 assert.equal(patch.readyToGenerate,false);
 assert.equal(auth.evaluation.paymentAllowed,false);
 const editId='participant_full_legal_name',editValue='Synthetic Corrected Name';
 const editable=P.editablePacketInputIds(model,true);
 const edited=P.packetInformationPatch({protectedVerification:record,answers:{[editId]:editValue}});
 assert(edited);
 if(kind==='unknown') {
   assert.equal(editable.size,0,'Uncertain predecessor remains read-only');
   assert.deepEqual(edited.protectedTransition.answerDelta,{});
   assert.deepEqual(edited.protectedTransition.nextVerification,record,'Unsupported edit cannot invent an owner fact');
 } else {
   assert(editable.has(editId),'Exercise an actually editable owner fact');
   const next=edited.protectedTransition.nextVerification.draftSnapshot;
   assert.equal(next.paymentAllowed,false);
   assert.equal({...next.screeningAnswers,...next.prefilledAnswers,...next.packetAnswers}[editId],editValue);
   assert.deepEqual(edited.protectedTransition.answerDelta,{[editId]:editValue});
 }
 assert.equal(edited.readyToGenerate,false);
 assert.deepEqual(record,prior,'Editing never mutates the saved predecessor');
 assert.equal(model.reviewSafety.safe,false);
 assert.notEqual(edited.protectedTransition.nextVerification.status,'verified');
 assert.notEqual(patch.protectedTransition.nextVerification.status,'verified');
}
const paid=rows.find(r=>r.kind==='payable').record;
const auth=P.evaluateProtectedPacketFacts(paid.draftSnapshot);
let boundaries=0;
for(const mutate of [
 (s,a)=>{s.profileAuthorityFingerprint='unapproved';},
 (s,a)=>{s.profileVersion='future';},
 (s,a)=>{s.profileSourceFingerprint='unapproved';},
 (s,a)=>{s.schemaVersion='expungement-ai/final-verification/v1';},
 (s,a)=>{s.pathwayId='tool-4-arrest-record-sealing';},
 (s,a)=>{s.serverFacts.jurisdiction='NY';},
 (s,a)=>{s.packetFamilyIdentifiers.mode='unapproved';},
 (s,a)=>{s.packetPlan.requiredInputIds=[];},
 (s,a)=>{a.evaluation.paymentAllowed=true;},
 (s,a)=>{a.evaluation.resultCode='packet_ready';},
 (s,a)=>{a.evaluation.reasons=[{code:'ca.unapproved'}];},
 (s,a)=>{a.profile.pathways.find(p=>p.id===s.pathwayId).summary+=' unapproved change';}
]) {
 const snapshot=structuredClone(paid.draftSnapshot), authority=structuredClone(auth);mutate(snapshot,authority);
 assert.equal(P.legalAuthorityMetadataDraftSuccessor(snapshot,authority,'unverified'),null,'Refuse altered predecessor/current authority');boundaries++;
}
assert.equal(P.legalAuthorityMetadataDraftSuccessor(paid.draftSnapshot,auth,'verified'),null);boundaries++;
console.log('PASS saved draft model, presentation, no-op, maps/history and payment closure; '+boundaries+' refusal boundaries');
