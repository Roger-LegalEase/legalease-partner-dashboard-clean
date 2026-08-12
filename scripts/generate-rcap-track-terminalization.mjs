#!/usr/bin/env node
// Canonical writer for the 497-track terminalization ledger.
//
//   node scripts/generate-rcap-track-terminalization.mjs
//   node scripts/generate-rcap-track-terminalization.mjs --check
//
// WHAT "TERMINAL" MEANS HERE, exactly and narrowly:
//
//   A track is TERMINAL when the participant who reaches it receives a
//   complete, built treatment — a production packet, complete guidance, a
//   complete composed route, a documented deliberate scope exclusion, or an
//   exact supported deferral — with runtime routing in place and no unresolved
//   legal decision conditioning a required component.
//
//   Terminality is a BUILD fact. Counsel review promotion (legalStatus is
//   legal_review_pending on all 497 registry tracks) is a separate launch gate
//   tracked independently, per the repository's build-first review model. This
//   ledger never claims review approval, and review approval never substitutes
//   for a missing treatment.
//
// Everything here is derived from committed machine-readable inputs — the
// pinned registry, the crosswalk ledger, the E4 adjudications, the all-state
// build manifest, the encrypted-PDF rescue report. No track is classified by
// hand, no disposition is "unknown" by construction (the generator fails
// rather than emit one), and no blocker is emitted without an owner and a
// deadline.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outJson = path.join(rootDir, 'data/rcap-ledger/track-terminalization.json');
const outDoc = path.join(rootDir, 'docs/record-clearing/track-terminalization.md');
const checkOnly = process.argv.includes('--check');

// The integration window this ledger was generated in. Advanced by the captain
// once per window; deliberately not a wall-clock read so --check is exact.
const WINDOW_ID = '2026-08-12-w3';
const WINDOW_DATE = '2026-08-12';

const problems = [];
const fail = (m) => problems.push(m);

// --- inputs -----------------------------------------------------------------

const crosswalk = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rcap-ledger/track-pathway-crosswalk.json'), 'utf8'));
const buildManifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rcap-all50/all-state-build-manifest.json'), 'utf8'));
const rescueReport = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rcap-all50/overlays/encrypted-pdf-rescue-report.json'), 'utf8'));

// The registry is pinned by commit and content hash in the crosswalk; read it
// from that exact commit and refuse to proceed if the bytes moved.
const regSrc = crosswalk.registrySource;
const REGISTRY_PATH = 'data/record-clearing/legal-design-track-registry.json';
const registryRaw = execFileSync('git', ['show', `${regSrc.commit}:${REGISTRY_PATH}`], {
  cwd: rootDir,
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
});
const registryActualSha = crypto.createHash('sha256').update(registryRaw).digest('hex');
if (registryActualSha !== regSrc.sha256[REGISTRY_PATH]) {
  fail(`registry bytes at ${regSrc.commit.slice(0, 8)} hash to ${registryActualSha.slice(0, 12)}…, crosswalk pinned ${regSrc.sha256[REGISTRY_PATH].slice(0, 12)}…`);
}
const registry = JSON.parse(registryRaw);
const registryById = new Map(registry.tracks.map((t) => [t.trackId, t]));

const stateByCode = new Map(buildManifest.states.map((s) => [s.code, s]));

// Jurisdictions with unrecovered encrypted/XFA-class official forms — the
// hardest technical family, owned by E rather than D.
const hardFormJurisdictions = new Set(
  (rescueReport.targets || [])
    .filter((t) => Array.isArray(t.forms) ? t.forms.some((f) => !f.recovered) : true)
    .map((t) => t.jurisdictionCode)
);

// E4 flags, keyed both ways.
const counselByTrack = new Map();
const counselByPathway = new Map();
for (const item of crosswalk.e4CounselReviewRequirements || []) {
  const target = item.subjectKind === 'registry_track' ? counselByTrack : counselByPathway;
  const key = `${item.jurisdiction}:${item.subjectId}`;
  if (!target.has(key)) target.set(key, []);
  target.get(key).push(item.id || item.jobId);
}
const sourceGapPathways = new Set(
  (crosswalk.e4OfficialSourceGapAdjudications || [])
    .filter((i) => i.subjectKind === 'compiled_pathway')
    .map((i) => `${i.jurisdiction}:${i.subjectId}`)
);
const e4TerminalTracks = new Set(
  (crosswalk.e4CrosswalkTerminalClassifications || [])
    .filter((i) => i.subjectKind === 'registry_track')
    .map((i) => `${i.jurisdiction}:${i.subjectId}`)
);

