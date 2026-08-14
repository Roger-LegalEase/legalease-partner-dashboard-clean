#!/usr/bin/env node
// One exact job per unresolved crosswalk subject, derived from the generated
// crosswalk rather than authored beside it. If the generator resolves a subject,
// its job disappears from this file on the next run; if a new subject falls out,
// a job appears. The count is never hardcoded.
//
//   node scripts/generate-rcap-official-source-jobs.mjs
//   node scripts/generate-rcap-official-source-jobs.mjs --check

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const crosswalk = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rcap-ledger/track-pathway-crosswalk.json'), 'utf8'));
const outPath = path.join(rootDir, 'data/rcap-ledger/official-source-jobs.json');
const docPath = path.join(rootDir, 'docs/record-clearing/official-source-jobs.md');
const checkOnly = process.argv.includes('--check');

// Per-subject specifics. Everything else is derived. A blocked subject with no
// entry here is a hard failure: a job that cannot name its authority is not a job.
const SPEC = {
  'compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement': {
    jobKind: 'official_retrieval',
    expectedPrimaryAuthority: '18 Pa.C.S. § 3019',
    authorityScope: 'Within 18 Pa.C.S. ch. 30. The operative vacatur/expungement provision itself — a definitions or penalties section of ch. 30 does not close this.',
    issuingBody: 'Pennsylvania General Assembly, via the Legislative Reference Bureau',
    requiredOfficialText:
      'Verbatim statutory text of the human-trafficking victim vacatur/expungement remedy: who may petition, for which offences, on what showing, and what relief the court orders. Any official petition form referenced by the section.',
    officialSources: ['https://www.legis.state.pa.us — Pa. Consolidated Statutes, Title 18, ch. 30', 'https://www.palegis.us statute browser'],
    repositoryDestination: 'private/Nationwide Record Clearing/Pennsylvania/statutes/18-pacs-3019.(txt|pdf) with the citation recorded in src/lib/rcap/state-packs/pennsylvania/',
    sourceReceipt: 'docs/record-clearing/source-receipts/PA-18-pacs-3019.md — retrieval URL, retrieval date, issuing body, and the SHA-256 of the committed file',
    owner: 'external-retrieval lane (outbound access or law-library access required)',
    stopCondition:
      'The committed text states the vacatur/expungement remedy operatively, OR the retrieved chapter is shown to contain no such remedy. A proven absence closes this as a crosswalk terminal classification just as well as a proven text.',
    milestone1Item2Effect:
      'Closes one of the two remaining pathway blockers, and closes the PA surplus — Pennsylvania is the only jurisdiction of seven whose compiled surplus is not fully explained, and this pathway is the reason.',
    researchExhaustion:
      'Repository-only research is already recorded as exhausted for this subject. Do not re-run it; every coding terminal in this sprint is egress-blocked to legislative hosts.',
  },
  'compiled_pathway:SC:human-trafficking-survivor-expungement': {
    jobKind: 'official_retrieval',
    expectedPrimaryAuthority: 'S.C. Code § 16-3-2020',
    authorityScope: 'Title 16, ch. 3. The section must be shown to grant or withhold record relief.',
    issuingBody: 'South Carolina Legislative Council',
    requiredOfficialText:
      'Verbatim text of the trafficking-survivor relief provision, including any expungement or vacatur remedy it grants and the conditions on it. Any official form the section names.',
    officialSources: ['https://www.scstatehouse.gov — S.C. Code of Laws, Title 16, ch. 3', 'South Carolina Legislative Council code browser'],
    repositoryDestination: 'private/Nationwide Record Clearing/South Carolina/statutes/sc-code-16-3-2020.(txt|pdf) with the citation recorded in src/lib/rcap/state-packs/south-carolina/',
    sourceReceipt: 'docs/record-clearing/source-receipts/SC-16-3-2020.md — retrieval URL, retrieval date, issuing body, and the SHA-256 of the committed file',
    owner: 'external-retrieval lane (outbound access or law-library access required)',
    stopCondition:
      'The committed text grants record relief, OR § 16-3-2020 is shown to be definitional or penal only. Either outcome closes the obligation; the second closes it as a crosswalk terminal classification.',
    milestone1Item2Effect:
      'Closes the second of the two remaining pathway blockers. No committed source contains this section, so the current conclusion rests on an unverifiable citation.',
    researchExhaustion:
      'Repository-only research is already recorded as exhausted for this subject. Do not re-run it.',
  },
  'registry_track:MD:md_pardon_expungement': {
    jobKind: 'source_materialization',
    expectedPrimaryAuthority: 'Md. Code, Crim. Proc. § 10-105(a)(8) and § 10-105(c)(4)',
    authorityScope:
      'Already committed and cited in the registry projection. This job needs no retrieval — the gap is in the compiled runtime, not in the authority.',
    issuingBody: 'Maryland General Assembly (statute already held); Maryland Judiciary for the petition form',
    requiredOfficialText:
      'The current Maryland petition form for expungement after a full and unconditional pardon, plus confirmation of the filing route. The statutory text is already committed.',
    officialSources: ['https://mdcourts.gov/legalhelp/expungement — Maryland Judiciary expungement forms'],
    repositoryDestination:
      'A new top-level pathway in src/lib/rcap-engine/compiled/profiles/MD-maryland.json representing the § 10-105(a)(8) pardon route, with orderedDecisionRules rule-11-full-and-unconditional-governor-pardon-10-105-route-onl repointed at it.',
    sourceReceipt: 'docs/record-clearing/source-receipts/MD-10-105-pardon-pathway.md — form identifier, revision date, and the profile commit that adds the pathway',
    owner: 'compiled-profile build lane (MD)',
    stopCondition:
      'A pardoned-conviction participant is routed to a pathway that represents the § 10-105(a)(8) remedy, and the canonical generator classifies md_pardon_expungement as exact_current_pathway without a captain override.',
    milestone1Item2Effect:
      'Closes the one remaining registry-track blocker. Until then md_pardon_expungement stays unresolved by captain decision rather than being absorbed into missing_from_compiled_runtime.',
    researchExhaustion:
      'Not a research task at all. The MD profile was read directly: seven top-level pathways, none covering pardon, and rule-11 routes pardon applicants to four pathways that are not pardon-expungement vehicles.',
  },
};

