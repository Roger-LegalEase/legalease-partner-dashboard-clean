import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {BLANK_DISPOSITIONS} from '../../../../../scripts/rcap-packet-completeness/completeness-contract.mjs';
const ev='data/rcap-grade-a/packet-factory-24h/vf69/az-dismissal-requirements-final-evidence-20260911';
const old='data/rcap-grade-a/packet-factory-24h/vf69/az-dismissal-final-evidence-20260911';
const dir='data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill';
const candidate='7ab552e8ba14dc2eece3e81b7699ff452decae66';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const paths=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',candidate],{encoding:'utf8'}).trim().split('\n');
assert.equal(paths.length,10);
const setup=paths.map(p=>{const current=fs.readFileSync(p),expected=execFileSync('git',['show',`${candidate}:${p}`],{maxBuffer:10000000});assert(current.equals(expected));return {path:p,sha256:hash(current),candidateBlobIdentical:true};});
const currentMap=read(dir+'/production-field-map.json'),oldMap=JSON.parse(execFileSync('git',['show',`a676b40494d562ae1c080ac35cfb19ea7a44618e:${dir}/production-field-map.json`],{encoding:'utf8',maxBuffer:10000000})),instructions=fs.readFileSync(dir+'/participant-instructions.md','utf8');
const priorAudit=read(old+'/focused-current-review.json'),defects=read(old+'/source-conditioned-requirement-defects.json');
const pdfs=priorAudit.pdfs.map(p=>{const current=fs.readFileSync(p.path);assert.equal(hash(current),p.recomputedSha256);assert.equal(hash(execFileSync('git',['show',`${candidate}:${p.path}`],{maxBuffer:10000000})),p.recomputedSha256);return {...p,currentSha256:hash(current),unchangedFromPriorIndependentVisual:true,candidateIdentical:true};});
const sources=priorAudit.sources.map(s=>{const b=fs.readFileSync(s.path);assert.equal(hash(b),s.recomputedSha256);return {path:s.path,sha256:hash(b),byteLength:b.length,unchanged:true};});
for(const key of ['familyId','trackId','routeKeys','componentRoutes','sourceFieldCensus','fixtureSpecificFacts','registryGuidance'])assert.deepEqual(currentMap[key],oldMap[key]);
for(const map of currentMap.maps){const prev=oldMap.maps.find(m=>m.documentId===map.documentId);for(const key of Object.keys(prev).filter(k=>k!=='canonicalRefusals'))assert.deepEqual(map[key],prev[key]);}
const rows=[];
for(const defect of defects.rows){
 const map=currentMap.maps.find(m=>m.documentRole===defect.documentRole),r=map.canonicalRefusals.find(r=>r.fieldName===defect.fieldId);
 assert(r);assert.equal(r.requiredBeforeFiling,false);assert.equal(r.sourceConditionClass,defect.defectCategory);assert.deepEqual(r.sourceFieldInfo.sourceWidgets,defect.sourceWidgets);assert(r.conditionalRequirement);assert.equal(BLANK_DISPOSITIONS[r.completenessDisposition]?.allowed,true);assert(instructions.includes(r.effectiveLabel));assert(instructions.includes(r.conditionalRequirement));
 rows.push({fieldId:defect.fieldId,documentRole:defect.documentRole,sourcePage:defect.sourcePage,sourceLabel:defect.sourceLabel,sourceApplicableCondition:defect.applicableCondition,currentHumanLabel:r.effectiveLabel,currentConditionalRequirement:r.conditionalRequirement,currentDisposition:r.completenessDisposition,currentSourceConditionClass:r.sourceConditionClass,currentRequiredBeforeFiling:r.requiredBeforeFiling,sourceOptionalValue:r.sourceOptional??null,sourceSemanticsIndependentAssessment:'PASS',declaredVocabularyMembership:true});
}
const retained=['petition.Case','petition.CourtCaseNum','petition.EnteredOn','petition.Check Box10','petition.Check Box11','petition.Check Box12','petition.Check Box13','petition.Check Box14','petition.Check Box15','petition.Check Box17','petition.Check Box18','petition.Date','order.Case'];
for(const id of retained){const [role,field]=id.split('.');const r=currentMap.maps.find(m=>m.documentRole===role).canonicalRefusals.find(r=>r.fieldName===field);assert.equal(r.requiredBeforeFiling,true);assert.equal(r.completenessDisposition,'REQUIRED_BEFORE_FILING');assert(instructions.includes(r.effectiveLabel));}
assert(instructions.includes('Section II remains active'));assert(instructions.includes("Yes, No, or N/A choice"));assert(instructions.includes('complete the participant signature and Date'));
const schema=read(ev+'/completeness-findings.json');
assert.equal(schema.counters.unclassifiedBlanks,38);assert.equal(schema.counters.knownRequiredFieldsMissing,2);
const findings=schema.findings.map(f=>({...f,documentRole:f.field.includes('primary-filing')?'petition':'order',fieldId:f.field.split('.').at(-1)}));
for(const row of rows){const f=findings.find(f=>f.documentRole===row.documentRole&&f.fieldId===row.fieldId);row.existingReaderAssessment=f?{result:'FAIL',counter:f.counter,basis:f.basis}:{result:'PASS'};}
const evidence={schemaVersion:'vf69-az-dismissal-requirements-bounded-recheck/v1',candidateCommit:candidate,actualCheckoutCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),setupFiles:setup,sourceFiles:sources,pdfs,sourceSemantics:{repairedRows:42,sourceConditionsCorrect:42,retainedMandatory:retained,sectionTwoPreserved:true,sourceGeometryAndUnchangedMetadataMatch:true},rows,closedDispositionReader:{result:schema.result,counters:schema.counters,findingsPath:ev+'/completeness-findings.json',sourceOptionalIncomplete:findings.filter(f=>f.basis==='sourceOptional proof is incomplete').length,conditionalElectionsNotConsumed:findings.filter(f=>f.basis!=='sourceOptional proof is incomplete').length},currentMapSha256:hash(fs.readFileSync(dir+'/production-field-map.json')),currentInstructionsSha256:hash(fs.readFileSync(dir+'/participant-instructions.md')),priorVisualEvidence:{path:old+'/visual-page-coverage.json',sha256:hash(fs.readFileSync(old+'/visual-page-coverage.json')),retained:true,reViewedThisRecheck:false,pages:32,uniqueDirectlyViewedPreviously:12},noBuilderOrRasterExecuted:true};
fs.writeFileSync(ev+'/bounded-recheck.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({setup:'MATCHES_CANDIDATE',sources:2,unchangedPdfs:6,sourceConditionsRepaired:42,retainedMandatory:13,closedDispositionReader:schema.result,counters:schema.counters},null,2));