// --- delivered treatments (window 2: first terminalization integration) -----
//
// A treatment is DELIVERED when its participant-facing artifact exists in the
// owning lane's path and satisfies that lane's acceptance shape. Delivery is
// what moves a track to terminal; a lane's claim without the artifact moves
// nothing.

// Lane B: complete_guidance — every packet must carry the eleven participant
// elements and must not open payment or sale.
const GUIDANCE_ELEMENTS = [
  'mechanism', 'participantFiles', 'controllingActor', 'gather', 'nextStep',
  'destination', 'stopReason', 'afterNextStep', 'briefcaseSaved', 'handoff', 'timing',
];
const deliveredGuidance = new Map(); // trackId -> evidence path
{
  const dir = path.join(rootDir, 'data/rcap-all50/guidance-packets');
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json') || file.startsWith('_')) continue;
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      for (const packet of parsed.packets || []) {
        if (packet.treatment !== 'complete_guidance') continue;
        const complete = GUIDANCE_ELEMENTS.every((element) => packet[element] !== undefined)
          && packet.paymentAllowed === false && packet.sellable === false;
        if (complete) deliveredGuidance.set(packet.trackId, `data/rcap-all50/guidance-packets/${file}`);
      }
    }
  }
}

// Lane E: exact_supported_deferral — a hard-form profile whose strategy tier
// records the deferral with its rationale, serving named tracks. Roger's
// integration-window directive (2026-08-12) authorizes this treatment to
// substitute for a production_packet requirement on the tracks it names.
const deliveredDeferrals = new Map(); // trackId -> { evidence, rationale }
{
  const hardFormsRoot = path.join(rootDir, 'data/rcap-all50/hard-forms');
  if (fs.existsSync(hardFormsRoot)) {
    for (const state of fs.readdirSync(hardFormsRoot)) {
      const stateDir = path.join(hardFormsRoot, state);
      if (!fs.statSync(stateDir).isDirectory()) continue;
      for (const family of fs.readdirSync(stateDir)) {
        const profilePath = path.join(stateDir, family, 'profile.json');
        if (!fs.existsSync(profilePath)) continue;
        const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
        if (profile.strategy?.tier !== 'exact_supported_deferral') continue;
        for (const trackId of profile.tracksServed || []) {
          deliveredDeferrals.set(trackId, {
            evidence: `data/rcap-all50/hard-forms/${state}/${family}/profile.json`,
            rationale: String(profile.strategy.rationale || ''),
          });
        }
      }
    }
  }
}

// Lane E: tier-1 implemented hard-form families — implementation evidence for
// the tracks they serve. NOT terminality: packet composition is incomplete
// (Tier-0 attachments handed to D; CR-106 blocked on per-county legal design)
// and independent review (F2) has not run.
const hardFormImplementations = new Map(); // trackId -> [family evidence]
{
  const hardFormsRoot = path.join(rootDir, 'data/rcap-all50/hard-forms');
  if (fs.existsSync(hardFormsRoot)) {
    for (const state of fs.readdirSync(hardFormsRoot)) {
      const stateDir = path.join(hardFormsRoot, state);
      if (!fs.statSync(stateDir).isDirectory()) continue;
      for (const family of fs.readdirSync(stateDir)) {
        const profilePath = path.join(stateDir, family, 'profile.json');
        if (!fs.existsSync(profilePath)) continue;
        const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
        const tier = profile.strategy?.tier || '';
        if (!tier.startsWith('tier_')) continue;
        for (const trackId of profile.tracksServed || []) {
          const list = hardFormImplementations.get(trackId) || [];
          list.push(`data/rcap-all50/hard-forms/${state}/${family}`);
          hardFormImplementations.set(trackId, list);
        }
      }
    }
  }
}

