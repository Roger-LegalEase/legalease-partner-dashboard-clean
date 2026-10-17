import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

// Exercise each actual evidence sweep on isolated inputs. The inventory echoes
// a locator; only a second original record may make it corroborated.
for (const name of ['generate-source-conveyor.mjs', 'generate-url-promotion-candidates.mjs']) {
  test(`${name}: derived restoration inventory cannot corroborate its own original`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'source-corroboration-'));
    try {
      const write = (file, value) => {
        const target = path.join(root, file);
        fs.mkdirSync(path.dirname(target), {recursive:true});
        fs.writeFileSync(target, JSON.stringify(value));
      };
      const url = 'https://example.gov/original.pdf';
      const inventory = 'data/rcap-grade-a/source-custody/generator-preflight-20261013/manifest.json';
      write('data/record-clearing/original.json', {url});
      write(inventory, {sources:[{recordedUrls:[url]}]});
      const source = fs.readFileSync(`scripts/grade-a-packet-factory-24h/${name}`, 'utf8');
      const start = source.indexOf('const EVIDENCE_ROOTS');
      const marker = name === 'generate-source-conveyor.mjs'
        ? 'const evidenceUrls = corroboratedUrls();' : 'for (const r of EVIDENCE_ROOTS) walk(r);';
      const end = source.indexOf(marker, start) + marker.length;
      assert(start >= 0 && end > start);
      const code = source.slice(start, end) + (name === 'generate-source-conveyor.mjs'
        ? '\nresult=evidenceUrls.find(x=>x.url===targetUrl).corroboration;'
        : '\nresult=seen.get(targetUrl).files.size;');
      const count = code => {
        const context={fs,path,ROOT:root,targetUrl:url};
        vm.runInNewContext(code, context);
        return context.result;
      };
      assert.equal(count(code), 1);
      const withoutExclusion = code.replace(`|| rel === "${inventory}"`, '');
      assert.notEqual(withoutExclusion, code);
      assert.equal(count(withoutExclusion), 2, 'test detects the original echo defect');
      write('data/record-clearing/independent-original.json', {url});
      assert.equal(count(code), 2, 'two real records remain corroborated');
    } finally { fs.rmSync(root, {recursive:true,force:true}); }
  });
}
