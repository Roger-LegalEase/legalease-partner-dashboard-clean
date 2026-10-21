import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FIRST_OWI_STATEMENT,assessPriorApplications,denialTiming,thirdAnniversary} from './mi-history-policy.mjs';
import {PDFDocument} from 'pdf-lib';
import {FAMILY_IDS,ROOT,SOURCE,fixturesFor,validateInput,prepareProfile,readSource,renderMichigan,nextSteps,sha256,familyDir} from './michigan.mjs';
const [ordinary,owi]=FAMILY_IDS;
const fresh=(id=ordinary)=>structuredClone(fixturesFor(id).canonical);
const mutation=(title,change,id=ordinary)=>test(title,()=>{const input=fresh(id);change(input);assert.throws(()=>validateInput(id,input));});
for(const id of FAMILY_IDS) for(const [name,input] of Object.entries(fixturesFor(id))) test(`${id}/${name}: coherent explicit facts accepted`,()=>assert.doesNotThrow(()=>validateInput(id,input)));
for(const key of ['name','street','cityStateZip','phone']) mutation(`missing participant ${key} refused`,i=>delete i.participant[key]);
for(const key of ['crime','chargeCode','date','caseNumber','courtKey','category']) mutation(`missing conviction ${key} refused`,i=>delete i.convictions[0][key]);
mutation('missing substantive answer is not a negative answer',i=>delete i.attestations.noPendingCharges);
mutation('pending charges are not auto-denied',i=>i.attestations.noPendingCharges=false);
mutation('unknown item2 statement refused',i=>i.attestations.item2={});
mutation('unaffirmed item2 statement refused',i=>i.attestations.item2.e=false);
mutation('wrong item2 category refused',i=>i.attestations.item2={c:true});
mutation('prior application absence is not no',i=>delete i.previousSame);
mutation('other prior application absence is not no',i=>delete i.previousOther);
mutation('deferred history absence is not no',i=>delete i.deferred);
mutation('positive deferred history needs description',i=>i.deferred={hasHistory:true});
mutation('negative deferred history conflicts with details',i=>i.deferred.description='A prior deferred case');
mutation('certified copies cannot be fabricated',i=>i.attachments.certifiedCopies='provided');
mutation('fingerprints cannot be fabricated',i=>i.attachments.fingerprintCard='provided');
mutation('fee-relief request refuses instead of inserting unrelated form',i=>i.feeRelief='requested');
mutation('wrong family refuses',i=>i.familyId=owi);
mutation('ordinary refuses first OWI',i=>i.convictions[0].category='firstOwi');
mutation('first OWI refuses ordinary misdemeanor',i=>i.convictions[0].category='ordinaryMisdemeanor',owi);
mutation('first OWI refuses multiple OWI convictions',i=>i.convictions.push({...i.convictions[0],caseNumber:'14-002345-SM'}),owi);
mutation('different convicting court refuses',i=>i.convictions[0].courtKey='DIFFERENT');
mutation('duplicate conviction refuses',i=>i.convictions.push({...i.convictions[0]}));
mutation('unknown record identifier refuses',i=>i.recordIdentifiers.notary='Fake');
for(const key of ['signature','notary','hearing','service','judicialFindings','eligibilityApproved']) mutation(`protected injection ${key} refuses`,i=>i[key]='invented');
mutation('local prosecution needs actual jurisdiction name',i=>i.prosecution={kind:'local'});
mutation('history item3 must concern listed conviction',i=>i.previousSame=[{...i.convictions[0],caseNumber:'other',disposition:'Denied'}]);
mutation('history item4 cannot duplicate listed conviction',i=>i.previousOther=[{...i.convictions[0],disposition:'Denied'}]);
mutation('invalid date refuses',i=>i.convictions[0].date='2026-02-30');
test('source SHA rejects changed byte before rendering',async()=>{const b=fs.readFileSync(`${ROOT}/${SOURCE}`);assert.equal(sha256(b),'9fec389975f06640aff057fbace9375866f64761c33e30c86e9798609f93b8a7');const changed=Buffer.from(b);changed[100]^=1;assert.notEqual(sha256(changed),sha256(b));});
test('source has 106 classified fields and case repeats on all three filing pages',async()=>{const s=await readSource();assert.equal(s.census.length,106);assert.deepEqual(s.census.find(r=>r.name==='caseno').widgets.map(w=>w.page),[1,2,3]);});
test('all protected fields stay unbound in all generated variants',async()=>{for(const id of FAMILY_IDS)for(const input of Object.values(fixturesFor(id))){const p=await prepareProfile(id,input,await readSource());for(const field of p.profile.protectedFields)assert.equal(Object.hasOwn(p.values,field),false,field);}});
test('optional record IDs missing stay blank, present transcribe exactly',async()=>{for(const id of FAMILY_IDS){const f=fixturesFor(id),a=await prepareProfile(id,f.canonical,await readSource()),b=await prepareProfile(id,f.boundary,await readSource());for(const k of ['ori','prno','ctntcn','sid']){assert(!Object.hasOwn(a.values,k));assert.equal(b.values[k],f.boundary.recordIdentifiers[k]);assert(nextSteps(f.canonical,'canonical').includes(k==='ori'?'ORI':k==='prno'?'Police Report No.':k.toUpperCase()==='CTNTCN'?'CTN/TCN':'SID'));}}});
test('first OWI binds 2c only, never ordinary 2e',async()=>{const p=await prepareProfile(owi,fresh(owi),await readSource());assert.equal(p.values.firstcheck,true);assert(!p.values.mis1check);});
test('severe text overflow refuses rather than truncating',async()=>{const input=fresh();input.participant.name='Unfittable '.repeat(200);await assert.rejects(prepareProfile(ordinary,input,await readSource()),/fit|width|size/i);});
test('all variants produce flattened PDFs without protected form fields',async()=>{for(const id of FAMILY_IDS)for(const [name,input]of Object.entries(fixturesFor(id))){const result=await renderMichigan(id,input);assert.equal(result.pageCount,name==='extended-history'?7:name==='boundary'&&id===ordinary?5:4);const pdf=await PDFDocument.load(result.bytes);assert.equal(pdf.getForm().getFields().length,0);}});
test('wrapper imports expose runFamily without triggering a build',async()=>{for(const id of FAMILY_IDS){const p=`${ROOT}/${familyDir(id)}/generated-files.json`;const before=fs.existsSync(p)?sha256(fs.readFileSync(p)):null;const m=await import(`../../build-census-v1-${id}.mjs`);assert.equal(typeof m.runFamily,'function');assert.equal(fs.existsSync(p)?sha256(fs.readFileSync(p)):null,before);}});

