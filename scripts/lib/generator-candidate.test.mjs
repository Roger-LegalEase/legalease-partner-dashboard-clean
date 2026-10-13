import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { makeEmitter } from './generator-emit.mjs';

const moduleUrl = new URL('./generator-emit.mjs', import.meta.url).href;
test('failed check captures exact changed and missing output without modifying the checkout or passing', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-candidate-'));
  t.after(() => fs.rmSync(dir, { recursive: true }));
  const root = path.join(dir, 'checkout'), evidence = path.join(dir, 'candidate');
  fs.mkdirSync(root); fs.writeFileSync(path.join(root, 'same.json'), 'same'); fs.writeFileSync(path.join(root, 'changed.json'), 'before');
  const code = `import {makeEmitter} from ${JSON.stringify(moduleUrl)};
    const out=makeEmitter({root:${JSON.stringify(root)},candidateDirectory:${JSON.stringify(evidence)},check:true,volatilePin:false,label:'test'});
    out.emit('same.json','same');out.emit('changed.json','after');out.emit('new.json','new');out.finish();`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  assert.equal(result.status, 1); assert.match(result.stderr, /GENERATOR DIVERGENCE/);
  assert.equal(fs.readFileSync(path.join(root, 'changed.json'), 'utf8'), 'before');
  assert.equal(fs.existsSync(path.join(root, 'new.json')), false);
  assert.equal(fs.existsSync(path.join(evidence, 'same.json')), false);
  assert.equal(fs.readFileSync(path.join(evidence, 'changed.json'), 'utf8'), 'after');
  assert.equal(fs.readFileSync(path.join(evidence, 'new.json'), 'utf8'), 'new');
  const out = makeEmitter({ root, check: true, volatilePin: false, label: 'test', candidateDirectory: evidence });
  assert.throws(() => out.emit('../escaped.json', 'bad'), /escaped/);
  assert.throws(() => out.emit('changed.json', 'overwrite'), /EEXIST/);
  assert.equal(fs.readFileSync(path.join(evidence, 'changed.json'), 'utf8'), 'after');
});
test('candidate capture refuses mutation mode and in-checkout or relative destinations', () => {
  for (const [check, candidateDirectory] of [[false, '/tmp/candidate'], [true, 'relative'], [true, '/checkout'], [true, '/checkout/child']]) {
    assert.throws(() => makeEmitter({ root: '/checkout', check, candidateDirectory, label: 'test' }), /require --check/);
  }
});

test('candidate capture rejects symlink roots and nested symlink ancestors', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-candidate-link-'));
  t.after(() => fs.rmSync(dir, { recursive: true }));
  const root = path.join(dir, 'checkout'), evidence = path.join(dir, 'evidence');
  fs.mkdirSync(root); fs.mkdirSync(evidence);
  fs.symlinkSync(root, path.join(evidence, 'redirect'));
  for (const [candidateDirectory, rel] of [[path.join(evidence, 'redirect'), 'new.json'], [evidence, 'redirect/new.json']]) {
    const out = makeEmitter({root,check:true,volatilePin:false,label:'test',candidateDirectory});
    assert.throws(() => out.emit(rel, 'must not write'), /symlink/);
    assert.equal(fs.existsSync(path.join(root, 'new.json')), false);
  }
});
