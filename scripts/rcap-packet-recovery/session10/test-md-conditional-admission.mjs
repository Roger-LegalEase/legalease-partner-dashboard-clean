import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadMdConditionalCandidate,prepareMdConditionalFixture,auditMdConditionalCandidate,MD_CONDITIONAL_FAMILIES,MD_CONDITIONAL_DIRECTORIES,MD_CONDITIONAL_BINDING} from '../../rcap-packet-completeness/md-conditional-native-candidates.mjs';
import {auditPreparedInputs} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {bindDeclaredMdConditionalDelivery,selectDeclaredMdConditionalFixture} from '../../grade-a-packet-factory-24h/md-conditional-declared-delivery.mjs';

const out='data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/md-conditional-admission';
fs.mkdirSync(out,{recursive:true});
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const binding=json(MD_CONDITIONAL_BINDING),results=[],familyAudits=[];
const check=(name,fn)=>{try{fn();results.push({name,result:'PASS'});}catch(error){results.push({name,result:'FAIL',error:error.stack});}};
const recordFor=(id,route)=>({family:id,status:'DECLARED_NOT_INSTALLED',authorityCreated:'none',routeKeys:[route],
  currentState:{generationAllowed:false,runtimeSelectable:false},binding:{routeKeys:[route],paymentEligible:false,sponsorshipEligible:false},proposedRepresentation:{}});
