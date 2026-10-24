#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { assertTask53ClassificationSuccession, FAMILIES, HISTORICAL_PRODUCERS, TASK53_MANIFEST_CONTAINER, reconcileTask53ManifestContainer, RECONCILIATION_PATH, APPROVAL_PATH, REGISTRY_PATH, assertProducerReconciliation, reconcileNoncommercialProducer, evidenceProducerBytes, footerOnlyBuilderDelta, digest } from './lib/noncommercial-evidence-producer-reconciliation.mjs';
import { bindCurrentCommercialArtifact, resetCurrentCommercialArtifactApprovalCache } from './lib/current-commercial-artifact.mjs';
const read=p=>fs.readFileSync(p), proof=JSON.parse(read(RECONCILIATION_PATH));
const results=[];
function deny(label,run){assert.throws(run,undefined,label);results.push({mutation:label,gate:'RED'});}
if(process.argv.includes('--manifest-container-controls-only')||process.argv.includes('--task53-source-successor-controls-only')){
 const c=TASK53_MANIFEST_CONTAINER;
 const entry=proof.preservedFiles.find(row=>row.path===c.path);
 const before=execFileSync('git',['show',`${proof.baseCaptain}:${c.path}`],{maxBuffer:16*1024*1024});
 const current=JSON.parse(read(c.path));
 const scopes=[...FAMILIES.map(f=>({familyId:f.familyId,routeIds:f.routeIds})),
   ...HISTORICAL_PRODUCERS.map(f=>({familyId:f.familyId,routeIds:[f.routeId]}))];
 let passed=0;
 const verify=(scope=scopes[0],overrides={})=>reconcileTask53ManifestContainer({entry,
   familyId:scope.familyId,routeId:scope.routeIds[0],readBytes:read,
   readGitBlob:(ref,file)=>{assert.equal(ref,proof.baseCaptain);assert.equal(file,c.path);return before;},...overrides});
 for(const scope of scopes)for(const routeId of scope.routeIds){
  const actual=verify({...scope,routeIds:[routeId]});
  assert.equal(actual.selected.length,4);
  assert.equal(actual.historicalManifest.sha256,entry.sha256);
  assert.equal(actual.currentManifest.sha256,digest(read(c.path)));
  assert.equal(actual.createsApproval,false);assert.equal(actual.revocationCleared,false);
  assert.equal(actual.changesShippingArtifacts,false);assert.equal(actual.unrelatedFamilyContentsConsumed,false);
  passed++;
 }
 const denyManifest=(label,mutate,reason)=>{
  const changed=structuredClone(current);mutate(changed);
  assert.throws(()=>verify(scopes[0],{readBytes:file=>file===c.path?Buffer.from(JSON.stringify(changed)):read(file)}),reason,label);passed++;
 };
 for(const scope of scopes){
  const family=scope.familyId;
  denyManifest(`${family}: complete participant action/destination changes refuse`,doc=>{
   doc.packetSets.find(row=>row.packetSetId===family).participantActionRequired[0].description+=' changed';
  },/relevant manifest family changed/);
  denyManifest(`${family}: actor/destination changes refuse`,doc=>{
   doc.packetSets.find(row=>row.packetSetId===family).participantActionRequired[0].obtainedFrom='synthetic other receiving court';
  },/relevant manifest family changed/);
  denyManifest(`${family}: component meaning changes refuse`,doc=>{
   doc.packetSets.find(row=>row.packetSetId===family).components[0].outputStrategy='synthetic_changed';
  },/relevant manifest family changed/);
  denyManifest(`${family}: track ownership changes refuse`,doc=>{
   doc.packetSets.find(row=>row.packetSetId===family).trackId='synthetic_other_track';
  },/relevant manifest family changed/);
  denyManifest(`${family}: missing family refuses`,doc=>{doc.packetSets=doc.packetSets.filter(row=>row.packetSetId!==family);},/inventory\/order changed/);
  denyManifest(`${family}: duplicate family refuses`,doc=>{doc.packetSets.push(structuredClone(doc.packetSets.find(row=>row.packetSetId===family)));},/packet-set ID duplicate/);
 }
 denyManifest('global schema changed',doc=>{doc.schemaVersion=999;},/global schema\/migrations changed/);
 denyManifest('global migrations changed',doc=>{doc.factoryV2RouteMigrations[0].packetFamilyId='synthetic_other_family';},/global schema\/migrations changed/);
 denyManifest('global property added',doc=>{doc.syntheticGlobal=true;},/global schema\/migrations changed/);
 denyManifest('packet-set order changed',doc=>{[doc.packetSets[0],doc.packetSets[1]]=[doc.packetSets[1],doc.packetSets[0]];},/inventory\/order changed/);
 for(const [label,overrides,reason] of [
  ['wrong historical bytes',{readGitBlob:()=>Buffer.from('{}')},/historical manifest Git bytes changed/],
  ['missing historical bytes',{readGitBlob:()=>null},/historical manifest Git bytes absent/],
  ['missing Git reader',{readGitBlob:null},/historical manifest Git reader required/],
  ['wrong preserved entry',{entry:{...entry,sha256:'0'.repeat(64)}},/wrong preserved manifest entry/],
  ['wrong family',{familyId:'synthetic-other-family'},/family\/route outside bounded reconciliation/],
  ['wrong route',{routeId:'DC:unrelated-route'},/family\/route outside bounded reconciliation/]
 ]){assert.throws(()=>verify(scopes[0],overrides),reason,label);passed++;}
 console.log(`PASS: ${passed} exact task53 manifest-container scope/preservation/refusal controls; unrelated family changes grant no approval.`);
 if(!process.argv.includes('--task53-source-successor-controls-only'))process.exit(0);
}

