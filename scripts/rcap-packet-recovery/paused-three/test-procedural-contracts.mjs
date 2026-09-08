import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TRACKS,FILES,LA_TEXT,LA_SHA256,FALSE_KY_STOP,NH_FEES,NH_RELIEF,repairDocument,run,hash} from './repair-procedural-contracts.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const load=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const registry=load(FILES[0]);const out=repairDocument(registry,FILES[0]);
const track=(d,id)=>d.tracks.find(x=>x.trackId===id);
const la=track(out,TRACKS[0]),ky=track(out,TRACKS[1]),nh=track(out,TRACKS[2]);
const clone=x=>structuredClone(x);

test('exact retained statutory transcription is the supplied 5286-byte input',()=>{const b=fs.readFileSync(path.join(ROOT,LA_TEXT));assert.equal(b.length,5286);assert.equal(hash(b),LA_SHA256);});
test('503 track identities and all 500 unrelated track objects are unchanged',()=>{
 assert.equal(out.tracks.length,503);assert.deepEqual(out.tracks.map(x=>x.trackId),registry.tracks.map(x=>x.trackId));
 for(const t of registry.tracks)if(!TRACKS.includes(t.trackId))assert.deepEqual(track(out,t.trackId),t);
 for(const k of Object.keys(registry))if(k!=='tracks')assert.deepEqual(out[k],registry[k]);
});
test('all four documents are idempotent and retain every neighboring memo track',()=>{
 for(const p of FILES){const before=load(p),after=repairDocument(before,p);assert.deepEqual(repairDocument(after,p),after);
  for(const t of before.tracks)if(!TRACKS.includes(t.trackId))assert.deepEqual(track(after,t.trackId),t);}
});
test('KY removes only the false additional ordinary offense-ground stop',()=>{
 const old=clone(track(registry,TRACKS[1]));old.selfHelpStopConditions=old.selfHelpStopConditions.filter(x=>x!==FALSE_KY_STOP);old.selfHelpBoundaries=old.selfHelpBoundaries.filter(x=>x!==FALSE_KY_STOP);assert.deepEqual(ky,old);
 assert.ok(!ky.selfHelpStopConditions.includes(FALSE_KY_STOP));
});
test('KY actual full-pardon, common timing, IFP, verification and document rules are preserved',()=>{
 const old=track(registry,TRACKS[1]);for(const k of ['rules','packetSet','waitingPeriods','manualCompletionItems','exclusions','requiredDocuments'])assert.deepEqual(ky[k],old[k]);
 assert.ok(ky.selfHelpStopConditions.some(x=>x.includes('not plainly full')));assert.ok(ky.selfHelpStopConditions.some(x=>x.includes('objection')));
});
test('LA binds supplied statutory text without creating an approval or original-PDF claim',()=>{
 assert.ok(la.rules.researchTwoFieldResolution.sourceRequirement.includes(LA_SHA256));
 assert.ok(la.rules.researchTwoFieldResolution.sourceRequirement.includes('not original HTML or an official PDF'));
 assert.equal(la.rules.researchTwoFieldResolution.largerDefect,track(registry,TRACKS[0]).rules.researchTwoFieldResolution.largerDefect);
});
test('LA all four former court/DA prerequisites remain unperformed and not required before filing',()=>{
 const rows=la.packetSet.participantActionRequired.filter(x=>x.completionActor);assert.equal(rows.length,4);
 for(const row of rows){assert.equal(row.requiredBeforeFiling,false);assert.ok(!la.packetSet.requiredBeforeFiling.includes(row.description));}
});
test('LA actual mover execution and supporting fact duties remain',()=>{
 const a=la.packetSet.participantActionRequired;assert.ok(a.some(x=>x.kind==='sign'&&x.requiredBeforeFiling));
 assert.ok(a.some(x=>x.kind==='obtain_document'&&x.requiredBeforeFiling));
 assert.deepEqual(la.selfHelpStopConditions,track(registry,TRACKS[0]).selfHelpStopConditions);
});
test('LA unknown costs become inquiries, not fabricated fees or waiver procedures',()=>{
 assert.ok(!la.packetSet.participantActionRequired.some(x=>x.kind==='pay_fee'||x.kind==='apply_fee_waiver'));
 const a=la.packetSet.participantActionRequired.find(x=>x.actionId==='la987-local-relief-inquiry');
 assert.equal(a.requirement,'conditional');assert.match(a.description,/ask the clerk/);assert.match(a.description,/No amount, form, exemption or judicial grant is assumed/);
});
test('LA and NH before-filing lists derive from actual action flags rather than stale copies',()=>{
 for(const t of [la,nh])assert.deepEqual(t.packetSet.requiredBeforeFiling,t.packetSet.participantActionRequired.filter(x=>x.requiredBeforeFiling===true).map(x=>x.description));
});
test('NH judicial fields and invented notarize:none task are not participant prerequisites',()=>{
 const a=nh.packetSet.participantActionRequired;const c=a.find(x=>x.description.startsWith('Everything in the FOR COURT'));assert.equal(c.requiredBeforeFiling,false);assert.equal(c.completionActor,'court');
 assert.ok(!a.some(x=>x.kind==='notarize'));assert.ok(!nh.packetSet.requiredBeforeFiling.includes('None identified.'));
 assert.ok(a.some(x=>x.kind==='sign'&&x.requiredBeforeFiling));
});
test('NH court cost and later DOC/DOS costs have distinct actual completion flags',()=>{
 const a=nh.packetSet.participantActionRequired;assert.equal(a.find(x=>x.actionId==='nh-vacated-court-cost').requiredBeforeFiling,true);
 assert.equal(a.find(x=>x.actionId==='nh-vacated-agency-cost-stages').requiredBeforeFiling,false);
 assert.equal(nh.rules.fees,NH_FEES);assert.equal(nh.rules.feeWaiver,NH_RELIEF);
 assert.ok(!nh.rules.fees.includes('should assume they are payable'));
});
test('NH separate financial-statement service caveat and every preexisting stop are byte-equivalent',()=>{
 const old=track(registry,TRACKS[2]);assert.equal(nh.rules.serviceCertificateOnNhjb2328,old.rules.serviceCertificateOnNhjb2328);
 assert.deepEqual(nh.selfHelpStopConditions,old.selfHelpStopConditions);assert.deepEqual(nh.waitingPeriods,old.waitingPeriods);
});
test('paired memo and registry rule corrections agree without modifying adjacent routes',()=>{
 for(const s of ['LA','KY','NH']){const p=`data/record-clearing/legal-design-intake/${s}.memo.json`,d=repairDocument(load(p),p),id=TRACKS[{LA:0,KY:1,NH:2}[s]];
 if(s==='KY')assert.deepEqual(track(d,id).selfHelpStopConditions,track(out,id).selfHelpStopConditions);
 else for(const k of ['fees','feeWaiver'])assert.equal(track(d,id).rules[k],track(out,id).rules[k]);}
});
test('refuse duplicate or missing target track and out-of-scope documents',()=>{
 const d=clone(registry);d.tracks.push(clone(d.tracks.find(x=>x.trackId===TRACKS[0])));assert.throws(()=>repairDocument(d,FILES[0]),/exactly one/);
 const e=clone(registry);e.tracks=e.tracks.filter(x=>x.trackId!==TRACKS[1]);assert.throws(()=>repairDocument(e,FILES[0]),/exactly one/);
 assert.throws(()=>repairDocument(registry,'data/something-else.json'),/Out-of-scope/);
});
test('refuse unexpected NH notarization or fee preimages instead of weakening them',()=>{
 const d=clone(registry);track(d,TRACKS[2]).packetSet.participantActionRequired.push({kind:'notarize',description:'A newly supported jurat is required.'});assert.throws(()=>repairDocument(d,FILES[0]),/source-supported notarization/);
 const e=clone(registry);track(e,TRACKS[2]).rules.fees='New independently adopted fee rule';assert.throws(()=>repairDocument(e,FILES[0]),/Unexpected NH fee/);
});
function withFixture(fn){const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-paused-three-'));try{
 for(const p of [...FILES,LA_TEXT]){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.copyFileSync(path.join(ROOT,p),path.join(root,p));}return fn(root);
}finally{fs.rmSync(root,{recursive:true,force:true});}}
test('dry-run writes nothing; real application and repeat are identical',()=>withFixture(root=>{
 const before=FILES.map(p=>hash(fs.readFileSync(path.join(root,p))));run(root);assert.deepEqual(FILES.map(p=>hash(fs.readFileSync(path.join(root,p)))),before);
 const first=run(root,{apply:true});assert.equal(first.createsApproval,false);const after=FILES.map(p=>hash(fs.readFileSync(path.join(root,p))));
 const second=run(root,{apply:true});assert.ok(second.files.every(x=>!x.changed));assert.deepEqual(FILES.map(p=>hash(fs.readFileSync(path.join(root,p)))),after);
}));
test('bad source or later preflight failure cannot partially update earlier files',()=>withFixture(root=>{
 const before=FILES.map(p=>hash(fs.readFileSync(path.join(root,p))));fs.appendFileSync(path.join(root,LA_TEXT),'corruption');assert.throws(()=>run(root,{apply:true}),/transcription bytes differ/);assert.deepEqual(FILES.map(p=>hash(fs.readFileSync(path.join(root,p)))),before);
 fs.copyFileSync(path.join(ROOT,LA_TEXT),path.join(root,LA_TEXT));const p=FILES[3],d=load(p);d.tracks=d.tracks.filter(x=>x.trackId!==TRACKS[2]);fs.writeFileSync(path.join(root,p),JSON.stringify(d));
 assert.throws(()=>run(root,{apply:true}),/exactly one/);assert.deepEqual(FILES.slice(0,3).map(p=>hash(fs.readFileSync(path.join(root,p)))),before.slice(0,3));
}));
test('refuse an existing document symlink',()=>withFixture(root=>{
 const abs=path.join(root,FILES[1]);fs.unlinkSync(abs);fs.symlinkSync(path.join(ROOT,FILES[1]),abs);assert.throws(()=>run(root,{apply:true}),/symlink/);
}));
