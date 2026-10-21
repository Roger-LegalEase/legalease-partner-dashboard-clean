import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {FAMILY,ROOT,OUTPUT_DIR,instructionPages,buildPacket,importFacts} from './mistaken-identity.mjs';
import {postOrderFollowThrough} from './mistaken-identity-follow-through.mjs';
const out=path.join(ROOT,OUTPUT_DIR);
const get=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8'));
const canon=JSON.parse(fs.readFileSync(new URL('./canonical.json',import.meta.url)));
const boundary=JSON.parse(fs.readFileSync(new URL('./boundary.json',import.meta.url)));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function validateList(variant,list,rows) {
 const ids=[...list.matchAll(/Field reference: `([^`]+)`/g)].map(m=>m[1]);
 assert.deepEqual([...ids].sort(),rows.map(r=>r.fieldId).sort());
 assert.equal(ids.length,new Set(ids).size);
 assert.ok(list.includes(`Applies only to \`${variant.packet}\``));
 for(const r of rows){
  const line=list.slice(0,list.indexOf(`Field reference: \`${r.fieldId}\``)).split('\n').filter(s=>s.trim()).at(-1);
  assert.ok(line.includes(`packet page ${r.page}; official source page ${r.sourcePage}`),r.fieldId);
  assert.ok(line.includes(r.effectiveLabel),r.fieldId);
  if(r.partyIndex!=null){
   const f=r.fixture.startsWith('canonical')?canon:boundary;
   const party=r.partyIndex===0?f.participant:f.respondents[r.partyIndex-1];
   const name=party.organization??[party.firstName,party.middleName,party.lastName].filter(Boolean).join(' ');
   assert.ok(line.includes(name),r.fieldId);
   assert.ok(line.includes(`party sheet ${Math.floor(r.partyIndex/3)+1}, slot ${r.partyIndex%3+1}`),r.fieldId);
  }
 }
}
test('both guide routes carry the SAME conditional source-supported post-order section',()=>{
 const follow=postOrderFollowThrough();
 for(const f of [canon,{...boundary,route:'automatic-on-notice'}])assert.deepEqual(instructionPages(f).at(-1),follow);
 const text=follow.paragraphs.join(' ');
 for(const term of ['actual order','clerk notifies','certified corrected driver history at no cost','reinstatement at no cost','Department of Corrections','normal fee','three-year period immediately before','notify the insurer','verification','not all premiums','not supplied or guaranteed']){
  // The final phrase is deliberately worded "No ... is supplied or guaranteed".
  assert.ok(text.includes(term==='not supplied or guaranteed'?'supplied or guaranteed':term),term);
 }
 assert.ok(text.includes('only if affected'));assert.ok(text.includes('only if applicable'));
 assert.ok(text.includes('not proof'));assert.ok(text.includes('do not certify'));
});
test('follow-through does not derive an order, agency action or insurer act from fixture input',()=>{
 const before=structuredClone(canon),pages=instructionPages(canon);
 assert.deepEqual(canon,before);assert.ok(pages.at(-1).paragraphs.every(p=>!p.includes(canon.court.originalCaseNumber)));
 for(const key of ['courtApproved','judgmentDate','serviceCompleted'])assert.throws(()=>importFacts({...canon,[key]:'invented'}),/PROTECTED_EXECUTION_INPUT/);
});
test('13 exact guide/list pairs; every missing field occurrence is shown once with exact actor and page',()=>{
 const manifest=get('packet-manifest.json'),map=get('production-field-map.json'),projection=get('reports/missing-information.json');
 assert.equal(manifest.variants.length,13);assert.equal(projection.variants.length,13);
 const required=map.refusals.filter(r=>r.requiredBeforeFiling===true);
 assert.equal(projection.items.length,required.length);
 for(const v of manifest.variants){
  const rows=required.filter(r=>r.fixture===v.id),list=fs.readFileSync(path.join(out,'missing-information',v.id+'.md'),'utf8');
  validateList(v,list,rows);
  const guide=fs.readFileSync(path.join(out,'instructions',v.id+'.md'),'utf8');
  validateList(v,guide,rows);assert.ok(guide.includes('After an actual expungement order'));
 }
});
test('filled canonical Race is NOT missing; boundary Race belongs only to boundary lists',()=>{
 const projection=get('reports/missing-information.json');
 assert.ok(!projection.items.some(r=>r.fixture.startsWith('canonical')&&r.formNumber==='CR301'&&r.fieldName==='Race'));
 assert.equal(projection.items.filter(r=>r.fixture.startsWith('boundary')&&r.formNumber==='CR301'&&r.fieldName==='Race').length,6);
 const canonical=fs.readFileSync(path.join(out,'missing-information/canonical.new-case.with-order.md'),'utf8');
 assert.ok(!canonical.includes('CR301/page-1/Race'));
 const boundaryList=fs.readFileSync(path.join(out,'missing-information/boundary.new-case.with-order.md'),'utf8');
 assert.ok(boundaryList.includes('CR301/page-1/Race'));
});
test('repeated slot 1 is attributed to actual second-sheet repository, never first-sheet petitioner',()=>{
 const p=get('reports/missing-information.json');
 const rows=p.items.filter(r=>r.fixture==='canonical.new-case.with-order'&&r.formNumber==='FI-05'&&r.fieldName==='Address');
 assert.equal(rows.length,1);assert.equal(rows[0].partyIndex,3);assert.equal(rows[0].partyRole,'Respondent 3');
 assert.equal(rows[0].partyName,'Missouri Criminal Records Repository');assert.equal(rows[0].sheet,2);assert.equal(rows[0].slot,1);assert.equal(rows[0].page,3);
});
test('standalone index is not mislabeled as one participant guide, and all lists preserve conditional FI-05 omission',()=>{
 const index=fs.readFileSync(path.join(out,'participant-instructions.md'),'utf8');
 assert.ok(index.startsWith('# Missouri mistaken-identity guides and completion lists'));
 assert.ok(index.includes('certified corrected driver history at no cost'));assert.ok(index.includes('three-year period immediately before'));
 const p=get('reports/missing-information.json');
 for(const v of p.variants){
  const rows=p.items.filter(r=>r.fixture===v.fixture);
  if(v.fixture.includes('.existing-case.')&&!v.fixture.includes('.clerk-requires-sheet.'))assert.ok(rows.every(r=>r.formNumber!=='FI-05'));
  if(v.fixture==='automatic-on-notice')assert.equal(rows.length,0);
 }
});
test('human-list regression controls reject an omitted row, duplicate row, lost party or wrong page',()=>{
 const v=get('packet-manifest.json').variants.find(v=>v.id==='canonical.new-case.with-order');
 const rows=get('production-field-map.json').refusals.filter(r=>r.fixture===v.id&&r.requiredBeforeFiling===true);
 const good=fs.readFileSync(path.join(out,'missing-information',v.id+'.md'),'utf8');
 const first=rows[0];assert.throws(()=>validateList(v,good.replace(`Field reference: \`${first.fieldId}\``,'REMOVED'),rows));
 assert.throws(()=>validateList(v,good+`\nField reference: \`${first.fieldId}\``,rows));
 assert.throws(()=>validateList(v,good.replaceAll('Missouri Criminal Records Repository','Jordan Lee Example'),rows));
 assert.throws(()=>validateList(v,good.replaceAll('packet page 3','packet page 99'),rows));
});
test('future 7-party expansion retains third official party sheet without inventing a sixth-slot person',async()=>{
 const f={...canon,respondents:[...canon.respondents,{kind:'sheriff',label:'Jackson',organization:'Example Sheriff'},{kind:'mhp',label:'A',organization:'Missouri State Highway Patrol'}]};
 const result=await buildPacket(f),sheet=result.components.find(c=>c.id==='FI-05');
 assert.equal(sheet.audit.partyCount,7);assert.deepEqual(sheet.audit.officialPageSequence,[1,1,1,2,3,4]);
 assert.equal(sheet.audit.fills.length,3);
 assert.ok(sheet.audit.fills[2].mapped.some(r=>r.field==='Organization if nonperson'&&r.value==='Missouri State Highway Patrol'));
 assert.ok(!sheet.audit.fills[2].mapped.some(r=>r.field==='Organization if nonperson_2'));
});