for(const familyId of MD_CONDITIONAL_FAMILIES){
  const directory=MD_CONDITIONAL_DIRECTORIES[familyId],config=binding.families[familyId],loaded=loadMdConditionalCandidate({root:process.cwd(),familyId});
  let bound;
  const family={familyId,directory,routeKeys:[config.routeKey]},initial=recordFor(familyId,config.routeKey);
  check(`${familyId}: actual classifier audits every prepared and diagnostic map`,()=>{
    const a=auditMdConditionalCandidate({root:process.cwd(),directory,familyId},inputs=>auditPreparedInputs(directory,familyId,inputs));
    familyAudits.push(a);
    /* An unmeasured counter is not a pass, and this expectation used to say it
     * was. visualDefects is null for both families because no artifact write
     * record carries nonWhitespaceGlyphsOutsideMeasuredWriteBoxes -- the
     * geometry pass has not run over these bytes, and the central raster gate
     * is what runs it. The adapter threw on the mismatch and the catch
     * relabelled the throw as a missing packet component, which is how both
     * families came to be refused enrolment into that very gate. The result is
     * derived from what was measured, so when the geometry reading arrives
     * unmeasuredCounters empties and this asserts PASS_COMPLETE on its own. */
    assert.equal(a.result,a.unmeasuredCounters.length?'NOT_MEASURABLE_HERE':'PASS_COMPLETE',JSON.stringify(a.findings));
    assert.deepEqual(a.unmeasuredCounters,['visualDefects'],'the only counter this adapter cannot measure is the visual one');
    for(const [k,v] of Object.entries(a.counters))if(k!=='visualDefects')assert.equal(v,0,`counter ${k} is ${v}`);
    /* The packet-set manifest is authoritative about what a packet contains and
     * no counter in the completeness contract reads it. Both families deliver
     * MDJ-008 on every waiver fixture and neither manifest entry declares it;
     * the disagreement is pinned here so a change to either side is visible. */
    assert.deepEqual(a.componentSetReconciliation.undeclaredDelivered,['MDJ-008'],'delivered-but-undeclared component set changed');
    assert.deepEqual(a.componentSetReconciliation.declaredNotDelivered,[],'a declared component is not delivered');
    assert.equal(a.findings.length,1);assert.equal(a.findings[0].component,'MDJ-008');assert.equal(a.findings[0].counter,null);
    assert.equal(a.preparedFixtures,config.positiveFixtures);
    assert.equal(a.expectedDiagnosticFixtures,config.diagnosticFixtures);assert.equal(a.fixtureResults.length,config.fixtures.length);
    assert.equal(a.allFixtureTotals.terminalFields,familyId==='md_10110_conviction-set'?2880:1614);
    assert.equal(a.runtimeIntakeCounters,null);
    /* Same concession as the family result above, and no wider: a fixture the
     * binding expects to pass may instead report that visualDefects could not
     * be measured here. A diagnostic expecting a FAIL class still has to
     * produce exactly that class -- a failing counter outranks an unmeasured
     * one in the classifier, so an unmeasured visual reading can never hide a
     * diagnostic's real finding. */
    const staticOutcome=(d,expected)=>{
      if(d.result===expected)return;
      assert.equal(expected,'PASS_COMPLETE',`${d.fixture}: ${d.result} where ${expected} is pinned`);
      assert.equal(d.result,'NOT_MEASURABLE_HERE',`${d.fixture}: ${d.result} where ${expected} is pinned`);
      assert.equal(d.counters.visualDefects,null,`${d.fixture}: unmeasured for some counter other than the visual one`);
    };
    for(const d of a.diagnosticResults){assert.equal(d.nativePreparationReady,false);assert.equal(d.selectionPermitted,false);assert.ok(d.missingInformation.length);staticOutcome(d,config.fixtures.find(f=>f.fixture===d.fixture).expectedRawResult);}
    if(familyId==='md_cannabis_petition-set'){const d=a.diagnosticResults.find(f=>f.fixture==='diagnostic/missing-contact');staticOutcome(d,'PASS_COMPLETE');assert.equal(d.selectionPermitted,false);assert.equal(d.missingInformation.length,2);}
  });
  check(`${familyId}: selected declaration includes all prepared outputs and conditional official components`,()=>{
    bound=bindDeclaredMdConditionalDelivery(initial,family);const b=bound.binding.conditionalDelivery;
    assert.equal(b.fixtureBindings.length,config.positiveFixtures);assert.equal(bound.proposedRepresentation.diagnosticArtifacts.length,config.diagnosticFixtures);
    assert.equal(bound.binding.acceptanceReceipt,null);assert.equal(bound.runtimeInstalled,false);assert.equal(bound.binding.filingPermitted,false);
    for(const f of b.fixtureBindings){assert.ok(!f.fixture.startsWith('diagnostic/'));assert.equal(f.nativePreparationReady,true);assert.equal(f.missingInformation.length,0);
      assert.deepEqual(f.components,f.selection.feeTreatment==='waiver'?[config.primaryDocument,'CC-DC-089','MDJ-008','participant-instructions']:[config.primaryDocument,'participant-instructions']);
      assert.equal(f.sourceFieldAccounting.total,f.selection.feeTreatment==='waiver'?config.expectedSourceCounts[config.primaryDocument]+155:config.expectedSourceCounts[config.primaryDocument]);
      assert.equal(f.filingPermitted,false);assert.equal(f.grantsDeliveryAuthority,false);}
  });
  const preferred=['canonical',config.fixtures.find(f=>f.prepared&&f.fixture.includes('waiver')).fixture];
  for(const fixture of preferred)check(`${familyId}: actual exact synthetic selection ${fixture}`,()=>{
    const input=json(`${directory}/fixtures/${fixture}.facts.json`),selected=selectDeclaredMdConditionalFixture(bound,input,fixture);
    assert.equal(selected.fixture,fixture);assert.equal(selected.grantsEligibility,false);assert.equal(selected.grantsDeliveryAuthority,false);
  });
  for(const d of loaded.fixtures.filter(f=>!f.prepared))check(`${familyId}: diagnostic selection refuses ${d.fixture}`,()=>{
    assert.throws(()=>selectDeclaredMdConditionalFixture(bound,d.facts,d.fixture),/EXPLICIT_PREPARED_FIXTURE_REQUIRED/);
  });
  check(`${familyId}: stale fact cannot borrow exact fixture output`,()=>{
    const input=json(`${directory}/fixtures/canonical.facts.json`);input.person.name='Different Participant';
    assert.throws(()=>selectDeclaredMdConditionalFixture(bound,input,'canonical'),/FIXTURE_INPUT_MISMATCH_PARTICIPANT_RENDER_REQUIRED/);
  });
  check(`${familyId}: real participant input requires a fresh matter-bound render`,()=>{
    const input=json(`${directory}/fixtures/canonical.facts.json`);input.isSyntheticFixture=false;
    assert.throws(()=>selectDeclaredMdConditionalFixture(bound,input,'canonical'),/PARTICIPANT_RENDER_REQUIRED/);
  });
  check(`${familyId}: manipulated diagnostic and selected-component metadata refuse`,()=>{
    const modified=structuredClone(bound);modified.proposedRepresentation.diagnosticArtifacts[0].selectionPermitted=true;
    assert.throws(()=>selectDeclaredMdConditionalFixture(modified,json(`${directory}/fixtures/canonical.facts.json`),'canonical'),/outputs or diagnostics changed/);
    const other=structuredClone(bound);other.binding.conditionalDelivery.fixtureBindings[0].components.push('invented');
    assert.throws(()=>selectDeclaredMdConditionalFixture(other,json(`${directory}/fixtures/canonical.facts.json`),'canonical'),/binding changed or is stale/);
  });
  for(const [name,modify]of [
    ['wrong route',r=>r.binding.routeKeys=['wrong-route']],['live declaration',r=>r.status='INSTALLED'],
    ['payment eligible',r=>r.binding.paymentEligible=true],['sponsorship eligible',r=>r.binding.sponsorshipEligible=true],
  ])check(`${familyId}: ${name} is not accepted as static evidence`,()=>{const r=structuredClone(initial);modify(r);assert.throws(()=>bindDeclaredMdConditionalDelivery(r,family));});
  const f=loaded.fixtures[0];
  const context={familyId,config,fixture:config.fixtures[0],map:json(`${directory}/production-field-map.json`),index:json(`${directory}/reports/rendered-artifacts.json`),
    actual:json(`${directory}/reports/actual-writes.json`),receipt:json(`${directory}/source-receipt.json`),report:f.report,facts:f.facts,instructions:f.inputs.instructions};
  for(const [name,modify]of [
    ['missing map field',c=>c.map.conditionalMaps[c.fixture.fixture].writes.pop()],
    ['forged allKnownFactsPrepared',c=>c.report.allKnownFactsPrepared=false],
    ['missing source component',c=>c.report.documents=[]],
    ['wrong source page',c=>c.report.pageManifest[0].sourcePage=2],
    ['invented judicial decision',c=>c.report.judicialDecisionSupplied=true],
  ])check(`${familyId}: pure native projection refuses ${name}`,()=>{const c=structuredClone(context);modify(c);assert.throws(()=>prepareMdConditionalFixture(c));});
  fs.writeFileSync(`${out}/${familyId}-declared-binding.json`,JSON.stringify(bound,null,2)+'\n');
}
for(const p of [MD_CONDITIONAL_BINDING,binding.families['md_10110_conviction-set'].helper,
  'reference/chat-parallel-2026-09-07/chat5/CC-DC-089.pdf',binding.families['md_cannabis_petition-set'].fixtures[0].file,
  `${MD_CONDITIONAL_DIRECTORIES['md_cannabis_petition-set']}/production-field-map.json`])check(`exact guard refuses same-length changed input ${p}`,()=>{
    assert.throws(()=>loadMdConditionalCandidate({root:process.cwd(),familyId:'md_cannabis_petition-set',readFile:q=>{
      const b=read(q);if(q!==p)return b;const changed=Buffer.from(b);changed[changed.length-1]^=1;return changed;
    }}),/changed/);
});
const report={scope:'AUTHOR_MD_CONDITIONAL_ADAPTER_TESTS_NOT_INDEPENDENT_APPROVAL',passed:results.filter(r=>r.result==='PASS').length,
  failed:results.filter(r=>r.result==='FAIL').length,results,familyAudits,
  sourceFiles:['scripts/rcap-packet-completeness/md-conditional-native-candidates.mjs',MD_CONDITIONAL_BINDING,'scripts/grade-a-packet-factory-24h/md-conditional-declared-delivery.mjs'].map(p=>({path:p,sha256:sha(read(p))})),
  expectedDiagnosticsMeasured:7,preparedOutputsMeasured:36,fullRendererRuns:0,newRasterImages:0,sharedHostEdited:false,productionChanged:false};
fs.writeFileSync(`${out}/author-adapter-tests.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,failures:results.filter(r=>r.result==='FAIL'),expectedDiagnostics:7,preparedOutputs:36},null,2));
if(report.failed)process.exitCode=1;
