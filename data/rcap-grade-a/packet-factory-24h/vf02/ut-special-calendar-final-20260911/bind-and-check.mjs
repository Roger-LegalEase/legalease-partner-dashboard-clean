import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';

const OUT='data/rcap-grade-a/packet-factory-24h/vf02/ut-special-calendar-final-20260911';
const PRIOR='data/rcap-grade-a/packet-factory-24h/vf02/ut-special-final-20260911';
const PRIOR_COMMIT='1cdeabcd99d6de8165ad6e9b352b51efd5b0d1bd';
const BASE='5c52ec5a7931e45d58fb0b259c5657a8f7c77923';
const FAMILY='data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill';
const WRAPPER='scripts/build-census-v1-ut_pet_special_certificate-set.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const file=p=>{const bytes=fs.readFileSync(p);return{path:p,sha256:hash(bytes),bytes:bytes.length};};
const save=(name,value)=>fs.writeFileSync(`${OUT}/${name}`,JSON.stringify(value,null,2)+'\n');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const snapshot=()=>Object.fromEntries(fs.readdirSync(FAMILY,{recursive:true}).filter(p=>fs.statSync(`${FAMILY}/${p}`).isFile()).sort().map(p=>{
 const absolute=`${FAMILY}/${p}`,s=fs.statSync(absolute);return[p,{...file(absolute),mtimeMs:s.mtimeMs,ctimeMs:s.ctimeMs}];
}));
assert.equal(git('rev-parse','HEAD'),BASE);
const before=snapshot(),old=read(`${PRIOR}/current-measurements.json`);
const immutable=[];
for(const prior of [...old.sources,...read(`${PRIOR}/authority-bindings.json`),...old.boundFiles]) {
 const current=file(prior.path),previousSha256=prior.currentSha256??prior.sha256;
 const changed=current.sha256!==previousSha256;
 assert.equal(changed,current.path===WRAPPER,`unexpected acceptance-input identity change: ${current.path}`);
 immutable.push({...current,previousSha256,unchanged:!changed,exception:changed?'Only named calendar gate code changed; entire narrow diff independently reviewed.':null});
}
for(const current of Object.values(before)) {
 const pinned=execFileSync('git',['show',`${PRIOR_COMMIT}:${current.path}`],{maxBuffer:32*1024*1024});
 assert.equal(hash(pinned),current.sha256,`family artifact changed: ${current.path}`);
 immutable.push({...current,previousSha256:hash(pinned),unchanged:true});
}
const dependencies=['AGENTS.md','docs/PRODUCT_CONTRACT.md','package.json','package-lock.json',
 'scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs','scripts/rcap-official-forms/rcap-active-content.mjs',
 'data/rcap-grade-a/packet-factory-24h/checkpoint-232-to-250/ut-special-certificate-build-readiness.json',
 'data/rcap-grade-a/packet-factory-24h/vf02/rows-vf02-20260911-ut-special-final.json',
 ...fs.readdirSync(PRIOR).map(p=>`${PRIOR}/${p}`)];
