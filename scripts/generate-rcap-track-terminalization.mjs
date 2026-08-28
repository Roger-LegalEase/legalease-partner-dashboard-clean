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
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';

// The authoritative route resolver is consulted directly rather than
// reimplemented. A deferral records that payment is prohibited and checkout
// suppressed; whether that is TRUE is a question only the runtime can answer,
// and asking a copy of its rules here would be a second system that drifts.
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { resolvePacketRoute, packetRouteCanRender } = await import('../src/lib/rcap/documents/packet-route-resolver.ts');
// Terminal treatments are validated in exactly one place — the guidance-packet
// registry — and read here rather than re-validated, so the ledger and the
// runtime can never disagree about whether a treatment loaded.
const { terminalTreatmentForTrack } = await import('../src/lib/rcap/documents/guidance-packet-registry.ts');

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outJson = path.join(rootDir, 'data/rcap-ledger/track-terminalization.json');
const outDoc = path.join(rootDir, 'docs/record-clearing/track-terminalization.md');
const checkOnly = process.argv.includes('--check');

// The integration window this ledger was generated in. Advanced by the captain
// once per window; deliberately not a wall-clock read so --check is exact.
const WINDOW_ID = '2026-08-12-w3';
const WINDOW_DATE = '2026-08-12';

const problems = [];
/**
 * Deferral candidates refused because a compiled pathway they are reachable
 * through is still sellable or credit-consumable at runtime. Recorded in the
 * ledger rather than dropped silently: the packet and the runtime disagree, and
 * whoever owns that route needs to see it.
 */
const runtimeContradictedDeferrals = [];
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

// The 2026-08-24 legal authority replaces the pinned registry's unresolved
// Mississippi routing note with an exact two-stage contract: active admission
// is referral-only, while the completed and closed matter is the participant
// packet route. The crosswalk cannot infer that one registry track intentionally
// expands into both compiled pathways because its registry projection predates
// the approved split. Promote only while every contract, compiled pathway and
// shared runtime behavior below remains exact.
const authorityStageSplitSpecs = [
  {
    trackKey: 'MS:ms-nonadj',
    decisionId: 'LD-MS-01',
    activeRouteKey: 'MS:nonadjudication-99-15-26-active-case-admission',
    completedRouteKey: 'MS:nonadjudication-under-99-15-26',
  },
];
const mississippiAuthority = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'src/lib/legal-authority/routes/mississippi.json'), 'utf8')
);
const authorityContractByKey = new Map(
  (mississippiAuthority.routes || []).map((route) => [route.routeKey, route])
);
const compiledPathwayKeys = new Set(
  (crosswalk.compiledPathways || []).map((pathway) => `${pathway.jurisdiction}:${pathway.compiledPathwayId}`)
);
const authorityStageSplitPromotions = new Map();
for (const spec of authorityStageSplitSpecs) {
  const [jurisdiction] = spec.trackKey.split(':');
  const active = authorityContractByKey.get(spec.activeRouteKey);
  const completed = authorityContractByKey.get(spec.completedRouteKey);
  const exact = Boolean(
    active
    && completed
    && active.decisionId === spec.decisionId
    && completed.decisionId === spec.decisionId
    && active.stage === 'active_case_admission'
    && active.outcomeMode === 'referral'
    && active.packetFamily === null
    && completed.stage === 'post_completion'
    && completed.outcomeMode === 'participant_packet'
    && typeof completed.packetFamily === 'string'
    && completed.packetFamily.trim().length > 0
  );
  if (!exact) {
    fail(`${spec.trackKey}: approved authority stage-split contracts drifted`);
    continue;
  }
  const pathwayIds = [active.pathwayId, completed.pathwayId];
  const missingPathways = pathwayIds.filter((pathwayId) => !compiledPathwayKeys.has(`${jurisdiction}:${pathwayId}`));
  if (missingPathways.length > 0) {
    fail(`${spec.trackKey}: approved stage-split pathway(s) missing from compiled runtime: ${missingPathways.join(', ')}`);
    continue;
  }
  const activeRuntime = resolvePacketRoute({ state: jurisdiction, pathway: active.pathwayId });
  const completedRuntime = resolvePacketRoute({ state: jurisdiction, pathway: completed.pathwayId });
  /**
   * The stage split is proven at the contract layer, and the runtime is checked
   * for the one thing it can still say.
   *
   * This used to read "the active admission is closed AND the completed stage is
   * sellable and credit-consumable", which is how a split shows up in a runtime
   * that can express one. Since ADR-0004 Mississippi's runtime cannot: the whole
   * jurisdiction resolves legacy_retired and sells nothing, so both stages look
   * identical through sellability and neither is commercially available.
   *
   * Reopening the completed stage to keep this check satisfiable would be
   * restoring a retired generator's commercial authority to make a generator
   * pass, which is exactly what the owner decision forbids. So the split is
   * proven above, on the contracts' stage, outcomeMode and packetFamily — where
   * it is actually recorded — and the runtime is held to the post-retirement
   * truth: neither stage carries commercial authority.
   */
  if (activeRuntime.sellable || activeRuntime.creditConsumable) {
    fail(`${spec.trackKey}: active admission is still sellable or credit-consumable`);
    continue;
  }
  if (completedRuntime.sellable || completedRuntime.creditConsumable) {
    fail(`${spec.trackKey}: completed packet stage regained commercial authority a retired generator cannot grant`);
    continue;
  }
  if (!packetRouteCanRender(completedRuntime)) {
    fail(`${spec.trackKey}: completed packet stage lost its renderer, so the stage split is no longer observable at all`);
    continue;
  }
  authorityStageSplitPromotions.set(spec.trackKey, {
    decisionId: spec.decisionId,
    routeKeys: [spec.activeRouteKey, spec.completedRouteKey],
    pathwayIds,
    activeRuntimeKind: activeRuntime.routeKind,
    completedRuntimeKind: completedRuntime.routeKind,
  });
}

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

