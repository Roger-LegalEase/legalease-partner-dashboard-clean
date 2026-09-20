/** Native Form 1 input/report binding. No PDF rendering and no shared-reader writes. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT, OUTPUT, FAMILY, read, write, sha, snapshot, buildCompatibility} from './ia-901c2-compatibility.mjs';
import {validateFacts} from './ia-901c2.mjs';
import {auditFamily, verifySourcePresentation} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {classifyBlank} from '../../rcap-packet-completeness/completeness-contract.mjs';
export const EVIDENCE='data/rcap-grade-a/chat-parallel-2026-09-07/chat8-build/ia-901c2-native-v2';
const fieldFacts={
 'cap.01':'county','cap.02':'plaintiff','cap.03':'name','cap.04':'caseNumber',
 'sig.a.01':'name','sig.a.05':'address','sig.a.06':'city','sig.a.07':'state',
 'sig.a.08':'zip','sig.a.09':'phone','sig.a.10':'phone','sig.a.11':'email',
 'cert.01':'name','cert.05':'countyAttorney.name','cert.06':'countyAttorney.address',
 'cert.07':'countyAttorney.city','cert.08':'countyAttorney.state','cert.09':'countyAttorney.zip',
};
const at=(o,key)=>key.split('.').reduce((value,k)=>value?.[k],o);
const known=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
const flatten=(o,prefix='',out={})=>{
 for(const [k,v] of Object.entries(o)) {
  const key=prefix?prefix+'.'+k:k;
  if(v!==null&&typeof v==='object'&&!Array.isArray(v))flatten(v,key,out);else out[key]=v;
 }
 return out;
};
const expectedText=(facts,field)=>{
 const key=field.replace('2.86-1.',''),v=at(facts,fieldFacts[key]);
 if(key==='sig.a.09')return v?.slice(0,3);
 if(key==='sig.a.10')return v?`${v.slice(3,6)}-${v.slice(6)}`:v;
 return v;
};
function checkedFacts(fixture) {
 const rel=`${OUTPUT}/fixtures/${fixture}.json`,bytes=fs.readFileSync(path.join(ROOT,rel));
 const f=JSON.parse(bytes);validateFacts(f);
 return {facts:f,path:rel,sha256:sha(bytes),bytes:bytes.length};
}
/** Reuses the preserved v1 compatibility writer, then binds actual held inputs.
 * A blank may be unavailable only against that fixture's actual input snapshot.
 * Inactive paper-service/attorney blocks never acquire active participant facts.
 */
