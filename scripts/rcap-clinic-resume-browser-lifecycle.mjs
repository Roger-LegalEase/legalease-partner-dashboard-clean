import assert from 'node:assert/strict';
// Own every context and every asynchronous route handler. Interception remains
// installed until Chromium is closed; no unroute/ignoreErrors window exists.
export function createResumeBrowserLifecycle({browser,handleRequest,violations}){
 const contexts=new Set(),pending=new Set(),errors=[];let phase='open',completion;
 const recordFailure=category=>{errors.push(category);violations.push(category);};
 async function context(options={}){
  assert.equal(phase,'open','browser activity already finishing');
  const c=await browser.newContext(options);contexts.add(c);c.on('close',()=>contexts.delete(c));c.on('page',p=>p.on('pageerror',()=>recordFailure('browser script error')));
  await c.route('**/*',route=>{
   const work=Promise.resolve().then(async()=>{
    if(phase!=='open'){recordFailure('browser request during shutdown');await route.abort();return;}
    await handleRequest(route);
   }).catch(async()=>{recordFailure('browser route handler failed');try{await route.abort();}catch{recordFailure('failed handler abort');}});
   pending.add(work);void work.finally(()=>pending.delete(work));return work;
  });
  return c;
 }
 function assertFinished(){
  assert.equal(phase,'finished','browser shutdown incomplete');assert.equal(browser.isConnected(),false,'Chromium still connected');assert.equal(contexts.size,0,'owned context still open');assert.equal(pending.size,0,'request handler still pending');assert.deepEqual(errors,[],'browser completion failed');
  return {finished:true,contexts:0,pendingHandlers:0,browserConnected:false,errors:0};
 }
 function finish(){
  if(completion)return completion;
  phase='finishing';
  completion=(async()=>{
   const closed=await Promise.allSettled([...contexts].map(c=>c.close()));for(const r of closed)if(r.status==='rejected')recordFailure('browser context shutdown failed');
   try{await browser.close();}catch{recordFailure('browser shutdown failed');}
   // Closing contexts/browser prevents producers. Drain all scheduled handlers,
   // including a handler queued during context closure; retain every failure.
   while(pending.size)await Promise.all([...pending]);
   phase='finished';return assertFinished();
  })();return completion;
 }
 return {context,finish,assertFinished,observations:()=>({phase,contexts:contexts.size,pendingHandlers:pending.size,errors:[...errors]})};
}
