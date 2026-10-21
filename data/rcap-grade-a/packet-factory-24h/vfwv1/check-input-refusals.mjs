import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {validate,validateForFiling} from '../../../../scripts/build-census-v1-wv_nc_diversion_deferred-set.mjs';
const base='data/rcap-all50/overlays/census-v1/wv/wv-nc-diversion-deferred-set--official-pdf-fill';
const canonical=JSON.parse(fs.readFileSync(`${base}/canonical.fixture.json`));const boundary=JSON.parse(fs.readFileSync(`${base}/boundary.fixture.json`));
const rows=[];
for(const [name,mutate]of [
 ['prior felony',f=>f.priorFelonyConviction=true],['related proceedings',f=>f.pendingRelatedProceedings=true],['plea to another offense',f=>f.pleaToAnotherOffense=true],['lesser plea',f=>f.pleaToLesserOffense=true],['uncertain incident',f=>f.sameTransaction=false],['incomplete program',f=>f.fullSuccessfulCompletion=false],['unknown program',f=>f.programType='unknown'],['59-day dismissal interval',f=>f.plannedFilingDate='2026-07-30'],['DMV relief',f=>f.dmvReliefRequested=true],['missing exhibit role',f=>f.exhibits.pop()],['duplicate count',f=>f.charges.push(structuredClone(f.charges[0]))],['deferred household victim',f=>{f.programType='deferred-adjudication';f.charges[0].statute='61-2-28(a)';f.charges[0].familyHouseholdVictim=true;}],['diversion DUI',f=>f.charges[0].statute='17C-5-2'],['wrong charge case',f=>f.charges[0].caseNumber='different']]){const f=structuredClone(canonical);mutate(f);assert.throws(()=>validate(f));rows.push({case:name,refused:true});}
validate(boundary);const elapsed=(new Date(boundary.plannedFilingDate)-new Date(boundary.dismissalDate))/86400000;assert.equal(elapsed,60);
await assert.rejects(()=>validateForFiling(canonical),/SYNTHETIC_DIAGNOSTICS/);rows.push({case:'synthetic packet filing',refused:true});
const forged=structuredClone(canonical);forged.synthetic=false;for(const [i,e]of forged.exhibits.entries()){const file=`${base}/canonical.synthetic-exhibit-${i+1}.pdf`;Object.assign(e,{synthetic:false,diagnostic:false,received:true,attached:true,certified:true,reviewedAgainstPacket:true,dismissalDate:forged.dismissalDate,programType:forged.programType,fullSuccessfulCompletion:true,path:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});}
await assert.rejects(()=>validateForFiling(forged),/SYNTHETIC_EXHIBIT_REJECTED/);rows.push({case:'relabeled synthetic court exhibit bytes',refused:true});
const result={familyId:'wv_nc_diversion_deferred-set',reviewer:'/root/nc_build',cases:rows,boundaryExactly60DaysAccepted:true,packetBytesChanged:false};fs.writeFileSync(new URL('./input-refusal-evidence.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({refusals:rows.length,boundaryExactly60DaysAccepted:true}));
