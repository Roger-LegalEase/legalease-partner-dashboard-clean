import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {flattenedWidgets,drawnAt} from '../../../../../scripts/rcap-official-forms/pdf-flattened-widgets.mjs';
const require=createRequire(import.meta.url),{PDFDocument}=require('pdf-lib');
const directory='data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const proof=JSON.parse(fs.readFileSync(directory+'/reports/actual-writes.json'));
async function pageDigest(doc,index){
 const one=await PDFDocument.create();
 const [page]=await one.copyPages(doc,[index]);one.addPage(page);
 one.setCreationDate(new Date(0));one.setModificationDate(new Date(0));
 return sha(await one.save({useObjectStreams:false,updateFieldAppearances:false}));
}
const rows=[];let actualWrites=0;
for(const fixture of ['canonical','boundary']){
 const packetFile=directory+'/fixtures/'+fixture+'.pdf',packetBytes=fs.readFileSync(packetFile);
 const packet=await PDFDocument.load(packetBytes,{updateMetadata:false});assert.equal(packet.getPageCount(),11);
 const widgets=await flattenedWidgets(packetFile);let offset=0;
 for(const documentId of ['CR-65','C-10-CRIMINAL']){
  const bytes=fs.readFileSync(directory+'/fixtures/'+fixture+'--'+documentId+'.pdf');
  const component=await PDFDocument.load(bytes,{updateMetadata:false});
  for(let page=0;page<component.getPageCount();page++){
   const componentPageSha256=await pageDigest(component,page),finalPacketPageSha256=await pageDigest(packet,page+offset);
   assert.equal(componentPageSha256,finalPacketPageSha256,fixture+' '+documentId+' page '+(page+1));
   rows.push({fixture,documentId,page:page+1,packetPage:page+offset+1,componentSha256:sha(bytes),packetSha256:sha(packetBytes),componentPageSha256,finalPacketPageSha256});
  }
  for(const write of proof.documents.find(d=>d.fixture===fixture&&d.documentId===documentId).actualWrites){
   const actual=drawnAt(widgets,{page:write.page+offset,rect:write.rect}).map(w=>w.text).join('').trim();
   assert.equal(actual,write.drawnText,fixture+' '+documentId+' '+write.field);actualWrites++;
  }
  offset+=component.getPageCount();
 }
}
console.log(JSON.stringify({result:'PASS',method:'Independently load final assembled packets and components; copy each page with its complete reachable resource graph into deterministic one-page PDFs and require equal SHA-256; read held values again from final flattened packet appearances.',pagesCompared:rows.length,actualWritesReadFromFinalPackets:actualWrites,rows,centralRasterAcceptance:false,independentVerification:false},null,2));