// Lane B: exact_supported_deferral — the SAME treatment as lane E's, authored
// as a guidance packet instead of a hard-form profile.
//
// This loader exists because the ledger was recognising the treatment only by
// where it was stored. Eight lane-B deferrals carried complete participant
// treatments and unsuperseded independent approvals and still could not be
// seen, because deliveredDeferrals below reads hard-form profiles and
// deliveredGuidance above filters on treatment === 'complete_guidance'. A
// packet whose treatment is exact_supported_deferral fell between the two.
//
// The standard applied here is the terminal-deferral standard, not a softer
// one. A packet qualifies as a CANDIDATE only when it carries every
// participant element, names an exact destination, prohibits payment and sale,
// and cites its supporting authority. Promotion still requires the F2
// technical_approved closure that promotes every other candidate — this loader
// grants recognition, never terminality.
const LANE_B_DEFERRAL_ELEMENTS = [
  // supported reason, exact destination, exact next step, gathering guidance,
  // what the participant does and does not file, what is preserved in the
  // Briefcase, and the surrounding participant treatment.
  'stopReason', 'destination', 'nextStep', 'gather', 'participantFiles',
  'briefcaseSaved', 'mechanism', 'controllingActor', 'afterNextStep', 'handoff',
  'timing', 'nextSteps', 'routeLabel',
];
const BILINGUAL_TEXT_ELEMENTS = [
  'routeLabel', 'mechanism', 'stopReason', 'nextStep', 'destination', 'handoff',
  'afterNextStep', 'timing', 'controllingActor', 'participantFiles',
];
const BILINGUAL_LIST_ELEMENTS = ['gather', 'briefcaseSaved', 'nextSteps'];

/** Substantive in both languages: present, non-empty, and not the English copied across. */
function bilingualTextIsSubstantive(node) {
  if (!node || typeof node !== 'object') return false;
  const { en, es } = node;
  if (typeof en !== 'string' || typeof es !== 'string') return false;
  if (en.trim().length === 0 || es.trim().length === 0) return false;
  return en.trim() !== es.trim();
}

function bilingualListIsSubstantive(node) {
  if (!node || typeof node !== 'object') return false;
  const { en, es } = node;
  if (!Array.isArray(en) || !Array.isArray(es)) return false;
  if (en.length === 0 || en.length !== es.length) return false;
  return en.every((line) => typeof line === 'string' && line.trim().length > 0)
    && es.every((line) => typeof line === 'string' && line.trim().length > 0);
}