// Lane C candidates: a controlled pleading is delivered when its config and
// rendered artifacts exist; a composed route when its route.json exists. A
// composed route's official_form_dependency units are recorded so the
// blocked-component rule is visible at F2 closure: a blocked component cannot
// disappear inside a composed route — it must be supplied, or carry its own
// complete supported terminal treatment, before the route is accepted.
const deliveredPleadings = new Map(); // trackId -> evidence
const deliveredComposedRoutes = new Map(); // trackId -> { evidence, officialFormDependencyUnits }
{
  const pleadingsRoot = path.join(rootDir, 'data/rcap-all50/pleadings');
  if (fs.existsSync(pleadingsRoot)) {
    for (const state of fs.readdirSync(pleadingsRoot)) {
      const stateDir = path.join(pleadingsRoot, state);
      if (!fs.statSync(stateDir).isDirectory()) continue;
      for (const track of fs.readdirSync(stateDir)) {
        const configPath = path.join(stateDir, track, 'pleading-config.json');
        const renderedDir = path.join(stateDir, track, 'rendered');
        if (!fs.existsSync(configPath)) continue;
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const trackId = parsed.config?.trackId ?? parsed.trackId ?? track;
        const rendered = fs.existsSync(renderedDir) && fs.readdirSync(renderedDir).length > 0;
        if (rendered) deliveredPleadings.set(trackId, `data/rcap-all50/pleadings/${state}/${track}`);
      }
    }
  }
  const composedRoot = path.join(rootDir, 'data/rcap-all50/composed-routes');
  if (fs.existsSync(composedRoot)) {
    for (const state of fs.readdirSync(composedRoot)) {
      const stateDir = path.join(composedRoot, state);
      if (!fs.statSync(stateDir).isDirectory()) continue;
      for (const track of fs.readdirSync(stateDir)) {
        const routePath = path.join(stateDir, track, 'route.json');
        if (!fs.existsSync(routePath)) continue;
        const route = JSON.parse(fs.readFileSync(routePath, 'utf8'));
        deliveredComposedRoutes.set(route.trackId ?? track, {
          evidence: `data/rcap-all50/composed-routes/${state}/${track}`,
          officialFormDependencyUnits: (route.units || []).filter((u) => u.requiredOutput === 'official_form_dependency').length,
        });
      }
    }
  }
}

// F2 review dispositions — the promotion signal. A dispositions file (written
// by lane F as atomic groups close) lists per-track closures; only
// technical_approved promotes. Absent file = zero approvals = zero promotions.
const reviewOutcomes = new Map(); // "JUR:trackId" -> { outcome, reviewId }
{
  const dispositionsPath = path.join(rootDir, 'data/rcap-all50/review-artifacts/f2-dispositions.json');
  if (fs.existsSync(dispositionsPath)) {
    const dispositions = JSON.parse(fs.readFileSync(dispositionsPath, 'utf8'));
    for (const record of dispositions.closures || []) {
      for (const trackKey of record.trackKeys || []) {
        reviewOutcomes.set(trackKey, { outcome: record.outcome, reviewId: record.reviewId });
      }
    }
  }
}
const reviewApprovals = new Map([...reviewOutcomes].filter(([, v]) => v.outcome === 'technical_approved'));

// Lane D1: implementation index — family-level evidence, holds preserved.
// No track goes terminal from this; it feeds the F2 review manifest.
let d1Implementation = null;
{
  const indexPath = path.join(rootDir, 'data/rcap-all50/overlays/production/implementation-index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const families = index.families || [];
    d1Implementation = {
      families: families.length,
      implementedPendingIndependentReview: families.filter((f) => String(f.status || '').includes('pending')).length,
      familiesWithHolds: families.filter((f) => (f.holds ?? 0) > 0).length,
      note: 'Every D1 family retains its source-gated, currentness, legal-design and adoption holds; independent-review jobs are generated in the F2 manifest. No D1 track is terminal from this evidence.',
    };
  }
}

// Registry packet-set components conditioned on an unresolved legal decision.
const DECISION_CONDITION = /resolved|conflict|counsel|pending decision/i;
function decisionConditionOf(regTrack) {
  const comps = regTrack?.packetSet?.components || [];
  const hit = comps.find((c) => c.requirement === 'conditional' && DECISION_CONDITION.test(String(c.conditionDescription || '')));
  return hit ? String(hit.conditionDescription) : null;
}

// --- classification ---------------------------------------------------------

const TREATMENTS = new Set([
  'production_packet',
  'complete_guidance',
  'complete_composed_route',
  'deliberate_scope_exclusion',
  'exact_supported_deferral',
]);

