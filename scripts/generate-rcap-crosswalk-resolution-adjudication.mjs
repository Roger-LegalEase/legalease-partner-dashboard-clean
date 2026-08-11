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
import crypto from 'node:crypto';
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
  'unregistered_relief_mechanism_registry_gap',
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
//
// The MD pardon override is evidence-conditional: its own next action named the
// lift condition (author the § 10-105(a)(8)/(c)(4) pathway and repoint rule-11
// at it). resolveMdPardonOverride() re-checks the MD profile on every run and
// yields the resolved relationship only while both conditions hold in the
// committed bytes; any regression returns the original blocked record, so the
// resolution can never outlive its evidence.
function resolveMdPardonOverride(blocked) {
  const PATHWAY_ID = 'pardoned-conviction-expungement-under-crim-proc-10-105-a-8';
  try {
    const profile = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'src/lib/rcap-engine/compiled/profiles/MD-maryland.json'), 'utf8')
    );
    const pathwayRow = (profile.pathways || []).find((p) => p.id === PATHWAY_ID);
    if (!pathwayRow) return blocked;
    const corpus = JSON.stringify(pathwayRow).toLowerCase();
    const hasA8 = corpus.includes('10-105(a)(8)');
    const hasC4 = corpus.includes('10-105(c)(4)');
    const rule11 = (profile.orderedDecisionRules || []).find((r) =>
      String(r.id || '').startsWith('rule-11-full-and-unconditional-governor-pardon')
    );
    const cands = rule11 ? rule11.candidatePathwayIds || (rule11.then || {}).candidatePathwayIds : null;
    const repointed = Array.isArray(cands) && cands.length === 1 && cands[0] === PATHWAY_ID;
    if (!(hasA8 && hasC4 && repointed)) return blocked;
    return {
      relationshipType: 'exact_current_pathway',
      counterpartId: PATHWAY_ID,
      license:
        'Subsection-exact, both directions, condition-lifted per the blocked record\'s own next action: the authored pathway ' +
        'carries \u00a7 10-105(a)(8) (full and unconditional pardon, one criminal act, not a crime of violence) and ' +
        '\u00a7 10-105(c)(4) (no filing later than 10 years after the Governor signed) in its own rule clauses, matching ' +
        'md_pardon_expungement\'s entire authority [\u00a7 10-105(a)(8), \u00a7 10-105(c)(4)] and sole disposition ' +
        'pardoned_conviction; and rule-11 candidatePathwayIds now routes pardon applicants to exactly this pathway. ' +
        'Re-checked against the committed profile bytes on every generation; regression of either condition re-blocks.',
      extraEvidence: [
        'src/lib/rcap-engine/compiled/profiles/MD-maryland.json',
        'docs/record-clearing/md-pardon-pathway-evidence.md',
        'scripts/verify-rcap-md-pardon-pathway.mjs',
      ],
      liftedFrom: blocked,
    };
  } catch {
    return blocked;
  }
}

const MD_PARDON_BLOCKED = {
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
  };

// The two official-source blockers lift the same way the MD pardon blocker
// did: evidence-conditionally. Their own next action named the lift condition
// (retrieve the official primary text and commit it). Terminal C committed the
// operator-supplied bytes with hash-pinned receipts; this resolver re-checks
// the receipt, the byte hash, every operative span the adjudication rests on,
// the registry-absence of the operative authority, and the compiled pathway's
// mechanism text on every run. Any failure returns null, and a null override
// falls through to the lane's own still_blocked outcome — the blocker
// re-opens byte-identically to the pre-source state.
const foldText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/§/g, '-')
    .replace(/\./g, '-')
    .replace(/\//g, '-')
    .replace(/\(/g, '-')
    .replace(/\)/g, '');

function resolveOfficialSourceGapOverride(spec) {
  try {
    const record = JSON.parse(
      fs.readFileSync(
        path.join(rootDir, 'data/rcap-crosswalk-enrichment/final-official-sources/final-official-sources.json'),
        'utf8'
      )
    );
    const subject = (record.subjects || []).find((s) => s.subjectId === spec.subjectId);
    if (!subject) return null;
    if (subject.resolution !== 'materialized' || subject.supportsProposedRelationship !== true) return null;
    if (subject.sourcePath !== spec.sourcePath || subject.sha256 !== spec.sha256) return null;
    const bytes = fs.readFileSync(path.join(rootDir, subject.sourcePath));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== spec.sha256) return null;
    const foldedBytes = foldText(bytes.toString('utf8'));
    for (const span of spec.requiredSpans) if (!foldedBytes.includes(foldText(span))) return null;
    if (!foldedBytes.includes(foldText(spec.authorityToken))) return null;
    // the operative authority must remain unregistered in the jurisdiction
    const projection = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'data/rcap-ledger/registry-crosswalk-projection.json'), 'utf8')
    );
    for (const track of projection.tracks || []) {
      if (track.jurisdiction !== spec.jurisdiction) continue;
      const op = foldText(String((track.authority || [''])[0]));
      if (new RegExp(`(?<![0-9a-z])${foldText(spec.authorityToken).replace(/[-]/g, '\\-')}(?![0-9a-z])`).test(op)) {
        return null;
      }
    }
    // the compiled pathway must still carry the mechanism it is credited with
    const profile = JSON.parse(fs.readFileSync(path.join(rootDir, spec.profilePath), 'utf8'));
    const pathwayRow = (profile.pathways || []).find((p) => p.id === spec.pathwayId);
    if (!pathwayRow) return null;
    const corpus = foldText(
      [pathwayRow.id, pathwayRow.label, pathwayRow.summary]
        .concat(pathwayRow.ruleClauses || [])
        .concat(pathwayRow.waitingRules || [])
        .map((v) => String(v ?? ''))
        .join(' ')
    );
    for (const t of spec.mechanismTokens) if (!corpus.includes(foldText(t))) return null;
    return {
      relationshipType: 'unregistered_relief_mechanism_registry_gap',
      counterpartId: null,
      license: spec.license,
      operativeAuthority: spec.operativeAuthority,
    };
  } catch {
    return null;
  }
}

