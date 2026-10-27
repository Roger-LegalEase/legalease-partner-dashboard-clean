// Explicit future GHA executor ports only. Import/factory construction never runs Docker, pulls, logs in, or claims.
import assert from'node:assert/strict';import fs from'node:fs';import path from'node:path';import{spawnSync}from'node:child_process';
import{IMAGE,SOURCE,dockerOnceInvocation}from'../worker-once-preparation/ordinary-worker-once.mjs';
const IMAGE_FORMAT='{"repoDigests":{{json .RepoDigests}},"user":{{json .Config.User}},"source":{{json (index .Config.Labels "org.opencontainers.image.revision")}}}';
const CONTAINER_FORMAT='{"id":{{json .Id}},"name":{{json .Name}},"image":{{json .Config.Image}},"cmd":{{json .Config.Cmd}},"running":{{json .State.Running}}}';
export function createPaidDtcGhaWorkerPorts({env,runId,assertContinuousWindow,runCommand=spawnSync}){
 assert.equal(typeof runCommand,'function');assert.equal(typeof assertContinuousWindow,'function');assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(env.RUNNER_OS,'Linux');assert.equal(env.GITHUB_REPOSITORY,'Roger-LegalEase/legalease-partner-dashboard-clean');assert.equal(env.GITHUB_RUN_ID,runId);assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert(path.isAbsolute(env.RUNNER_TEMP));assert(!env.DOCKER_HOST||env.DOCKER_HOST==='unix:///var/run/docker.sock');assert(!env.DOCKER_CONTEXT||env.DOCKER_CONTEXT==='default');
 const canonical=dockerOnceInvocation(env,runId),name=canonical.args[canonical.args.indexOf('--name')+1];let prepared=false,attempted=false;
 const read=args=>{const r=runCommand('docker',args,{encoding:'utf8',timeout:15000,maxBuffer:1048576});assert.equal(r.status,0);assert.equal(r.signal??null,null);assert.equal(r.error??null,null);return String(r.stdout??'');};
 return{
  async verifyPreparedImage(){const m=JSON.parse(read(['image','inspect','--format',IMAGE_FORMAT,IMAGE]));assert(Array.isArray(m.repoDigests)&&m.repoDigests.includes(IMAGE));assert.equal(m.source,SOURCE);assert(typeof m.user==='string'&&m.user&&!/^(?:root|0)(?::|$)/.test(m.user));prepared=true;return{digest:IMAGE.split('@')[1],sourceSha:SOURCE,nonRoot:true,ephemeralGithubExecutor:true};},
  async invokeOnce(invocation){
   await assertContinuousWindow({stage:'gha_before_once_preparation'});assert(prepared);assert.equal(attempted,false,'one invocation only; uncertain native request is never retried');assert.equal(invocation.command,'docker');assert.deepEqual(invocation.args,canonical.args);assert.deepEqual(invocation.options,canonical.options);
   assert.equal(read(['container','ls','--all','--filter',`name=^/${name}$`,'--format','{{.ID}}']).trim(),'','existing named container requires reconciliation, never reuse/stop it');
   const dir=path.join(env.RUNNER_TEMP,'rcap-paid-once-'+runId);fs.mkdirSync(dir,{mode:0o700});fs.chmodSync(dir,0o700);const cid=path.join(dir,'container-id');assert.equal(fs.existsSync(cid),false);
   // Same accepted canonical one-cycle primitive; cidfile adds only this invocation's bounded inverse identity.
   const args=[...canonical.args.slice(0,3),'--cidfile',cid,...canonical.args.slice(3)];await assertContinuousWindow({stage:'gha_immediately_before_once'});attempted=true;let r;
   try{r=runCommand('docker',args,canonical.options);}catch{r={status:null,signal:null,error:true,stdout:'',stderr:''};}
   let inverseProven=true;
   if(fs.existsSync(cid)){
    fs.chmodSync(cid,0o600);const id=fs.readFileSync(cid,'utf8').trim();assert.match(id,/^[a-f0-9]{64}$/);
    // Never inspect container Env: its service credential stays in process memory only.
    if(r.status!==0||r.signal||r.error){try{const own=JSON.parse(read(['container','inspect','--format',CONTAINER_FORMAT,id]));assert.equal(own.id,id);assert.equal(own.name,'/'+name);assert.equal(own.image,IMAGE);assert.deepEqual(own.cmd,['node','scripts/rcap-render-worker.mjs','--once']);if(own.running){read(['container','stop','--time','10',id]);}}catch{inverseProven=false;}}
   }else if(r.status!==0||r.signal||r.error){inverseProven=false;}
   // The outer adapter always obtains poststate/custody after this return, even for uncertainty.
   return{status:r.status??null,signal:r.signal??null,error:r.error?true:inverseProven?null:true,stdout:String(r.stdout??''),stderr:String(r.stderr??'')};
  }
 };
}
