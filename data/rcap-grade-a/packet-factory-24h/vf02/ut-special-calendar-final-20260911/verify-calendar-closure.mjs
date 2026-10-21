import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {
  specialCertificateStageGate as gate,
  buildUtahSpecialCertificate as build,
  SPECIAL_CERTIFICATE_FIXTURE_STAGE_INPUT as FIXTURE
} from '../../../../../scripts/build-census-v1-ut_pet_special_certificate-set.mjs';

const OUT='data/rcap-grade-a/packet-factory-24h/vf02/ut-special-calendar-final-20260911';
const FAMILY='data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill';
const DAY=86400000;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const save=(name,data)=>fs.writeFileSync(`${OUT}/${name}`,JSON.stringify(data,null,2)+'\n');
const describe=value=>value instanceof Date ? {type:'Date',value:Number.isFinite(value.valueOf())?value.toISOString():'Invalid Date'}
 : typeof value==='undefined' ? {type:'undefined'}
 : typeof value==='number'&&!Number.isFinite(value) ? {type:'number',value:String(value)}
 : {type:typeof value,value};
const snapshot=()=>Object.fromEntries(fs.readdirSync(FAMILY,{recursive:true}).filter(p=>fs.statSync(`${FAMILY}/${p}`).isFile()).sort().map(p=>{
 const file=`${FAMILY}/${p}`,s=fs.statSync(file);return[p,{sha256:sha(fs.readFileSync(file)),bytes:s.size,mtimeMs:s.mtimeMs,ctimeMs:s.ctimeMs}];
}));
const before=snapshot();
const counts={},failures=[],selected=[];
function check(group,name,input,expected,wrapper=false) {
 const actual=gate(input);const passed=actual.status===expected.status&&(!expected.reason||actual.reason===expected.reason);
 counts[group]??={checks:0,passed:0};counts[group].checks++;counts[group].passed+=Number(passed);
 if(!passed)failures.push({group,name,input,expected,actual});
 if(wrapper)selected.push({group,name,input,expected,actual});
}
const put=(input,field,value)=>{if(field==='asOf')input.asOf=value;else input.certificate[field]=value;return input;};
const around=(field,value,instant)=>{
 const input=structuredClone(FIXTURE);
 input.certificate.issuedAt=new Date(instant-30*DAY).toISOString();
 input.certificate.expiresAt=new Date(instant+30*DAY).toISOString();
 input.asOf=new Date(instant).toISOString();
 if(field==='issuedAt')input.asOf=new Date(instant+DAY).toISOString();
 if(field==='expiresAt')input.asOf=new Date(instant-DAY).toISOString();
 return put(input,field,value);
};

