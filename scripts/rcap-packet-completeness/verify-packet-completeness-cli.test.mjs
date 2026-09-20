import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
const verifier = fileURLToPath(new URL('./verify-packet-completeness.mjs', import.meta.url));
for (const flags of [['--check'], ['--write'], ['--family', 'caller-family'], ['--caller-only']]) {
  test(`imported audit ignores caller arguments ${flags.join(' ')}`, () => {
    const code = `process.argv = [process.execPath, '/tmp/rcap-caller.mjs', ...${JSON.stringify(flags)}]; const m = await import(${JSON.stringify(new URL('./verify-packet-completeness.mjs', import.meta.url).href)}); if (typeof m.auditPreparedInputs !== 'function') process.exit(3); console.log('HELPER_IMPORTED');`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {encoding:'utf8', timeout:30000});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'HELPER_IMPORTED');
  });
}
for (const flags of [['--check'], ['--family'], ['not-a-family-filter']]) {
  test(`verifier CLI still rejects ${flags.join(' ')}`, () => {
    const result = spawnSync(process.execPath, [verifier, ...flags], {encoding:'utf8', timeout:30000});
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /UNRECOGNISED_ARGUMENT/);
    assert.equal(result.stdout, '');
  });
}