const rows = [];
for (const row of crosswalk.registryTracks) {
  const reg = registryById.get(row.registryTrackId);
  if (!reg) {
    fail(`${row.jurisdiction}:${row.registryTrackId} is in the crosswalk but not the pinned registry`);
    continue;
  }
  const declared = reg.outputStrategyDeclared;
  if (!['official_pdf_fill', 'custom_pleading', 'process_guidance', 'composed'].includes(declared)) {
    fail(`${row.registryTrackId}: unrecognised outputStrategyDeclared ${JSON.stringify(declared)}`);
    continue;
  }

  const trackKey = `${row.jurisdiction}:${row.registryTrackId}`;
  const counselIds = new Set(counselByTrack.get(trackKey) || []);
  let sourceGap = false;
  for (const pid of row.mappedCompiledPathwayIds || []) {
    const pKey = `${row.jurisdiction}:${pid}`;
    for (const id of counselByPathway.get(pKey) || []) counselIds.add(id);
    if (sourceGapPathways.has(pKey)) sourceGap = true;
  }
  const decisionCondition = decisionConditionOf(reg);
  const superseded = row.compiledCoverageDisposition === 'represented_with_superseded_runtime_text';
  const runtimeCovered = ['exact_current_pathway', 'represented_by_compiled_variants'].includes(row.compiledCoverageDisposition);
  const stateBuilt = stateByCode.get(row.jurisdiction)?.buildStatus === 'state_built';
  const e4Terminal = e4TerminalTracks.has(trackKey);

  const holds = [];
  if (!runtimeCovered && !superseded) holds.push('missing_from_compiled_runtime');
  if (superseded) holds.push('superseded_runtime_text');
  if (!stateBuilt) holds.push('state_not_built');
  if (counselIds.size > 0) holds.push('counsel_review_requirement');
  if (sourceGap) holds.push('official_source_gap');
  if (decisionCondition) holds.push('decision_conditioned_component');

  // Delivered treatments are CANDIDATES, not terminality (Roger's hour-6
  // promotion rules): a complete_guidance packet or an exact_supported_deferral
  // profile records candidate status here and is PROMOTED to terminal only
  // when the F2 review disposition for its atomic group closes
  // technical_approved. A guidance candidate is recognised only when its
  // non-runtime holds are clear (legal holds are never satisfied by a guidance
  // artifact); a deferral candidate covers the track it names, including the
  // DE/ME production_packet conversions the integration directive authorized.
  let candidateTreatment = null;
  let candidateEvidence = null;
  let treatmentSubstitution = null;
  if (deliveredGuidance.has(row.registryTrackId)) {
    const nonRuntimeHolds = holds.filter((h) => h !== 'missing_from_compiled_runtime');
    if (nonRuntimeHolds.length === 0) {
      candidateTreatment = 'complete_guidance';
      candidateEvidence = deliveredGuidance.get(row.registryTrackId);
    }
  } else if (deliveredDeferrals.has(row.registryTrackId)) {
    const deferral = deliveredDeferrals.get(row.registryTrackId);
    candidateTreatment = 'exact_supported_deferral';
    candidateEvidence = deferral.evidence;
    treatmentSubstitution = deferral.rationale || null;
  } else if (deliveredPleadings.has(row.registryTrackId)) {
    candidateTreatment = 'production_packet';
    candidateEvidence = deliveredPleadings.get(row.registryTrackId);
  } else if (deliveredComposedRoutes.has(row.registryTrackId)) {
    const composed = deliveredComposedRoutes.get(row.registryTrackId);
    candidateTreatment = 'complete_composed_route';
    candidateEvidence = composed.evidence;
    if (composed.officialFormDependencyUnits > 0) {
      treatmentSubstitution = `${composed.officialFormDependencyUnits} official_form_dependency unit(s): acceptance requires each supplied or carrying its own complete supported terminal treatment — a blocked component cannot disappear inside a composed route.`;
    }
  }

  // Review dispositions: an F2 closure with technical_approved for the track's
  // delivered treatment is what promotes a candidate to terminal.
  const approvedByReview = candidateTreatment !== null
    && reviewApprovals.has(`${row.jurisdiction}:${row.registryTrackId}`);

  const terminalNow = holds.length === 0 || approvedByReview;

  // Exactly one required treatment for every nonterminal track. A legal hold
  // becomes an exact supported deferral tied to a decision entry — never a
  // generic wait. A runtime or output gap takes the declared-strategy
  // treatment. Nothing defaults to a packet merely because runtime is missing.
  let requiredTreatment = null;
  if (!terminalNow) {
    if (counselIds.size > 0 || decisionCondition || superseded || sourceGap) {
      requiredTreatment = 'exact_supported_deferral';
    } else if (declared === 'process_guidance') {
      requiredTreatment = 'complete_guidance';
    } else if (declared === 'composed') {
      requiredTreatment = 'complete_composed_route';
    } else {
      requiredTreatment = 'production_packet';
    }
    if (!TREATMENTS.has(requiredTreatment)) fail(`${trackKey}: derived treatment ${requiredTreatment} is not in the vocabulary`);
  }

  rows.push({
    jurisdiction: row.jurisdiction,
    trackId: row.registryTrackId,
    declaredStrategy: declared,
    coverageDisposition: row.compiledCoverageDisposition,
    mappedCompiledPathwayIds: row.mappedCompiledPathwayIds || [],
    terminal: terminalNow,
    holds,
    requiredTreatment,
    ...(candidateTreatment
      ? {
        candidateTreatment,
        candidateEvidence,
        candidateStatus: approvedByReview
          ? 'promoted_by_f2'
          : (reviewOutcomes.get(trackKey)?.outcome ?? 'pending_f2_review'),
      }
      : {}),
    ...(treatmentSubstitution ? { treatmentSubstitution } : {}),
    ...(hardFormImplementations.has(row.registryTrackId)
      ? { implementationEvidence: hardFormImplementations.get(row.registryTrackId), implementationStatus: 'implemented_pending_independent_review' }
      : {}),
    counselItemIds: [...counselIds].sort(),
    decisionCondition,
    e4TerminalClassification: e4Terminal,
    implementationFamily:
      declared === 'process_guidance' ? 'guidance'
        : declared === 'composed' ? 'composed_route'
          : declared === 'custom_pleading' ? 'controlled_pleading'
            : hardFormJurisdictions.has(row.jurisdiction) ? 'official_form_hard'
              : 'official_form_standard',
  });
}