if(process.argv.includes('--classification-successor-controls-only')||process.argv.includes('--task53-source-successor-controls-only')){
 const route='DC:dc_actual_innocence_expungement_16_803';
 const decisionPath='data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_DC_ACTUAL_INNOCENCE_2026-10-16.json';
 const decisionSha='e37dcb06f202f35837f9df37e89febfbc9b61f0febf8d1c74bbf602009cb2858';
 const records=JSON.parse(read(REGISTRY_PATH)).records;
 const proofBefore=JSON.stringify(proof), recordsBefore=JSON.stringify(records);
 const oldDc=proof.filingFormatBindings.find(row=>row.routeId===route);
 const dc=rows=>rows.find(row=>row.routeId===route).packetCompleteness.filingFormatArtifact;
 const evaluate=(rows=records,readBytes=read,p=proof)=>assertTask53ClassificationSuccession({proof:p,records:rows,readBytes});
 let passed=0;
 const actual=evaluate();
 assert.equal(actual.usedExactDcReviewSuccessor,true);assert.equal(actual.createsApproval,false);
 assert.deepEqual(actual.decision,{path:decisionPath,sha256:decisionSha});passed++;
 const original=proof.filingFormatBindings.map(row=>({routeId:row.routeId,packetFamilyId:row.packetFamilyId,
   packetCompleteness:{filingFormatArtifact:structuredClone(row.artifact)}}));
 const unchanged=evaluate(original,()=>{throw new Error('unchanged historical comparison needs no successor');});
 assert.equal(unchanged.usedExactDcReviewSuccessor,false);assert.equal(unchanged.createsApproval,false);passed++;
 const denyClass=(label,mutate)=>{
  const rows=structuredClone(records);mutate(rows);
  assert.throws(()=>evaluate(rows),/filing-format classification\/binding changed/,label);passed++;
 };
 for(const [label,mutate] of [
  ['old filing artifact digest changed',rows=>{dc(rows).sha256='0'.repeat(64);}],
  ['old artifact classification relabeled current',rows=>{dc(rows).isCurrentCommercialArtifact=true;}],
  ['old producer identity changed',rows=>{dc(rows).producedBy.renderer='synthetic-other-renderer';}],
  ['DC family changed',rows=>{rows.find(r=>r.routeId===route).packetFamilyId='synthetic-other-family';}],
  ['DC route changed',rows=>{rows.find(r=>r.routeId===route).routeId='DC:synthetic-other-route';}],
  ['current review decision changed',rows=>{dc(rows).currentCommercialArtifactReview.approval.sha256='0'.repeat(64);}],
  ['current review artifact digest changed',rows=>{dc(rows).currentCommercialArtifactReview.approval.artifactSha256='0'.repeat(64);}],
  ['current review explanation changed',rows=>{dc(rows).currentCommercialArtifactReview.why+=' changed';}],
  ['current review omitted',rows=>{delete dc(rows).currentCommercialArtifactReview;}],
  ['current review status changed',rows=>{dc(rows).currentCommercialArtifactReview.state='pending_owner_review';}],
  ['extra current artifact',rows=>{dc(rows).currentCommercialArtifactReview.approval.approvedArtifacts.push({artifactId:'synthetic-fourth'});}],
  ['new commercial authority invented',rows=>{dc(rows).currentCommercialArtifactReview.approval.commercialAuthorityGranted=true;}],
  ['unrelated route classification changed',rows=>{
    rows.find(r=>r.routeId!==route&&r.packetCompleteness?.filingFormatArtifact?.currentCommercialArtifactReview)
      .packetCompleteness.filingFormatArtifact.isCurrentCommercialArtifact=true;
  }],
  ['unrelated route review changed',rows=>{
    rows.find(r=>r.routeId!==route&&r.packetCompleteness?.filingFormatArtifact?.currentCommercialArtifactReview)
      .packetCompleteness.filingFormatArtifact.currentCommercialArtifactReview.why+=' changed';
  }],
  ['missing DC classification',rows=>{rows.splice(rows.findIndex(r=>r.routeId===route),1);}],
  ['duplicate DC classification',rows=>{rows.push(structuredClone(rows.find(r=>r.routeId===route)));}]
 ])denyClass(label,mutate);
 const changedOld=structuredClone(proof);changedOld.filingFormatBindings.find(row=>row.routeId===route).artifact.isCurrentCommercialArtifact=true;
 assert.throws(()=>evaluate(records,read,changedOld),/historical DC filing artifact classification changed/);passed++;
 // Warm the default filesystem cache first. Every injected read below must
 // still be reached; a cached approval cannot conceal a mutation/refusal.
 resetCurrentCommercialArtifactApprovalCache();
 const warmed=bindCurrentCommercialArtifact({routeId:oldDc.routeId,packetFamilyId:oldDc.packetFamilyId,
   packetCompleteness:{filingFormatArtifact:structuredClone(oldDc.artifact)}});
 assert.equal(warmed.packetCompleteness.filingFormatArtifact.currentCommercialArtifactReview.approval.sha256,decisionSha);passed++;
 const movePath='data/rcap-grade-a/legal-decisions/DC_ACTUAL_INNOCENCE_ARTIFACT_MOVE_2026-10-16.json';
 const dependencies=[decisionPath,movePath,
   'data/rcap-grade-a/legal-decisions/CURRENT_COMMERCIAL_ARTIFACT_VISUAL_REVIEW_DC_ACTUAL_INNOCENCE_2026-10-16.json',
   ...['full-en','full-es','court-only'].map(id=>`data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-2026-10-16/${id}.pdf`)];
 for(const file of dependencies)for(const mode of ['missing','changed']){
  let observed=false;
  const overridden=path=>{
   if(path===file){observed=true;if(mode==='missing')throw Object.assign(new Error('synthetic absent exact evidence'),{code:'ENOENT'});return Buffer.from('synthetic changed evidence');}
   return read(path);
  };
  const reason=file===movePath&&mode==='missing'?/current DC artifact successor decision path changed/:/current DC artifact successor approval absent/;
  assert.throws(()=>evaluate(records,overridden),reason,`${file}:${mode}`);
  assert.equal(observed,true,'injected reader must be reached after cache warm');passed++;
 }
 assert.equal(JSON.stringify(proof),proofBefore);assert.equal(JSON.stringify(records),recordsBefore);passed++;
 console.log(`PASS: ${passed} exact task53 DC classification-successor/source/cache/refusal controls; historical artifact classification and authority unchanged.`);
 process.exit(0);
}

