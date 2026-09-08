/** Exact reviewed 072B/072D fixture adapters. Diagnostics remain unprepared.
 * No renderer, legal eligibility engine, participant authentication or grant.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateMdConviction,mdConvictionFieldMap} from '../rcap-packet-recovery/chat5/md-conviction.mjs';
import {validateMdCannabis,cannabisMap} from '../rcap-packet-recovery/chat5/md-cannabis.mjs';
import {PASS_COUNTERS} from './completeness-contract.mjs';

export const MD_CONDITIONAL_FAMILIES=Object.freeze(['md_10110_conviction-set','md_cannabis_petition-set']);
export const MD_CONDITIONAL_DIRECTORIES=Object.freeze({
  'md_10110_conviction-set':'data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill',
  'md_cannabis_petition-set':'data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill',
});
export const MD_CONDITIONAL_BINDING='scripts/rcap-packet-completeness/md-conditional-reviewed-inputs.json';
export const MD_CONDITIONAL_BINDING_SHA='39e93766154350cb030d06447e1052ee91604313e50dbb6f0a31842544e4b02d';
const sha=b=>createHash('sha256').update(b).digest('hex');
const methods={
  'md_10110_conviction-set':{validate:validateMdConviction,map:mdConvictionFieldMap},
  'md_cannabis_petition-set':{validate:validateMdCannabis,map:cannabisMap},
};
function readInside(root,relative){
  assert.ok(typeof relative==='string'&&!path.isAbsolute(relative)&&!relative.split(/[\\/]/).includes('..'),'Unsafe MD candidate path');
  const base=fs.realpathSync(root),file=path.resolve(base,relative);
  assert.ok(!fs.lstatSync(file).isSymbolicLink()&&fs.realpathSync(file).startsWith(base+path.sep),'MD candidate escaped checkout');
  return fs.readFileSync(file);
}
const sorted=xs=>[...xs].sort();
const fieldKey=r=>`${r.documentId}::${r.field}`;

/** Pure selected projection, after caller identity checks. Uses the existing
 * native map constructor; no generic field optionality or actor exemptions.
 */
export function prepareMdConditionalFixture({familyId,config,fixture,map,index,actual,receipt,report,facts,instructions}){
  assert.ok(methods[familyId],'Unknown MD conditional family');
  assert.equal(map.familyId,familyId);assert.deepEqual(map.routeKeys,[config.routeKey]);
  assert.equal(report.familyId,familyId);assert.equal(report.fixture,fixture.fixture);
  const checked=methods[familyId].validate(facts);
  assert.equal(facts.isSyntheticFixture,true,'Retained fixture is synthetic evidence only');
  assert.equal(facts.routeKey,config.routeKey);
  assert.equal(report.mayMarkBasis,checked.mayMarkBasis,'Native predicate/report recital mismatch');
  assert.equal(report.earliest,checked.earliest,'Native predicate/report chronology mismatch');
  assert.equal(report.allKnownFactsPrepared,report.requiredBeforeFiling.length===0,'Report readiness contradicts actual missing information');
  assert.equal(report.allKnownFactsPrepared,fixture.prepared,'Expected preparation outcome changed');
  assert.deepEqual(report.requiredBeforeFiling.map(r=>r.factId),fixture.missingFactIds,'Missing-fact diagnostic scope changed');
  assert.equal(report.signatureExecuted,false);assert.equal(report.judicialDecisionSupplied,false);
  const conditional=map.conditionalMaps[fixture.fixture];assert.ok(conditional,'Missing conditional source map');
  const rebuilt=methods[familyId].map(facts,report,map.sourceCensus);
  assert.deepEqual(conditional,rebuilt,'Stored conditional map differs from actual native constructor');
  const artifacts=index.pdfs.filter(r=>r.fixture===fixture.fixture);assert.equal(artifacts.length,1,'Duplicate/missing selected complete PDF');
  const artifact=artifacts[0];
  assert.deepEqual(index.artifacts.find(r=>r.fixture===fixture.fixture),artifact,'Inventories disagree');
  assert.equal(artifact.file,fixture.file);assert.equal(artifact.sha256,fixture.sha256);assert.equal(artifact.pageCount,fixture.pageCount);
  assert.equal(report.output.file,fixture.file);assert.equal(report.output.sha256,fixture.sha256);assert.equal(report.output.pageCount,fixture.pageCount);
  assert.equal(report.output.byteLength,artifact.byteLength);
  const selectedIds=facts.options.feeTreatment==='waiver'?[config.primaryDocument,'CC-DC-089','MDJ-008']:[config.primaryDocument];
  assert.deepEqual(report.documents.map(d=>d.documentId),selectedIds,'Selected component identity/order differs');
  assert.deepEqual(artifact.documents,report.documents,'Report/component inventory mismatch');
  const expectedPages=[];let page=1;
  for(const id of selectedIds){
    const source=receipt.sourceCatalog[id];assert.ok(source);
    const component=report.documents.find(d=>d.documentId===id);
    assert.equal(component.sourceSha256,source.sha256);assert.equal(component.pages,source.pages);
    for(let sourcePage=1;sourcePage<=source.pages;sourcePage++)expectedPages.push({packetPage:page++,documentId:id,sourcePage,sourceSha256:source.sha256,componentSha256:component.componentSha256});
  }
  while(page<=artifact.pageCount)expectedPages.push({packetPage:page++,documentId:'participant-instructions',role:'not_filed'});
  assert.deepEqual(report.pageManifest,expectedPages,'Missing, reordered or invented source/guide page');
  assert.deepEqual(artifact.pageManifest,expectedPages,'Whole output page inventory differs');
  const records=[...conditional.writes,...conditional.refusals];
  assert.equal(new Set(records.map(fieldKey)).size,records.length,'Duplicate source field in write/refusal partition');
  let fields=0;
  for(const id of selectedIds){
    const census=map.sourceCensus[id];assert.equal(census.length,config.expectedSourceCounts[id]);
    const expected=census.map(c=>`${id}::${c.field}`);
    assert.equal(new Set(expected).size,expected.length,'Duplicate source census field');
    assert.deepEqual(sorted(records.filter(r=>r.documentId===id).map(fieldKey)),sorted(expected),'Incomplete selected source-field census');
    fields+=census.length;
  }
  assert.equal(records.length,fields,'Unselected component fields are present');
  const selectedActual={...actual,documents:actual.documents.filter(d=>d.fixture===fixture.fixture),artifacts:actual.artifacts.filter(a=>a.fixture===fixture.fixture)};
  assert.ok(selectedActual.documents.length&&selectedActual.artifacts.length,'Selected actual appearance evidence missing');
  assert.equal(conditional.runtimeSelectable,false);
  return {fixture:fixture.fixture,prepared:fixture.prepared,expectedRawResult:fixture.expectedRawResult,
    facts,checked,report,artifact,selectedIds,fieldCount:fields,
    inputs:{fieldMap:conditional,census:null,approval:null,
      receipt:{...receipt,sources:receipt.sources.filter(s=>selectedIds.includes(s.documentId))},
      rendered:{...index,pdfs:[artifact],artifacts:[artifact]},actualWrites:selectedActual,instructions}};
}

