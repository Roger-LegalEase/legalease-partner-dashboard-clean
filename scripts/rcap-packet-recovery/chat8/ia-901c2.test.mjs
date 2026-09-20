import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { PDFDocument } from 'pdf-lib';
import { scanBytesForActiveContent } from '../../rcap-official-forms/rcap-active-content.mjs';
import { FAMILY, ROOT, SOURCE, SOURCE_SHA256, fixtureFacts, renderFixture, validateFacts, sha256, dateValue } from './ia-901c2.mjs';

const fresh = () => fixtureFacts().canonical;
const key = short => '2.86-1.' + short;
const write = (r, short) => r.actualWrites.find(x => x.fieldId === key(short));
const blank = (r, short) => r.blanks.find(x => x.fieldId === key(short));
const results = new Map();

test('source digest is the exact retained three-page Form 1, not Form 2 or DCI', async () => {
  const b = await fs.readFile(path.join(ROOT, SOURCE));
  assert.equal(sha256(b), SOURCE_SHA256);
  const d = await PDFDocument.load(b, { updateMetadata: false });
  assert.equal(d.getPageCount(), 3);
  assert.equal(d.getForm().getFields().length, 56);
  assert.equal(d.getForm().getFields().reduce((n, f) => n + f.acroField.getWidgets().length, 0), 59);
});
for (const [name, facts] of Object.entries(fixtureFacts())) {
  test(`actual complete renderer: ${name}`, async () => {
    const r = await renderFixture(facts); results.set(name, r);
    assert.equal(r.map.length, 57);
    assert.equal(new Set(r.map.map(x => x.fieldId)).size, 57);
    assert.equal(r.actualWrites.length + r.blanks.length, 57);
    assert.equal(r.blanks.filter(x => x.disposition === 'NON_FILING_SOURCE_ELEMENT').length, 5);
    assert(r.coverage.some(c => c.id === 'application-with-embedded-service' && c.pages === 3));
    assert.equal(r.coverage.some(c => c.id === 'participant-good-cause-statement'), facts.requestsWaiverOf180Days);
    assert.equal(r.coverage.at(-1).fileWithCourt, false);
    assert(!r.coverage.some(c => /proposed.order|notary|dci|billing|separate.service/i.test(c.id)));
    for (const bytes of [r.packet, ...r.components.map(c => c.bytes)]) {
      const d = await PDFDocument.load(bytes, { updateMetadata: false });
      assert.equal(d.getForm().getFields().length, 0);
      assert.deepEqual(scanBytesForActiveContent(bytes), { hits: [], inspectable: true, compressed: false });
    }
    assert.equal((await PDFDocument.load(r.packet)).getPageCount(), r.coverage.reduce((n, c) => n + c.pages, 0));
    for (const w of r.actualWrites) if (w.fit) {
      assert.notEqual(w.fit.outcome, 'refused'); assert(w.fit.fontSize >= 8);
    }
    // No court decisions, signing, service completion or attorney facts fabricated.
    const protectedIds = ['sig.AB', 'sig.a.02', 'sig.a.03', 'sig.a.04', 'cert.02', 'cert.03', 'cert.04', '01.00', '01.AB'];
    for (const id of protectedIds) { assert(!write(r, id)); assert(blank(r, id)); }
    assert(!r.actualWrites.some(w => w.fieldId.startsWith(key('sig.b.'))));
    assert(r.blanks.some(b => b.fieldId === 'printed.participant-signature-rule'));
    assert.equal(write(r, 'cap.03').value, facts.name);
    assert.equal(write(r, 'sig.a.01').value, facts.name);
    if (facts.phone) {
      assert.equal(write(r, 'sig.a.09').value, facts.phone.slice(0, 3));
      assert.equal(write(r, 'sig.a.10').value, facts.phone.slice(3, 6) + '-' + facts.phone.slice(6));
    }
    if (facts.filingMethod === 'efile') {
      assert(!r.actualWrites.some(w => w.fieldId.startsWith(key('cert.'))));
      assert.equal(r.blanks.filter(b => b.fieldId.startsWith(key('cert.'))).length, 9);
    } else {
      assert.equal(write(r, 'cert.01').value, facts.name);
      if (facts.countyAttorney) assert.equal(write(r, 'cert.05').value, facts.countyAttorney.name);
    }
    if (facts.requestsWaiverOf180Days) {
      assert.equal(write(r, '03.AB').value, 'B'); assert.equal(write(r, '03.B.c').value, true);
    } else if (!r.timing.formWordingNeedsManualResolution) assert.equal(write(r, '03.AB').value, 'A');
  });
}

