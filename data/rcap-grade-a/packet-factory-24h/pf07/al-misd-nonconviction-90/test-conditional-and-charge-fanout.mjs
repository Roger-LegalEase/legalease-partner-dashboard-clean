import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {FIXTURES,resolveSources,censusOf,buildPacketDocuments,savePacket} from '../../../../../scripts/build-census-v1-al-misd-nonconviction-90-set.mjs';
import {flattenedWidgets,drawnAt} from '../../../../../scripts/rcap-official-forms/pdf-flattened-widgets.mjs';
const require=createRequire(import.meta.url),{PDFDocument}=require('pdf-lib');
const sources=resolveSources(),censuses=[];for(const s of sources)censuses.push(await censusOf(s));
const first={...FIXTURES.canonical,'answers.seek_fee_waiver':false,'answers.unable_to_pay_fee':false};
const second={...first,'matter.charge':'Criminal trespass','matter.case_number':'DC-2024-004218','matter.grounds':'The criminal trespass charge was dismissed with prejudice on March 3, 2025. More than 90 days have passed.'};
const docs=await buildPacketDocuments(sources,censuses,[first,second]);
assert.equal(docs.length,2);assert.ok(docs.every(d=>d.documentId==='CR-65'),'Paying the fee must omit conditional C-10.');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pf07-al-fanout-')),proof=[];
for(const [index,doc]of docs.entries()){
 const file=path.join(temp,index+'.pdf');fs.writeFileSync(file,doc.bytes);const widgets=await flattenedWidgets(file),expected=[first,second][index];
 for(const field of ['Only one offense per petition Multicount cases require multiple petitions','Text3']){
  const row=doc.rows.find(r=>r.field===field);assert.equal(row.decision,'write');
  const actual=drawnAt(widgets,row.widgets[0]).map(w=>w.text).join('');assert.equal(actual,expected[row.factId]);proof.push({petition:index+1,field,factId:row.factId,expected:expected[row.factId],actual});
 }
 assert.equal(doc.rows.filter(r=>r.decision==='write'&&r.field.startsWith('Check Box8.')).length,1);
}
const packet=await savePacket(docs,'PF07 synthetic two-offense payer case'),pdf=await PDFDocument.load(packet,{updateMetadata:false});assert.equal(pdf.getPageCount(),16);
const one=await savePacket([docs[0]],'PF07 synthetic one-offense payer case');assert.equal((await PDFDocument.load(one,{updateMetadata:false})).getPageCount(),8);
for(const file of fs.readdirSync(temp))fs.unlinkSync(path.join(temp,file));fs.rmdirSync(temp);
console.log(JSON.stringify({result:'PASS',payerPacketPages:8,twoOffensePayerPacketPages:16,conditionalFeeWaiverForms:0,separatePetitions:2,arrests:1,feeGuidance:'One filing fee for charges from the same arrest, from CR-65 page 4; no payment operation is run.',proof,packetSha256:crypto.createHash('sha256').update(packet).digest('hex'),testDoubles:[],scope:'Actual local official-form generation; not hosted delivery or legal approval.'},null,2));
