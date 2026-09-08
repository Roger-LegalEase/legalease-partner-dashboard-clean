import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {loadMdConditionalCandidate,MD_CONDITIONAL_FAMILIES,MD_CONDITIONAL_DIRECTORIES,
  MD_CONDITIONAL_BINDING,MD_CONDITIONAL_BINDING_SHA} from '../rcap-packet-completeness/md-conditional-native-candidates.mjs';

export {MD_CONDITIONAL_FAMILIES,MD_CONDITIONAL_DIRECTORIES};
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const serialized=input=>Buffer.from(JSON.stringify(input,null,2)+'\n');
function declaredOnly(record){
  assert.ok(MD_CONDITIONAL_FAMILIES.includes(record.family),'Unknown MD conditional family');
  assert.equal(record.status,'DECLARED_NOT_INSTALLED');assert.equal(record.authorityCreated,'none');
  assert.equal(record.currentState.generationAllowed,false);assert.notEqual(record.currentState.runtimeSelectable,true);
  assert.notEqual(record.runtimeInstalled,true);assert.equal(record.binding.paymentEligible,false);assert.equal(record.binding.sponsorshipEligible,false);
}

/** Exact synthetic evidence only. Ordinary paid packets never acquire waiver
 * forms; a waiver request includes all three089 pages and MDJ008. Diagnostics
 * cannot become selection choices by having a zero static contact counter.
 */
export function bindDeclaredMdConditionalDelivery(record,family,options={}){
  if(!MD_CONDITIONAL_FAMILIES.includes(family.familyId))return record;
  declaredOnly(record);assert.equal(record.family,family.familyId);
  const loaded=loadMdConditionalCandidate({root:options.root??ROOT,familyId:family.familyId,directory:family.directory,readFile:options.readFile});
  const {config}=loaded;
  for(const routes of [family.routeKeys,record.routeKeys,record.binding.routeKeys])assert.deepEqual(routes,[config.routeKey]);
  if(options.report!==undefined)assert.deepEqual(options.report.pdfs.map(x=>({fixture:x.fixture,sha256:x.sha256})),loaded.fixtures.map(f=>({fixture:f.fixture,sha256:f.artifact.sha256})),'Supplied output inventory differs');
  const fixtureBindings=[],diagnostics=[];
  for(const f of loaded.fixtures){
    const value={fixture:f.fixture,file:f.artifact.file,sha256:f.artifact.sha256,byteLength:f.artifact.byteLength,pageCount:f.artifact.pageCount,
      components:[...f.selectedIds,'participant-instructions'],pageManifest:structuredClone(f.report.pageManifest),
      input:{file:`${family.directory}/fixtures/${f.fixture}.facts.json`,sha256:f.report.inputSha256},
      instructions:{file:`${family.directory}/instructions/${f.fixture}.md`,sha256:sha(Buffer.from(f.inputs.instructions))},
      selection:{basis:f.facts.case.basis,feeTreatment:f.facts.options.feeTreatment,courtLevel:f.facts.court.level,
        transfer:f.facts.court.transfer,appealed:f.facts.court.appealed,event:f.facts.case.event,finalOpenCostsRequested:f.facts.options.finalOpenCostsRequested??false},
      sourceFieldAccounting:{total:f.fieldCount,written:f.inputs.fieldMap.writes.length,blank:f.inputs.fieldMap.refusals.length},
      nativePreparationReady:f.prepared,missingInformation:structuredClone(f.report.requiredBeforeFiling),
      syntheticFixture:true,participantExecutionCompleted:false,judicialDecisionSupplied:false,filingPermitted:false,grantsDeliveryAuthority:false};
    if(f.prepared){assert.equal(f.checked.missing.length,0);assert.equal(f.checked.mayMarkBasis,true);fixtureBindings.push(value);}
    else diagnostics.push({...value,deliverable:false,selectionPermitted:false,role:'diagnostic_only',expectedRawResult:f.expectedRawResult});
  }
  assert.equal(fixtureBindings.length,config.positiveFixtures);assert.equal(diagnostics.length,config.diagnosticFixtures);
  const result=structuredClone(record);
  result.runtimeInstalled=false;result.currentState.runtimeSelectable=false;
  Object.assign(result.binding,{runtimeInstalled:false,generationAllowed:false,filingPermitted:false,
    packetComponents:[config.primaryDocument,'CC-DC-089','MDJ-008','participant-instructions'],
    componentConditions:{'CC-DC-089':"options.feeTreatment === 'waiver'",'MDJ-008':"options.feeTreatment === 'waiver' (financial CC-DC-089 only)"},
    acceptanceReceipt:null});
  result.binding.conditionalDelivery={
    selectionContract:`${config.helper}#${family.familyId==='md_10110_conviction-set'?'validateMdConviction':'validateMdCannabis'}`,
    fixtureSelectionContract:'scripts/grade-a-packet-factory-24h/md-conditional-declared-delivery.mjs#selectDeclaredMdConditionalFixture',
    explicitSelectionRequired:true,defaultBranch:null,runtimeInstalled:false,diagnosticArtifactsExcluded:true,
    reviewInputBinding:{file:MD_CONDITIONAL_BINDING,sha256:MD_CONDITIONAL_BINDING_SHA,filesMeasured:loaded.filesMatched},
    outputInventory:{documents:loaded.fixtures.length,pages:loaded.fixtures.reduce((n,f)=>n+f.artifact.pageCount,0),
      preparedDocuments:fixtureBindings.length,diagnosticDocuments:diagnostics.length},
    fixtureBindings,
    note:'Exact synthetic reviewed evidence only. Real participant output requires current route/source/fact verification, a new matter-bound render, entitlement and private delivery. Signatures and judicial decisions are not supplied. Diagnostic missing data cannot be bypassed by a static PASS.'};
  Object.assign(result.proposedRepresentation,{note:result.binding.conditionalDelivery.note,runtimeSelectable:false,generationAllowed:false,defaultComponentId:null,
    fixtureBindings:structuredClone(fixtureBindings),diagnosticArtifacts:diagnostics,
    components:fixtureBindings.map((f,i)=>({componentId:`${family.familyId}-${f.fixture.replaceAll('/','-')}`,role:'conditional_assembled_packet',order:i+1,
      documentId:f.fixture,file:f.file,sha256:f.sha256,requirement:'conditional',selectedBy:f.fixture,componentsIncluded:[...f.components],
      syntheticFixture:true,grantsDeliveryAuthority:false}))});
  if(options.raster){
    // Caller must already authenticate this receipt with the central receipt
    // validator. Matching metadata here is inventory compatibility, not issuer proof.
    const raster=options.raster,receipt=raster.rasterReceipt;
    assert.equal(raster.familyId,family.familyId);assert.equal(receipt.verdict,'RASTER_PASS');assert.equal(receipt.coversTheWholeFamily,true);
    assert.equal(receipt.documentsMeasured,loaded.fixtures.length);assert.equal(receipt.pagesMeasured,result.binding.conditionalDelivery.outputInventory.pages);
    assert.deepEqual(receipt.documentsNotCovered,[]);
    assert.deepEqual([...receipt.documentsCovered].sort(),loaded.fixtures.map(f=>f.artifact.file.slice(`${family.directory}/fixtures/`.length)).sort());
    assert.equal(raster.documents.length,loaded.fixtures.length);
    for(const f of loaded.fixtures){const matches=raster.documents.filter(d=>d.path===f.artifact.file);assert.equal(matches.length,1);
      assert.equal(matches[0].sha256,f.artifact.sha256);assert.equal(matches[0].pageCount,f.artifact.pageCount);}
    assert.equal(receipt.boundToCanonicalSha256,loaded.fixtures.find(f=>f.fixture==='canonical').artifact.sha256);
    assert.equal(receipt.boundToBoundarySha256,loaded.fixtures.find(f=>f.fixture==='boundary').artifact.sha256);
    result.binding.acceptanceReceipt={verdict:receipt.verdict,workflowRunId:receipt.workflowRunId,jobId:receipt.jobId,
      artifactId:receipt.receiptArtifact.id,verdictPath:receipt.verdictPath,boundToCanonicalSha256:receipt.boundToCanonicalSha256,
      boundToBoundarySha256:receipt.boundToBoundarySha256,coversTheWholeFamily:true,documentsMeasured:receipt.documentsMeasured,pagesMeasured:receipt.pagesMeasured,
      documentsCovered:[...receipt.documentsCovered],documentsDigest:receipt.documentsDigest};
  }
  return result;
}

