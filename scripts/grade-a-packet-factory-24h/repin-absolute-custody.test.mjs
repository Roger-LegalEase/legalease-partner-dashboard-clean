import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { currentBytesOf, driftedPinsOf, sha256 } from './repin-lapsed-source-identities.mjs';

test('absolute custody measures actual bytes and preserves missing or changed source refusal', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repin-custody-'));
  try {
    const file = path.join(dir, 'held-source.pdf');
    const bytes = Buffer.from('exact held source bytes');
    fs.writeFileSync(file, bytes);
    assert.deepEqual(currentBytesOf(file).bytes, bytes);
    assert.equal(driftedPinsOf({ documents: [{ custodyPath: file, sha256: sha256(bytes) }] }).length, 0);
    const changed = driftedPinsOf({ documents: [{ custodyPath: file, sha256: sha256(Buffer.from('prior source')) }] });
    assert.equal(changed.length, 1);
    assert.equal(changed[0].missing, false);
    const missing = driftedPinsOf({ documents: [{ custodyPath: path.join(dir, 'absent.pdf'), sha256: sha256(bytes) }] });
    assert.equal(missing.length, 1);
    assert.equal(missing[0].missing, true);
    assert.equal(currentBytesOf(path.join(dir, 'absent.pdf')).bytes, null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
