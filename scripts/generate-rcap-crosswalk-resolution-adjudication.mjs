#!/usr/bin/env node
// Builds the canonical E4 decision table consumed by the crosswalk generator.
//
// The four E4-R lane files are EVIDENCE INPUTS. This script is where the captain
// turns that evidence into canonical decisions: it assigns each of the 38 subjects
// a canonical relationship type, records the licence the generator re-checks, and
// applies the captain overrides where a lane's mapping failed substantive review.
//
// Output: data/rcap-ledger/crosswalk-resolution-adjudication.json (canonicalRelationships)
//
//   node scripts/generate-rcap-crosswalk-resolution-adjudication.mjs
//   node scripts/generate-rcap-crosswalk-resolution-adjudication.mjs --check

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(rootDir, 'data/rcap-ledger/crosswalk-resolution-adjudication.json');
const dispatch = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rcap-ledger/crosswalk-resolution-dispatch.json'), 'utf8'));
const checkOnly = process.argv.includes('--check');

// ---------------------------------------------------------------------------
// Canonical relationship vocabulary. These are the ONLY values the generator
// accepts from this input; anything else is a hard failure there.
// ---------------------------------------------------------------------------
const PATHWAY_RELATIONS = new Set([
  'direct_runtime_representation',
  'compiled_variant_of_registry_track',
]);
const TRACK_RELATIONS = new Set([
  'exact_current_pathway',
]);
const TERMINAL_RELATION = 'crosswalk_terminal_classified';
const BLOCKED_RELATION = 'still_blocked';

// ---------------------------------------------------------------------------
// Captain decisions applied on top of the lane evidence.
// ---------------------------------------------------------------------------

// Subjects whose relationship is a VARIANT of a track already mapped, rather than
// that track's primary runtime representation. A variant adds no denominator track.
const VARIANTS = new Map([
  ['compiled_pathway:NH:dwi-dui-annulment',
    'RSA 265-A:21 lengthens the RSA 651:5 conviction waiting period for one offence class; it files the same petition. eligibility-rules.ts lists the DWI 10-year rule as the final entry inside the "Conviction waiting periods (RSA 651:5)" list, and nh_conviction_streamlined carries only III(a)(2)/III(b)(2), so the streamlined route stays distinguishable.'],
  ['compiled_pathway:TX:expunction-after-qualifying-class-c-deferred-disposition',
    'A Class C deferred disposition is the express exception written into the community-supervision bar at art. 55A.051(3), which is tx_exp_dismissed\'s own authority, not an independent article. expunction-after-qualifying-dismissal-or-quash is the primary relationship for that track by name identity with the registry legalName.'],
]);

// Lane mappings the captain rejected on substance. Each becomes still_blocked and
// MUST name exact missing evidence, an owner and a next action.
const OVERRIDES = new Map([
  ['registry_track:MD:md_pardon_expungement', {
    relationshipType: BLOCKED_RELATION,
    laneProposed: 'adult-non-conviction-expungement-under-crim-proc-10-105',
    rejectionBasis:
      'The proposed pathway is expressly scoped to cases that did not end in a conviction and mentions "pardon" zero times, while md_pardon_expungement carries the single disposition pardoned_conviction under Md. Crim. Proc. § 10-105(a)(8) and (c)(4). The MD profile refutes the mapping directly: orderedDecisionRules rule-11-full-and-unconditional-governor-pardon-10-105-route-onl carries candidatePathwayIds [cannabis-specific-expungement, automatic-expungement-under-crim-proc-10-105-1, second-chance-act-shielding, juvenile-expungement] — it routes pardon applicants AWAY from the proposed pathway. None of the seven committed MD pathways represents the pardon route.',
    missingEvidence:
      'A compiled runtime pathway representing the Md. Crim. Proc. § 10-105(a)(8) full-and-unconditional-pardon expungement route. The statutory authority is committed; what is absent is a top-level pathway in src/lib/rcap-engine/compiled/profiles/MD-maryland.json that a pardoned-conviction participant is routed to.',
    owner: 'compiled-profile build lane (MD)',
    nextAction:
      'Author an MD pardon-expungement pathway under § 10-105(a)(8)/(c)(4), then repoint rule-11 candidatePathwayIds at it. Re-run the canonical generator; md_pardon_expungement resolves to exact_current_pathway once that pathway exists.',
    milestone1Item2Effect: 'blocks closure until the MD pardon pathway is authored',
    blockerKind: 'compiled_runtime_gap',
  }],
]);

