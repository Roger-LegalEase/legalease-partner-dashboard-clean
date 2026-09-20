import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {buildUtahSpecialCertificate, SPECIAL_CERTIFICATE_FIXTURE_STAGE_INPUT} from '../../../../../scripts/build-census-v1-ut_pet_special_certificate-set.mjs';

const root=process.cwd(),out='data/rcap-grade-a/packet-factory-24h/vf02/ut-special-final-20260911';
const family='data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill';
function snapshot() {return Object.fromEntries(fs.readdirSync(family,{recursive:true}).filter(p=>fs.statSync(`${family}/${p}`).isFile()).sort().map(p=>{
 const file=`${family}/${p}`,s=fs.statSync(file);return[p,{sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),size:s.size,mtimeMs:s.mtimeMs,ctimeMs:s.ctimeMs}];
}));}
const mutations=['mkdirSync','writeFileSync','appendFileSync','renameSync','unlinkSync','rmSync','copyFileSync'];
const originals=Object.fromEntries(mutations.map(k=>[k,fs[k]]));
const before=snapshot(),results=[];
for(const mode of ['missing-certificate','missing-expected-hash','invalid-unparseable-date','valid-positive','impossible-issue-date','impossible-expiry-date','impossible-asof-date']) {
 const input=structuredClone(SPECIAL_CERTIFICATE_FIXTURE_STAGE_INPUT);
 if(mode==='missing-certificate')delete input.certificate;
 if(mode==='missing-expected-hash')delete input.expectedDocumentSha256;
 if(mode==='invalid-unparseable-date')input.certificate.issuedAt='not-a-date';
 if(mode==='impossible-issue-date')Object.assign(input,{asOf:'2026-09-11',certificate:{...input.certificate,issuedAt:'2026-06-31',expiresAt:'2026-12-01'}});
 if(mode==='impossible-expiry-date')Object.assign(input,{asOf:'2026-09-11',certificate:{...input.certificate,issuedAt:'2026-09-10',expiresAt:'2027-02-30'}});
 if(mode==='impossible-asof-date')Object.assign(input,{asOf:'2026-09-31',certificate:{...input.certificate,issuedAt:'2026-08-01',expiresAt:'2027-01-28'}});
 let attemptedMutation=null,thrown=null;
 for(const method of mutations)fs[method]=(...args)=>{attemptedMutation={method,path:String(args[0])};throw new Error('VF02_WRITE_BARRIER_BEFORE_MUTATION');};
 try {await buildUtahSpecialCertificate({noRaster:true,stageInput:input});}
 catch(error){thrown={name:error.name,message:error.message,stack:error.stack};}
 finally {for(const method of mutations)fs[method]=originals[method];}
 assert.ok(thrown,'builder unexpectedly returned without gate refusal or write barrier');
 const result={mode,input,gateRefused:!attemptedMutation,reachedFirstPostGateMutationBoundary:Boolean(attemptedMutation),attemptedMutation,thrown,unchangedFamilyBytesAndMetadata:JSON.stringify(snapshot())===JSON.stringify(before)};
 assert.equal(result.unchangedFamilyBytesAndMetadata,true);
 results.push(result);
}
const host=fs.readFileSync('scripts/build-census-v1-ut_pet_acquittal-set.mjs','utf8').split('\n');
const wrapper=fs.readFileSync('scripts/build-census-v1-ut_pet_special_certificate-set.mjs','utf8').split('\n');
const lines=(source,start,end)=>source.slice(start-1,end).map((text,i)=>({line:start+i,text}));
const report={method:'Real exported production builder with fs mutation barrier installed after imports. Every mutating call throws before executing. Valid and impossible-date cases stop at the wrapper writeJson mkdir before any source receipt/PDF/render change. Negative controls refuse before the barrier.',results,
 callerTrace:{builderInputAndGate:{file:'scripts/build-census-v1-ut_pet_special_certificate-set.mjs',lines:lines(wrapper,154,187)},hostFixtureConstruction:{file:'scripts/build-census-v1-ut_pet_acquittal-set.mjs',lines:lines(host,3314,3336)},factsForBranchAndDates:lines(host,843,918),textPlannerAndUnknownBranch:lines(host,1137,1167),replyGate:lines(host,928,954)},
 scopeAssessment:{certificateDates:'Reachable through actual builder stageInput. No upstream rejection; source/registry/census checks do not validate these input date values. Gate accepts impossible issue/expiry/asOf values, and builder crosses its ALLOW_STAGE_2 assertion.',unknownBranchText:'Dormant helper behavior only. Actual host always constructs exact canonical/boundary branch values through factsFor; caller accepts no participant facts. Not scored as a current participant-output failure.',replyDates:'Dormant helper behavior only. Actual host supplies fixed valid served/filed fixture dates through factsFor. Not scored as a current participant-output failure.',liveAuthority:'This review does not assert any live route or participant fulfillment is open.'},
 noBuilderMutations:true,noPdfRenderOrRaster:true,unchangedAfterAll:JSON.stringify(snapshot())===JSON.stringify(before)};
fs.writeFileSync(path.join(root,out,'builder-caller-probes.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(results.map(({mode,gateRefused,reachedFirstPostGateMutationBoundary,unchangedFamilyBytesAndMetadata})=>({mode,gateRefused,reachedFirstPostGateMutationBoundary,unchangedFamilyBytesAndMetadata}))));
