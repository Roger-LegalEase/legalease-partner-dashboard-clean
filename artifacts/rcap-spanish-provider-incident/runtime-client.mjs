import fs from 'node:fs';import {randomUUID,sign} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root='/workspaces/legalease-partner-dashboard-clean',out=root+'/artifacts/rcap-spanish-provider-incident';
export function callRuntime(body){
 const manifest=JSON.parse(fs.readFileSync(out+'/probe-deploy.json'));const url=manifest.deployment.url+'/api/internal/partners/onboarding/phase1/rcap-provider-incident/program';
 const raw=JSON.stringify(body),signature=sign(null,Buffer.from(raw),fs.readFileSync(out+'/probe-private.pem')).toString('base64');const p=out+'/request-'+body.requestId+'.json';fs.writeFileSync(p,raw,{mode:0o600});
 const childEnv={...process.env};delete childEnv.NODE_OPTIONS;
 let result; try { result=execFileSync('/home/codespace/.npm/_npx/cf16195db335a816/node_modules/.bin/vercel',['curl',url,'--scope','team_4qLmZK9WI6xIy5vjYC0IF3ae','--','--silent','--show-error','--max-time','55','--request','POST','--header','Content-Type: application/json','--header','x-rcap-provider-signature: '+signature,'--data-binary','@'+p],{cwd:'/workspaces/rcap-rights-release-08f68583',encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:65000,env:childEnv}); } catch (error) { fs.writeFileSync(out+'/transport-error.log',String(error.stderr??'')+'\n'+JSON.stringify({name:error.name,code:error.code,status:error.status,signal:error.signal}),{mode:0o600}); throw error; }
 const parsed=JSON.parse(result);fs.writeFileSync(out+'/response-'+body.requestId+'.json',JSON.stringify(parsed),{mode:0o600});return parsed;
}
if(process.argv[2]==='diagnose'){
 const source=JSON.parse(fs.readFileSync(out+'/production-public-source.json')).source,keys=JSON.parse(fs.readFileSync(out+'/probe-manifest.json')).keys;
 const requestId=randomUUID(),r=callRuntime({requestId,source,keys,mode:'diagnose'});fs.writeFileSync(out+'/reproduction.json',JSON.stringify({...r,probeRequestId:requestId}),{mode:0o600});
 console.log(JSON.stringify({ok:r.ok,diagnostic:r.diagnostic,requestId:r.requestId,providerStatus:r.provider?.status,databaseWrites:r.databaseWrites}));
}