export async function buildNativeReports({measurements,outDir=OUTPUT,fixtures=null}={}) {
 if(!measurements)throw Error('Actual source/output byte measurements are required');
 const before=snapshot(path.join(ROOT,outDir));
 const prior=await buildCompatibility({measurements,outDir,fixtures});
 const m=read(`${outDir}/production-field-map.json`),a=read(`${outDir}/reports/actual-writes.json`);
 const fixtureIds=[...new Set([...m.writes,...m.refusals].map(r=>r.fixture))];
 const input={},inputs=[],availableFacts={},bindings=[];
 for(const fixture of fixtureIds) {
  input[fixture]=checkedFacts(fixture);const f=input[fixture].facts;
  const raw=flatten(f);
  // An explicitly absent recipient means all five recipient details are unknown.
  if(f.countyAttorney===null)for(const k of ['name','address','city','state','zip'])raw[`countyAttorney.${k}`]=null;
  for(const [key,value] of Object.entries(raw))availableFacts[`${fixture}:${key}`]=value;
  inputs.push({fixture,inputPath:input[fixture].path,sha256:input[fixture].sha256,byteCount:input[fixture].bytes,
   facts:raw,source:'actual fixture JSON; distinct from values printed in the PDF'});
 }
 for(const row of [...m.writes,...m.refusals]) {
  const key=row.field.replace('2.86-1.',''),fact=fieldFacts[key];
  const isWrite=m.writes.includes(row);
  const active=isWrite||row.requiredBeforeFiling===true;
  if(fact&&active) {
   row.factId=`${row.fixture}:${fact}`;
   const value=at(input[row.fixture].facts,fact)??null;
   row.nativeFactAvailable=known(value);
   row.inputSnapshotSha256=input[row.fixture].sha256;
   if(isWrite&&String(expectedText(input[row.fixture].facts,row.field))!==String(row.value))
    throw Error(`Printed fact disagrees with actual fixture input: ${row.fieldId}`);
   bindings.push({fixture:row.fixture,fieldId:row.fieldId,factId:row.factId,value,
    available:known(value),inputSnapshotSha256:row.inputSnapshotSha256,printedValue:isWrite?row.value:null,
    action:isWrite?'WRITE':'BLANK'});
  }
  // Do not map a known participant name to an inapplicable paper certificate.
  if(fact&&!active&&key.startsWith('cert.'))row.factId=null;
 }
 m.availableFacts=availableFacts;
 m.nativeInputBindings={version:2,scope:'per-fixture',inputs:inputs.map(({facts,...identity})=>identity)};
 for(const doc of a.documents)for(const row of doc.actualWrites) {
  const native=m.writes.find(w=>w.fixture===doc.fixture&&w.field===row.field);
  if(!native)throw Error('Actual-write record is outside the native map');
  row.factId=native.factId;
 }
 write(`${outDir}/production-field-map.json`,m);write(`${outDir}/reports/actual-writes.json`,a);
 write(`${outDir}/reports/fixture-input-facts.json`,{familyId:FAMILY,version:2,inputs,bindings,
  identityAndAvailabilityAreNotSignatures:true,noExternalRecordAuthenticated:true});
 const census=read(`${outDir}/field-census.census-v1.json`),receipt=read(`${outDir}/source-receipt.json`),rendered=read(`${outDir}/reports/rendered-artifacts.json`);
 const ledger=m.refusals.map(row=>{
  const normal={id:row.fieldId,name:row.field,label:row.effectiveLabel??row.label,document:row.documentId,
   sourceIdentity:row.field,isSelectionControl:row.isSelectionControl,
   declared:{...row,disposition:row.completenessDisposition,factAvailable:row.factId?known(availableFacts[row.factId]):false}};
  const presentation=verifySourcePresentation(normal,{census,receipt,fieldMap:m,actualWrites:a,rendered});
  const r=classifyBlank(normal,row.reason,row.refusalClass,{...normal.declared,sourcePresentation:presentation,identity:normal.id});
  return {...row,importerDisposition:r.disposition,importerBasis:r.basis};
 });
 const readiness=prior.readiness.map(row=>{
  const held=input[row.fixture].facts;
  const pending=ledger.filter(r=>r.fixture===row.fixture&&r.importerDisposition==='REQUIRED_BEFORE_FILING');
  const unique=[...new Set(pending.map(r=>r.factId).filter(Boolean))];
  return {...row,missingParticipantFacts:unique.length,missingParticipantControlAreas:pending.length,
   unknownFactIds:unique,sourceWordingConflict:validateFacts(held).timingFormMismatch,
   rawCounterPassIsNotFilingAuthority:true,inputSnapshotSha256:input[row.fixture].sha256,
   pendingParticipantExecution:ledger.filter(r=>r.fixture===row.fixture&&['PROTECTED_FIELD','PARTICIPANT_ELECTION_GENUINE'].includes(r.importerDisposition)).map(r=>r.fieldId)};
 });
 write(`${outDir}/reports/blank-dispositions.json`,{familyId:FAMILY,version:2,blanks:ledger});
 write(`${outDir}/reports/blanks-left-for-the-participant.json`,{familyId:FAMILY,fixtures:readiness,blanks:ledger.filter(r=>r.type!=='PDFButton')});
 write(`${outDir}/reports/packet-level-readiness.json`,{familyId:FAMILY,version:2,fixtures:readiness,filingReady:false,diagnosticsAreNotPositiveFixtures:true});
 const result=auditFamily(outDir,FAMILY);
 write(`${outDir}/reports/completeness-counters.json`,result.counters);write(`${outDir}/reports/completeness-result.json`,result);
 const after=snapshot(path.join(ROOT,outDir));
 for(const [p,h] of Object.entries(before))if(p.endsWith('.pdf')&&after[p]!==h)throw Error('Native reports changed a preserved PDF');
 return {result,readiness,inputs:inputs.map(({facts,...id})=>id),boundAreas:bindings.length,
  preservedPdfHashes:Object.fromEntries(Object.entries(after).filter(([n])=>n.endsWith('.pdf')))};
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url)) {
 const measurements=read(`${EVIDENCE}/byte-measurements.json`);
 const result=await buildNativeReports({measurements});write(`${EVIDENCE}/native-result.json`,result);
 console.log(JSON.stringify({result:result.result.result,counters:result.result.counters,totals:result.result.totals,boundAreas:result.boundAreas},null,2));
}
