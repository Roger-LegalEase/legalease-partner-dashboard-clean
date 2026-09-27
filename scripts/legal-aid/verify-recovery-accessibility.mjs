// Local, actual full-build recovery checks. This is automated desktop Chromium
// evidence, not qualified screen-reader or physical-device acceptance.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const origin = process.env.LEGAL_AID_LOCAL_URL ?? 'http://127.0.0.1:3100';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'local server only');
const out = process.env.LEGAL_AID_A11Y_OUTPUT;
assert.ok(out,'LEGAL_AID_A11Y_OUTPUT must name a disposable evidence directory');
fs.mkdirSync(out,{recursive:true});
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM ?? chromium.executablePath(),headless:true});
const results = [];
try {
  for (const locale of ['en','es']) for (const width of [320,390,1280]) {
    const context = await browser.newContext({viewport:{width,height:900}});
    await context.addCookies([{name:'clinic_shared_device',value:'1',url:origin}]);
    await context.addInitScript(locale=>localStorage.setItem('exp_lang',locale),locale);
    const page = await context.newPage();
    await page.goto(`${origin}/p/mvlp/continue`);
    await page.getByRole('button',{name:locale==='es'?'Reintentar restablecer el dispositivo':'Retry device reset'}).waitFor();
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    const axe = await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
    const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    const keyboard=[];
    for(let i=0;i<3;i++) { await page.keyboard.press('Tab'); keyboard.push(await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent}))); }
    assert.equal(axe.violations.length,0,JSON.stringify(axe.violations));
    assert.equal(axe.incomplete.length,0,JSON.stringify(axe.incomplete.map(x=>x.id)));
    assert.equal(overflow,false); assert.deepEqual(keyboard.map(k=>k.tag),['BUTTON','A','A']);
    assert.equal(await page.locator('[role=status][aria-live=polite]').count(),1);
    assert.equal(await page.getByRole('main').count(),1);
    await page.screenshot({path:path.join(out,`recovery-${locale}-${width}.png`),fullPage:true});
    results.push({locale,width,violations:axe.violations,incomplete:axe.incomplete,overflow,keyboard,screenReaderHumanReview:false,realDevice:false});
    await context.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  console.log('PASS: six actual full-build EN/ES recovery viewport, axe, keyboard, landmark and live-status checks. Desktop Chromium; no human/device approval claimed.');
} finally { await browser.close(); }
