import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { test, after } from 'node:test';
import { hasDeclaredMoPacketSet, MO_DISCOVERY_DIRECTORY as directory } from './mo-declared-packet-discovery.mjs';

const supplied = process.env.MO_DISCOVERY_REPO;
assert(supplied, 'Set MO_DISCOVERY_REPO to a checkout containing the retained MO candidate');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mo-discovery-test-'));
const target = path.join(root, directory);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(path.join(supplied, directory), target, { recursive: true });
after(() => fs.rmSync(root, { recursive: true, force: true }));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inventory = () => Object.fromEntries(fs.readdirSync(target, { recursive: true })
  .filter(name => fs.statSync(path.join(target, name)).isFile()).sort()
  .map(name => [name, hash(fs.readFileSync(path.join(target, name)))]));
const original = inventory();
const manifest = JSON.parse(fs.readFileSync(path.join(target, 'packet-manifest.json')));
const first = manifest.variants[0].packet;
const mutate = (file, change, check) => {
  const absolute = path.join(target, file), before = fs.readFileSync(absolute);
  try { change(absolute, before); check(); }
  finally { if (fs.existsSync(absolute)) fs.unlinkSync(absolute); fs.writeFileSync(absolute, before); }
};
const mutateJson = (file, change, check) => mutate(file, (absolute, bytes) => {
  const data = JSON.parse(bytes); change(data); fs.writeFileSync(absolute, JSON.stringify(data));
}, check);
const refused = () => assert.equal(hasDeclaredMoPacketSet(root, directory), false);

// Exact observed function at reader blob95f695c83...; only its fallback changes.
// This exercises the real fragment, not a claimed successful full shared audit.
const oldFragment = `const looksBuilt = (dir) => {
  const fixtures = path.join(ROOT, dir, "fixtures");
  if (!fs.existsSync(path.join(ROOT, dir, "production-field-map.json"))) return false;
  if (!fs.existsSync(fixtures)) return false;
  return fs.readdirSync(fixtures, { recursive: true }).some((f) => String(f).endsWith(".pdf"));
};`;
const newFragment = oldFragment.replace('if (!fs.existsSync(fixtures)) return false;',
  'if (!fs.existsSync(fixtures)) return hasDeclaredMoPacketSet(ROOT, dir);');
const load = fragment => new Function('fs', 'path', 'ROOT', 'hasDeclaredMoPacketSet', fragment + '\nreturn looksBuilt;')
  (fs, path, root, hasDeclaredMoPacketSet);
const oldLooksBuilt = load(oldFragment), newLooksBuilt = load(newFragment);

test('reproduces current discovery omission on all thirteen retained native variants', () => {
  assert.equal(manifest.variants.length, 13);
  assert.equal(fs.existsSync(path.join(target, 'fixtures')), false);
  assert.equal(oldLooksBuilt(directory), false);
});
test('repaired invoking fragment discovers exact native set without moving packet files', () => {
  assert.equal(hasDeclaredMoPacketSet(root, directory), true);
  assert.equal(newLooksBuilt(directory), true);
});
test('legacy fixture-folder discovery behavior is unchanged', () => {
  const other = 'data/rcap-all50/overlays/census-v1/zz/example--official-pdf-fill';
  fs.mkdirSync(path.join(root, other, 'fixtures'), {recursive:true});
  fs.writeFileSync(path.join(root, other, 'production-field-map.json'), '{}');
  fs.writeFileSync(path.join(root, other, 'fixtures/canonical.pdf'), '%PDF-synthetic-discovery-fixture');
  assert.equal(oldLooksBuilt(other), true); assert.equal(newLooksBuilt(other), true);
});
test('no generic discovery expansion to another family/path', () => {
  assert.equal(hasDeclaredMoPacketSet(root, directory + '-other'), false);
  assert.equal(hasDeclaredMoPacketSet(root, '../' + directory), false);
});
test('a pending author status is neither required approval nor newly issued approval', () => {
  mutateJson('approval-request.json', d => { d.status = 'DECLARED_NOT_APPROVED'; }, () => {
    assert.equal(newLooksBuilt(directory), true);
  });
});
test('missing declared PDF refuses discovery', () => mutate(first, p => fs.unlinkSync(p), refused));
test('same-length corrupted PDF refuses discovery', () => mutate(first, (p, b) => {
  const copy = Buffer.from(b);copy[Math.min(300,copy.length-1)] ^= 1;fs.writeFileSync(p,copy);
}, refused));
test('duplicate variant identity refuses', () => mutateJson('packet-manifest.json', d => {
  d.variants[1].id = d.variants[0].id;
}, refused));
test('duplicate declared output refuses', () => mutateJson('packet-manifest.json', d => {
  d.variants[1].packet = d.variants[0].packet;
}, refused));
test('path traversal in a manifest refuses', () => mutateJson('packet-manifest.json', d => {
  d.variants[0].packet = '../escape.packet.pdf';
}, refused));
test('wrong family identity refuses', () => mutateJson('production-field-map.json', d => {
  d.familyId = 'mo-another-family';
}, refused));
test('mismatched manifest/report output hash refuses', () => mutateJson('reports/rendered-artifacts.json', d => {
  d.artifacts[0].sha256 = '0'.repeat(64);
}, refused));
test('unrepresented declared variant refuses', () => mutateJson('reports/rendered-artifacts.json', d => {
  d.artifacts.pop();
}, refused));
test('malformed JSON refuses', () => mutate('packet-manifest.json', p => fs.writeFileSync(p, '{'), refused));
test('missing map refuses in both discovery paths', () => mutate('production-field-map.json', p => fs.unlinkSync(p), () => {
  assert.equal(oldLooksBuilt(directory), false); assert.equal(newLooksBuilt(directory), false);
}));
test('a symlink output refuses without following it', () => mutate(first, (p,b) => {
  const outside = path.join(root,'outside.packet.pdf');fs.writeFileSync(outside,b);
  fs.unlinkSync(p);fs.symlinkSync(outside,p);
}, refused));
test('all original candidate files remain byte-identical after execution', () => {
  assert.deepEqual(inventory(),original);
});
