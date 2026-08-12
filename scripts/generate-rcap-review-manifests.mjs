#!/usr/bin/env node
// F2/F3 review manifests — the independent-review work queue for lane F.
//
// F2 is independent TECHNICAL review: one job per implemented family (D1
// official-form/overlay families and E hard-form Tier-1 families), each
// sha-anchored to the family's committed evidence. F3 is VISUAL review: one
// job per family with rendered artifacts, against those exact rendered bytes.
//
// Nothing here approves anything. Every job is emitted pending, and the
// packet routes these families serve stay unapproved until the F2 job for the
// family closes with independent evidence (E lane rule: no technical approval
// before F's independent review; D1 rule: every hold is preserved).
//
//   node scripts/generate-rcap-review-manifests.mjs           # write
//   node scripts/generate-rcap-review-manifests.mjs --check   # verify current

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const WINDOW_ID = '2026-08-12-w2';
const OUT_DIR = 'data/rcap-all50/review-artifacts';
const F2_PATH = path.join(OUT_DIR, 'f2-independent-technical-review.json');
const F3_PATH = path.join(OUT_DIR, 'f3-visual-review.json');

const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const f2Jobs = [];
const f3Jobs = [];
const reviewExempt = [];

// --- D1 official-form families ----------------------------------------------

const D1_INDEX = 'data/rcap-all50/overlays/production/implementation-index.json';
const d1Index = JSON.parse(fs.readFileSync(path.join(rootDir, D1_INDEX), 'utf8'));

// Directory layout is production/<state-name>/<family>/; the index carries
// two-letter codes, so jobs are derived from the directories themselves and
// joined to the index by family id.
const indexByFamily = new Map((d1Index.families || []).map((f) => [f.family, f]));
const productionRoot = path.join(rootDir, 'data/rcap-all50/overlays/production');
const stateDirs = fs.readdirSync(productionRoot).filter((entry) =>
  fs.statSync(path.join(productionRoot, entry)).isDirectory());

for (const state of stateDirs.sort()) {
  const stateDir = path.join(productionRoot, state);
  for (const family of fs.readdirSync(stateDir).sort()) {
    const familyDir = path.join(stateDir, family);
    if (!fs.statSync(familyDir).isDirectory()) continue;
    const rel = `data/rcap-all50/overlays/production/${state}/${family}`;
    const indexed = indexByFamily.get(family);
    const status = indexed?.status ?? 'not_indexed';
    const sourceRecordPath = path.join(familyDir, 'source-record.json');
    const evidence = {
      familyDir: rel,
      ...(fs.existsSync(sourceRecordPath) ? { sourceRecordSha256: sha256(sourceRecordPath) } : {}),
    };
    if (/no_fill/.test(status)) {
      reviewExempt.push({ family, state, status, reason: 'No participant fill is performed; the no-fill classification itself is reviewed with the jurisdiction summary.' });
      continue;
    }
    f2Jobs.push({
      jobId: `F2-D1-${state}-${family}`,
      lane: 'D1',
      state,
      family,
      implementationStatus: status,
      holds: indexed?.holds ?? null,
      evidence,
      reviewArchetype: 'F-visual-and-field-fidelity',
      mustVerify: [
        'every binding writes a writable field and only a writable field',
        'no protected or court-issued field is populated',
        'the census and map match the sha-pinned source record',
        'overflow/clipping report is clean or its exceptions are recorded',
        'holds recorded on the family remain accurate',
      ],
      status: 'pending_independent_review',
    });
    const renderedPath = path.join(familyDir, 'reports', 'rendered-artifacts.json');
    if (fs.existsSync(renderedPath)) {
      f3Jobs.push({
        jobId: `F3-D1-${state}-${family}`,
        lane: 'D1',
        state,
        family,
        renderedArtifacts: `${rel}/reports/rendered-artifacts.json`,
        renderedArtifactsSha256: sha256(renderedPath),
        mustVerify: [
          'rendered bytes match their recorded hashes',
          'every populated value sits inside its field box at print size',
          'no rendered page differs from the official form beyond the populated fields',
        ],
        status: 'pending_visual_review',
      });
    }
  }
}

