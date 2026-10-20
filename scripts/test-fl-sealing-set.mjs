import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {FIXTURES,requiredBeforeFiling,assertHeldNameParts,maps,sourceBytes,courtStageRequirements,participantInstructions,assertGuidanceRequirements} from './build-census-v1-fl-sealing-set.mjs';
test('exact held six-page sealing source binds',()=>{const s=sourceBytes();assert.equal(s.bytes.length,26589);});
for(const [name,facts] of Object.entries(FIXTURES))test(`${name} has all adopted required facts and passes bounded gates`,()=>assertHeldNameParts(facts));
for(const [field,value] of [['matter.prior_relief','Prior relief exists'],['matter.supervision','Supervision pending'],['matter.pending_petition','Other petition pending'],['matter.disposition','Adjudicated guilty'],['matter.charge',''],['matter.circuit','']])test(`refuse incompatible or missing ${field}`,()=>assert.throws(()=>assertHeldNameParts({...FIXTURES.canonical,[field]:value})));
test('unused expunction-only statement has no participant writes',()=>{const m=maps().find(m=>m.formNumber==='FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION');assert(m.canonicalWrites.every(r=>r.page!==2));for(const key of ['page2_name','page2_dob','page2_phone'])assert(m.canonicalRefusals.some(r=>r.field.endsWith('.'+key)&&r.completenessDisposition==='NOT_APPLICABLE_ON_THIS_ROUTE'));});
test('stage two known eligibility facts are declared writes not required-before-filing blanks',()=>{for(const id of ['FL-RULE-3.989-PETITION','FL-RULE-3.989-SWORN-STATEMENT']){const m=maps().find(m=>m.formNumber===id);for(const fact of ['disposition','prior_relief','supervision','pending_petition'])assert(m.canonicalWrites.some(r=>r.factId==='matter.'+fact));}});
test('adopted sealing sequence service and firearms instructions remain explicit',()=>{const r=courtStageRequirements(),text=participantInstructions([],{sentence:r.certificateOfService},r);assertGuidanceRequirements(text,r);assert(text.includes('No State Attorney certification is required for sealing'));assert(text.includes('Firearms-purchase background checks and concealed-carry licensing'));assert(!text.includes('three recipients'));assert(text.includes('Do not file the court packet before it arrives'));});

test('saved sealing candidate uses adopted custom family and distinct component vehicles',()=>{const out=new URL('../data/rcap-all50/overlays/census-v1/fl/fl-sealing-set--custom-pleading/',import.meta.url);const owner=JSON.parse(fs.readFileSync(new URL('../data/rcap-grade-a/legal-decisions/OWNER_DETERMINATIONS_2026-09-02.json',import.meta.url)));const find=(o)=>{if(!o||typeof o!=='object')return null;if(o.id==='FL-RULE-3989')return o;for(const v of Object.values(o)){const r=find(v);if(r)return r;}return null;};assert.equal(find(owner).families.find(f=>f.familyId==='fl-sealing-set').strategy,'custom_pleading');if(!fs.existsSync(new URL('packet-set-manifest.json',out)))return;const m=JSON.parse(fs.readFileSync(new URL('packet-set-manifest.json',out)));assert.equal(m.implementationStrategy,'custom_pleading');assert.equal(m.components[0].outputStrategy,'official_pdf_fill');for(const c of m.components.slice(1))assert.equal(c.outputStrategy,'custom_pleading');for(const key of ['sourceReceipt','renderedArtifacts','participantInstructions'])assert(m[key].includes('--custom-pleading/'));const receipt=JSON.parse(fs.readFileSync(new URL('source-receipt.json',out)));assert.equal(receipt.committedRecords.length,7);assert(receipt.committedRecords.every(r=>r.pathInRepository===r.path));});

test('all three independently identified composed blanks have distinct ownership and conditions',()=>{const all=maps().flatMap(m=>m.canonicalRefusals);const get=id=>all.find(r=>r.field.endsWith('.'+id));assert.equal(get('additional_arrest_data').category,'court_prosecutor_clerk_or_agency_owned');assert(get('additional_required_recipients').condition);assert.notEqual(get('additional_required_recipients').requiredBeforeFiling,true);assert.equal(get('server_printed_name').requiredBeforeFiling,true);assert.equal(get('server_printed_name').category,null);const r=courtStageRequirements(),text=participantInstructions(requiredBeforeFiling(maps()),{sentence:r.certificateOfService},r);for(const x of ['Additional arrest data, if any','Additional required recipients, if any','Printed name of server'])assert(text.includes(x));});

test('sealing cost guidance separates FDLE from unknown court charges and names the answering offices',()=>{
 const r=courtStageRequirements();
 const generated=participantInstructions(requiredBeforeFiling(maps()),{sentence:r.certificateOfService},r);
 const saved=fs.readFileSync(new URL('../data/rcap-all50/overlays/census-v1/fl/fl-sealing-set--custom-pleading/participant-instructions.md',import.meta.url),'utf8');
 for(const [name,text]of [['generated',generated],['saved',saved]]){
  for(const phrase of ['$75 nonrefundable FDLE processing fee','no held source addresses a waiver','FDLE Seal & Expunge Section','No held source states a court filing fee for the Stage 2 petition','certified copies cost what the county charges','clerk of the circuit or county court in the circuit of arrest before filing'])assert.ok(text.includes(phrase),`${name}: ${phrase}`);
  assert.equal((text.match(/\$\d+/g)??[]).join(','),'$75',`${name}: only the source-supported Stage 1 amount is published`);
 }
});

test('all active sealing route declarations resolve to the same current census route',()=>{
 const key='obligation:track-pathway:FL:fl-sealing:court-ordered-sealing-943-059';
 const root=new URL('../data/rcap-all50/overlays/census-v1/fl/fl-sealing-set--custom-pleading/',import.meta.url);
 const census=JSON.parse(fs.readFileSync(new URL('../data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json',import.meta.url)));
 const route=census.routes.find(r=>r.routeKey===key);
 assert.equal(route?.packetSetId,'fl-sealing-set');
 assert.equal(route.trackId,'fl-sealing');
 for(const file of ['source-receipt.json','production-field-map.json','packet-set-manifest.json','field-census.census-v1.json']){
  const value=JSON.parse(fs.readFileSync(new URL(file,root)));
  assert.deepEqual(value.routeKeys,[key],file);
  for(const selection of value.routeSelectionsMade??[])assert.equal(selection.routeKey,key);
  for(const map of value.maps??[])assert.equal(map.documentPolicy.routeKey,key);
 }
 for(const map of maps())assert.equal(map.documentPolicy.routeKey,key);
 assert.ok(fs.readFileSync(new URL('participant-instructions.md',root),'utf8').includes('Route: '+key));
});
