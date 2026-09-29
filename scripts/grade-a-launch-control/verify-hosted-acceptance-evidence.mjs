import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

// These are the reviewed native receipts, not a selectable run or a success flag.
export const HOSTED_BASE='c79e7a8b051bc2aa9561553f3996e5a956fa292d';
export const HOSTED_STATUS='HOSTED_ACCEPTED_PRODUCTION_HELD';
export const TUPLE={applicationSha:'e312a5efa7b4882e0fbf61a5ff0ae7891ac23226',workerSourceSha:'5e04eafd7eaed7e71722862e651fb787ebbd296d',workerDigest:'sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1',workerInputFingerprint:'sha256:90a1e89e306cb5fc23631c63c15c12a44d955d745bbe04aada0716af2805daab',acceptanceProjectRef:'hyflxnlhpmiqxvvcoiia'};
export const PREVIEW={deploymentId:'dpl_7heA1zUcZ7zs7CciZg8LLdwGiKwT',hostname:'legalease-rcap-e312a5efa7b4-roger947s-projects.vercel.app',readyState:'READY',reused:true};
export const RECEIPTS=[
 {phase:'hosted_full',runId:36571290588,toolsSha:'879463ec2ef60696da39a0367b4758d26074207b',artifactId:11036080387,artifactName:'rcap-hosted-full-36571290588',artifactSha256:'sha256:6e487e5d410445534a6ada792c46ecc65339538ec5de35267f1e73f7628734e3',nativeHashes:['ec3dc0dd0cfc9b82c9bca1a98d05647ca1dcb69b64925443f57b8a0f35a9a608','ac6f93a1901b31049222c48380a59661e7cf56c7219427dd791fe62a03f94fe0','3127b083c1a3c36614728df2e41bf580d3bbe3e5a104f21faed73958a971c0d2']},
 {phase:'hosted_payment',runId:36577574787,toolsSha:HOSTED_BASE,artifactId:11037334612,artifactName:'rcap-hosted-payment-36577574787',artifactSha256:'sha256:4ca17bc0516b0151ad495e7e5a2778383a7a10ed6aa892064964df029583263a',nativeHashes:['5f478a3c894f53d35fe0ede074fa4a7191d13b621efb08b1cec70ba163960add','7db4018c2c050ce38446423aaca1ecdb8c92da97c43954fb71ed9a48021a7c55','b6489ef5e50252796b4d834009916f8e9498a46c62ba8322add0a0382bc2c888']}
];
const members=['preview-resolution.json','payment.json','worker-diagnostics.json','matrix.json','packet-database-readback.json','post-payment-copy.json'];
export const receiptPaths=r=>['run.json','jobs.json','artifact.json',`${r.artifactId}.zip`].map(f=>`hosted-acceptance-evidence/${r.phase}-${r.runId}/${f}`);
export const HOSTED_EVIDENCE_FILES=RECEIPTS.flatMap(receiptPaths);
const equal=(a,b,label)=>assert.ok(isDeepStrictEqual(a,b),label);
const yes=(v,label)=>equal(v,true,label);
const hash=b=>createHash('sha256').update(b).digest('hex');
export function loadHostedDocuments(root,r){
 const files=receiptPaths(r),bytes=files.map(f=>fs.readFileSync(path.join(root,f)));
 bytes.forEach((b,i)=>equal(hash(b),i===3?r.artifactSha256.slice(7):r.nativeHashes[i],`native receipt bytes ${files[i]}`));
 // Standard-library ZIP reader; no shell, extraction, dependencies or network.
 const body=JSON.parse(execFileSync('python3',['-c',"import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); names=json.loads(sys.argv[2]); assert len(z.namelist())==len(set(z.namelist())); assert all(z.getinfo(n).file_size<8000000 for n in names); print(json.dumps({n:json.loads(z.read(n)) for n in names}))",path.join(root,files[3]),JSON.stringify(members)],{encoding:'utf8',maxBuffer:16*1024*1024}));
 return {run:JSON.parse(bytes[0]),jobs:JSON.parse(bytes[1]),artifact:JSON.parse(bytes[2]),body};
}

