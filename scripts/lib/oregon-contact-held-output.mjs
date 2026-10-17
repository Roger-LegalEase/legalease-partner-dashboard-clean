import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { oregonContactInputs, OR_CONTACT_SOURCE } from '../../src/lib/expungement-ai/oregon-disposition-contact.ts';
import { protectedPacketDraftHash, protectedPacketInformationModelFor } from '../../src/lib/expungement-ai/packet-information.ts';
import { finalizeFlatOverlay, finalizeOfficialForm } from '../rcap-official-forms/rcap-official-form-finalize.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fingerprint = value => hash(JSON.stringify(value));
const lane = 'data/rcap-all50/overlays/lane-c-candidates/oregon/';
const profilePath = lane + 'or-ojd-adult-set-aside-packet-motion-and-declaration/overlay-profile.json';
const motionCensusPath = lane + 'or-ojd-adult-set-aside-packet-motion-and-declaration/field-census.json';
const ospCensusPath = lane + 'or-osp-set-aside-criminal-history-request-and-instructions/field-census.json';
const finalizerPath = 'scripts/rcap-official-forms/rcap-official-form-finalize.mjs';
const pins = {
  [OR_CONTACT_SOURCE.mapPath]: OR_CONTACT_SOURCE.mapSha256,
  [profilePath]: 'b753db22a2142dfe2944c67c01610773bfd96ea6ab9142c878565975b5dc6448',
  [motionCensusPath]: '20ebbee9e39ff18084c4248e20851e7e5563647624def8d884ac875da1e589ef',
  [ospCensusPath]: '6d7b2b2b9efd6d5acf9a69316c5e3406998340f7902d3ab528aa323edf288050'
};
const OJD = 'OR-OJD-ADULT-SET-ASIDE-PACKET', OSP = 'OR-OSP-SET-ASIDE-CCH';
const destinations = [
  { field: 'p5.r303.2.x72.rule', label: 'Address', factId: 'participant.street_address' },
  { field: 'p5.r303.2.x72.rule#citystatezip', label: 'City, State, ZIP', factId: 'participant.city_state_zip' },
  { field: 'p5.r340.8.x72.rule', label: 'Email', factId: 'participant.email' }
];
const preparations = new WeakMap();

/** AT-GA-15 / Q-f7d146243ddbc9e69709: internal contact-only source witness.
 * Uses current protected facts, not the completed family's synthetic identity
 * fixture. This is not a filing packet, authority record or delivery consumer. */
export function prepareOregonContactHeldOutput(inputRecord, readBytes) {
  const record = structuredClone(inputRecord), snapshot = record.draftSnapshot;
  assert(snapshot && record.status !== 'verified', 'An exact current held draft is required');
  assert.equal(record.draftHash, protectedPacketDraftHash(snapshot), 'Protected draft integrity mismatch');
  const model = protectedPacketInformationModelFor(record), projection = oregonContactInputs(snapshot);
  assert(model && projection, 'Current protected Oregon source/configuration required');
  assert.equal(snapshot.packetPlan, null); assert.equal(snapshot.paymentAllowed, false);
  assert.notEqual(model.stage, 'ready_to_generate');
  assert.equal(projection.generationAllowed, false); assert.equal(projection.deliveryAllowed, false);
  const sourceInputs = {};
  const json = path => {
    const bytes = Uint8Array.from(readBytes(path));
    sourceInputs[path] = hash(bytes);
    if (pins[path]) assert.equal(sourceInputs[path], pins[path], 'Retained source input changed: ' + path);
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  };
  json(OR_CONTACT_SOURCE.mapPath);
  const profile = json(profilePath), motionCensus = json(motionCensusPath), ospCensus = json(ospCensusPath);
  assert.equal(profile.sha256, OR_CONTACT_SOURCE.ojdSourceSha256);
  assert.equal(motionCensus.sha256, profile.sha256); assert.equal(ospCensus.sha256, OR_CONTACT_SOURCE.ospSourceSha256);
  for (const path of [finalizerPath, 'src/lib/expungement-ai/oregon-disposition-contact.ts',
    'src/lib/expungement-ai/oregon-disposition-contact-answer.ts', 'src/lib/expungement-ai/packet-information.ts',
    'scripts/lib/oregon-contact-held-output.mjs']) sourceInputs[path] = hash(readBytes(path));
  const jobs = [];
  const courtWrites = projection.writes.filter(w => w.document === OJD);
  if (courtWrites.length) {
    const anchors = courtWrites.map(write => {
      const target = destinations.find(d => d.field === write.field && d.factId === write.factId);
      assert(target, 'Unrecognized court contact destination');
      const matches = profile.anchors.filter(a => a.label === target.label && a.factId === target.factId);
      assert.equal(matches.length, 1, 'Exact retained contact anchor required');
      const anchor = structuredClone(matches[0]);
      assert.equal(anchor.slot, target.field.split('#')[0]);
      assert(motionCensus.fields.some(f => f.name === anchor.slot && f.page === anchor.page));
      return anchor;
    });
    jobs.push({ documentId: OJD, sourceSha256: profile.sha256, pages: 5, sourceWrites: courtWrites,
      kind: 'flat', args: { expectedSha256: profile.sha256,
        // The flat finalizer interprets y as a text baseline. Keep descenders
        // inside the original source-owned box; its acceptance mask stays exact.
        anchors: anchors.map(a => ({ ...a, writeBox: { ...a.writeBox, y: a.writeBox.y + 3 } })), selections: [],
        protectedRules: profile.protectedRules ?? [], explicitMappings: Object.fromEntries(anchors.map(a => [a.label, a.factId])),
        facts: Object.fromEntries(courtWrites.map(w => [w.factId, w.value])), documentTextLines: [],
        title: 'Internal held Oregon contact-only review; not a filing packet' },
      allowedWriteRectangles: anchors.map(a => ({ page: a.page, rect: a.writeBox, field: a.label })),
      reservedFields: motionCensus.fields.filter(f => !anchors.some(a => a.slot === f.name)).map(f => f.name) });
  }
  const agencyWrites = projection.writes.filter(w => w.document === OSP);
  assert(agencyWrites.length <= 1);
  if (agencyWrites.length) {
    const [write] = agencyWrites;
    assert.equal(write.field, 'Street, City, State, Zip code');
    assert.equal(write.factId, 'participant.city_state_zip');
    const field = ospCensus.fields.find(f => f.name === write.field);
    assert(field?.widgets?.length && field.type === 'text');
    jobs.push({ documentId: OSP, sourceSha256: ospCensus.sha256, pages: 2, sourceWrites: agencyWrites,
      kind: 'acroform', args: { expectedSha256: ospCensus.sha256, census: ospCensus.fields,
        facts: { [write.factId]: write.value }, explicitMappings: { [write.field]: write.factId },
        unwritableFields: ospCensus.fields.filter(f => f.name !== write.field).map(f => f.name),
        selectionsFromHeldFacts: {},
        // Exact source YES/NO widgets are Off without an Off normal appearance.
        // Preserve that blank state instead of synthesizing unchecked borders.
        suppressSynthesizedAppearances: true,
        title: 'Internal held OSP contact-only review; separate agency document' },
      allowedWriteRectangles: field.widgets.map(widget => ({ page: widget.page ?? field.page, rect: widget.rect, field: field.name })),
      reservedFields: ospCensus.fields.filter(f => f.name !== write.field).map(f => f.name) });
  }
  assert.equal(courtWrites.length + agencyWrites.length, projection.writes.length);
  const prepared = { recordSha256: fingerprint(record), configuration: projection.configuration,
    sourceInputs, jobs, reviewOnly: true, filingComplete: false, generationAllowed: false,
    paymentAllowed: false, deliveryAllowed: false, admissionGranted: false,
    limits: ['Only supplied contact facts; no identity, DOB, court, county, option, NO checkbox, service or signature inferred.',
      'Separate OSP address comes only from the explicit protected choice; it is not an eligibility requirement.',
      'Acquittal retains its own configuration; no dismissal artifact or fixture is consumed.',
      'Actual text, source ink outside these exact rectangles, blank fields and selection-state review remain required.'] };
  preparations.set(prepared, fingerprint(prepared));
  return prepared;
}

