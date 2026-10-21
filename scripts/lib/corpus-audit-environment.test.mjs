import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { requireMasterLibraryEnvironment } from './corpus-index-paths.mjs';

test('bootstrap binding is supplied without inventing operational custody', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-corpus-env-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const master = path.join(root, 'master');
  fs.mkdirSync(path.join(master, 'STATES'), { recursive: true });
  const env = { RCAP_BUNDLE_EXTRACT: master };
  assert.throws(() => requireMasterLibraryEnvironment({ repoRoot: root, env }), /empty/);
  fs.mkdirSync(path.join(master, 'STATES', 'NH'));
  assert.equal(requireMasterLibraryEnvironment({ repoRoot: root, env }), master);
  assert.equal(env.MASTER_LIBRARY_SOURCE_DIR, master);
  assert.equal(env.OFFICIAL_FORMS_SOURCE_DIR, undefined);
  assert.throws(() => requireMasterLibraryEnvironment({ repoRoot: root, env: {} }), /CORPUS_ENVIRONMENT_REFUSED/);
  assert.throws(() => requireMasterLibraryEnvironment({ repoRoot: root, env: { MASTER_LIBRARY_SOURCE_DIR: 'relative' } }), /absolute/);
  assert.throws(() => requireMasterLibraryEnvironment({ repoRoot: root, env: { MASTER_LIBRARY_SOURCE_DIR: path.join(root, 'missing') } }), /unavailable/);
  assert.throws(() => requireMasterLibraryEnvironment({ repoRoot: root, env: { MASTER_LIBRARY_SOURCE_DIR: root } }), /STATES/);
  const alias = path.join(root, 'operational');
  fs.symlinkSync(master, alias);
  assert.throws(() => requireMasterLibraryEnvironment({ repoRoot: root, env: { MASTER_LIBRARY_SOURCE_DIR: master, OFFICIAL_FORMS_SOURCE_DIR: alias } }), /separate custodies/);
  assert.throws(() => requireMasterLibraryEnvironment({ repoRoot: root, env: { MASTER_LIBRARY_SOURCE_DIR: master, RCAP_BUNDLE_EXTRACT: root } }), /disagree/);
});