// Independent oracle: Date.UTC rolls arbitrary day inputs, then a round trip
// verifies that the resulting UTC year/month/day still equals the stated date.
// The production month-length/leap-year implementation is not copied or called.
for(const year of [1900,2000,2024,2026,2100,2400]) for(let month=1;month<=12;month++) for(let day=0;day<=32;day++) {
 const instant=Date.UTC(year,month-1,day),round=new Date(instant);
 const valid=round.getUTCFullYear()===year&&round.getUTCMonth()===month-1&&round.getUTCDate()===day;
 const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 for(const field of ['issuedAt','expiresAt','asOf']) for(const suffix of ['', 'T00:00:00Z']) {
  const input=around(field,date+suffix,instant);
  check('calendar-round-trip',`${field}:${date}${suffix}`,input,{status:valid?'ALLOW_STAGE_2':'REFUSE',...(!valid?{reason:field==='asOf'?'INVALID_AS_OF':'CERTIFICATE_DATES_REQUIRED'}:{})});
 }
}
const typeCases=[['null',null],['false',false],['true',true],['zero',0],['epoch-number',1790000000000],['NaN',NaN],['Infinity',Infinity],['object',{}],['array',[]],['invalid-Date',new Date(NaN)]];
for(const field of ['issuedAt','expiresAt','asOf']) for(const [name,value] of typeCases) {
 const input=put(structuredClone(FIXTURE),field,value);
 check('invalid-types',`${field}:${name}`,input,{status:'REFUSE',reason:field==='asOf'?'INVALID_AS_OF':'CERTIFICATE_DATES_REQUIRED'},['null','epoch-number','invalid-Date'].includes(name));
}
for(const field of ['issuedAt','expiresAt','asOf']) {
 const input=put(structuredClone(FIXTURE),field,undefined);
 check('undefined-default',field,input,field==='asOf'?{status:'ALLOW_STAGE_2'}:{status:'REFUSE',reason:'CERTIFICATE_DATES_REQUIRED'},true);
}
const invalidText=['',' ','2026-00-01','2026-13-01','2026-08-00','2026-08-32','2026-06-31','2025-02-29','2026-02-30','2026-9-11','09/11/2026','2026-09-11suffix','2026-09-11T24:00:00Z','2026-09-11T12:60:00Z','2026-09-11T12:00:60Z','2026-09-11T12:00:00+24:00','2026-09-11T12:00:00+01:60','2026-09-11T12:00:00+0100','2026-09-11T12:00:00.1234567890Z','2026-09-11T12:00:00Z trailing'];
for(const field of ['issuedAt','expiresAt','asOf'])for(const text of invalidText) {
 const input=put(structuredClone(FIXTURE),field,text);
 check('invalid-format-or-component',`${field}:${text}`,input,{status:'REFUSE',reason:field==='asOf'?'INVALID_AS_OF':'CERTIFICATE_DATES_REQUIRED'},['2026-06-31','2026-02-30','2026-09-11T24:00:00Z','2026-09-11T12:00:00+24:00'].includes(text));
}
const validText=['2024-02-29','2000-02-29','2400-02-29','2026-08-01','2026-08-01T00:00Z','2026-08-01T00:00:00Z','2026-08-01T00:00:00.1Z','2026-08-01T00:00:00.123Z','2026-08-01T00:00:00.123456789Z','2026-08-01T01:00:00+01:00','2026-08-01T23:30:00-02:00',' 2026-08-01 ','2026-08-01T00:00:00'];
for(const field of ['issuedAt','expiresAt','asOf'])for(const text of validText) {
 const instant=Date.parse(text.trim());assert.ok(Number.isFinite(instant));
 const input=around(field,text,instant);
 check('valid-formats',`${field}:${text}`,input,{status:'ALLOW_STAGE_2'},['2024-02-29','2000-02-29','2026-08-01T00:00:00.123Z','2026-08-01T01:00:00+01:00','2026-08-01T23:30:00-02:00'].includes(text));
}
for(const field of ['issuedAt','expiresAt','asOf']) {
 const input=structuredClone(FIXTURE);put(input,field,new Date(field==='asOf'?input.asOf:input.certificate[field]));
 check('valid-Date-objects',field,input,{status:'ALLOW_STAGE_2'},true);
}
const originalCases=[
 ['old-impossible-issue',{asOf:'2026-09-11',issuedAt:'2026-06-31',expiresAt:'2026-12-01'},'CERTIFICATE_DATES_REQUIRED'],
 ['old-impossible-expiry',{asOf:'2026-09-11',issuedAt:'2026-09-10',expiresAt:'2027-02-30'},'CERTIFICATE_DATES_REQUIRED'],
 ['old-impossible-asof',{asOf:'2026-09-31',issuedAt:'2026-08-01',expiresAt:'2027-01-28'},'INVALID_AS_OF']
];
for(const [name,dates,reason] of originalCases) {
 const input=structuredClone(FIXTURE);input.asOf=dates.asOf;input.certificate.issuedAt=dates.issuedAt;input.certificate.expiresAt=dates.expiresAt;
 check('original-defect',name,input,{status:'REFUSE',reason},true);
}
const oldGuards=[
 ['valid-existing',()=>{},'ALLOW_STAGE_2'],
 ['missing-certificate',x=>delete x.certificate,'REFUSE','SPECIAL_CERTIFICATE_REQUIRED'],
 ['wrong-type',x=>x.certificate.type='UT_BCI_CERTIFICATE','REFUSE','WRONG_CERTIFICATE_TYPE'],
 ['wrong-family',x=>x.certificate.familyId='other','REFUSE','WRONG_CERTIFICATE_FAMILY'],
 ['both-episodes-absent',x=>{delete x.episodeId;delete x.certificate.episodeId;},'REFUSE','CERTIFICATE_EPISODE_REQUIRED'],
 ['wrong-episode',x=>x.episodeId='other','REFUSE','WRONG_CERTIFICATE_EPISODE'],
 ['no-expected-identity',x=>delete x.expectedDocumentSha256,'REFUSE','EXPECTED_CERTIFICATE_IDENTITY_REQUIRED'],
 ['wrong-expected-identity',x=>x.expectedDocumentSha256='f'.repeat(64),'REFUSE','CERTIFICATE_IDENTITY_MISMATCH'],
 ['bad-certificate-identity',x=>x.certificate.documentSha256='bad','REFUSE','CERTIFICATE_IDENTITY_PROOF_REQUIRED'],
 ['future-issue',x=>x.certificate.issuedAt='2026-09-12','REFUSE','CERTIFICATE_ISSUED_IN_FUTURE'],
 ['expired-exact',x=>x.certificate.expiresAt=x.asOf,'REFUSE','SPECIAL_CERTIFICATE_EXPIRED'],
 ['180-days-plus-one-ms',x=>x.certificate.expiresAt='2027-01-28T00:00:00.001Z','REFUSE','SPECIAL_CERTIFICATE_VALIDITY_EXCEEDS_180_DAYS']
];
for(const [name,mutate,status,reason] of oldGuards){const input=structuredClone(FIXTURE);mutate(input);check('existing-guards',name,input,{status,...(reason?{reason}:{})},true);}

