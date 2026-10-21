import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {protectCategoryOf,decideBinding,PARTICIPANT_STATED_SUBJECT,haystack} from '../../../../../scripts/rcap-official-forms/rcap-field-semantics.mjs';
import {FIXTURES,resolveSources,censusOf,selections} from '../../../../../scripts/build-census-v1-al-misd-nonconviction-90-set.mjs';
const baselineBytes=execFileSync('git',['show','1a6b274dfb9269f506320bf940779057ff28a0e6:scripts/rcap-official-forms/rcap-field-semantics.mjs']);
const before=await import('data:text/javascript;base64,'+baselineBytes.toString('base64'));
const sources=resolveSources(),censuses=[];
for(const source of sources)censuses.push(await censusOf(source));
const cases=[
 ['CR-65','Only one offense per petition Multicount cases require multiple petitions',1,'disposition_or_hearing'],
 ['CR-65','1 Criminal charge from the record to be considered 1',5,'disposition_or_hearing'],
 ['CR-65','3 The agency or department that made the arrest 1',5,'agency'],
 ['CR-65','incarcerated or detained pursuant to arrest on the abovelisted charge that must be indicated here 1',5,'agency'],
 ['CR-65','Check Box3.1.1',6,'attorney'],
 ['C-10-CRIMINAL','Check Box2.2',1,'money']
];
const positive=[];
for(const [id,name,page,oldCategory]of cases){
 const f=censuses[sources.findIndex(s=>s.documentId===id)].fields.find(f=>f.name===name);
 assert.ok(f);assert.equal(f.widgets[0].page,page);assert.equal(before.protectCategoryOf(f.effectiveLabel),oldCategory);assert.equal(protectCategoryOf(f.effectiveLabel),null);
 assert.ok(protectCategoryOf('Judge '+f.effectiveLabel));
 positive.push({documentId:id,sourceSha256:sources.find(s=>s.documentId===id).sha256,field:name,page,caption:f.effectiveLabel,before:oldCategory,after:null});
}
const protectedControls=['The following agencies are hereby ordered to seal records in their custody','Agency certification','Printed or Typed Name of Attorney & AL State Bar No.','Signature of Attorney','Payment of Expungement filing fees shall be waived and assessed at the conclusion of the case','Court use only','Hearing date','Disposition entered by clerk','I certify service on the agency','Signature of Petitioner','Sworn to before me','Fee amount','Employer name'];
for(const caption of protectedControls){assert.ok(protectCategoryOf(caption),caption);assert.equal(protectCategoryOf(caption),before.protectCategoryOf(caption));}
// Removing each AL correction must restore its source-caption refusal. The
// regex anchors must also refuse a caption with an added owner or directive.
const ruleRemovalMutations=[];
for(const rule of PARTICIPANT_STATED_SUBJECT.filter(r=>r.id.startsWith('al_'))){
 const sourceCase=positive.find(p=>rule.match.test(haystack(p.caption)));assert.ok(sourceCase,rule.id);
 const index=PARTICIPANT_STATED_SUBJECT.indexOf(rule);
 try{PARTICIPANT_STATED_SUBJECT.splice(index,1);assert.equal(protectCategoryOf(sourceCase.caption),sourceCase.before,rule.id);}
 finally{PARTICIPANT_STATED_SUBJECT.splice(index,0,rule);}
 assert.equal(protectCategoryOf(sourceCase.caption),null);
 for(const caption of ['Judge '+sourceCase.caption,sourceCase.caption+' ordered by court']){
  assert.equal(rule.match.test(haystack(caption)),false,caption);
  assert.ok(protectCategoryOf(caption),caption);
  assert.equal(decideBinding({name:caption,pdfType:'text'},{explicitMappings:{[caption]:'participant.full_legal_name'}}).writable,false);
 }
 ruleRemovalMutations.push(rule.id);
}
assert.equal(decideBinding({name:'Charge or conviction to be expunged',effectiveLabel:'Charge or conviction to be expunged',pdfType:'text'},{explicitMappings:{'Charge or conviction to be expunged':'matter.charge'}}).writable,true);
assert.equal(decideBinding({name:'Charge or conviction to be expunged',effectiveLabel:'Charge or conviction to be expunged',pdfType:'checkbox'}).writable,false);
assert.equal(decideBinding({name:'Charge or conviction to be expunged',effectiveLabel:'Charge or conviction to be expunged',pdfType:'text'}).writable,false);
for(const basis of ['dismissed_with_prejudice','no_billed','not_guilty','nolle_without_conditions','indictment_quashed']){
 const facts={...FIXTURES.canonical,'answers.basis':basis,'answers.limitations_expired':true};
 assert.equal(Object.keys(selections(sources[0],facts)).filter(n=>n.startsWith('Check Box8.')).length,1);
}
for(const patch of [{'answers.basis':undefined},{'answers.basis':'felony'},{'answers.refiled':true},{'answers.pro_se':undefined},{'answers.disposition_date':'2026-08-31'},{'answers.offense_level':'felony'},{'answers.all_court_ordered_amounts_paid':undefined},{'answers.basis':'indictment_quashed'}])assert.throws(()=>selections(sources[0],{...FIXTURES.canonical,...patch}));
for(const patch of [{'answers.seek_fee_waiver':undefined},{'answers.seek_fee_waiver':false},{'answers.unable_to_pay_fee':undefined},{'answers.unable_to_pay_fee':false}])assert.throws(()=>selections(sources[1],{...FIXTURES.canonical,...patch}));
// Source-caption change surface in existing tracked maps, without changing or
// rebuilding their packets. A caption exception is not packet acceptance.
const affected=[];
const files=execFileSync('git',['ls-files','data/rcap-all50/overlays/census-v1/*/production-field-map.json'],{encoding:'utf8',maxBuffer:10_000_000}).trim().split('\n').filter(Boolean);
function visit(value,file){if(!value||typeof value!=='object')return;if(!Array.isArray(value)){for(const key of ['effectiveLabel','printedLabel','semanticLabel','sourceLabel','field','fieldName','name'])if(typeof value[key]==='string'){const old=before.protectCategoryOf(value[key]),now=protectCategoryOf(value[key]);if(old!==now)affected.push({file,key,caption:value[key],before:old,after:now});}}for(const v of Object.values(value))if(v&&typeof v==='object')visit(v,file);}
for(const file of files)visit(JSON.parse(fs.readFileSync(file,'utf8')),file);
console.log(JSON.stringify({result:'PASS',exactSourcePositiveCases:positive,protectedNegativeControls:protectedControls.length,ruleRemovalMutations,anchoredOwnerAndDirectiveNegativeCases:ruleRemovalMutations.length*2,explicitAnswerAndWrongTrackNegativeCases:12,existingMapChangeSurface:[...new Map(affected.map(a=>[JSON.stringify(a),a])).values()],limitations:'Source-caption semantics regression and affected-input scan; no independent visual or legal acceptance.'},null,2));
