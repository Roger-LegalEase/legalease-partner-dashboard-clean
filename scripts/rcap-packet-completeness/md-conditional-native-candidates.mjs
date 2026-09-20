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
export const MD_CONDITIONAL_BINDING_SHA='bc9275d0a95334986245d34edddbeb4695468baf8b12432a02929442df287b8e';
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

export const PACKET_SET_MANIFEST='data/record-clearing/legal-design-packet-set-manifests.json';

/* WHAT THE PACKET CONTAINS IS THE MANIFEST'S QUESTION, AND NOTHING ASKED IT.
 *
 * requiredComponentsMissing reads in ONE direction only: from this family's own
 * field map and source receipt to the render. Both are build artifacts, so a
 * component the build invented and delivered is present on both sides of that
 * comparison and the counter reads zero. The packet-set manifest -- the only
 * record that is authoritative about what a packet contains -- is never opened
 * by it, so a delivered form that the manifest does not declare is measured by
 * nothing at all.
 *
 * Both Maryland conditional families deliver one: MDJ-008, "Notice Regarding
 * Restricted Information Pursuant to Rule 20-201.1", bound into every waiver
 * fixture with role restricted_information_notice. packetSets[].components for
 * md_10110_conviction-set and md_cannabis_petition-set declare two components
 * each -- the primary filing and CC-DC-089 -- and neither mentions it.
 *
 * This reconciles the two directions and refuses the harder one. A DECLARED
 * component no fixture delivers is a hard stop. A DELIVERED component the
 * manifest does not declare is a hard stop UNLESS this family's own committed
 * source receipt records the relationship, in which case it is published as a
 * finding against the manifest. That distinction is deliberate: whether MDJ-008
 * belongs in the manifest is a legal-design decision recorded as pending and
 * A-owned, and a verifier must not settle it by declaring the component itself.
 */
export function reconcileDeclaredComponentSet({root,familyId,receipt,fixtures,readFile}){
  const read=readFile??(p=>readInside(root,p));
  const bytes=read(PACKET_SET_MANIFEST);
  const manifest=JSON.parse(bytes);
  const entry=(manifest.packetSets??[]).find(p=>p.packetSetId===familyId);
  assert.ok(entry,`No packet-set manifest entry for ${familyId}; the manifest is authoritative about what a packet contains and it says nothing about this one`);
  const declared=(entry.components??[]).map(c=>c.officialFormId).filter(Boolean);
  assert.equal(new Set(declared).size,declared.length,'Duplicate declared component in the packet-set manifest');
  const delivered=[...new Set(fixtures.flatMap(f=>f.report.documents.map(d=>d.documentId)))];
  const declaredNotDelivered=sorted(declared.filter(id=>!delivered.includes(id)));
  const undeclaredDelivered=sorted(delivered.filter(id=>!declared.includes(id)));
  assert.equal(declaredNotDelivered.length,0,
    `Declared component never delivered by any fixture: ${declaredNotDelivered.join(', ')}`);
  const recorded=String(receipt.conditionalComponent??'');
  for(const id of undeclaredDelivered){
    assert.ok(recorded.includes(id),
      `Delivered component ${id} is declared by no packet-set manifest component and recorded by no conditional-component relationship in this family's source receipt; an undeclared form must stop the build rather than reach a participant`);
    assert.ok(receipt.sourceCatalog?.[id]?.sha256,`Delivered component ${id} is bound to no exact source`);
  }
  return {
    manifest:PACKET_SET_MANIFEST,
    manifestSha256:sha(bytes),
    declaredComponents:declared,
    deliveredComponents:sorted(delivered),
    declaredNotDelivered,
    undeclaredDelivered,
    findings:undeclaredDelivered.map(id=>({
      counter:null,
      component:id,
      role:[...new Set(fixtures.flatMap(f=>f.report.documents.filter(d=>d.documentId===id).map(d=>d.role)))].join(', ')||null,
      why:`${id} is delivered in ${fixtures.filter(f=>f.report.documents.some(d=>d.documentId===id)).length} of ${fixtures.length} fixture(s) and is declared by no component of ${familyId} in ${PACKET_SET_MANIFEST}. The manifest is authoritative about what a packet contains, so the packet and the manifest disagree.`,
      recordedRelationship:recorded||null,
      whatThisIsNot:'This is not requiredComponentsMissing. That counter compares this family\'s own field map and source receipt against the render and reads zero here, correctly: the component IS delivered. Nothing in the contract measures the manifest.',
      resolutionIsNotThisVerifiers:'Whether this component belongs in the packet-set manifest is a legal-design decision. This verifier records the disagreement and declares nothing.'
    }))
  };
}

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
  const componentSet=reconcileDeclaredComponentSet({root,familyId,receipt,fixtures,readFile});
  return {familyId,directory,config,fixtures,componentSet,filesMatched:measured.size,bindingSha256:MD_CONDITIONAL_BINDING_SHA};
}

