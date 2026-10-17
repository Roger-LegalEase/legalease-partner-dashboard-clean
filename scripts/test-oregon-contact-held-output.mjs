import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PDFDocument, StandardFonts } from 'pdf-lib';
const root = process.cwd(), read = file => fs.readFileSync(path.join(root, file));
register(pathToFileURL(path.join(root, 'scripts/lib/ts-esm-loader.mjs')));
const { prepareOregonContactHeldOutput: prepare, renderOregonContactHeldOutput: render } = await import('./lib/oregon-contact-held-output.mjs');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const H = await import('../src/lib/rcap-engine/oregon-disposition-identity.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
// Standard-font metrics only: no source PDF load, finalizer or output render.
const metricDocument = await PDFDocument.create();
const metricFont = await metricDocument.embedFont(StandardFonts.Helvetica);
const originalProfile = JSON.parse(read('data/rcap-all50/overlays/lane-c-candidates/oregon/or-ojd-adult-set-aside-packet-motion-and-declaration/overlay-profile.json'));
let checks = 0;
const check = (name, fn) => { try { fn(); checks++; } catch(error) { error.message = name + ': ' + error.message; throw error; } };
const text = value => ({ value, unknown: false });
// Synthetic in-memory source witnesses only. No owner capture, fixture install,
// source fetch, PDF parsing/finalizer execution or output artifact is performed.
function recordFor(key, contacts = {}) {
  const answers = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', pending_cases: 'No', state_exclusion_categories: ['None of these'],
    ...(key === 'never_charged' ? { case_outcome: 'Arrest or citation with no charge filed', [H.OR_DECLINATION_ID]: 'yes', [H.OR_DECLINATION_DATE_ID]: text('2026-01-01') }
      : key === 'acquittal' ? { case_outcome: 'Acquitted or found not guilty', or_no_conviction_in_scope: 'yes' }
        : { case_outcome: 'Dismissed, no-billed, nolle prosequi, or not prosecuted', or_disposition_record: 'ordinary_dismissal', or_no_conviction_in_scope: 'yes' }) };
  const authoritative = evaluate({ jurisdiction: 'OR', profileVersion: H.OR_DISPOSITION_SOURCE.profileVersion, matterId: 'synthetic-held-contact-only', answers });
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, dependencies: {}, capturedAt: '2026-10-14T00:00:00.000Z' });
  assert(seed);
  const record = { status: 'unverified', reason: 'SYNTHETIC_PURE_SOURCE_WITNESS_NOT_OWNER_RECORD', revision: 0, draftSnapshot: seed.snapshot };
  Object.assign(record.draftSnapshot.packetAnswers, contacts);
  record.draftHash = P.protectedPacketDraftHash(record.draftSnapshot);
  return record;
}
const contacts = { or_ojd_mailing_street: text('42 Maple Street'), or_ojd_mailing_city_state_zip: text('Portland, OR 97205'), or_ojd_email: text('chosen@example.test'),
  or_osp_address_choice: 'different', or_osp_mailing_street: text('90 Agency Reply Lane'), or_osp_mailing_city_state_zip: text('Salem, OR 97301') };
