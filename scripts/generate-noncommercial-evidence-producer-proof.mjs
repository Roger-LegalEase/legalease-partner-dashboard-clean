#!/usr/bin/env node
// Writes technical task evidence only. Never writes an approved artifact or decision.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { CAPTAIN, FOOTER_COMMIT, PROOF_ROOT, RECONCILIATION_PATH, APPROVAL_PATH, REGISTRY_PATH, FAMILIES, HELPER, digest, footerOnlyBuilderDelta, pageCount, commercialInvariant, classificationInvariant } from './lib/noncommercial-evidence-producer-reconciliation.mjs';
const root=process.cwd(), read=p=>fs.readFileSync(path.join(root,p));
const git=(sha,p)=>execFileSync('git',['show',`${sha}:${p}`],{cwd:root,maxBuffer:64*1024*1024});
const entry=p=>({path:p,sha256:digest(read(p))});
const write=(p,value)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n');};
assert.equal(digest(read(REGISTRY_PATH)),digest(git(CAPTAIN,REGISTRY_PATH)),'produce from exact Captain registry');
assert.equal(digest(read(HELPER.path)),HELPER.sha256);
const registry=JSON.parse(read(REGISTRY_PATH)), approval=JSON.parse(read(APPROVAL_PATH));
const preserved=new Set([APPROVAL_PATH,approval.boundTo.batch.path,approval.boundTo.visualReview.path,
 'data/record-clearing/legal-design-packet-set-manifests.json',
 'data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json',
 'data/rcap-grade-a/legal-decisions/BATCH_ADOPTION_PACKAGE_2026-09-02.json',
 'data/rcap-grade-a/legal-decisions/SPECIFICATION_DERIVATION_RECONCILIATION_2026-09-20.json']);
const proof={schemaVersion:'rcap-noncommercial-evidence-producer-reconciliation/v1',baseCaptain:CAPTAIN,footerCommit:FOOTER_COMMIT,
 changesLegalContent:false,changesCurrentCommercialArtifacts:false,changesShippingArtifactApproval:false,createsApproval:false,approvesNewBytes:false,nonCommercialEvidenceProducerSupersession:true,
 meaning:'Only a noncommercial supporting evidence producer is reconciled. Old approvals and approved evidence artifacts remain immutable. Technical renders have no shipping approval.',
 measuredTask53Scope:{canonicalAffected:89,canonicalPopulation:280,affectedPdfs:182},
 commercialArtifacts:approval.artifacts ?? approval.approvedArtifacts,commercialBindings:[],filingFormatBindings:classificationInvariant(registry.records),preservedFiles:[],families:[]};