const mutators=['mkdirSync','writeFileSync','appendFileSync','renameSync','unlinkSync','rmSync','copyFileSync'];
const originals=Object.fromEntries(mutators.map(key=>[key,fs[key]]));
const wrapperResults=[];
for(const test of selected) {
 let attemptedMutation=null,error=null;
 for(const method of mutators)fs[method]=(...args)=>{attemptedMutation={method,path:String(args[0])};throw new Error('VF02_CALENDAR_CLOSURE_WRITE_BARRIER');};
 try {await build({noRaster:true,stageInput:test.input});}
 catch(e){error={name:e.name,message:e.message};}
 finally {for(const method of mutators)fs[method]=originals[method];}
 const passed=test.expected.status==='REFUSE'
  ? attemptedMutation===null&&error?.message.includes(test.expected.reason)
  : attemptedMutation?.method==='mkdirSync'&&error?.message==='VF02_CALENDAR_CLOSURE_WRITE_BARRIER';
 const actualInput={...test.input,asOf:describe(test.input.asOf),certificate:test.input.certificate?{...test.input.certificate,issuedAt:describe(test.input.certificate.issuedAt),expiresAt:describe(test.input.certificate.expiresAt)}:null};
 const row={name:test.name,group:test.group,input:actualInput,expected:test.expected,gateResult:test.actual,attemptedMutation,error,passed};
 wrapperResults.push(row);if(!passed)failures.push(row);
}
const after=snapshot();
assert.deepEqual(after,before,'family bytes or metadata changed');
const report={familyId:'ut_pet_special_certificate-set',base:'5c52ec5a7931e45d58fb0b259c5657a8f7c77923',
 method:'Independent round-trip calendar oracle and chosen negative/positive inputs exercise the actual exported gate. Selected inputs also traverse the real wrapper under a barrier that throws BEFORE every filesystem mutation. No successful build, PDF save or raster occurs.',
 narrowCorrectionReviewed:'exactCalendarInstant validates string structure, Gregorian calendar components and time components before Date construction; accepts finite Date objects. All three gate date inputs use it. Existing identity, temporal-order and180day checks remain unchanged. No host/packet/source changes.',
 pureChecks:Object.values(counts).reduce((n,c)=>n+c.checks,0),counts,wrapperCases:wrapperResults.length,wrapperRefusals:wrapperResults.filter(r=>r.expected.status==='REFUSE').length,wrapperValidPreserved:wrapperResults.filter(r=>r.expected.status==='ALLOW_STAGE_2').length,failures,
 originalDefectClosed:originalCases.every(([name])=>wrapperResults.find(r=>r.name===name)?.passed),
 unchangedFamilyBytesAndMetadata:true,familyFilesBefore:before,wrapperResults};
save('calendar-closure-results.json',report);
console.log(JSON.stringify({pureChecks:report.pureChecks,counts,wrapperCases:report.wrapperCases,wrapperRefusals:report.wrapperRefusals,wrapperValidPreserved:report.wrapperValidPreserved,failures:failures.length,unchangedFamilyFiles:Object.keys(before).length,originalDefectClosed:report.originalDefectClosed}));
assert.equal(failures.length,0,'calendar closure failed');