// Counsel questions that survive an EXACT relationship. These never gate the
// crosswalk mapping and never promote anything in the launch ledger.
const REVIEW_REQUIREMENTS = new Map([
  ['registry_track:WV:wv_conv_single_misdemeanor', 'wv-61-11-26-class-fidelity'],
  ['registry_track:WV:wv_conv_multiple_misdemeanors', 'wv-61-11-26-class-fidelity'],
  ['registry_track:WV:wv_conv_nonviolent_felony', 'wv-61-11-26-class-fidelity'],
  ['registry_track:KY:ky_felony_expungement_after_pardon', 'ky-431073-predicate-fidelity'],
  ['registry_track:KY:ky_felony_vacatur_expungement', 'ky-431073-predicate-fidelity'],
  ['compiled_pathway:TX:expunction-after-qualifying-class-c-deferred-disposition', 'tx-55a051-3-class-c-eligibility'],
]);

const REVIEW_DEFINITIONS = {
  'wv-61-11-26-class-fidelity': {
    question:
      'W. Va. Code § 61-11-26 carries three conviction classes with materially different waiting periods and bars. One pathway represents all three tracks. Counsel must confirm the pathway expresses the per-class differences rather than flattening them.',
    relationshipExactness:
      'EXACT. The pathway text names each class in its own words — "a misdemeanor offense or offenses" covers the single and multiple misdemeanour tracks, "a nonviolent felony offense or offenses arising from the same transaction" covers the felony track. Representation is established; only per-class fidelity is open.',
    owner: 'counsel review',
    launchLedgerEffect: 'none',
  },
  'ky-431073-predicate-fidelity': {
    question:
      'KRS 431.073 is reached by two distinct predicates, vacatur and full gubernatorial pardon. Counsel must confirm both entry routes are expressed rather than one being assumed.',
    relationshipExactness:
      'EXACT. The pathway is labelled "Eligible felony conviction vacatur and expungement under KRS 431.073" and its summary states the offence may "have a full gubernatorial pardon attached", so both predicates are named in the committed pathway text.',
    owner: 'counsel review',
    launchLedgerEffect: 'none',
  },
  'tx-55a051-3-class-c-eligibility': {
    question:
      'Whether a Class C deferred disposition counts as court-ordered community supervision for the art. 55A.051(3) carve-out. The registry flags this itself.',
    relationshipExactness:
      'EXACT as a mapping. The question is an eligibility question: either way the pathway lives inside art. 55A.051, so the counterpart track does not change.',
    owner: 'counsel review',
    launchLedgerEffect: 'none',
  },
};

