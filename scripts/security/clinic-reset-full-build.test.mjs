// Run only AFTER the intended full application build, never a fixture build.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
const root=process.env.CLINIC_FULL_BUILD;assert.ok(root,'CLINIC_FULL_BUILD must name the exact completed full snapshot');
for(const file of ['src/proxy.ts','src/app/clinic/reset/page.tsx','src/app/api/clinic/session/reset/route.ts'])assert.deepEqual(fs.readFileSync(path.join(root,file)),fs.readFileSync(file));
test('full built product: locked document/RSC/prefetch/private API gate and genuine recovery destination',async()=>{
 const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
 const server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-H','127.0.0.1','-p',String(port)],{cwd:root,env:{PATH:process.env.PATH,HOME:process.env.HOME,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});let log='';
 server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
 await new Promise((resolve,reject)=>{server.stdout.on('data',()=>{if(log.includes('Ready'))resolve()});server.once('exit',code=>reject(Error('server failed '+code+' '+log)));});
 const origin=`http://127.0.0.1:${port}`,results=[];
 try{
  for(const [url,headers] of [
   ['/briefcase/matters/private',{}],['/clinic/event/screening/ms',{}],['/briefcase/matters/private',{rsc:'1','next-router-prefetch':'1'}],
   ['/briefcase/matters/private',{purpose:'prefetch'}],['/_next/data/build/private.json',{}],['/briefcase/matters/private.json',{}],
   ['/api/rcap/packets/11111111-1111-4111-8111-111111111111/download',{}],['/api/clinic/events/11111111-1111-4111-8111-111111111111/queue',{}],['/api/expungement-ai/screening/pending/claim',{}]
  ]){
   const response=await fetch(origin+url,{redirect:'manual',headers:{cookie:'clinic_reset_pending=1; sb-test=opaque-retained-auth; clinic_session=opaque-handoff',...headers}}),body=await response.text();
   console.log(JSON.stringify({url,requestHeaders:headers,status:response.status,responseHeaders:Object.fromEntries(response.headers),bytes:Buffer.byteLength(body)}));
   assert.equal(response.status,url.startsWith('/api/')?423:303);assert.match(response.headers.get('cache-control'),/no-store/);
   if(response.status===303){assert.equal(new URL(response.headers.get('location')??response.headers.get('x-nextjs-redirect'),origin).href,origin+(url.startsWith('/_next/data/')?'/_next/data/build/clinic/reset.json':'/clinic/reset'));assert.ok(!body.includes('self.__next_f'));}
   else assert.deepEqual(JSON.parse(body),{error:'Device reset is incomplete'});
   results.push({url,headers,status:response.status,bytes:Buffer.byteLength(body)});
  }
  const recovery=await fetch(origin+'/clinic/reset',{headers:{cookie:'clinic_reset_pending=1'},redirect:'manual'});assert.equal(recovery.status,200);const html=await recovery.text();assert.ok(html.includes('Retry device reset'));assert.ok(html.includes('/expungement-ai/sign-in')); // Explicit reauthentication path, not handover destination.
  const clean=await fetch(origin+'/clinic/reset',{redirect:'manual'});assert.equal(clean.status,307);assert.equal(new URL(clean.headers.get('location'),origin).pathname,'/clinic');
  const entry=await fetch(origin+'/clinic');assert.equal(entry.status,200);assert.ok((await entry.text()).includes('Open your Clinic event'));
  const invalid=await fetch(origin+'/clinic?event=https%3A%2F%2Fevil.invalid');assert.equal(invalid.status,200);assert.ok((await invalid.text()).includes('That event is not available'));
  const signin=await fetch(origin+'/expungement-ai/sign-in');assert.equal(signin.status,200);const signHtml=await signin.text();assert.ok(signHtml.includes('method="post"'));assert.ok(signHtml.includes('data-handler-ready="false"'));
  console.log(JSON.stringify({results,recovery:200,cleanRecovery:307,safeEntry:'/clinic',reauthentication:'/expungement-ai/sign-in',destination:200,scope:'Actual Next production proxy/server responses. Marker only restricts; underlying auth remains required; no claim about data already delivered before lock.'}));
 }finally{server.kill('SIGTERM');const [code,signal]=await once(server,'exit');console.log(JSON.stringify({process:'next start',deliberateTeardown:true,code,signal}));}
});
