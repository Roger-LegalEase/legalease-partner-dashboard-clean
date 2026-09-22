#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { FAMILIES, RECONCILIATION_PATH, APPROVAL_PATH, REGISTRY_PATH, assertProducerReconciliation, reconcileNoncommercialProducer, evidenceProducerBytes, footerOnlyBuilderDelta, digest } from './lib/noncommercial-evidence-producer-reconciliation.mjs';
const read=p=>fs.readFileSync(p), proof=JSON.parse(read(RECONCILIATION_PATH));
const results=[];
function deny(label,run){assert.throws(run,undefined,label);results.push({mutation:label,gate:'RED'});}
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