// Separately exported so semantic refusal tests operate past immutable-byte checks.
// Error labels never include observed values (which could contain customer data).
export function validateHostedDocuments(r,{run,jobs,artifact,body}){
 equal(run.id,r.runId,'run identity');equal(run.head_sha,r.toolsSha,'run tools');equal(run.status,'completed','run complete');equal(run.conclusion,'success','run success');equal(run.run_attempt,1,'run attempt');equal(run.event,'workflow_dispatch','run event');equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml','workflow');
 equal(run.display_title,`RCAP F1 | ${r.phase} | tools ${r.toolsSha} | app ${TUPLE.applicationSha} | cents 5000`,'phase and application inputs');
 equal(artifact.id,r.artifactId,'artifact identity');equal(artifact.name,r.artifactName,'artifact name');equal(artifact.digest,r.artifactSha256,'artifact digest');equal(artifact.workflow_run.id,r.runId,'artifact run');equal(artifact.workflow_run.head_sha,r.toolsSha,'artifact tools');
 const hosted=jobs.jobs.filter(j=>j.name.startsWith('Persistent hosted acceptance staging /'));
 equal(hosted.length,1,'one hosted job');const job=hosted[0];equal(job.run_id,r.runId,'job run');equal(job.head_sha,r.toolsSha,'job tools');equal(job.status,'completed','job complete');equal(job.conclusion,'success','job success');
 for(const number of [6,7,8,29,55,56,57,63,66,67,69])equal(job.steps.find(s=>s.number===number)?.conclusion,'success',`required hosted step ${number}`);
 const preview=body['preview-resolution.json'];for(const [k,v]of Object.entries(PREVIEW))equal(preview[k],v,`preview ${k}`);
 equal(preview.applicationSha,TUPLE.applicationSha,'preview application');equal(preview.acceptanceProjectRef,TUPLE.acceptanceProjectRef,'preview project');equal(preview.target,null,'nonproduction Preview');equal(preview.newPreviewCreated,false,'reuse only');equal(preview.vercelDeployCommandsExecuted,0,'no deploy');equal(preview.outcome,'reused_exact_ready_preview','Preview reuse');
 equal(preview.workerBinding,{rcapWorkerSourceSha:TUPLE.workerSourceSha,rcapWorkerDigest:TUPLE.workerDigest,rcapWorkerInputFingerprint:TUPLE.workerInputFingerprint},'preview worker');
 equal(preview.checks.length,16,'Preview checks');for(const check of preview.checks)yes(check.ok,'Preview check');
 const p=body['payment.json'],w=p.worker,d=body['worker-diagnostics.json'];
 equal(p.applicationSha,TUPLE.applicationSha,'payment app');equal(p.acceptanceProjectRef,TUPLE.acceptanceProjectRef,'payment project');equal(p.previewDeploymentId,PREVIEW.deploymentId,'payment deployment');equal(new URL(p.previewUrl).origin,`https://${PREVIEW.hostname}`,'payment origin');equal(p.stripeMode,'sandbox (sk_test_)','sandbox');
 yes(p.passed,'payment verdict');equal(p.requiredCases.length,28,'28 payment cases');equal(new Set(p.requiredCases).size,28,'distinct payment cases');equal(p.missingCases,[],'no missing cases');equal(p.failedCases,[],'no failed cases');for(const name of p.requiredCases)yes(p.cases[name]?.passed,'required payment case');
 equal(p.settledOrder,{amountCents:5000,currency:'usd',paymentStatus:'paid',regularPriceCents:5000,discountCents:0,stripeTotal:5000,stripeCurrency:'usd'},'ordinary settled order');
 equal(p.hostedCheckoutCompletion.paymentStatusAfter,'paid','Stripe paid');yes(p.hostedCheckoutCompletion.paymentIntentPresent,'PaymentIntent');equal(p.webhook.forged,400,'forged webhook refused');equal(p.webhook.genuine,200,'real webhook');equal(p.webhook.outcome,'processed','webhook processed');
 equal(p.stripeOwnDelivery.eventId,p.stripeOwnDelivery.recordedEventId,'provider event');equal(p.stripeOwnDelivery.sessionId,p.checkout.sessionId,'provider session');
 equal(p.paymentRow.payment_status,'paid','paid row');equal(p.paymentRow.payment_provider,'stripe','provider row');equal(p.render.status,202,'enqueue');const id=p.render.jobId;yes(typeof id==='string'&&id.length===36,'target identity');
 equal(p.targetJourney.targetJobId,id,'target journey');equal(p.targetJourney.failure,null,'target success');equal(p.packetBinding.expectedPacketId,p.packetBinding.jobPacketId,'persisted packet');for(const k of ['packetExists','idsMatch','boundToThisRun','inputsPersisted','stateMatches'])yes(p.packetBinding[k],`packet ${k}`);
 equal(w.immutableDigest,TUPLE.workerDigest,'worker digest');equal(d.immutableDigest,TUPLE.workerDigest,'diagnostic digest');equal(w.exitCodes,[0],'worker exit');equal(w.exitSignals,[null],'worker signal');equal(w.jobStatus,'artifact_validated','validated job');equal(w.unmetConditions,[],'worker conditions');equal(w.journeyFailure,null,'worker journey');yes(w.validation.ok,'PDF validation');yes(w.validation.pageCount>0,'PDF pages');yes(w.validation.byteCount>0,'PDF bytes');
 const result={outcome:'finalized',jobId:id,accountingResult:'zero_charge',deliveryEligibility:'eligible'};
 equal(w.cycleResult,result,'worker finalization');equal(d.cycles.length,1,'one target cycle');const cycle=d.cycles[0];equal(JSON.parse(cycle.stdout.trim()),result,'native worker stdout');equal(cycle.cycleResult,result,'diagnostic finalization');equal(cycle.claimedJobId,id,'claimed target');equal(cycle.exitCode,0,'native exit');
 const row=cycle.targetStateAfter;equal(row.id,id,'readback target');equal(row.status,'artifact_validated','readback validation');equal(row.container_digest,TUPLE.workerDigest,'readback image');equal(row.delivery_eligibility,'eligible','readback eligibility');equal(row.page_count,w.validation.pageCount,'readback pages');equal(row.output_byte_count,w.validation.byteCount,'readback bytes');
 equal(p.artifactPath,row.output_storage_path,'artifact path');yes(row.output_storage_path.startsWith('packet-artifacts/consumer/'),'private artifact');yes(/^[a-f0-9]{64}$/.test(row.output_sha256),'PDF hash');equal(p.storage.anonymous,400,'private storage refusal');equal(p.storage.authorized.status,200,'authorized storage');equal(p.storage.authorized.bytes,row.output_byte_count,'stored bytes');
 equal(p.delivery.route,`/api/rcap/packets/${id}/download`,'target delivery');equal(p.delivery.owner,200,'owner delivery');equal(p.delivery.ownerByteCount,row.output_byte_count,'delivery bytes');equal(p.delivery.ownerSha256,row.output_sha256,'delivered PDF hash');equal(p.delivery.stranger,404,'stranger refusal');equal(p.delivery.anonymous,401,'anonymous refusal');equal(p.delivery.legacyRouteForStranger,404,'legacy refusal');
 equal(p.identityBinding.job.job_id,id,'identity target');equal(p.identityBinding.authority,{exact_valid:true,exact_reason:'authorized',other_person_valid:false,other_matter_valid:false,other_user_valid:false},'owner authority');
 equal(p.replay.status,200,'replay response');equal(p.replay.outcome,'duplicate','replay idempotency');equal(p.replay.scopedTo.targetJobId,id,'replay target');equal(p.replay.before,p.replay.after,'no duplicate entitlement or render');equal(p.replay.moved,[],'no replay movement');equal(p.replay.after.target_status,'delivered','natural delivered readback');equal(p.replay.after.target_output_sha256,row.output_sha256,'delivered readback hash');
 equal(p.resumedCompletedOrder.settledSessionId,p.resumedCompletedOrder.returnedSessionId,'completed-order reuse');equal(p.resumedCompletedOrder.stripeStatus,'complete','completed session');equal(p.resumedCompletedOrder.sessionsBefore,p.resumedCompletedOrder.sessionsAfter,'no extra Checkout');
 const matrix=body['matrix.json'];yes(matrix.passed,'golden matrix');equal(matrix.applicationSha,TUPLE.applicationSha,'matrix app');equal(matrix.acceptanceProjectRef,TUPLE.acceptanceProjectRef,'matrix project');equal(matrix.requiredCases.length,14,'14 golden cases');for(const name of matrix.requiredCases)yes(matrix.cases[name]?.passed,'golden case');equal(matrix.failedCases,[],'golden failures');equal(matrix.missingCases,[],'golden missing');
 const db=body['packet-database-readback.json'];equal(db.project,TUPLE.acceptanceProjectRef,'catalog project');yes(db.readOnly,'read-only catalog proof');yes(db.passed,'catalog readback');equal(db.postconditionCount,400,'400 postconditions');equal(db.failures,[],'catalog failures');
 let exactBrowserReturn=false;
 if(r.phase==='hosted_payment'){
  yes(p.hostedCheckoutCompletion.completed,'exact browser completion');equal(p.hostedCheckoutCompletion.humanInteractionRequired,false,'no provider challenge');
  const capture=body['post-payment-copy.json'].captures.find(c=>c.surface==='payment_return');yes(Boolean(capture),'post-return capture');const url=new URL(capture.url);
  equal(url.origin,`https://${PREVIEW.hostname}`,'exact return origin');equal(url.pathname,`/briefcase/${p.replay.scopedTo.briefcaseItemId}`,'exact return path');equal([...url.searchParams.entries()].sort(),[['payment','return'],['session_id',p.checkout.sessionId]].sort(),'exact return query');equal(url.hash,'','no return fragment');
  yes(p.hostedCheckoutCompletion.notes.some(n=>n.includes('_vercel_jwt')&&n.includes(PREVIEW.hostname)),'bypass continuity evidence');exactBrowserReturn=true;
 }
 return {phase:r.phase,runId:r.runId,toolsSha:r.toolsSha,artifactId:r.artifactId,artifactName:r.artifactName,artifactSha256:r.artifactSha256,nativeEvidence:receiptPaths(r),conclusion:'success',exactBrowserReturn,naturalDelivery:{targetJobId:id,packetId:p.packetBinding.jobPacketId,artifactSha256:`sha256:${row.output_sha256}`,byteCount:row.output_byte_count,pageCount:row.page_count,ownerStatus:200,strangerStatus:404,anonymousStatus:401,replayOutcome:'duplicate',completedOrderDeduplicated:true}};
}
export function verifyHostedAcceptanceEvidence(root){
 const journeys=RECEIPTS.map(r=>validateHostedDocuments(r,loadHostedDocuments(root,r)));
 return {...TUPLE,preview:{...PREVIEW,...TUPLE,target:null},journeys,naturalDelivery:journeys[1].naturalDelivery,manualHostedFullReady:false,note:'Hosted acceptance established. Full-path evidence is supplemented by exact browser return in hosted_payment. Evidence is not execution authority; all dispatch and Production holds remain.'};
}
