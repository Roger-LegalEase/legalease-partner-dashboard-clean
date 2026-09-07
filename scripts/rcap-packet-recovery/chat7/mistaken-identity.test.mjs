import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {FAMILY,ROOT,OUTPUT_DIR,SOURCE_DIR,SOURCES,hash,importFacts,loadSource,buildPacket,buildFamily} from './mistaken-identity.mjs';
const canonical=JSON.parse(await fs.readFile(new URL('./canonical.json',import.meta.url),'utf8'));
const boundary=JSON.parse(await fs.readFile(new URL('./boundary.json',import.meta.url),'utf8'));
const change=fn=>{const f=structuredClone(canonical);fn(f);return f;};
const mapped=c=>c.audit.mapped??c.audit.fills.flatMap(x=>x.mapped);

test('held CR301, CR311 and all four FI-05 pages match exact custody hashes',async()=>{
 for(const [name,pin]of Object.entries(SOURCES)){
  const bytes=await fs.readFile(path.join(ROOT,SOURCE_DIR,name));assert.equal(hash(bytes),pin.sha256);
  const d=await loadSource(name);assert.equal(d.getPageCount(),pin.pages);
  for(const f of d.getForm().getFields())for(const w of f.acroField.getWidgets()){assert.ok(w.getRectangle().width>0);assert.ok(w.getRectangle().height>0);}
 }
});
test('current family importer keeps both coherent synthetic fixtures unchanged',()=>{
 assert.deepEqual(importFacts(canonical),canonical);assert.deepEqual(importFacts(boundary),boundary);
});
for(const [name,mutate,error]of [
 ['distinct identity-theft family',f=>f.familyId='mo-575-120-identity-theft-correction-set',/WRONG_FAMILY/],
 ['ordinary arrest family',f=>f.familyId='mo-610-122-arrest-expungement-set',/WRONG_FAMILY/],
 ['conviction is not a dismissed/acquitted charge',f=>f.disposition='convicted',/DISPOSITION_CONFIRMATION/],
 ['some charges still pending',f=>f.allChargesDisposed=false,/DISPOSITION_CONFIRMATION/],
 ['unconfirmed identity assertion',f=>f.identityBasisConfirmed=false,/IDENTITY_BASIS/],
 ['unconfirmed last-pending court',f=>f.court.lastPendingConfirmed=false,/LAST_PENDING_COURT/],
 ['unreviewed automatic notice for dismissal',f=>{f.disposition='dismissed';f.noticeRouteReviewed=false;},/REVIEW_AUTOMATIC/],
 ['invalid calendar date',f=>f.dispositionDate='2026-02-30',/INVALID_DATE/],
 ['arrest after disposition',f=>f.arrest.date='2026-08-01',/INCOHERENT_DATE/],
 ['date of birth after arrest',f=>f.participant.dateOfBirth='2026-08-01',/INCOHERENT_DATE/],
 ['mixed last-pending cases',f=>f.cases=[{},{}],/ONE_LAST_PENDING_CASE/],
 ['unknown condition is not false',f=>delete f.opensNewCase,/CLERK_COMPONENT/],
 ['duplicate one-slot record holder',f=>f.respondents.push(f.respondents[1]),/DUPLICATE/],
 ['unknown respondent is not invented',f=>f.respondents[0].kind='unknown',/INVALID_RECORD_HOLDER/],
 ['unknown route',f=>f.route='expunge-conviction',/UNKNOWN_ROUTE/]
])test(`reject: ${name}`,()=>assert.throws(()=>importFacts(change(mutate)),error));
for(const field of ['signature','signedAt','notary','notarized','judgeSignature','judgmentDate','courtFinding','hearingDate','serviceCompleted','clerkCertification','courtApproved'])test(`protected execution input: ${field}`,()=>{
 assert.throws(()=>importFacts(change(f=>f.participant[field]='not authorized')),/PROTECTED_EXECUTION_INPUT/);
});
test('all eight petition condition combinations have exact page/component coverage and no surviving widgets',async()=>{
 for(const fixture of [canonical,boundary])for(const opensNewCase of [false,true])for(const proposedOrderRequested of [false,true]){
  const r=await buildPacket({...fixture,opensNewCase,proposedOrderRequested});
  assert.deepEqual(r.components.map(c=>c.id),['CR301',...(opensNewCase?['FI-05']:[]),...(proposedOrderRequested?['CR311']:[]),'instructions']);
  assert.equal(r.pages,4+(opensNewCase?5:0)+(proposedOrderRequested?1:0));
  const d=await PDFDocument.load(r.bytes,{updateMetadata:false});assert.equal(d.getForm().getFields().length,0);
  assert.equal(r.coverage.at(-1).lastPage,r.pages);
  const petition=r.components[0];const fills=mapped(petition);
  const full=[fixture.participant.firstName,fixture.participant.middleName,fixture.participant.lastName].join(' ');
  assert.equal(fills.find(x=>x.field==='Petitioner').value,full);
  assert.equal(fills.find(x=>x.field==='Petitioners full name').value,full);
  assert.equal(fills.some(x=>x.field==='Case number'),!opensNewCase);
  assert.equal(fills.filter(x=>x.checked&&["Petitioner's identifying information was used by another person",'Petitioner was the victim of mistaken identity'].includes(x.field)).length,1);
  for(const x of fills)if(x.fontSize)assert.ok(x.fontSize>=6.5);
  assert.ok(petition.audit.blanks.some(x=>x.field==='Court ORI number'));
  assert.ok(petition.audit.blanks.some(x=>x.field==='Judge or Division'));
  if(opensNewCase){
   const fi=r.components.find(c=>c.id==='FI-05');assert.equal(fi.audit.partyCount,5);assert.deepEqual(fi.audit.officialPageSequence,[1,1,2,3,4]);
   for(const respondent of fixture.respondents)assert.ok(mapped(fi).some(x=>x.value===respondent.organization));
   assert.ok(mapped(fi).some(x=>x.field==='Check Box2'||x.field==='Check Box3'));
   for(const forbidden of ['Filing Date','Case Type Code','The unredacted document is attached to this filing sheet in','Bar ID','Attorney Name if represented by counsel'])assert.ok(!mapped(fi).some(x=>x.field===forbidden));
  }
  if(proposedOrderRequested){const order=r.components.find(c=>c.id==='CR311');assert.ok(order.audit.mapped.every(x=>!x.rect||x.rect[1]<300));assert.equal(order.audit.protectedBlankRegions.length,1);}
 }
});
test('automatic notice produces guidance alone; does not default to a petition or claim an order exists',async()=>{
 const r=await buildPacket({...boundary,route:'automatic-on-notice'});assert.equal(r.pages,1);assert.deepEqual(r.components.map(c=>c.id),['instructions']);
 await assert.rejects(()=>buildPacket({...canonical,route:'automatic-on-notice'}),/AUTOMATIC_NOTICE_REQUIRES_DISMISSAL/);
});
test('missing optional identifiers remain blank; absent required case facts are disclosed, not invented',async()=>{
 const f=change(f=>{delete f.participant.race;delete f.participant.sex;delete f.arrest.citationNumber;delete f.arrest.date;delete f.court.originalCaseNumber;});
 const r=await buildPacket(f);const fills=mapped(r.components[0]);
 for(const field of ['Race','Sex_Male','Sex_Female','Social Security Number','Drivers License Number','Arrest Citation Number if known','Date of arrest','Case Number'])assert.ok(!fills.some(x=>x.field===field));
});
test('overlong known values refuse rather than clipping or replacing facts',async()=>{
 await assert.rejects(()=>buildPacket(change(f=>f.participant.lastName='W'.repeat(600))),/FIELD_OVERFLOW/);
});
test('the official party continuation is repeated when more than six parties must be identified',async()=>{
 const f=change(f=>f.respondents.push({kind:'sheriff',label:'Jackson',organization:'Example Sheriff'},{kind:'mhp',label:'A',organization:'Missouri State Highway Patrol'}));
 const r=await buildPacket(f);const fi=r.components.find(c=>c.id==='FI-05');assert.equal(fi.audit.partyCount,7);assert.deepEqual(fi.audit.officialPageSequence,[1,1,1,2,3,4]);assert.equal(fi.pages,6);
});
test('tampered source stops the build before an output directory is created',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'chat7-source-test-'));
 try{await fs.mkdir(path.join(temp,SOURCE_DIR),{recursive:true});await fs.writeFile(path.join(temp,SOURCE_DIR,'CR301.pdf'),'not the held form');const out=path.join(temp,'outputs');await assert.rejects(()=>buildFamily({root:temp,outDir:out}));await assert.rejects(()=>fs.stat(out));}finally{await fs.rm(temp,{recursive:true,force:true});}
});
test('wrapper imports as an API without starting a build or changing the current working directory',async()=>{
 const cwd=process.cwd();const api=await import('../../build-census-v1-mo-610-145-mistaken-identity-set.mjs');assert.equal(process.cwd(),cwd);assert.equal(api.buildPacket,buildPacket);assert.equal(api.importFacts,importFacts);
});
test('full CLI renderer twice compares EVERY generated family file, not a check-only probe',async()=>{
 const command=['scripts/build-census-v1-mo-610-145-mistaken-identity-set.mjs','--no-raster'];
 const snapshot=async()=>{const directory=path.join(ROOT,OUTPUT_DIR);const files=(await fs.readdir(directory)).sort();return Object.fromEntries(await Promise.all(files.map(async name=>[name,hash(await fs.readFile(path.join(directory,name)))])));};
 const first=spawnSync(process.execPath,command,{cwd:ROOT,encoding:'utf8',timeout:120000});assert.equal(first.status,0,first.stderr);
 const hashes1=await snapshot();await new Promise(r=>setTimeout(r,1100));
 const second=spawnSync(process.execPath,command,{cwd:ROOT,encoding:'utf8',timeout:120000});assert.equal(second.status,0,second.stderr);
 const hashes2=await snapshot();assert.deepEqual(hashes2,hashes1);assert.ok(Object.keys(hashes2).length>=30);
 const evidence=path.join(ROOT,'data/rcap-grade-a/chat-parallel-2026-09-07/chat7-build');await fs.mkdir(evidence,{recursive:true});
 await fs.writeFile(path.join(evidence,'mistaken-identity-determinism.json'),JSON.stringify({method:'Two complete CLI renders, separated by more than one second; exact filenames and SHA-256 of every generated family file',command:`node ${command.join(' ')}`,runs:[{exitCode:first.status,stdout:first.stdout},{exitCode:second.status,stdout:second.stdout}],fileCount:Object.keys(hashes2).length,identical:true,files:hashes2},null,2)+'\n');
});
