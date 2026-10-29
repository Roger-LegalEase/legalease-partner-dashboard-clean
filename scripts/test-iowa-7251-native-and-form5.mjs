import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {packetFor,FIXTURES,WRITES,resolveSource} from './build-census-v1-ia-7251-set.mjs';
import {validateIowa7251Facts} from '../src/lib/rcap-engine/iowa-7251-native.mjs';
const source=resolveSource().bytes;
let checks=0;async function check(label,fn){await fn();checks++;console.log('PASS '+label);}
const copy=()=>structuredClone(FIXTURES.canonical);
await check('actual source remains exact August2024 two-page Form5',()=>{
 assert.equal(source.length,288129);assert.equal(WRITES.some(w=>/under.?18|age_at/.test(w.id)),false);
 assert(fs.readFileSync('data/record-clearing/legal-design-intake/IA.memo.json','utf8').includes('The review bars auto-completion of this item.'));
});
await check('known age17 at conduct supports an incomplete draft with age assertion manual',()=>{
 const v=validateIowa7251Facts(copy());assert.equal(v.filingReady,false);assert.equal(v.ageAssertionManual,true);assert.equal(v.courtDebtIsNotPrecondition,true);
});
for(const[label,patch,reason]of[
 ['age18',{ageAtAct:18},'age_at_conduct_excluded'],['unknown age',{ageAtAct:null},'age_at_conduct_unknown'],
 ['unknown wrapper age',{ageAtAct:{unknown:true,value:17}},'age_at_conduct_unknown'],
 ['wrong statute',{offense:{kind:'statute',citation:'725.1',equivalentTo:'725.1(1)(a)',confirmation:true}},'wrong_statutory_ground'],
 ['unknown equivalent',{offense:{kind:'local_equivalent',citation:'Recorded ordinance',equivalentTo:null,confirmation:true}},'statutory_ground_unconfirmed'],
 ['dismissal',{disposition:'dismissed'},'wrong_disposition'],['wrong court',{proceeding:'juvenile_court'},'wrong_disposition'],
 ['unknown history',{historyComplete:false},'complete_history_required'],
 ['day before',{convictionDate:'2024-10-30'},'two_year_period_incomplete'],
 ['leap anniversary',{convictionDate:'2024-02-29'},'leap_anniversary_review'],
 ['within window',{laterConvictions:[{date:'2023-01-01',citation:'714.2(5)',kind:'other',categoryConfirmed:true}]},'intervening_conviction_excluded'],
 ['anniversary other',{laterConvictions:[{date:'2024-06-14',citation:'714.2(5)',kind:'other',categoryConfirmed:true}]},'anniversary_conviction_review'],
 ['321J exception',{laterConvictions:[{date:'2023-01-01',citation:'321J.2',kind:'chapter_321_simple',categoryConfirmed:true}]},'chapter321_exception_unconfirmed']
])await check('native objective facts refuse '+label,()=>assert.throws(()=>validateIowa7251Facts({...copy(),...patch}),new RegExp(reason)));
await check('actual18/currentage/convictionage cannot substitute for age at conduct',()=>{
 const f=copy();delete f.ageAtAct;assert.throws(()=>validateIowa7251Facts({...f,currentAge:17,ageAtConviction:17}),/supply exactly/);
});
await check('exact and later two-year dates work from conviction, not completion/payment',()=>{
 for(const date of['2024-10-29','2024-10-28'])assert.equal(validateIowa7251Facts({...copy(),convictionDate:date}).filingReady,false);
 const f={...copy(),laterConvictions:[{date:'2025-01-01',citation:'714.2(5)',kind:'other',categoryConfirmed:true}]};assert.equal(validateIowa7251Facts(f).filingReady,false);
});
await check('specified traffic exceptions are not blanket later-conviction exclusions',()=>{
 const f={...copy(),laterConvictions:[{date:'2023-01-01',citation:'321.285',kind:'chapter_321_simple',categoryConfirmed:true},{date:'2023-02-01',citation:'Local traffic ordinance',kind:'local_traffic',categoryConfirmed:true}]};assert.equal(validateIowa7251Facts(f).filingReady,false);
});
await check('unknown age/history cannot produce a renderer certification',async()=>{
 await assert.rejects(packetFor(source,'unknown-age',{...copy(),ageAtAct:null}),/age_at_conduct_unknown/);
 await assert.rejects(packetFor(source,'unknown-history',{...copy(),historyComplete:false}),/complete_history_required/);
});
await check('supplied acknowledgment states drive Xs without hardcoded defaults',async()=>{
 const r=await packetFor(source,'unknown-ack',{...copy(),ackCopy:null,ackConfidential:false});
 assert(!r.actualWrites.some(w=>/acknowledgment/.test(w.fieldName)));
 assert(r.blankFields.some(w=>w.fieldName==='service_acknowledgment'&&w.requiredBeforeFiling));
 assert(r.blankFields.some(w=>w.fieldName==='confidentiality_acknowledgment'&&w.requiredBeforeFiling));
});
await check('unknown optional contact is blank/disclosed, never printed as null or invented',async()=>{
 const r=await packetFor(source,'unknown-contact',{...copy(),address:null});assert(!r.actualWrites.some(w=>w.fieldName==='mailing_address'));
 assert(r.blankFields.some(w=>w.fieldName==='mailing_address'&&w.requiredBeforeFiling));
});
await check('unreadable supplied values and foreign source bytes are refused',async()=>{
 await assert.rejects(packetFor(source,'unreadable',{...copy(),name:'UNFIT'.repeat(30)}),/Unreadable supplied fact/);
 await assert.rejects(packetFor(Buffer.from('not source'),'wrong-source',copy()),/Wrong Form5 source/);
});
await check('foreign SSN/narrative/consent facts cannot enter the closed native schema',()=>{
 for(const patch of[{ssn:'123456789'},{dob:'1900-01-01'},{underlyingNarrative:'Not requested'},{prosecutorConsent:true}])assert.throws(()=>validateIowa7251Facts({...copy(),...patch}),/supply exactly/);
});
await check('independent source coordinates keep known names and county out of printed labels',()=>{
 const script=`import fitz,json,sys
d=fitz.open(sys.argv[1]);s=fitz.open(sys.argv[2]);name=sys.argv[3];county=sys.argv[4]
words=d[0].get_text('words');source=s[0].get_text('words')
label=next(w for w in source if w[4]=='Defendant' and w[1]<250)
namewords=[w for w in words if w[1]>190 and w[3]<214 and w[4] in name.split()]
assert len(namewords)==len(name.split()),'caption name not inside actual source name slot'
assert max(w[3] for w in namewords)<label[1],'caption overlaps Defendant label'
countyword=next(w for w in words if w[4]==county)
forword=next(w for w in source if w[4]=='for' and w[1]<130 and w[0]>200)
countylabel=next(w for w in source if w[4]=='County' and w[0]>430 and w[1]<130)
assert countyword[0]>forword[2]+2 and countyword[2]<countylabel[0]-2,'county overlaps printed title'
print('independent source slot checks passed')`;
 for(const[name,f]of Object.entries(FIXTURES)){
  const file='data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill/fixtures/'+name+'.pdf';
  const sourceFile=process.env.IA_FORM5_SOURCE_FILE;assert(sourceFile,'Supply actual held IA_FORM5_SOURCE_FILE for independent source geometry');
  execFileSync('python3',['-c',script,file,sourceFile,f.name,f.county],{stdio:'pipe'});
 }
});
console.log(`${checks}/${checks} HG006 native/renderer controls passed; isolated local source render, not application/provider/approval or production proof.`);