const blocked = crosswalk.e4StillBlocked || [];
const jobs = blocked
  .map((b) => {
    const spec = SPEC[b.jobId];
    if (!spec) {
      console.error(`No job spec for unresolved subject ${b.jobId}; a blocker without a named authority is not a job.`);
      process.exit(1);
    }
    return {
      jobId: `official-source:${b.jobId}`,
      subject: b.jobId,
      jurisdiction: b.jurisdiction,
      subjectKind: b.subjectKind,
      subjectId: b.subjectId,
      blockerKind: b.blockerKind,
      ...spec,
      missingEvidence: b.missingEvidence,
      nextAction: b.nextAction,
    };
  })
  .sort((a, b) => a.jobId.localeCompare(b.jobId));

const doc = {
  schemaVersion: 'rcap-official-source-jobs/v1',
  generatedBy: 'scripts/generate-rcap-official-source-jobs.mjs',
  derivedFrom: {
    path: 'data/rcap-ledger/track-pathway-crosswalk.json',
    contentHash: crosswalk.contentHash ?? null,
    unresolvedPathways: crosswalk.unresolvedIds.compiledPathways,
    unresolvedTracks: crosswalk.unresolvedIds.registryTracks,
  },
  note:
    'One job per unresolved crosswalk subject. The count is derived from the generated crosswalk on every run and is never hardcoded. ' +
    'Two are official-retrieval obligations blocked on primary authority this repository does not hold; one is a compiled-runtime gap whose authority is already committed.',
  jobCount: jobs.length,
  jobs,
};

const lines = [`# Official-source jobs — ${jobs.length} open`, ''];
lines.push(`Derived from \`data/rcap-ledger/track-pathway-crosswalk.json\` on every run. ${jobs.length} unresolved subjects remain: ${[...crosswalk.unresolvedIds.compiledPathways, ...crosswalk.unresolvedIds.registryTracks].map((i) => `\`${i}\``).join(', ')}.`);
lines.push('');
for (const j of jobs) {
  lines.push(`## ${j.jurisdiction} — \`${j.subjectId}\``);
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Job kind | ${j.jobKind} |`);
  lines.push(`| Jurisdiction | ${j.jurisdiction} |`);
  lines.push(`| ${j.subjectKind === 'compiled_pathway' ? 'Pathway' : 'Track'} ID | \`${j.subjectId}\` |`);
  lines.push(`| Expected primary authority | ${j.expectedPrimaryAuthority} |`);
  lines.push(`| Authority scope | ${j.authorityScope} |`);
  lines.push(`| Issuing body | ${j.issuingBody} |`);
  lines.push(`| Required official text or form | ${j.requiredOfficialText} |`);
  lines.push(`| Repository destination | ${j.repositoryDestination} |`);
  lines.push(`| Source receipt | ${j.sourceReceipt} |`);
  lines.push(`| Owner | ${j.owner} |`);
  lines.push(`| Stop condition | ${j.stopCondition} |`);
  lines.push(`| Effect on Milestone 1 item 2 | ${j.milestone1Item2Effect} |`);
  lines.push('');
  lines.push(`**Research exhaustion.** ${j.researchExhaustion}`);
  lines.push('');
  lines.push(`**Official sources.** ${j.officialSources.map((s) => `\`${s}\``).join(' · ')}`);
  lines.push('');
}

const nextJson = `${JSON.stringify(doc, null, 2)}\n`;
const nextDoc = `${lines.join('\n')}`;
if (checkOnly) {
  const stale =
    !fs.existsSync(outPath) || fs.readFileSync(outPath, 'utf8') !== nextJson ||
    !fs.existsSync(docPath) || fs.readFileSync(docPath, 'utf8') !== nextDoc;
  if (stale) {
    console.error('official-source-jobs artifacts are stale; re-run without --check');
    process.exit(1);
  }
  console.log(`official-source jobs current (${jobs.length})`);
} else {
  fs.writeFileSync(outPath, nextJson);
  fs.mkdirSync(path.dirname(docPath), { recursive: true });
  fs.writeFileSync(docPath, nextDoc);
  console.log(`wrote ${jobs.length} official-source jobs`);
  for (const j of jobs) console.log(`  ${j.jobKind.padEnd(22)} ${j.jurisdiction} ${j.subjectId}`);
}