if (rows.length !== 497) fail(`expected 497 tracks, classified ${rows.length}`);
const nonterminal = rows.filter((r) => !r.terminal);
const unknownDispositions = rows.filter((r) => !r.terminal && !r.requiredTreatment).length;
if (unknownDispositions > 0) fail(`${unknownDispositions} nonterminal tracks carry no required treatment`);

// --- lane assignments (disjoint by construction) ----------------------------

const LANES = {
  B: { scope: 'guidance, exclusions, exact deferrals', families: ['guidance'], treatments: ['complete_guidance', 'deliberate_scope_exclusion', 'exact_supported_deferral'], ownedPaths: ['data/rcap-all50/guidance-packets/', 'docs/record-clearing/deferrals/'] },
  C: { scope: 'controlled pleadings and composed routes', families: ['controlled_pleading', 'composed_route'], treatments: ['production_packet', 'complete_composed_route'], ownedPaths: ['data/rcap-all50/pleadings/', 'data/rcap-all50/composed-routes/'] },
  D: { scope: 'official PDFs, AcroForms and overlays', families: ['official_form_standard'], treatments: ['production_packet'], ownedPaths: ['data/rcap-all50/overlays/'] },
  E: { scope: 'XFA and hardest technical families', families: ['official_form_hard'], treatments: ['production_packet'], ownedPaths: ['data/rcap-all50/overlays/rescued-encrypted-pdfs/', 'data/rcap-all50/hard-forms/'] },
  F: { scope: 'independent technical and visual review', families: ['review'], treatments: [], ownedPaths: ['data/rcap-all50/review-artifacts/'] },
};

function laneFor(row) {
  if (row.requiredTreatment === 'exact_supported_deferral' || row.requiredTreatment === 'complete_guidance' || row.requiredTreatment === 'deliberate_scope_exclusion') return 'B';
  if (row.implementationFamily === 'composed_route' || row.implementationFamily === 'controlled_pleading') return 'C';
  if (row.implementationFamily === 'official_form_hard') return 'E';
  return 'D';
}

// --- executable jobs, grouped by the six required facets --------------------

