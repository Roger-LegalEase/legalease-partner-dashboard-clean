#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {evaluateVaNonconvictionBasis as gate,assertVaBasisPreparation,VA_BASIS_POLICY,VA_BASIS_GUIDANCE} from './va-nonconviction-basis.mjs';
import {configurePa790Family,PA_790_CERTIFICATE,PA_790_SERVICE,selectPa790Components,assemblePa790Packet,writePa790ConditionalFixtures} from './pa-790-recovery.mjs';
import {renderPrimary,composedBody as vaBody} from '../build-census-v1-va_exp_nonconviction-set.mjs';
import {composedBody as maBody} from '../build-census-v1-ma-bmc-multi-set.mjs';
import {FAMILY as deFamily} from '../build-census-v1-de_mandatory_expungement-set.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');process.chdir(root);
const unitOnly=process.argv.includes('--unit');const results=[];
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log(`PASS ${name}`);}catch(error){results.push({name,status:'FAIL',message:error.message});console.error(`FAIL ${name}: ${error.message}`);}}
const options={asOf:'2026-09-06'};
const d={disposition:'dismissed',deferredStatute:'19.2-298.02',admittedFactsOrFinding:true,subsectionDAgreement:'established',agreementEvidence:'Recorded agreement, transcript pp. 8-9'};
const ordinary={disposition:'acquitted',deferredStatute:null,admittedFactsOrFinding:false};
const decisions=[
 ['current subsection D',d,options,'SUBSECTION_D_EXCEPTION_CONTINUE'],
 ['D without agreement',{...d,subsectionDAgreement:'absent'},options,'RECORD_REVIEW_REQUIRED'],
 ['D ambiguous agreement',{...d,subsectionDAgreement:'ambiguous'},options,'RECORD_REVIEW_REQUIRED'],
 ['D disputed agreement',{...d,subsectionDAgreement:'disputed'},options,'RECORD_REVIEW_REQUIRED'],
 ['D missing evidence',{...d,agreementEvidence:' '},options,'RECORD_REVIEW_REQUIRED'],
 ['later consent is not D agreement',{...d,subsectionDAgreement:'absent',prosecutionResponse:'consent'},options,'RECORD_REVIEW_REQUIRED'],
 ['other first offender',{...ordinary,disposition:'dismissed',deferredStatute:'18.2-251'},options,'OTHER_ROUTE_REVIEW'],
 ['ordinary acquittal',ordinary,options,'ORDINARY_BASIS_CONTINUE'],
 ['ordinary nolle',{...ordinary,disposition:'nolle_prosequi'},options,'ORDINARY_BASIS_CONTINUE'],
 ['future-only authority',{...d,basisVersion:'2026-12-01'},options,'FUTURE_LAW_NOT_ENABLED'],
 ['future filing needs policy review',d,{asOf:'2026-12-01'},'POLICY_REVIEW_REQUIRED'],
 ['unknown date',d,{},'POLICY_REVIEW_REQUIRED'],
 ['invalid calendar day',d,{asOf:'2026-09-31'},'POLICY_REVIEW_REQUIRED'],
 ['unknown basis',null,options,'RECORD_REVIEW_REQUIRED'],
 ['opposition stop',{...d,prosecutionResponse:'objection'},options,'SELF_HELP_STOP'],
 ['answer stop',{...d,prosecutionResponse:'answer'},options,'SELF_HELP_STOP'],
 ['immigration review boundary',{...d,reviewFlags:['immigration']},options,'SELF_HELP_STOP'],
 ['unknown response not silently accepted',{...d,prosecutionResponse:true},options,'RECORD_REVIEW_REQUIRED'],
 ['unknown facts not ordinary eligibility',{...ordinary,admittedFactsOrFinding:undefined},options,'RECORD_REVIEW_REQUIRED'],
];
for(const [name,record,date,status] of decisions)await test(`VA ${name}`,()=>{
 const result=gate(record,date);assert.equal(result.status,status);
 assert.equal(result.eligibilityDetermined,false);assert.equal(result.automaticallySelectsBox,false);assert.equal(result.grantsFilingOrCommercialAuthority,false);
});
await test('VA reference template cannot bypass a supplied adverse record',()=>{
 assert.equal(assertVaBasisPreparation({}, {...options,referenceTemplate:true}).status,'REFERENCE_TEMPLATE_UNSELECTED');
 assert.throws(()=>assertVaBasisPreparation({[VA_BASIS_POLICY.factKey]:{...d,subsectionDAgreement:'absent'}},{...options,referenceTemplate:true}),/VA_BASIS_STOP/);
});
await test('VA actual renderer enforces the gate before form access',async()=>{
 await assert.rejects(renderPrimary(null,null,'canonical',{[VA_BASIS_POLICY.factKey]:{...d,subsectionDAgreement:'absent'}},options),{code:'VA_BASIS_STOP'});
 await assert.rejects(renderPrimary(null,null,'canonical',{[VA_BASIS_POLICY.factKey]:d},{asOf:'2026-12-01'}),{code:'VA_BASIS_STOP'});
 await assert.rejects(renderPrimary(null,null,'canonical',{[VA_BASIS_POLICY.factKey]:d}),{code:'VA_BASIS_STOP'});
});
const facts={'participant.full_legal_name':'Jordan Test','matter.case_number':'CP-01-CR-0000000-2026'};
await test('VA rendered instructions contain the exception and separate agreements',()=>{
 const text=vaBody('filing_instructions',facts);assert.match(text,/19\.2-298\.02/);assert.match(text,/three separate facts/);assert.match(text,/December 1, 2026/);
 assert.ok(VA_BASIS_GUIDANCE.every(line=>text.includes(line)));
});
await test('MA actual petition has 30-day petitioner notice and optional preliminary hearing',()=>{
 const text=maBody('primary_filing',facts);assert.match(text,/30 days/);assert.match(text,/Suffolk/);assert.match(text,/preliminary/i);assert.doesNotMatch(text,/not guilty or no probable cause/i);
});
await test('MA actual filing instructions have no filing fee and no waiver',()=>{
 const text=maBody('instructions',facts);assert.match(text,/no (?:filing )?fee/i);assert.match(text,/30 days/);assert.match(text,/discretion|may.*preliminary|preliminary.*may/i);
});
await test('DE actual guide does not add a court fee to the SBI-only branch',()=>{
 const text=deFamily.composedBody('primary_filing',facts);assert.match(text,/\$72/);assert.match(text,/\$75/);assert.match(text,/30 days/);
 assert.doesNotMatch(text,/a separate \$75 court filing fee/i);assert.match(text,/27S23V/);assert.match(text,/27RVGT/);
});
await test('PA no-IFP no-order branch omits both optional documents',()=>{
 assert.deepEqual(selectPa790Components({requestFeeWaiver:false,includeProposedOrder:false}),['rule-790-petition','certificate-of-service']);
});
await test('PA IFP and order elections are independent',()=>{
 assert.deepEqual(selectPa790Components({requestFeeWaiver:true,includeProposedOrder:false}),['rule-790-petition','certificate-of-service','ifp-ccp']);
 assert.deepEqual(selectPa790Components({requestFeeWaiver:false,includeProposedOrder:true}),['rule-790-petition','certificate-of-service','rule-790-order']);
});
await test('PA missing, string, or numeric elections refuse instead of coercing',()=>{
 for(const input of [{},{requestFeeWaiver:'false',includeProposedOrder:false},{requestFeeWaiver:false,includeProposedOrder:0}])assert.throws(()=>selectPa790Components(input),/explicit boolean/);
});
await test('PA certificate records both recipients and Rule 576 required particulars',()=>{
 const text=PA_790_CERTIFICATE.renderText(facts);
 for(const field of ['Commonwealth attorney name:','Commonwealth attorney service address:','Commonwealth attorney telephone number:', 'Court administrator name:','Court administrator service address:','Court administrator telephone number:','Manner of service','Date of service','Signature of petitioner after service'])assert.ok(text.includes(field),field);
 assert.ok(PA_790_CERTIFICATE.fields.filter(f=>f.requiredBeforeFiling).every(f=>text.includes(f.effectiveLabel)));
 assert.ok(!PA_790_CERTIFICATE.fields.filter(f=>/service|signature|signed/i.test(f.field)).some(f=>f.decision==='candidate_write'));
});
await test('PA service copy distinguishes document-specific party consent and local authorization',()=>{
 const text=PA_790_SERVICE.join(' ');assert.match(text,/written, document-specific/);assert.match(text,/local-rule authorization/);assert.match(text,/576\.1/);assert.match(text,/letterhead alone is not consent/);
});
await test('PA configuration cannot mutate the NJ host or accept another route',()=>{
 const base={jurisdiction:'PA',routeKeys:['obligation:track-pathway:PA:pa_790_nonconviction:test'],documents:[{documentId:'PA-IFP-CCP',render:false}],componentDelivery:{},notes:[],guidance:{}};
 const before=JSON.stringify(base);const result=configurePa790Family(base);assert.equal(JSON.stringify(base),before);assert.equal(result.documents[0].render,true);
 assert.throws(()=>configurePa790Family({...base,jurisdiction:'NJ'}));
 assert.throws(()=>configurePa790Family({...base,routeKeys:['other-route']}));
});
const dirs={de:'data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill',ma:'data/rcap-all50/overlays/census-v1/ma/ma-bmc-multi-set--custom-pleading',va:'data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill',pa:'data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill'};
if(!unitOnly){
 await test('PA eight executable branch assemblies are byte-deterministic',()=>writePa790ConditionalFixtures(dirs.pa,{check:true}));
 await test('PA actual IFP pages are included only in the selected branch',async()=>{
  const no=await assemblePa790Packet(dirs.pa,'canonical',{requestFeeWaiver:false,includeProposedOrder:false});
  const yes=await assemblePa790Packet(dirs.pa,'canonical',{requestFeeWaiver:true,includeProposedOrder:false});
  assert.equal(no.pageCount,2);assert.equal(yes.pageCount,4);assert.equal(yes.components.at(-1).component,'ifp-ccp');
 });
 await test('PA IFP protects all financial, certification and execution fields in both fixtures',()=>{
  const rows=JSON.parse(fs.readFileSync(`${dirs.pa}/reports/actual-writes.json`)).artifacts.filter(a=>a.documentId==='PA-IFP-CCP');assert.equal(rows.length,2);
  for(const row of rows){assert.equal(row.report,undefined);for(const written of row.written)assert.ok(['DefendantName','DefendantAddress','DocketNumber','CountyName'].includes(written.field),written.field);assert.equal(row.selections?.length??0,0);}
  const map=JSON.parse(fs.readFileSync(`${dirs.pa}/production-field-map.json`)).documents.find(x=>x.documentId==='PA-IFP-CCP');
  assert.equal(map.generatedParticipantArtifact,true);assert.ok(map.fields.every(f=>f.refusalClass!=='source_only_not_generated'));
 });
 await test('PA explicitly discloses held-but-not-printed boundary values without granting delivery',()=>{
  const record=JSON.parse(fs.readFileSync(`${dirs.pa}/conditional-components.json`));
  for(const b of record.branches)assert.equal(b.readyForParticipantDelivery,false);
  assert.ok(record.branches.some(b=>b.fixture==='boundary'&&b.elections.requestFeeWaiver&&b.heldButNotPrinted.length>=3));
 });
 for(const [family,dir] of Object.entries(dirs))await test(`${family.toUpperCase()} emitted PDF text contains its repaired participant rule`,()=>{
  for(const fixture of ['canonical','boundary']){
   const file=family==='pa'?`${dir}/fixtures/certificate-of-service-${fixture}.pdf`:`${dir}/fixtures/${fixture}.pdf`;
   const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}).replace(/\s+/g,' ');
   if(family==='de'){assert.match(text,/\$72/);assert.match(text,/\$75/);assert.doesNotMatch(text,/a separate \$75 court filing fee/i);}
   if(family==='ma'){assert.match(text,/30 days/);assert.match(text,/no (?:filing )?fee/i);}
   if(family==='va'){assert.match(text,/19\.2-298\.02/);assert.match(text,/three separate facts/);}
   if(family==='pa'){assert.match(text,/Commonwealth attorney telephone number/);assert.match(text,/Court administrator telephone number/);}
  }
 });
 await test('VA gate implementation is hash-bound to the rebuilt contract',()=>{
  const record=JSON.parse(fs.readFileSync(`${dirs.va}/basis-election-contract.json`));assert.equal(record.moduleSha256,crypto.createHash('sha256').update(fs.readFileSync(record.module)).digest('hex'));
 });
}
console.log(JSON.stringify({schemaVersion:'rcap-recovery-regressions/v1',passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,tests:results,grantsApproval:false,productionTouched:false},null,2));
if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