for (const key of ['never_charged', 'acquittal', 'ordinary_dismissal']) {
  const record = recordFor(key, contacts), original = structuredClone(record), prepared = prepare(record, read);
  check(key + ' preserves exact distinct current configuration and raw record', () => { assert.deepEqual(record, original); assert.equal(prepared.configuration.configurationId, H.OR_DISPOSITION_CONFIGURATIONS[key].configurationId); });
  check(key + ' two documents retain separate explicitly supplied address semantics', () => {
    assert.deepEqual(prepared.jobs.map(j => j.documentId), ['OR-OJD-ADULT-SET-ASIDE-PACKET', 'OR-OSP-SET-ASIDE-CCH']);
    assert.deepEqual(prepared.jobs[0].args.facts, { 'participant.street_address': '42 Maple Street', 'participant.city_state_zip': 'Portland, OR 97205', 'participant.email': 'chosen@example.test' });
    assert.deepEqual(prepared.jobs[1].args.facts, { 'participant.city_state_zip': '90 Agency Reply Lane, Salem, OR 97301' });
  });
  check(key + ' exact three measured anchors and one measured OSP field only', () => {
    assert.deepEqual(prepared.jobs[0].args.anchors.map(a => a.label), ['Address', 'City, State, ZIP', 'Email']);
    assert.equal(prepared.jobs[0].allowedWriteRectangles.length, 3); assert.equal(prepared.jobs[1].allowedWriteRectangles.length, 1);
    assert.deepEqual(prepared.jobs[1].args.explicitMappings, { 'Street, City, State, Zip code': 'participant.city_state_zip' });
  });
  check(key + ' original three write masks and fonts stay exact; lifted baselines contain descenders', () => {
    const court = prepared.jobs[0];
    for (const anchor of court.args.anchors) {
      const original = originalProfile.anchors.find(a => a.label === anchor.label && a.factId === anchor.factId);
      const mask = court.allowedWriteRectangles.find(r => r.field === anchor.label);
      assert.deepEqual(mask.rect, original.writeBox);
      assert.equal(anchor.fontSize, original.fontSize);
      assert.deepEqual(anchor.writeBox, { ...original.writeBox, y: original.writeBox.y + 3 });
      const ascent = metricFont.heightAtSize(anchor.fontSize, { descender: false });
      const descent = metricFont.heightAtSize(anchor.fontSize) - ascent;
      assert(anchor.writeBox.y - descent >= mask.rect.y);
      assert(anchor.writeBox.y + ascent <= mask.rect.y + mask.rect.height);
    }
  });
  check(key + ' exact OSP missing Off appearances cannot synthesize checkbox borders', () => {
    assert.equal(prepared.jobs[1].args.suppressSynthesizedAppearances, true);
    assert.equal(prepared.jobs[0].args.suppressSynthesizedAppearances, undefined);
    assert.deepEqual(prepared.jobs[1].args.selectionsFromHeldFacts, {});
  });
  check(key + ' all other OSP fields and controls remain unwritable; no NO or court inference', () => {
    const agency = prepared.jobs[1]; assert.equal(agency.args.unwritableFields.length, 21);
    for (const name of ['NAME', 'DATE OF BIRTH', 'AREA CODE', 'PHONE NUMBER', '1', 'YES', 'NO']) assert(agency.args.unwritableFields.includes(name));
    assert.deepEqual(agency.args.selectionsFromHeldFacts, {}); assert.deepEqual(prepared.jobs[0].args.selections, []);
    assert(!JSON.stringify(prepared.jobs.map(j => j.args.facts)).includes('Circuit Court'));
  });
  check(key + ' held preparation grants no filing or delivery authority', () => { for (const flag of ['filingComplete', 'generationAllowed', 'paymentAllowed', 'deliveryAllowed', 'admissionGranted']) assert.equal(prepared[flag], false); assert.equal(prepared.reviewOnly, true); });
  record.draftSnapshot.packetAnswers.or_ojd_mailing_street = text('Mutated after preparation');
  check(key + ' later caller changes cannot alter prepared facts', () => assert.equal(prepared.jobs[0].args.facts['participant.street_address'], '42 Maple Street'));
}
for (const [choice, expected] of [['same', '42 Maple Street, Portland, OR 97205'], ['different', '90 Agency Reply Lane, Salem, OR 97301'], ['unknown', null], ['not_preparing', null]]) {
  const prepared = prepare(recordFor('acquittal', { ...contacts, or_osp_address_choice: choice }), read);
  check('explicit OSP choice ' + choice, () => assert.equal(prepared.jobs.find(j => j.kind === 'acroform')?.args.facts['participant.city_state_zip'] ?? null, expected));
}
for (const raw of [undefined, {unknown: true}, text(''), text('not available'), text('no lo sé')]) {
  const record = recordFor('acquittal', { ...contacts, or_osp_address_choice: 'same' });
  if (raw === undefined) delete record.draftSnapshot.packetAnswers.or_ojd_mailing_street; else record.draftSnapshot.packetAnswers.or_ojd_mailing_street = raw;
  record.draftHash = P.protectedPacketDraftHash(record.draftSnapshot);
  const prepared = prepare(record, read);
  check('missing/unknown/unresolved source never becomes address ink ' + JSON.stringify(raw), () => { assert(!prepared.jobs.some(j => j.kind === 'acroform')); assert(!prepared.jobs[0].args.anchors.some(a => a.label === 'Address')); });
}
const empty = prepare(recordFor('acquittal'), read);
check('no supplied contact facts means no output jobs or generic aliases', () => assert.deepEqual(empty.jobs, []));
const disputed = recordFor('acquittal', { ...contacts, or_osp_address_choice: 'same' });
disputed.draftSnapshot.prefilledAnswers.or_ojd_mailing_street = text('A different saved street');
disputed.draftHash = P.protectedPacketDraftHash(disputed.draftSnapshot);
check('disputed source cannot be selected by precedence or OSP reuse', () => { const p=prepare(disputed,read); assert(!p.jobs.some(j=>j.kind==='acroform')); assert(!p.jobs[0].args.anchors.some(a=>a.label==='Address')); });
const badHash = recordFor('acquittal', contacts); badHash.draftHash = '0'.repeat(64);
check('invalid protected hash refuses preparation', () => assert.throws(()=>prepare(badHash,read)));
for (const mutate of [r=>r.status='verified', r=>r.draftSnapshot.profileSourceFingerprint='0'.repeat(64), r=>r.draftSnapshot.profileAuthorityFingerprint='0'.repeat(64), r=>r.draftSnapshot.selectedTrackId='other', r=>r.draftSnapshot.pathwayId=H.OR_RETIRED_NONCONVICTION_PATH, r=>r.draftSnapshot.paymentAllowed=true]) {
  const record = recordFor('acquittal', contacts); mutate(record); record.draftHash = P.protectedPacketDraftHash(record.draftSnapshot);
  check('rehash cannot authorize changed source/configuration/payment', () => assert.throws(()=>prepare(record,read)));
}
const valid = recordFor('acquittal', contacts);
const prepared = prepare(valid, read);
for (const file of Object.keys(prepared.sourceInputs).filter(p=>p.startsWith('data/'))) {
  check('changed retained source contract refuses ' + file, () => assert.throws(()=>prepare(valid, p=>p===file?Buffer.from('{}'):read(p))));
}
const changed = prepare(valid, read); changed.jobs[0].args.facts['participant.full_legal_name']='Injected identity';
await assert.rejects(render(changed, {}, read), /Preparation changed/); checks++;
await assert.rejects(render(prepared, {}, read), /Original source binary required/); checks++;
await assert.rejects(render(prepared, Object.fromEntries(prepared.jobs.map(j=>[j.documentId,Buffer.from('filled-output-is-not-source')])), read), /Original source binary drift/); checks++;
await assert.rejects(render(prepared, {}, p=>p.endsWith('rcap-official-form-finalize.mjs')?Buffer.from('changed'):read(p)), /Source changed before/); checks++;
console.log(`PASS ${checks} OR held contact-only preparation/source/refusal controls; no PDF render, database, owner record, authority or delivery`);
