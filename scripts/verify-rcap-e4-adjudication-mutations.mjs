#!/usr/bin/env node
// Proves the canonical crosswalk CONSUMES the E4 adjudication input.
//
// Each mutation edits data/rcap-ledger/crosswalk-resolution-adjudication.json,
// re-runs the canonical generator in --check mode, and requires it to go red.
// A mutation that leaves the check green means the generated files do not
// actually depend on the input, and this verifier fails.
//
//   node scripts/verify-rcap-e4-adjudication-mutations.mjs

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(rootDir, 'data/rcap-ledger/crosswalk-resolution-adjudication.json');
const generator = path.join(rootDir, 'scripts/generate-rcap-track-pathway-crosswalk.mjs');
const original = fs.readFileSync(target, 'utf8');

function checkIsRed() {
  try {
    execFileSync('node', [generator, '--check'], { cwd: rootDir, stdio: 'pipe' });
    return false; // exited 0 — still green
  } catch {
    return true;
  }
}

const clone = () => JSON.parse(original);
const firstOf = (doc, pred) => doc.canonicalRelationships.find(pred);

// The live table carries no still_blocked rows since the official-source and
// MD lifts resolved them, but the blocked code path is still load-bearing —
// any lift regression re-emits blocked rows. These classes therefore inject a
// well-formed synthetic blocked row on a real subject and then break it; a
// well-formed injection alone passes, so each catch below is the named defect.
const injectBlocked = (d) => {
  const row = {
    jobId: 'compiled_pathway:AL:human-trafficking-victim-expungement',
    lane: 'E4-MUTATION-SYNTHETIC',
    subjectKind: 'compiled_pathway',
    jurisdiction: 'AL',
    subjectId: 'human-trafficking-victim-expungement',
    relationshipType: 'still_blocked',
    counterpart: null,
    laneOutcome: 'still_blocked',
    laneConfidence: 'high',
    evidence: [],
    evidencePins: [],
    missingEvidence: 'Synthetic blocked row injected by the mutation harness for discipline checks.',
    owner: 'mutation harness',
    nextAction: 'Not applicable; this row exists only inside a mutation run.',
    blockerKind: 'official_source_gap',
    milestone1Item2Effect: 'none; synthetic',
  };
  d.canonicalRelationships.push(row);
  return row;
};