/** Exercise exact nonproduction fixture selection; never use these example
 * PDFs as a participant render. Reauthentication catches stale bytes/bindings.
 */
export function selectDeclaredMdConditionalFixture(record,input,fixture,options={}){
  declaredOnly(record);assert.equal(input?.isSyntheticFixture,true,'PARTICIPANT_RENDER_REQUIRED');
  assert.ok(typeof fixture==='string'&&!fixture.startsWith('diagnostic/'),'EXPLICIT_PREPARED_FIXTURE_REQUIRED');
  const rebound=bindDeclaredMdConditionalDelivery(record,{familyId:record.family,directory:MD_CONDITIONAL_DIRECTORIES[record.family],routeKeys:record.routeKeys},options);
  assert.deepEqual(record.binding.conditionalDelivery,rebound.binding.conditionalDelivery,'Declared MD selection binding changed or is stale');
  assert.deepEqual(record.proposedRepresentation,rebound.proposedRepresentation,'Declared MD outputs or diagnostics changed');
  const selected=rebound.binding.conditionalDelivery.fixtureBindings.filter(f=>f.fixture===fixture);
  assert.equal(selected.length,1,'No unique prepared MD fixture');
  assert.equal(sha(serialized(input)),selected[0].input.sha256,'FIXTURE_INPUT_MISMATCH_PARTICIPANT_RENDER_REQUIRED');
  return {...structuredClone(selected[0]),runtimeInstalled:false,grantsEligibility:false,grantsDeliveryAuthority:false};
}
