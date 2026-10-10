import fs from 'node:fs';import assert from 'node:assert/strict';
import{actorBrowser,origin,root,write,sourceIdentity}from'./campaign-support.mjs';
const extras=fs.readFileSync(root+'/extra-control-ledger.jsonl','utf8').trim().split('\n').map(JSON.parse);
const partner=JSON.parse(fs.readFileSync(root+'/server/existing-account-partner.private.json')),participant=JSON.parse(fs.readFileSync(root+'/server/new-participant-claim.private.json'));
const proofs=[],visited=new Set();let writes=0;
for(const role of ['admin','partner_admin','participant','public']){
 const a=await actorBrowser(role,role==='admin'?undefined:role==='partner_admin'?partner:role==='participant'?participant:null),p=a.page;
 p.on('request',r=>{if(r.method()==='POST'&&/\/api\/(internal\/partners|partners\/onboarding|clinic\/)/.test(r.url()))writes++;});
 try{for(const row of extras.filter(e=>e.actor===role&&e.tag==='A')){
  const instance=row.instances[0],href=instance.href,key=role+':'+href;
  if(visited.has(key)||!href||!href.startsWith('/')&&!href.startsWith('#')||href.startsWith('#ask-wilma')||instance.name==='Ask Wilma about next steps')continue;
  if(href.includes('/expungement-ai/start')||href.includes('/expungement-ai/check'))continue; // Covered by the existing screening action receipts; do not create sessions during navigation audit.
  visited.add(key);await p.goto(origin+instance.route);await p.getByRole('heading',{level:1}).first().waitFor();
  // Details may contain legitimate advanced links.
  for(const details of await p.locator('details').all())if(await details.getAttribute('open')===null)await details.locator(':scope > summary').click();
  const exact=p.locator('a').filter({visible:true});let target=null;
  for(const candidate of await exact.all())if(await candidate.getAttribute('href')===href){target=candidate;break;}
  assert.ok(target,'Missing visible link '+instance.name+' on '+instance.route);
  await target.click();const expected=new URL(href,origin+instance.route);
  await p.waitForURL(u=>u.pathname===expected.pathname&&u.hash===expected.hash);
  await p.getByRole('heading',{level:1}).first().waitFor();
  assert.equal(await p.getByText(/Application error|Internal Server Error/).count(),0);
  const heading=await p.getByRole('heading',{level:1}).first().innerText();assert.ok(!/^(404|page not found|not found)/i.test(heading),heading);
  if(expected.hash){const id=decodeURIComponent(expected.hash.slice(1));assert.equal(await p.locator('[id]').evaluateAll((nodes,id)=>nodes.some(n=>n.id===id),id),true,'Anchor target missing '+expected.hash);}
  proofs.push({actor:role,href,name:instance.name,from:instance.route,destination:new URL(p.url()).pathname+new URL(p.url()).hash,heading,result:'PASS'});
  write('controls/extra-navigation.json',{sourceIdentity,result:'IN_PROGRESS',programWrites:writes,proofs});
 }
 }catch(error){write('controls/extra-navigation-error.json',{sourceIdentity,error:error.message,actor:role,route:new URL(p.url()).pathname,proofs});throw error;}finally{await a.browser.close();}
}
assert.equal(writes,0);write('controls/extra-navigation.json',{sourceIdentity,result:'PASS',programWrites:writes,proofs});console.log(JSON.stringify({result:'PASS',distinctNavigationActions:proofs.length,programWrites:writes}));
