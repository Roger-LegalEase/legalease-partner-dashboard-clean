// Pure validation and text-function checks; never renders or changes candidate bytes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import vm from 'node:vm';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import {validateKy} from '../../../../../scripts/rcap-packet-recovery/ky-misdemeanor.mjs';
const OUT=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(OUT,'../../../../..');assert.equal(process.cwd(),ROOT);
const DIR='data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),base=read(`${DIR}/fixtures/canonical.facts.json`),source=fs.readFileSync('scripts/rcap-packet-recovery/ky-misdemeanor.mjs','utf8');
const scheduleSource=source.slice(source.indexOf('function scheduleSections(f)'),source.indexOf('async function appendComponent'));
const displayDate=value=>value?`${value.slice(5,7)}/${value.slice(8,10)}/${value.slice(0,4)}`:'';
const schedule=vm.runInNewContext(`(${scheduleSource})`,{displayDate});
const cases=[];
for(const [name,mutate] of [
 ['canonical has no citizenship/immigration answer',f=>{}],
 ['known non-US citizenship does not itself stop',f=>{f.participant.isUsCitizen=false}],
 ['same-case dismissed companion with explicit disposition',f=>{f.charges.push({...f.charges[0],count:'2',description:'Companion charge recorded as dismissed',disposition:'dismissed',dispositionDate:'2018-07-01'})}],
 ['same-case amended companion with explicit disposition',f=>{f.charges.push({...f.charges[0],count:'2',description:'Companion charge recorded as amended',disposition:'amended',dispositionDate:'2018-07-01'})}],
 ['same-case mixed eligible classifications',f=>{f.charges.push({...f.charges[0],count:'2',description:'Companion violation',classification:'violation'})}],
 ['non-Kentucky mailing address accepted by source dropdown',f=>{f.participant.state='Ohio'}],
 ['ambiguous ordinary and void grounds',f=>f.record.groundsClaimed.push('controlled_substances_void_218A275_8')],
 ['proposed order without confirmed local practice',f=>f.options.includeProposedOrder=true],
 ['immigrationAdviceNeeded true does stop',f=>f.confirmations.immigrationAdviceNeeded=true]
]){const f=structuredClone(base);mutate(f);let r;try{const v=validateKy(f);r={accepted:true,election:v.election,scheduleText:schedule(f)}}catch(e){r={accepted:false,error:e.message}}cases.push({name,facts:f,...r})}
const guide=fs.readFileSync(`${DIR}/participant-instructions.md`,'utf8');
const probes={mentionsUsCitizenship:/citizen/i.test(guide),mentionsImmigrationAdvice:/immigration advice is needed/.test(guide),identifiesCertificationIssuer:/Administrative Office|Records Unit/i.test(guide),identifiesCertificationRequestForm:/RU.?009/i.test(guide),linksCertificationAction:/https?:|\]\(/.test(guide),explainsIndigencyAffidavit:/affidavit|indigen/i.test(guide),explainsMotionToProceed:/motion/i.test(guide),preservesRefundUnresolved:/refund treatment unresolved/.test(guide)};
const scheduleTrigger=read(`${DIR}/reports/canonical.json`).writes.filter(w=>w.completeValue!==w.value).map(w=>({field:w.field,value:w.value,completeValue:w.completeValue??null}));
const textPages=[];for(const fixture of ['canonical','boundary','selectable/ordinary-traffic','selectable/ordinary-violation','selectable/void-218a275-8','selectable/void-218a276-8']){const pages=execFileSync('pdftotext',['-layout',`${DIR}/fixtures/${fixture}.pdf`,'-'],{encoding:'utf8'}).split('\f');textPages.push({fixture,pages:pages.filter(p=>p.trim()).map((text,i)=>({page:i+1,text}))})}
const result={schemaVersion:'vf62-ky-source-contract-measurements/v1',method:'Called only real validateKy and extracted real scheduleSections in memory. No renderKy/runKy call, no PDF generation, and no source edits. The citizenship key probe illustrates missing collection; guidance alone supplies the directly observed contract defect. Same-case probes assess the builder capability, not nonexistent errors in homogeneous retained fixtures.',cases,guideProbes:probes,unconditionalScheduleTrigger:scheduleTrigger,scheduleFunctionSource:scheduleSource,currentPdfTextPages:textPages};
fs.writeFileSync(path.join(OUT,'source-contract-measurements.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({cases:cases.map(c=>({name:c.name,accepted:c.accepted,error:c.error})),guideProbes:probes,scheduleTrigger},null,2));