export function auditMdConditionalCandidate({root,directory,familyId},auditPrepared){
  try{
    const loaded=loadMdConditionalCandidate({root,directory,familyId});
    const fixtureResults=loaded.fixtures.map(f=>{
      const raw=auditPrepared(f.inputs);assert.equal(raw.auditable,true);assert.equal(raw.sourceCurrentness,'EXACT');
      /* AN UNASKED QUESTION IS NOT A FAILED ANSWER, AND IT IS NOT A PASS.
       *
       * The binding pins PASS_COMPLETE for every prepared fixture. The
       * classifier returns NOT_MEASURABLE_HERE instead, and only ever over a
       * would-be pass: it is its LAST branch, reached when every counter it
       * could measure is zero, currentness is EXACT, and at least one counter
       * could not be measured at all. For these two families that counter is
       * visualDefects, null because no artifact record carries
       * nonWhitespaceGlyphsOutsideMeasuredWriteBoxes -- the geometry pass has
       * not run here, and running it is the visual gate's job, not this
       * adapter's.
       *
       * The old line read that as an unexpected outcome and threw, and the
       * catch below relabelled the throw as a missing packet component. Eight
       * measured counters were erased on the way and both families were refused
       * enrolment into the very gate that measures the ninth.
       *
       * So exactly one departure from the pinned expectation is tolerated, and
       * it is the one that concedes something rather than claiming it: a
       * fixture the binding expects to pass may instead report that a counter
       * could not be measured here. Every other outcome still throws.
       */
      const unmeasured=PASS_COUNTERS.filter(k=>raw.counters[k]===null);
      if(raw.result!==f.expectedRawResult){
        assert.ok(raw.result==='NOT_MEASURABLE_HERE'&&f.expectedRawResult==='PASS_COMPLETE'&&unmeasured.length>0,
          `Unexpected static outcome: ${f.fixture} returned ${raw.result} where the binding pins ${f.expectedRawResult}`);
      }
      assert.equal(raw.totals.terminalFields,f.fieldCount,'Selected source census was not exhaustive');
      if(f.prepared){assert.equal(f.checked.missing.length,0);assert.equal(f.checked.mayMarkBasis,true);
        assert.ok(raw.result==='PASS_COMPLETE'||raw.result==='NOT_MEASURABLE_HERE',`Prepared fixture is not complete: ${f.fixture}/${raw.result}`);
        for(const k of PASS_COUNTERS)assert.ok(raw.counters[k]===0||raw.counters[k]===null,`Nonzero prepared-fixture counter: ${f.fixture}/${k}=${raw.counters[k]}`);
        /* A null the classifier did not declare unmeasurable is a hole, not a
         * concession, and it is refused. */
        if(unmeasured.length)assert.equal(raw.result,'NOT_MEASURABLE_HERE',
          `Prepared fixture ${f.fixture} carries unmeasured counter(s) ${unmeasured.join(', ')} without the classifier saying so`);}
      else assert.ok(f.report.requiredBeforeFiling.length>0,'Diagnostic has no actual missing facts');
      return {...raw,fixture:f.fixture,pdfSha256:f.artifact.sha256,pageCount:f.artifact.pageCount,
        selectedComponentIds:[...f.selectedIds,'participant-instructions'],nativePreparationReady:f.prepared,
        expectedDiagnostic:!f.prepared,selectionPermitted:f.prepared,submissionReady:false,grantsDeliveryAuthority:false,
        missingInformation:f.report.requiredBeforeFiling,expectedRawResult:f.expectedRawResult};
    });
    const prepared=fixtureResults.filter(r=>r.nativePreparationReady),diagnostics=fixtureResults.filter(r=>r.expectedDiagnostic);
    /* A SUM OVER AN UNMEASURED VALUE IS NOT A NUMBER. Adding null as zero would
     * publish "no visual defects" for a family nobody looked at visually. If any
     * prepared fixture could not measure a counter, the family's reading of that
     * counter is null and stays null. */
    const counters=Object.fromEntries(PASS_COUNTERS.map(k=>[k,
      prepared.some(r=>r.counters[k]===null)?null:prepared.reduce((n,r)=>n+r.counters[k],0)]));
    const unmeasuredCounters=PASS_COUNTERS.filter(k=>counters[k]===null);
    /* The result is derived, never asserted. This returned PASS_COMPLETE as a
     * literal: had any assertion above ever been loosened, the row would have
     * carried a pass no counter supported. */
    const failingCounters=PASS_COUNTERS.filter(k=>Number(counters[k])>0);
    assert.equal(failingCounters.length,0,`Prepared-fixture counters aggregate nonzero: ${failingCounters.join(', ')}`);
    const result=unmeasuredCounters.length?'NOT_MEASURABLE_HERE':'PASS_COMPLETE';
    const total=(rows,k)=>rows.reduce((n,r)=>n+r.totals[k],0),blanksByDisposition={};
    for(const r of prepared)for(const[k,n]of Object.entries(r.totals.blanksByDisposition))blanksByDisposition[k]=(blanksByDisposition[k]??0)+n;
    return {familyId,directory,result,auditable:true,counters,
      totals:{terminalFields:total(prepared,'terminalFields'),written:total(prepared,'written'),blank:total(prepared,'blank'),blanksByDisposition,rowsInspected:total(prepared,'rowsInspected'),fieldMapSchema:'native-md-source-specific-conditional-fixtures'},
      allFixtureTotals:{terminalFields:total(fixtureResults,'terminalFields'),written:total(fixtureResults,'written'),blank:total(fixtureResults,'blank')},
      findings:[...loaded.componentSet.findings],findingsTruncated:0,fixtureResults,diagnosticResults:diagnostics,
      componentSetReconciliation:loaded.componentSet,
      unmeasuredCounters,
      unmeasuredHere:unmeasuredCounters.length?{
        counters:unmeasuredCounters,
        why:'No artifact write record for these fixtures carries nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, so the geometry pass has not run over these bytes.',
        measuredBy:'the central raster/visual gate, .github/workflows/rcap-packet-raster-acceptance-batch.yml',
        isNotZero:'These counters are null. Reading them as zero would publish a visual clearance nobody produced.'
      }:null,
      preparedFixtures:prepared.length,expectedDiagnosticFixtures:diagnostics.length,sourceCurrentness:'EXACT',
      staticCounterScope:'Counters cover all exact prepared fixture source fields, and a counter no prepared fixture could measure is published as null rather than summed as zero. All diagnostics are separately measured, with original raw counters/findings preserved and selection refused even when their raw static result is PASS_COMPLETE. requiredComponentsMissing compares this family\'s field map and source receipt against the render only; the packet-set manifest is reconciled separately in componentSetReconciliation and is measured by no counter in this contract.',
      reviewedInputFilesMatched:loaded.filesMatched,bindingSha256:loaded.bindingSha256,
      runtimeIntakeCounters:null,runtimeInstalled:false,centralRasterAdmission:false,terminalPromotions:0,packetRebuilds:0};
  }catch(error){return {familyId,directory,result:'FAIL_COMPONENT_SET',auditable:false,
    /* THIS IS A REFUSAL, NOT A COMPONENT READING.
     *
     * Any throw above lands here, and the row it writes is the only shape that
     * refuses this family downstream: the raster gate reads counters alone and
     * enrols on every nonvisual counter being zero or null, so a refusal that
     * published null counters would be enrolled rather than refused.
     * requiredComponentsMissing is carried here because it is the nonvisual
     * counter that blocks, and for no other reason. It is NOT a finding that a
     * declared component is undelivered, and a reader must not go looking for a
     * missing document -- the field below says so, and names the actual error.
     * Retiring this borrowed counter needs the enrolment rule to refuse an
     * unaudited family directly, which is a change to a shared generator and to
     * what a red row means across every family, not to these two. */
    auditRefused:true,
    counters:Object.fromEntries(PASS_COUNTERS.map(k=>[k,k==='requiredComponentsMissing'?1:null])),
    totals:{terminalFields:0,written:0,blank:0,blanksByDisposition:{},rowsInspected:0},
    findings:[{counter:'requiredComponentsMissing',component:null,
      whatThisIsNot:'Not a missing packet component. This adapter refused to audit and measured no component at all; the counter is borrowed to refuse the family downstream.',
      why:error.message}],findingsTruncated:0,
    runtimeIntakeCounters:null,runtimeInstalled:false,terminalPromotions:0};}
}