// ---------------------------------------------------------------------------
// Derive the table
// ---------------------------------------------------------------------------
const rows = [];
for (const lane of dispatch.lanes) {
  const doc = JSON.parse(fs.readFileSync(path.join(rootDir, lane.resolutionPath), 'utf8'));
  for (const r of doc.resolutions) {
    const [subjectKind, jurisdiction, subjectId] = r.jobId.split(/:(.+?):(.+)/).filter(Boolean).length === 3
      ? [r.jobId.split(':')[0], r.jobId.split(':')[1], r.jobId.split(':').slice(2).join(':')]
      : [null, null, null];
    const override = OVERRIDES.get(r.jobId);
    const counterpart = r.counterpart ? String(r.counterpart).split(':').pop() : null;

    let relationshipType;
    if (override) relationshipType = override.relationshipType;
    else if (r.outcome === 'terminalized') relationshipType = TERMINAL_RELATION;
    else if (r.outcome === 'still_blocked') relationshipType = BLOCKED_RELATION;
    else if (subjectKind === 'compiled_pathway') {
      relationshipType = VARIANTS.has(r.jobId) ? 'compiled_variant_of_registry_track' : 'direct_runtime_representation';
    } else relationshipType = 'exact_current_pathway';

    const row = {
      jobId: r.jobId,
      lane: lane.laneId,
      subjectKind,
      jurisdiction,
      subjectId,
      relationshipType,
      counterpart: relationshipType === TERMINAL_RELATION || relationshipType === BLOCKED_RELATION ? null : counterpart,
      laneOutcome: r.outcome,
      laneConfidence: r.confidence ?? null,
      // Every citation the lane offered, so the generator can re-check that each
      // path still resolves and each pinned blob and pointer still exists.
      evidence: (r.repositoryEvidence || []).slice().sort(),
      evidencePins: (r.repositoryEvidence || [])
        .filter((e) => {
          const at = String(e).split('#')[0].lastIndexOf('@');
          return at > 0 && !String(e).split('#')[0].slice(at + 1).includes('/');
        })
        .sort(),
    };

    if (relationshipType === TERMINAL_RELATION) {
      row.crosswalkTerminalOnly = true;
      row.launchLedgerEffect = 'none';
      row.terminalizationBasis = r.terminalizationBasis;
    } else if (relationshipType === BLOCKED_RELATION) {
      if (override) {
        row.missingEvidence = override.missingEvidence;
        row.owner = override.owner;
        row.nextAction = override.nextAction;
        row.blockerKind = override.blockerKind;
        row.milestone1Item2Effect = override.milestone1Item2Effect;
        row.captainOverride = { laneProposed: override.laneProposed, rejectionBasis: override.rejectionBasis };
      } else {
        row.missingEvidence = r.retrievalPacket
          ? `Official primary authority named in ${r.retrievalPacket}; not committed to this repository.`
          : 'unnamed';
        row.owner = 'external-retrieval lane (outbound access required)';
        row.nextAction = `Retrieve the official primary text per ${r.retrievalPacket}, commit it, then re-run the canonical generator.`;
        row.blockerKind = 'official_source_gap';
        row.milestone1Item2Effect = 'blocks closure until the official text is committed';
        row.retrievalPacket = r.retrievalPacket ?? null;
      }
    } else {
      row.license = VARIANTS.get(r.jobId) ?? r.license ?? null;
      row.operativeAuthority = r.operativeAuthority ?? null;
    }

    const reviewKey = REVIEW_REQUIREMENTS.get(r.jobId);
    if (reviewKey) row.reviewRequirement = { id: reviewKey, ...REVIEW_DEFINITIONS[reviewKey] };

    rows.push(row);
  }
}
rows.sort((a, b) => a.jobId.localeCompare(b.jobId));

const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const doc = {
  ...existing,
  generatedBy: 'scripts/generate-rcap-crosswalk-resolution-adjudication.mjs',
  canonicalVocabulary: {
    pathwayRelations: [...PATHWAY_RELATIONS],
    trackRelations: [...TRACK_RELATIONS],
    terminal: TERMINAL_RELATION,
    blocked: BLOCKED_RELATION,
    note: 'transport value "terminalized" is translated to crosswalk_terminal_classified here and never appears downstream',
  },
  canonicalTotals: rows.reduce((m, r) => ((m[r.relationshipType] = (m[r.relationshipType] || 0) + 1), m), {}),
  reviewRequirementDefinitions: REVIEW_DEFINITIONS,
  canonicalRelationships: rows,
};

const next = `${JSON.stringify(doc, null, 2)}\n`;
if (checkOnly) {
  if (fs.readFileSync(outPath, 'utf8') !== next) {
    console.error('crosswalk-resolution-adjudication.json is stale; re-run without --check');
    process.exit(1);
  }
  console.log(`adjudication input current (${rows.length} canonical relationships)`);
} else {
  fs.writeFileSync(outPath, next);
  console.log(`wrote ${rows.length} canonical relationships`);
  for (const [k, v] of Object.entries(doc.canonicalTotals).sort()) console.log(`  ${k.padEnd(38)} ${v}`);
}
