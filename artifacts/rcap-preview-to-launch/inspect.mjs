import fs from 'node:fs';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:3100';
const access=JSON.parse(fs.readFileSync('/workspaces/training-modules-09-10/output/rcap-practice-access.json','utf8'));
const browser=await chromium.launch({headless:true}),context=await browser.newContext(),page=await context.newPage();
page.setDefaultTimeout(90000);
try{
 await page.goto(origin+'/sign-in');await page.locator('input[type=email]').fill(access.owner.email);await page.locator('input[type=password]').fill(access.owner.password);await page.getByRole('button',{name:/^sign in$/i}).click();await page.waitForURL(u=>u.pathname!='/sign-in');
 for(const slug of ['operating-rights-mv23r21j','operating-rights-mv23or7l']){
  const response=await context.request.get(`${origin}/api/internal/partners/onboarding/phase1/${slug}/program`);const body=await response.json();
  const ops=body.operations;if(!ops)throw new Error(JSON.stringify(body));
  await page.goto(`${origin}/internal/partners/onboarding/${slug}`);
  const summary={slug,canStart:ops.canStart,issues:ops.issues,materials:ops.view?.materials.map(({type,id,hash,version})=>({type,id,hash,version})),blockers:ops.launchDecision?.blockers,heldReason:ops.preflight?.heldReason,latestOperation:ops.preflight?.latestOperation?.step,previewVisible:await page.locator('[aria-label="Current program preview"]').count()};
  console.log(JSON.stringify(summary));fs.writeFileSync(`artifacts/rcap-preview-to-launch/baseline-${slug}.json`,JSON.stringify(summary,null,2));
 }
}finally{await browser.close();}