for(const dependency of dependencies) {
 const current=file(dependency),pinned=execFileSync('git',['show',`${PRIOR_COMMIT}:${dependency}`],{maxBuffer:32*1024*1024});
 assert.equal(hash(pinned),current.sha256,`prior proof dependency changed: ${dependency}`);
 immutable.push({...current,previousSha256:hash(pinned),unchanged:true});
}
const narrowDiff=execFileSync('git',['diff',PRIOR_COMMIT,BASE,'--',WRAPPER,'scripts/rcap-packet-recovery/ut-special-certificate-calendar.test.mjs'],{encoding:'utf8'});
fs.writeFileSync(`${OUT}/reviewed-correction.diff`,narrowDiff.split('\n').map(s=>s.trimEnd()).join('\n'));
const rasterQueue=read('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json');
const currentQueueRow=rasterQueue.rows.find(r=>r.familyId==='ut_pet_special_certificate-set');
const queue=currentQueueRow??rasterQueue.historicalRasterRows.find(r=>r.familyId==='ut_pet_special_certificate-set');
assert.equal(queue.currentRasterState,'RASTER_PASS');
assert.equal(queue.rasterReceipt.packetCommitSha,'4abaf4f7dc9e7c9be6d9b0e1c053da401942cf15');
for(const artifact of old.pdfs){const queued=queue.documents.find(d=>d.role===artifact.fixture);assert.equal(file(artifact.path).sha256,artifact.sha256);assert.equal(queued.sha256,artifact.sha256);assert.equal(queued.pageCount,artifact.pageCount);}
const commands=[
 ['claim-can-assert',['scripts/grade-a-packet-factory-24h/claim.mjs','--can-assert','VF02','ut_pet_special_certificate-set']],
 ['claim-assert',['scripts/grade-a-packet-factory-24h/claim.mjs','--assert','VF02','ut_pet_special_certificate-set']],
 ['builder-check',[WRAPPER,'--check']],
 ['author-calendar-test',['scripts/rcap-packet-recovery/ut-special-certificate-calendar.test.mjs']],
 ['existing-stage-test',['scripts/lib/ut-special-certificate-stage-gate.test.mjs']]
];
const results=[];
for(const [name,args] of commands) {
 const initial=snapshot(),run=spawnSync(process.execPath,args,{encoding:'utf8'}),after=snapshot();
 const log=(run.stdout+run.stderr).split('\n').map(s=>s.trimEnd()).join('\n').trimEnd()+'\n';
 fs.writeFileSync(`${OUT}/${name}.log`,log);
 results.push({name,command:['node',...args],exitCode:run.status,unchangedFamilyBytesAndMetadata:JSON.stringify(initial)===JSON.stringify(after),log:`${OUT}/${name}.log`});
 assert.equal(run.status,0,log);assert.deepEqual(after,initial,`${name} changed family files`);
}
assert.deepEqual(snapshot(),before);
save('preflight.json',{familyId:'ut_pet_special_certificate-set',lane:'VF02',actualHead:BASE,branch:git('branch','--show-current'),worktree:process.cwd(),privateLink:fs.readlinkSync('private'),grantSet:'39739455e6a744ea',grantEvidence:[`${OUT}/claim-can-assert.log`,`${OUT}/claim-assert.log`],previousReviewCommit:PRIOR_COMMIT,oldBranchPreserved:true,instructions:'Exact family calendar closure only. No build, PDF render, raster, repeated visual/legal/source review, adjacent-family change or central admission.'});
save('acceptance-input-identity.json',{familyId:'ut_pet_special_certificate-set',base:BASE,priorIndependentReviewCommit:PRIOR_COMMIT,method:'Fresh content hashes only; prior source/legal/visual meanings were not reviewed again. All prior acceptance inputs and evidence compared against their recorded hashes or original independent commit. The sole expected changed acceptance input is the named wrapper.',inputs:immutable,changedAcceptanceInputs:immutable.filter(x=>!x.unchanged),newCalendarTest:file('scripts/rcap-packet-recovery/ut-special-certificate-calendar.test.mjs'),priorVisualReuse:{runId:'34629454670',pinnedPacketCommitSha:'4abaf4f7dc9e7c9be6d9b0e1c053da401942cf15',originalPagesPreviouslyViewed:33,pagesViewedAgain:0,sourcePdfsPreviouslyReviewed:9,sourceInterpretationsReviewedAgain:0,pdfBindings:old.pdfs.map(x=>({fixture:x.fixture,path:x.path,sha256:x.sha256,pages:x.pageCount})),priorPageReview:`${PRIOR}/original-page-review.json`,priorOriginalBindings:`${PRIOR}/original-bindings.json`,receipt:queue.rasterReceipt,receiptCurrentlyHistorical:!currentQueueRow,currentGateAuthority:queue.currentGateAuthority??false,centralStateNote:'Prior independent calendar failure remains selected pending this closure. The historical receipt binds the unchanged exact PDFs; this review does not change central state or restore gate authority.'},noUnexpectedChanges:true});
save('commands.json',{results,familyFilesMeasured:Object.keys(before).length,unchangedAfterAll:true,familyBefore:before,independentProbeCommand:['node',`${OUT}/verify-calendar-closure.mjs`],independentProbeEvidence:`${OUT}/calendar-closure-results.json`});
console.log(JSON.stringify({acceptanceInputs:immutable.length,onlyExpectedWrapperChanged:true,allFamilyFilesUnchanged:Object.keys(before).length,commands:results.map(r=>({name:r.name,exitCode:r.exitCode,unchanged:r.unchangedFamilyBytesAndMetadata})),originalPagesReused:33,pagesViewedAgain:0}));
