import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {inspectShippedCaptcha,readShippedCaptcha} from './rcap-clinic-resume-captcha.mjs';
import {readResumeCaptchaPolicy} from './rcap-clinic-resume-network-policy.mjs';
const require=createRequire(import.meta.url),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const lock=JSON.parse(fs.readFileSync('package-lock.json'));for(const p of ['next','typescript'])assert.equal(require(p+'/package.json').version,lock.packages['node_modules/'+p].version);assert.equal(require('next/package.json').version,'16.2.6');
// Supply the extracted, checksummed review archive. Never assume the reviewer's
// filesystem, and never rebuild its eight already-compiled variants.
assert.ok(process.env.RCAP_TURBOPACK_FIXTURES,'RCAP_TURBOPACK_FIXTURES must name the extracted CLAUDE_TURBOPACK_CAPTCHA_FIXTURES_658d2368 directory');
const fixtureRoot=path.resolve(process.env.RCAP_TURBOPACK_FIXTURES);
const manifest=fs.readFileSync(path.join(fixtureRoot,'SHA256SUMS'),'utf8').trim().split('\n');assert.equal(manifest.length,110);
for(const line of manifest){const [,expected,relative]=line.match(/^([a-f0-9]{64})\s+(.+)$/);const file=path.resolve(fixtureRoot,relative);assert.ok(file.startsWith(fixtureRoot+path.sep));assert.equal(hash(fs.readFileSync(file)),expected,relative);}
assert.equal(fs.readFileSync(path.join(fixtureRoot,'lib/captcha.ts'),'utf8'),fs.readFileSync('src/lib/auth/captcha.ts','utf8'));
const origin='https://legalease-rcap-clinic-af638b61cc4b-roger947s-projects.vercel.app',applicationSha='af638b61cc4b74afad972fa79c4c1ca3f6709540',deployment={id:'dpl_Gf6uwETvQNbKXAMCcxLE6ECxLhNR',gitSource:{sha:applicationSha}};
function fixture(name){const dir=path.join(fixtureRoot,'variants',name),html=fs.readFileSync(path.join(dir,'server/sign-in.html'),'utf8');const urls=[...new Set([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1]).filter(u=>u.startsWith('/_next/static/')&&u.endsWith('.js')))];return {name,html,chunks:urls.map(url=>({url,body:fs.readFileSync(path.join(dir,'static',url.replace('/_next/static/','')),'utf8')}))};}
const optional=fixture('multi-route-optional-with-key');
function reader(f=optional,overrides={}){
 const calls=[];const fetchImpl=async(url,options)=>{calls.push({url,options});assert.equal(new URL(url).origin,origin);assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.headers['x-vercel-skip-toolbar'],'1');assert.equal(options.headers['x-vercel-protection-bypass'],'private-test');const pathname=new URL(url).pathname;if(pathname==='/expungement-ai/sign-in')return new Response(f.html);const chunk=f.chunks.find(c=>c.url===pathname);assert.ok(chunk,'HTML must resolve to actual fixture bytes');return new Response(chunk.body);};
 return {calls,result:readShippedCaptcha({origin,applicationSha,deployment,bypass:'private-test',fetchImpl,...overrides})};
}
const matrix=[];
for(const name of fs.readdirSync(path.join(fixtureRoot,'variants')).sort())test(`supplied runner / complete HTML path: ${name}`,()=>{
 const result=JSON.parse(execFileSync(process.execPath,[path.join(fixtureRoot,'reader-on-variant.mjs'),path.resolve('scripts/rcap-clinic-resume-captcha.mjs'),path.join(fixtureRoot,'variants',name)],{encoding:'utf8'}));assert.match(result.bundler,/turbopack/);assert.equal(result.chunkReads,7);
 if(name==='multi-route-optional-with-key'){assert.equal(result.accepted,true,JSON.stringify(result));assert.equal(result.proof.clientCaptchaRequired,false);assert.equal(result.proof.widgetSiteKeyConfigured,true);assert.ok(result.proof.guards.every(g=>g.moduleFormat==='turbopack'&&g.guardExport==='isAuthCaptchaRequired'));}
 else {assert.equal(result.accepted,false,JSON.stringify(result));if(name.startsWith('multi-route-')){assert.doesNotMatch(result.error,/guard not identified|malformed Turbopack/);assert.match(result.error,/requires CAPTCHA|unresolved|unsupported helper/);}}
 matrix.push(result);console.log(JSON.stringify(result));
});
// Mutate the actual merged factory, preserving its group of registered IDs.
function mutateHelper(change){const proof=inspectShippedCaptcha(optional.chunks),id=proof.guards[0].moduleId;let changed=0;
 const chunks=optional.chunks.map(c=>{const sf=ts.createSourceFile('chunk.js',c.body,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let target;
  const walk=n=>{if(ts.isArrayLiteralExpression(n)){let ids=[];for(const el of n.elements){if(ts.isNumericLiteral(el))ids.push(el.text);else {if((ts.isArrowFunction(el)||ts.isFunctionExpression(el))&&ids.includes(id))target=el;ids=[];}}}ts.forEachChild(n,walk);};walk(sf);if(!target)return c;
  const old=target.getText(sf),next=change(old,id);assert.notEqual(next,old,'mutation missing');changed++;return {...c,body:c.body.slice(0,target.getStart(sf))+next+c.body.slice(target.end)};
 });assert.equal(changed,1);return {...optional,chunks};
}
test('closed helper only: merged React/JSX imports and an unrelated throwing widget/factory are never executed',async()=>{
 const base=await reader().result;assert.equal(base.clientCaptchaRequired,false);
 const trap=mutateHelper(s=>s.replace('"use strict";','"use strict";throw Error("factory must never execute");'));
 const noChunk={...trap,chunks:trap.chunks.map(c=>({...c,body:`throw Error('chunk must never execute');\n${c.body}`}))};assert.equal((await reader(noChunk).result).widgetSiteKeyConfigured,true);
 const shadowed=mutateHelper(s=>s.replace('"use strict";','"use strict";function unrelated(t){t="unrelated";}'));assert.equal((await reader(shadowed).result).clientCaptchaRequired,false);
 const imported=mutateHelper(s=>s.replace(/\.i\(/g,'.unknownDependency('));assert.equal((await reader(imported).result).clientCaptchaRequired,false,'unrelated factory import graph must not matter');
});
test('value/getter semantics select only the helper export list, not the widget list',async()=>{
 const getter=mutateHelper(s=>s.replace('"getTurnstileSiteKey",0,t','"getTurnstileSiteKey",()=>t'));
 assert.equal((await reader(getter).result).widgetSiteKeyConfigured,true);
 const errorGetter=mutateHelper(s=>s.replace('"authCaptchaFailureMessage",0,','"authCaptchaFailureMessage",()=>'));assert.equal((await reader(errorGetter).result).clientCaptchaRequired,false);
 for(const tag of ['1','null','false','"invalid"'])await assert.rejects(reader(mutateHelper(s=>s.replace('"authCaptchaFailureMessage",0,',`"authCaptchaFailureMessage",${tag},`))).result,/export tag/);
 for(const replace of [s=>s.replace('"authCaptchaFailureMessage",0,','"authCaptchaFailureMessage",'),s=>s.replace('"authCaptchaFailureMessage",0,','"authCaptchaFailureMessage",()=>1,()=>2,'),s=>s.replace('"authCaptchaFailureMessage",0,','"authCaptchaFailureMessage",0,"duplicate","authCaptchaFailureMessage",0,'),s=>s.replace('"authCaptchaFailureMessage",0,','"authCaptchaFailureMessage",0,' ).replace(',81974)',',42398)')])await assert.rejects(reader(mutateHelper(replace)).result,/export/);
 const badTarget=mutateHelper(s=>s.replace(',81974)',',123456789)'));await assert.rejects(reader(badTarget).result,/unregistered helper export target/);
 const conflict=mutateHelper(s=>s.replace(',81974)',',81974),e.s(["extra",0,1],81974)'));await assert.rejects(reader(conflict).result,/conflicting helper export list/);
});
test('required expressions cannot depend on imports, environment, free names, reassigned locals or unsupported evaluation',async()=>{
 for(const expr of ['undefined','process.env.KEY','e.i(123)','unknownValue','globalThis.secret','(()=>false).constructor("return false")()']){
  const changed=mutateHelper(s=>s.replace('"false"!=="false".trim().toLowerCase()',expr));await assert.rejects(reader(changed).result,/helper/);
 }
 const reassigned=mutateHelper(s=>s.replace('e.i(37317)', 't=()=>"invented";e.i(37317)'));await assert.rejects(reader(reassigned).result,/mutable helper dependency/);
 const empty=mutateHelper(s=>s.replace('0x4AAAAAAAfixtureSiteKey',''));await assert.rejects(reader(empty).result,/site key must be configured/);
 const keyDependency=mutateHelper(s=>s.replace('"0x4AAAAAAAfixtureSiteKey"','e.i(123)'));await assert.rejects(reader(keyDependency).result,/helper/);
 const nonBoolean=mutateHelper(s=>s.replace('"false"!=="false".trim().toLowerCase()','"false"'));await assert.rejects(reader(nonBoolean).result,/must be boolean/);
});
test('module conflicts, wrong imports, malformed registrations and ambiguous guards refuse',async()=>{
 const conflict=mutateHelper(s=>s.replace('0x4AAAAAAAfixtureSiteKey','different'));assert.throws(()=>inspectShippedCaptcha([...optional.chunks,...conflict.chunks]),/conflicting shipped module/);
 const wrongImport={...optional,chunks:optional.chunks.map(c=>({...c,body:c.body.replaceAll('.i(81974)','.notImport(81974)')}))};await assert.rejects(reader(wrongImport).result,/guard not identified/);
 let inserted=0;const ambiguous={...optional,chunks:optional.chunks.map(c=>({...c,body:c.body.replace(/if\(\(0,([a-z])\.isAuthCaptchaRequired\)\(\)&&!([a-z])\.trim\(\)\)/,(match,alias,token)=>{inserted++;return `if((0,${alias}.otherRequirement)()&&!${token}.trim()){${alias}.authCaptchaFailureMessage;return}${match}`;})}))};
 assert.equal(inserted,1);await assert.rejects(reader(ambiguous).result,/ambiguous shipped CAPTCHA guard/);
 for(const body of ['invalid {','(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push([null,123]);'])assert.throws(()=>inspectShippedCaptcha([{body}]),/unreadable|malformed/);
});
test('complete reader retains header confinement, exact binding, SSO/redirect/non-200 and missing-chunk refusals',async()=>{
 const {calls,result}=reader();await result;assert.equal(calls.length,8);
 for(const options of [{deployment:{...deployment,id:'dpl_wrong'}},{applicationSha:'0'.repeat(40)},{origin:'https://lookalike.invalid'},{fetchImpl:async()=>new Response('SSO')},{fetchImpl:async()=>{throw Error('private redirect');}}])await assert.rejects(reader(optional,options).result);
 for(const status of [201,204,301,302,400,401,500])await assert.rejects(reader(optional,{fetchImpl:async()=>new Response(status===204?null:'unavailable',{status})}).result,/shipped CAPTCHA read HTTP/);
 await assert.rejects(reader({...optional,chunks:[]}).result);
});
test('server true/missing/non-boolean/unreadable still refuses; no raw config, key or private value is serialized',async()=>{
 const frontend=await reader().result,args={project:'hyflxnlhpmiqxvvcoiia',token:'private',frontend,fetchImpl:async()=>new Response(JSON.stringify({security_captcha_enabled:false,secret:'DO NOT EMIT'}))};const proof=await readResumeCaptchaPolicy(args);
 for(const raw of ['DO NOT EMIT','0x4AAAAAAAfixtureSiteKey','private-test'])assert.ok(!JSON.stringify(proof).includes(raw));
 for(const bad of [undefined,{}, {...frontend,clientCaptchaRequired:true},{...frontend,clientCaptchaRequired:'false'}])await assert.rejects(readResumeCaptchaPolicy({...args,frontend:bad}));
 for(const body of [null,{}, {security_captcha_enabled:true},{security_captcha_enabled:'false'}])await assert.rejects(readResumeCaptchaPolicy({...args,fetchImpl:async()=>new Response(JSON.stringify(body))}));
 for(const fetchImpl of [async()=>new Response('{}',{status:401}),async()=>new Response('PRIVATE_MALFORMED_BODY'),async()=>{throw Error('PRIVATE_TRANSPORT_DETAIL');}])await assert.rejects(readResumeCaptchaPolicy({...args,fetchImpl}),error=>!error.message.includes('PRIVATE_'));
});
test('actual caller still checks exact alias and both configurations before browser launch',()=>{
 const caller=fs.readFileSync('scripts/rcap-hosted-clinic-resume.mjs','utf8');const begin=caller.indexOf('\ntry{\n const identity='),front=caller.indexOf('await readShippedCaptcha(',begin),server=caller.indexOf('await readResumeCaptchaPolicy(',begin),browser=caller.indexOf('await chromium.launch(',begin);assert.ok(begin>0&&front>begin&&server>front&&browser>server);assert.match(caller.slice(begin,front),/assert.equal\(alias.id\?\?alias.uid,deploymentId/);
});

// These legacy execution fixtures remain scoped to their actual predecessor.
// A current release binding does not turn an old Preview into a final Preview.
test('current generation is distinct from preserved historical hosted fixtures',()=>{
 const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
 const publication=JSON.parse(fs.readFileSync('data/rcap-render/worker-publication-evidence.json'));
 assert.equal(candidate.applicationSha,publication.sourceSha);
 assert.equal(candidate.workerDigest,publication.immutableRegistryDigest);
 assert.equal(candidate.hostedAcceptance.preview,null);
 assert.equal(candidate.hostedAcceptance.manualHostedFullReady,false);
 assert.equal(candidate.previewExecutionInstruction.executionAuthorized,false);
 assert.equal(candidate.supersededRecord.applicationSha,publication.supersededPublication.sourceSha);
 assert.notEqual(candidate.applicationSha,candidate.supersededRecord.applicationSha);
});
