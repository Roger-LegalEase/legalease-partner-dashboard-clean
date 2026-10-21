import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadUserSourceAdoption, applyUserSourceDeterminations } from './user-source-adoption.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-rules-admission-'));
const body = Buffer.from('held rules container test bytes');
const digest = crypto.createHash('sha256').update(body).digest('hex');
const family = 'rcap-oh-custom-pleading-clean-tracks';
const recordPath = 'adoption.json';
fs.writeFileSync(path.join(root, 'rules.pdf'), body);
const record = (id) => ({
  schemaVersion: 'rcap-source-custody-adoption/v1',
  sources: [{ sourceId: id, sourceObligationId: id, familyIds: [family],
    itemIds: [`${family}::${id}`], result: 'OFFICIAL_SOURCE_ALREADY_HELD',
    heldCorpusPath: 'rules.pdf', sha256: digest, byteLength: body.length }],
  familyDeterminations: [],
});
const load = (value) => {
  fs.writeFileSync(path.join(root, recordPath), JSON.stringify(value));
  return loadUserSourceAdoption(root, { recordPath });
};
let controls = 0;
try {
  for (const id of ['official-rules:OH-SUPR-APPENDIX-D-FORM-96-C1',
    `${family}::official-rules:OH-SUPR-APPENDIX-D-FORM-96-C1`]) {
    const base = record(id);
    assert.deepEqual(load(base), base); controls++;
    const history = { reconciliation42: { families: [{ familyId: family, disposition: 'PRODUCT_PATH_PENDING' }], acquisitionEvidencePaths: [] } };
    const before = structuredClone(history);
    const effective = applyUserSourceDeterminations(root, history, { adoption: base });
    assert.deepEqual(history, before);
    assert.deepEqual(effective.reconciliation42.families, before.reconciliation42.families);
    controls++;
    for (const [mutate, pattern] of [
      [(d) => { d.sources[0].sha256 = '0'.repeat(64); }, /SHA-256 drift/],
      [(d) => { d.sources[0].byteLength++; }, /byte length drift/],
      [(d) => { d.sources[0].heldCorpusPath = 'missing.pdf'; }, /is missing/],
      [(d) => { d.sources[0].heldCorpusPath = '../escape.pdf'; }, /escapes/],
      [(d) => { d.sources[0].sourceId = 'official-authority:alias'; }, /must equal/],
      [(d) => { d.sources[0].itemIds = [`wrong-family::${id}`]; }, /exactly/],
      [(d) => { d.sources.push(structuredClone(d.sources[0])); }, /duplicate/],
      [(d) => { d.familyDeterminations = [{ familyId: family, disposition: 'SOURCE_READY', requiredPacketSourceBindings: [{ sourceId: id, sha256: '0'.repeat(64) }] }]; }, /does not match/],
    ]) {
      const changed = structuredClone(base); mutate(changed);
      assert.throws(() => load(changed), pattern); controls++;
    }
  }
  for (const id of ['unofficial-rules:OH', 'official-rules-OH', 'private-source:OH']) {
    assert.throws(() => load(record(id)), /must identify/); controls++;
  }
  console.log(`PASS ${controls} rules admission controls; exact identity/custody retained; source-only admission does not promote family`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
