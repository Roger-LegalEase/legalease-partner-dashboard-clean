import fs from 'node:fs';import assert from 'node:assert/strict';
import {actorBrowser,root,origin,write,sourceIdentity} from '/workspaces/legalease-partner-dashboard-clean/scripts/rcap-grade-a/campaign-support.mjs';
const a=await actorBrowser('public',null),p=a.page,record=JSON.parse(fs.readFileSync(root+'/controls/extra-navigation.json'));
assert.equal(record.sourceIdentity.applicationTreeSha256,sourceIdentity.applicationTreeSha256);assert.equal(record.programWrites,0);
try{
 const from='/expungement-ai/sign-in?next=/briefcase';
 for(const [name,href] of [['Expungement.ai home','/expungement-ai'],['Briefcase','/briefcase']]){
  await p.goto(origin+from);const link=p.getByRole('link',{name,exact:true});assert.equal(await link.getAttribute('href'),href);await link.click();
  if(href==='/briefcase'){await p.waitForURL(u=>u.pathname==='/expungement-ai/sign-in'&&u.searchParams.get('next')==='/briefcase');await p.getByLabel('Email',{exact:true}).waitFor();assert.equal(await p.locator('[data-briefcase-matter-id]').count(),0);}else{await p.waitForURL(u=>u.pathname===href);await p.getByRole('heading',{level:1}).waitFor();}
  const proof={actor:'public',href,name,from,destination:new URL(p.url()).pathname+new URL(p.url()).search,heading:await p.getByRole('heading',{level:1}).first().innerText(),result:'PASS'};record.proofs.push(proof);console.log(JSON.stringify(proof));
 }
 record.result='PASS';record.continuation={reason:'Two public assertions not reached by the initial generic harness',conditionalWilmaLinkProof:'controls/wilma.json',originalFailure:'controls/extra-navigation-error.json'};write('controls/extra-navigation.json',record);
}catch(e){write('server/public-navigation-continuation-error.json',{error:e.message,route:new URL(p.url()).pathname});throw e;}finally{await a.browser.close();}