/** Actual rendering is deliberately separate from pure preparation. Original
 * binaries are mandatory; a previously filled family artifact cannot substitute.
 * Returned bytes stay held until actual source-ink/field/visual review passes. */
export async function renderOregonContactHeldOutput(inputPrepared, officialSources, readBytes) {
  assert.equal(preparations.get(inputPrepared), fingerprint(inputPrepared), 'Preparation changed or was not validated');
  const prepared = structuredClone(inputPrepared);
  for (const [path, sha] of Object.entries(prepared.sourceInputs)) assert.equal(hash(readBytes(path)), sha, 'Source changed before held render: ' + path);
  // Capture every byte and scalar before the first asynchronous finalizer call.
  const jobs = prepared.jobs.map(job => {
    assert(officialSources[job.documentId] instanceof Uint8Array, 'Original source binary required: ' + job.documentId);
    const sourceBytes = Uint8Array.from(officialSources[job.documentId]);
    assert.equal(hash(sourceBytes), job.sourceSha256, 'Original source binary drift');
    return { ...job, args: { ...job.args, sourceBytes } };
  });
  const artifacts = [];
  for (const job of jobs) {
    const result = await (job.kind === 'flat' ? finalizeFlatOverlay(job.args) : finalizeOfficialForm(job.args));
    assert.deepEqual(result.report.unfittable ?? [], [], 'Contact value did not fit');
    assert.deepEqual(result.report.normalized ?? [], [], 'Exact saved contact must not be normalized');
    assert.deepEqual(result.report.selectionsMarked ?? [], [], 'No contact fact establishes a selection');
    const expected = job.kind === 'flat' ? job.args.anchors.map(a => ({ key: a.label, factId: a.factId }))
      : job.sourceWrites.map(w => ({ key: w.field, factId: w.factId }));
    const actual = result.report.written.map(w => ({ key: w.anchor ?? w.field, factId: w.factId }));
    assert(isDeepStrictEqual(actual, expected), 'Only exact contact destinations may be written');
    assert.equal(hash(job.args.sourceBytes), job.sourceSha256, 'Finalizer mutated original source bytes');
    artifacts.push({ documentId: job.documentId, bytes: result.bytes, sha256: hash(result.bytes), report: result.report,
      sourceSha256: job.sourceSha256, sourceWrites: job.sourceWrites, allowedWriteRectangles: job.allowedWriteRectangles,
      reservedFields: job.reservedFields, sourceInkVerified: false, visualAcceptance: false });
  }
  for (const [path, sha] of Object.entries(prepared.sourceInputs)) assert.equal(hash(readBytes(path)), sha, 'Source changed during held render: ' + path);
  return { ...prepared, jobs: undefined, artifacts, outputAcceptance: false, protectedGenerationEstablished: false };
}
