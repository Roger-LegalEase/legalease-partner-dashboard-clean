// GA-43/O35: actual shared header and locale store, isolated from auth/chat services.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const { webpack } = require('next/dist/compiled/webpack/webpack');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'briefcase-locale-'));
let server;
let browser;
try {
  const write = async (name, content) => {
    const target = path.join(temp, name);
    await fs.writeFile(target, content);
    return target;
  };
  const loader = await write('typescript.cjs', `const ts = require(${JSON.stringify(require.resolve('typescript'))});
    module.exports = function(source) { return ts.transpileModule(source, { fileName: this.resourcePath,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }
    }).outputText; };`);
  const link = await write('link.jsx', `import React from 'react'; export default function Link(props) { return <a {...props}/>; }`);
  const font = await write('font.js', `export const Sora = () => ({ className: '' });`);
  const chat = await write('chat.js', `export const WilmaBubble = () => null;`);
  const auth = await write('auth.js', `export function createBrowserSupabaseClient() { throw new Error('Unexpected auth access'); }`);
  const entry = await write('entry.jsx', `import React, {useState, useEffect} from 'react';
    import {createRoot} from 'react-dom/client';
    import {BriefcaseShell} from '@/components/expungement-ai/BriefcaseShell';
    import {LocalizationProvider, LocalizedText} from '@/components/expungement-ai/LocalizationProvider';
    window.submissions = 0; window.mounts = 0;
    function Draft() {
      const [answer, setAnswer] = useState(JSON.parse(localStorage.getItem('synthetic-saved-answer')).answer);
      useEffect(() => { window.mounts++; }, []);
      return <form onSubmit={event => { event.preventDefault(); window.submissions++; }}>
        <label>Saved answer<input value={answer} onChange={event => setAnswer(event.target.value)}/></label>
        <p id="translated"><LocalizedText k="briefcase.label" fallback="Briefcase"/></p>
      </form>;
    }
    createRoot(document.getElementById('root')).render(<LocalizationProvider>
      <BriefcaseShell showNewCheck breadcrumb="Packet information"><Draft/></BriefcaseShell>
    </LocalizationProvider>);`);
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: 'development', devtool: false, entry,
      output: { path: temp, filename: 'bundle.js' },
      resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'], modules: [path.join(root, 'node_modules')],
        alias: { 'next/link$': link, 'next/font/google$': font,
          '@/components/expungement-ai/WilmaBubble$': chat, '@/lib/supabase/browser$': auth, '@': path.join(root, 'src') } },
      module: { rules: [{ test: /\.[jt]sx?$/, exclude: /node_modules/, use: loader }] }
    });
    compiler.run((error, stats) => compiler.close(closeError => {
      if (error || closeError || stats?.hasErrors()) reject(error ?? closeError ?? new Error(stats.toString({ all: false, errors: true })));
      else resolve();
    }));
  });
  const css = await postcss([tailwindcss({ content: [
    path.join(root, 'src/components/expungement-ai/BriefcaseShell.tsx'),
    path.join(root, 'src/components/expungement-ai/ConsumerNav.tsx')
  ], corePlugins: { preflight: true } })]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined });
  const bundle = await fs.readFile(path.join(temp, 'bundle.js'));
  server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(bundle); }
    else { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  for (const width of [320, 360, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    await page.addInitScript(() => {
      if (!localStorage.getItem('synthetic-saved-answer')) localStorage.setItem('synthetic-saved-answer', JSON.stringify({ answer: 'Legacy answer — José' }));
    });
    await page.goto(`${origin}/briefcase/synthetic/packet-information`);
    await page.locator('input').waitFor();
    assert.equal(await page.locator('header [data-lang]').count(), 2, 'Briefcase header must expose both language buttons');
    const saved = await page.evaluate(() => localStorage.getItem('synthetic-saved-answer'));
    await page.getByLabel('Saved answer').fill('Unsaved correction — María');
    for (const locale of ['es', 'en', 'es']) {
      const button = page.locator(`header [data-lang="${locale}"]`);
      await button.focus();
      await page.keyboard.press(locale === 'en' ? 'Space' : 'Enter');
      await page.waitForFunction(lang => document.documentElement.lang === lang, locale);
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator(`header [data-lang="${locale === 'en' ? 'es' : 'en'}"]`).getAttribute('aria-pressed'), 'false');
      assert.equal(await page.getByLabel('Saved answer').inputValue(), 'Unsaved correction — María');
      assert.equal(await page.evaluate(() => localStorage.getItem('synthetic-saved-answer')), saved);
      assert.equal(await page.evaluate(() => window.submissions), 0);
      assert.equal(await page.evaluate(() => window.mounts), 1, 'Locale must not remount the draft');
      assert.equal(page.url(), `${origin}/briefcase/synthetic/packet-information`);
      for (const control of await page.locator('header button:visible, header a:visible').all()) {
        const box = await control.boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1, `Header control must fit ${width}px viewport`);
      }
      assert.equal(await button.getAttribute('aria-label'), locale === 'es' ? 'Usar español' : 'Use English');
    }
    assert.notEqual(await page.locator('#translated').textContent(), 'Briefcase');
    await page.reload();
    await page.waitForFunction(() => document.documentElement.lang === 'es');
    assert.equal(await page.locator('header [data-lang="es"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByLabel('Saved answer').inputValue(), 'Legacy answer — José');
    assert.equal(await page.evaluate(() => localStorage.getItem('synthetic-saved-answer')), saved);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: EN/ES keyboard control, locale persistence, accessible state, saved/draft preservation, no submit/navigation/remount`);
    await context.close();
  }
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