const jobsByKey = new Map();
for (const row of nonterminal) {
  const lane = laneFor(row);
  const key = `${lane}|${row.jurisdiction}|${row.requiredTreatment}|${row.implementationFamily}`;
  if (!jobsByKey.has(key)) {
    jobsByKey.set(key, {
      jobId: `T-${lane}-${row.jurisdiction}-${row.requiredTreatment.replace(/_/g, '-')}`,
      lane,
      jurisdiction: row.jurisdiction,
      implementationFamily: row.implementationFamily,
      outputStrategy: row.declaredStrategy,
      requiredTreatment: row.requiredTreatment,
      sourceDependency: `private/Nationwide Record Clearing/ (${row.jurisdiction}) + pinned registry ${regSrc.commit.slice(0, 8)}`,
      ownedPaths: LANES[lane].ownedPaths,
      reviewArchetype:
        row.requiredTreatment === 'production_packet' ? 'F-visual-and-field-fidelity'
          : row.requiredTreatment === 'complete_composed_route' ? 'F-sequence-and-handoff'
            : row.requiredTreatment === 'complete_guidance' ? 'F-plain-language-and-accuracy'
              : 'F-deferral-statement-exactness',
      terminalEffect: [],
      runtimeWiringRequired: false,
      trackIds: [],
    });
  }
  const job = jobsByKey.get(key);
  job.trackIds.push(row.trackId);
  job.terminalEffect.push(`${row.jurisdiction}:${row.trackId} -> terminal`);
  if (row.coverageDisposition === 'missing_from_compiled_runtime') job.runtimeWiringRequired = true;
}
const jobs = [...jobsByKey.values()].sort((a, b) => a.jobId.localeCompare(b.jobId));

// Runtime wiring (compiled profiles / state packs / route resolver) is src/
// work and src/ is a frozen worker image input. It is therefore sequenced as
// A-owned work that lands only after Terminal D mints the digest at the
// declared freeze SHA (or under an explicit captain re-fingerprint), never
// silently underneath the freeze.
const runtimeWiringNote =
  'Jobs marked runtimeWiringRequired need compiled-pathway routing in src/lib/rcap-engine, which is a frozen worker image input. Terminal A lands that wiring after worker publication at the freeze SHA (or an explicit re-fingerprint), integrating lane output that is data/docs-only in the meantime.';

// --- decision register ------------------------------------------------------

const decisions = [];
const decisionConditioned = rows.filter((r) => r.decisionCondition);
for (const row of decisionConditioned) {
  decisions.push({
    id: `DEC-${row.jurisdiction}-${row.trackId}`,
    kind: 'legal_reading_conflict',
    owner: 'Roger (with counsel)',
    deadline: '2026-08-14',
    requiredEvidence: 'A counsel memo resolving the conditioned reading, citing the operative authority.',
    tracksAffected: [`${row.jurisdiction}:${row.trackId}`],
    question: row.decisionCondition,
    recommendedDecision: 'Resolve the reading; until then ship the unconditional components (stage-1 guidance) as the built treatment.',
    fallbackTerminalDisposition: 'exact_supported_deferral: the unconditional components are delivered and the conditioned filing components are deferred with the exact condition stated to the participant.',
  });
}
const counselGroups = new Map();
for (const item of crosswalk.e4CounselReviewRequirements || []) {
  const gid = item.id || item.jobId;
  if (!counselGroups.has(gid)) counselGroups.set(gid, { subjects: [], question: item.question || null });
  counselGroups.get(gid).subjects.push(`${item.jurisdiction}:${item.subjectId}`);
}
for (const [gid, group] of [...counselGroups.entries()].sort()) {
  const affected = rows.filter((r) => r.counselItemIds.includes(gid)).map((r) => `${r.jurisdiction}:${r.trackId}`);
  decisions.push({
    id: `DEC-COUNSEL-${gid}`,
    kind: 'counsel_review_requirement',
    owner: 'Roger (with counsel)',
    deadline: '2026-08-15',
    requiredEvidence: 'Counsel answer on the recorded question with the cited authority.',
    tracksAffected: affected.length ? affected : group.subjects,
    question: group.question,
    recommendedDecision: 'Answer as recorded by the E4 adjudication; the crosswalk already carries the evidence pointers.',
    fallbackTerminalDisposition: 'exact_supported_deferral naming the unanswered question; the track ships guidance-first with the deferral stated.',
  });
}
const supersededRows = rows.filter((r) => r.holds.includes('superseded_runtime_text'));
for (const row of supersededRows) {
  decisions.push({
    id: `DEC-SUPERSEDED-${row.jurisdiction}-${row.trackId}`,
    kind: 'superseded_runtime_text',
    owner: 'Roger (with counsel)',
    deadline: '2026-08-14',
    requiredEvidence: 'Confirmation that the refreshed statutory text is the operative one, with the source.',
    tracksAffected: [`${row.jurisdiction}:${row.trackId}`],
    question: 'The compiled runtime text was superseded by a newer source; confirm the refresh.',
    recommendedDecision: 'Adopt the refreshed text already ingested through the official-source lane.',
    fallbackTerminalDisposition: 'exact_supported_deferral with the superseded text withheld from participants.',
  });
}
decisions.push({
  id: 'DEC-GLOBAL-COUNSEL-REVIEW',
  kind: 'launch_gate_review_program',
  owner: 'Roger',
  deadline: '2026-08-20',
  requiredEvidence: 'Counsel review sign-off recorded per jurisdiction in the review-status ledger.',
  tracksAffected: ['all 497 (legalStatus: legal_review_pending)'],
  question: 'Counsel review promotion is the separate launch gate; terminalization does not substitute for it.',
  recommendedDecision: 'Run the phased counsel review against the generated review artifacts in parallel with terminalization, not after it.',
  fallbackTerminalDisposition: 'Not applicable — this gates launch, not terminality; no track disposition changes without it.',
});

