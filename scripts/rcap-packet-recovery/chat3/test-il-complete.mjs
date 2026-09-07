#!/usr/bin/env node
// Author regression tests. Runs the actual pdf-lib host; no metric doubles.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPacket, resolveSources, FIXTURES, ORDER_COURT_OWNED } from '../../build-census-v1-il-seal-edu-set.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const out = path.join(root, 'data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const sources = resolveSources();
const sourceBefore = sources.map(s => sha(s.bytes));
const results = [], negatives = [];
for (const [name, facts] of Object.entries(FIXTURES)) {
  const packet = await buildPacket(sources, name, facts);
  assert.equal(sha(packet.bytes), sha(fs.readFileSync(path.join(out, 'fixtures', `${name}.pdf`))), 'complete renderer output must match published fixture candidate');
  assert.equal(packet.pageCount, 13);
  const contacts = {'3 - Name':facts.full,'3 - Address':facts.street,'3 - Email':facts.email,'3 - Telephone':facts.phone};
  for (const [field, value] of Object.entries(contacts)) {
    const row = packet.writes.find(w => w.documentId === 'EXP-AD Order Granting' && w.fieldName === field);
    assert.equal(row?.drawnText, value, `held order contact ${field}`);
    assert.ok(!packet.refusals.some(r => r.documentId === 'EXP-AD Order Granting' && r.fieldName === field));
  }
  for (const field of ORDER_COURT_OWNED) assert.ok(!packet.writes.some(w => w.documentId === 'EXP-AD Order Granting' && w.fieldName === field));
  assert.ok(!packet.writes.some(w => /signature|entered date|judge/i.test(w.fieldName)), 'no execution or judicial field writes');
  const charge = packet.writes.filter(w => w.documentId === 'EXP-AD Request' && /List all charges/i.test(w.fieldName));
  assert.equal(charge.length, 1); assert.equal(charge[0].page, 4); assert.equal(charge[0].drawnText, facts.charge);
  assert.ok(!packet.writes.some(w => /exactly as (shown|printed)|materially exceeds/i.test(w.drawnText ?? '')));
  assert.ok(!packet.writes.some(w => w.documentId === 'EXP-AD Request' && w.page === 2 && /Arrest|charges|Outcome/i.test(w.fieldName)), 'inactive expungement rows blank');
  assert.ok(packet.writes.filter(w => w.fontSize).every(w => w.fontSize >= 5.5), 'existing font floor preserved');
  results.push({fixture:name,sha256:sha(packet.bytes),bytes:packet.bytes.length,pages:packet.pageCount,heldContacts:4,chargeFromExistingSyntheticFixture:true,protectedWrites:0});
  const cases = [
    ...['caseNumber','arrestAgency','charge','arrestDate','outcome','full','street','phone','email'].map(key => [`missing-${key}`, {...facts,[key]:null}]),
    ['legacy-canonical-instruction', {...facts,charge:'Charge exactly as shown on the court disposition'}],
    ['legacy-boundary-instruction', {...facts,charge:'Complete charge exactly as printed on the certified disposition'}],
    ['boundary-prose', {...facts,charge:'Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line'}],
    ['case-in-charge', {...facts,charge:facts.caseNumber}],
    ['unknown-charge', {...facts,charge:'Not sure'}]
  ];
  for (const [mutation, changed] of cases) {
    await assert.rejects(() => buildPacket(sources,name,changed), /REQUIRED_BEFORE_FILING/);
    negatives.push({fixture:name,mutation,rejected:true});
  }
}
const damaged = sources.map(s => ({...s, bytes:Buffer.from(s.bytes)}));
damaged[0].bytes[100] ^= 1;
for (const [mutation, value] of [['corrupt-official-source',damaged],['missing-component',sources.slice(1)],['wrong-component-order',[sources[1],sources[0],...sources.slice(2)]]]) {
  await assert.rejects(() => buildPacket(value,'canonical',FIXTURES.canonical), /source hash drift|component/);
  negatives.push({mutation,rejected:true});
}
assert.deepEqual(sources.map(s => sha(s.bytes)),sourceBefore,'source bytes restored/unchanged');
console.log(JSON.stringify({familyId:'il-seal-edu-set',scope:'author QA; actual full renderer',positivePackets:results,negativeControls:negatives,negativeCount:negatives.length,sourceBytesUnchanged:true,independentApproval:false},null,2));
