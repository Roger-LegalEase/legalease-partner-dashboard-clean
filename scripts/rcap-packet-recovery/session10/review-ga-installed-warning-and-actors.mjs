import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateGa,guideFor,OUT,FAMILY} from '../chat5/ga-pre2013.mjs';
import {createGaPre2013ActorVerifier,gaPre2013ActorInventoryProblems} from '../../rcap-packet-completeness/ga-pre2013-source-actors.mjs';
import {classifyBlank} from '../../rcap-packet-completeness/completeness-contract.mjs';

const destination='data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/ga-warning-closure';
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const identity=p=>({path:p,sha256:sha(read(p)),bytes:read(p).length});
const load=n=>json(`${OUT}/${n}`),cases=[];
const check=(name,fn)=>{const measured=fn();cases.push({name,result:'PASS',...measured});};
const delta=json(`${destination}/ga-warning-delta-04.json`).rows[0];
const oldMeasurements=json(`${destination}/ga-measurements-03.json`);
const inventory=load('reports/rendered-artifacts.json').artifacts;
const map=load('production-field-map.json'),census=load('field-census.census-v1.json'),receipt=load('source-receipt.json');
const reader='scripts/rcap-packet-completeness/verify-packet-completeness.mjs';
const actor='scripts/rcap-packet-completeness/ga-pre2013-source-actors.mjs';
const baseline=json(`${destination}/installed-native-audit.json`);
const warning=delta.warningMeasured;
check('current actual shared audit consumes installed V2 and preserves static field partition',()=>{
  const before=execFileSync('git',['show',`9f35db281d8de2664498a7f1d849976c31b925f1:${reader}`]);
  assert.equal(sha(before),baseline.currentSharedReaderSha256);
  const auditBody=s=>s.slice(s.indexOf('export function auditFamily'),s.indexOf('// ---- enumerate'));
  assert.equal(auditBody(before.toString()),auditBody(read(reader).toString()));
  const cli=json(`${destination}/native-discovery-current-cli.json`);
  assert.equal(cli.sourceSha256,sha(read(reader)));assert.equal(cli.exitCode,0);
  assert.match(cli.stdout,/1 famil\(ies\) audited · 1 PASS_COMPLETE/);
  assert.equal(sha(read(actor)),baseline.currentActorAdapterSha256);
  assert.equal(baseline.currentActorAdapterSha256,baseline.session07ActorAdapterSha256);
  const a=baseline.result;
  assert.equal(a.result,'PASS_COMPLETE');
  assert.equal(a.totals.terminalFields,52);assert.equal(a.totals.written,13);assert.equal(a.totals.blank,39);
  assert.equal(a.totals.blanksByDisposition.REQUIRED_BEFORE_FILING,1);
  assert.equal(a.sourceActorMeasurements[0].completeOutputPagesCompared,30);
  const outputs=a.sourceActorMeasurements[0].outputs;
  for(const x of delta.wholePdfHashesMeasured)assert.equal(outputs.find(o=>o.fixture===x.fixture)?.sha256,x.sha256);
  return {actualAuditEvidence:`${destination}/installed-native-audit.json`,canonicalFieldInstances:52,all15WholeOutputBindings:true,
    scope:'Canonical static counters; original independent packet review supplies separate all-fixture visual/fact scope. Runtime counters are not inferred.'};
});
check('unchanged actor/normalizer/classification path supports reuse of original 37 author controls',()=>{
  assert.equal(sha(read(actor)),sha(read(`inputs/session07/code/${actor}`)));
  const current=read(reader).toString(),old=read(`inputs/session07/code/${reader}`).toString();
  const segment=(s,start,end)=>{const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return s.slice(a,b);};
  for(const [start,end] of [['const normalizeRow =','\n});'],['const verifyActor =','  // The last condition:']])assert.equal(segment(current,start,end),segment(old,start,end));
  const prior=json('inputs/session07/evidence/ga-source-actor-final-tests.json');assert.equal(prior.passed,37);assert.equal(prior.failed,0);
  return {authorTestsReused:37,authorTestsClaimedAsNewIndependent:false,
    changedReaderScope:'Maryland import/dispatch/discovery and the separately reviewed exact GA CLI discovery differ from Session07; the inspected GA audit and normalization path is unchanged.'};
});
check('actual old CLI refusal and current wrong-family refusal stay negative outcomes',()=>{
  for(const p of ['native-discovery-before-refusal.json','native-discovery-wrong-family-refusal.json']){
    const r=json(`${destination}/${p}`);assert.equal(r.exitCode,2);assert.equal(r.result,'EXPECTED_REFUSAL_NOT_PASS');
  }
  return {baselineExitCode:2,currentWrongFamilyExitCode:2,zeroMeasuredFamiliesClaimedAsPass:false};
});
const discoverySource=read(reader).toString();
const enumeration=discoverySource.slice(discoverySource.indexOf('const families = [];'),discoverySource.indexOf('/*\n * What counts as built'));
assert.ok(enumeration.startsWith('const families = [];'));
const enumerate=new Function('fs','path','ROOT','OVERLAYS','readIf','KY_NATIVE_DIRECTORY','KY_NATIVE_FAMILY','MD_NATIVE_DIRECTORY','MD_NATIVE_FAMILY',`${enumeration};return families;`);
for(const scenario of [
  {name:'exact GA native directory/map/status',entry:'ga-nonconv-pre2013-set--official-pdf-fill',map:{familyId:FAMILY},status:{familyId:FAMILY},count:1},
  {name:'wrong directory',entry:'ga-wrong-family--official-pdf-fill',map:{familyId:FAMILY},status:{familyId:FAMILY},count:0},
  {name:'missing map',entry:'ga-nonconv-pre2013-set--official-pdf-fill',map:null,status:{familyId:FAMILY},count:0},
  {name:'wrong status family',entry:'ga-nonconv-pre2013-set--official-pdf-fill',map:{familyId:FAMILY},status:{familyId:'other'},count:0},
  {name:'missing status family',entry:'ga-nonconv-pre2013-set--official-pdf-fill',map:{familyId:FAMILY},status:{},count:0},
  {name:'missing status',entry:'ga-nonconv-pre2013-set--official-pdf-fill',map:{familyId:FAMILY},status:null,count:0},
])check(`actual enumeration clause with synthetic discovery inputs: ${scenario.name}`,()=>{
  const overlays='data/rcap-all50/overlays/census-v1',root='/reviewer-virtual-root';
  const fakeFs={readdirSync:p=>p===path.join(root,overlays)?['ga']:[scenario.entry],statSync:()=>({isDirectory:()=>true}),existsSync:()=>false};
  const found=enumerate(fakeFs,path,root,overlays,p=>p.endsWith('/production-field-map.json')?scenario.map:scenario.status,'other/ky','other-ky','other/md','other-md');
  assert.equal(found.length,scenario.count);if(found.length)assert.equal(found[0].familyId,FAMILY);
  return {syntheticDiscoveryInputs:true,realAuditClaimed:false,selectedFamilies:found.length};
});
for(const entry of inventory)check(`installed facts, whole PDF and actual guideFor path match reviewed candidate: ${entry.fixture}`,()=>{
  const p=`${OUT}/${entry.path}`,b=read(p),expected=delta.wholePdfHashesMeasured.find(x=>x.fixture===entry.fixture);
  assert.ok(expected);assert.equal(sha(b),expected.sha256);assert.equal(b.length,expected.bytes);
  const fp=`${OUT}/fixtures/${entry.fixture}.facts.json`,facts=json(fp),old=oldMeasurements.wholePdfs.find(x=>x.file===entry.path);
  assert.equal(sha(read(fp)),old.factsSha256);
  const r=load(`reports/${entry.fixture}.json`),validated=validateGa(facts);
  assert.deepEqual(guideFor(validated),r.guide);
  assert.ok(r.guide.flatMap(p=>p.sections).some(([,body])=>body.includes(warning)));
  assert.deepEqual(validated.missing,r.missingParticipantFacts);
  assert.equal(r.readyToSubmit,false);
  return {wholePdfSha256:sha(b),unchangedFactsSha256:sha(read(fp)),guideForExecuted:true,packetRendererExecuted:false,
    requiredMissingFieldIds:validated.missing.map(x=>x.fieldId)};
});
check('both delivered text paths contain exact accepted warning and preserve caution qualifications',()=>{
  const texts=JSON.parse(execFileSync('python',['-c',
    "import pymupdf as fitz,json,pathlib; p=pathlib.Path('data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill'); print(json.dumps({str(x.name):fitz.open(x)[6].get_text() for x in sorted((p/'fixtures').glob('*.pdf'))}))"],{encoding:'utf8'}));
  const normalize=x=>x.replace(/\s/g,'');
  assert.equal(Object.keys(texts).length,15);
  for(const text of [...Object.values(texts),read(`${OUT}/participant-instructions.md`).toString()]){
    assert.ok(normalize(text).includes(normalize(warning)));
    assert.ok(normalize(text).includes(normalize('It does not settle federal or immigration disclosure duties.')));
    assert.ok(normalize(text).includes(normalize('not record destruction or separate court sealing')));
  }
  return {installedPdfPage7Texts:15,installedMarkdownGuides:1,rasterImagesGenerated:0};
});
const normalized=r=>({...r,id:r.fieldId,document:r.documentId,declared:{}});
const make=(changes={})=>createGaPre2013ActorVerifier({root:process.cwd(),directory:OUT,familyId:FAMILY,fieldMap:map,census,receipt,rendered:load('reports/rendered-artifacts.json'),...changes});
for(const id of ['agency.3','agency.4','prosecutor.2','prosecutor.9'])check(`exact official field refuses forged actor metadata: ${id}`,()=>{
  const field=normalized(map.refusals.find(r=>r.fieldId===id));
  const result=make()({...field,sourceActorEvidence:'Completed by Applicant'});
  assert.equal(result.verified,false);assert.match(result.failure,/field\/page\/actor declaration differs/);
  return {expectedOutcome:'rejected before pixel measurement'};
});
check('applicant arresting agency cannot borrow official protection',()=>{
  const field=normalized(map.writes.find(r=>r.fieldId==='case.arrestingAgency'));
  const forged={...field,owner:'arresting agency official',sourceActorEvidence:'SECTION TWO - ARREST INFORMATION (Completed by Arresting Agency)',refusalClass:'court_prosecutor_clerk_or_agency_owned'};
  assert.equal(make()(forged),null);
  const outcome=classifyBlank(forged,'Claimed official ownership',forged.refusalClass,{});
  assert.equal(outcome.disposition,'KNOWN_FACT_NOT_WRITTEN');
  return {officialAdapterExemption:false,actualClassifierDisposition:outcome.disposition};
});
check('same-family map cannot omit or write official-owned fields',()=>{
  const omitted=structuredClone(map);omitted.refusals=omitted.refusals.filter(r=>r.fieldId!=='agency.3');
  assert.ok(gaPre2013ActorInventoryProblems(FAMILY,omitted).some(r=>r.counter==='unclassifiedBlanks'&&r.field==='agency.3'));
  const forged=structuredClone(map),i=forged.refusals.findIndex(r=>r.fieldId==='prosecutor.9');
  forged.writes.push({...forged.refusals.splice(i,1)[0],value:'fabricated decision'});
  assert.ok(gaPre2013ActorInventoryProblems(FAMILY,forged).some(r=>r.counter==='protectedWrites'&&r.field==='prosecutor.9'));
  return {omissionRefused:true,officialDecisionWriteRefused:true};
});
for(const [name,mutate,expected]of [
  ['current date past pinned authority',f=>f.asOf='2026-09-08',/AUTHORITY_REVALIDATION_REQUIRED/],
  ['post-2013 arrest',f=>f.case.arrestDate='2013-07-01',/WRONG_POST_2013_PROCESS/],
  ['unknown participant route verification',f=>f.confirmations.selectedRouteVerified=null,/REQUIRED_ROUTE_CONFIRMATION/],
  ['invented prosecutor exception for unavailable record',f=>{f.case.dispositionOnGeorgiaHistory=false;f.case.officialDisposition='unavailable';},/SELF_HELP_STOP/],
])check(`actual validator preserves refusal: ${name}`,()=>{
  const f=load('fixtures/canonical.facts.json');mutate(f);assert.throws(()=>validateGa(f),expected);
  return {expectedOutcome:'rejected'};
});
const report={schemaVersion:'rcap-independent-delta-review/v1',reviewer:'/root/independent_md_review',verdict:'PASS',
  scope:'Installed Warning V2 identity and unchanged exact-source official-actor importer compatibility',
  authorReviewerSeparation:'Chat5 authored the renderer/warning; Captain Session07 authored the source-actor adapter. This separate reviewer installed exact reviewed bytes without editing either implementation and independently reviewed its current path.',
  independentCases:cases.length,cases,implementation:[identity(actor),identity(reader),identity('scripts/rcap-packet-recovery/chat5/ga-pre2013.mjs')],
  originalReview:identity('data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review/ga-independent-review-03.json'),
  originalDelta:identity('data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review/ga-warning-delta-04.json'),
  originalReviewer:'ChatGPT, GPT-6 Astra Pro, separate Chat4 review session',originalDeltaSession:'chat4-20260907-scale20-independent-04',
  original108PageReviewReused:true,originalDelta93UnchangedPagesReused:true,newVisualReviewClaimed:false,
  findingDispositions:[{id:'CHAT4-GA-01',status:'CLOSED_EXISTING_INDEPENDENT_DELTA_INSTALLED_EXACTLY'},
    {id:'CHAT4-GA-02',status:'CLOSED_CURRENT_STATIC_IMPORTER_AND_INDEPENDENT_CODE_REVIEW',
      limit:'Four exact source-owned fields only; no blanket applicant-agency exemption. The canonical52-field audit does not become an all-fixture or runtime intake count.'}],
  nativeDiscoveryDelta:'Independently closed: original exact-byte CLI refuses with exit2; current real CLI measures one family PASS_COMPLETE; wrong/no classification is refused. No approval-request invented.',
  remainingRequirements:['Root must publish exact files and consume current central/selected-output acceptance.',
    'Current-date route verification remains refused after2026-09-07; no runtime authority is inferred from old synthetic facts.',
    'Private participant SSN/signature and actual conditional disposition records remain required at their stated stages; no official decisions are supplied.',
    'Real ownership/current verification/entitlement/durable render/private artifact/delivery and production are outside this static review.'],
  terminalPromotionClaimed:false,productionChanged:false};
fs.writeFileSync(`${destination}/installed-warning-and-actors-review.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({verdict:report.verdict,independentCases:cases.length,report:`${destination}/installed-warning-and-actors-review.json`,sharedImplementationEdited:false},null,2));
