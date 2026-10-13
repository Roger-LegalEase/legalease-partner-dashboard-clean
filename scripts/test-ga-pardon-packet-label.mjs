import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

register('./lib/ts-esm-loader.mjs', import.meta.url);
// The negative control executes the original renderer, not a simulated result.
if (process.env.RCAP_GA_PACKET_LABEL_BASELINE) {
  const file = 'src/lib/rcap/grade-a/renderer.ts';
  const source = ts.transpileModule(execFileSync('git', ['show', `${process.env.RCAP_GA_PACKET_LABEL_BASELINE}:${file}`], { encoding: 'utf8' }),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  register(`data:text/javascript,${encodeURIComponent('let data;export function initialize(d){data=d}export async function load(url,context,next){return url===data.url?{format:"module",source:data.source,shortCircuit:true}:next(url,context)}')}`,
    { data: { url: pathToFileURL(path.resolve(file)).href, source } });
}
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { composeParticipantDeliveryPacket } = await import('../src/lib/rcap/grade-a/participant-packet.ts');
const { renderGradeAPacketPdf } = await import('../src/lib/rcap/grade-a/renderer.ts');
const route = 'GA:restriction-and-sealing-of-a-pardoned-felony';
const spec = packetSpecificationFor(route);
const facts = Object.fromEntries(spec.requiredFacts.map(({ factId }) => [factId, `Synthetic ${factId}`]));
facts.participant_full_legal_name = 'Synthetic Casey Pardon';
facts.ga_pardoned_offense_section = '16-8-14(a)';
facts.ga_pardon_date = '2021-01-02';
const verificationHash = 'a'.repeat(64);
const matter = {
  routeKey: route, jurisdiction: 'GA', pathwayId: spec.pathwayId, facts,
  verificationHash, verifiedAt: '2026-10-13T00:00:00.000Z', generationPurpose: 'internal_review'
};
const packet = composeParticipantDeliveryPacket(spec, matter);
for (const id of ['ga_pardoned_offense_section', 'ga_pardon_date']) {
  for (const value of [undefined, '', '   ', { value: facts[id], unknown: true }]) {
    assert.throws(() => composeParticipantDeliveryPacket(spec, { ...matter, facts: { ...facts, [id]: value } }),
      /required fact\(s\) are missing or blank/, `${id}: missing or unnormalized facts cannot be printed`);
  }
}
const protectedFacts = { ...facts };
for (const id of [...spec.fieldOwnership.participantCompletesBeforeFilingFields,
  ...spec.fieldOwnership.courtOwnedFields, ...spec.fieldOwnership.participantAtSigningFields,
  ...spec.fieldOwnership.participantAtServiceFields]) protectedFacts[id] = 'DO_NOT_PRINT_THIRD_PARTY';
assert.ok(!JSON.stringify(composeParticipantDeliveryPacket(spec, { ...matter, facts: protectedFacts })).includes('DO_NOT_PRINT_THIRD_PARTY'));
const directory = process.argv[2] ? path.resolve(process.argv[2]) : fs.mkdtempSync(path.join(os.tmpdir(), 'ga-pardon-label-'));
fs.mkdirSync(directory, { recursive: true });
const receipts = [];
try {
  for (const variant of ['full', 'court_only']) {
    const bytes = await renderGradeAPacketPdf(packet, { variant });
    const file = path.join(directory, `${variant}.pdf`);
    fs.writeFileSync(file, bytes);
    const text = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' });
    assert.ok(!/pardoned[- ]felony|restriction-and-sealing-of-a-pardoned-felony/i.test(text), `${variant}: legacy internal identifier must not misclassify the participant's conviction`);
    assert.ok(text.includes('Following Pardon') || text.includes('Following a Pardon'));
    for (const id of ['ga_pardoned_offense_section', 'ga_pardon_date']) assert.ok(text.includes(facts[id]), `${variant}: ${id} reaches the petition`);
    if (variant === 'full') {
      assert.ok(text.includes(verificationHash), 'Protected verification provenance is retained');
      assert.ok(text.includes(spec.specificationVersion), 'Packet version is retained');
    }
    receipts.push({ variant, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
  }
  assert.equal(packet.routeKey, route, 'Wire route identity is unchanged');
  assert.equal(packet.specificationId, spec.specificationId, 'Server specification identity is unchanged');
  for (const artifact of spec.approvedArtifacts) {
    const bytes = fs.readFileSync(artifact.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), artifact.sha256);
    assert.equal(bytes.length, artifact.byteLength);
  }
  console.log(JSON.stringify({ status: 'PASS', receipts, scope: 'Actual GA petition offense/date mappings and provenance-page copy; protected blanks and original artifacts unchanged. No protected delivery or new legal approval.' }));
} finally {
  if (!process.argv[2]) fs.rmSync(directory, { recursive: true });
}