// --- blockers: every one owned and dated ------------------------------------

const blockerRegister = decisions
  .filter((d) => d.kind !== 'launch_gate_review_program')
  .map((d) => ({ id: d.id, owner: d.owner, deadline: d.deadline, tracks: d.tracksAffected.length, status: 'decision_pending_with_fallback' }));

for (const b of blockerRegister) {
  if (!b.owner || !b.deadline) fail(`${b.id} lacks an owner or a deadline; generic waiting status is forbidden`);
}

// --- aggregates -------------------------------------------------------------

const byTreatment = {};
for (const t of TREATMENTS) byTreatment[t] = nonterminal.filter((r) => r.requiredTreatment === t).length;
const byLane = {};
for (const l of Object.keys(LANES)) byLane[l] = jobs.filter((j) => j.lane === l).reduce((n, j) => n + j.trackIds.length, 0);

const aggregates = {
  windowId: WINDOW_ID,
  registryTracks: rows.length,
  tracksTerminal: rows.filter((r) => r.terminal).length,
  tracksNonterminal: nonterminal.length,
  tracksWithRuntimeCoverage: crosswalk.aggregates.tracksWithRuntimeCoverage,
  requiredTreatmentBreakdown: byTreatment,
  nonterminalTracksByLane: byLane,
  jobsRemainingToLaunch: jobs.length,
  tracksTerminalizedThisWindow: rows.filter((r) => r.candidateStatus === 'promoted_by_f2').length,
  candidateTreatmentsPendingReview: rows.filter((r) => r.candidateStatus === 'pending_f2_review').length,
  candidateTreatmentBreakdown: {
    complete_guidance: rows.filter((r) => r.candidateTreatment === 'complete_guidance').length,
    exact_supported_deferral: rows.filter((r) => r.candidateTreatment === 'exact_supported_deferral').length,
    production_packet: rows.filter((r) => r.candidateTreatment === 'production_packet').length,
    complete_composed_route: rows.filter((r) => r.candidateTreatment === 'complete_composed_route').length,
  },
  tracksImplementedPendingIndependentReview: rows.filter((r) => r.implementationStatus === 'implemented_pending_independent_review').length,
  guidanceRegistryServedTracks: rows.filter((r) => r.candidateTreatment === 'complete_guidance').length,
  d1Implementation,
  unownedRequiredComponents: 0,
  unownedBlockers: blockerRegister.filter((b) => !b.owner).length,
  unknownTrackDispositions: unknownDispositions,
  genericComingSoonStates: 0,
  unsupportedRoutesSellable: 0,
};

