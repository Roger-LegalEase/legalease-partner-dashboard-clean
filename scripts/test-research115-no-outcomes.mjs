import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {RESEARCH115_NO_ROUTES,research115NoRoute}=await import('../src/lib/rcap-engine/research115-no-ordinary-packet.ts');
const {evaluateScreening}=await import('../src/lib/rcap-engine/evaluator.ts');
const {legalRouteContract,routePaymentAuthority}=await import('../src/lib/legal-authority/index.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {renderPreflight}=await import('../src/lib/expungement-ai/render-preflight.ts');
const {buildRenderJobSpec}=await import('../src/lib/rcap/render/job-contract.ts');
const {admitCommercialAction,COMMERCIAL_ADMISSION_POINTS}=await import('../src/lib/rcap/fulfillment/grade-a-authority.ts');
const {reviewedResultText}=await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
// Independent exact identities from the user's prohibitions, without widening to a parent/jurisdiction.
const identities=[['R059','NV:deferred-judgment-dismissal-and-sealing-under-nrs-176-211'],['R082','RI:path-e-filed-complaint-relief-under-12-10-12'],['R088','SD:controlled-substance-deferred-disposition-route'],['R089','SD:diversion-expungement'],['R110','WV:juvenile-record-relief']];
const witnesses=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json','utf8')).fixtures;
const rows=[],checks=[];
function check(id,fn){try{fn();checks.push({id,status:'PASS'})}catch(e){checks.push({id,status:'FAIL',message:e.message})}}
check('exact five identities only',()=>assert.deepEqual(RESEARCH115_NO_ROUTES.map(x=>[x.reviewId,x.routeId]),identities));
for(const[reviewId,key]of identities){const w=witnesses.find(x=>x.pathwayKey===key);assert(w,key);const copy=research115NoRoute(key);const request=answers=>({jurisdiction:w.jurisdiction,profileVersion:w.profileVersion,matterId:'synthetic-no-outcome-check',answers});const evaluation=evaluateScreening(request(w.answers));
 const row={reviewId,routeId:key,evidenceLevel:'UNIT/INTEGRATION TESTED; pure application boundaries only, no hosted/browser/transaction proof',witnessPurpose:'Existing route-reachability fixture; not proof that an individual qualifies for automatic relief',evaluation:{resultCode:evaluation.resultCode,pathwayId:evaluation.pathwayId,paymentAllowed:evaluation.paymentAllowed,reasons:evaluation.reasons,nextSteps:evaluation.nextSteps},guidanceTranslation:reviewedResultText(copy.guidance.en),admissions:[]};rows.push(row);
 check(reviewId+' exact selected route and ordinary payment off',()=>{assert.equal(evaluation.pathwayId,w.pathwayId);assert.equal(evaluation.paymentAllowed,false);assert(!['packet_ready','packet_ready_with_caution'].includes(evaluation.resultCode))});
 check(reviewId+' actual public result includes conditional procedure guidance',()=>{assert([...evaluation.reasons.map(r=>r.text),...evaluation.nextSteps].includes(copy.guidance.en),'Public route currently supplies generic packet/readiness copy instead of this exact procedure guidance')});
 check(reviewId+' actual bilingual result-copy lookup',()=>assert.deepEqual(reviewedResultText(copy.guidance.en),copy.guidance));
 check(reviewId+' suffix cannot borrow exact restriction',()=>assert.equal(research115NoRoute(key+'-different'),null));
 const [state,pathway]=key.split(':');const contract=legalRouteContract(state,pathway);row.legalContract=contract?{decisionId:contract.decisionId,outcomeMode:contract.outcomeMode,paymentAuthority:routePaymentAuthority(contract)}:null;
 if(contract){
  check(reviewId+' actual contract closes ordinary packet checkout',()=>assert.equal(routePaymentAuthority(contract),'closed'));
  const profile=getProfileByJurisdiction(state);
  check(reviewId+' compiled authority agrees with closed runtime contract',()=>{const route=profile.pathways.find(p=>p.id===pathway);assert.equal(route.legalAuthority.paymentAuthority,'closed');assert.equal(route.filingRequired,false)});
  check(reviewId+' compiled plan cannot advertise an ordinary paid packet',()=>assert.equal(profile.packetGenerator.pathways.find(p=>p.pathwayId===pathway).mode,'automatic_relief_verification_and_guidance'));
 }
 const preflight=renderPreflight({snapshot:{jurisdiction:state,pathwayId:pathway},verificationHash:'synthetic-cannot-authorize',facts:{}});row.preflight=preflight;check(reviewId+' actual preflight denies generation',()=>assert.equal(preflight.ready,false));
 try{const built=buildRenderJobSpec({packetId:'synthetic-no-job',state,pathway,packetFields:{}});row.jobSpec={hasSpec:!!built.spec,routeKind:built.route.routeKind};check(reviewId+' actual job construction supplies no ordinary packet',()=>assert.equal(built.spec,null))}catch(e){row.jobSpec={refused:true,error:e.message};check(reviewId+' actual job construction supplies no ordinary packet',()=>assert(e.message))}
 for(const admissionPoint of COMMERCIAL_ADMISSION_POINTS){const d=admitCommercialAction({admissionPoint,request:{routeId:key,jurisdiction:state,packetFamilyId:'synthetic-cannot-authorize'},record:null,observation:null,context:null});row.admissions.push({admissionPoint,admitted:d.admitted,denialCode:d.denialCode});check(reviewId+' canonical denial '+admissionPoint,()=>assert.equal(d.admitted,false))}
 const ownerNo=evaluateScreening(request({...w.answers,ownership_scope:'No'}));row.ownerNo={resultCode:ownerNo.resultCode,reasons:ownerNo.reasons.map(r=>r.code)};check(reviewId+' ownership hard stop remains primary',()=>{assert.equal(ownerNo.resultCode,'hard_stop');assert.equal(ownerNo.paymentAllowed,false);assert(ownerNo.reasons.some(r=>r.code.endsWith('ownership_scope_hard_stop')))});
 const ownerUnknown=evaluateScreening(request({...w.answers,ownership_scope:'I am not sure'}));row.ownerUnknown={resultCode:ownerUnknown.resultCode,reasons:ownerUnknown.reasons.map(r=>r.code)};check(reviewId+' unknown owner is not an eligible automatic case',()=>{assert.equal(ownerUnknown.resultCode,'needs_review');assert(ownerUnknown.reasons.some(r=>r.code.endsWith('source_fact_unknown')));assert.equal(ownerUnknown.paymentAllowed,false)});
 const incomplete=evaluateScreening(request({...w.answers,court_requirements_completed:'no'}));const missing={...w.answers};delete missing.court_requirements_completed;const unknown=evaluateScreening(request(missing));row.incomplete={resultCode:incomplete.resultCode,reasons:incomplete.reasons.map(r=>r.code)};row.unknownCompletion={resultCode:unknown.resultCode,reasons:unknown.reasons.map(r=>r.code)};
 const expectedIncomplete=['R059','R082','R089'].includes(reviewId)?'not_yet':reviewId==='R088'?'guidance_only':'needs_review';check(reviewId+' existing incomplete status is preserved',()=>{assert.equal(incomplete.resultCode,expectedIncomplete);assert.equal(incomplete.paymentAllowed,false)});check(reviewId+' missing completion is not declared satisfied',()=>{assert.equal(unknown.resultCode,reviewId==='R088'?'guidance_only':'needs_review');assert.equal(unknown.paymentAllowed,false)});
}
check('NO leaf has no rule renderer or external dependency imports',()=>assert(!/^import\s|node:|pdf-lib|process\.|Buffer\./m.test(fs.readFileSync('src/lib/rcap-engine/research115-no-ordinary-packet.ts','utf8'))));
const result={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(['src/lib/rcap-engine/evaluator.ts','src/lib/legal-authority/index.ts','src/lib/rcap/fulfillment/grade-a-authority.ts','src/lib/expungement-ai/render-preflight.ts','src/lib/expungement-ai/reviewed-result-copy.ts','src/lib/rcap-engine/research115-no-ordinary-packet.ts'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),routeCount:5,checks,pass:checks.filter(c=>c.status==='PASS').length,fail:checks.filter(c=>c.status==='FAIL').length,rows,limits:['No artifact, court filing, account session, sponsor entitlement, payment, row-level-security, hosted or production execution.','Commercial denial observed here is the actual no-record refusal; it does not establish a research-NO guard where none is integrated.','NO copy is conditional guidance and a product restriction, not a new attorney rejection or eligibility finding.']};
if(process.env.LE115_NO_EVIDENCE_PATH)fs.writeFileSync(process.env.LE115_NO_EVIDENCE_PATH,JSON.stringify(result,null,2)+'\n');for(const c of checks.filter(c=>c.status==='FAIL'))console.log('FAIL '+c.id+': '+c.message);console.log(`${result.pass}/${checks.length} exact NO-outcome controls passed; ${result.fail} failed.`);if(result.fail)process.exitCode=1;