for(const family of FAMILIES){
 const input={familyId:family.familyId,routeId:family.routeIds[0],builderPath:family.builderPath,preSha256:family.preSha256,readBytes:read};
 const row=proof.families.find(f=>f.identity.familyId===family.familyId);
 const evaluate=(changedProof=proof,overrides={})=>assertProducerReconciliation({...input,proof:changedProof,readBytes:p=>overrides[p]??read(p)});
 for(const routeId of family.routeIds){
  reconcileNoncommercialProducer({...input,routeId});
  assert.equal(digest(evidenceProducerBytes({...input,routeId})),family.preSha256,'historical PDF producer provenance retained');
 }
 const tag=family.familyId, jurisdiction=family.routeIds[0].split(':')[0];
 const extra=Buffer.concat([read(family.builderPath),Buffer.from('\nconst unrelatedLegalChange = true;\n')]);
 deny(`${tag}: arbitrary extra builder edit`,()=>evaluate(proof,{[family.builderPath]:extra}));
 deny(`${tag}: extra builder edit past hash check`,()=>footerOnlyBuilderDelta(read(row.preBuilder.path),extra));
 const spec=proof.preservedFiles.find(f=>f.path.includes('packet-specifications/')&&f.path.includes(`/${jurisdiction}-`));
 deny(`${tag}: legal specification changed`,()=>evaluate(proof,{[spec.path]:Buffer.concat([read(spec.path),Buffer.from(' ')])}));
 const count=structuredClone(proof);count.families.find(f=>f.identity.familyId===tag).renders[0].pageCount++;
 deny(`${tag}: page count changed`,()=>evaluate(count));
 const approvalCreation=structuredClone(proof);approvalCreation.createsApproval=true;
 deny(`${tag}: claims approval creation`,()=>evaluate(approvalCreation));
 const newApproval=structuredClone(proof);newApproval.approvesNewBytes=true;
 deny(`${tag}: claims new-byte approval`,()=>evaluate(newApproval));
 deny(`${tag}: wrong family`,()=>assertProducerReconciliation({...input,proof,familyId:'*'}));
 deny(`${tag}: wrong route`,()=>assertProducerReconciliation({...input,proof,routeId:family.routeIds[0]+':sibling'}));
 deny(`${tag}: wrong pre SHA`,()=>assertProducerReconciliation({...input,proof,preSha256:'0'.repeat(64)}));
 const wrongPost=structuredClone(proof);wrongPost.families.find(f=>f.identity.familyId===tag).postBuilder.sha256='0'.repeat(64);
 deny(`${tag}: wrong post SHA`,()=>evaluate(wrongPost));
 const registry=JSON.parse(read(REGISTRY_PATH));registry.records.find(r=>r.routeId===input.routeId).provider.imageDigest='sha256:'+'0'.repeat(64);
 deny(`${tag}: commercial provider changed`,()=>evaluate(proof,{[REGISTRY_PATH]:Buffer.from(JSON.stringify(registry))}));
 const review=JSON.parse(read(REGISTRY_PATH));review.records.find(r=>r.routeId===input.routeId).packetCompleteness.filingFormatArtifact.currentCommercialArtifactReview.state='pending_owner_review';
 deny(`${tag}: commercial review no longer approved`,()=>evaluate(proof,{[REGISTRY_PATH]:Buffer.from(JSON.stringify(review))}));
 deny(`${tag}: owner approval moved`,()=>evaluate(proof,{[APPROVAL_PATH]:Buffer.concat([read(APPROVAL_PATH),Buffer.from(' ')])}));
 const map=proof.preservedFiles.find(f=>f.path.includes(`/${jurisdiction.toLowerCase()}/`)&&f.path.endsWith('production-field-map.json'));
 deny(`${tag}: field map/execution ownership changed`,()=>evaluate(proof,{[map.path]:Buffer.concat([read(map.path),Buffer.from(' ')])}));
 const classification=JSON.parse(read(REGISTRY_PATH));classification.records.find(r=>r.routeId===input.routeId).packetCompleteness.filingFormatArtifact.isCurrentCommercialArtifact=true;
 deny(`${tag}: noncommercial classification flipped`,()=>evaluate(proof,{[REGISTRY_PATH]:Buffer.from(JSON.stringify(classification))}));
 const extendedApproval=structuredClone(proof);extendedApproval.changesShippingArtifactApproval=true;
 deny(`${tag}: claims approval extension`,()=>evaluate(extendedApproval));
 const render=row.renders[0];
 const box=fs.mkdtempSync(path.join(os.tmpdir(),'task53-negative-pdf-'));
 try{
  // Operability control, BEFORE any refusal is credited below. execFileSync
  // throws just as readily when the comparator cannot start -- a missing
  // pymupdf or numpy -- as when it catches a mutation, and this suite once
  // banked six refusals per family on nothing but an ImportError. So require
  // the comparator to ACCEPT the real unmutated pair first: if it cannot run,
  // this fails loudly instead of reporting a green that asked nothing.
  const proven=JSON.parse(execFileSync('python',['scripts/verify-noncommercial-footer-render.py',render.baseline.path,render.technical.path],{stdio:['ignore','pipe','pipe']}).toString());
  assert.equal(proven.footerAbsent,true,`${tag}: comparator does not accept the real footer-removal pair`);
  assert.ok(proven.pages.some(p=>p.removedWrappedRows>0),`${tag}: comparator proved no footer removal on the real pair`);
  for(const kind of ['non-footer text','signature text','service text','order text','new blank page','footer remains']){
   let bytes;
   if(kind==='footer remains')bytes=read(render.baseline.path);
   else{
    const pdf=await PDFDocument.load(read(render.technical.path));
    if(kind==='new blank page')pdf.addPage([612,792]);
    else{const font=await pdf.embedFont(StandardFonts.Helvetica);pdf.getPage(0).drawText(`ALTERED ${kind}: mutation`,{x:72,y:32,size:10,font});}
    bytes=Buffer.from(await pdf.save({useObjectStreams:false}));
   }
   deny(`${tag}: ${kind}`,()=>evaluate(proof,{[render.technical.path]:bytes}));
   const candidate=path.join(box,'candidate.pdf');fs.writeFileSync(candidate,bytes);
   // Independent byte comparison must also reject: mutation credit is not
   // limited to the immutable technical-artifact digest pin.
   assert.throws(()=>execFileSync('python',['scripts/verify-noncommercial-footer-render.py',render.baseline.path,candidate],{stdio:['ignore','pipe','pipe']}),undefined,`${tag}: independent raster/text checker missed ${kind}`);
   results.at(-1).independentRenderComparator='RED';
  }
 }finally{fs.rmSync(box,{recursive:true,force:true});}
}
// Every owner-named artifact, not only one representative route or locale.
const exact=FAMILIES[0];
for(const artifact of proof.commercialArtifacts){
 deny(`commercial artifact digest: ${artifact.path}`,()=>assertProducerReconciliation({proof,familyId:exact.familyId,routeId:exact.routeIds[0],builderPath:exact.builderPath,preSha256:exact.preSha256,readBytes:p=>p===artifact.path?Buffer.concat([read(p),Buffer.from(' changed')]):read(p)}));
}
for(const binding of proof.filingFormatBindings){
 const registry=JSON.parse(read(REGISTRY_PATH));const artifact=registry.records.find(r=>r.routeId===binding.routeId).packetCompleteness.filingFormatArtifact;
 artifact.isCurrentCommercialArtifact=!artifact.isCurrentCommercialArtifact;
 deny(`classification flipped: ${binding.routeId}`,()=>assertProducerReconciliation({proof,familyId:exact.familyId,routeId:exact.routeIds[0],builderPath:exact.builderPath,preSha256:exact.preSha256,readBytes:p=>p===REGISTRY_PATH?Buffer.from(JSON.stringify(registry)):read(p)}));
}
for(const approvalPath of ['data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json','data/rcap-grade-a/legal-decisions/BATCH_ADOPTION_PACKAGE_2026-09-02.json']){
 deny(`owner approval bytes: ${approvalPath}`,()=>assertProducerReconciliation({proof,familyId:exact.familyId,routeId:exact.routeIds[0],builderPath:exact.builderPath,preSha256:exact.preSha256,readBytes:p=>p===approvalPath?Buffer.concat([read(p),Buffer.from(' ')]):read(p)}));
}
const report={positiveRoutes:FAMILIES.flatMap(f=>f.routeIds),positiveGate:'PASS',mutations:results,allMutationsRed:true,createsApproval:false};
console.log(JSON.stringify(report,null,2));