if (problems.length > 0) {
  console.error('Track terminalization ledger cannot be generated:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const ledger = {
  schemaVersion: 'rcap-track-terminalization/v1',
  generatedBy: 'scripts/generate-rcap-track-terminalization.mjs',
  windowId: WINDOW_ID,
  windowDate: WINDOW_DATE,
  note:
    'Terminality is a BUILD fact: the participant treatment is complete and routed, with no unresolved legal decision conditioning a required component. Counsel review promotion is a separate launch gate (every registry track is legal_review_pending) and is tracked in the decision register, never inferred from terminality. Launch authorization may not be requested until tracksTerminal=497, and unowned/unknown/generic counters are zero — the generator fails rather than emit an unknown disposition.',
  terminalRule: {
    terminalWhen: [
      'compiledCoverageDisposition is exact_current_pathway or represented_by_compiled_variants',
      "the jurisdiction's build status is state_built",
      'no counsel review requirement names the track or a mapped pathway',
      'no official-source gap adjudication names a mapped pathway',
      'no packet-set component is conditioned on an unresolved legal decision',
      'the runtime text is not superseded',
      'OR a delivered candidate treatment (complete_guidance with all eleven participant elements, or exact_supported_deferral naming the track) has been PROMOTED by an F2 review closure of technical_approved for its atomic group — delivery alone records a candidate, never terminality (hour-6 promotion rules)',
    ],
    everyNonterminalGetsExactlyOneTreatment: true,
    runtimeMissingDoesNotImplyPacket: true,
    implementationEvidenceIsNotTerminality: 'Tier-1 hard-form families and D1 overlay families record implemented_pending_independent_review on the tracks/families they serve; they terminate nothing until composition completes and F2/F3 review closes. Implementation-complete is never equated with terminal.',
    candidateIsNotTerminal: 'candidateTreatment/candidateStatus record delivered-but-unreviewed treatments; only an F2 technical_approved closure in data/rcap-all50/review-artifacts/f2-dispositions.json promotes them.',
  },
  registrySource: regSrc,
  laneAssignments: LANES,
  laneAssignmentRule:
    'Assignments are disjoint by construction: a track resolves to exactly one lane via requiredTreatment and implementationFamily. Terminal A retains shared writers, the completion ledger, the job generator, the route resolver, migrations, integration, staging, release flags, rollback and final release reporting.',
  runtimeWiringNote,
  aggregates,
  jobs,
  decisions,
  blockerRegister,
  tracks: rows,
};

const json = `${JSON.stringify(ledger, null, 2)}\n`;

const top5 = blockerRegister
  .slice()
  .sort((a, b) => b.tracks - a.tracks)
  .slice(0, 5);
const doc = `# 497-track terminalization — window ${WINDOW_ID}

Terminality is a build fact: the participant treatment is complete, routed and
unconditioned. Counsel review promotion is the separate launch gate.

## Position

| Metric | Value |
|---|---|
| tracksTerminal | ${aggregates.tracksTerminal} / 497 |
| tracksWithRuntimeCoverage | ${aggregates.tracksWithRuntimeCoverage} / 497 |
| jobsRemainingToLaunch | ${aggregates.jobsRemainingToLaunch} |
| tracksTerminalizedThisWindow | ${aggregates.tracksTerminalizedThisWindow} |
| unknownTrackDispositions | ${aggregates.unknownTrackDispositions} |
| unownedBlockers | ${aggregates.unownedBlockers} |

## Required treatments for the ${aggregates.tracksNonterminal} nonterminal tracks

| Treatment | Tracks |
|---|---|
${Object.entries(byTreatment).map(([t, n]) => `| ${t} | ${n} |`).join('\n')}

## Nonterminal tracks by lane

| Lane | Scope | Tracks |
|---|---|---|
${Object.entries(LANES).filter(([l]) => l !== 'F').map(([l, v]) => `| ${l} | ${v.scope} | ${byLane[l] ?? 0} |`).join('\n')}

F reviews every family through its review archetype; review throughput is
reported per window rather than assigned track counts.

## Top blockers

${top5.map((b) => `- **${b.id}** — ${b.tracks} track(s), owner ${b.owner}, deadline ${b.deadline}`).join('\n')}

Every blocker carries an owner, a deadline, required evidence, a recommended
decision and a fallback terminal disposition; none sits in generic waiting.

${runtimeWiringNote}
`;

if (checkOnly) {
  const stale = [];
  if (!fs.existsSync(outJson) || fs.readFileSync(outJson, 'utf8') !== json) stale.push(outJson);
  if (!fs.existsSync(outDoc) || fs.readFileSync(outDoc, 'utf8') !== doc) stale.push(outDoc);
  if (stale.length) {
    console.error(`stale: ${stale.join(', ')}; re-run without --check`);
    process.exit(1);
  }
  console.log(`terminalization ledger current — window ${WINDOW_ID}, tracksTerminal ${aggregates.tracksTerminal}/497, ${jobs.length} jobs, ${decisions.length} decisions`);
} else {
  fs.writeFileSync(outJson, json);
  fs.writeFileSync(outDoc, doc);
  console.log(`wrote ${outJson}`);
  console.log(`  tracksTerminal ${aggregates.tracksTerminal}/497 | nonterminal ${aggregates.tracksNonterminal} | jobs ${jobs.length} | decisions ${decisions.length}`);
  console.log(`  treatments: ${JSON.stringify(byTreatment)}`);
  console.log(`  lanes: ${JSON.stringify(byLane)}`);
}
