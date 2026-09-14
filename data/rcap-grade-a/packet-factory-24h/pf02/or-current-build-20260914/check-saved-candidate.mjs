import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {fixtures,validateInput,FAMILY,DIRECTORY} from '../../../../../scripts/build-census-v1-or_contempt_setaside-set.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const normalize=s=>s.replace(/\s+/g,' ').trim();
const report=read(`${DIRECTORY}/reports/rendered-artifacts.json`),expected=fixtures(),packets=[];
for(const p of report.packets){
 const file=`${DIRECTORY}/${p.file}`,bytes=fs.readFileSync(file),pdf=await PDFDocument.load(bytes);assert.equal(hash(bytes),p.sha256);assert.equal(bytes.length,p.byteLength);assert.equal(pdf.getPageCount(),p.pageCount);assert.equal(pdf.getForm().getFields().length,0);
 const raw=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}),pages=raw.split('\f');
 let next=1;for(const component of p.documents){const b=fs.readFileSync(component.file);assert.equal(hash(b),component.sha256);const d=await PDFDocument.load(b);assert.equal(d.getPageCount(),component.pageCount);assert.equal(component.firstPage,next);const t=execFileSync('pdftotext',['-layout',component.file,'-'],{encoding:'utf8'});assert.equal(normalize(pages.slice(next-1,next-1+component.pageCount).join(' ')),normalize(t));next+=component.pageCount;}
 assert.equal(next,p.pageCount+1);const f=expected[p.fixture],text=normalize(raw);
 for(const value of [f.name,f.dob,f.street,f.city,f.phone,f.email,f.caseNumber,f.arrestAgency,...f.aliases,...f.charges.filter(c=>c.selected).map(c=>`Count ${c.count}: ${c.name}`)])assert(text.includes(normalize(value)),`Known value absent: ${value}`);
 assert(text.includes('current OSP amount'));assert(text.includes('fingerprint'));assert(text.includes('No Filing Fee'));assert(text.includes('Proposed Order'));
 packets.push({fixture:p.fixture,path:file,sha256:p.sha256,byteLength:p.byteLength,pageCount:p.pageCount,componentCount:p.documents.length,allComponentTextMatchesAssembly:true,knownFactsReadBack:true,remainingAcroFields:0});
}
let negativeCases=0;for(const mutate of [f=>f.jurisdiction='WA',f=>f.courtKind='municipal',f=>f.route='other',f=>f.adult=false,f=>f.recordsVerified=false,f=>f.sentenceCompleted=false,f=>f.probationRevoked=true,f=>delete f.probationRevoked,f=>f.otherConvictions=true,f=>f.sameEpisodeOtherConviction=true,f=>f.pendingCharges=true,f=>f.gei=true,f=>f.excludedOffense=true,f=>f.immigrationConcern=true,f=>f.oppositionKnown=true,f=>f.charges[0].class='Class A felony',f=>f.charges[0].eligibleOn='12/31/2027',f=>f.charges.push({...f.charges[0]}),f=>f.selection='partial',f=>f.charges[0].disposition='diversion_dismissed']){const f=structuredClone(expected.canonical);mutate(f);assert.throws(()=>validateInput(f));negativeCases++;}
for(const f of Object.values(expected)){validateInput(f);assert.throws(()=>validateInput(f,{filing:true}));negativeCases++;}
const result={familyId:FAMILY,result:'PASS_SAVED_IDENTITIES_TEXT_AND_GUARDS',packets,negativeCases,sourceHashes:read(`${DIRECTORY}/source-receipt.json`).documents.map(s=>{assert.equal(hash(fs.readFileSync(s.path)),s.sha256);return{sourceId:s.sourceId,sha256:s.sha256};}),visualReviewPerformed:false,protectedInkMeasured:false,completeIndependentReview:false};
fs.writeFileSync(new URL('./saved-byte-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:result.result,packets:packets.length,pages:packets.reduce((a,p)=>a+p.pageCount,0),negativeCases}));
