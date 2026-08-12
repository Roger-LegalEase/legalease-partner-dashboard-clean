#!/usr/bin/env node

/**
 * Deterministic generator and integrity checker for the bounded Codex
 * remaining-track lane.
 *
 * The canonical ledger, F2 dispositions, E3 graph, canonical participant
 * artifacts, and the authored Codex research/candidate specifications are
 * inputs.  This program only writes Codex-owned derived files.  It never
 * changes a canonical disposition, route, runtime profile, or launch flag.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');
const BASE = '3d8695cf8e5e9fe4464b559c97e04a526a462ade';
const CANONICAL_REF = 'origin/claude/rcap-final-sprint-integration';
const BRANCH = 'codex/rcap-remaining-tracks-wave';
const DATA_DIR = 'data/rcap-codex/remaining-tracks';
const DOC_PATH = 'docs/rcap/codex/remaining-tracks.md';
const DISPATCH_DIR = 'docs/rcap/codex/remaining-tracks/dispatch';

const LEDGER_PATH = 'data/rcap-ledger/track-terminalization.json';
const F2_PATH = 'data/rcap-all50/review-artifacts/f2-dispositions.json';
const E3_PATH = 'data/rcap-ledger/e3-job-graph.json';
const RESEARCH_PATH = `${DATA_DIR}/research-records.json`;
const CITATION_VERIFICATION_PATH = `${DATA_DIR}/source-citation-verification.json`;
const GUIDANCE_CANDIDATE_PATH = `${DATA_DIR}/candidate-treatments/guidance-corrections.json`;
const PARTICIPANT_CANDIDATE_PATH = `${DATA_DIR}/candidate-treatments/participant-treatments.json`;
const RECOGNITION_SPEC_PATH = `${DATA_DIR}/candidate-recognition-patch-spec.json`;
const CA_SPEC_PATH = `${DATA_DIR}/ca-cr180-patch-spec.json`;
const RUNTIME_SPEC_PATH = `${DATA_DIR}/runtime-wiring-patch-specs.json`;
const ADOPTION_PATH = `${DATA_DIR}/legal-adoption-continuity.json`;
const STAGING_PATH = `${DATA_DIR}/staging-test-cases.json`;
const SOURCE_MATRIX_PATH = `${DATA_DIR}/source-matrix.json`;
const MANIFEST_PATH = `${DATA_DIR}/manifest.json`;
const C_ASSIGNMENT_PATH = 'data/rcap-all50/review-artifacts/c-dependency-correction-assignment.json';
const C_RESOLUTION_PATH = 'data/rcap-all50/review-artifacts/c-dependency-free-resolution.json';

const PRIMARY_CLASSES = [
  'source_or_currentness',
  'legal_design_or_counsel',
  'participant_treatment_missing',
  'correction_required',
  'technical_review_missing',
  'legal_adoption_missing',
  'runtime_wiring_missing',
  'staging_acceptance_only',
  'exact_external_decision',
  'already_resolved_but_ledger_stale',
];

const EXPECTED_GUIDANCE_CANDIDATE_SHA256 = {
  'ak-nonconviction-confidential': '7ea6f1fed7b6729c82d225c1a3510855a35f5ed7338b2f2f510cd2e6cfe82ff7',
  'ct-provisional-pardon': 'faee533c2592facbab31006d6eee277d82d569248ccb70f264af1980ab9f56c0',
  mi_arrest_acquittal_dismissal: 'f140651252fb499ffb8d31daf685382148caaa7ce96cf5843c24734eefbd16aa',
  mi_auto_misd92: '55913d7f0403af14099395a3759a8a81e6334f51cb6c0452a8eddc4b997b8561',
  mi_setaside_csc4_pre2015: '855589d0808046474fb34caeb7e3ef55c5850cb818d2855a8127be219dc3d0d3',
  mn_ceb_felony_cannabis: '9fe86f83ec457e16695e569cab67c6d4ecb7810b92059a0dc95b65cd953ba169',
  'nd-dna-profile-removal-routing': '4070aa2c7ea9ccdf8b1c4263df69b1822eb860fb81205f678a729cb4dc492f1f',
  'nd-trafficking-vacatur-routing': 'f7927838a7005cad9a3d65bf8e726dae078fb4f1298993aaf43b920cbbfdf131',
  'nd-unconstitutional-arrest-expungement-routing': '63eb235ca642ff72d01b8380af8eaac2d9a2bffa3242051f181318f98e4bc4c2',
  'ne-immigration-routing': 'bcf6e005b57f9c7662eb18855ab65868e1ad09c01ac79c480213d75cc5f8861d',
  nj_automated_clean_slate: '2efcae64ec43d9e95fbcc5ab4ac19046c4c967fc634f0faaa55b327ae6abef9c',
  ok_osbi_portal: 'b03cc97827fa454a0676cab1b746cb0b3cebea662444ab12c10420cda335eebe',
  tx_exp_acquittal: '6d66e155e7eb7f759e232a32a2650939a9504fba1ae63c904a6398f33bde9705',
};

const EXPECTED_PARTICIPANT_CANDIDATE_SHA256 = {
  nv_repository_removal: 'eccc105ea8923d7d2b6c2b2a774059237516e3a65f8b364fccd6aa10e0da3649',
  wi_exp_certificate_of_discharge_followup: 'ead365c89b719d2db68144c8b2dc10def347a1d38fcef4ce20b3ee1634c459a8',
};

const D_MANIFEST = {
  ref: 'origin/claude/rcap-d-corrected-review-manifest',
  refTip: '871750f839920c28728dcab933b2b16f5c28b9ed',
  manifestContentCommit: '576fe88d9ae685389221aa6baf8c06ec65bc6073',
  path: 'docs/record-clearing/d-wave/corrected-review-manifest.json',
  jurisdictions: [
    'AK', 'AL', 'AR', 'AZ', 'CO', 'FL', 'IA', 'IL', 'KS', 'KY', 'LA', 'MA',
    'MN', 'MO', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'OR', 'TX', 'UT', 'VA',
    'VT', 'WA', 'WI',
  ],
};

const C_CONTROLLED_REMAINDER = new Set([
  'DC:dc_yra_set_aside',
  'ID:id_felony_reduction',
  'ID:id_set_aside_dismissal',
  'NV:nv_repository_removal',
  'NV:nv_seal_decrim',
  'NV:nv_seal_pardon',
  'SC:sc_aep',
  'SC:sc_conditional_discharge_44_53_450',
  'SC:sc_tep',
  'VA:va_exp_identity_used_by_another',
  'WA:wa_crop_certificate_of_restoration',
  'WI:wi_exp_certificate_of_discharge_followup',
]);

const PLEADING_CONFIGS = {
  'DC:dc_yra_set_aside': 'data/rcap-all50/pleadings/dc/dc_yra_set_aside/pleading-config.json',
  'ID:id_felony_reduction': 'data/rcap-all50/pleadings/idaho/id_felony_reduction/pleading-config.json',
  'ID:id_set_aside_dismissal': 'data/rcap-all50/pleadings/idaho/id_set_aside_dismissal/pleading-config.json',
  'NV:nv_repository_removal': 'data/rcap-all50/pleadings/nevada/nv_repository_removal/pleading-config.json',
  'NV:nv_seal_decrim': 'data/rcap-all50/pleadings/nevada/nv_seal_decrim/pleading-config.json',
  'NV:nv_seal_pardon': 'data/rcap-all50/pleadings/nevada/nv_seal_pardon/pleading-config.json',
  'SC:sc_aep': 'data/rcap-all50/pleadings/south-carolina/sc_aep/pleading-config.json',
  'SC:sc_conditional_discharge_44_53_450': 'data/rcap-all50/pleadings/south-carolina/sc_conditional_discharge_44_53_450/pleading-config.json',
  'SC:sc_tep': 'data/rcap-all50/pleadings/south-carolina/sc_tep/pleading-config.json',
  'VA:va_exp_identity_used_by_another': 'data/rcap-all50/pleadings/virginia/va_exp_identity_used_by_another/pleading-config.json',
  'WA:wa_crop_certificate_of_restoration': 'data/rcap-all50/pleadings/washington/wa_crop_certificate_of_restoration/pleading-config.json',
  'WI:wi_exp_certificate_of_discharge_followup': 'data/rcap-all50/pleadings/wisconsin/wi_exp_certificate_of_discharge_followup/pleading-config.json',
};

const DISPATCH = [
  group('AK-guidance-correction', ['AK:ak-nonconviction-confidential'], 'Terminal B',
    ['data/rcap-all50/guidance-packets/ak.json'],
    'Apply the candidate Rule 11 limitation to the canonical complete-guidance packet and return the exact bytes for fresh F2 plain-language and legal-accuracy review.'),
  group('AR-deferral-recognition', ['AR:ar-misdemeanor-dwi-seal'], 'Terminal A with Terminal B',
    ['scripts/generate-rcap-track-terminalization.mjs', 'data/rcap-all50/deferrals/recognized-deferrals.json'],
    'Add validated machine-readable recognition of this approved exact-supported deferral without changing participant payment or credit behavior.'),
  group('CA-85191-runtime', ['CA:ca-851-91'], 'Terminal A',
    ['src/lib/rcap-engine/compiled/profiles/CA-california.json', 'src/lib/rcap-engine/profile-registry.ts'],
    'Wire the already-approved CR-409/CR-410 treatment into the exact compiled runtime mapping without enabling checkout or a route flag.'),
  group('CA-cr180-correction', ['CA:ca-1203-41', 'CA:ca-1203-42', 'CA:ca-1203-43', 'CA:ca-1203-4a', 'CA:ca-17b-reduction'], 'Terminal E with Terminal A shared-verifier owner',
    ['data/rcap-all50/hard-forms/california/cr-180-petition-for-dismissal/', 'data/rcap-all50/hard-forms/california/cr-106-proof-of-service/', 'scripts/verify-rcap-hard-form-outputs.mjs', 'scripts/rcap-hard-form-xfa-shadow-fill.mjs'],
    'Correct the 15-day notice surface and overflow fail-closed behavior exactly as specified, then obtain fresh F2 and conditional F3 review.'),
  group('CT-guidance-correction', ['CT:ct-provisional-pardon'], 'Terminal B',
    ['data/rcap-all50/guidance-packets/ct.json'],
    'Replace the unsupported published-application assertion with the exact Board-direct instruction and return the exact bytes for fresh F2 review.'),
  group('DC-yra-counsel', ['DC:dc_yra_set_aside'], 'Terminal C with Roger/counsel',
    ['data/rcap-all50/pleadings/dc/dc_yra_set_aside/', 'docs/record-clearing/pleadings/dc/'],
    'Resolve the exact YRA motion vehicle, service and response practice, statutory-factor use, and set-aside/sealing sequence before any instrument is drafted.',
    'frontier legal-review model plus licensed D.C. counsel'),
  group('ID-2604-source-design', ['ID:id_felony_reduction', 'ID:id_set_aside_dismissal'], 'Terminal C source/design owner',
    ['data/rcap-all50/pleadings/idaho/id_felony_reduction/', 'data/rcap-all50/pleadings/idaho/id_set_aside_dismissal/'],
    'Use the saved official statute hashes; examine the Idaho Supreme Court statewide forms and the seven judicial districts’ approved rules and form inventories for section 19-2604; record the exact vehicle, caption, attachments, service, order, fee, and venue variation, then build only if resolved.'),
  group('KY-deferral-recognition', ['KY:ky_felony_expungement_after_pardon', 'KY:ky_felony_vacatur_expungement'], 'Terminal A with Terminal B',
    ['scripts/generate-rcap-track-terminalization.mjs', 'data/rcap-all50/deferrals/recognized-deferrals.json'],
    'Add validated machine-readable recognition of both approved Kentucky exact-supported deferrals.'),
  group('MI-guidance-corrections', ['MI:mi_arrest_acquittal_dismissal', 'MI:mi_auto_misd92', 'MI:mi_setaside_csc4_pre2015'], 'Terminal B',
    ['data/rcap-all50/guidance-packets/mi.json'],
    'Apply the three exact bilingual candidate corrections and return each exact track for fresh F2 review.'),
  group('MN-guidance-correction', ['MN:mn_ceb_felony_cannabis'], 'Terminal B',
    ['data/rcap-all50/guidance-packets/mn.json'],
    'Remove the unsupported MCRO cost assertion, preserve the exact current official-source boundaries, and obtain fresh F2 review.'),
  group('ND-guidance-corrections', ['ND:nd-dna-profile-removal-routing', 'ND:nd-trafficking-vacatur-routing', 'ND:nd-unconstitutional-arrest-expungement-routing'], 'Terminal B',
    ['data/rcap-all50/guidance-packets/nd.json'],
    'Apply the exact bilingual timing corrections for all three North Dakota tracks and obtain fresh F2 review.'),
  group('NE-guidance-correction', ['NE:ne-immigration-routing'], 'Terminal B',
    ['data/rcap-all50/guidance-packets/ne.json'],
    'Remove the unsupported accredited-representative direction from every participant-facing surface and obtain fresh F2 review.'),
  group('NJ-guidance-correction', ['NJ:nj_automated_clean_slate'], 'Terminal B',
    ['data/rcap-all50/guidance-packets/nj.json'],
    'Remove the unsupported county-bar and record-access immigration theory and obtain fresh F2 review.'),
  group('NV-agency-treatment', ['NV:nv_repository_removal'], 'Terminal B with Terminal A route owner',
    ['data/rcap-all50/guidance-packets/nv.json', 'src/lib/rcap-engine/compiled/profiles/NV-nevada.json', 'src/lib/rcap-engine/profile-registry.ts'],
    'Adopt and review the exact bilingual agency-correspondence treatment under NRS 179A.160; do not create a court pleading, fee, deadline, or prescribed form.'),
  group('NV-sealing-source-design', ['NV:nv_seal_decrim', 'NV:nv_seal_pardon'], 'Terminal C source/design owner',
    ['data/rcap-all50/pleadings/nevada/nv_seal_decrim/', 'data/rcap-all50/pleadings/nevada/nv_seal_pardon/'],
    'Use the saved operative NRS text to resolve the form and local-rule vehicle for NRS 179.271 and 179.273, then build only the reviewed exact instruments.'),
  group('OK-deferral-recognition', ['OK:ok_clean_slate'], 'Terminal A with Terminal B',
    ['scripts/generate-rcap-track-terminalization.mjs', 'data/rcap-all50/deferrals/recognized-deferrals.json'],
    'Add validated machine-readable recognition of the approved Oklahoma exact-supported deferral.'),
  group('OK-guidance-correction', ['OK:ok_osbi_portal'], 'Terminal B',
    ['data/rcap-all50/guidance-packets/ok.json'],
    'Remove the unsupported evidence-loss theory and obtain fresh F2 review of the exact bilingual bytes.'),
  group('SC-form-family', ['SC:sc_aep', 'SC:sc_conditional_discharge_44_53_450', 'SC:sc_tep'], 'Terminal C with official-form owner',
    ['data/rcap-all50/pleadings/south-carolina/sc_aep/', 'data/rcap-all50/pleadings/south-carolina/sc_conditional_discharge_44_53_450/', 'data/rcap-all50/pleadings/south-carolina/sc_tep/'],
    'Use the saved current chapter 17-22 text and materialized SCCA 223 family; map sections 17-22-350, 17-22-550, and 17-22-940 to the three exact tracks, resolve the recorded fee conflict, and build reviewed field maps and fixtures.'),
  group('TX-guidance-correction', ['TX:tx_exp_acquittal'], 'Terminal B',
    ['data/rcap-all50/guidance-packets/tx.json'],
    'Apply the acquittal guidance correction to the exact canonical packet and obtain fresh F2 review.'),
  group('TX-deferral-recognition', ['TX:tx_exp_dismissed'], 'Terminal A with Terminal B',
    ['scripts/generate-rcap-track-terminalization.mjs', 'data/rcap-all50/deferrals/recognized-deferrals.json'],
    'Machine-readably recognize the already-approved dismissed-charge deferral without changing participant payment or credit behavior.'),
  group('VA-identity-form', ['VA:va_exp_identity_used_by_another'], 'Terminal C with official-form owner',
    ['data/rcap-all50/pleadings/virginia/va_exp_identity_used_by_another/'],
    'Ingest the materialized official DC-363 form and instructions plus the saved current and future section 19.2-392.2 text; confirm the subsection B/H and fingerprint flow, then build the canonical field map, fixtures, and reviewed output.'),
  group('WA-crop-form-set', ['WA:wa_crop_certificate_of_restoration'], 'Terminal C with official-form owner',
    ['data/rcap-all50/pleadings/washington/wa_crop_certificate_of_restoration/'],
    'Record the sample/pattern-form decision grounded in RCW 9.97.020(11), identify exact local superior-court additions and the exemption screen, then build the materialized five-form CROP set without inventing or replicating an official instrument.'),
  group('WI-correspondence-treatment', ['WI:wi_exp_certificate_of_discharge_followup'], 'Terminal B with Terminal A route owner',
    ['data/rcap-all50/guidance-packets/wi.json', 'src/lib/rcap-engine/compiled/profiles/WI-wisconsin.json', 'src/lib/rcap-engine/profile-registry.ts'],
    'Adopt and review the exact bilingual participant-correspondence treatment, preserve the current CR-266 non-probation/non-incarceration boundary, define only a counsel-reviewed case-specific non-response path, and remove the track from the pleading family.'),
  group('WV-deferral-recognition', ['WV:wv_conv_multiple_misdemeanors', 'WV:wv_conv_nonviolent_felony', 'WV:wv_conv_single_misdemeanor'], 'Terminal A with Terminal B',
    ['scripts/generate-rcap-track-terminalization.mjs', 'data/rcap-all50/deferrals/recognized-deferrals.json'],
    'Add validated machine-readable recognition of the three approved West Virginia exact-supported deferrals.'),
];

function group(id, trackKeys, owner, ownedPaths, expectedOutput, model = 'Codex Sol 5.6 (xhigh)') {
  return { id, trackKeys, owner, ownedPaths, expectedOutput, model };
}

function fail(message) {
  throw new Error(`[remaining-tracks] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function abs(path) {
  return resolve(ROOT, path);
}

function read(path) {
  assert(existsSync(abs(path)), `missing required input: ${path}`);
  return readFileSync(abs(path));
}

function readJson(path) {
  try {
    return JSON.parse(read(path).toString('utf8'));
  } catch (error) {
    fail(`invalid JSON in ${path}: ${error.message}`);
  }
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function candidateDigest(candidate) {
  const copy = structuredClone(candidate);
  delete copy.candidateMetadata;
  return sha(Buffer.from(JSON.stringify(copy)));
}

function keyOf(value) {
  return `${value.jurisdiction}:${value.trackId}`;
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function unique(values, label) {
  const result = [...new Set(values)];
  assert(result.length === values.length, `${label} contains duplicates`);
  return result;
}

function sameSet(actual, expected, label) {
  const a = sorted(actual);
  const e = sorted(expected);
  assert(JSON.stringify(a) === JSON.stringify(e), `${label} mismatch\nactual=${a.join(',')}\nexpected=${e.join(',')}`);
}

function writeDerived(path, bytes) {
  const current = existsSync(abs(path)) ? readFileSync(abs(path), 'utf8') : null;
  if (CHECK) {
    assert(current === bytes, `stale generated bytes: ${path}`);
    return;
  }
  mkdirSync(dirname(abs(path)), { recursive: true });
  writeFileSync(abs(path), bytes);
}

function walk(dir, predicate = () => true) {
  if (!existsSync(abs(dir))) return [];
  const output = [];
  const visit = (full) => {
    for (const entry of readdirSync(full, { withFileTypes: true })) {
      const child = join(full, entry.name);
      if (entry.isDirectory()) visit(child);
      else {
        const path = relative(ROOT, child).split('\\').join('/');
        if (predicate(path, child)) output.push(path);
      }
    }
  };
  visit(abs(dir));
  return sorted(output);
}

function languageNodes(value, location = '$', result = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => languageNodes(item, `${location}[${index}]`, result));
  } else if (value && typeof value === 'object') {
    const hasEn = Object.hasOwn(value, 'en');
    const hasEs = Object.hasOwn(value, 'es');
    if (hasEn || hasEs) result.push({ location, value, hasEn, hasEs });
    for (const [key, item] of Object.entries(value)) languageNodes(item, `${location}.${key}`, result);
  }
  return result;
}

function substantive(value) {
  if (typeof value === 'string') return value.trim().length >= 3;
  if (Array.isArray(value)) return value.length > 0 && value.every((item) => substantive(item));
  return false;
}

function validateBilingual(record, label) {
  const nodes = languageNodes(record);
  assert(nodes.length > 0, `${label} has no bilingual participant-facing fields`);
  for (const node of nodes) {
    assert(node.hasEn && node.hasEs, `${label} language parity missing at ${node.location}`);
    assert(substantive(node.value.en) && substantive(node.value.es), `${label} non-substantive language at ${node.location}`);
    assert(Array.isArray(node.value.en) === Array.isArray(node.value.es), `${label} language type mismatch at ${node.location}`);
    if (Array.isArray(node.value.en)) {
      assert(node.value.en.length === node.value.es.length, `${label} language list-length mismatch at ${node.location}`);
    }
    const participantText = [node.value.en, node.value.es].flat().join(' ');
    assert(!/\b(?:Terminal [A-F]|ledger blocker|internal blocker|canonical review)\b/i.test(participantText), `${label} leaks internal language at ${node.location}`);
  }
}

function validateCandidateSafety(candidate, label) {
  assert(candidate.paymentAllowed === false, `${label} must keep paymentAllowed=false`);
  assert(candidate.sellable === false, `${label} must keep sellable=false`);
  assert(candidate.checkoutProhibited === true, `${label} must keep checkoutProhibited=true`);
  assert(candidate.creditConsumable === false, `${label} must keep creditConsumable=false`);
  validateBilingual(candidate, label);
  const participantText = JSON.stringify(candidate, (key, value) => key === 'candidateMetadata' ? undefined : value);
  assert(!/(?:committed materials?|design we work from|review this guidance is built on|source saved here|saved current statute|this candidate|fuente incorporada|esta propuesta|estatuto vigente guardado)/i.test(participantText), `${label} leaks implementation/source-work language`);
}

function researchRemainingEvidence(key, record) {
  if (key === 'NV:nv_repository_removal') return record.remainingEvidence.filter((item) => !item.includes('179.271') && !item.includes('179.273'));
  if (key === 'NV:nv_seal_decrim' || key === 'NV:nv_seal_pardon') return record.remainingEvidence.filter((item) => !item.includes('179A.160'));
  return record.remainingEvidence;
}

function postResearchSummary(key, record) {
  if (!record) return null;
  const remainingEvidence = researchRemainingEvidence(key, record);
  return {
    result: record.result,
    sourceTextSeparatedFromInference: Array.isArray(record.sourceText) && Array.isArray(record.inference),
    remainingEvidence,
    nextCanonicalBlocker: remainingEvidence.join(' | '),
  };
}

function postCodexNextClass(key, record) {
  if (!record) return null;
  if (key === 'VA:va_exp_identity_used_by_another') return 'technical_review_missing';
  if (key.startsWith('SC:')) return 'correction_required';
  if (key.startsWith('ID:')) return 'source_or_currentness';
  if (key === 'WA:wa_crop_certificate_of_restoration') return 'legal_design_or_counsel';
  if (key === 'NV:nv_seal_decrim' || key === 'NV:nv_seal_pardon') return 'legal_design_or_counsel';
  if (key === 'NV:nv_repository_removal' || key === 'WI:wi_exp_certificate_of_discharge_followup') return 'technical_review_missing';
  if (key === 'DC:dc_yra_set_aside') return 'legal_design_or_counsel';
  return 'source_or_currentness';
}

const ledger = readJson(LEDGER_PATH);
const f2 = readJson(F2_PATH);
const e3 = readJson(E3_PATH);
const cAssignment = readJson(C_ASSIGNMENT_PATH);
const cResolution = readJson(C_RESOLUTION_PATH);
const research = readJson(RESEARCH_PATH);
const guidanceCandidateSeed = readJson(GUIDANCE_CANDIDATE_PATH);
const participantCandidateSeed = readJson(PARTICIPANT_CANDIDATE_PATH);
const recognitionSpecSeed = readJson(RECOGNITION_SPEC_PATH);
const caSpecSeed = readJson(CA_SPEC_PATH);
readJson(RUNTIME_SPEC_PATH); // Parse the prior artifact before deterministically replacing it.
readJson(ADOPTION_PATH);
readJson(STAGING_PATH);

assert(ledger.aggregates.registryTracks === 497, `registry denominator drifted: ${ledger.aggregates.registryTracks}`);
assert(ledger.aggregates.tracksTerminal >= 375, `wave-2 floor not met: ${ledger.aggregates.tracksTerminal}/497`);
const nonterminal = ledger.tracks.filter((track) => track.terminal === false);
assert(nonterminal.length === ledger.aggregates.tracksNonterminal, 'ledger nonterminal aggregate does not match tracks[]');
const nonterminalKeys = unique(nonterminal.map(keyOf), 'nonterminal track keys');

const cKeys = sorted(unique(f2.notAcceptedPendingOwnerDetermination.flatMap((record) => record.trackKeys ?? []), 'focused-C keys'));
const composedNonterminal = sorted(nonterminal.filter((track) => track.requiredTreatment === 'complete_composed_route').map(keyOf));
sameSet(cKeys, composedNonterminal, 'focused-C exact identity cross-check');
assert(cKeys.length === 16, `focused-C count drifted: ${cKeys.length}`);
const cActiveAssignmentKeys = sorted(unique(cAssignment.routes.map((route) => `${route.jurisdiction}:${route.trackId}`), 'active C correction assignment'));
const cResolvedKeys = sorted(unique(cResolution.routes.map((route) => `${route.jurisdiction}:${route.trackId}`), 'dependency-free C resolution'));
assert(cActiveAssignmentKeys.length === 10 && cResolvedKeys.length === 6, `active C assignment split drifted: ${cActiveAssignmentKeys.length}+${cResolvedKeys.length}`);
assert(cActiveAssignmentKeys.every((key) => !cResolvedKeys.includes(key)), 'active C correction and dependency-free C resolution overlap');
sameSet([...cActiveAssignmentKeys, ...cResolvedKeys], cKeys, 'active C assignment plus dependency-free resolution must equal focused-C exclusion');

const dJobs = ledger.jobs.filter((job) => job.lane === 'D');
const dKeys = sorted(unique(dJobs.flatMap((job) => job.trackIds.map((trackId) => `${job.jurisdiction}:${trackId}`)), 'D track projection'));
sameSet(unique(dJobs.map((job) => job.jurisdiction), 'D job jurisdictions'), D_MANIFEST.jurisdictions, 'corrected-D jurisdiction projection');
assert(dKeys.length === 67, `corrected-D projection count drifted: ${dKeys.length}`);

const cSet = new Set(cKeys);
const dSet = new Set(dKeys);
assert(cKeys.every((key) => !dSet.has(key)), 'C/D exact exclusions overlap');
const remaining = nonterminal.filter((track) => !cSet.has(keyOf(track)) && !dSet.has(keyOf(track)));
const remainingKeys = sorted(remaining.map(keyOf));
assert(remaining.length === 39, `live remainder changed: expected current 39, found ${remaining.length}`);
assert(nonterminal.length === cKeys.length + dKeys.length + remaining.length, '122-way partition does not close');
assert(remainingKeys.every((key) => nonterminalKeys.includes(key)), 'remainder contains a non-live key');
assert(C_CONTROLLED_REMAINDER.size === 12 && [...C_CONTROLLED_REMAINDER].every((key) => remainingKeys.includes(key)), 'controlled-C remainder identity drift');

const jobByKey = new Map();
for (const key of remainingKeys) {
  const [jurisdiction, trackId] = key.split(':');
  const jobs = ledger.jobs.filter((job) => job.jurisdiction === jurisdiction && job.trackIds.includes(trackId));
  assert(jobs.length === 1, `${key} must appear in exactly one current ledger job, found ${jobs.length}`);
  jobByKey.set(key, jobs[0]);
}

const e3ByKey = new Map();
for (const job of e3.jobs.filter((job) => job.kind === 'registry_track')) {
  const affected = job.facets?.affectedTracks ?? [`${job.jurisdiction}:${job.subjectId}`];
  for (const key of affected) if (remainingKeys.includes(key)) {
    assert(!e3ByKey.has(key), `${key} appears in duplicate E3 registry jobs`);
    e3ByKey.set(key, job);
  }
}

const guidancePacketByKey = new Map();
for (const path of walk('data/rcap-all50/guidance-packets', (path) => path.endsWith('.json'))) {
  const document = readJson(path);
  for (const packet of document.packets ?? []) {
    const key = `${document.jurisdiction}:${packet.trackId}`;
    if (remainingKeys.includes(key)) guidancePacketByKey.set(key, { path, packet });
  }
}

const hardFormByKey = new Map();
for (const path of walk('data/rcap-all50/hard-forms', (path) => path.endsWith('/profile.json'))) {
  const profile = readJson(path);
  const profileJurisdiction = typeof profile.jurisdiction === 'string' ? profile.jurisdiction : profile.jurisdiction?.code;
  if ((profile.tracksServed ?? []).length > 0) assert(profileJurisdiction, `${path} serves tracks but has no normalized jurisdiction code`);
  for (const trackId of profile.tracksServed ?? []) {
    const key = `${profileJurisdiction}:${trackId}`;
    if (remainingKeys.includes(key)) {
      const list = hardFormByKey.get(key) ?? [];
      list.push({ path, profile });
      hardFormByKey.set(key, list);
    }
  }
}

const researchByKey = new Map();
const allowedOfficialHosts = /(?:^|\.)(?:dccouncil\.gov|dccourts\.gov|legislature\.idaho\.gov|isc\.idaho\.gov|leg\.state\.nv\.us|scstatehouse\.gov|sccourts\.org|law\.lis\.virginia\.gov|vacourts\.gov|app\.leg\.wa\.gov|courts\.wa\.gov|wicourts\.gov|docs\.legis\.wisconsin\.gov)$/i;
let savedReceiptCount = 0;
const researchUrls = [];
for (const record of research.records) {
  assert(record.issuingBody && record.issuingBody.trim(), `${record.jurisdiction} research lacks issuing body`);
  assert(Array.isArray(record.sourceText) && Array.isArray(record.inference), `${record.jurisdiction} must separate source text from inference`);
  for (const source of record.sources) {
    researchUrls.push(source.url);
    const url = new URL(source.url);
    assert(url.protocol === 'https:' && allowedOfficialHosts.test(url.hostname), `non-official or non-HTTPS source: ${source.url}`);
    assert(source.retrievalDate === research.retrievalDate, `retrieval date drift: ${source.url}`);
    if (source.savedBytes) {
      const bytes = read(source.savedBytes.path);
      assert(bytes.byteLength === source.savedBytes.bytes, `saved byte count drift: ${source.savedBytes.path}`);
      assert(sha(bytes) === source.savedBytes.sha256, `saved SHA-256 drift: ${source.savedBytes.path}`);
      savedReceiptCount += 1;
    }
  }
  for (const trackId of record.trackIds) {
    const key = `${record.jurisdiction}:${trackId}`;
    assert(remainingKeys.includes(key), `research record names track outside remainder: ${key}`);
    assert(!researchByKey.has(key), `duplicate research record for ${key}`);
    researchByKey.set(key, record);
  }
}
unique(researchUrls, 'official research URLs');

function mapStrings(value, transform) {
  if (typeof value === 'string') return transform(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, transform));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapStrings(item, transform)]));
  return value;
}

function participantCopy(value) {
  const replacements = [
    ['because they were not verified in the Connecticut review this guidance is built on and are not restated here', 'because the cited official information does not establish them; get them directly from the Board'],
    ['porque no se verificaron en la revisión de Connecticut en la que se basa esta guía y no se repiten aquí', 'porque la información oficial citada no las establece; solicítelas directamente a la Junta'],
    ['in the Connecticut review this guidance is built on — the Board\'s waiting-period rules were not verified', 'by the cited official information — the Board\'s waiting-period rules are not stated'],
    ['En la revisión de Connecticut en la que se basa esta guía no se establece', 'La información oficial citada no establece'],
    ['were not verified in the Connecticut review this is built on', 'are not established by the cited official information'],
    ['no se verificaron en la revisión de Connecticut en la que se basa esto', 'no están establecidas por la información oficial citada'],
    ['not stated in the Connecticut review this is built on', 'not stated in the cited official information'],
    ['no se indican en la revisión de Connecticut en la que se basa esto', 'no se indican en la información oficial citada'],
    ['were not verified in the materials behind this guidance', 'are not established by the cited official information'],
    ['Eso no se verificó en los materiales detrás de esta guía', 'La información oficial citada no establece esos puntos'],
    ["Michigan's committed materials", 'The cited Michigan rules'],
    ['Los materiales de Michigan con los que contamos', 'Las reglas citadas de Michigan'],
    ['The committed North Dakota materials', 'The cited North Dakota authorities'],
    ['Los materiales incorporados de Dakota del Norte', 'Las autoridades citadas de Dakota del Norte'],
    ['Los materiales de Dakota del Norte incorporados', 'Las autoridades de Dakota del Norte citadas'],
    ['the committed design', 'the cited official authorities'],
    ['el diseño incorporado', 'las autoridades oficiales citadas'],
    ['The Nebraska design we work from', 'The cited Nebraska authority'],
    ['the Nebraska design we work from', 'the cited Nebraska authority'],
    ['the Nebraska design does not identify them', 'the cited Nebraska authority does not identify them'],
    ['El diseño de Nebraska con el que trabajamos', 'La autoridad de Nebraska citada'],
    ['el diseño de Nebraska', 'la autoridad de Nebraska citada'],
    ['the controlling New Jersey review', 'the cited New Jersey authorities'],
    ['the controlling Minnesota review', 'the cited Minnesota authorities'],
    ['la revisión de Nueva Jersey que nos rige', 'las autoridades de Nueva Jersey citadas'],
    ['The Minnesota materials we rely on', 'The cited Minnesota authorities'],
    ['Los materiales de Minnesota en los que nos basamos', 'Las autoridades de Minnesota citadas'],
    ['the sources we rely on', 'the cited official sources'],
    ['los materiales de Minnesota en los que nos basamos', 'las autoridades de Minnesota citadas'],
    ['las fuentes en las que nos basamos', 'las fuentes oficiales citadas'],
    ['the New Jersey materials we rely on', 'the cited New Jersey authorities'],
    ['los materiales de Nueva Jersey en los que nos basamos', 'las autoridades de Nueva Jersey citadas'],
    ['the committed Oklahoma design', 'the cited Oklahoma authorities'],
    ['el diseño incorporado de Oklahoma', 'las autoridades de Oklahoma citadas'],
    ['The source review does not state', 'The cited official information does not state'],
    ['the source review does not state', 'the cited official information does not state'],
    ['La revisión legal de Texas que rige esta vía', 'Las autoridades de Texas citadas'],
    ['The Texas legal review that governs this route leaves two questions open that it marks as blocking release, and both are questions about what you would be told to do and what it would cost you.', 'The cited Texas authorities leave two questions unanswered, both about what you would need to do and what it would cost.'],
    ['Las autoridades de Texas citadas deja abiertas dos preguntas que marca como impedimentos para su publicación, y ambas son preguntas sobre qué se le diría a usted que haga y cuánto le costaría.', 'Las autoridades de Texas citadas no responden dos preguntas, ambas sobre qué debe hacer usted y cuánto costaría.'],
  ];
  let result = value;
  for (const [from, to] of replacements) result = result.split(from).join(to);
  return result;
}

const guidanceCandidates = mapStrings(structuredClone(guidanceCandidateSeed), participantCopy);
guidanceCandidates.baseCommit = BASE;
for (const packet of guidanceCandidates.packets) {
  const canonicalPath = packet.candidateMetadata?.canonicalSourcePath;
  assert(canonicalPath && existsSync(abs(canonicalPath)), `guidance candidate ${packet.trackId} lacks canonical source path`);
  packet.candidateMetadata.baseCommit = BASE;
  packet.candidateMetadata.canonicalSourceSha256 = sha(read(canonicalPath));
  packet.candidateMetadata.candidateContentSha256 = candidateDigest(packet);
}

function freshParticipantCandidates() {
  const nv = mapStrings(structuredClone(participantCandidateSeed.treatments.find((item) => item.trackId === 'nv_repository_removal')), participantCopy);
  nv.exactReason.en = 'NRS 179A.160 creates written applications to record agencies, not a court case. The cited statute does not prescribe application wording, so do not invent a court caption, petition, fee, hearing, or judge’s order.';
  nv.exactReason.es = 'NRS 179A.160 crea solicitudes escritas dirigidas a organismos de expedientes, no un caso judicial. El estatuto citado no prescribe el texto de la solicitud, así que no invente una carátula judicial, petición, tarifa, audiencia ni orden de un juez.';
  nv.timing.en = 'The cited statute does not state a waiting period or agency response deadline for this written-application route. Ask each receiving agency how it acknowledges and tracks a request; do not invent a date.';
  nv.timing.es = 'El estatuto citado no indica un período de espera ni un plazo de respuesta del organismo para esta vía de solicitud escrita. Pregunte a cada organismo receptor cómo acusa recibo y da seguimiento a una solicitud; no invente una fecha.';
  nv.afterNextStep.en = 'Save proof of delivery and every response. If an agency identifies a statutory disqualifier, preserve that exact response. Do not assume a court appeal or another remedy that the cited statute does not state.';
  nv.afterNextStep.es = 'Guarde el comprobante de entrega y cada respuesta. Si un organismo identifica una exclusión legal, conserve esa respuesta exacta. No suponga que existe una apelación judicial u otro remedio que el estatuto citado no establezca.';
  const dispositionIndexEn = nv.gather.en.findIndex((item) => /certified|clerk-issued/i.test(item));
  const dispositionIndexEs = nv.gather.es.findIndex((item) => /certificad|secretari/i.test(item));
  assert(dispositionIndexEn >= 0 && dispositionIndexEs >= 0, 'NV disposition gather correction anchor missing');
  nv.gather.en[dispositionIndexEn] = "A copy of the disposition; use a certified or clerk-issued copy only if the receiving agency's current official instructions require it.";
  nv.gather.es[dispositionIndexEs] = 'Una copia de la resolución; use una copia certificada o expedida por el secretario solo si las instrucciones oficiales vigentes del organismo receptor la exigen.';

  const wiRecord = research.records.find((item) => item.jurisdiction === 'WI');
  const wiStatute = wiRecord.sources.find((source) => source.savedBytes?.path.endsWith('wi-statute-973-015.html'));
  const hemp = wiRecord.sources.find((source) => source.url.includes('DisplayDocument'));
  const cr266 = wiRecord.sources.find((source) => source.savedBytes?.path.endsWith('wi-cr-266.pdf'));
  const wi = {
    jurisdiction: 'WI',
    trackId: 'wi_exp_certificate_of_discharge_followup',
    treatment: 'complete_guidance_candidate',
    status: 'candidate_only_not_canonical_not_promoted',
    routeLabel: {
      en: 'Follow up on a Wisconsin expunction certificate after successful completion',
      es: 'Dar seguimiento a un certificado de expurgación del expediente (expunction) de Wisconsin después del cumplimiento satisfactorio',
    },
    exactReason: {
      en: 'This is participant correspondence, not a new court petition. When expunction was ordered at sentencing and the sentence was successfully completed, the detaining or probationary authority has the certificate step described in State v. Hemp. Current form CR-266 is limited to cases with no probation and no incarceration, so it must not be presented as a universal follow-up form.',
      es: 'Esto es correspondencia del participante, no una nueva petición judicial. Cuando la expurgación del expediente (expunction) se ordenó al dictar sentencia y la condena se cumplió satisfactoriamente, la autoridad de detención o supervisión tiene el paso del certificado descrito en State v. Hemp. El formulario CR-266 vigente se limita a casos sin libertad condicional y sin encarcelamiento, por lo que no debe presentarse como formulario universal de seguimiento.',
    },
    responsibleActor: {
      en: 'You send the factual follow-up. The detaining or probationary authority for your case addresses the certificate step, and the sentencing-court clerk records a certificate it receives.',
      es: 'Usted envía el seguimiento fáctico. La autoridad de detención o supervisión de su caso atiende el paso del certificado, y el secretario del tribunal sentenciador registra el certificado que recibe.',
    },
    destination: {
      en: 'Use your discharge papers to identify the probation, corrections, jail, or other detaining authority that supervised completion in your case. Send the follow-up there. Do not caption or file the letter as a motion with the court.',
      es: 'Use sus documentos de alta para identificar la oficina de libertad condicional, correcciones, cárcel u otra autoridad de detención que supervisó el cumplimiento en su caso. Envíe allí el seguimiento. No titule ni presente la carta como una moción ante el tribunal.',
    },
    nextStep: {
      en: 'Confirm from the judgment that the sentencing court ordered expunction and confirm successful completion from the discharge records. Ask the supervising or detaining authority whether it issued the certificate and, if not, send a short factual request identifying the case and attaching those records.',
      es: 'Confirme en la sentencia que el tribunal sentenciador ordenó la expurgación del expediente (expunction) y confirme el cumplimiento satisfactorio con los documentos de alta. Pregunte a la autoridad de supervisión o detención si expidió el certificado y, si no, envíe una solicitud fáctica breve que identifique el caso y adjunte esos documentos.',
    },
    gather: {
      en: ['The judgment showing expunction was ordered at sentencing.', 'The case number and sentencing-court name.', 'Discharge or completion proof.', 'The name and current contact information of the authority that supervised completion.', 'The follow-up request, proof of delivery, and every response.'],
      es: ['La sentencia que muestre que se ordenó la expurgación del expediente (expunction) al dictar sentencia.', 'El número de caso y el nombre del tribunal sentenciador.', 'La prueba de alta o cumplimiento.', 'El nombre y los datos de contacto vigentes de la autoridad que supervisó el cumplimiento.', 'La solicitud de seguimiento, el comprobante de entrega y cada respuesta.'],
    },
    doNotFileOrAssume: {
      en: 'Do not file a new expunction petition, invent a deadline or non-response remedy, or assume CR-266 fits. CR-266 expressly addresses a no-probation and no-incarceration situation. Verify the judgment and supervision history before using any form.',
      es: 'No presente una nueva petición de expurgación del expediente (expunction), no invente un plazo ni un remedio por falta de respuesta y no suponga que corresponde el CR-266. El CR-266 se refiere expresamente a una situación sin libertad condicional y sin encarcelamiento. Verifique la sentencia y el historial de supervisión antes de usar cualquier formulario.',
    },
    timing: {
      en: 'The cited authorities do not state a response deadline for participant follow-up. Send it after confirming successful completion and keep delivery proof; do not invent a waiting period or escalation date.',
      es: 'Las autoridades citadas no establecen un plazo de respuesta para el seguimiento del participante. Envíelo después de confirmar el cumplimiento satisfactorio y conserve el comprobante de entrega; no invente un período de espera ni una fecha de escalamiento.',
    },
    afterNextStep: {
      en: 'If the authority confirms it sent the certificate, ask the sentencing-court clerk whether it was received and recorded. If the authority does not respond or declines, preserve the judgment, completion proof, request, delivery proof, and exact response, then take those documents to a Wisconsin lawyer who handles expunction implementation. Do not assume a deadline or remedy.',
      es: 'Si la autoridad confirma que envió el certificado, pregunte al secretario del tribunal sentenciador si fue recibido y registrado. Si la autoridad no responde o se niega, conserve la sentencia, la prueba de cumplimiento, la solicitud, el comprobante de entrega y la respuesta exacta, y lleve esos documentos a un abogado de Wisconsin que maneje la implementación de la expurgación del expediente (expunction). No suponga que existe un plazo o remedio.',
    },
    briefcaseTreatment: {
      en: 'Briefcase saves the follow-up letter, judgment, completion proof, recipient, delivery proof, and response as guidance records. It creates no court filing, checkout item, or credit charge.',
      es: 'Briefcase guarda la carta de seguimiento, la sentencia, la prueba de cumplimiento, el destinatario, el comprobante de entrega y la respuesta como registros de orientación. No crea una presentación judicial, un artículo de pago ni un cargo de crédito.',
    },
    authority: [
      { issuingBody: 'Wisconsin Legislature', citation: 'Wis. Stat. section 973.015(1m)(b)', url: wiStatute.url, savedBytesPath: wiStatute.savedBytes.path, sha256: wiStatute.savedBytes.sha256, bytes: wiStatute.savedBytes.bytes, sourceTreatment: 'source_text_certificate_process' },
      { issuingBody: 'Wisconsin Court System', citation: 'State v. Hemp, 2014 WI 129', url: hemp.url, sourceTreatment: 'source_text_duty_and_self_executing_process' },
      { issuingBody: 'Wisconsin Court System', citation: 'CR-266, current official form — limited to no probation and no incarceration', url: cr266.url, savedBytesPath: cr266.savedBytes.path, sha256: cr266.savedBytes.sha256, bytes: cr266.savedBytes.bytes, sourceTreatment: 'source_text_boundary_not_universal_fallback' },
    ],
    sourceInferenceBoundary: {
      sourceText: 'State v. Hemp describes the certificate duty/process; current CR-266 states its no-probation and no-incarceration boundary.',
      inference: 'Correspondence is the safe participant treatment; any case-specific non-response remedy requires Wisconsin expunction counsel.',
    },
    paymentAllowed: false,
    sellable: false,
    checkoutProhibited: true,
    creditConsumable: false,
  };

  const researchSha = sha(read(RESEARCH_PATH));
  for (const treatment of [nv, wi]) {
    const record = research.records.find((item) => item.jurisdiction === treatment.jurisdiction && item.trackIds.includes(treatment.trackId));
    treatment.candidateMetadata = {
      baseCommit: BASE,
      researchRecordPath: RESEARCH_PATH,
      researchRecordSha256: researchSha,
      researchResult: record.result,
      sourceRefs: record.sources.map((source) => ({ url: source.url, retrievalDate: source.retrievalDate, savedBytes: source.savedBytes })),
      status: 'candidate_only_not_canonical_not_promoted',
    };
    treatment.candidateMetadata.candidateContentSha256 = candidateDigest(treatment);
  }
  return {
    schemaVersion: participantCandidateSeed.schemaVersion,
    baseCommit: BASE,
    status: participantCandidateSeed.status,
    treatments: [nv, wi],
  };
}

const participantCandidates = freshParticipantCandidates();
const recognitionSpec = { ...recognitionSpecSeed, baseCommit: BASE };
const caSpec = { ...caSpecSeed, baseCommit: BASE };

for (const packet of guidanceCandidates.packets) {
  validateCandidateSafety(packet, `guidance candidate ${packet.trackId}`);
  const canonicalPath = packet.candidateMetadata?.canonicalSourcePath;
  assert(canonicalPath && existsSync(abs(canonicalPath)), `guidance candidate ${packet.trackId} lacks canonical source path`);
  const canonicalDocument = readJson(canonicalPath);
  assert((canonicalDocument.packets ?? []).filter((item) => item.trackId === packet.trackId).length === 1, `guidance candidate ${packet.trackId} must bind exactly one canonical track`);
  assert(packet.candidateMetadata.candidateContentSha256 === EXPECTED_GUIDANCE_CANDIDATE_SHA256[packet.trackId], `guidance candidate content fingerprint drift: ${packet.trackId}`);
}
sameSet(guidanceCandidates.packets.map((packet) => packet.trackId), Object.keys(EXPECTED_GUIDANCE_CANDIDATE_SHA256), 'exact guidance candidate track set');
for (const treatment of participantCandidates.treatments) {
  validateCandidateSafety(treatment, `participant candidate ${treatment.trackId}`);
  const record = research.records.find((item) => item.jurisdiction === treatment.jurisdiction && item.trackIds.includes(treatment.trackId));
  assert(record, `participant candidate ${treatment.trackId} lacks research record`);
  assert(treatment.candidateMetadata.candidateContentSha256 === EXPECTED_PARTICIPANT_CANDIDATE_SHA256[treatment.trackId], `participant candidate content fingerprint drift: ${treatment.trackId}`);
}
sameSet(participantCandidates.treatments.map((treatment) => treatment.trackId), Object.keys(EXPECTED_PARTICIPANT_CANDIDATE_SHA256), 'exact participant candidate track set');

const correctionKeys = sorted([
  ...guidanceCandidates.packets.map((packet) => `${packet.candidateMetadata?.canonicalSourcePath?.match(/\/([a-z]{2})\.json$/)?.[1]?.toUpperCase() ?? packet.jurisdiction}:${packet.trackId}`),
  ...caSpec.exactTrackKeys,
]);
// Guidance candidates intentionally carry jurisdiction through their canonical path.
assert(correctionKeys.every((key) => /^[A-Z]{2}:.+/.test(key)), 'candidate correction jurisdiction derivation failed');
const staleKeys = sorted(recognitionSpec.exactTrackKeys);
const participantKeys = sorted(participantCandidates.treatments.map((treatment) => `${treatment.jurisdiction}:${treatment.trackId}`));
const runtimePrimaryKeys = ['CA:ca-851-91'];
const legalKeys = ['DC:dc_yra_set_aside'];
const sourceKeys = sorted([...researchByKey.keys()].filter((key) => !participantKeys.includes(key) && !legalKeys.includes(key)));

const classByKey = new Map();
for (const [primaryClass, keys] of [
  ['correction_required', correctionKeys],
  ['already_resolved_but_ledger_stale', staleKeys],
  ['participant_treatment_missing', participantKeys],
  ['runtime_wiring_missing', runtimePrimaryKeys],
  ['legal_design_or_counsel', legalKeys],
  ['source_or_currentness', sourceKeys],
]) {
  for (const key of keys) {
    assert(remainingKeys.includes(key), `${primaryClass} names track outside remainder: ${key}`);
    assert(!classByKey.has(key), `${key} assigned more than one primary class`);
    classByKey.set(key, primaryClass);
  }
}
sameSet([...classByKey.keys()], remainingKeys, 'exactly-one primary class coverage');

const dispatchByKey = new Map();
for (const assignment of DISPATCH) {
  assert(assignment.trackKeys.length > 0, `${assignment.id} has no exact tracks`);
  for (const key of assignment.trackKeys) {
    assert(remainingKeys.includes(key), `${assignment.id} includes track outside remainder: ${key}`);
    assert(!dispatchByKey.has(key), `${key} appears in more than one frozen assignment`);
    dispatchByKey.set(key, assignment);
  }
}
sameSet([...dispatchByKey.keys()], remainingKeys, 'exactly-one frozen assignment coverage');

sameSet(caSpec.exactTrackKeys, correctionKeys.filter((key) => key.startsWith('CA:ca-1203') || key === 'CA:ca-17b-reduction'), 'CA CR-180 spec coverage');
sameSet(recognitionSpec.exactTrackKeys, staleKeys, 'candidate-recognition spec coverage');

const textEvidenceRoots = [
  'data/rcap-all50/guidance-packets',
  'data/rcap-all50/hard-forms',
  'data/rcap-all50/pleadings',
  'data/rcap-all50/review-artifacts',
  'docs/rcap/review',
  'docs/record-clearing/deferrals',
  'src/lib/rcap-engine/compiled/profiles',
];
const evidenceIndex = new Map(remainingKeys.map((key) => [key, new Set([LEDGER_PATH, F2_PATH])]));
for (const root of textEvidenceRoots) {
  for (const path of walk(root, (path, full) => ['.json', '.md', '.txt'].includes(extname(path)) && statSync(full).size <= 5_000_000)) {
    const body = readFileSync(abs(path), 'utf8');
    for (const key of remainingKeys) {
      const trackId = key.slice(key.indexOf(':') + 1);
      if (body.includes(trackId)) evidenceIndex.get(key).add(path);
    }
  }
}

function closuresFor(key) {
  return (f2.closures ?? []).filter((record) => record.trackKeys?.includes(key));
}

function currentReview(closures) {
  if (closures.length === 0) return 'not_reviewed_blocked_before_candidate';
  if (closures.some((closure) => closure.outcome === 'correction_required')) return 'correction_required';
  if (closures.every((closure) => closure.outcome === 'technical_approved')) return 'technical_approved';
  return sorted(new Set(closures.map((closure) => closure.outcome))).join('+');
}

function baseBlocker(key, primaryClass, closures, researchRecord, e3Job) {
  if (primaryClass === 'correction_required') {
    return closures.find((closure) => closure.outcome === 'correction_required')?.note ?? 'The current F2 closure requires a canonical correction.';
  }
  if (primaryClass === 'already_resolved_but_ledger_stale') {
    return 'A complete exact-supported deferral has a current F2 technical_approved closure, but the terminalization generator does not recognize the committed lane-B deferral evidence as a candidate.';
  }
  if (primaryClass === 'runtime_wiring_missing') return e3Job?.reason ?? 'The reviewed treatment has no exact compiled runtime representation.';
  if (primaryClass === 'participant_treatment_missing') return 'The base controlled-pleading configuration delivered no participant-facing packet and did not resolve the correct non-pleading treatment.';
  if (primaryClass === 'legal_design_or_counsel') return 'The base controlled-pleading configuration bars drafting until the exact filing vehicle and court practice are resolved.';
  return `The base controlled-pleading configuration required official-source/currentness work before drafting (${researchRecord?.jurisdiction ?? key}).`;
}

function postBlocker(key, primaryClass, researchRecord) {
  if (researchRecord) {
    return `Codex research result: ${researchRecord.result}. Canonical work remains: ${researchRemainingEvidence(key, researchRecord).join('; ')}.`;
  }
  if (primaryClass === 'correction_required') return 'The correction is complete only in a Codex-owned candidate; the canonical owner must apply it and obtain fresh review.';
  if (primaryClass === 'already_resolved_but_ledger_stale') return 'Terminal A must implement validated candidate recognition and prove unrelated ledger bytes remain unchanged.';
  if (primaryClass === 'runtime_wiring_missing') return 'Terminal A must implement the exact runtime patch specification, then preserve adoption and PREP_ONLY staging gates.';
  return 'Canonical adoption, exact review, runtime wiring, and PREP_ONLY staging remain outside this Codex-owned candidate lane.';
}

function requiredEvidence(key, primaryClass, closures, researchRecord, e3Job) {
  if (researchRecord) return researchRemainingEvidence(key, researchRecord);
  if (primaryClass === 'correction_required') {
    const note = closures.find((closure) => closure.outcome === 'correction_required')?.note;
    return note ? [note] : ['Fresh reviewed canonical bytes closing the exact correction.'];
  }
  if (primaryClass === 'already_resolved_but_ledger_stale') {
    const exactInputs = recognitionSpec.requiredInputs.filter((input) => input.trackKey === key);
    assert(exactInputs.length === 1, `${key} must have exactly one recognition-spec evidence record, found ${exactInputs.length}`);
    return [{ ...exactInputs[0], sharedPatchSpec: RECOGNITION_SPEC_PATH }];
  }
  if (primaryClass === 'runtime_wiring_missing') return e3Job?.obligations?.map((obligation) => obligation.need) ?? ['Exact compiled runtime mapping.'];
  return ['Reviewed canonical participant treatment tied to exact official-source evidence.'];
}

function participantTreatment(key) {
  if (guidancePacketByKey.has(key)) {
    const { path, packet } = guidancePacketByKey.get(key);
    return { status: 'delivered_candidate_or_canonical_guidance', treatment: packet.treatment, path, bilingual: languageNodes(packet).length > 0 };
  }
  if (hardFormByKey.has(key)) {
    const profiles = hardFormByKey.get(key);
    const bilingual = profiles.every(({ profile }) => {
      const strings = profile.participantFacingStrings;
      if (!strings?.en || !strings?.es) return false;
      const enKeys = sorted(Object.keys(strings.en));
      const esKeys = sorted(Object.keys(strings.es));
      return JSON.stringify(enKeys) === JSON.stringify(esKeys) && enKeys.length > 0 &&
        enKeys.every((name) => typeof strings.en[name] === 'string' && strings.en[name].trim() && typeof strings.es[name] === 'string' && strings.es[name].trim());
    });
    return { status: 'hard_form_candidate_present', treatment: 'production_packet', paths: profiles.map((item) => item.path), bilingual };
  }
  if (PLEADING_CONFIGS[key]) {
    return { status: 'blocked_no_delivered_packet', treatment: null, path: PLEADING_CONFIGS[key], bilingual: false };
  }
  return { status: 'not_found', treatment: null, path: null, bilingual: false };
}

function paymentBehavior(key) {
  if (C_CONTROLLED_REMAINDER.has(key)) {
    return {
      evidenceKind: 'blocked_config_fields_plus_runtime_exposure',
      artifactPaymentField: 'absent_not_inferred',
      artifactSellableField: 'absent_not_inferred',
      artifactCheckoutField: 'absent_not_inferred',
      artifactCreditField: 'absent_not_inferred',
      currentExposure: 'runtime_disabled_no_delivered_packet_no_sellable_route_no_credit_event',
    };
  }
  if (guidancePacketByKey.has(key)) {
    const packet = guidancePacketByKey.get(key).packet;
    return {
      evidenceKind: 'guidance_packet_fields',
      artifactPaymentField: packet.paymentAllowed ?? 'absent_not_inferred',
      artifactSellableField: packet.sellable ?? 'absent_not_inferred',
      artifactCheckoutField: packet.checkoutProhibited ?? 'absent_not_inferred',
      artifactCreditField: packet.creditConsumable ?? 'absent_not_inferred',
      currentExposure: 'guidance_not_sellable_no_checkout_or_credit_event_observed',
    };
  }
  const profiles = hardFormByKey.get(key) ?? [];
  return {
    evidenceKind: 'hard_form_profile_fields',
    artifactPaymentField: 'absent_not_inferred',
    artifactSellableField: 'absent_not_inferred',
    artifactCheckoutField: profiles.length > 0 && profiles.every(({ profile }) => profile.checkoutProhibited === true) ? true : 'absent_or_mixed_not_inferred',
    artifactCreditField: 'absent_not_inferred',
    currentExposure: 'no_sellable_route_no_payment_or_credit_event_observed',
  };
}

function blockerOwner(primaryClass, key) {
  if (primaryClass === 'correction_required') return key.startsWith('CA:') ? 'Terminal E (terminal-e-hard-forms)' : 'Terminal B';
  if (primaryClass === 'already_resolved_but_ledger_stale') return 'Terminal A shared-ledger owner with Terminal B evidence owner';
  if (primaryClass === 'runtime_wiring_missing') return 'Terminal A runtime owner';
  if (primaryClass === 'legal_design_or_counsel') return 'Roger/counsel with Terminal C';
  if (primaryClass === 'participant_treatment_missing') return 'Terminal B participant-treatment owner with Terminal A route owner';
  return 'Terminal C source/design owner or assigned official-form owner';
}

function nextAction(primaryClass) {
  if (primaryClass === 'correction_required') return 'Canonical owner applies the exact Codex candidate/specification and obtains the required fresh review.';
  if (primaryClass === 'already_resolved_but_ledger_stale') return 'Terminal A implements the exact candidate-recognition specification and regenerates the ledger byte-stably.';
  if (primaryClass === 'runtime_wiring_missing') return 'Terminal A implements the exact E3 compiled-pathway job, then runs legal-adoption continuity and PREP_ONLY staging.';
  if (primaryClass === 'participant_treatment_missing') return 'Canonical participant-treatment owner adopts the exact bilingual no-checkout candidate and obtains review.';
  if (primaryClass === 'legal_design_or_counsel') return 'Counsel answers the exact frozen practice questions; Terminal C then selects the instrument.';
  return 'Canonical source/design owner ingests the Codex official-source receipts, closes only the listed residual, and produces a reviewable treatment.';
}

function boundedOutputs(key, primaryClass, researchRecord) {
  const assignment = dispatchByKey.get(key);
  const outputs = [ADOPTION_PATH, STAGING_PATH, DOC_PATH, `${DISPATCH_DIR}/${assignment.id}.md`];
  if (primaryClass === 'correction_required') outputs.push(key.startsWith('CA:ca-1203') || key === 'CA:ca-17b-reduction' ? CA_SPEC_PATH : GUIDANCE_CANDIDATE_PATH);
  if (primaryClass === 'already_resolved_but_ledger_stale') outputs.push(RECOGNITION_SPEC_PATH);
  if (primaryClass === 'participant_treatment_missing') outputs.push(PARTICIPANT_CANDIDATE_PATH);
  if (e3ByKey.has(key)) outputs.push(RUNTIME_SPEC_PATH);
  if (researchRecord) outputs.push(RESEARCH_PATH, SOURCE_MATRIX_PATH, CITATION_VERIFICATION_PATH);
  return sorted(new Set(outputs));
}

const trackRecords = remaining
  .map((track) => {
    const trackKey = keyOf(track);
    const primaryClass = classByKey.get(trackKey);
    const job = jobByKey.get(trackKey);
    const e3Job = e3ByKey.get(trackKey) ?? null;
    const closures = closuresFor(trackKey);
    const researchRecord = researchByKey.get(trackKey) ?? null;
    const assignment = dispatchByKey.get(trackKey);
    const researchEvidence = researchRecord
      ? [RESEARCH_PATH, ...researchRecord.sources.flatMap((source) => source.savedBytes ? [source.savedBytes.path] : [])]
      : [];
    const ledgerDeclaredEvidence = [track.candidateEvidence, ...(track.implementationEvidence ?? [])]
      .filter((path) => typeof path === 'string' && existsSync(abs(path)));
    const runtimeEvidence = e3Job ? [E3_PATH] : [];
    const inputEvidencePaths = sorted(new Set([
      ...evidenceIndex.get(trackKey), ...ledgerDeclaredEvidence, ...researchEvidence, ...runtimeEvidence,
    ]));
    for (const path of inputEvidencePaths) assert(existsSync(abs(path)), `${trackKey} evidence path does not exist: ${path}`);
    const codexProducedEvidencePaths = boundedOutputs(trackKey, primaryClass, researchRecord);
    const allExistingEvidencePaths = sorted(new Set([...inputEvidencePaths, ...codexProducedEvidencePaths]));
    const secondaryDependencies = [
      ...(e3Job && primaryClass !== 'runtime_wiring_missing' ? ['runtime_wiring_missing'] : []),
      ...(currentReview(closures) !== 'technical_approved' ? ['technical_review_missing_after_primary_fix'] : []),
      'legal_adoption_missing_current_per_track_record',
      'staging_acceptance_missing_current_per_track_record',
      'nationwide_launch_gate_closed',
    ];
    return {
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      trackKey,
      currentTerminalDisposition: {
        disposition: `nonterminal:${track.requiredTreatment}`,
        terminal: track.terminal,
        requiredTreatment: track.requiredTreatment,
        candidateTreatment: track.candidateTreatment ?? null,
        candidateStatus: track.candidateStatus ?? null,
        holds: track.holds ?? [],
      },
      runtimeCoverage: {
        coverageDisposition: track.coverageDisposition,
        mappedCompiledPathwayIds: track.mappedCompiledPathwayIds ?? [],
        implementationStatus: track.implementationStatus ?? null,
        e3JobId: e3Job?.id ?? null,
        e3Obligations: e3Job?.obligations ?? [],
      },
      baseLedgerBlocker: baseBlocker(trackKey, primaryClass, closures, researchRecord, e3Job),
      rootBlocker: postBlocker(trackKey, primaryClass, researchRecord),
      postCodexStatus: researchRecord
        ? postResearchSummary(trackKey, researchRecord)
        : { result: 'candidate_or_patch_spec_complete_in_codex_path', nextCanonicalBlocker: postBlocker(trackKey, primaryClass, null) },
      postCodexNextClass: researchRecord ? postCodexNextClass(trackKey, researchRecord) : primaryClass,
      blockerOwner: blockerOwner(primaryClass, trackKey),
      nextExecutableJob: {
        ledgerJobIdentity: {
          jobId: job.jobId,
          lane: job.lane,
          jurisdiction: job.jurisdiction,
          implementationFamily: job.implementationFamily,
          exactSortedTrackIds: sorted(job.trackIds),
        },
        action: nextAction(primaryClass),
        frozenAssignment: assignment.id,
        frozenGroupKey: frozenKey(assignment),
      },
      requiredEvidence: requiredEvidence(trackKey, primaryClass, closures, researchRecord, e3Job),
      currentParticipantTreatment: participantTreatment(trackKey),
      currentPaymentBehavior: paymentBehavior(trackKey),
      currentReviewStatus: {
        current: currentReview(closures),
        outcomes: sorted(new Set(closures.map((closure) => closure.outcome))),
        closures: closures.map((closure) => ({
          reviewId: closure.reviewId,
          kind: closure.kind ?? 'f2',
          outcome: closure.outcome,
          owner: closure.owner ?? null,
          evidenceSha: closure.evidenceSha ?? null,
          sourceFile: closure.sourceFile ?? null,
        })),
      },
      legalAdoptionStatus: {
        currentPerTrackRecord: 'not_recorded_in_a_current_canonical_per_track_adoption_artifact',
        historicalArtifact: 'data/rcap-ledger/authority-ledger.json',
        historicalArtifactCommit: '7b5565259eae10346d546c1aef128a7e6b067951',
        warning: 'The historical authority ledger predates wave 2 and is not treated as a current blocker or approval.',
      },
      stagingStatus: {
        currentPerTrackAcceptance: 'not_recorded',
        mode: 'PREP_ONLY',
        routeEnabled: false,
        nationwideLaunchEnabled: false,
      },
      inputEvidencePaths,
      codexProducedEvidencePaths,
      allExistingEvidencePaths,
      primaryClass,
      primaryClassAtBase: primaryClass,
      secondaryDependencies: sorted(secondaryDependencies),
      implementationFamily: job.implementationFamily,
      sourceDependency: job.sourceDependency,
      reviewRequirement: job.reviewArchetype,
      activeOwnedPath: {
        owner: C_CONTROLLED_REMAINDER.has(trackKey) ? 'Terminal C controlled-pleading lane' : blockerOwner(primaryClass, trackKey),
        editProhibitedInThisBranch: true,
        paths: job.ownedPaths,
      },
      codexCanActWithoutTouchingOwnedSharedPath: true,
      codexCanFinishCanonicalTrackWithoutTouchingOwnedSharedPath: false,
      codexBoundedAction: {
        status: 'complete_in_codex_candidate_lane',
        sourceResult: researchRecord?.result ?? null,
        outputs: codexProducedEvidencePaths,
        canonicalEffect: 'none_no_promotion_no_terminal_mark_no_route_enablement',
      },
    };
  })
  .sort((a, b) => a.trackKey.localeCompare(b.trackKey));

function exactProfilePath(jurisdiction) {
  const matches = walk('src/lib/rcap-engine/compiled/profiles', (path) => path.endsWith('.json') && path.split('/').pop().startsWith(`${jurisdiction}-`));
  assert(matches.length === 1, `${jurisdiction} must have exactly one canonical compiled state profile, found ${matches.length}`);
  return matches[0];
}

function expectedTreatment(track) {
  if (track.primaryClassAtBase === 'already_resolved_but_ledger_stale') return 'exact_supported_deferral';
  if (track.primaryClassAtBase === 'participant_treatment_missing') return 'complete_guidance_candidate_no_checkout';
  if (track.currentTerminalDisposition.requiredTreatment === 'production_packet') return 'reviewed exact hard-form or controlled-pleading output only after primary blockers close';
  if (track.currentTerminalDisposition.requiredTreatment === 'complete_guidance') return 'complete bilingual guidance with no checkout';
  return `blocked until exact ${track.currentTerminalDisposition.requiredTreatment} treatment is reviewed and adopted`;
}

const runtimeSpecs = {
  schemaVersion: 'rcap-codex-runtime-wiring-patch-specs/v2',
  baseCommit: BASE,
  status: 'specification_only_src_not_modified',
  tracks: sorted([...e3ByKey.keys()]).map((trackKey) => {
    const track = trackRecords.find((item) => item.trackKey === trackKey);
    const job = e3ByKey.get(trackKey);
    const profilePath = exactProfilePath(track.jurisdiction);
    const profile = readJson(profilePath);
    const candidateEvidence = track.codexBoundedAction.outputs.filter((path) =>
      path.startsWith(DATA_DIR) && ![RUNTIME_SPEC_PATH, ADOPTION_PATH, STAGING_PATH].includes(path));
    const updatesExistingPathway = track.runtimeCoverage.coverageDisposition === 'represented_with_superseded_runtime_text';
    const exactPatch = updatesExistingPathway
      ? [
          `Correct only the existing mapped pathway ${track.runtimeCoverage.mappedCompiledPathwayIds.map((id) => `\`${id}\``).join(', ')} in ${profilePath}; do not create a duplicate pathway identifier.`,
          `Replace its superseded mechanism/authority presentation with the adopted current treatment for ${trackKey}, while retaining this exact registry-track mapping.`,
          'Update only the applicable exact JSON surfaces listed above; do not infer absent eligibility, timing, exclusion, actor, destination, or payment terms.',
          'Preserve sellable=false, checkout prohibited, payment disabled, and no credit event until exact review, adoption, and PREP_ONLY staging acceptance.',
        ]
      : [
          'After canonical treatment and legal adoption, add a new pathway identifier selected by Terminal A; this specification intentionally does not invent that identifier.',
          `Map the new pathway to only ${trackKey}; do not widen a sibling pathway by label, authority similarity, or jurisdiction.`,
          `Update only the applicable exact JSON surfaces listed above in ${profilePath}; do not infer absent eligibility, timing, exclusion, actor, destination, or payment terms.`,
          'Preserve sellable=false, checkout prohibited, payment disabled, and no credit event until exact review, adoption, and PREP_ONLY staging acceptance.',
        ];
    const identityAcceptance = updatesExistingPathway
      ? `The existing pathway ${track.runtimeCoverage.mappedCompiledPathwayIds.join(', ')} remains the exact mapping for ${trackKey}; no duplicate pathway is added.`
      : `A newly chosen pathway ID maps only ${trackKey}; no sibling-label widening is accepted.`;
    return {
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      trackKey,
      owner: 'Terminal A runtime owner',
      status: 'specification_only_src_not_modified',
      e3JobId: job.id,
      e3Label: job.label,
      mechanismAuthority: job.mechanismAuthority ?? [],
      e3ReviewRequirement: job.facets?.reviewRequirement ?? [],
      primaryBlockerMustCloseFirst: track.primaryClassAtBase,
      exactCanonicalProfilePath: profilePath,
      exactJsonSurfaces: ['pathways', 'orderedDecisionRules', 'questions', 'waitingPeriodRules', 'exclusionRules', 'frontendContract', 'resultPresentationContract'].filter((surface) => Object.hasOwn(profile, surface)),
      resolverPathIfRequired: 'src/lib/rcap-engine/profile-registry.ts',
      implementationFamily: job.facets?.implementationFamily ?? [],
      currentCoverageDisposition: track.runtimeCoverage.coverageDisposition,
      mappedCompiledPathwayIds: track.runtimeCoverage.mappedCompiledPathwayIds,
      candidateAndAdoptionEvidence: sorted(new Set([...track.inputEvidencePaths, ...candidateEvidence, ADOPTION_PATH])),
      exactPatch,
      stopCondition: job.obligations.map((obligation) => obligation.stopCondition),
      acceptanceTests: [
        'node scripts/generate-rcap-e3-job-graph.mjs --check',
        'node scripts/generate-rcap-track-terminalization.mjs --check',
        identityAcceptance,
        'Resolver tests prove no unsupported route is sellable, checkout remains unavailable, and no credit is consumed.',
      ],
    };
  }),
};

const adoption = {
  schemaVersion: 'rcap-codex-legal-adoption-continuity/v1',
  baseCommit: BASE,
  status: 'analysis_only_no_adoption_record_written',
  historicalLedgerWarning: {
    path: 'data/rcap-ledger/authority-ledger.json',
    commit: '7b5565259eae10346d546c1aef128a7e6b067951',
    treatment: 'historical_not_current_truth',
  },
  invariant: 'F2/F3 approval, candidate delivery, build output, and old authority-ledger fields do not themselves establish current legal adoption.',
  tracks: trackRecords.map((track) => ({
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    trackKey: track.trackKey,
    primaryClassAtBase: track.primaryClassAtBase,
    postCodexNextClass: track.postCodexNextClass,
    currentTechnicalReview: track.currentReviewStatus.current,
    currentPerTrackLegalAdoption: 'not_recorded',
    requiredSequence: ['Close the current canonical blocker with exact committed evidence.', 'Review the exact output bytes.', 'Record legal adoption tied to those exact bytes and sources.', 'Wire runtime under Terminal A while retaining fail-closed payment behavior.', 'Run the exact PREP_ONLY staging case; any launch remains a separate captain action.'],
    prohibitedInference: 'Do not infer adoption from review approval, candidate delivery, historical ledger booleans, or build terminality.',
  })),
};

const staging = {
  schemaVersion: 'rcap-codex-staging-test-cases/v2',
  baseCommit: BASE,
  mode: 'PREP_ONLY',
  status: 'prepared_not_executed_no_staging_records_written',
  globalPrecondition: 'Canonical owner supplies fixture inputs only after exact treatment adoption; public, route, checkout, payment, credit, staging, and nationwide launch flags remain unchanged.',
  cases: trackRecords.map((track) => {
    const ledgerTrack = nonterminal.find((item) => keyOf(item) === track.trackKey);
    return {
      testId: `STAGE-${track.jurisdiction}-${track.trackId}`,
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      trackKey: track.trackKey,
      preparedNotExecuted: true,
      passFail: 'pending',
      fixtureInputs: 'must_be_supplied_by_canonical_track_owner_after_adoption_no_participant_facts_invented',
      declaredStrategy: ledgerTrack.declaredStrategy,
      implementationFamily: track.implementationFamily,
      primaryClassAtBase: track.primaryClassAtBase,
      expectedTreatmentOrOutput: expectedTreatment(track),
      exactResolverIdentity: {
        trackId: track.trackId,
        currentMappedPathwayIds: track.runtimeCoverage.mappedCompiledPathwayIds,
        e3JobId: track.runtimeCoverage.e3JobId,
        canonicalProfilePath: exactProfilePath(track.jurisdiction),
      },
      expectedCurrentPaymentEvidence: track.currentPaymentBehavior,
      candidateEvidencePaths: sorted(new Set([
        ...track.inputEvidencePaths,
        ...track.codexBoundedAction.outputs.filter((path) =>
          path !== STAGING_PATH && path !== DOC_PATH && !path.startsWith(DISPATCH_DIR)),
      ])),
      steps: ['Supply an adopted owner-authored fixture for this exact track in internal preview with every launch flag off.', 'Assert exact resolver identity and reviewed/adopted evidence; reject sibling or label-based fallback.', 'Exercise substantive EN/ES where participant copy exists and verify actor, destination, next step, gather, do-not-file limits, timing, and Briefcase behavior.', 'Attempt every checkout and credit transition, then save/reload Briefcase state.'],
      expected: ['No public or sellable route or launch flag is enabled.', 'Checkout and payment remain unavailable and no credit event occurs.', 'A blocked or deferred track produces no unverified court filing.', 'Briefcase stores only the reviewed guidance/candidate state and never converts it into a purchasable packet.'],
      stopCondition: 'Stop on any resolver, source fingerprint, review/adoption, language parity, payment suppression, or Briefcase mismatch; do not repair by enabling a route.',
    };
  }),
};

sameSet(runtimeSpecs.tracks.map((track) => track.trackKey), [...e3ByKey.keys()], 'runtime patch specification coverage');
sameSet(adoption.tracks.map((track) => track.trackKey), remainingKeys, 'legal-adoption continuity coverage');
sameSet(staging.cases.map((test) => test.trackKey), remainingKeys, 'PREP_ONLY staging case coverage');
assert(staging.mode === 'PREP_ONLY' && staging.cases.every((test) => test.preparedNotExecuted && test.passFail === 'pending'), 'staging cases must remain prepared, unexecuted, and pending');

const classCounts = Object.fromEntries(PRIMARY_CLASSES.map((primaryClass) => [primaryClass, trackRecords.filter((track) => track.primaryClass === primaryClass).length]));
assert(Object.values(classCounts).reduce((sum, count) => sum + count, 0) === 39, 'primary class counts do not sum to 39');
assert(classCounts.correction_required === 18 && classCounts.already_resolved_but_ledger_stale === 8 && classCounts.runtime_wiring_missing === 1 && classCounts.source_or_currentness === 9 && classCounts.legal_design_or_counsel === 1 && classCounts.participant_treatment_missing === 2, 'expected phase-2 class distribution drifted');

const sourceMatrix = {
  schemaVersion: 'rcap-codex-source-matrix/v1',
  baseCommit: BASE,
  retrievalDate: research.retrievalDate,
  note: 'Deterministically expanded from research-records.json. Source text and inference remain separate; saved official bytes are hash-pinned.',
  tracks: sorted([...researchByKey.keys()]).map((trackKey) => {
    const record = researchByKey.get(trackKey);
    const [jurisdiction, trackId] = trackKey.split(':');
    return {
      jurisdiction,
      trackId,
      trackKey,
      issuingBody: record.issuingBody,
      result: record.result,
      officialSources: record.sources,
      sourceText: record.sourceText,
      inference: record.inference,
      remainingEvidence: record.remainingEvidence,
    };
  }),
};

const citationVerification = {
  schemaVersion: 'rcap-codex-source-citation-verification/v1',
  baseCommit: BASE,
  verificationDate: research.retrievalDate,
  method: 'HTTP resolution rechecked outside deterministic generation; this file freezes that result and binds every saved receipt to its bytes.',
  uniqueUrlCount: researchUrls.length,
  citations: research.records
    .flatMap((record) => record.sources.map((source) => ({
      jurisdiction: record.jurisdiction,
      issuingBody: record.issuingBody,
      retrievalDate: source.retrievalDate,
      url: source.url,
      savedPath: source.savedBytes?.path ?? null,
      sha256: source.savedBytes?.sha256 ?? null,
      bytes: source.savedBytes?.bytes ?? null,
      resolutionStatus: 'verified_http_200_on_2026-08-12',
    })))
    .sort((a, b) => a.url.localeCompare(b.url)),
};

const manifest = {
  schemaVersion: 'rcap-codex-remaining-tracks/v1',
  generatedBy: 'data/rcap-codex/remaining-tracks/generate.mjs',
  base: {
    canonicalRef: CANONICAL_REF,
    commit: BASE,
    branch: BRANCH,
    wave2Ledger: {
      path: LEDGER_PATH,
      tracksTerminal: ledger.aggregates.tracksTerminal,
      registryTracks: ledger.aggregates.registryTracks,
      tracksNonterminal: nonterminal.length,
    },
  },
  exclusionMethod: {
    nonterminalSource: 'live generated ledger tracks[] where terminal=false',
    cFocusedReview: {
      source: `${F2_PATH} notAcceptedPendingOwnerDetermination[].trackKeys`,
      crossCheck: 'exactly equals current nonterminal tracks with requiredTreatment=complete_composed_route',
      exactTrackKeys: cKeys,
    },
    dCorrectedReview: {
      manifest: D_MANIFEST,
      exactProjectionRule: 'The corrected D manifest identifies 27 jurisdictions and family IDs, not registry track IDs. Exact registry IDs are projected through current nonterminal ledger jobs where lane=D; the jurisdiction sets must match exactly.',
      exactTrackKeys: dKeys,
    },
    activeBranchAudit: {
      additionalExcludedTrackKeys: [],
      activeCDependencyCorrection: { path: C_ASSIGNMENT_PATH, exactTrackKeys: cActiveAssignmentKeys },
      cDependencyFreeResolution: { path: C_RESOLUTION_PATH, exactTrackKeys: cResolvedKeys },
      result: 'The active C correction assignment (10 tracks) and dependency-free C resolution (6 tracks) are disjoint and fully subsumed by the exact focused-C 16; no additional disjoint track is subtracted. Twelve literal remainder records are controlled-pleading paths owned by C and remain edit-prohibited.',
      cControlledRemainingTrackKeys: sorted(C_CONTROLLED_REMAINDER),
    },
  },
  invariants: {
    nonterminal: nonterminal.length,
    cExcluded: cKeys.length,
    dExcluded: dKeys.length,
    cDIntersection: 0,
    remaining: remaining.length,
    partitionEquation: `${nonterminal.length} - ${cKeys.length} - ${dKeys.length} = ${remaining.length}`,
    everyRemainingTrackExactlyOnce: true,
    everyRemainingTrackHasExactlyOneCurrentLedgerJob: true,
    everyRemainingTrackHasExactlyOneFrozenAssignment: true,
    primaryClassCounts: classCounts,
  },
  schemaCaveats: [
    'The canonical ledger has no normalized currentTerminalDisposition string; exact terminal, treatment, candidate, and hold fields are preserved separately.',
    'The corrected D manifest contains family IDs, so registry track IDs are explicitly inferred from exact current lane-D jobs and a required identical 27-jurisdiction set.',
    'terminalization jobs[].jobId is not unique; frozen identity uses assignment id, exact sorted track keys, owned paths, expected output, and a SHA-bound group key.',
    'No current canonical per-track legal-adoption or staging-acceptance artifact exists; the old authority ledger is labeled historical.',
    'Blocked C configurations omit payment, sellable, checkout, and credit fields. Artifact fields remain absent_not_inferred; only the separately described operational exposure is derived.',
    'primaryClassAtBase preserves the phase-2 classification. postCodexStatus and rootBlocker identify what research resolved and the next canonical blocker.',
  ],
  safety: {
    canonicalLedgerModified: false,
    canonicalJobGraphModified: false,
    sourceTreeModified: false,
    routeFlagsModified: false,
    nationwideLaunchFlagsModified: false,
    trackPromotions: 0,
    tracksMarkedTerminal: 0,
    sellableRoutesEnabled: 0,
    paymentBehaviorWeakened: false,
    candidatePathsOnly: true,
  },
  aggregates: {
    liveNonterminalCount: nonterminal.length,
    cTracksExcluded: cKeys.length,
    dTracksExcluded: dKeys.length,
    otherTracksIdentified: remaining.length,
    primaryClassCounts: classCounts,
    literalRemainingCControlledNoEdit: C_CONTROLLED_REMAINDER.size,
    strictNonCNonDCount: remaining.length - C_CONTROLLED_REMAINDER.size,
    codexBoundedDeliverablesComplete: remaining.length,
    canonicalTracksCompletedOrPromoted: 0,
    tracksWithCandidateTreatments: guidanceCandidates.packets.length + participantCandidates.treatments.length,
    tracksReturnedAsFrozenJobs: dispatchByKey.size,
    frozenJobGroups: DISPATCH.length,
    runtimePatchSpecifications: runtimeSpecs.tracks.length,
    researchTrackRecords: researchByKey.size,
    savedOfficialSourceReceipts: savedReceiptCount,
    verifiedOfficialSourceCitations: citationVerification.uniqueUrlCount,
  },
  generatedOutputs: {
    sourceMatrix: SOURCE_MATRIX_PATH,
    sourceCitationVerification: CITATION_VERIFICATION_PATH,
    manifest: MANIFEST_PATH,
    overview: DOC_PATH,
  },
  tracks: trackRecords,
};

function frozenDimensions(assignment) {
  const jobs = assignment.trackKeys.map((key) => jobByKey.get(key));
  return {
    jurisdictions: sorted(new Set(jobs.map((job) => job.jurisdiction))),
    implementationFamilies: sorted(new Set(jobs.map((job) => job.implementationFamily))),
    compatibleOwnedPaths: sorted(assignment.ownedPaths),
    sourceDependencies: sorted(new Set(jobs.map((job) => job.sourceDependency))),
    reviewRequirements: sorted(new Set(jobs.map((job) => job.reviewArchetype))),
    exactSortedTrackKeys: sorted(assignment.trackKeys),
  };
}

function frozenKey(assignment) {
  const dimensions = frozenDimensions(assignment);
  assert(dimensions.jurisdictions.length === 1, `${assignment.id} spans jurisdictions: ${dimensions.jurisdictions.join(',')}`);
  assert(dimensions.implementationFamilies.length === 1, `${assignment.id} mixes implementation families: ${dimensions.implementationFamilies.join(',')}`);
  assert(dimensions.sourceDependencies.length === 1, `${assignment.id} mixes source dependencies`);
  assert(dimensions.reviewRequirements.length === 1, `${assignment.id} mixes review requirements`);
  const payload = JSON.stringify({
    base: BASE,
    id: assignment.id,
    ...dimensions,
    expectedOutput: assignment.expectedOutput,
  });
  return `${assignment.id}:${sha(Buffer.from(payload)).slice(0, 12)}`;
}

function dispatchInputs(assignment) {
  const inputs = new Set([LEDGER_PATH, F2_PATH, ADOPTION_PATH, STAGING_PATH]);
  for (const key of assignment.trackKeys) {
    const record = trackRecords.find((track) => track.trackKey === key);
    record.inputEvidencePaths.forEach((path) => inputs.add(path));
    record.codexBoundedAction.outputs.filter((path) => !path.startsWith(DISPATCH_DIR) && path !== DOC_PATH).forEach((path) => inputs.add(path));
  }
  return sorted([...inputs].filter((path) => existsSync(abs(path))));
}

function reviewRequirement(assignment) {
  const classes = new Set(assignment.trackKeys.map((key) => classByKey.get(key)));
  if (classes.has('legal_design_or_counsel')) return 'Licensed counsel decision on the exact frozen questions, followed by technical review of any instrument.';
  if (classes.has('source_or_currentness') || classes.has('participant_treatment_missing')) return 'Official-source/currentness review, legal-design adoption, exact technical/visual review for the selected family, then PREP_ONLY staging.';
  if (classes.has('runtime_wiring_missing')) return 'Runtime technical review, legal-adoption continuity, then PREP_ONLY staging acceptance.';
  if (classes.has('correction_required')) return 'Fresh F2 review of corrected canonical bytes; refresh F3 if rendered bytes change.';
  return 'Shared-generator review plus proof that a current exact F2 technical_approved closure remains the only promotion signal.';
}

function stopCondition(assignment) {
  const classes = new Set(assignment.trackKeys.map((key) => classByKey.get(key)));
  if (classes.has('source_or_currentness') || classes.has('legal_design_or_counsel')) return 'Stop before writing a canonical filing if official sources do not resolve the exact vehicle, form status, service, fee, deadline, or required element. Return the exact unresolved question; do not guess.';
  if (classes.has('already_resolved_but_ledger_stale')) return 'Stop if recognition cannot be tied to existing exact deferral evidence and a current technical_approved closure, or if any unrelated track byte or disposition changes.';
  return 'Stop and return the exact mismatch if the base or reviewed source bytes changed, or if work would require a route flag, payment/credit behavior, staging/launch record, or another lane’s path outside declared ownership.';
}

function dispatchMarkdown(assignment) {
  const classes = sorted(new Set(assignment.trackKeys.map((key) => classByKey.get(key))));
  const classSet = new Set(classes);
  const dimensions = frozenDimensions(assignment);
  const tests = new Set([
    'Exact track IDs in this assignment change and no outside track changes.',
    'Every operative legal claim traces to an official primary source or an existing committed primary-authority record; inference is labeled.',
    'No sellable route, route flag, nationwide launch flag, payment, checkout, or credit consumption is enabled.',
    'Where participant copy exists, English and Spanish are substantive and Briefcase behavior is explicit.',
  ]);
  if (classSet.has('correction_required') && !assignment.id.startsWith('CA-')) tests.add('node scripts/verify-rcap-guidance-terminalization.mjs');
  if (assignment.id === 'CA-cr180-correction') {
    tests.add('node scripts/verify-rcap-hard-form-outputs.mjs');
    tests.add('node scripts/verify-rcap-hard-form-dispositions.mjs');
    tests.add('node scripts/verify-rcap-hard-form-rendered-assertions.mjs');
  }
  if (classSet.has('runtime_wiring_missing') || assignment.trackKeys.some((key) => e3ByKey.has(key))) tests.add('node scripts/generate-rcap-e3-job-graph.mjs --check');
  if (classSet.has('runtime_wiring_missing') || classSet.has('already_resolved_but_ledger_stale')) tests.add('node scripts/generate-rcap-track-terminalization.mjs --check');
  return `# Frozen assignment — ${assignment.id}\n\nStatus: paste-ready, frozen at the exact base below. This assignment grants no authority to promote a track or enable a route.\n\n## Exact scope\n\n- Base commit: \`${BASE}\`\n- Canonical base ref: \`${CANONICAL_REF}\`\n- Frozen group key: \`${frozenKey(assignment)}\`\n- Jurisdiction: \`${dimensions.jurisdictions[0]}\`\n- Implementation family: \`${dimensions.implementationFamilies[0]}\`\n- Source dependency: \`${dimensions.sourceDependencies[0]}\`\n- Ledger review requirement: \`${dimensions.reviewRequirements[0]}\`\n- Exact track IDs: ${assignment.trackKeys.map((key) => `\`${key}\``).join(', ')}\n- Primary class(es) at base: ${classes.map((value) => `\`${value}\``).join(', ')}\n- Recommended owner: ${assignment.owner}\n- Recommended model: ${assignment.model}\n\n## Required inputs\n\n${dispatchInputs(assignment).map((path) => `- \`${path}\``).join('\n')}\n\nRead every input at the exact base. A Nationwide inventory pointer is not proof of an operative claim; use an official primary source for any new legal claim.\n\n## Owned paths\n\n${assignment.ownedPaths.map((path) => `- \`${path}\``).join('\n')}\n\nDo not edit outside this list. If a required shared-path change is not assigned, return an exact patch specification to Terminal A.\n\n## Expected output\n\n${assignment.expectedOutput}\n\nPreserve the exact actor, destination, next step, gather list, do-not-file/assume limits, Briefcase behavior, payment and credit suppression, and substantive English/Spanish wherever participant copy is produced.\n\n## Review requirement\n\n${reviewRequirement(assignment)}\n\n## Stop condition\n\n${stopCondition(assignment)}\n\n## Acceptance tests\n\n${sorted(tests).map((test) => `- ${test}`).join('\n')}\n`;
}

function overviewMarkdown() {
  const classRows = PRIMARY_CLASSES.map((primaryClass) => `| ${primaryClass} | ${classCounts[primaryClass]} |`).join('\n');
  const trackRows = trackRecords.map((track) => `| ${track.jurisdiction} | \`${track.trackId}\` | ${track.primaryClassAtBase} | ${track.blockerOwner} | ${track.currentReviewStatus.current} | \`${track.postCodexStatus.result}\` | \`${track.nextExecutableJob.frozenAssignment}\` |`).join('\n');
  return `# RCAP remaining-track wave — Codex bounded lane\n\nBase: \`${BASE}\` (\`${CANONICAL_REF}\`)<br>\nBranch: \`${BRANCH}\`<br>\nLedger position: **${ledger.aggregates.tracksTerminal} / ${ledger.aggregates.registryTracks} terminal; ${nonterminal.length} nonterminal**.\n\n## Exact live partition\n\nThe live result is **${remaining.length}**. It is derived by exact track identity: ${nonterminal.length} live nonterminal tracks, minus ${cKeys.length} focused-C composed-route tracks and ${dKeys.length} lane-D tracks projected from the corrected D manifest’s exact ${D_MANIFEST.jurisdictions.length}-jurisdiction set. The active C correction assignment (10) plus dependency-free resolution (6) exactly equals the focused-C 16 and adds no disjoint exclusion. C/D intersection is zero and the union closes the full nonterminal set.\n\nTwelve literal remainder records are controlled-pleading configurations owned by C. They remain visible for literal partition completeness, but this branch changes none of their canonical paths. The strict non-C/non-D and non-controlled-C working subset is therefore **${remaining.length - C_CONTROLLED_REMAINDER.size}**.\n\n## Primary classification at base\n\n| Primary class | Tracks |\n|---|---:|\n${classRows}\n\nEach record also carries \`postCodexStatus\` and \`postCodexNextClass\`, so source questions resolved by the saved research are not misreported as current blockers. Primary classification remains frozen to the phase-2 base state.\n\n## Bounded work landed\n\n- ${guidanceCandidates.packets.length} complete bilingual guidance-correction candidates and ${participantCandidates.treatments.length} complete bilingual no-checkout participant treatments.\n- ${researchByKey.size} track-level official-source research records with source text separated from inference, ${savedReceiptCount} saved-byte receipts SHA-256 pinned, and ${citationVerification.uniqueUrlCount} unique official citations frozen as HTTP-200 verified on ${research.retrievalDate}.\n- ${staleKeys.length} exact approved-deferral recognition specifications and ${runtimeSpecs.tracks.length} exact E3 runtime-wiring specifications; no shared generator or \`src/**\` path is edited here.\n- ${staging.cases.length} exact prepared-not-executed PREP_ONLY staging cases, ${adoption.tracks.length} legal-adoption continuity records, and ${DISPATCH.length} deterministic frozen assignments covering all ${remaining.length} tracks exactly once.\n\nNo candidate is canonical, promoted, terminal, sellable, staged, or launched by this branch.\n\n## Track matrix\n\n| Jurisdiction | Track | Primary class at base | Current owner | Review | Post-Codex status | Frozen assignment |\n|---|---|---|---|---|---|---|\n${trackRows}\n\n## Verification contract\n\nRun \`node data/rcap-codex/remaining-tracks/generate.mjs --check\`. The checker fails on partition drift, exclusion overlap, missing or duplicate class/dispatch/job membership, stale candidate/spec/source-matrix/manifest/docs/dispatch bytes, missing evidence paths, saved-source hash drift, non-official research URLs, candidate EN/ES incompleteness, or weakened candidate payment/credit fields.\n`;
}

writeDerived(GUIDANCE_CANDIDATE_PATH, json(guidanceCandidates));
writeDerived(PARTICIPANT_CANDIDATE_PATH, json(participantCandidates));
writeDerived(RECOGNITION_SPEC_PATH, json(recognitionSpec));
writeDerived(CA_SPEC_PATH, json(caSpec));
writeDerived(RUNTIME_SPEC_PATH, json(runtimeSpecs));
writeDerived(ADOPTION_PATH, json(adoption));
writeDerived(STAGING_PATH, json(staging));
writeDerived(SOURCE_MATRIX_PATH, json(sourceMatrix));
writeDerived(CITATION_VERIFICATION_PATH, json(citationVerification));
writeDerived(MANIFEST_PATH, json(manifest));
writeDerived(DOC_PATH, overviewMarkdown());
for (const assignment of DISPATCH) writeDerived(`${DISPATCH_DIR}/${assignment.id}.md`, dispatchMarkdown(assignment));

const expectedDispatchNames = new Set(DISPATCH.map((assignment) => `${assignment.id}.md`));
if (existsSync(abs(DISPATCH_DIR))) {
  const actualDispatchNames = readdirSync(abs(DISPATCH_DIR)).filter((name) => name.endsWith('.md'));
  if (!CHECK) for (const name of actualDispatchNames) if (!expectedDispatchNames.has(name)) unlinkSync(abs(`${DISPATCH_DIR}/${name}`));
  const finalDispatchNames = readdirSync(abs(DISPATCH_DIR)).filter((name) => name.endsWith('.md'));
  sameSet(finalDispatchNames, [...expectedDispatchNames], 'dispatch file set');
}

console.log(`${CHECK ? 'checked' : 'generated'} remaining-track wave: ${ledger.aggregates.tracksTerminal}/${ledger.aggregates.registryTracks} terminal; ${nonterminal.length} nonterminal = ${cKeys.length} C + ${dKeys.length} D + ${remaining.length} remaining`);
console.log(`candidates ${guidanceCandidates.packets.length + participantCandidates.treatments.length}; research tracks ${researchByKey.size}; source receipts ${savedReceiptCount}; runtime specs ${runtimeSpecs.tracks.length}; frozen groups ${DISPATCH.length}`);