// --- C controlled pleadings and composed routes --------------------------------

for (const [root, laneKind] of [
  ['data/rcap-all50/pleadings', 'pleading'],
  ['data/rcap-all50/composed-routes', 'composed-route'],
]) {
  const rootAbs = path.join(rootDir, root);
  if (!fs.existsSync(rootAbs)) continue;
  for (const state of fs.readdirSync(rootAbs).sort()) {
    const stateDir = path.join(rootAbs, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const track of fs.readdirSync(stateDir).sort()) {
      const trackDir = path.join(stateDir, track);
      if (!fs.statSync(trackDir).isDirectory()) continue;
      const marker = laneKind === 'pleading'
        ? path.join(trackDir, 'pleading-config.json')
        : path.join(trackDir, 'route.json');
      if (!fs.existsSync(marker)) continue;
      const rel = `${root}/${state}/${track}`;
      if (laneKind === 'pleading' && !(fs.existsSync(path.join(trackDir, 'rendered')) && fs.readdirSync(path.join(trackDir, 'rendered')).length > 0)) {
        reviewExempt.push({ family: track, state, status: 'pleading_config_only', reason: 'No rendered artifacts yet; the jurisdiction commit is still in flight in lane C and enters F2 when it lands complete.' });
        continue;
      }
      f2Jobs.push({
        jobId: `F2-C-${state}-${track}`,
        lane: 'C',
        state,
        family: track,
        implementationStatus: laneKind === 'pleading' ? 'pleading_rendered_pending_independent_review' : 'composed_route_pending_independent_review',
        holds: null,
        evidence: { familyDir: rel, markerSha256: sha256(marker) },
        reviewArchetype: laneKind === 'pleading' ? 'F-visual-and-field-fidelity' : 'F-sequence-and-handoff',
        mustVerify: laneKind === 'pleading'
          ? [
            'legal support: the pleading cites the operative authority the registry records for this track',
            'English/Spanish parity where participant copy is bilingual',
            'payment suppression: nothing in the artifact opens payment outside a sellable route',
            'canonical fixtures pass pleading QA and negative fixtures fail',
            'no protected-field leak (docket, judge, OTN, prosecutor, SSN/DOB shapes) in canonical renders',
          ]
          : [
            'every unit of the composed route is present: a blocked component cannot disappear — each official_form_dependency unit is supplied or carries its own complete supported terminal treatment',
            'sequencing and participant handoff between stages are exact',
            'filing/participant separation holds',
            'no internal implementation language reaches a participant document',
          ],
        status: 'pending_independent_review',
      });
      const renderedDir = path.join(trackDir, 'rendered');
      if (laneKind === 'pleading' && fs.existsSync(renderedDir)) {
        f3Jobs.push({
          jobId: `F3-C-${state}-${track}`,
          lane: 'C',
          state,
          family: track,
          renderedArtifacts: `${rel}/rendered`,
          renderedArtifactsSha256: crypto.createHash('sha256').update(
            fs.readdirSync(renderedDir).sort().map((f) => `${f}:${sha256(path.join(renderedDir, f))}`).join('\n')
          ).digest('hex'),
          mustVerify: [
            'rendered pleading bytes match the committed artifacts',
            'caption, title and verification blocks are complete at print size',
            'no placeholder or internal vocabulary appears in the rendered document',
          ],
          status: 'pending_visual_review',
        });
      }
    }
  }
}

// --- E hard-form Tier-1 families ---------------------------------------------

