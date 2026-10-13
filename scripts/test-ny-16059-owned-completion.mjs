import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { ny16059OwnedCompletionDiagnostic: diagnose } = await import('../src/lib/expungement-ai/ny-16059-owned-completion.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { createNyCompletionVerifier } = await import('./rcap-packet-completeness/ny-16059-source-conditions.mjs');
const base='data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill';
const json=file=>JSON.parse(fs.readFileSync(file));
const fixture=json('scripts/fixtures/ny-16059-precollection.json');
const fieldMap=json(`${base}/production-field-map.json`), census=json(`${base}/field-census.census-v1.json`), receipt=json(`${base}/source-receipt.json`);
const checks=[];const check=(id,pass)=>checks.push({id,pass:!!pass});
const item={id:'synthetic-ny-owned-completion',jurisdiction:'NY',artifactRefs:{}};
const patch=(record,answers)=>P.packetInformationPatch({existingItem:item,protectedVerification:record,answers})?.protectedTransition.nextVerification;
const keys=['ny_16059_additional_cases','ny_16059_case_alias','ny_16059_nysid_known','ny_16059_future_application'];
const details={ny_16059_first_case_numbers:'000001',ny_16059_additional_case_numbers:'Case B: 000002; Case C: 000003',ny_16059_case_alias_names:'Synthetic Alex Example',ny_16059_nysid_number:'00123456X',ny_16059_future_case_numbers:'000004 / SCI-0004',ny_16059_future_court:'Synthetic Albany County Court'};
const known=new Set(['NY-CPL-160.59-PRO-SE-PACKET/AKAs','NY-CPL-160.59-PRO-SE-PACKET/NYSID','NY-CPL-160.59-APPLICATION/Court_Name','NY-CPL-160.59-PRO-SE-PACKET/Court Name 3','NY-CPL-160.59-PRO-SE-PACKET/Case Number 3']);
const touched=new Set(['NY-CPL-160.59-APPLICATION/Docket_Indictment_SCI_Number_2','NY-CPL-160.59-APPLICATION/Court_Name_2','NY-CPL-160.59-APPLICATION/Conviction_Charge_2','NY-CPL-160.59-APPLICATION/Law_Section_Subsection_2','NY-CPL-160.59-APPLICATION/Conviction_Date_2','NY-CPL-160.59-APPLICATION/Sentence_Date_2','NY-CPL-160.59-APPLICATION/Sentence_Term_2','NY-CPL-160.59-APPLICATION/Release_Date_2','NY-CPL-160.59-PRO-SE-PACKET/Case Number 2','NY-CPL-160.59-PRO-SE-PACKET/Court Name 2','NY-CPL-160.59-PRO-SE-PACKET/AKAs','NY-CPL-160.59-PRO-SE-PACKET/NYSID','NY-CPL-160.59-APPLICATION/Court_Name','NY-CPL-160.59-APPLICATION/Conviction_Date','NY-CPL-160.59-APPLICATION/Sentence_Date','NY-CPL-160.59-PRO-SE-PACKET/Case Number 3','NY-CPL-160.59-PRO-SE-PACKET/Court Name 3']);
for(const example of fixture.rows){
 const old=example.verifiedRecord;
 for(const value of ['No','Yes','I am not sure']){
  const record=patch(old,{...Object.fromEntries(keys.map(k=>[k,value])),...(value==='Yes'?details:{ny_16059_first_case_numbers:'000001'})});
  check(`${example.variant}/${value}/patch`,!!record);if(!record)continue;
  const before=structuredClone(record),result=diagnose(item.id,record),prefix=`${example.variant}/${value}`;
  check(`${prefix}/68rows`,result?.rows.length===68);
  check(`${prefix}/binding`,result?.briefcaseItemId===item.id&&result.revision===record.revision&&result.recordHash===record.draftHash);
  check(`${prefix}/no render or generation`,result?.ownerRenderedArtifactVerified===false&&result.generationAllowed===false&&result.reviewOnly===true);
  assert.deepEqual(record,before);
  for(const row of result.rows){
   const id=`${row.documentId}/${row.field}`;
   check(`${prefix}/${id}/never source accepted`,row.sourceVerified===false&&row.applicabilityVerified===false&&['UNCLASSIFIED_BLANK','KNOWN_FACT_NOT_WRITTEN'].includes(row.disposition));
   check(`${prefix}/${id}/value privacy`,!JSON.stringify(row).includes('00123456X')&&!JSON.stringify(row).includes('Synthetic Alex Example'));
   if(value==='Yes'&&known.has(id))check(`${prefix}/${id}/known still owed`,row.disposition==='KNOWN_FACT_NOT_WRITTEN');
   else check(`${prefix}/${id}/source unavailable`,row.proofState==='SOURCE_BYTES_UNAVAILABLE'||row.proofState==='SOURCE_PROOF_UNRESOLVED');
   if(touched.has(id))check(`${prefix}/${id}/narrow applicability`,row.ownedApplicability===(value==='No'?'inactive':value==='Yes'&&row.field!=='Release_Date_2'?'active':'unknown'));
   else check(`${prefix}/${id}/unmapped remains unknown`,row.ownedApplicability==='unknown'||row.ownedApplicability==='active'&&row.condition.length===0||row.ownedApplicability==='unresolved_source_revision');
  }
  check(`${prefix}/multiple case text not singular`,result.rows.filter(r=>r.field==='Case Number 2'||r.field==='Docket_Indictment_SCI_Number_2').every(r=>r.disposition!=='KNOWN_FACT_NOT_WRITTEN'));
  if(value==='Yes'){
   const reverse=patch(record,Object.fromEntries(keys.map(k=>[k,'No']))),reversed=diagnose(item.id,reverse);
   check(`${prefix}/inactive details preserved`,Object.keys(details).every(k=>reverse.draftSnapshot.packetAnswers[k]===record.draftSnapshot.packetAnswers[k]));
   check(`${prefix}/inactive details not active values`,reversed.rows.every(r=>r.disposition!=='KNOWN_FACT_NOT_WRITTEN'));
  }
 }
}
const opts={familyId:'ny_160_59_petition-set',fieldMap,census,receipt,instructions:fs.readFileSync(`${base}/participant-instructions.md`,'utf8'),sourceRoot:undefined};
for(const doc of fieldMap.documents)for(const row of doc.fields){
 if(!row.nyCompletion)continue;
 const blank={document:doc.documentId,name:row.field,label:row.effectiveLabel,page:row.widgets[0]?.page??null,nyCompletion:row.nyCompletion};
 const declared={requiredBeforeFiling:row.requiredBeforeFiling,routeDetermined:false};
 for(const forged of [{conditionValues:{second_covered_case:false},factAvailable:false},true,'function(){return false}',null]){
  const result=createNyCompletionVerifier({...opts,resolveOwnedField:forged,sourceVerified:true,ownedPreparation:{conditions:{second_covered_case:{value:false}}}})(blank,declared);
  check(`serialized resolver/${doc.documentId}/${row.field}/${typeof forged}`,result.disposition==='UNCLASSIFIED_BLANK'&&result.ownedApplicability==='unknown');
 }
 // This closure is a UNIT SIMULATION, not an authenticated owner or source test.
 const throwing=createNyCompletionVerifier({...opts,resolveOwnedField:()=>{throw Error('custody unavailable');}})(blank,declared);
 check(`custody error/${doc.documentId}/${row.field}`,throwing.disposition==='UNCLASSIFIED_BLANK');
}
const good=patch(fixture.rows[0].verifiedRecord,{...Object.fromEntries(keys.map(k=>[k,'No'])),ny_16059_first_case_numbers:'000001'});
for(const field of ['draftHash','draftSnapshot']){
 const bad=structuredClone(good);if(field==='draftHash')bad.draftHash='bad';else{bad.draftSnapshot.serverFacts={jurisdiction:'NY',forged:true};bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);}
 check(`invalid record/${field}`,diagnose(item.id,bad)===null);
}
const route=fs.readFileSync('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts','utf8');
const use=route.indexOf('ny16059Completion: ny16059OwnedCompletionDiagnostic(item.id, authority.value)');
check('existing auth and owner chain precedes consumer',use>route.indexOf('if (!auth.isAuthenticated')&&use>route.indexOf('if (auth.isVerified !== true)')&&use>route.indexOf('getBriefcaseItem(auth.userId, itemId)')&&use>route.indexOf('readProtectedPacketVerification({ consumerAuthUserId: auth.userId, briefcaseItemId: item.id })')&&use>route.indexOf('if (!authority.ok)'));
const report={status:checks.every(c=>c.pass)?'PASS':'FAIL',checks:checks.length,failed:checks.filter(c=>!c.pass),details:checks,limits:['Pure server diagnostic and simulated callback-negative tests, not authenticated owner custody evidence.','Actual missing source PDFs remain missing; no positive authentic-source conditional acceptance, owner-rendered PDF or qualified approval.']};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:report.checks,failed:report.failed}));assert.equal(report.failed.length,0);
