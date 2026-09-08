import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import {FAMILY, OUTPUT, SOURCE, SOURCE_SHA256, fixtureFacts, validateFacts} from '../chat8/ia-901c2.mjs';

export const IA_FORM1_FAMILY = FAMILY;
export const IA_FORM1_DIRECTORY = OUTPUT;
export const IA_FORM1_ROUTE = 'obligation:track-pathway:IA:ia-901c2:nonconviction-901c2';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/ia-form1-closure';
const GUARD = `${EVIDENCE}/exact-candidate-install.json`;
const GUARD_SHA = 'f8753bb4e7cd73ba142734fbee93469831e3055550bdda60fb3b7e0517a42de7';
const REVIEW = `${EVIDENCE}/ia-form1-native-v2-review-return.json`;
const REVIEW_SHA = '23418170b83cac3768ea3ee6bc4f6097a3da8ef595e2deb8ba9b3990ee7bc456';
const SOURCE_REVIEW = `${EVIDENCE}/source-rule-fee-independent-delta.json`;
const SOURCE_REVIEW_SHA = '9ffea3327d65e6ff82d5951090cdf16a4025be5d61ff7491b745dac563ee1ef0';
const SELF = 'scripts/rcap-packet-recovery/chat1/ia-form1-expected-candidates.mjs';
const FIXTURES = Object.freeze(['canonical','boundary','good-cause-waiver','exact-day-180','missing-contact']);
const SUPPORTED = Object.freeze(FIXTURES.slice(0,3));
const DIAGNOSTIC = Object.freeze(FIXTURES.slice(3));
const DAY180_FIELDS = Object.freeze(['exact-day-180:2.86-1.03.00','exact-day-180:2.86-1.03.AB']);
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const canonicalJson = value => value && typeof value === 'object' ? Array.isArray(value)
  ? value.map(canonicalJson) : Object.fromEntries(Object.keys(value).sort().map(key => [key,canonicalJson(value[key])])) : value;