const PA_OFFICIAL_SOURCE_SPEC = {
  jurisdiction: 'PA',
  pathwayId: 'path-k-human-trafficking-vacatur-expungement',
  subjectId: 'compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement',
  profilePath: 'src/lib/rcap-engine/compiled/profiles/PA-pennsylvania.json',
  sourcePath:
    'data/rcap-crosswalk-enrichment/final-official-sources/files/PA/PA_18_PaCS_3019_d-g_official_2026-08-11.txt',
  sha256: '0dc688b98962d565ab96c1ad4bbbf33a730dc0fdf51117765e733a4fe53c7dc4',
  authorityToken: '3019',
  mechanismTokens: ['vacatur', 'trafficking'],
  requiredSpans: [
    'may file a motion to vacate the conviction',
    'consented to by the attorney for the commonwealth',
    'the court shall grant the motion if it finds',
    'direct result of being a victim of human trafficking',
    'vacate the conviction, strike the adjudication of guilt and order the expungement',
  ],
  operativeAuthority: '18 Pa.C.S. § 3019(d)-(g)',
  license:
    'Official-source registry gap, condition-lifted per the blocked record’s own next action: the operator-supplied ' +
    '18 Pa.C.S. § 3019(d)-(g) bytes are committed and hash-receipted (sha256 0dc688b9…), and read directly they establish ' +
    'a motion-to-vacate mechanism for a closed conviction set (§§ 3503, 5503, 5506, 5507, 5902, simple possession) committed ' +
    'as a direct result of being a trafficking victim, with written motion, Commonwealth consent, particularized evidence, an ' +
    'official-documentation presumption, a mandatory grant standard, and vacatur plus expungement of all related records on grant. ' +
    'The compiled path-k pathway carries this mechanism at guidance depth and no PA registry track carries § 3019 operatively, ' +
    'so the pathway is an unregistered relief mechanism — a registry-owner blocker, never a denominator change. Re-checked ' +
    'against the committed receipt, bytes, registry projection and profile on every generation; any drift re-blocks.',
};

