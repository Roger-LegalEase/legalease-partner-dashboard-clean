import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {auditFamily} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {BLANK_DISPOSITIONS,PASS_COUNTERS} from '../../rcap-packet-completeness/completeness-contract.mjs';
import {FAMILY,ROOT,OUTPUT_DIR,buildPacket,importFacts} from './mistaken-identity.mjs';
const dir=path.join(ROOT,OUTPUT_DIR),mapPath=path.join(dir,'production-field-map.json');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const fixture=JSON.parse(fs.readFileSync(new URL('./canonical.json',import.meta.url),'utf8'));
test('complete current four-component manifest and actual additional clerk-required FI-05 branch',async()=>{
 const c=JSON.parse(fs.readFileSync(new URL('./mistaken-identity-packet-contract.json',import.meta.url)));
 assert.equal(c.components.length,4);assert.equal(c.components[3].role,'filing_and_service_instructions');
 assert.equal(c.source.gitBlob,'cbdd97e1967dbc755c547272eb0a0a2a99ecc744');
 const f={...fixture,opensNewCase:false,confidentialSheetRequired:true,proposedOrderRequested:false};
 const r=await buildPacket(f);assert.equal(r.pages,10);assert.deepEqual(r.components.map(x=>x.id),['CR301','FI-05','instructions']);
 assert.ok(r.components[0].audit.mapped.find(x=>x.field==='Case number'&&x.value===fixture.court.originalCaseNumber));
});
test('clerk selection cannot silently coerce a string or unknown condition',()=>{
 assert.throws(()=>importFacts({...fixture,confidentialSheetRequired:'false'}),/CLERK_COMPONENT/);
});
test('last-four SSN is not a full-SSN substitute on the actual confidential source',()=>{
 assert.throws(()=>importFacts({...fixture,participant:{...fixture.participant,ssn:'1234'}}),/FULL_SSN/);
});
test('every report blank uses the central closed vocabulary; unavailable facts are not execution blanks',()=>{
 const m=read('production-field-map.json');assert.ok(m.refusals.length>1000);
 for(const r of m.refusals)assert.ok(Object.hasOwn(BLANK_DISPOSITIONS,r.completenessDisposition),r.fieldId);
 const missing=m.refusals.filter(r=>r.requiredBeforeFiling);assert.ok(missing.length>0);
 assert.ok(missing.some(r=>r.fieldName==='SSN'));assert.ok(!missing.some(r=>r.fieldName==="Petitioner's Signature"));
 const audit=auditFamily(OUTPUT_DIR,FAMILY);
 assert.equal(audit.totals.terminalFields,m.writes.length+m.refusals.length);
 assert.deepEqual(Object.keys(audit.counters),PASS_COUNTERS);
 assert.ok(audit.totals.blanksByDisposition.REQUIRED_BEFORE_FILING>0);
 assert.ok(audit.totals.blanksByDisposition.PROTECTED_FIELD>0);
 assert.equal(audit.auditable,true);
});
test('byte-derived field evidence covers every declared write in all thirteen variants',()=>{
 const m=read('production-field-map.json'),a=read('reports/actual-writes.json'),r=read('reports/rendered-artifacts.json');
 assert.equal(a.derivedFromArtifactBytes,true);assert.equal(r.packets.length,13);
 assert.equal(r.packets.reduce((n,p)=>n+p.pages,0),108);
 assert.equal(a.documents.reduce((n,d)=>n+d.actualWrites.length,0),m.writes.length);
 assert.ok(a.documents.every(d=>d.actualWrites.every(w=>w.visibleInArtifactBytes)));
 assert.ok(a.artifacts.every(a=>a.refusedFieldsWithInk.length===0));
});
const mutant=(name,counter,mutate,file='production-field-map.json')=>test(name,()=>{
 const target=path.join(dir,file),before=fs.readFileSync(target),baseline=auditFamily(OUTPUT_DIR,FAMILY);
 try{const value=JSON.parse(before);mutate(value);fs.writeFileSync(target,JSON.stringify(value));
 const after=auditFamily(OUTPUT_DIR,FAMILY);assert.ok(after.counters[counter]>baseline.counters[counter],JSON.stringify(after.counters));
 }finally{fs.writeFileSync(target,before);}
 assert.deepEqual(fs.readFileSync(target),before);
});
mutant('known held fact falsely declared unavailable is caught','knownRequiredFieldsMissing',m=>{
 const w=m.writes.find(w=>w.factId&&w.fieldName==='Petitioner');
 m.refusals.push({...w,fieldId:'negative-known-availability',fieldName:'Full Name',effectiveLabel:'Full Name',reason:'Supply before filing',requiredBeforeFiling:true,completenessDisposition:'REQUIRED_BEFORE_FILING'});
});
mutant('an undisclosed genuinely missing required fact is caught','requiredFactsNotCollected',m=>m.refusals.push({
 fieldId:'negative-undisclosed',fieldName:'Unprovided exact record locator',effectiveLabel:'Unprovided exact record locator',reason:'Obtain the original record',requiredBeforeFiling:true,completenessDisposition:'REQUIRED_BEFORE_FILING',factId:'unprovided.exact.locator'
}));
mutant('out-of-vocabulary blank is caught','unclassifiedBlanks',m=>{m.refusals[0].completenessDisposition='PROBABLY_FINE';});
mutant('protected execution write is caught','protectedWrites',m=>m.writes.push({fieldId:'negative-signature',fieldName:"Petitioner's Signature",effectiveLabel:"Petitioner's Signature",value:'Fabricated signature'}));
mutant('required route election left unmade is caught','requiredOptionsMissing',m=>m.refusals.push({fieldId:'negative-route',fieldName:'Identity basis selection',effectiveLabel:'Identity basis selection',isSelectionControl:true,routeDetermined:true,completenessDisposition:'ROUTE_OPTION_NOT_SELECTED',reason:'Required route selection omitted'}));
mutant('incomplete actual offence row is caught','incompleteRows',m=>{m.writes.push({fieldId:'negative-row-a',fieldName:'Item9[0].Row7[0].CaseNo[0]',effectiveLabel:'Case Number',documentId:'CR301'});m.refusals.push({fieldId:'negative-row-b',fieldName:'Item9[0].Row7[0].Section[0]',effectiveLabel:'Section',documentId:'CR301',reason:'No value',completenessDisposition:'KNOWN_FACT_NOT_WRITTEN'});});
mutant('a mapped but absent component is caught','requiredComponentsMissing',m=>m.writes.push({fieldId:'negative-companion',fieldName:'Name',effectiveLabel:'Full Name',documentId:'NEGATIVE_UNRENDERED_COMPANION'}));
mutant('reported writes with no visible ink are caught','invisibleWrites',a=>{a.artifacts[0].valuesReportedByFinalizer=10;a.artifacts[0].addedGlyphsReadFromOutputBytes=0;a.artifacts[0].flattenedWidgetAppearancesReadFromOutputBytes=0;},'reports/actual-writes.json');
mutant('measured field-boundary defect is caught','visualDefects',a=>{a.artifacts[0].nonWhitespaceGlyphsOutsideMeasuredWriteBoxes+=1;},'reports/actual-writes.json');
test('same printed Address on two different FI-05 parties does not invent a shared held fact',()=>{
 const m=read('production-field-map.json'),a=auditFamily(OUTPUT_DIR,FAMILY);
 assert.ok(m.refusals.some(x=>x.fieldName==='Address_2'&&x.requiredBeforeFiling));
 assert.ok(!a.findings.some(x=>x.field?.endsWith('/Address_2')));
});
test('all official component PDF bytes remain identical; instruction PDFs intentionally change',()=>{
 const h=JSON.parse(fs.readFileSync(path.join(ROOT,'data/rcap-grade-a/chat-parallel-2026-09-07/chat7-build/preserved-output-hashes.json'),'utf8'));
 // Hashing is repeated here; the original packet is not rebuilt as a new source.
 return import('node:crypto').then(({createHash})=>{
 for(const [name,expected]of Object.entries(h))if(/\.(CR301|CR311|FI-05)\.pdf$/.test(name)){
   assert.equal(createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex'),expected,name);
 }
 });
});