const factsSha = facts => sha(Buffer.from(JSON.stringify(canonicalJson(facts))));
const at = (facts,key) => key.split('.').reduce((value,part) => value?.[part],facts);
const flatten = (value,prefix='',result={}) => {
  for(const [key,item] of Object.entries(value)) {
    const name=prefix ? `${prefix}.${key}` : key;
    if(item!==null && typeof item==='object' && !Array.isArray(item)) flatten(item,name,result); else result[name]=item;
  }
  return result;
};
function readSafe(relative) {
  assert(typeof relative==='string' && !path.isAbsolute(relative) && !relative.includes('\\') && !relative.split('/').some(part=>['','..','.'].includes(part)), 'Unsafe Iowa input path');
  let current=ROOT;
  for(const part of relative.split('/')) {current=path.join(current,part);assert(!fs.lstatSync(current).isSymbolicLink(),'Iowa input custody includes a symlink');}
  assert(fs.realpathSync(current).startsWith(`${fs.realpathSync(ROOT)}${path.sep}`),'Iowa input escaped checkout');
  return fs.readFileSync(current);
}
function exactFamily(family) {
  assert.equal(family.familyId,FAMILY);assert.equal(family.directory,OUTPUT);
  if(family.routeKeys) assert.deepEqual(family.routeKeys,[IA_FORM1_ROUTE],'Iowa route scope changed');
}
function loadCandidate(family,options={}) {
  exactFamily(family);
  const read=options.readFile??readSafe;
  const pinned=(file,digest)=>{const bytes=read(file);assert.equal(sha(bytes),digest,`Iowa review identity changed: ${file}`);return JSON.parse(bytes);};
  const guard=pinned(GUARD,GUARD_SHA), review=pinned(REVIEW,REVIEW_SHA), sourceReview=pinned(SOURCE_REVIEW,SOURCE_REVIEW_SHA);
  assert.equal(guard.files.length,65);assert.equal(review.rows[0].familyId,FAMILY);
  assert.deepEqual(review.rows[0].unmeasuredObligations,['SOURCE_IDENTITY','FEE_AND_WAIVER']);
  assert.equal(sourceReview.verdict,'PASS_SOURCE_RULE_FEE_DELTA');
  const bytes=new Map();
  for(const item of guard.files) {
    assert(!bytes.has(item.path));const data=read(item.path);
    assert.equal(data.length,item.bytes,`Iowa candidate length changed: ${item.path}`);
    assert.equal(sha(data),item.sha256,`Iowa candidate hash changed: ${item.path}`);bytes.set(item.path,data);
  }
  const get=file=>{assert(bytes.has(file),`Iowa unbound candidate input: ${file}`);return bytes.get(file);};
  const json=file=>JSON.parse(get(file));
  // The published delta establishes exactly this legal/source scope. Its
  // source byte identities remain checked, separate from packet byte custody.
  for(const item of [sourceReview.sourceIdentity.sourceApplicability,
    sourceReview.closedFindings[0].rulesPublication,
    sourceReview.closedFindings[1].primaryFeeSource,sourceReview.closedFindings[1].practiceSource]) {
    const file=item.currentIssuerPath??item.chapterPath??item.path;
    const digest=item.currentIssuerSha256??item.chapterSha256??item.sha256;
    assert.equal(sha(read(file)),digest,'Iowa measured legal/source bytes changed');
  }
  assert.equal(sha(get(SOURCE)),SOURCE_SHA256);
  const inputs=Object.fromEntries(Object.entries({fieldMap:'production-field-map.json',actualWrites:'reports/actual-writes.json',rendered:'reports/rendered-artifacts.json',receipt:'source-receipt.json',census:'field-census.census-v1.json',approval:'approval-request.json'}).map(([key,file])=>[key,json(`${OUTPUT}/${file}`)]));
  inputs.instructions=get(`${OUTPUT}/participant-instructions.md`).toString();
  if(options.report!==undefined) assert.deepEqual(options.report,inputs.rendered,'Iowa supplied inventory differs from reviewed bytes');
  assert.equal(inputs.receipt.documents.length,5);
  for(const item of inputs.receipt.documents) assert.equal(sha(get(item.path)),item.sha256);
  return {get,json,inputs,review,sourceReview};
}
function partition(inputs,fixtures) {
  const wanted=new Set(fixtures), p=structuredClone(inputs);
  for(const key of ['writes','refusals']) p.fieldMap[key]=p.fieldMap[key].filter(item=>wanted.has(item.fixture));
  p.fieldMap.availableFacts=Object.fromEntries(Object.entries(p.fieldMap.availableFacts).filter(([key])=>wanted.has(key.split(':')[0])));
  p.fieldMap.nativeInputBindings.inputs=p.fieldMap.nativeInputBindings.inputs.filter(item=>wanted.has(item.fixture));
  for(const key of ['artifacts','documents']) p.actualWrites[key]=p.actualWrites[key].filter(item=>wanted.has(item.fixture));
  for(const key of ['fixtures','packets']) p.rendered[key]=p.rendered[key].filter(item=>wanted.has(typeof item==='string'?item:item.fixture));
  p.receipt.documents=p.receipt.documents.filter(item=>wanted.has(item.formNumber.split('/')[0]));
  p.census.documents=p.census.documents.filter(item=>wanted.has(item.formNumber.split('/')[0]));
  return p;
}
function matrixOf(candidate) {
  const c=candidate, ready=c.json(`${OUTPUT}/reports/packet-level-readiness.json`), native=c.json(`${OUTPUT}/reports/fixture-input-facts.json`);
  const originalFacts=fixtureFacts(), report=c.inputs.rendered, expected=c.review.wholePdfsMeasured;
  for(const rows of [report.fixtures,report.packets,ready.fixtures,native.inputs]) assert.deepEqual(rows.map(item=>item.fixture),FIXTURES,'Iowa fixture inventory changed');
  assert.equal(ready.filingReady,false);assert.equal(ready.diagnosticsAreNotPositiveFixtures,true);assert.equal(native.bindings.length,73);
  const sections=[...c.inputs.instructions.matchAll(/^## ([^\n]+)\n/gm)];
  assert.deepEqual(sections.map(match=>match[1]),FIXTURES,'Iowa delivered guide section inventory changed');
  const fixtures=report.fixtures.map((artifact,index)=>{
    const fixture=artifact.fixture, inputFile=`${OUTPUT}/fixtures/${fixture}.json`, facts=c.json(inputFile), validated=validateFacts(facts);
    assert.equal(facts.synthetic,true);assert.deepEqual(facts,originalFacts[fixture],'Iowa actual invoking fixture changed');
    const actualInput=native.inputs[index];assert.equal(actualInput.inputPath,inputFile);assert.equal(actualInput.sha256,sha(c.get(inputFile)));
    const flattenedFacts=flatten(facts);
    for(const key of ['name','address','city','state','zip']) if(facts.countyAttorney===null) flattenedFacts[`countyAttorney.${key}`]=null;
    assert.deepEqual(actualInput.facts,flattenedFacts,'Iowa actual facts and native independent availability differ');
    const available=Object.fromEntries(Object.entries(c.inputs.fieldMap.availableFacts).filter(([key])=>key.startsWith(`${fixture}:`)).map(([key,value])=>[key.slice(fixture.length+1),value]));
    assert.deepEqual(available,actualInput.facts,'Iowa map fact availability differs from the actual input');
    for(const binding of native.bindings.filter(item=>item.fixture===fixture)) {
      assert.equal(binding.inputSnapshotSha256,actualInput.sha256);
      assert.equal(binding.value,at(facts,binding.factId.slice(fixture.length+1))??null);
      assert.equal(binding.available,binding.value!==null && binding.value!==undefined && String(binding.value).trim()!=='');
    }
    const state=ready.fixtures[index];assert.equal(state.inputSnapshotSha256,actualInput.sha256);assert.equal(state.filingReady,false);
    assert.equal(state.classification,DIAGNOSTIC.includes(fixture)?'DIAGNOSTIC_NOT_FILING_POSITIVE':'SUPPORTED_UNEXECUTED_DRAFT');
    assert.equal(state.sourceWordingConflict,validated.timingFormMismatch);
    if(fixture==='exact-day-180') {assert.equal(validated.daysSinceDisposition,180);assert.equal(facts.requestsWaiverOf180Days,false);assert.deepEqual(state.uncompletedSourceAreas,DAY180_FIELDS.map(field=>field.split(':')[1]));}
    if(fixture==='missing-contact') {
      assert.equal(state.missingParticipantControlAreas,12);assert.equal(state.missingParticipantFacts,11);assert.equal(state.unknownFactIds.length,11);
      for(const key of state.unknownFactIds) assert.equal(at(facts,key.slice(fixture.length+1))??null,null);
      const missing=c.inputs.fieldMap.refusals.filter(row=>row.fixture===fixture && row.completenessDisposition==='REQUIRED_BEFORE_FILING');assert.equal(missing.length,12);
      assert.deepEqual([...new Set(missing.map(row=>row.factId))].sort(),[...state.unknownFactIds].sort());
    } else assert.equal(state.missingParticipantFacts,0);
    const packet=report.packets[index], file=`${OUTPUT}/${artifact.path}`, prior=expected.find(item=>item.fixture===fixture);
    assert.equal(packet.path,file);assert.equal(packet.sha256,artifact.sha256);assert.equal(packet.pageCount,artifact.pageCount);
    assert.equal(sha(c.get(file)),artifact.sha256);assert.equal(c.get(file).length,artifact.bytes);
    assert.equal(prior.sha256,artifact.sha256);assert.equal(prior.pages,artifact.pageCount);
    const componentIds=['application-with-embedded-service',...(facts.requestsWaiverOf180Days?['participant-good-cause-statement']:[]),'participant-instructions'];
    assert.deepEqual(artifact.components.map(item=>item.id),componentIds);let nextPage=1;
    const components=artifact.components.map((component,i)=>{
      assert.equal(component.firstPacketPage,nextPage);assert.equal(component.lastPacketPage,component.firstPacketPage+component.pages-1);nextPage+=component.pages;
      const componentFile=`${OUTPUT}/components/${fixture}/${component.id}.pdf`;assert.equal(sha(c.get(componentFile)),component.sha256);
      assert.equal(component.fileWithCourt,component.id!=='participant-instructions');
      assert.deepEqual(Object.fromEntries(Object.entries(packet.documents[i]).filter(([key])=>key!=='documentId')),component);
      return {...component,file:componentFile,byteLength:c.get(componentFile).length};
    });
    assert.equal(nextPage-1,artifact.pageCount);assert.equal(components[0].pages,3);
    const start=sections[index].index,end=sections[index+1]?.index??c.inputs.instructions.length;
    const text=c.inputs.instructions.slice(start,end);
    assert(text.includes('University of Iowa Student Legal Services states there is no fee'));
    if(fixture==='exact-day-180') assert(text.includes('Items 3 and 3.A remain blank'));
    const guide=components.find(item=>item.id==='participant-instructions');
    return {fixture,routeKey:IA_FORM1_ROUTE,file,sha256:artifact.sha256,byteLength:artifact.bytes,pageCount:artifact.pageCount,components,
      input:{file:inputFile,sha256:actualInput.sha256,factSnapshotSha256:factsSha(facts)},
      selection:{outcome:facts.outcome,filingMethod:facts.filingMethod,daysSinceDisposition:validated.daysSinceDisposition,waiverRequested:facts.requestsWaiverOf180Days,waiverAuthorship:facts.narrativeAuthorship,waiverGranted:false},
      guide:{file:guide.file,sha256:guide.sha256,pageCount:guide.pages,markdownFile:`${OUTPUT}/participant-instructions.md`,markdownSha256:sha(c.get(`${OUTPUT}/participant-instructions.md`)),section:{heading:`## ${fixture}`,start,end,sha256:sha(Buffer.from(text))}},
      expectedOutcome:state.classification,readiness:state,diagnostic:DIAGNOSTIC.includes(fixture),
      syntheticFixture:true,filingPositive:false,filingPermitted:false,participantExecutionCompleted:false,grantsEligibility:false,grantsDeliveryAuthority:false,paymentEligible:false,sponsorshipEligible:false};
  });
  return {familyId:FAMILY,directory:OUTPUT,routeKeys:[IA_FORM1_ROUTE],source:{file:SOURCE,sha256:SOURCE_SHA256},
    sourceReview:{file:SOURCE_REVIEW,sha256:SOURCE_REVIEW_SHA},originalIndependentReview:{file:REVIEW,sha256:REVIEW_SHA,attribution:c.review.reviewer},
    candidateGuard:{file:GUARD,sha256:GUARD_SHA,files:65},outputInventory:{file:`${OUTPUT}/reports/rendered-artifacts.json`,sha256:sha(c.get(`${OUTPUT}/reports/rendered-artifacts.json`)),documents:5,pages:26},
    supportedFixtures:[...SUPPORTED],diagnosticFixtures:[...DIAGNOSTIC],fixtures};
}
export function iaForm1CandidateMatrix(family,options={}) {return matrixOf(loadCandidate(family,options));}

const assertPass = result => {assert.equal(result.result,'PASS_COMPLETE','Iowa supported/importable partition failed');assert(Object.values(result.counters).every(value=>value===0),'Iowa measured partition has a regression');};
function assertDay180(result) {
  assert.equal(result.result,'FAIL_ROUTE_SELECTION','Expected Iowa day180 refusal was lost');
  assert.equal(result.counters.requiredOptionsMissing,2);
  for(const [key,value] of Object.entries(result.counters)) if(key!=='requiredOptionsMissing') assert.equal(value,0,`Iowa diagnostic has unrelated ${key} failure`);
  assert.equal(result.findings.length,2);assert.deepEqual(result.findings.map(item=>item.field).sort(),[...DAY180_FIELDS].sort());
  assert(result.findings.every(item=>item.counter==='requiredOptionsMissing' && item.disposition==='ROUTE_OPTION_NOT_SELECTED'));
}
/** auditInputs is the shared host's actual auditPreparedInputs invocation.
 * Every returned counter is measured on a named partition. The original
 * aggregate refusal remains explicit; neither diagnostic is a filing positive. */
export function auditIaForm1ExpectedOutcomes(context,auditInputs,options={}) {
  exactFamily(context);assert.equal(typeof auditInputs,'function');
  const c=loadCandidate(context,options), matrix=matrixOf(c);
  const aggregate=auditInputs(structuredClone(c.inputs));assertDay180(aggregate);assert.equal(aggregate.totals.terminalFields,285);
  const perFixture=matrix.fixtures.map(item=>{
    const result=auditInputs(partition(c.inputs,[item.fixture]));assert.equal(result.totals.terminalFields,57);
    if(item.fixture==='exact-day-180') assertDay180(result);else assertPass(result);
    return {fixture:item.fixture,expectedOutcome:item.expectedOutcome,filingPositive:false,filingPermitted:false,readiness:item.readiness,result};
  });
  const supported=auditInputs(partition(c.inputs,SUPPORTED));assertPass(supported);assert.equal(supported.totals.terminalFields,171);
  assert.equal(supported.totals.written,74);assert.equal(supported.totals.blank,97);
  return {...supported,counterScope:'Measured three supported unexecuted drafts; all five reviewed output identities and both diagnostic outcomes also required.',
    expectedOutcomeAccounting:{schemaVersion:'rcap-expected-fixture-outcomes/v1',allDeclaredFixturesAccountedFor:true,sourceAreasAcrossAllFixtures:285,
      supportedFixtures:[...SUPPORTED],diagnosticFixtures:[...DIAGNOSTIC],rawAggregate:aggregate,fixtures:perFixture,
      expectedDay180RefusalPreserved:true,missingContactsRemainUnknown:true,allFilingReadyFlagsFalse:true,candidateGuard:matrix.candidateGuard,
      authorityCreated:'none',runtimeInstalled:false},candidateMatrix:matrix};
}
function declaredOnly(record,family) {
  exactFamily(family);assert.equal(record.family,FAMILY);assert.equal(record.status,'DECLARED_NOT_INSTALLED');assert.equal(record.authorityCreated,'none');
  assert.equal(record.currentState.generationAllowed,false);assert.notEqual(record.currentState.runtimeSelectable,true);assert.notEqual(record.runtimeInstalled,true);
  assert.notEqual(record.binding.runtimeInstalled,true);assert.notEqual(record.binding.generationAllowed,true);assert.equal(record.binding.paymentEligible,false);assert.equal(record.binding.sponsorshipEligible,false);
  assert.deepEqual(record.routeKeys,[IA_FORM1_ROUTE]);assert.deepEqual(record.binding.routeKeys,[IA_FORM1_ROUTE]);
}
export function bindDeclaredIaForm1Delivery(record,family,options={}) {
  if(family.familyId!==FAMILY)return record;declaredOnly(record,family);
  const matrix=iaForm1CandidateMatrix(family,options),result=structuredClone(record);
  result.runtimeInstalled=false;result.currentState.runtimeSelectable=false;
  Object.assign(result.binding,{runtimeInstalled:false,generationAllowed:false,filingPermitted:false,acceptanceReceipt:null,
    packetComponents:['application-with-embedded-service','participant-good-cause-statement','participant-instructions'],
    componentConditions:{'participant-good-cause-statement':'Only the actual participant-authored waiting-period-waiver branch. This is not a fee waiver or a court grant.'},
    conditionalDelivery:{...matrix,fixtureBindings:matrix.fixtures,explicitSelectionRequired:true,defaultBranch:null,selectionContract:`${SELF}#selectDeclaredIaForm1Fixture`,
      diagnosticDeliveryPurposeRequired:'diagnostic-preview',runtimeInstalled:false,authorityCreated:'none'}});
  delete result.binding.conditionalDelivery.fixtures;
  Object.assign(result.proposedRepresentation,{runtimeSelectable:false,generationAllowed:false,defaultComponentId:null,fixtureBindings:matrix.fixtures,
    components:matrix.fixtures.map((item,index)=>({componentId:`${FAMILY}:${item.fixture}`,order:index+1,documentId:item.fixture,role:item.diagnostic?'diagnostic_preview_only':'conditional_unexecuted_packet',file:item.file,sha256:item.sha256,requirement:'conditional',routeKey:IA_FORM1_ROUTE,selectedBy:item.fixture,componentsIncluded:item.components.map(component=>component.id),guide:item.guide,filingPositive:false,grantsDeliveryAuthority:false})),
    note:'Exact retained synthetic drafts only. A diagnostic requires explicit diagnostic-preview selection. Real participant execution, current verification, entitlement and private delivery remain separate.'});
  // Central provenance is authenticated/admitted by the existing central/L6
  // caller. This exact-coverage comparison cannot authenticate a receipt.
  if(options.raster) {
    const raster=options.raster,pass=raster.rasterReceipt;assert.equal(raster.familyId,FAMILY);assert.equal(pass?.verdict,'RASTER_PASS');
    assert.equal(pass.coversTheWholeFamily,true);assert.equal(pass.documentsMeasured,5);assert.equal(pass.pagesMeasured,26);assert.deepEqual(pass.documentsNotCovered,[]);
    assert.deepEqual([...pass.documentsCovered].sort(),FIXTURES.map(fixture=>`${fixture}.pdf`).sort());assert.equal(raster.documents.length,5);
    for(const item of matrix.fixtures) {const matches=raster.documents.filter(document=>document.path===item.file);assert.equal(matches.length,1);assert.equal(matches[0].sha256,item.sha256);assert.equal(matches[0].pageCount,item.pageCount);}
    assert.equal(pass.boundToCanonicalSha256,matrix.fixtures[0].sha256);assert.equal(pass.boundToBoundarySha256,matrix.fixtures[1].sha256);
    result.binding.acceptanceReceipt={verdict:pass.verdict,workflowRunId:pass.workflowRunId,jobId:pass.jobId,artifactId:pass.receiptArtifact?.id??null,verdictPath:pass.verdictPath,
      boundToCanonicalSha256:pass.boundToCanonicalSha256,boundToBoundarySha256:pass.boundToBoundarySha256,coversTheWholeFamily:true,documentsMeasured:5,pagesMeasured:26,documentsCovered:[...pass.documentsCovered],documentsDigest:pass.documentsDigest};
  }
  return result;
}
export function createDeclaredIaForm1Delivery(family,binding,options={}) {
  if(family.familyId!==FAMILY)return null;
  return bindDeclaredIaForm1Delivery({schemaVersion:'rcap-census-v1-product-wiring/v1',family:FAMILY,routeKey:IA_FORM1_ROUTE,routeKeys:[IA_FORM1_ROUTE],workType:'PRODUCT_WIRING_REQUIRED',status:'DECLARED_NOT_INSTALLED',authorityCreated:'none',generatedBy:'scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs',derivedFrom:`${OUTPUT}/reports/rendered-artifacts.json`,
    explicitNonGrants:['No live route, entitlement, fulfillment, payment, sponsorship, generation or delivery authority created.'],
    currentState:{serviceDisposition:'missing_from_compiled_runtime',commercialState:'NO_ROUTE_LEVEL_GRADE_A_AUTHORITY_FROM_TRACK_MEMBERSHIP',existingArtifactIds:[],generationAllowed:false},binding,
    proposedRepresentation:{packetSetId:FAMILY,outputStrategy:family.implementationStrategy,components:[]}},family,options);
}
export function selectDeclaredIaForm1Fixture(record,input,fixture,options={}) {
  const family={familyId:FAMILY,directory:OUTPUT,routeKeys:[IA_FORM1_ROUTE]};declaredOnly(record,family);assert.equal(input?.synthetic,true,'PARTICIPANT_RENDER_REQUIRED');validateFacts(input);
  const rebound=bindDeclaredIaForm1Delivery(record,family,options);assert.deepEqual(record.binding.conditionalDelivery,rebound.binding.conditionalDelivery,'Iowa declared candidate binding is stale');
  const item=rebound.binding.conditionalDelivery.fixtureBindings.find(row=>row.fixture===fixture);assert(item,'EXPLICIT_SUPPORTED_FIXTURE_REQUIRED');
  assert.equal(factsSha(input),item.input.factSnapshotSha256,'FIXTURE_INPUT_MISMATCH_PARTICIPANT_RENDER_REQUIRED');
  if(item.diagnostic)assert.equal(options.deliveryPurpose,'diagnostic-preview','DIAGNOSTIC_NOT_FILING_POSITIVE');
  const markdown=(options.readFile??readSafe)(item.guide.markdownFile).toString().slice(item.guide.section.start,item.guide.section.end);
  assert.equal(sha(Buffer.from(markdown)),item.guide.section.sha256);
  return {...structuredClone(item),guideMarkdown:markdown,runtimeInstalled:false};
}
export async function resolveIaForm1RasterEnrollment(family,options={}) {
  if(family.familyId!==FAMILY)return null;
  const matrix=iaForm1CandidateMatrix(family,options),read=options.readFile??readSafe,documents=[];
  for(const item of matrix.fixtures) {
    const pages=(await PDFDocument.load(read(item.file),{updateMetadata:false})).getPageCount();assert.equal(pages,item.pageCount);
    documents.push({role:item.fixture==='boundary'?'boundary':'canonical',name:`${item.fixture}.pdf`,path:item.file,sha256:item.sha256,pageCount:pages,
      conditionalPacketBranch:item.fixture,expectedOutcome:item.expectedOutcome,diagnostic:item.diagnostic,filingPositive:false,
      pageCountEvidence:{method:'pdf-lib',version:'1.17.1',pageCount:pages,sourceSha256:item.sha256},pageCountBasis:'Parsed exact retained complete PDF; enrollment is not a rendered verdict.'});
  }
  documents.sort((a,b)=>(a.role==='canonical'?0:1)-(b.role==='canonical'?0:1)||a.name.localeCompare(b.name,'en'));
  const names=documents.map(item=>item.name);
  return {root:path.join(ROOT,OUTPUT,'fixtures'),pdfs:names,basis:'All five exact reviewed Iowa outputs, including two explicitly non-filing diagnostics.',
    canonical:{name:'canonical.pdf',basis:'Exact independently reviewed primary complete output',why:null},boundary:{name:'boundary.pdf',basis:'Exact independently reviewed 181-day eFile boundary',why:null},documents,
    documentsDigest:sha(Buffer.from(JSON.stringify(documents.map(item=>[item.role,item.path,item.sha256])))),
    coverage:{documents:names,rastered:names,notRastered:[],notRenderedByThisGate:[],complete:true,basis:'Requested whole-family coverage; no completed central render asserted.',whatCompleteMeansHere:'All five retained complete PDFs are requested, while diagnostic outputs remain excluded from filing-positive delivery.'}};
}