for(const exact of FAMILIES){
 const dir=`${PROOF_ROOT}/${exact.familyId}`;fs.mkdirSync(dir,{recursive:true});
 const before=git(`${FOOTER_COMMIT}^`,exact.builderPath),after=read(exact.builderPath);
 assert.equal(digest(before),exact.preSha256);assert.equal(digest(after),exact.postSha256);
 assert.equal(digest(git(FOOTER_COMMIT,exact.builderPath)),exact.postSha256);footerOnlyBuilderDelta(before,after);
 fs.writeFileSync(`${dir}/pre-builder.mjs`,before);
 const records=exact.routeIds.map(route=>registry.records.find(r=>r.routeId===route));
 for(const record of records){
  assert.ok(record);const b=record.evidenceBindings;
  proof.commercialBindings.push(commercialInvariant(record));
  assert.equal(record.packetCompleteness.filingFormatArtifact.isCurrentCommercialArtifact,false);
  assert.equal(record.packetCompleteness.filingFormatArtifact.currentCommercialArtifactReview.state,'approved');
  for(const p of [b.packetSpecification.path,b.sourceReceipt.path,b.productionFieldMap.path,b.provider.deliveryProviderEvidencePath,b.provider.artifactProducer.renderedArtifactsPath,b.ownerApproval?.path,b.postApprovalAudit?.path,b.currentIndependentReviewReceipt?.path,b.artifactApprovalSuccessor?.approval?.path]) if(p)preserved.add(p);
  preserved.add(`data/record-clearing/legal-design-intake/${record.jurisdiction}.memo.json`);
 }
 const b=records[0].evidenceBindings,folder=path.dirname(path.dirname(b.approvedArtifacts.canonical.path));
 for(const [label,bytes] of [['before',before],['after',after]]){
  const box=fs.mkdtempSync(path.join(os.tmpdir(),'task53-noncommercial-render-'));
  try{
   fs.cpSync(path.join(root,'scripts'),path.join(box,'scripts'),{recursive:true});
   fs.symlinkSync(path.join(root,'node_modules'),path.join(box,'node_modules'),'dir');
   fs.writeFileSync(path.join(box,exact.builderPath),bytes);
   const output=execFileSync(process.execPath,[exact.builderPath,'--no-raster'],{cwd:box,encoding:'utf8',maxBuffer:8*1024*1024});
   fs.mkdirSync(`${dir}/${label}`,{recursive:true});fs.writeFileSync(`${dir}/${label}/build.log`,output);
   for(const p of ['fixtures/canonical.pdf','fixtures/boundary.pdf','reports/rendered-artifacts.json','production-field-map.json','reports/blanks-left-for-the-participant.json','reports/actual-writes.json']){
    const target=`${dir}/${label}/${p}`;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(box,folder,p),target);
   }
  }finally{fs.rmSync(box,{recursive:true,force:true});}
 }
 const oldReport=JSON.parse(read(`${dir}/before/reports/rendered-artifacts.json`)),newReport=JSON.parse(read(`${dir}/after/reports/rendered-artifacts.json`));
 assert.deepEqual(oldReport.componentSet,newReport.componentSet);
 for(const p of ['production-field-map.json','reports/blanks-left-for-the-participant.json','reports/actual-writes.json']) assert.equal(digest(read(`${dir}/before/${p}`)),digest(read(`${dir}/after/${p}`)),`${p}: protected facts changed`);
 const family={identity:exact,preBuilder:entry(`${dir}/pre-builder.mjs`),postBuilder:entry(exact.builderPath),auxiliaryEvidence:[],renders:[]};
 for(const variant of ['before','after']) for(const p of ['reports/rendered-artifacts.json','production-field-map.json','reports/blanks-left-for-the-participant.json','reports/actual-writes.json']) family.auxiliaryEvidence.push(entry(`${dir}/${variant}/${p}`));
 for(const fixture of ['canonical','boundary']){
  const baseline=b.approvedArtifacts[fixture],technical=entry(`${dir}/after/fixtures/${fixture}.pdf`);
  assert.equal(digest(read(`${dir}/before/fixtures/${fixture}.pdf`)),baseline.sha256,'old producer must reproduce approved evidence exactly');
  const oldArtifact=oldReport.artifacts.find(a=>a.fixture===fixture),newArtifact=newReport.artifacts.find(a=>a.fixture===fixture);
  assert.deepEqual(oldArtifact.pageManifest,newArtifact.pageManifest,'component/page ordering changed');
  const measured=JSON.parse(execFileSync('python',['scripts/verify-noncommercial-footer-render.py',baseline.path,technical.path,`${dir}/rasters/${fixture}`],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}));
  measured.sameComponentPageOrder=true;measured.componentPageOrder=newArtifact.pageManifest;
  measured.sameProtectedBlanksAndPrefills=true;
  measured.independentRasterizer='PyMuPDF 1.28.2, 144 DPI grayscale; exact retained span comparison and pixel subtraction';
  const comparison=`${dir}/${fixture}-comparison.json`;write(comparison,measured);
  family.renders.push({fixture,baseline,technical,comparison:entry(comparison),pageCount:baseline.pageCount});
 }
 proof.families.push(family);
}
for(const p of [...preserved].sort()){
 assert.equal(digest(read(p)),digest(git(CAPTAIN,p)),`preserved input differs from Captain: ${p}`);
 proof.preservedFiles.push(entry(p));
}
for(const artifact of proof.commercialArtifacts){assert.equal(digest(read(artifact.path)),artifact.sha256);assert.equal(pageCount(read(artifact.path)),artifact.pageCount);}
proof.proofTools=[entry('scripts/verify-noncommercial-footer-render.py'),entry('scripts/generate-noncommercial-evidence-producer-proof.mjs')];
write(RECONCILIATION_PATH,proof);
console.log(JSON.stringify({path:RECONCILIATION_PATH,sha256:digest(read(RECONCILIATION_PATH)),families:proof.families.length,commercialArtifacts:proof.commercialArtifacts.length,createsApproval:false},null,2));