test('exact day 180 is statutory minimum met, not a false >180 checkbox or denied eligibility', async () => {
  const r = results.get('exact-day-180') ?? await renderFixture(fixtureFacts()['exact-day-180']);
  assert.equal(r.timing.daysSinceDisposition, 180);
  assert.equal(r.timing.statutoryMinimumMet, true);
  assert.equal(r.timing.formWordingNeedsManualResolution, true);
  assert(!write(r, '03.00')); assert(!write(r, '03.AB'));
  assert.equal(blank(r, '03.AB').disposition, 'REQUIRED_BEFORE_FILING');
  assert.match(JSON.stringify(r.instructions), /DAY-180 WARNING/);
});

test('unknown required contacts remain disclosed, never optional, blank-silent or invented', async () => {
  const r = results.get('missing-contact') ?? await renderFixture(fixtureFacts()['missing-contact']);
  for (const id of ['sig.a.05', 'sig.a.06', 'sig.a.07', 'sig.a.08', 'sig.a.09', 'sig.a.10', 'sig.a.11', 'cert.05', 'cert.06', 'cert.07', 'cert.08', 'cert.09']) {
    assert.equal(blank(r, id).disposition, 'REQUIRED_BEFORE_FILING'); assert(!write(r, id));
  }
  assert.match(JSON.stringify(r.instructions), /Complete these unknown items before filing/);
});