/** Authenticate every retained source/code/map/fact/output/review before using
 * any compatibility proof. readFile is a static negative-test port, no authority.
 */
export function loadMdConditionalCandidate({root,familyId,directory=MD_CONDITIONAL_DIRECTORIES[familyId],readFile}={}){
  assert.ok(MD_CONDITIONAL_FAMILIES.includes(familyId),'Unknown MD conditional family');
  assert.equal(directory,MD_CONDITIONAL_DIRECTORIES[familyId],'Wrong MD native directory');
  const read=readFile??(p=>readInside(root,p));
  const bindingBytes=read(MD_CONDITIONAL_BINDING);assert.equal(sha(bindingBytes),MD_CONDITIONAL_BINDING_SHA,'MD candidate binding changed');
  const binding=JSON.parse(bindingBytes),config=binding.families[familyId];
  assert.equal(config.directory,directory);
  const measured=new Map();
  for(const member of binding.files){
    assert.ok(!measured.has(member.path),'Duplicate bound input');
    const data=read(member.path);assert.equal(data.length,member.bytes,`Bound MD input length changed: ${member.path}`);
    assert.equal(sha(data),member.sha256,`Bound MD input hash changed: ${member.path}`);measured.set(member.path,data);
  }
  const get=p=>{assert.ok(measured.has(p),`Unbound MD input: ${p}`);return JSON.parse(measured.get(p));};
  const map=get(`${directory}/production-field-map.json`),index=get(`${directory}/reports/rendered-artifacts.json`),
    receipt=get(`${directory}/source-receipt.json`),actual=get(`${directory}/reports/actual-writes.json`);
  assert.equal(receipt.allSourcesExact,true);
  assert.equal(receipt.familyId,familyId);assert.equal(index.familyId,familyId);
  assert.deepEqual(sorted(Object.keys(map.conditionalMaps)),sorted(config.fixtures.map(f=>f.fixture)),'Conditional family inventory changed');
  assert.deepEqual(sorted(index.pdfs.map(f=>f.fixture)),sorted(config.fixtures.map(f=>f.fixture)),'Complete PDF inventory changed');
  assert.equal(index.artifacts.length,index.pdfs.length);
  const actualPdfs=fs.readdirSync(path.join(root,directory,'fixtures'),{recursive:true})
    .filter(p=>String(p).endsWith('.pdf')).map(p=>`${directory}/fixtures/${String(p).split(path.sep).join('/')}`);
  assert.deepEqual(sorted(actualPdfs),sorted(config.fixtures.map(f=>f.file)),'Unlisted or missing current fixture PDF');
  for(const s of receipt.sources){
    assert.ok(measured.has(s.path),'Source is not bound');assert.equal(sha(measured.get(s.path)),s.sha256);assert.equal(measured.get(s.path).length,s.bytes);
    assert.deepEqual({...receipt.sourceCatalog[s.documentId],documentId:s.documentId},s,'Source catalog/receipt mismatch');
  }
  const fixtures=[];
  for(const fixture of config.fixtures){
    const report=get(`${directory}/reports/${fixture.fixture}.json`),facts=get(`${directory}/fixtures/${fixture.fixture}.facts.json`);
    assert.equal(report.inputPath,`fixtures/${fixture.fixture}.facts.json`);
    assert.equal(report.inputSha256,sha(measured.get(`${directory}/fixtures/${fixture.fixture}.facts.json`)),'Facts/report digest differs');
    assert.equal(sha(measured.get(fixture.file)),fixture.sha256,'Whole PDF differs');
    assert.equal(measured.get(fixture.file).length,report.output.byteLength);
    const instructionPath=`${directory}/instructions/${fixture.fixture}.md`;assert.ok(measured.has(instructionPath));
    fixtures.push(prepareMdConditionalFixture({familyId,config,fixture,map,index,actual,receipt,report,facts,instructions:measured.get(instructionPath).toString('utf8')}));
  }
  assert.equal(fixtures.filter(f=>f.prepared).length,config.positiveFixtures);
  assert.equal(fixtures.filter(f=>!f.prepared).length,config.diagnosticFixtures);
  return {familyId,directory,config,fixtures,filesMatched:measured.size,bindingSha256:MD_CONDITIONAL_BINDING_SHA};
}

