// GA-20/O17: actual AL QuestionField disclosures and saved-choice preservation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire, register } from 'node:module';
const root = process.cwd(), require = createRequire(import.meta.url);
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const question = projectPublicProfile(getProfileByJurisdiction('AL')).questions.find(q => q.id === 'state_exclusion_categories');
const { webpack } = require('next/dist/compiled/webpack/webpack');
const { chromium } = require('playwright');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ga20-al-ui-'));
const component = root + '/src/components/expungement-ai/screening/QuestionField.tsx';
const mutateOpen = process.argv.includes('--mutation=open');
let browser, checks = 0;
const check = (value, message) => { assert(value, message); checks++; };
try {
  fs.writeFileSync(path.join(temp, 'loader.cjs'), `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(s){if(${mutateOpen}&&this.resourcePath===${JSON.stringify(component)}){if(!s.includes('return <details key='))throw Error('mutation target missing');s=s.replace('return <details key=','return <details open key=')}return ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}`);
  fs.writeFileSync(path.join(temp, 'entry.tsx'), `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{QuestionField}from ${JSON.stringify(component)};import{LocalizationProvider,useLocalization}from ${JSON.stringify(root + '/src/components/expungement-ai/LocalizationProvider.tsx')};const question=${JSON.stringify(question)};function Case(){const{locale,setLocale}=useLocalization();const[c,setCase]=useState(null);const[value,setValue]=useState(undefined);window.__mount=saved=>{setCase({seq:Math.random()});setValue(saved);window.__changes=[]};window.__raw=()=>value;return <><button onClick={()=>setLocale('en')}>English test locale</button><button onClick={()=>setLocale('es')}>Spanish test locale</button>{c?<section data-question><QuestionField key={c.seq} question={question} stateCode="AL" value={value} onChange={v=>{window.__changes.push(v);setValue(v)}}/></section>:null}<output data-locale>{locale}</output></>};createRoot(document.getElementById('root')).render(<LocalizationProvider><Case/></LocalizationProvider>);`);
  await new Promise((resolve, reject) => {
    const compiler = webpack({ mode: 'none', devtool: false, entry: path.join(temp, 'entry.tsx'), target: 'web', output: { path: temp, filename: 'browser.js' }, resolve: { extensions: ['.tsx', '.ts', '.js', '.json'], alias: { '@': root + '/src' }, modules: [root + '/node_modules', 'node_modules'] }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(temp, 'loader.cjs') }] }, plugins: [new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('development'), 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })], optimization: { minimize: false } });
    compiler.run((error, stats) => compiler.close(close => error || close || stats.hasErrors() ? reject(error || close || Error(stats.toString({ all: false, errors: true }))) : resolve()));
  });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  let network = 0;
  await context.route('**/*', route => {
    network++;
    return route.request().url() === 'https://ga20-component.invalid/' ? route.fulfill({ contentType: 'text/html', body: '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>' }) : route.abort();
  });
  const page = await context.newPage(); await page.goto('https://ga20-component.invalid/');
  await page.addScriptTag({ content: fs.readFileSync(path.join(temp, 'browser.js'), 'utf8') });
  await page.waitForFunction(() => typeof window.__mount === 'function');
  for (const locale of ['en', 'es']) {
    await page.getByRole('button', { name: locale === 'es' ? 'Spanish test locale' : 'English test locale', exact: true }).click();
    await page.locator('output[data-locale]').filter({ hasText: locale }).waitFor();
    for (const saved of [['Violent offense'], ['None of these'], ['I am not sure'], ['Violent offense', 'None of these']]) {
      await page.evaluate(saved => window.__mount(saved), saved);
      await page.locator('[data-question]').waitFor();
      const details = page.locator('[data-question] details'), summaries = details.locator('summary');
      check(await details.count() === 4, 'four route-labeled lists ' + locale);
      check(await page.locator('details[open]').count() === 0, 'lists collapsed by default ' + locale);
      check(await page.locator('input[type=checkbox]:visible').count() === question.options.length, 'all answer choices remain reachable ' + locale);
      check((await summaries.allTextContents()).every(s => s.includes('REDEEMER')), 'each summary names the route ' + locale);
      for (let i = 0; i < 4; i++) {
        await summaries.nth(i).focus(); await page.keyboard.press('Enter');
        check(await details.nth(i).getAttribute('open') !== null, 'native keyboard opens list ' + locale + i);
        check(await details.nth(i).locator('p').isVisible(), 'list text visible ' + locale + i);
        await page.keyboard.press('Enter');
        check(await details.nth(i).getAttribute('open') === null, 'native keyboard closes list ' + locale + i);
      }
      assert.deepEqual(await page.evaluate(() => window.__raw()), saved, 'reading lists preserves exact saved raw, including conflicting history');
      check(await page.evaluate(() => window.__changes.length) === 0, 'no answer writes from disclosures');
      check(!(await page.locator('#q-state_exclusion_categories-helper').textContent()).includes('12-25-32'), 'short input description excludes long collapsed source text');
    }
  }
  await page.evaluate(() => window.__mount(['Violent offense']));
  const none = page.locator('input[type=checkbox]').nth(question.options.indexOf('None of these'));
  await none.check();
  await page.waitForFunction(() => JSON.stringify(window.__raw()) === JSON.stringify(['None of these']));
  const saved = await page.evaluate(() => window.__raw());
  await page.getByRole('button', { name: 'English test locale', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.__raw()), saved, 'switching language preserves the corrected answer');
  await page.evaluate(saved => window.__mount(saved), saved);
  check(await none.isChecked(), 'resumed corrected choice renders');
  assert.deepEqual(await page.evaluate(() => window.__raw()), saved);
  check(network === 1, 'isolated component browser makes no external requests');
  console.log(JSON.stringify({ status: 'PASS', checks, localeSavedCases: 8, nativeDisclosureToggles: 64, viewport: 390, scope: 'Actual QuestionField in Chromium; no hosted session, database save, deployment, payment or independent language acceptance.' }));
  await context.close();
} finally { await browser?.close(); fs.rmSync(temp, { recursive: true, force: true }); }