test('ordinary branch omits inapplicable waiver content and leaves attorney block unused', async () => {
  const r = results.get('canonical') ?? await renderFixture(fresh());
  for (const id of ['03.B.f', '03.B.c']) assert.equal(blank(r, id).disposition, 'NOT_APPLICABLE_ON_THIS_ROUTE');
  assert.equal(blank(r, 'cap.02').disposition, 'NOT_APPLICABLE_ON_THIS_ROUTE');
  assert.equal(blank(r, 'sig.b.13').disposition, 'NOT_APPLICABLE_ON_THIS_ROUTE');
});
for (const name of ['name', 'county', 'caseNumber', 'plaintiff', 'filingMethod', 'outcome', 'dispositionDate', 'assessmentDate', 'requestsWaiverOf180Days']) {
  test(`required input rejected when missing: ${name}`, () => {
    const f = fresh(); delete f[name]; assert.throws(() => validateFacts(f));
  });
}
for (const name of ['financialObligationsPaid', 'notNgri', 'notIncompetent', 'publicOffense', 'districtCourtRecord', 'selfRepresented']) {
  for (const value of [false, null, undefined]) test(`no implied attestation ${name}=${String(value)}`, () => {
    const f = fresh(); f[name] = value; assert.throws(() => validateFacts(f), /confirmation/);
  });
}
for (const name of ['signature', 'signingDate', 'serviceDate', 'countyAttorneyConsent', 'judicialOrder', 'rawFields', 'feePaid', 'feeWaiverRequested', 'notarized', 'dciResult']) {
  test(`reject fabricated or wrong-product input: ${name}`, () => {
    const f = fresh(); f[name] = 'not allowed'; assert.throws(() => validateFacts(f), /Unpermitted input/);
  });
}
for (const name of ['provideCopy', 'confidentialNotDestroyed', 'notDeferredJudgment', 'publicOffense']) {
  test(`read-before-signing checkbox needs participant acknowledgment: ${name}`, () => {
    const f = fresh(); delete f.acknowledgments[name]; assert.throws(() => validateFacts(f), /acknowledgment/);
  });
}
for (const outcome of ['partial_dismissal', 'convicted', 'unknown', 'mixed', null]) test(`route rejection: ${String(outcome)}`, () => {
  const f = fresh(); f.outcome = outcome; assert.throws(() => validateFacts(f), /all charges/);
});
test('deferred judgment is not routed through Form 1', () => {
  const f = fresh(); f.deferredJudgment = true; assert.throws(() => validateFacts(f), /deferred judgment/);
});
test('180-day anchor uses order entry, supports leap dates and rejects calendar normalization', () => {
  assert.equal(dateValue('2024-02-29').toISOString(), '2024-02-29T00:00:00.000Z');
  for (const s of ['2025-02-29', '2026-02-30', '2026-13-01', '09/07/2026', '', null]) assert.throws(() => dateValue(s));
  const f = fresh(); f.dispositionDate = '2026-03-12'; assert.throws(() => validateFacts(f), /Waiting period/);
  f.dispositionDate = '2026-09-08'; assert.throws(() => validateFacts(f), /postdate/);
  assert.equal(validateFacts(fixtureFacts().boundary).daysSinceDisposition, 181);
});
test('waiver is a participant request, not a signature or court decision', () => {
  const f = fixtureFacts()['good-cause-waiver'];
  assert.equal(validateFacts(f).daysSinceDisposition, 30);
  for (const v of ['assistant', null]) { f.narrativeAuthorship = v; assert.throws(() => validateFacts(f), /participant-authored/); }
  f.narrativeAuthorship = 'participant';
  for (const b of ['identity_theft', 'mistaken_identity', null]) { f.waiverBasis = b; assert.throws(() => validateFacts(f), /Self-help stop/); }
  f.waiverBasis = 'other'; f.goodCauseNarrative = ''; assert.throws(() => validateFacts(f), /narrative required/);
});
test('inapplicable narrative cannot leak into the ordinary route', () => {
  const f = fresh(); f.goodCauseNarrative = 'must not be printed'; assert.throws(() => validateFacts(f), /inapplicable/);
});
for (const [keyName, value] of [['name', 'A'.repeat(61)], ['county', 'A'.repeat(17)], ['caseNumber', 'A'.repeat(41)], ['address', 'A'.repeat(81)], ['email', 'a'.repeat(50) + '@example.org']]) {
  test(`source maximum length or readable width is enforced: ${keyName}`, async () => {
    const f = fresh(); f[keyName] = value;
    await assert.rejects(renderFixture(f), /Source maximum length|Unreadable known fact/);
  });
}
test('extreme readable-name width is refused rather than 4-point text or truncation', async () => {
  const f = fresh(); f.name = 'W'.repeat(55);
  await assert.rejects(renderFixture(f), /Unreadable known fact/);
});
test('accented name survives an actual renderer and text extraction', async () => {
  const f = fresh(); f.name = 'Renée Example';
  const r = await renderFixture(f);
  assert.equal(write(r, 'cap.03').value, 'Renée Example');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'chat8-accent-'));
  try {
    const p = path.join(temp, 'packet.pdf'); await fs.writeFile(p, r.packet);
    const text = spawnSync('pdftotext', [p, '-'], { encoding: 'utf8' });
    assert.equal(text.status, 0); assert.match(text.stdout, /Renée Example/);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
test('long participant narrative actually renders multiple attached pages without truncation', async () => {
  const f = fixtureFacts()['good-cause-waiver'];
  f.goodCauseNarrative = Array.from({ length: 45 }, (_, i) => `Paragraph ${i + 1}: This is an explicitly synthetic participant-authored statement for boundary layout testing, not a factual court finding or a signature.`).join('\n');
  const r = await renderFixture(f);
  assert(r.coverage.find(c => c.id === 'participant-good-cause-statement').pages >= 2);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'chat8-narrative-'));
  try {
    const p = path.join(temp, 'statement.pdf'); await fs.writeFile(p, r.components.find(c => c.id === 'participant-good-cause-statement').bytes);
    const text = spawnSync('pdftotext', [p, '-'], { encoding: 'utf8' });
    assert.equal(text.status, 0); assert.match(text.stdout, /Paragraph 1:/); assert.match(text.stdout, /Paragraph 45:/);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
test('wrong-source, stale-source and byte corruption stop the actual renderer', async () => {
  const source = await fs.readFile(path.join(ROOT, SOURCE)); const corrupt = Buffer.from(source); corrupt[corrupt.length - 100] ^= 1;
  await assert.rejects(renderFixture(fresh(), { sourceBytes: corrupt }), /Wrong or stale/);
  await assert.rejects(renderFixture(fresh(), { sourceBytes: Buffer.from('%PDF-1.4 wrong family') }), /Wrong or stale/);
});
test('wrapper import has no build side effects; unknown CLI switches are rejected', () => {
  const wrapper = path.join(ROOT, 'scripts/build-census-v1-ia-901c2-set.mjs');
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify('file://' + wrapper)}); if (typeof m.buildFamily !== 'function') process.exit(2);`], { cwd: os.tmpdir(), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.equal(r.stdout, '');
  const p = spawnSync(process.execPath, [wrapper, '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.notEqual(p.status, 0); assert.match(p.stderr, /full five-fixture build/);
});