// CHAT10-MI-01: prior filing and prior granted relief are different predicates.
const prior=(scope='previousSame',outcome='denied')=>{
 const i=fresh(owi);i[scope]=[{...i.convictions[0],caseNumber:scope==='previousSame'?i.convictions[0].caseNumber:'OTHER-OWI',outcome,decisionDate:'2022-01-15',disposition:outcome==='granted'?'Set aside 01/15/2022':outcome==='pending'?'Pending':outcome==='withdrawn'?'Withdrawn 01/15/2022':'Denied 01/15/2022'}];return i;
};
for(const scope of ['previousSame','previousOther']){
 test(`${scope}: denied OWI is not prior granted relief, but remains a handoff`,()=>{
  const i=prior(scope);assert.doesNotThrow(()=>validateInput(owi,i));const r=assessPriorApplications(i);
  assert.equal(r.priorFirstOwiReliefReceived,false);assert.equal(r.status,'STOP_BEFORE_REAPPLICATION_ATTORNEY_REVIEW');assert.equal(r.permissionToReapply,false);
  assert.equal(r.reasons[0].status,'THREE_YEARS_ELAPSED_REVIEW_STILL_REQUIRED');
 });
 test(`${scope}: granted OWI relief actually refuses the printed statement`,()=>{const i=prior(scope,'granted');assert.equal(assessPriorApplications(i).priorFirstOwiReliefReceived,true);assert.throws(()=>validateInput(owi,i),/prior GRANTED first-OWI relief/);});
 test(`${scope}: unknown outcome is not interpreted as a grant`,()=>{const i=prior(scope,'unknown');const r=assessPriorApplications(i);assert(!r.priorFirstOwiReliefReceived);assert.equal(r.reasons[0].status,'PRIOR_OUTCOME_UNKNOWN');assert(!r.permissionToReapply);assert.throws(()=>validateInput(owi,i),/resolve the unknown first-OWI application outcome/);});
 test(`${scope}: missing structured outcome does not infer it from free text`,()=>{const i=prior(scope);delete i[scope][0].outcome;assert.throws(()=>validateInput(owi,i),/outcome must be explicit/);});
 for(const outcome of ['pending','withdrawn'])test(`${scope}: ${outcome} requires review, not lifetime refusal or filing authority`,()=>{const i=prior(scope,outcome);assert.doesNotThrow(()=>validateInput(owi,i));const r=assessPriorApplications(i);assert(!r.priorFirstOwiReliefReceived);assert(!r.permissionToReapply);assert.equal(r.status,'STOP_BEFORE_REAPPLICATION_ATTORNEY_REVIEW');});
}
mutation('no prior granted OWI relief answer cannot be invented',i=>delete i.attestations.noPriorFirstOwiRelief,owi);
mutation('reported prior granted OWI relief contradicts item2c',i=>i.attestations.noPriorFirstOwiRelief=false,owi);
mutation('missing review date refused',i=>delete i.reviewAsOf,owi);
for(const key of ['victimNoticeCompleted','prosecutorNoticeCertified','courtAllowsReapplication'])mutation(`${key}: outside participant authority`,i=>i[key]=true);
test('exact item2c clause includes AND HAD, not an invented lifetime no-application statement',()=>{assert.equal(FIRST_OWI_STATEMENT,'I have not previously applied to have and had a first violation operating while intoxicated offense conviction set aside.');});
for(const [asOf,status]of [['2025-01-14','BEFORE_THREE_YEARS_UNLESS_ORDER_SPECIFIES_EARLIER'],['2025-01-15','THREE_YEARS_ELAPSED_REVIEW_STILL_REQUIRED'],['2025-01-16','THREE_YEARS_ELAPSED_REVIEW_STILL_REQUIRED']])test(`three-year denial boundary ${asOf}`,()=>assert.equal(denialTiming(prior().previousSame[0],asOf).status,status));
test('reported earlier date is timing only, not reapplication permission',()=>{const i=prior();Object.assign(i.previousSame[0],{decisionDate:'2025-01-15',earlierReapplyDate:'2026-08-01'});const r=assessPriorApplications(i);assert.equal(r.reasons[0].status,'ORDER_DATE_REACHED_REVIEW_STILL_REQUIRED');assert.equal(r.permissionToReapply,false);assert.equal(r.denialOrdersSupplied,false);});
test('before reported earlier date remains timing stop',()=>{const r=prior().previousSame[0];r.earlierReapplyDate='2023-02-01';assert.equal(denialTiming(r,'2023-01-31').status,'BEFORE_ORDER_SPECIFIED_DATE');});
test('missing denial date remains unknown, not zero elapsed years',()=>{const i=prior();delete i.previousSame[0].decisionDate;assert.equal(assessPriorApplications(i).reasons[0].status,'DENIAL_DATE_UNKNOWN');});
for(const [label,change]of [['invalid date',r=>r.decisionDate='2022-02-30'],['future denial',r=>r.decisionDate='2030-01-15'],['earlier date before denial',r=>r.earlierReapplyDate='2021-01-01'],['not actually earlier',r=>r.earlierReapplyDate='2025-01-16'],['earlier date without decision date',r=>{delete r.decisionDate;r.earlierReapplyDate='2023-01-01';}]])test(`${label}: no invented valid repeat interval`,()=>{const i=prior();change(i.previousSame[0]);assert.throws(()=>validateInput(owi,i));});
test('leap-day anniversary is bounded calendar calculation, not filing authority',()=>assert.equal(thirdAnniversary('2020-02-29'),'2023-02-28'));
test('denial history is actually printed while firstcheck remains truthful',async()=>{const i=prior();const p=await prepareProfile(owi,i,await readSource());assert(p.values.firstcheck);assert(p.values.prevappcheck);assert.equal(p.values.prevdispo1,'Denied 01/15/2022');assert(!p.values.noappcheck);});
test('all changed labels distinguish granted first-OWI relief',async()=>{const s=await readSource();assert.match(s.census.find(r=>r.name==='firstcheck').label,/granted-first-OWI-relief/);});
for(const id of FAMILY_IDS)test(`${id}: every complete guide restores effects and preserves later acts`,()=>{for(const [n,i]of Object.entries(fixturesFor(id))){const g=nextSteps(i,n);assert.match(g,/does not extinguish an obligation to pay restitution/);assert.match(g,/does not entitle the participant to a refund of a fine, costs, or other money/);assert.match(g,/Only after actual mailing/);assert.match(g,/The court supplies hearing details/);assert.match(g,/If a victim appears or submits a written or oral statement/);assert.match(g,/PO Box 30217, Lansing, MI 48909/);assert(!g.includes('Confirm the receiving address with the AG'));assert(!/firearm rights (?:are|remain)|restores firearm|does not restore firearm/i.test(g));if(id===owi)assert.match(g,/remains on the driving record/);}});
test('serious-misdemeanor guide identifies prosecutor duty, victim participation and no participant certification',()=>{const g=nextSteps(fixturesFor(ordinary)['serious-misdemeanor'],'serious-misdemeanor');for(const t of ['This fixture includes a serious misdemeanor','prosecuting attorney notifies the victim','first-class mail to the last known address','victim may appear and make a written or oral statement','do not contact the victim or certify that the prosecutor sent notice','even without a formal objection'])assert(g.includes(t),t);});
test('all denial and pending rendered variants carry an explicit stop without fabricated order',()=>{for(const [n,i]of Object.entries(fixturesFor(owi))){if(!i.previousSame.length)continue;const g=nextSteps(i,n);assert.match(g,/STOP BEFORE REAPPLICATION/);assert.match(g,/No denial order is supplied/);assert(!assessPriorApplications(i).permissionToReapply);}});

test('overlong known prior disposition refuses instead of dropping words',async()=>{const i=prior();i.previousSame[0].disposition='Unfittable disposition '.repeat(30);await assert.rejects(prepareProfile(owi,i,await readSource()),/fit|width|size/i);});
