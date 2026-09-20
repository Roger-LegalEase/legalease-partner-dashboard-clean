#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const flag=process.argv.indexOf('--trace');
if(flag<0||!process.argv[flag+1])throw new Error('--trace requires a retained payment --admission-trace log');
const tracePath=process.argv[flag+1],text=fs.readFileSync(tracePath,'utf8');
const events=text.split('\n').filter(l=>l.startsWith('ADMISSION_TRACE ')).map(l=>JSON.parse(l.slice(16)));
const registryPath='data/rcap-grade-a/fulfillment-authority-registry.json';
const registry=JSON.parse(fs.readFileSync(registryPath));
const route='MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal';
const record=registry.records.find(r=>r.routeId===route&&!r.supersededBy);
const expected={
 P1:{entry:'signed Stripe checkout.session.completed -> durable consumer generation',gate:'provider_dispatch',required:'Current immutable worker publication before enqueue',binding:'provider.imageDigest is empty',defect:'MISSING',consequence:'Payment is recorded, dispatch returns fulfillment_incomplete, webhook returns 500, no job exists.'},
 P4:{entry:'claim/finalize of the P1 job',gate:'worker claim prerequisite; P1 provider_dispatch upstream',required:'The real job created by P1',binding:'P1 produced jobs=[]',defect:'MISSING',consequence:'The claim assertion fails before the intended fulfillment assertions; no claim/finalization acceptance is inferred.'},
 P9:{entry:'authenticated /api/expungement-ai/packet/render',gate:'provider_dispatch',required:'Current immutable worker publication before enqueue',binding:'provider.imageDigest is empty',defect:'MISSING',consequence:'403, no Phase 53-bound consumer job.'},
 P12:{entry:'repeat authenticated render for the same paid item and matter',gate:'provider_dispatch on both attempts, then idempotency assertion',required:'One successfully created baseline job',binding:'Both dispatch attempts refuse; jobs=0',defect:'MISSING',consequence:'Cannot prove one-job idempotency while both requests are refused.'},
 P10:{entry:'USER_B sends USER_A item and browser-supplied user id',gate:'owner-scoped item lookup; baseline P9 provider_dispatch',required:'404 owner isolation plus unchanged one-job baseline',binding:'Owner lookup returns 404; P9 baseline has zero jobs',defect:'MISSING',consequence:'No cross-user admission occurs. The aggregate assertion fails because the required baseline job does not exist.'},
 P13:{entry:'claim/finalize and attempt payment use for another matter',gate:'worker claim prerequisite, then matter/payment binding',required:'Real P9 job to reach the negative matter-binding assertion',binding:'Claim receives no job',defect:'MISSING',consequence:'Wrong-matter payment gate is not reached; no security acceptance is inferred.'}
};
const mappings=Object.entries(expected).map(([test,detail])=>({test,...detail,observedResult:text.match(new RegExp(`FAIL ${test} [^\\n]+\\n\\s+observed: ([^\\n]+)`))?.[1]??null,actualAdmissionEvents:events.filter(e=>e.testGroup?.includes(test)),historicalResolvedGaps:['Exact participant final verification now generated from byte-identical approved artifacts and PostgreSQL round trips','Adopted custom-pleading source authority now bound; no official binary or acquisition invented']}));
const currentVerifierRows=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json')).rows;
const missingArtifactApprovals=[];
for(const [family,state] of [['il-prostitution-j-vacate-set','il'],['ms-misd-addl-set','ms']]){
 const records=registry.records.filter(r=>r.packetFamilyId===family);
 for(const fixture of ['canonical','boundary']){
  const file=`data/rcap-all50/overlays/census-v1/${state}/${family}--custom-pleading/fixtures/${fixture}.pdf`;
  const currentSha256=hash(fs.readFileSync(file));
  const approved=records[0].evidenceBindings.approvedArtifacts[fixture];
  const matches=[];
  function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())scan(f);else if(f.endsWith('.json')&&fs.readFileSync(f,'utf8').includes(currentSha256))matches.push(f);}}
  for(const dir of ['data/rcap-grade-a/legal-decisions','data/record-clearing/legal-decisions'])scan(dir);
  missingArtifactApprovals.push({familyId:family,routeIds:records.map(r=>r.routeId),fixture,path:file,approvedSha256:approved.sha256,currentSha256,currentApprovalMatches:matches,selectedIndependentVerdict:currentVerifierRows.find(r=>r.familyId===family&&r.superseded===false)});
 }
}
const report={schemaVersion:'rcap-ms-admission-diagnostic/v1',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),routeId:route,trackId:'ms-nonconv',packetSetId:'ms-nonconv-set',trace:{path:tracePath,sha256:hash(fs.readFileSync(tracePath))},registry:{path:registryPath,sha256:hash(fs.readFileSync(registryPath)),recordId:record.recordId,recordVersion:record.version},mappings,
 broaderVerifier:[
 {test:'exact productized specification/artifact/receipt binding',classification:'genuine missing authority',status:'BLOCKED',reason:'Current IL shipping PDFs differ from the owner-approved exact hashes. A newer technical pass does not supply the required artifact re-review.'},
 {test:'current independent verification binding',classification:'incorrect route/source binding',status:'BLOCKED_WRONG_SCOPE',reason:'The newer MS additional-misdemeanor verifier row covers changed, not owner-approved, artifacts. Re-pinning it alone would reuse the old approval on new bytes.'},
 {test:'exact codified authority',classification:'stale hash and verifier implementation defect',status:'RESOLVED',reason:'Exact ms-misd-addl track and shared memo content match the pinned ancestor; only ms-nonconv changed. Canonical unchanged-track reconciliation preserves revocation. The exposed WY PDF hashing bug now uses Buffer bytes, not UTF-8-decoded data.'},
 {test:'all exact productized evidence gaps closed',classification:'genuine missing authority',status:'BLOCKED',reason:'The two additional-misdemeanor records correctly remain REVOKED while current artifact re-review is absent.'}],missingArtifactApprovals,
 ownerPaidScopeQuestionClosed:true,publicationReady:false,candidateFrozen:false,productionUntouched:true,
 nextRequiredEvidence:'Exact current-artifact re-review for the IL vacatur and MS additional-misdemeanor pairs under the existing digest-change condition. This is separate from the closed MS nonconv paid-scope decision.'};
if(process.argv.includes('--write'))fs.writeFileSync('data/rcap-grade-a/participant-data-rights/ms-admission-diagnostic-20260914.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({mappings:report.mappings.map(({test,gate,defect})=>({test,gate,defect})),broaderVerifier:report.broaderVerifier,missingArtifactApprovals:missingArtifactApprovals.length},null,2));
