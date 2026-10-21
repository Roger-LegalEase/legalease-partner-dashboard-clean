// In-memory read interception only: run the real exported --check branch.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {run, DEFAULT_SOURCE, OUT} from '../../../../../scripts/build-census-v1-fl-10yr-bridge-set.mjs';
const originalRead=fs.readFileSync, originalExists=fs.existsSync;
const root=process.cwd();
const read=p=>originalRead(path.join(root,p));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=[];
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const child=path.join(p,e.name);if(e.isDirectory())walk(child);else files.push(child);}}
walk(path.join(root,OUT));files.push(path.join(root,DEFAULT_SOURCE));
const snapshot=()=>files.map(p=>{const s=fs.statSync(p);return [p,hash(originalRead(p)),s.size,s.mode,s.mtimeMs,s.ctimeMs];});
const before=snapshot(),controls=[];
const phrases=[
'ordinary declaration and signature line printed on the petition is not the required sworn affidavit',
'complete a separate sworn affidavit',
'notarized unless you swear it before a deputy clerk',
'Obtain the currently accepted affidavit format from the circuit clerk or an attorney before filing',
'clerk of the court that sealed the record for a certified copy of the sealing order',
'Compare your answer to "On what date was the record sealed by court order?" against that certified copy, and correct the packet if they disagree',
'any hearing is required or set'];
const jsonMutation=(p,mutate)=>({path:p,transform:b=>{const d=JSON.parse(b);mutate(d);return Buffer.from(JSON.stringify(d));}});
const cases=[
{id:'valid-current-bytes',expectRefusal:false},
{id:'source-absent',missing:DEFAULT_SOURCE,expectRefusal:true},
{id:'source-length-wrong',path:DEFAULT_SOURCE,transform:b=>b.subarray(1),expectRefusal:true},
{id:'same-length-source-corrupt',path:DEFAULT_SOURCE,transform:b=>{b=Buffer.from(b);b[100]^=1;return b;},expectRefusal:true},
...phrases.map((phrase,i)=>({id:`omitted-guidance-${i+1}`,phrase,path:`${OUT}/participant-instructions.md`,transform:b=>Buffer.from(b.toString().replaceAll(phrase,'[omitted]')),expectRefusal:true})),
{id:'canonical-pdf-corrupt',path:`${OUT}/fixtures/canonical.pdf`,transform:b=>{b=Buffer.from(b);b[100]^=1;return b;},expectRefusal:true},
{id:'stale-artifact-hash',...jsonMutation(`${OUT}/reports/rendered-artifacts.json`,d=>d.artifacts[0].sha256='0'.repeat(64)),expectRefusal:true},
{id:'old-name-coordinate-in-map',...jsonMutation(`${OUT}/production-field-map.json`,d=>d.sourceMeasuredPlacements.page1_last_name.y=686),expectRefusal:true},
{id:'stale-glyph-counter',...jsonMutation(`${OUT}/reports/actual-writes.json`,d=>d.documents[0].addedGlyphsReadFromOutputBytes=0),expectRefusal:true},
{id:'record-omits-hearing-stop',...jsonMutation('data/record-clearing/legal-design-intake/FL.memo.json',d=>{const t=d.tracks.find(t=>t.trackId==='fl-10yr-bridge');t.selfHelpStopConditions=t.selfHelpStopConditions.filter(x=>x!=='Any hearing.');}),expectRefusal:true},
{id:'service-section-omitted-scope-control',path:`${OUT}/participant-instructions.md`,transform:b=>Buffer.from(b.toString().replace(/## Certificate of service[\s\S]*?(?=## Protected fields)/,'')),expectRefusal:false}
];
for(const c of cases){
 fs.readFileSync=function(p,...args){const rel=typeof p==='string'?path.relative(root,path.resolve(p)).replaceAll(path.sep,'/'):null;if(rel!==c.path)return originalRead(p,...args);const b=c.transform(originalRead(p));return typeof args[0]==='string'||args[0]?.encoding?b.toString():b;};
 fs.existsSync=function(p){if(c.missing&&path.resolve(String(p))===path.join(root,c.missing))return false;return originalExists(p);};
 let refused=false,error=null;
 try{await run(['--check']);}catch(e){refused=true;error=e.message;}
 finally{fs.readFileSync=originalRead;fs.existsSync=originalExists;}
 assert.equal(refused,c.expectRefusal,c.id);
 controls.push({id:c.id,phrase:c.phrase??null,entrypoint:'run(["--check"]) from current unmodified builder',refused,expectedRefusal:c.expectRefusal,error});
}
assert.deepEqual(snapshot(),before);
console.log(JSON.stringify({schemaVersion:'rcap-vf01-current-entrypoint-controls/v1',familyId:'fl-10yr-bridge-set',builderSha256:hash(read('scripts/build-census-v1-fl-10yr-bridge-set.mjs')),controls,negativeControlsRefused:controls.filter(c=>c.refused).length,repositoryInputsUnchanged:true,inMemoryOnly:true,limitation:'Current --check does not validate the service paragraph or call serviceRequirement. The service-omission scope control is accepted; this is not a negative PASS. SERVICE is independently supported by exact current paragraph, unchanged legal bindings and the prior unchanged helper controls, not by this command.'},null,2));