const SC_OFFICIAL_SOURCE_SPEC = {
  jurisdiction: 'SC',
  pathwayId: 'human-trafficking-survivor-expungement',
  subjectId: 'compiled_pathway:SC:human-trafficking-survivor-expungement',
  profilePath: 'src/lib/rcap-engine/compiled/profiles/SC-south-carolina.json',
  sourcePath:
    'data/rcap-crosswalk-enrichment/final-official-sources/files/SC/SC_Code_16-3-2020_F_official_2026-08-11.txt',
  sha256: 'b7f64d13388ca43175931e2b1aee357703bd99031b0b64879de690b7893dd630',
  authorityToken: '16-3-2020',
  mechanismTokens: ['preponderance', 'interrelated'],
  requiredSpans: [
    'may motion the court to expunge the record of the conviction or adjudication',
    'committed as a direct result of, or interrelated to trafficking',
    'preponderance of evidence',
    'reasonable notice of the motion with the original prosecuting agency',
    'apply retroactively',
  ],
  operativeAuthority:
    'S.C. Code § 16-3-2020(F) (as rewritten by 2024 Act No. 213 § 2, eff July 2, 2024; retroactive per Act 213 § 6)',
  license:
    'Official-source registry gap, condition-lifted per the blocked record’s own next action: the operator-supplied ' +
    'S.C. Code § 16-3-2020(F) bytes are committed and hash-receipted (sha256 b7f64d13…) with the 2024 Act No. 213 history ' +
    'and the Act 213 § 6 retroactivity note, and read directly they establish a motion-based expungement remedy for a trafficking ' +
    'victim’s conviction or delinquency adjudication (trafficking-article, prostitution, or other nonviolent misdemeanor or ' +
    'Class F felony per § 16-1-20(A)(6)-(9)) on a preponderance finding of the direct-result-or-interrelated nexus, with notice ' +
    'to the original prosecuting agency and to victims. The compiled pathway carries the mechanism in near-statutory language and ' +
    'no SC registry track carries § 16-3-2020 operatively, so the pathway is an unregistered relief mechanism — a ' +
    'registry-owner blocker, never a denominator change. Re-checked against the committed receipt, bytes, registry projection and ' +
    'profile on every generation; any drift re-blocks.',
};

const OVERRIDES = new Map([
  ['registry_track:MD:md_pardon_expungement', resolveMdPardonOverride(MD_PARDON_BLOCKED)],
  [
    'compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement',
    resolveOfficialSourceGapOverride(PA_OFFICIAL_SOURCE_SPEC),
  ],
  [
    'compiled_pathway:SC:human-trafficking-survivor-expungement',
    resolveOfficialSourceGapOverride(SC_OFFICIAL_SOURCE_SPEC),
  ],
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
  ['compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement', 'pa-3019-guidance-depth-fidelity'],
  ['compiled_pathway:SC:human-trafficking-survivor-expungement', 'sc-16-3-2020-procedural-fidelity'],
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
  'pa-3019-guidance-depth-fidelity': {
    question:
      'The official 18 Pa.C.S. § 3019(d)-(g) bytes establish a closed eligible-conviction set (§§ 3503, 5503, 5506, 5507, 5902, simple possession), a written-motion requirement, Commonwealth consent, particularized supporting evidence, an official-documentation presumption, and a mandatory grant standard. The compiled path-k pathway represents the mechanism at guidance depth (attorney escalation, Lawrence hold_guidance, packet_capable false) and encodes none of those procedural elements. Counsel must confirm the escalation-only treatment remains in force until the statutory procedure is encoded, and that no packet flow asserts eligibility beyond the closed (d)(1) enumeration.',
    relationshipExactness:
      'EXACT as a registry-gap classification. The mechanism is proven by the preserved official bytes, the pathway carries it without asserting anything the statute refutes, and no registry track registers § 3019. What is open is compiled-side procedural depth, not the classification.',
    owner: 'counsel review',
    launchLedgerEffect: 'none',
  },
  'sc-16-3-2020-procedural-fidelity': {
    question:
      'The official S.C. Code § 16-3-2020(F) bytes require reasonable notice of the expungement motion to the original prosecuting agency and reasonable notice given or attempted to any victims under the Victim’s Bill of Rights, and 2024 Act No. 213 § 6 makes the rewritten subsection retroactive. The compiled pathway carries the victim-status, offense-class, nexus, preponderance and expungement elements in near-statutory language but omits both notice requirements and the express retroactivity note. Counsel must confirm the packet flow adds the notice steps before any unattended filing use and that retroactive reach is reflected in eligibility screening.',
    relationshipExactness:
      'EXACT as a registry-gap classification. The mechanism is proven by the preserved official bytes including the 2024 amendment, the pathway carries it without asserting anything the statute refutes, and no registry track registers § 16-3-2020. What is open is compiled-side procedural completeness, not the classification.',
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

    const overrideCounterpart = override && override.counterpartId ? override.counterpartId : null;
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
      counterpart:
        relationshipType === TERMINAL_RELATION || relationshipType === BLOCKED_RELATION
          ? null
          : overrideCounterpart ?? counterpart,
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
      // A still_blocked lane row's `license` field explains why none is
      // issued; it can never license a lifted relationship. A lifted row
      // takes the override's own evidence-conditional license instead.
      const laneLicense = r.outcome === 'still_blocked' ? null : r.license;
      row.license = VARIANTS.get(r.jobId) ?? laneLicense ?? override?.license ?? null;
      row.operativeAuthority =
        (r.outcome === 'still_blocked' ? null : r.operativeAuthority) ?? override?.operativeAuthority ?? null;
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
