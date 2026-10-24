#!/usr/bin/env node
// Run only against the existing, source-bound isolated loopback application:
// PW_EXPECTED_HEAD=<40 hex> PW_APP_PID=<existing Next PID> PW_OUTPUT=<new private JSON>
// PW_APP_ROOT=<integrating worktree> node scripts/test-public-witness-api.mjs
// Stateless public profile/evaluation acceptance; no credentials or fixture writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
const root=fs.realpathSync(process.env.PW_APP_ROOT??process.cwd());
const expected=process.env.PW_EXPECTED_HEAD,pid=process.env.PW_APP_PID,out=process.env.PW_OUTPUT;
assert.match(expected??'',/^[a-f0-9]{40}$/,'exact candidate required');
assert.match(pid??'',/^\d+$/,'existing application PID required');
assert.ok(out&&path.isAbsolute(out)&&!fs.existsSync(out),'fresh private output required');
assert.ok(!path.resolve(out).startsWith(root+path.sep),'evidence must be outside the application checkout');
const origin='http://127.0.0.1:3139',hash=b=>createHash('sha256').update(b).digest('hex');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024});
function bind(){
 assert.equal(git(['rev-parse','HEAD']).trim(),expected,'candidate changed');
 git(['diff','--exit-code',expected,'--','src','data']);
 assert.equal(git(['ls-files','--others','--exclude-standard','src','data']).trim(),'','uncommitted runtime source');
 assert.equal(fs.realpathSync('/proc/'+pid+'/cwd'),root,'application working directory');
 assert.match(fs.readFileSync('/proc/'+pid+'/cmdline','utf8'),/next(?:-server|[\/\x00 ]|$)/,'existing Next process');
 const lines=execFileSync('ss',['-lptn'],{encoding:'utf8'}).split('\n').filter(l=>/127\.0\.0\.1:3139\b|\*:3139\b|\[::\]:3139\b|0\.0\.0\.0:3139\b/.test(l));
 assert.equal(lines.length,1,'one existing listener');assert.ok(lines[0].includes('pid='+pid+','),'PID owns acceptance port');
}
bind();
register(pathToFileURL(root+'/scripts/lib/ts-esm-loader.mjs'),import.meta.url);
const {getProfileByJurisdiction}=await import(pathToFileURL(root+'/src/lib/rcap-engine/profile-registry.ts'));
const {projectPublicProfile}=await import(pathToFileURL(root+'/src/lib/rcap-engine/public-profile-projection.ts'));
const witnessPath='data/rcap-ledger/public-witness-answer-sets.json';
const corpus=JSON.parse(fs.readFileSync(root+'/'+witnessPath));
const rows=corpus.witnesses.filter(w=>w.sourceBoundSyntheticWitness);
assert.equal(rows.length,6);
const expectedCodes={
 'CA:prop-64-completed-sentence-application-11361-8':['packet_ready'],
 'CA:prop-64-currently-serving-petition-11361-8':['packet_ready_with_caution'],
 'GA:restriction-and-sealing-of-a-pardoned-felony':['needs_review'],
 'MS:first-offense-controlled-substance-conditional-discharge-relief':['packet_ready','packet_ready_with_caution','needs_review'],
 'MS:nonadjudication-under-99-15-26':['packet_ready_with_caution'],
 'MS:pretrial-intervention-or-diversion-expungement':['packet_ready_with_caution']
};
for(const w of rows){
 const s=w.sourceBoundSyntheticWitness;assert.deepEqual(s.expectedTreatment.resultCodes,expectedCodes[w.pathwayKey]);
 for(const r of s.references)assert.equal(hash(fs.readFileSync(root+'/'+r.file)),r.sha256,'cited requirement fixture changed: '+r.file);
}
const bindings=Object.fromEntries([...new Set([...git(['ls-files','src']).trim().split('\n').filter(Boolean),witnessPath])].map(f=>[f,hash(fs.readFileSync(root+'/'+f))]));
const report={status:'NOT_RUN',candidate:expected,application:{root,pid:Number(pid),origin},runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),sourceManifestSha256:hash(JSON.stringify(bindings)),witnessSha256:hash(fs.readFileSync(root+'/'+witnessPath)),requests:[],checks:[],limits:['Local public HTTP acceptance only; no hosted offered-scope, authenticated, document, financial or delivery acceptance.','All facts are explicitly new synthetic examples; historical unresolved witnesses remain untouched.','Profile and evaluate endpoints are stateless; no identities or persistent fixture rows are created.'],cleanup:{required:false,reason:'No fixture creation or persistent endpoint operation'}};
const check=(name,condition)=>report.checks.push({name,pass:!!condition});
async function request(method,pathname,body){
 const response=await fetch(origin+pathname,{method,redirect:'error',signal:AbortSignal.timeout(45000),headers:body?{'content-type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 const value=await response.json();report.requests.push({method,pathname,status:response.status,...(body?{syntheticInput:body}:{}),response:value});return {status:response.status,value};
}
function controls(profile){const map=new Map();const walk=n=>{if(!n||typeof n!=='object')return;if(n.id&&n.type&&(n.prompt||n.label))map.set(n.id,n);Object.values(n).forEach(walk);};walk(profile);return map;}
try{
 const profiles=new Map();
 for(const state of ['CA','GA','MS']){
  const r=await request('GET','/api/expungement-ai/profiles/'+state);check(state+' profile HTTP200',r.status===200);
  const local=JSON.parse(JSON.stringify(projectPublicProfile(getProfileByJurisdiction(state))));check(state+' actual served profile matches candidate',JSON.stringify(r.value)===JSON.stringify(local));profiles.set(state,r.value);
 }
 for(const w of rows){
  const s=w.sourceBoundSyntheticWitness,profile=profiles.get(w.jurisdiction),map=controls(profile);
  const required=w.jurisdiction==='CA'?['ca_prop64_offense_date','ca_prop64_branch']:w.jurisdiction==='GA'?['ga_board_pardon','ga_pardoned_offense_section']:['ms_program_record_status','ms_program_final_disposition'];
  for(const key of required){const q=map.get(key);check(w.pathwayKey+' actual public control '+key,!!q);if(q?.options)check(w.pathwayKey+' synthetic option selectable '+key,q.options.includes(s.finalAnswers[key]));}
  const evaluate=async(label,answers)=>{
   const result=await request('POST','/api/expungement-ai/evaluate',{jurisdiction:w.jurisdiction,profileVersion:profile.profileVersion,matterId:'synthetic-public-witness-'+label,answers});
   check(w.pathwayKey+'/'+label+' HTTP200',result.status===200);
   check(w.pathwayKey+'/'+label+' no consumer authority',result.value.consumerPacketAvailable===false);
   check(w.pathwayKey+'/'+label+' no sponsored authority',result.value.sponsoredPacketAvailable===false);
   return result.value;
  };
  const positive=await evaluate('source-bound',s.finalAnswers);
  check(w.pathwayKey+' expected legal outcome',expectedCodes[w.pathwayKey].includes(positive.resultCode));
  check(w.pathwayKey+' expected exact pathway',positive.pathwayId===s.expectedTreatment.pathwayId);
  const key=required[0];
  for(const variant of ['missing','unknown']){
   const answers={...s.finalAnswers};if(variant==='missing')delete answers[key];else answers[key]='unknown';
   const held=await evaluate(variant,answers);check(w.pathwayKey+'/'+variant+' asks exact missing fact',held.resultCode==='needs_more_info'&&held.missingQuestionIds.includes(key));check(w.pathwayKey+'/'+variant+' no payment',held.paymentAllowed===false);
  }
  if(w.jurisdiction==='GA'){
   const denied=await evaluate('excluded-offense',{...s.finalAnswers,case_outcome:'Felony conviction',offense_level:'Felony',ga_pardoned_offense_section:'16-8-41'});
   check(w.pathwayKey+' source-cited felony exclusion',denied.resultCode==='likely_not_eligible'&&denied.paymentAllowed===false);
  }
  if(w.jurisdiction==='MS'){
   const held=await evaluate('uncompleted-requirements',{...s.finalAnswers,court_requirements_completed:'no'});
   check(w.pathwayKey+' source-cited incomplete guard',held.resultCode==='not_yet'&&held.paymentAllowed===false);
  }
  const tampered=await request('POST','/api/expungement-ai/evaluate',{jurisdiction:w.jurisdiction,profileVersion:profile.profileVersion,matterId:'synthetic-public-route-tamper',answers:s.finalAnswers,selectedTrackId:'invented-client-route'});
  check(w.pathwayKey+' client route identity refused',tampered.status===400&&tampered.value.error==='route_identity_is_server_owned');
 }
 bind();check('source bytes unchanged',Object.entries(bindings).every(([f,h])=>hash(fs.readFileSync(root+'/'+f))===h));
 report.status=report.checks.every(c=>c.pass)?'PASS':'FAIL';
}catch(error){report.status='FAIL';report.error={name:error.name,messageSha256:hash(String(error.message))};}
finally{fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});}
console.log(JSON.stringify({status:report.status,candidate:expected,checks:report.checks.length,failed:report.checks.filter(c=>!c.pass).map(c=>c.name),requests:report.requests.length,evidence:out}));
if(report.status!=='PASS')process.exitCode=1;