const hardFormsRoot = path.join(rootDir, 'data/rcap-all50/hard-forms');
for (const state of fs.readdirSync(hardFormsRoot).sort()) {
  const stateDir = path.join(hardFormsRoot, state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const family of fs.readdirSync(stateDir).sort()) {
    const familyDir = path.join(stateDir, family);
    if (!fs.statSync(familyDir).isDirectory()) continue;
    const profilePath = path.join(familyDir, 'profile.json');
    if (!fs.existsSync(profilePath)) continue;
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    const tier = profile.strategy?.tier || '';
    const rel = `data/rcap-all50/hard-forms/${state}/${family}`;
    if (tier === 'exact_supported_deferral') {
      reviewExempt.push({ family, state, status: tier, reason: 'Deferral treatment; reviewed through the F-deferral-statement-exactness archetype with lane B outputs.' });
      continue;
    }
    if (!tier.startsWith('tier_')) continue;
    f2Jobs.push({
      jobId: `F2-E-${state}-${family}`,
      lane: 'E',
      state,
      family,
      implementationStatus: `${tier}_pending_independent_review`,
      holds: null,
      evidence: {
        familyDir: rel,
        profileSha256: sha256(profilePath),
      },
      reviewArchetype: 'F-visual-and-field-fidelity',
      mustVerify: [
        'the XFA package is absent from the derivative and the widget shadow fills correctly',
        'fixtures (canonical, boundary, negative) render to their recorded fingerprints',
        'protected fields and required text anchors hold',
        'tracksServed names only tracks this form actually serves',
        'no route this family serves is marked technically approved before this job closes',
      ],
      status: 'pending_independent_review',
    });
    const fingerprints = path.join(familyDir, 'reports', 'output-fingerprints.json');
    if (fs.existsSync(fingerprints)) {
      f3Jobs.push({
        jobId: `F3-E-${state}-${family}`,
        lane: 'E',
        state,
        family,
        renderedArtifacts: `${rel}/reports/output-fingerprints.json`,
        renderedArtifactsSha256: sha256(fingerprints),
        mustVerify: [
          'rendered fixture bytes match their recorded fingerprints',
          'populated values sit inside their widget boxes at print size',
          'the filled document opens identically in the recorded viewer matrix',
        ],
        status: 'pending_visual_review',
      });
    }
  }
}

// The three closing outcomes, as Roger defined them for this window. A pending
// job closes with exactly one of these; anything else is not a closure.
const CLOSING_OUTCOMES = {
  technical_approved:
    'eligible for captain integration, subject to runtime wiring, legal-adoption continuity and the final ledger state.',
  correction_required:
    'return to the named B, C, D or E owner with the exact defect and acceptance condition.',
  held_on_source_or_design:
    'preserve as nonterminal unless the committed evidence supports an exact deferral or deliberate exclusion.',
};

const manifest = (kind, jobs) => ({
  schemaVersion: `rcap-review-manifest/${kind}/v1`,
  windowId: WINDOW_ID,
  kind,
  rule:
    kind === 'f2-independent-technical-review'
      ? 'One job per implemented family. A family\'s packet routes stay technically unapproved until its F2 job closes with independent evidence. Closing a job requires a reviewer other than the implementing lane.'
      : 'One job per family with rendered artifacts, reviewed against the exact recorded bytes.',
  closingOutcomes: CLOSING_OUTCOMES,
  counts: { jobs: jobs.length },
  jobs,
  reviewExempt,
});

const f2Json = `${JSON.stringify(manifest('f2-independent-technical-review', f2Jobs), null, 2)}\n`;
const f3Json = `${JSON.stringify(manifest('f3-visual-review', f3Jobs), null, 2)}\n`;

const outputs = [
  [path.join(rootDir, F2_PATH), f2Json],
  [path.join(rootDir, F3_PATH), f3Json],
];

if (checkOnly) {
  const stale = outputs.filter(([p, body]) => !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== body);
  if (stale.length) {
    console.error(`stale review manifests: ${stale.map(([p]) => path.relative(rootDir, p)).join(', ')}; re-run without --check`);
    process.exit(1);
  }
  console.log(`review manifests current — F2 ${f2Jobs.length} jobs, F3 ${f3Jobs.length} jobs, ${reviewExempt.length} review-exempt families`);
} else {
  fs.mkdirSync(path.join(rootDir, OUT_DIR), { recursive: true });
  for (const [p, body] of outputs) fs.writeFileSync(p, body);
  console.log(`wrote F2 (${f2Jobs.length} jobs) and F3 (${f3Jobs.length} jobs); ${reviewExempt.length} review-exempt families`);
}