const laneBDeferrals = new Map(); // trackId -> { evidence, rationale }
{
  const dir = path.join(rootDir, 'data/rcap-all50/guidance-packets');
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith('.json') || file.startsWith('_')) continue;
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      for (const packet of parsed.packets || []) {
        if (packet.treatment !== 'exact_supported_deferral') continue;

        const complete = LANE_B_DEFERRAL_ELEMENTS.every((element) => packet[element] !== undefined)
          && BILINGUAL_TEXT_ELEMENTS.every((element) => bilingualTextIsSubstantive(packet[element]))
          && BILINGUAL_LIST_ELEMENTS.every((element) => bilingualListIsSubstantive(packet[element]))
          && typeof packet.destination?.name === 'string' && packet.destination.name.trim().length > 0
          && Array.isArray(packet.authority) && packet.authority.length > 0
          // Payment prohibited, sale prohibited. A deferral that could be sold
          // is not a deferral, and a packet that says otherwise is not
          // recognised — it is skipped, never quietly corrected.
          && packet.paymentAllowed === false
          && packet.sellable === false;
        if (!complete) continue;

        // A track may be served by exactly one deferral source. Two sources
        // claiming the same track is a contradiction between owners, and the
        // last writer does not get to win it.
        if (laneBDeferrals.has(packet.trackId)) {
          throw new Error(
            `Duplicate lane-B exact_supported_deferral for track ${packet.trackId}; refusing to resolve two deferral records by last-writer-wins.`
          );
        }
        laneBDeferrals.set(packet.trackId, {
          evidence: `data/rcap-all50/guidance-packets/${file}`,
          rationale: '',
        });
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
  // Merge the lane-B deferrals into the same map, so both sources are subject
  // to one discovery, one candidate rule and one promotion signal. A track
  // claimed by both a hard-form profile and a lane-B packet is a contradiction
  // between two owners; it is raised, not silently resolved.
  for (const [trackId, record] of laneBDeferrals) {
    if (deliveredDeferrals.has(trackId)) {
      throw new Error(
        `Track ${trackId} is claimed as an exact_supported_deferral by both a hard-form profile and a lane-B guidance packet; refusing to resolve two deferral sources by last-writer-wins.`
      );
    }
    deliveredDeferrals.set(trackId, record);
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

// Emergency terminalization window review dispositions. Same promotion rule as
// F2 and a separate file, because these reviewers answer a different question:
// not "is this packet right" but "is this complete treatment the right terminal
// product for this track". Absent file = zero approvals = zero promotions.
const terminalizationOutcomes = new Map(); // "JUR:trackId" -> { outcome, reviewId }
{
  const dispositionsPath = path.join(rootDir, 'data/rcap-all50/review-artifacts/terminalization-review-dispositions.json');
  if (fs.existsSync(dispositionsPath)) {
    const dispositions = JSON.parse(fs.readFileSync(dispositionsPath, 'utf8'));
    for (const record of dispositions.closures || []) {
      for (const trackKey of record.trackKeys || []) {
        terminalizationOutcomes.set(trackKey, { outcome: record.outcome, reviewId: record.reviewId });
      }
    }
  }
}
const terminalizationApprovals = new Set(
  [...terminalizationOutcomes].filter(([, v]) => v.outcome === 'technical_approved_as_terminal_treatment').map(([k]) => k)
);

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
  const authorityStageSplitPromotion = authorityStageSplitPromotions.get(trackKey);
  const mappedCompiledPathwayIds = authorityStageSplitPromotion?.pathwayIds
    ?? row.mappedCompiledPathwayIds
    ?? [];
  const counselIds = new Set(counselByTrack.get(trackKey) || []);
  let sourceGap = false;
  for (const pid of mappedCompiledPathwayIds) {
    const pKey = `${row.jurisdiction}:${pid}`;
    for (const id of counselByPathway.get(pKey) || []) counselIds.add(id);
    if (sourceGapPathways.has(pKey)) sourceGap = true;
  }
  const decisionCondition = decisionConditionOf(reg);
  const superseded = row.compiledCoverageDisposition === 'represented_with_superseded_runtime_text';
  const runtimeCovered = Boolean(authorityStageSplitPromotion)
    || ['exact_current_pathway', 'represented_by_compiled_variants'].includes(row.compiledCoverageDisposition);
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
  let runtimeSuppressionContradicted = false;
  const terminalTreatment = terminalTreatmentForTrack(row.registryTrackId);
  if (terminalTreatment) {
    // This window's authority for the track. The treatment's whole claim is
    // that nothing is prepared, promised or sold here, so that claim is put to
    // the authoritative resolver — by exact track id, and through every
    // compiled pathway the track is reachable by — before it may be promoted.
    const probes = [null, ...(row.mappedCompiledPathwayIds || [])];
    const sellableThrough = probes.filter((pathwayId) => {
      const route = resolvePacketRoute({ state: row.jurisdiction, pathway: pathwayId ?? '', trackId: row.registryTrackId });
      return route.sellable === true || route.creditConsumable === true;
    });
    if (sellableThrough.length > 0) {
      runtimeSuppressionContradicted = true;
      runtimeContradictedDeferrals.push({
        trackKey,
        evidence: `data/rcap-all50/terminalization-treatments/${row.jurisdiction.toLowerCase()}.json`,
        sellablePathwayIds: sellableThrough.filter(Boolean),
        why: 'the terminal treatment tells the participant nothing is prepared, promised or sold on this route, while the authoritative route resolver still reports it as sellable or credit-consumable',
        owner: 'Terminal A route owner, with the jurisdiction\'s legacy-route owner',
      });
    }
    // A treatment that failed the registry's fail-closed contract still
    // suppresses the route, but it is a broken treatment: it stays a candidate
    // needing correction and can never be promoted by a review closure.
    if (terminalTreatment.classification !== 'terminal_treatment_candidate') {
      runtimeSuppressionContradicted = true;
      treatmentSubstitution = `the terminal treatment did not validate (${terminalTreatment.invalidReason ?? 'unspecified'}); the route fails closed and the treatment must be corrected before it can be reviewed`;
    }
    candidateTreatment = terminalTreatment.treatment;
    candidateEvidence = `data/rcap-all50/terminalization-treatments/${row.jurisdiction.toLowerCase()}.json`;
  } else if (deliveredGuidance.has(row.registryTrackId)) {
    const nonRuntimeHolds = holds.filter((h) => h !== 'missing_from_compiled_runtime');
    if (nonRuntimeHolds.length === 0) {
      candidateTreatment = 'complete_guidance';
      candidateEvidence = deliveredGuidance.get(row.registryTrackId);
    }
  } else if (deliveredDeferrals.has(row.registryTrackId)) {
    const deferral = deliveredDeferrals.get(row.registryTrackId);
    // A deferral's whole claim to the participant is that nothing is being
    // prepared and nothing is being sold. That claim has to be TRUE of the
    // runtime, not just written in the packet. Every compiled pathway the
    // track is reachable through is asked the authoritative resolver whether
    // it is sellable or credit-consumable; one that is disqualifies the
    // candidate, because promoting it would publish a promise the application
    // does not keep.
    const sellableThrough = (row.mappedCompiledPathwayIds || []).filter((pathwayId) => {
      const route = resolvePacketRoute({ state: row.jurisdiction, pathway: pathwayId });
      return route.sellable === true || route.creditConsumable === true;
    });
    if (sellableThrough.length > 0) {
      // The treatment is still DELIVERED — it stays a visible candidate with
      // its review status intact. What it cannot be is terminal, and the veto
      // below is deliberately stronger than a hold, because a hold is
      // satisfiable by review approval and this contradiction is not: a
      // reviewer approving the packet does not make the route stop selling.
      runtimeSuppressionContradicted = true;
      runtimeContradictedDeferrals.push({
        trackKey,
        evidence: deferral.evidence,
        sellablePathwayIds: sellableThrough,
        why: 'the packet tells the participant nothing is being sold on this route, while the authoritative route resolver still reports the compiled pathway as sellable or credit-consumable',
        owner: 'Terminal A route owner, with the jurisdiction\'s legacy-route owner',
      });
    }
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
    && (reviewApprovals.has(trackKey) || terminalizationApprovals.has(trackKey));

  // Review approval promotes a candidate — unless the runtime contradicts the
  // treatment's own promise. No reviewer can approve away a route that is
  // still selling.
  const terminalNow = (holds.length === 0 || approvedByReview) && !runtimeSuppressionContradicted;

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
    coverageDisposition: authorityStageSplitPromotion
      ? 'represented_by_approved_stage_split'
      : row.compiledCoverageDisposition,
    mappedCompiledPathwayIds,
    terminal: terminalNow,
    holds,
    requiredTreatment,
    ...(candidateTreatment
      ? {
        candidateTreatment,
        candidateEvidence,
        candidateStatus: approvedByReview
          ? (terminalizationApprovals.has(trackKey) ? 'promoted_by_terminalization_review' : 'promoted_by_f2')
          : (terminalizationOutcomes.get(trackKey)?.outcome
            ?? reviewOutcomes.get(trackKey)?.outcome
            ?? (terminalTreatment ? 'pending_terminalization_review' : 'pending_f2_review')),
      }
      : {}),
    ...(authorityStageSplitPromotion
      ? {
        promotionStatus: 'promoted_by_legal_authority',
        promotionEvidence: authorityStageSplitPromotion,
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

// The two launch-gate counters, computed from the runtime rather than declared.
const NON_PACKET_TREATMENTS = new Set(['complete_guidance', 'exact_supported_deferral', 'deliberate_scope_exclusion', 'complete_composed_route']);
const unsupportedSellableRoutes = [];
for (const row of rows) {
  const treatmentKind = row.candidateTreatment ?? row.requiredTreatment;
  if (!treatmentKind || !NON_PACKET_TREATMENTS.has(treatmentKind)) continue;
  const probes = [null, ...(row.mappedCompiledPathwayIds || [])];
  const sellable = probes.filter((pathwayId) => {
    const route = resolvePacketRoute({ state: row.jurisdiction, pathway: pathwayId ?? '', trackId: row.trackId });
    return route.sellable === true || route.creditConsumable === true;
  });
  if (sellable.length > 0) {
    unsupportedSellableRoutes.push({ trackKey: `${row.jurisdiction}:${row.trackId}`, treatmentKind, sellableThrough: sellable.filter(Boolean) });
  }
}
const genericComingSoonStates = [...new Set(
  rows
    .filter((row) => {
      const treatment = terminalTreatmentForTrack(row.trackId);
      return treatment
        && treatment.classification !== 'terminal_treatment_candidate'
        && /prohibited language/.test(treatment.invalidReason ?? '');
    })
    .map((row) => row.jurisdiction)
)].sort();

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
    deliberate_scope_exclusion: rows.filter((r) => r.candidateTreatment === 'deliberate_scope_exclusion').length,
    production_packet: rows.filter((r) => r.candidateTreatment === 'production_packet').length,
    complete_composed_route: rows.filter((r) => r.candidateTreatment === 'complete_composed_route').length,
  },
  deferralCandidatesRefusedOnRuntimeContradiction: runtimeContradictedDeferrals.length,
  tracksImplementedPendingIndependentReview: rows.filter((r) => r.implementationStatus === 'implemented_pending_independent_review').length,
  guidanceRegistryServedTracks: rows.filter((r) => r.candidateTreatment === 'complete_guidance').length,
  d1Implementation,
  unownedRequiredComponents: 0,
  unownedBlockers: blockerRegister.filter((b) => !b.owner).length,
  unknownTrackDispositions: unknownDispositions,
  // Counted, not asserted. A state lands here when a treatment it serves was
  // refused for promising a packet later or for other prohibited copy — the
  // exact failure the launch gate is meant to catch.
  genericComingSoonStates: genericComingSoonStates.length,
  // A route is unsupported-sellable when the participant is told nothing is
  // prepared or sold for it while the authoritative resolver still reports it
  // sellable or credit-consumable. This must be zero at launch.
  unsupportedRoutesSellable: unsupportedSellableRoutes.length,
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
      'OR the track carries a terminalization-window treatment that loaded valid against the guidance-packet registry fail-closed contract, is proven non-sellable and non-credit-consumable by the authoritative route resolver, and has been PROMOTED by a terminalization review closure of technical_approved_as_terminal_treatment (Roger emergency terminalization authorization)',
    ],
    everyNonterminalGetsExactlyOneTreatment: true,
    runtimeMissingDoesNotImplyPacket: true,
    implementationEvidenceIsNotTerminality: 'Tier-1 hard-form families and D1 overlay families record implemented_pending_independent_review on the tracks/families they serve; they terminate nothing until composition completes and F2/F3 review closes. Implementation-complete is never equated with terminal.',
    candidateIsNotTerminal: 'candidateTreatment/candidateStatus record delivered-but-unreviewed treatments; only an F2 technical_approved closure in data/rcap-all50/review-artifacts/f2-dispositions.json, or a technical_approved_as_terminal_treatment closure in data/rcap-all50/review-artifacts/terminalization-review-dispositions.json, promotes them.',
    strongestAvailableTreatment: 'Roger authorized every nonterminal track to receive the strongest complete, safe, repository-supported terminal treatment available now. A production packet is preferred only when it is already safe, current, independently approved, adopted, participant-ready, runtime-bound and non-conflicting; it is never required merely to improve the launch count. A treatment that fails the registry contract still suppresses its route and is never promoted.',
  },
  registrySource: regSrc,
  laneAssignments: LANES,
  laneAssignmentRule:
    'Assignments are disjoint by construction: a track resolves to exactly one lane via requiredTreatment and implementationFamily. Terminal A retains shared writers, the completion ledger, the job generator, the route resolver, migrations, integration, staging, release flags, rollback and final release reporting.',
  runtimeWiringNote,
  aggregates,
  // Deferrals whose packet says nothing is sold while a compiled pathway they
  // are reachable through is still sellable. Not terminal, and not hidden.
  runtimeContradictedDeferrals: runtimeContradictedDeferrals
    .slice()
    .sort((a, b) => a.trackKey.localeCompare(b.trackKey)),
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
