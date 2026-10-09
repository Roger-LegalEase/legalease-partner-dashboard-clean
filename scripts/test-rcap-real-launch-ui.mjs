#!/usr/bin/env node
// Focused actual-launch regression, starting from a submitted synthetic program.
// The private fixture contains origin, partnerSlug, ownerStorageState,
// partnerStorageState and outputDir. Both sessions originate from browser sign-in.
// Prepare the submitted program through the accepted setup journey first. This
// script never seeds records, calls an API directly, or substitutes Practice UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium, webkit} from 'playwright';
import {PDFDocument} from 'pdf-lib';

const fixture = JSON.parse(fs.readFileSync(process.env.RCAP_REAL_UI_FIXTURE, 'utf8'));
const {origin, partnerSlug, ownerStorageState, partnerStorageState, outputDir} = fixture;
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Local fixture only');
assert.match(partnerSlug, /^(practice|test)-/);
const engine = process.env.RCAP_REAL_UI_BROWSER ?? 'webkit';
assert.ok(['chromium', 'webkit'].includes(engine));
fs.mkdirSync(outputDir, {recursive:true});
const sourceFiles = execFileSync('git', ['ls-files', 'src'], {encoding:'utf8'}).trim().split('\n');
// Include the new policy before its first commit, too.
sourceFiles.push('src/lib/partners/onboarding/partner-material-policy.ts');
const sourceHash = createHash('sha256');
for (const file of [...new Set(sourceFiles)].sort()) sourceHash.update(file).update(fs.readFileSync(file));
const priorPath=path.join(outputDir,`${engine}-actual-launch.json`);
const prior=fixture.resumeAfterPassedSteps ? JSON.parse(fs.readFileSync(priorPath,'utf8')) : null;
let stepIndex=0;
const evidence = {engine, origin, partnerSlug, sourceSha256:sourceHash.digest('hex'), startedAt:new Date().toISOString(), steps:[]};
const browser = await ({chromium,webkit}[engine]).launch();
const context = await browser.newContext({ignoreHTTPSErrors:true, storageState:ownerStorageState, viewport:{width:1440,height:1000}});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const studio = `${origin}/internal/partners/onboarding/${partnerSlug}`;
page.on('response',async response => {
  if(!/\/(artifacts|launch|commercial-authority)$/.test(new URL(response.url()).pathname)) return;
  try { const body=await response.json(); console.log('UI response',new URL(response.url()).pathname.split('/').pop(),response.request().method(),response.status(),JSON.stringify({boardVersion:body.board?.workspaceVersion,preflightVersion:body.preflight?.workspaceVersion,error:body.error,submittedVersion:response.request().postDataJSON()?.payload?.workspaceVersion})); } catch {}
});
const nav = () => page.getByRole('navigation', {name:'Launch Studio tasks'});
const launchSection = () => page.getByRole('region', {name:'Launch controls'});
const screenshot = async name => page.screenshot({path:path.join(outputDir, `${engine}-${name}.png`), fullPage:true});
async function step(name, fn) {
  if(stepIndex++ < (fixture.resumeAfterPassedSteps ?? 0)) {
    assert.equal(prior.steps[stepIndex-1]?.name,name); assert.equal(prior.steps[stepIndex-1]?.status,'passed');
    evidence.steps.push({...prior.steps[stepIndex-1], sourceSha256:prior.steps[stepIndex-1].sourceSha256 ?? prior.sourceSha256, resumed:true}); return;
  }
  await fn(); evidence.steps.push({name, status:'passed'}); console.log(`PASS ${engine}: ${name}`);
}
async function save(p, button, suffix) {
  const response = p.waitForResponse(r => r.url().endsWith(suffix) && r.request().method() === 'POST');
  await button.click();
  const result = await response;
  assert.equal(result.status(), 200, `${suffix} must succeed`);
  await p.waitForLoadState('networkidle');
}
async function openLaunch() {
  await nav().getByRole('link', {name:'Launch', exact:true}).click();
  await page.getByRole('button', {name:'Launch approved program', exact:true}).waitFor();
  await page.getByRole('button', {name:'Check launch requirements', exact:true}).click();
  await page.waitForLoadState('networkidle');
}
try {
  await page.goto(studio);
  await page.waitForLoadState('networkidle');
  await step('Actual controls, first-click navigation and missing-authority hold', async () => {
    await openLaunch();
    assert.equal(await page.getByRole('button', {name:'Launch approved program', exact:true}).isDisabled(), true);
    await launchSection().getByText('Reviewed executed signed agreement: Required', {exact:true}).waitFor();
    await page.reload(); await page.waitForLoadState('networkidle');
    await launchSection().waitFor({state:'visible'});
  });
  await step('Review executed local fixture through private agreement upload', async () => {
    await page.getByRole('link', {name:'Review program funding and terms', exact:true}).first().click();
    const card = page.locator('#internal-operation-agreement');
    await card.getByLabel(/^Agreement type/).selectOption('order_form');
    await card.getByLabel(/^Status/).selectOption('executed');
    const pdf = await PDFDocument.create(); const sheet = pdf.addPage();
    [
      'ISOLATED LOCAL TEST FIXTURE - NOT A REAL AGREEMENT',
      'Fictional sponsor: Test Sponsor; fictional partner: Test Community',
      'Test signatory markers: Synthetic Sponsor / Synthetic Partner',
      'Test scope: 800 screenings, 50 packets, open access in MS.',
      'No real signature, payment, obligation or public activation.'
    ].forEach((line,index) => sheet.drawText(line,{x:35,y:750-index*28,size:12}));
    await card.getByLabel('Upload the signed agreement (PDF or DOCX, up to 4 MB)',{exact:true}).setInputFiles({name:'isolated-synthetic-executed-agreement.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});
    await card.getByLabel(/^Effective date/).fill(new Date().toISOString().slice(0,10));
    await card.getByLabel('Reviewer evidence note',{exact:true}).fill('Inspected fictional sponsor and partner test signatory markers in the isolated local fixture. No real contractual authority.');
    await card.getByRole('checkbox',{name:/I personally inspected/}).check();
    await save(page,card.getByRole('button',{name:'Record verified signed agreement',exact:true}),'/signed-agreement');
  });
  await step('Review submitted setup and organizational asset', async () => {
    await page.getByRole('link',{name:'LegalEase is reviewing your setup',exact:true}).first().click();
    const card=page.locator('#internal-operation-section_review');
    for(let i=0;i<8;i++) {
      const option=await card.locator('select').first().locator('option').evaluateAll(options=>options.find(o=>!o.textContent.includes('Approved')&&!o.textContent.includes('Waived'))?.value);
      if(!option) break;
      await card.locator('select').first().selectOption(option);
      await card.getByLabel(/^Review reason/).fill('Reviewed the submitted fictional section against the isolated local test scope. No Production authority.');
      await save(page,card.getByRole('button',{name:/^Approve /}),`/phase1/${partnerSlug}`);
    }
    const assets=page.getByRole('heading',{name:'Review organizational assets',exact:true}).locator('..');
    await assets.getByLabel('Review reason',{exact:true}).fill('Inspected fictional organization media for this isolated local test.');
    for(const button of await assets.getByRole('button',{name:'Approve asset',exact:true}).all()) {
      if(!(await button.locator('..').innerText()).includes('pending')) continue;
      const done=page.waitForResponse(r=>r.url().includes('/assets/')&&r.request().method()==='POST');
      await button.click(); assert.equal((await done).status(),200); await page.waitForLoadState('networkidle');
    }
  });
  await step('Qualification has a direct destination and return to launch', async () => {
    await openLaunch();
    const qualification=page.getByRole('link',{name:'Review partner qualification',exact:true});
    const needsQualification=Boolean(await qualification.count());
    if(needsQualification) await qualification.click();
    else await page.goto(`${origin}/internal/partners/admin/${partnerSlug}#partner-qualification`);
    const qualify=page.getByRole('button',{name:'Mark Qualified',exact:true});
    if(needsQualification && await qualify.isEnabled()) { await qualify.click(); await page.getByText(/Persisted: true/).waitFor(); }
    await page.getByRole('link',{name:'Return to program launch',exact:true}).click();
    await page.getByText('Partner qualification: Verified',{exact:true}).waitFor();
  });
  await step('Documented allocation and sponsored authority, without payment', async () => {
    await openLaunch();
    const details=page.locator('#launch-commercial-authority');
    if(!await details.evaluate(e=>e.open)) await details.locator('summary').first().click();
    assert.notEqual(await details.getByLabel(/^Approved procurement document/).inputValue(),'','Sole document is selected automatically');
    await details.getByLabel('Contract or sponsor authorization reference',{exact:true}).fill('LOCAL-TEST-SPONSOR synthetic authorization only');
    await details.getByText('Configure documented allocation',{exact:true}).click();
    await details.getByLabel('Screening allocation',{exact:true}).fill('800');
    await details.getByLabel('Packet allocation',{exact:true}).fill('50');
    assert.equal(await details.getByRole('button',{name:'Save documented allocation',exact:true}).isDisabled(),true);
    await details.getByRole('checkbox').check();
    if(!(await details.getByLabel(/^Existing authorized packet allocation/).inputValue())) await save(page,details.getByRole('button',{name:'Save documented allocation',exact:true}),'/launch-capacity');
    assert.notEqual(await details.getByLabel(/^Existing authorized packet allocation/).inputValue(),'','New allocation is selected automatically');
    await details.getByLabel('Authority expires',{exact:true}).fill(new Date(Date.now()+7*86400000).toISOString().slice(0,16));
    await save(page,details.getByRole('button',{name:'Record documented commercial authority',exact:true}),'/commercial-authority');
    await page.getByText('Documented commercial authority: Verified',{exact:true}).waitFor();
  });
  await step('One current document package, internal review once', async () => {
    await nav().getByRole('link',{name:'Review',exact:true}).click();
    await save(page,page.getByRole('button',{name:'Prepare current review package',exact:true}),'/artifacts');
    await page.locator('[data-artifact-type]').first().waitFor();
    for(const row of await page.locator('[data-artifact-type]').all()) {
      const preview=row.getByRole('button',{name:'Preview',exact:true}); if(await preview.count()) await preview.click();
    }
    for(const box of await page.getByRole('checkbox',{name:/I reviewed/}).all()) await box.check();
    await page.getByRole('button',{name:'Approve reviewed launch package',exact:true}).click();
    await page.getByText('Current review package approved.',{exact:true}).waitFor();
    await openLaunch();
    await page.getByText('Partner facts and branding review: Required',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Launch approved program',exact:true}).isDisabled(),true);
  });
  await step('Partner reviews only the two required materials and owns training/consent', async () => {
    const partner=await browser.newContext({ignoreHTTPSErrors:true,storageState:partnerStorageState,viewport:{width:390,height:844}});
    const q=await partner.newPage(); q.setDefaultTimeout(30000);
    await q.goto(origin+'/partner/onboarding');
    const partnerNav=()=>q.getByRole('navigation',{name:'Program navigation',exact:true});
    await partnerNav().getByRole('link',{name:'Your page',exact:true}).click();
    await q.locator('[data-artifact-type]').first().waitFor();
    assert.equal(await q.getByRole('button',{name:'Approve facts and branding',exact:true}).count(),2);
    for(const type of ['implementation_brief','co_branded_page_configuration']) {
      const card=q.locator(`[data-artifact-type="${type}"]`);
      const preview=card.getByRole('button',{name:'Preview',exact:true}); if(await preview.count()) await preview.click();
      await save(q,card.getByRole('button',{name:'Approve facts and branding',exact:true}),'/onboarding/artifacts');
    }
    await q.reload(); await q.locator('[data-artifact-type]').first().waitFor();
    assert.equal(await q.getByRole('button',{name:'Approve facts and branding',exact:true}).count(),0);
    await partnerNav().getByRole('link',{name:'Launch & resources',exact:true}).click();
    const training=q.locator('[data-check-key="staff_training_completed"]');
    await save(q,training.getByRole('button',{name:'Confirm complete',exact:true}),'/onboarding/launch-readiness');
    await q.locator('[data-check-key="staff_training_completed"][data-check-status="passing"]').waitFor();
    await save(q,q.getByRole('button',{name:'Record our launch approval',exact:true}),'/onboarding/launch-readiness');
    await q.locator('[data-check-key="partner_launch_approval_received"][data-check-status="passing"]').waitFor();
    await q.reload(); await q.locator('[data-check-key="partner_launch_approval_received"][data-check-status="passing"]').waitFor();
    await q.screenshot({path:path.join(outputDir,`${engine}-partner-confirmations.png`),fullPage:true});
    await q.goto(studio); await q.getByRole('heading',{name:'Internal admin access denied',exact:true}).waitFor();
    assert.equal(await q.getByRole('button',{name:'Launch approved program',exact:true}).count(),0);
    await partner.close();
  });
  await step('Final administrator review updates controls; explicit launch verifies local publication', async () => {
    await page.reload(); await page.waitForLoadState('networkidle'); await openLaunch();
    const communication=page.locator('[data-check-key="communications_approved"]');
    await save(page,communication.getByRole('button',{name:'Mark complete',exact:true}),'/launch-readiness');
    await save(page,page.getByRole('button',{name:'Record final review complete',exact:true}),'/launch-readiness');
    await page.getByText('Current Platform Admin final review: Verified',{exact:true}).waitFor();
    const launch=page.getByRole('button',{name:'Launch approved program',exact:true});
    assert.equal(await launch.isDisabled(),true,'Final confirmation is required');
    await page.getByRole('checkbox',{name:/I reviewed this exact program/}).check();
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Launch approved program'&&!b.disabled));
    await screenshot('real-ready');
    const done=page.waitForResponse(r=>r.url().endsWith('/launch')&&r.request().method()==='POST',{timeout:120000});
    await launch.click(); const response=await done; const body=await response.json();
    assert.equal(response.status(),200,JSON.stringify(body)); assert.equal(body.result?.mode,'real'); assert.equal(body.result?.status,'complete');
    assert.equal(new URL(body.result.publicUrl).hostname,'127.0.0.1');
    evidence.launch=body.result;
    await page.reload(); await page.waitForLoadState('networkidle');
    await page.getByText(/Launch verified on/).waitFor();
    assert.equal(await page.getByRole('button',{name:'Launch approved program',exact:true}).isDisabled(),true,'Completed launch cannot be repeated');
    await screenshot('real-verified');
    const publicPage=await context.newPage(); await publicPage.goto(body.result.publicUrl);
    await publicPage.locator(`[data-rcap-operation="${body.result.operationId}"]`).waitFor();
    await publicPage.locator(`a[href*="/intake/${partnerSlug}"]`).first().waitFor();
    await publicPage.screenshot({path:path.join(outputDir,`${engine}-local-published-page.png`),fullPage:true});
  });
  evidence.status='passed';
} catch(error) {
  evidence.status='failed'; evidence.failure=error.message;
  await screenshot('failure'); process.exitCode=1; console.error(error.message);
} finally {
  evidence.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(outputDir,`${engine}-actual-launch.json`),JSON.stringify(evidence,null,2));
  await browser.close();
}
