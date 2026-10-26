import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const dir = 'data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading';
const read = name => JSON.parse(fs.readFileSync(`${dir}/${name}`));
for (const fixture of ['canonical', 'boundary']) {
  test(`${fixture}: juvenile correction does not borrow adult agency or fee rules`, () => {
    const text = execFileSync('pdftotext', ['-layout', `${dir}/fixtures/${fixture}.pdf`, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
    assert.doesNotMatch(text, /SBI|State Bureau of Identification|4373|302-739-5884|nothing is paid|no filing fee arises|Do not file a court petition/i);
    assert.match(text, /Family Court that entered the adjudication/);
    assert.match(text, /No held source establishes the destination/);
    assert.match(text, /No held source establishes a fee or fee waiver/);
    assert.match(text, /Exact office and postal address, confirmed with that office/);
    assert.match(text, /ask the clerk which office handles/);
    assert.match(text, /confirm whether a petition or correction request is needed/);
    assert.match(text, /whether anyone must receive a copy/);
    assert.match(text, /a lawyer or a legal-aid office/);
  });
}
test('office/address blank is declared and explained before sending', () => {
  const map = read('production-field-map.json');
  const request = map.maps[0];
  for (const fixture of ['canonical', 'boundary']) {
    const blank = request[`${fixture}Refusals`].find(x => x.field.endsWith('.exact_office_postal_address'));
    assert.ok(blank);
    assert.equal(blank.requiredBeforeFiling, true);
    assert.equal(blank.participantMustSupply.includes('Family Court that entered the adjudication'), true);
    assert.ok(request[`${fixture}Refusals`].some(x => x.field.endsWith('.request_signature')));
    assert.ok(request[`${fixture}Refusals`].some(x => x.field.endsWith('.request_signature_date')));
  }
  const instructions = fs.readFileSync(`${dir}/participant-instructions.md`, 'utf8');
  assert.match(instructions, /Exact office and postal address, confirmed with that office/);
  assert.match(instructions, /No held source establishes a fee or fee waiver/);
  assert.doesNotMatch(instructions, /SBI|4373|302-739-5884|no filing fee arises/i);
  const blanks = read('reports/blanks-left-for-the-participant.json');
  assert.equal(blanks.requiredBeforeFiling.length, 5);
  for (const b of blanks.requiredBeforeFiling) assert.ok(instructions.includes(b.participantMustSupply));
});