export function auditMdConditionalCandidate({root,directory,familyId},auditPrepared){
  try{
    const loaded=loadMdConditionalCandidate({root,directory,familyId});
    const fixtureResults=loaded.fixtures.map(f=>{
      const raw=auditPrepared(f.inputs);assert.equal(raw.auditable,true);assert.equal(raw.sourceCurrentness,'EXACT');
      assert.equal(raw.result,f.expectedRawResult,`Unexpected static outcome: ${f.fixture}`);
      assert.equal(raw.totals.terminalFields,f.fieldCount,'Selected source census was not exhaustive');
      if(f.prepared){assert.equal(f.checked.missing.length,0);assert.equal(f.checked.mayMarkBasis,true);assert.equal(raw.result,'PASS_COMPLETE');
        for(const k of PASS_COUNTERS)assert.equal(raw.counters[k],0,`Nonzero or unmeasured prepared-fixture counter: ${f.fixture}/${k}`);}
      else assert.ok(f.report.requiredBeforeFiling.length>0,'Diagnostic has no actual missing facts');
      return {...raw,fixture:f.fixture,pdfSha256:f.artifact.sha256,pageCount:f.artifact.pageCount,
        selectedComponentIds:[...f.selectedIds,'participant-instructions'],nativePreparationReady:f.prepared,
        expectedDiagnostic:!f.prepared,selectionPermitted:f.prepared,submissionReady:false,grantsDeliveryAuthority:false,
        missingInformation:f.report.requiredBeforeFiling,expectedRawResult:f.expectedRawResult};
    });
    const prepared=fixtureResults.filter(r=>r.nativePreparationReady),diagnostics=fixtureResults.filter(r=>r.expectedDiagnostic);
    const counters=Object.fromEntries(PASS_COUNTERS.map(k=>[k,prepared.reduce((n,r)=>n+r.counters[k],0)]));
    const total=(rows,k)=>rows.reduce((n,r)=>n+r.totals[k],0),blanksByDisposition={};
    for(const r of prepared)for(const[k,n]of Object.entries(r.totals.blanksByDisposition))blanksByDisposition[k]=(blanksByDisposition[k]??0)+n;
    return {familyId,directory,result:'PASS_COMPLETE',auditable:true,counters,
      totals:{terminalFields:total(prepared,'terminalFields'),written:total(prepared,'written'),blank:total(prepared,'blank'),blanksByDisposition,rowsInspected:total(prepared,'rowsInspected'),fieldMapSchema:'native-md-source-specific-conditional-fixtures'},
      allFixtureTotals:{terminalFields:total(fixtureResults,'terminalFields'),written:total(fixtureResults,'written'),blank:total(fixtureResults,'blank')},
      findings:[],findingsTruncated:0,fixtureResults,diagnosticResults:diagnostics,
      preparedFixtures:prepared.length,expectedDiagnosticFixtures:diagnostics.length,sourceCurrentness:'EXACT',
      staticCounterScope:'Counters cover all exact prepared fixture source fields. All diagnostics are separately measured, with original raw counters/findings preserved and selection refused even when their raw static result is PASS_COMPLETE.',
      reviewedInputFilesMatched:loaded.filesMatched,bindingSha256:loaded.bindingSha256,
      runtimeIntakeCounters:null,runtimeInstalled:false,centralRasterAdmission:false,terminalPromotions:0,packetRebuilds:0};
  }catch(error){return {familyId,directory,result:'FAIL_COMPONENT_SET',auditable:false,
    counters:Object.fromEntries(PASS_COUNTERS.map(k=>[k,k==='requiredComponentsMissing'?1:null])),
    totals:{terminalFields:0,written:0,blank:0,blanksByDisposition:{},rowsInspected:0},
    findings:[{counter:'requiredComponentsMissing',why:error.message}],findingsTruncated:0,
    runtimeIntakeCounters:null,runtimeInstalled:false,terminalPromotions:0};}
}
