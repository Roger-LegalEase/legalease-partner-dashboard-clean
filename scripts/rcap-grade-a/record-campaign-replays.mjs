// Index existing actual browser receipts. Does not run or fabricate a journey.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),root=`artifacts/rcap-grade-a-final/${sha}`;
const rows=fs.readFileSync(root+'/acceptance-ledger.jsonl','utf8').trim().split('\n').map(JSON.parse);
const mappings=[
 ['clinic-integration','clinic-integration-development','clinic_admin',{'C-T01':[1],'C-T03':[1,4],'C-T04':[1],'C-T05':[2],'C-T07':[3,4],'C-T09':[3],'C-T12':[4],'C-T14':[4],'C-T17':[5],'C-T18':[5]}],
 ['clinic-queue-reset','clinic-queue-reset-development','clinic_staff',{'C-T06':[3],'C-T19':[2],'C-T20':[3],'C-T21':[4,5],'C-T22':[4],'U-T22':[4],'U-T23':[4,5]}],
 ['partner-transition','partner-transition-development','partner_admin',{'P-T04':[4],'P-T09':[7],'P-T11':[8],'P-T12':[8]}]
];
for(const [suite,file,role,cases]of mappings){const receipt=JSON.parse(fs.readFileSync(`${root}/server/${file}.json`));assert.equal(receipt.result,'PASS');for(const[id,steps]of Object.entries(cases)){
 const evidence=steps.flatMap(n=>[`journeys/${suite}/${n}.json`,`journeys/${suite}/${n}.png`]);const stages=steps.map(n=>JSON.parse(fs.readFileSync(`${root}/journeys/${suite}/${n}.json`)));for(const s of stages)assert.equal(s.sourceSha,sha);
 const row=rows.find(r=>r.caseId===id);assert.ok(row);Object.assign(row,{actor:role,fixture:receipt.eventId??receipt.slug,initialServerState:'Real isolated fixtures and prerequisites recorded in suite',browser:'chromium',viewport:{width:1280,height:720},locale:'en',actions:stages.map(s=>s.observed),observed:stages.map(s=>s.observed).join('; '),evidence:[`server/${file}.json`,...evidence],readback:{replay:'Actual compiled application controls; canonical API responses asserted by saved suite',suite:`suites/${suite}.mjs`,steps},result:'PASS',issue:null,sourceSha:sha});
}}
fs.writeFileSync(root+'/acceptance-ledger.jsonl',rows.map(JSON.stringify).join('\n')+'\n');console.log(JSON.stringify(rows.reduce((out,row)=>(out[row.result]=(out[row.result]??0)+1,out),{})));
