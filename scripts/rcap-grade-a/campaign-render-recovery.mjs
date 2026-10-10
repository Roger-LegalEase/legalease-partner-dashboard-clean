import fs from 'node:fs';import assert from 'node:assert/strict';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {actorBrowser,record,origin,root,fixture,db,checked,write} from './campaign-support.mjs';
const exec=promisify(execFile),{matterId}=JSON.parse(fs.readFileSync(`${root}/server/participant-packet-fixture.json`)),a=await actorBrowser('participant',fixture('clinic-participant-development-access.private')),p=a.page;
const item=()=>db.from('consumer_briefcase_items').select('id,payment_status,amount_cents,checkout_session_id,payment_intent_id').eq('id',matterId).single().then(checked);
try{
 const before=await item();assert.equal(before.payment_status,'paid');
 if(process.env.RCAP_RESUME_COMPLETED_RECOVERY==='true') {
  const previous=JSON.parse(fs.readFileSync(`${root}/server/render-recovery-error.json`));
  assert.match(previous.error,/strict mode violation/);assert.match(previous.text,/Your private PDF is ready to download/);
  assert.equal(previous.route,`/briefcase/${matterId}`);
  const failed=JSON.parse(fs.readFileSync(`${root}/server/render-failure-injection.json`));
  const job=checked(await db.from('packet_render_jobs').select('id,status,attempt_count,output_sha256,delivery_eligibility,accounting_result,retry_reconciliation_history').eq('id',failed.jobId).single());
  assert.equal(job.status,'artifact_validated');assert.equal(job.attempt_count,2);assert.ok(job.retry_reconciliation_history.length);
  await p.goto(`${origin}/briefcase/${matterId}`);await p.locator('[data-packet-ready]').waitFor();await p.getByRole('link',{name:/^Download /}).waitFor();
  await record(a,['U-T20'],['Recover the existing failed paid job through Retry packet preparation','Real worker renders and finalizes the same job after backoff','Browser polling automatically displays its download (prior capture)','Refresh the completed matter'], 'The same failed job recovered on attempt two, with a validated private PDF, automatic browser refresh and the original payment preserved.',{fixture:matterId,payment:before,job,priorBrowserCapture:'server/render-recovery-error.json',failureInjection:'DETERMINISTIC_RENDERER_FAILURE; actual queue and successful renderer'});
  write('server/render-recovery.json',{matterId,payment:before,job,priorBrowserCapture:'server/render-recovery-error.json'});
  await a.browser.close();process.exit(0);
 }

 let failed;
 if(process.env.RCAP_RESUME_RENDER_RECOVERY==='true') {
   failed=JSON.parse(fs.readFileSync(`${root}/server/render-failure-injection.json`));
   await p.goto(`${origin}/briefcase/${matterId}`);
 } else {
 await p.goto(`${origin}/briefcase/${matterId}/review`);await p.locator('a[href$="edit=case_number"]').click();await p.locator('#q-case_number').fill('Grade-A-recovery-'+Date.now().toString(36));
 const changed=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/packet-information'));await p.getByRole('button',{name:/^(Save and continue|Review packet facts|Save and return to review)$/}).click();assert.equal((await changed).status(),200);await p.waitForURL(u=>u.pathname.endsWith('/review'));await p.locator('[data-packet-verification-state=unverified]').waitFor();assert.equal(await p.getByRole('button',{name:'Pay $50 and generate my packet',exact:true}).count(),0);assert.deepEqual(await item(),before);
 const denied=await a.context.request.post(origin+'/api/expungement-ai/packet/render',{headers:{origin},data:{briefcaseItemId:matterId}});assert.ok(denied.status()>=400);
 await record(a,['U-T14'],['Edit case number through Review & Edit','Save the actual packet field','Read invalidated verification','Attempt stale render'],'Changing packet facts invalidates verification and prevents stale generation while preserving the exact existing payment.',{fixture:matterId,payment:before,staleRenderStatus:denied.status()});
 const verifying=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/packet-information'));await p.getByRole('button',{name:'I verified these packet facts',exact:true}).click();assert.equal((await verifying).status(),200);await p.locator('[data-packet-verification-state=verified]').waitFor();
 const enqueue=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/packet/render'));await p.getByRole('button',{name:'Prepare updated packet',exact:true}).click();const r=await enqueue,queued=await r.json();assert.equal(r.status(),202,JSON.stringify(queued));
 const failure=await exec(process.execPath,['scripts/rcap-grade-a/isolated-worker-failure.mjs','--once']);failed=JSON.parse(failure.stdout.trim());assert.equal(failed.outcome,'failed');assert.equal(failed.jobId,queued.jobId);write('server/render-failure-injection.json',{provider:'DETERMINISTIC_RENDERER_FAILURE',...failed});
 }
 await p.getByRole('alert').filter({hasText:'Your payment is preserved'}).waitFor();await p.getByRole('button',{name:'Retry packet preparation',exact:true}).waitFor();assert.deepEqual(await item(),before);
 await p.reload();assert.equal(await p.getByRole('button',{name:'Pay $50 and generate my packet',exact:true}).count(),0);
 const retry=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/packet/render'));await p.getByRole('button',{name:'Retry packet preparation',exact:true}).click();const retried=await retry;assert.equal(retried.status(),202);assert.equal((await retried.json()).jobId,failed.jobId);
 // Respect the real queue backoff; do not rewrite next_attempt_at or paid state.
 let completion;for(let i=0;i<18;i++){const run=await exec(process.execPath,['scripts/rcap-render-worker.mjs','--once']);const result=JSON.parse(run.stdout.trim());if(result.outcome==='finalized'){completion=result;break;}assert.equal(result.outcome,'idle',JSON.stringify(result));await new Promise(r=>setTimeout(r,5000));}assert.ok(completion,'Real retry must render within its configured backoff');
 await p.locator('[data-packet-ready]').getByRole('heading',{name:'Packet ready',exact:true}).waitFor();assert.deepEqual(await item(),before);
 const jobs=checked(await db.from('packet_render_jobs').select('id,status,attempt_count,input_hash,delivery_eligibility,accounting_result').eq('consumer_briefcase_item_id',matterId));
 await record(a,['U-T20'],['Prepare the reverified paid packet','Inject one deterministic renderer failure through the real worker','Observe truthful failure and preserved payment','Retry through actual preparation button','Run real renderer after protected queue backoff','Open completed packet'],'The failed job recovers to a real validated PDF without another Checkout Session or payment.',{fixture:matterId,failureInjection:'DETERMINISTIC_RENDERER_FAILURE; actual queue, retry, finalizer and successful renderer',payment:before,jobs,completion});
 write('server/render-recovery.json',{matterId,payment:before,jobs,completion});
}catch(error){write('server/render-recovery-error.json',{error:error.message,route:new URL(p.url()).pathname,text:(await p.locator('body').innerText()).slice(-4000)});throw error;}finally{await a.browser.close();}