const MUTATIONS = [
  ['input removed entirely (consumption proof)', () => null],
  ['canonicalRelationships emptied', (d) => { d.canonicalRelationships = []; return d; }],
  ['false closure: one resolved adjudication deleted', (d) => {
    const i = d.canonicalRelationships.findIndex((r) => r.relationshipType === 'direct_runtime_representation');
    d.canonicalRelationships.splice(i, 1);
    return d;
  }],
  ['false closure: a still_blocked row flipped to resolved', (d) => {
    const r = injectBlocked(d);
    r.relationshipType = 'direct_runtime_representation';
    r.counterpart = 'al-trafficking';
    r.license = 'x'.repeat(60);
    return d;
  }],
  ['adjudicated job does not exist', (d) => {
    const r = firstOf(d, (x) => x.relationshipType === 'direct_runtime_representation');
    r.subjectId = 'no-such-pathway-anywhere';
    return d;
  }],
  ['a job appears more than once', (d) => {
    d.canonicalRelationships.push({ ...d.canonicalRelationships[0] });
    return d;
  }],
  ['counterpart absent from the identifier universe', (d) => {
    const r = firstOf(d, (x) => x.relationshipType === 'direct_runtime_representation');
    r.counterpart = 'not_a_registry_track_at_all';
    return d;
  }],
  ['counterpart direction inverted (pathway subject given a pathway counterpart)', (d) => {
    const r = firstOf(d, (x) => x.subjectKind === 'compiled_pathway' && x.relationshipType === 'direct_runtime_representation');
    r.counterpart = r.subjectId;
    return d;
  }],
  ['counterpart direction inverted (track subject given a track counterpart)', (d) => {
    const r = firstOf(d, (x) => x.subjectKind === 'registry_track' && x.relationshipType === 'exact_current_pathway');
    r.counterpart = r.subjectId;
    return d;
  }],
  ['relationship type is not canonical', (d) => {
    const r = firstOf(d, (x) => x.relationshipType === 'direct_runtime_representation');
    r.relationshipType = 'probably_related';
    return d;
  }],
  ['track relation used on a pathway subject', (d) => {
    const r = firstOf(d, (x) => x.subjectKind === 'compiled_pathway' && x.relationshipType === 'direct_runtime_representation');
    r.relationshipType = 'exact_current_pathway';
    return d;
  }],
  ['resolved relationship stripped of its licence', (d) => {
    const r = firstOf(d, (x) => x.relationshipType === 'direct_runtime_representation');
    r.license = null;
    return d;
  }],
  ['resolved relationship given a stub licence', (d) => {
    const r = firstOf(d, (x) => x.relationshipType === 'direct_runtime_representation');
    r.license = 'because';
    return d;
  }],
  ['terminal classification promoted to a launch-ledger effect', (d) => {
    const r = firstOf(d, (x) => x.relationshipType === 'crosswalk_terminal_classified');
    r.launchLedgerEffect = 'promote';
    return d;
  }],
  ['terminal classification drops crosswalkTerminalOnly', (d) => {
    const r = firstOf(d, (x) => x.relationshipType === 'crosswalk_terminal_classified');
    r.crosswalkTerminalOnly = false;
    return d;
  }],
  ['terminal classification attempts to set tracksTerminal', (d) => {
    const r = firstOf(d, (x) => x.relationshipType === 'crosswalk_terminal_classified');
    r.tracksTerminal = 1;
    return d;
  }],
  ['terminal classification attempts to set finalDisposition', (d) => {
    const r = firstOf(d, (x) => x.relationshipType === 'crosswalk_terminal_classified');
    r.finalDisposition = true;
    return d;
  }],
  ['still_blocked record loses its owner', (d) => {
    const r = injectBlocked(d);
    r.owner = '';
    return d;
  }],
  ['still_blocked record loses its next action', (d) => {
    const r = injectBlocked(d);
    delete r.nextAction;
    return d;
  }],
  ['still_blocked record given vague missing evidence', (d) => {
    const r = injectBlocked(d);
    r.missingEvidence = 'unnamed';
    return d;
  }],
  ['evidence pin points at a commit that does not resolve', (d) => {
    const r = firstOf(d, (x) => (x.evidencePins || []).length > 0);
    r.evidencePins = r.evidencePins.map((p) => p.replace(/@[0-9a-f]+/, '@deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'));
    return d;
  }],
  ['evidence pin points at a blob that does not resolve', (d) => {
    const r = firstOf(d, (x) => (x.evidencePins || []).length > 0);
    r.evidencePins = r.evidencePins.map((p) => p.replace(/^[^@]+/, 'data/rcap-ledger/no-such-file.json'));
    return d;
  }],
  ['evidence pointer drifts out of the pinned blob', (d) => {
    // Repin to a file that genuinely exists at that commit but names neither the
    // subject nor its counterpart — the honest shape of pointer drift.
    const r = firstOf(d, (x) => (x.evidencePins || []).length > 0 && x.counterpart);
    r.evidencePins = r.evidencePins.map((p) => `package.json@${p.split('@').pop()}`);
    r.evidence = [...(r.evidence || []).filter((e) => !e.includes('@')), ...r.evidencePins];
    return d;
  }],
  ['in-tree citation no longer exists', (d) => {
    const r = firstOf(d, (x) => (x.evidence || []).some((e) => !e.includes('@')));
    r.evidence = [...r.evidence, 'src/lib/rcap/state-packs/atlantis/eligibility-rules.ts'];
    return d;
  }],
  ['adjudication overrides a stronger existing relationship', (d) => {
    const r = firstOf(d, (x) => x.relationshipType === 'direct_runtime_representation');
    // point it at a pathway the automatic pass already classified
    r.subjectId = 'adult-non-conviction-expungement-under-crim-proc-10-105';
    r.jurisdiction = 'MD';
    r.subjectKind = 'compiled_pathway';
    r.counterpart = 'md_10105_favorable';
    return d;
  }],
  ['two adjudications conflict on one pairing', (d) => {
    const a = firstOf(d, (x) => x.jobId === 'compiled_pathway:TX:expunction-after-qualifying-dismissal-or-quash');
    const b = firstOf(d, (x) => x.jobId === 'compiled_pathway:TX:expunction-after-qualifying-class-c-deferred-disposition');
    // make both claim the same pairing with incompatible semantics
    b.subjectId = a.subjectId;
    b.relationshipType = 'compiled_variant_of_registry_track';
    a.relationshipType = 'direct_runtime_representation';
    return d;
  }],
  ['terminal relation renamed away from the canonical value', (d) => {
    d.canonicalVocabulary.terminal = 'terminalized';
    return d;
  }],
];

let pass = 0;
const survived = [];
try {
  for (const [name, mutate] of MUTATIONS) {
    const mutated = mutate(clone());
    if (mutated === null) fs.rmSync(target);
    else fs.writeFileSync(target, `${JSON.stringify(mutated, null, 2)}\n`);

    if (checkIsRed()) {
      pass += 1;
      console.log(`  caught   ${name}`);
    } else {
      survived.push(name);
      console.log(`  SURVIVED ${name}`);
    }
    fs.writeFileSync(target, original);
  }
} finally {
  fs.writeFileSync(target, original);
}

console.log('');
if (survived.length > 0) {
  console.error(`E4 consumption NOT proven: ${survived.length} mutation(s) left the crosswalk check green.`);
  for (const s of survived) console.error(`  - ${s}`);
  console.error('The generated files do not depend on the E4 adjudication input.');
  process.exit(1);
}
console.log(`E4 consumption proven: all ${pass} mutations turn the canonical crosswalk check red.`);
