// A source-bound supplement for the five AL caption corrections. It admits
// only the recorded field/decision pairs; it never permits a new automatic write.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const receipt = JSON.parse(fs.readFileSync(new URL('./shared-semantics-expectations.json', import.meta.url)));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function verifiedAlCaptionChanges({projection, baseCommit, before, after, baseline, semantics, check}) {
  const expected = receipt.projections[projection];
  let valid = true;
  const require = (name, ok) => { check(`AL caption receipt: ${name}`, ok); valid &&= ok; };
  require('the historical comparison base matches', expected?.baseCommit === baseCommit);
  for (const census of receipt.censusFiles) {
    require(`exact census bytes ${census.path}`, sha256(fs.readFileSync(census.path)) === census.sha256);
  }
  const sourceCensus = JSON.parse(fs.readFileSync(receipt.sourceCensus));
  for (const {caption, category} of receipt.protectedControls) {
    require(`protected negative: ${caption}`, category !== null
      && baseline.protectCategoryOf(caption) === category
      && semantics.protectCategoryOf(caption) === category
      && semantics.decideBinding({name: caption, pdfType: 'text'}, {
        explicitMappings: {[caption]: 'participant.full_legal_name'}
      }).writable === false);
  }
  const accepted = [];
  for (const row of expected?.rows ?? []) {
    const doc = sourceCensus.documents.find(d => d.documentId === row.documentId);
    const field = doc?.fields.find(f => f.name === row.fieldName);
    const source = receipt.sources.find(s => s.documentId === row.documentId);
    const rule = semantics.PARTICIPANT_STATED_SUBJECT.find(r => r.id === row.ruleId);
    const ownsExactSource = source?.sha256 === row.sourceSha256
      && doc?.sourceSha256 === row.sourceSha256
      && field?.effectiveLabel === row.sourceCaption
      && field?.widgets[0]?.page === row.page;
    const exactDecision = isDeepStrictEqual(before.get(row.key), row.before)
      && isDeepStrictEqual(after.get(row.key), row.after)
      && row.before.bindingWritable === false && row.after.bindingWritable === false
      && row.before.protectCategory !== null && row.after.protectCategory === null;
    const exactCaption = Boolean(rule?.match.test(semantics.haystack(row.effectiveLabel ?? row.fieldName)))
      && isDeepStrictEqual(rule?.exempts, [row.before.protectCategory])
      && rule?.because === row.why;
    require(`source and exact refusal transition: ${row.key}`, ownsExactSource && exactDecision && exactCaption);
    if (ownsExactSource && exactDecision && exactCaption) accepted.push(row.key);
  }
  require('all recorded fields are distinct', new Set(accepted).size === expected?.rows.length);
  return valid ? accepted : [];
}
