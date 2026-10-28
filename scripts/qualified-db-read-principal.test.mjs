import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {hash} from './qualified-production-database.mjs';
import {loadQualifiedDatabasePackage} from './qualified-production-database-package.mjs';
import {QUALIFIED_DATABASE_PACKAGE_SHA256} from './grade-a-launch-control/qualified-production-database-binding.mjs';
const root=process.cwd(),current=fs.readFileSync('scripts/qualified-production-database-runtime.mjs','utf8'),source=await loadQualifiedDatabasePackage(root,QUALIFIED_DATABASE_PACKAGE_SHA256);
// Synthetic actor-only responses reproduce the observed API role switch; no native catalog/poststate is manufactured.
function capture(code,{sqlReadOnly='on'}={}){
 const files=new Map(),requests=[],output='/synthetic-custody';
 const write=(name,value,raw=false)=>{const bytes=raw?Buffer.from(value):Buffer.from(JSON.stringify(value)+'\n');files.set(name,bytes);return{path:name,sha256:hash(bytes)};};
 const fetchImpl=async(url,options)=>{const body=JSON.parse(options.body);requests.push(body);const actor=body.read_only?'supabase_read_only_user':'postgres';return new Response(JSON.stringify([{catalog:{transaction_read_only:sqlReadOnly,database:'postgres',current_user:actor,session_user:actor}}]),{status:201});};
 const queryText=code.slice(code.indexOf('const query=async')+'const query='.length,code.indexOf('\n const result=await')).trim().replace(/;$/,'');
 const query=new Function('write','fs','path','output','hash','fetchImpl','API','PROJECT','env','assert','return ('+queryText+');')(write,{readFileSync:p=>files.get(path.basename(p))},path,output,hash,fetchImpl,'https://api.supabase.com/v1/projects/wwtwtsmywnckfkdaqqeg','wwtwtsmywnckfkdaqqeg',{SUPABASE_ACCESS_TOKEN:'synthetic-token'},assert);
 const readText=code.slice(code.indexOf('readState:async')+'readState:'.length,code.indexOf('\n  assertState:')).trim().replace(/,$/,'');
 const read=new Function('source','comparison','query','write','return ('+readText+');')(source,source.comparison,query,write);
 return{requests,read};
}
test('actual request/read-state code retains postgres with API false and unchanged BEGIN READ ONLY SQL',async()=>{
 const c=capture(current);await c.read('synthetic-read');assert.equal(c.requests.length,3);
 c.requests.forEach((body,i)=>{assert.equal(body.read_only,false);assert.equal(body.query,source.readers[i].sql);assert.match(body.query,/^(?:--[^\n]*\n)*BEGIN READ ONLY;/);});
});
test('previous API true role switch reproduces guard refusal; SQL read-only predicate remains mandatory',async()=>{
 const previous=execFileSync('git',['show','f55de37acde2069f77b2b0891a555249e9f25ec3:scripts/qualified-production-database-runtime.mjs'],{encoding:'utf8'}),old=capture(previous);
 await assert.rejects(old.read('synthetic-old-read'),e=>e.code==='ERR_ASSERTION'&&e.actual==='supabase_read_only_user'&&e.expected==='postgres');assert(old.requests.every(r=>r.read_only===true));
 await assert.rejects(capture(current,{sqlReadOnly:'off'}).read('synthetic-not-readonly'),e=>e.code==='ERR_ASSERTION'&&e.actual==='off'&&e.expected==='on');
});

test('actor-only relabeling cannot erase the observed search-path context mismatch',()=>{
 const c=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/qualified-release-evidence/C-406135-NO-EFFECT-DISPOSITION.json'));
 const observed=structuredClone(c.actualReadonlyTransportContext),expected=structuredClone(observed);
 for(const scope of Object.keys(observed)){observed[scope].current_user='postgres';observed[scope].session_user='postgres';expected[scope].current_user='postgres';expected[scope].session_user='postgres';expected[scope].search_path='"\\$user", public, extensions';}
 assert.notEqual(source.comparison.stateSha256(observed),source.comparison.stateSha256(expected));
 assert.equal(source.manifest.beforeStateSha256,'1e4fa54085fd76e91c2edb7fe68a97fd7a6575b01b9068c2d1031c3cab2acf2c');
});
