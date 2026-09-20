#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {NC_BRANCH_FIXTURES, selectNc146Components,assembleNc146Packet} from './nc-146-indigency.mjs';
const out='data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill';
const results=[];
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const pdftext=f=>execFileSync('pdftotext',['-layout',f,'-'],{encoding:'utf8'});
for (const [name,selection] of Object.entries(NC_BRANCH_FIXTURES)) await test(`strict ${name} branch`,()=>{
 const r=selectNc146Components(selection);assert.equal(r.branch,name);
 assert.equal(r.components.includes('fee_waiver'),selection.requestIndigency);
 assert.equal(r.components.includes('supplemental_financial_affidavit'),selection.supplementalRequested);
 assert.equal(r.grantsDeliveryAuthority,false);assert.equal(r.indigencyEstablished,false);
 assert.equal(r.legalReviewRequired,selection.feeStatus==='fee_due');
});
for(const [name,selection] of [
 ['absent',null],['unknown fee',{...NC_BRANCH_FIXTURES.no_fee,feeStatus:'unknown'}],
 ['missing election',{feeStatus:'fee_due',supplementalRequested:false}],
 ['string election',{...NC_BRANCH_FIXTURES.fee_paid,requestIndigency:'true'}],
 ['number election',{...NC_BRANCH_FIXTURES.fee_paid,requestIndigency:1}],
 ['no-fee waiver',{...NC_BRANCH_FIXTURES.no_fee,requestIndigency:true}],
 ['supplement alone',{...NC_BRANCH_FIXTURES.fee_paid,supplementalRequested:true,supplementalRequestReference:'request'}],
 ['no request record',{...NC_BRANCH_FIXTURES.requested_financial_supplement,supplementalRequestReference:' '}]
])await test(`reject ${name}`,()=>assert.throws(()=>selectNc146Components(selection)));
const report=json(`${out}/reports/rendered-artifacts.json`),writes=json(`${out}/reports/actual-writes.json`);
await test('four-source receipt uses true retained hashes, not invented corpus membership',()=>{
 const receipt=json(`${out}/source-receipt.json`);assert.equal(receipt.documents.length,4);
 for(const source of receipt.documents){const bytes=fs.readFileSync(source.pathInRepository);assert.equal(hash(bytes),source.sha256);assert.equal(bytes.length,source.byteLength);assert.equal(source.retainedReceiptAgrees,true);}
 assert.equal(receipt.documents.find(x=>x.formNumber==='AOC-G-106').corpusIndexAgrees,null);
});
await test('all eight branch outputs are declared and their current bytes hash correctly',async()=>{
 assert.equal(report.conditionalBranches.length,8);
 for(const row of report.conditionalBranches){
  const bytes=fs.readFileSync(row.file),pdf=await PDFDocument.load(bytes,{updateMetadata:false});
  assert.equal(hash(bytes),row.sha256);assert.equal(pdf.getPageCount(),row.pageCount);
  assert.equal(pdf.getForm().getFields().length,0);
  assert.ok(report.pdfs.some(x=>x.file===row.file && x.sha256===row.sha256));
  assert.deepEqual(row.components,selectNc146Components(row.selection).components);
  const g106Pages=row.pageManifest.filter(x=>x.component==='fee_waiver');
  const cvPages=row.pageManifest.filter(x=>x.component==='supplemental_financial_affidavit');
  assert.equal(g106Pages.length,row.selection.requestIndigency?2:0);
  assert.equal(cvPages.length,row.selection.supplementalRequested?2:0);
  // Read the output, not just its manifest. Form identifier distinguishes the
  // real official form pages from mentions in the completion guidance.
  const text=pdftext(row.file);
  assert.equal(/AOC-G-106, Rev\. 11\/24/.test(text),row.selection.requestIndigency);
  assert.equal(/AOC-CV-226, Rev\. 4\/23/.test(text),row.selection.supplementalRequested);
 }
});
for(const fixture of ['canonical','boundary'])await test(`${fixture} G106 writes known facts only and preserves all protected roles`,()=>{
 const r=writes.overlayReports.find(x=>x.fixture===fixture && x.component==='fee_waiver');assert.equal(r.written.length,8);assert.equal(r.unfittable.length,0);
 assert.ok(r.written.every(x=>['FileNumber','CountyName','DefendantName','PetitionerName','PetitionerAddressStreet1','PetitionerAddressCity','PetitionerAddressState','PetitionerAddressZip'].includes(x.field)));
 assert.ok(r.refused.some(x=>x.field==='SNAPCbx'));assert.ok(r.refused.some(x=>x.field==='SignatureDate'));
 assert.ok(r.refused.some(x=>x.field==='OrderAuthorizedCbx'));
 const proof=writes.documents.find(x=>x.fixture===fixture).actualWrites.find(x=>x.kind==='materialized_route_selection');
 assert.equal(proof.sourceField,'ExpunctionPetitionCbx');assert.equal(proof.addedPaintedPaths.length,2);assert.equal(proof.foundInOutputBytes,true);
});
await test('actual participant guidance and old steps consistently name G106, not a CV226 waiver',()=>{
 const text=fs.readFileSync(`${out}/participant-instructions.md`,'utf8');
 assert.match(text,/AOC-G-106/);assert.match(text,/do not sign an inapplicable oath/i);
 assert.doesNotMatch(text,/complete AOC-CV-226 in full|waiver[^\n]*on AOC-CV-226/i);
 assert.match(text,/deferred.*review stop remains/i);
});
await test('conditional output assembly refuses missing selected components',async()=>{
 await assert.rejects(()=>assembleNc146Packet(new Map(),NC_BRANCH_FIXTURES.indigency_requested),/component is missing/);
});
await test('canonical input file and all generated outputs repeat byte-for-byte',()=>{
 const hashes=report.pdfs.map(row=>[row.file,hash(fs.readFileSync(row.file))]);
 execFileSync(process.execPath,['scripts/build-census-v1-nc_146_dismissal_petition-set.mjs','--no-raster'],{stdio:'pipe',timeout:120000});
 for(const [file,sha] of hashes)assert.equal(hash(fs.readFileSync(file)),sha,file);
});
for(const r of results)console.log(`${r.status} ${r.name}${r.error?': '+r.error:''}`);
const failed=results.filter(x=>x.status==='FAIL').length;
console.log(JSON.stringify({schemaVersion:'rcap-nc-indigency-regressions/v1',passed:results.length-failed,failed,tests:results,grantsApproval:false,productionTouched:false},null,2));
if(failed)process.exitCode=1;
