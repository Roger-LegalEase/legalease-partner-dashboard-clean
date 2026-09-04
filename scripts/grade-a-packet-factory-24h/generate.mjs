#!/usr/bin/env node
/**
 * The 24-hour national packet factory: every remaining family, dispatched.
 *
 *   node scripts/grade-a-packet-factory-24h/generate.mjs [--check]
 *
 * The denominator is recomputed here from repository evidence rather than
 * carried forward. 352, 372 and 329 have all been quoted this sprint and each
 * was right about a different population; a number that is remembered rather
 * than derived stops being true the moment the tree moves under it.
 *
 * The honest shape of this dispatch is stated up front, because the arithmetic
 * is the finding: packet-factory lanes are created and queued as instructed, but the
 * work that exists for them is not evenly distributed across the four kinds. The
 * builders are limited by how many families have an exactly-identified official
 * source, which is far fewer than the roster would hold. That is what the source
 * conveyor is for, and it is reported rather than smoothed.
 */
import fs from "node:fs";
import { preflightDenominator, denominatorForCommand } from "./preflight-denominator.mjs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { makeEmitter } from "../lib/generator-emit.mjs";
import { preferOfficialForm, nonFormCandidatesSetAside } from "../lib/official-form-asset-class.mjs";
import { effectivePacketLaneCount, livePacketLaneByFamily } from "./pf-lane-retention.mjs";
import { pathsOverlap, unresolvedHistoricalRepairPaths } from "./path-ownership.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

function verificationClaimProblems(assignments, claims) {
  const problems = [];
  for (const assignment of assignments) {
    if (assignment.lane !== "independent-verification") continue;
    for (const familyId of assignment.items ?? []) {
      const matchingClaims = claims.filter((claim) =>
        claim.subjectType === "packet-family"
        && claim.subjectId === familyId
        && claim.operation === "independent-verification");
      if (matchingClaims.length !== 1) {
        problems.push(`${assignment.assignmentId}/${familyId}: ${matchingClaims.length} matching claims`);
        continue;
      }
      const claim = matchingClaims[0];
      if (claim.lane !== assignment.assignmentId) {
        problems.push(`${assignment.assignmentId}/${familyId}: matching claim belongs to ${claim.lane}`);
      } else if (claim.laneKind !== "independent-verification") {
        problems.push(`${assignment.assignmentId}/${familyId}: matching claim has laneKind ${claim.laneKind}`);
      } else if (claim.released) {
        problems.push(`${assignment.assignmentId}/${familyId}: matching claim is released at ${claim.releasedAt ?? "an unknown time"}`);
      }
    }
  }
  return problems;
}

function reportUnassertableVerificationDispatch(assignments, claims) {
  const problems = verificationClaimProblems(assignments, claims);
  if (!problems.length) return false;
  console.error(`REFUSED_UNASSERTABLE_VERIFICATION_DISPATCH ${problems.length}`);
  for (const problem of problems.slice(0, 12)) console.error(`  ${problem}`);
  if (problems.length > 12) console.error(`  ... and ${problems.length - 12} more`);
  console.error("Nothing was written. Integrate the completed verifier return or deliberately reissue a new work cycle before regenerating the dispatch.");
  return true;
}

const focusedInvariantIndex = process.argv.indexOf("--check-verification-claim-invariant");
if (focusedInvariantIndex >= 0) {
  const activePath = process.argv[focusedInvariantIndex + 1];
  const ledgerPath = process.argv[focusedInvariantIndex + 2];
  if (!activePath || !ledgerPath) {
    console.error("usage: generate.mjs --check-verification-claim-invariant <active-assignments.json> <claim-ledger.json>");
    process.exit(2);
  }
  const active = JSON.parse(fs.readFileSync(path.resolve(activePath), "utf8"));
  const ledger = JSON.parse(fs.readFileSync(path.resolve(ledgerPath), "utf8"));
  if (reportUnassertableVerificationDispatch(active.assignments ?? [], ledger.claims ?? [])) process.exit(1);
  const count = (active.assignments ?? [])
    .filter((assignment) => assignment.lane === "independent-verification")
    .reduce((total, assignment) => total + (assignment.items ?? []).length, 0);
  console.log(`VERIFICATION_CLAIMS_ASSERTABLE ${count}`);
  process.exit(0);
}

const OUT_DIR = "data/rcap-grade-a/packet-factory-24h";
const PROMPT_DIR = "docs/rcap/grade-a/packet-factory-24h";
const LC = "data/rcap-grade-a/launch-control";
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const SCRIPTS = "scripts";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";
const CONTRACT = "docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md";
const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";

/* The commit whose tree a verifier actually reads: the generation head, which
 * carries every integrated packet. Distinct from MINIMUM_CAPTAIN_SHA below,
 * which is a floor and not a tree anyone reads. */
const PACKET_COMMIT = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();

/* The minimum ancestor every lane proves it contains: the generation head
 * itself. A frozen constant here is how the committed dispatch came to carry
 * two distinct pins — every sibling generator stamps its generation head, and
 * the convergence sweep demands ONE distinct pin that is an ancestor of HEAD.
 * A worker must hold at least the commit this dispatch was generated from,
 * which is exactly what stamping the generation head says. */
const MINIMUM_CAPTAIN_SHA = PACKET_COMMIT;

/* Micro-batch: a lane returns work in hours, not at the end of a wave. Five is
 * the ceiling and two to four is the shape; a shared-host lane may exceed it
 * only because its machinery makes splitting the families unsound. */
const PF_MAX_FAMILIES = 5;
const PF_PREFERRED_MAX = 4;
/*
 * Verification, repair and build capacity are elastic. The thresholds are the
 * dispatch's own, and they are measured against the live queue rather than
 * asserted: VERIFY_PENDING here means every family awaiting an independent
 * reading, which is the pending ones plus the ones a verifier already holds --
 * a lane roster sized only on the unclaimed half under-provisions exactly when
 * the queue is deepest.
 */
const VF_LANES_BASE = 8;
const VF_LANES_ELASTIC = 12;
const FIX_LANES_BASE = 4;
const FIX_LANES_ELASTIC = 8;
const PF_LANES_BASE = 16;
const PF_LANES_ELASTIC = 24;
const VERIFY_ELASTIC_THRESHOLD = 20;
const REPAIR_ELASTIC_THRESHOLD = 20;
const BUILD_ELASTIC_THRESHOLD = 80;
const SOURCE_LANES = 16;

/*
 * The preflight denominator is READ, never asserted.
 *
 * Eleven places in these generators stated "14/14" by hand. Adding a
 * fifteenth preflight check would have turned all eleven into instructions to
 * expect a number the preflight no longer prints, and a worker told to expect
 * 14/14 that sees 15/15 cannot tell an improvement from a regression.
 *
 * It reads 14/14 today because the roster is fifteen and a family-scoped run
 * has one check that does not apply to it -- which is now excluded from the
 * denominator rather than counted as a pass.
 */
/*
 * Probed with a --family argument because that is how a worker invokes it: the
 * applicable set depends on the invocation, and a family-scoped run has no
 * assigned-branch check to make. The family name itself does not change the
 * denominator -- only whether the flag is present does -- so a sentinel is
 * honest here and avoids pinning the whole dispatch to one family's fortunes.
 */
/*
 * The denominator belongs to the COMMAND, so it is measured per invocation.
 *
 * This ran the preflight family-scoped with no other flag and stamped that
 * number -- 14/14 -- onto every prompt in the dispatch. Two things were wrong
 * with it, and ENV-RAS01's N6 control found both.
 *
 * A worker runs --codex-cloud, and cloud mode REPLACES three checks rather than
 * waiving them, so the whole roster is applicable and the preflight prints
 * 15/15. Forty-eight prompts told workers to expect a number their own command
 * does not print, and a worker who cannot tell an improvement from a regression
 * either stops a healthy lane or waves a real failure through.
 *
 * And the source lanes do not run this preflight at all: their gate is
 * --assignment-id with --source-obligation, which prints
 * SOURCE_CONVEYOR_PREFLIGHT_READY. Eighteen prompts named a string their own
 * command can never emit, in the same field, and so had no gate at all.
 */
const PREFLIGHT_DENOMINATOR = preflightDenominator(["--codex-cloud"]);
const PREFLIGHT_MUST_RETURN = PREFLIGHT_DENOMINATOR.mustReturn;
// What a lane's OWN gate prints. A source lane gates on the conveyor preflight;
// a builder, verifier or fix lane gates on the packet-build preflight.
/*
 * What a lane's OWN gate prints, and there are three different answers.
 *
 * A source lane gates on the conveyor preflight and prints
 * SOURCE_CONVEYOR_PREFLIGHT_READY -- not a ratio at all, so eighteen prompts
 * naming a PACKET_BUILD_ENVIRONMENT_READY number were naming a string their own
 * command can never emit. A builder gates on the lane gate, which has no
 * --family, so family_sources_bind is not applicable and it prints one fewer.
 * A verifier or fix lane has no separate lane gate: its single gate is
 * family-scoped and prints the full roster. One number for all three was wrong
 * for two of them.
 */
const FAMILY_SCOPED_MUST_RETURN = preflightDenominator(["--family", "__denominator_probe__", "--codex-cloud"]).mustReturn;
const mustReturnFor = (lane) => {
  if (lane === "source-identity-acquisition-promotion" || lane === "source-swarm") return "SOURCE_CONVEYOR_PREFLIGHT_READY";
  if (lane === "packet-build") return PREFLIGHT_MUST_RETURN;
  return FAMILY_SCOPED_MUST_RETURN;
};

/*
 * The closed state vocabulary.
 *
 * LEGAL_BLOCKED was emitted for thirteen families before it was declared here.
 * That is the defect this repository refuses everywhere else -- an unknown
 * disposition fails closed -- committed by the generator that enforces it, and
 * nothing caught it because nothing was comparing what the queue emits against
 * what it declares. F27 does that now.
 *
 * LEGAL_BLOCKED is distinct from the three states it sits near, and the
 * distinctions are the point:
 *   SOURCE_BLOCKED     the bytes are missing. The conveyor can fix it.
 *   LEGAL_BLOCKED      the bytes are held and the law is unresolved. Only
 *                      counsel can fix it, and no builder may touch it.
 *   LEGAL_REVIEW_READY a built packet awaiting counsel's review.
 *   LEGAL_APPROVED     counsel has answered.
 * Collapsing the first two sent the conveyor after documents already held.
 */
const STATES = [
  "SOURCE_BLOCKED", "SOURCE_READY", "LEGAL_BLOCKED", "ASSIGNED_TO_BUILD", "BUILD_IN_PROGRESS",
  "BUILT_RASTER_PENDING",
  "PASS_COMPLETE", "VERIFY_PENDING", "VERIFYING", "FAIL_REPAIR_REQUIRED",
  "VERIFIED_PASS", "LEGAL_REVIEW_READY", "LEGAL_APPROVED", "PRODUCT_PATH_PENDING",
  "COMPLETE_PACKET_PROVEN", "LEGITIMATE_GUIDANCE_ONLY",
  /*
   * A family whose delivery type the decision owner has refused.
   *
   * Every other state in this list answers "how complete is this packet". This
   * one answers a question none of them can: whether the packet delivers the
   * right INSTRUMENT at all. South Carolina is the case that forced it -- a
   * family that passed all fifteen obligations, held a current raster receipt
   * and sat in COMPLETE_PACKET_PROVEN while shipping a custom pleading on
   * routes whose approved design calls the solicitor's official form mandatory
   * and exclusive. Every measurement was right and the artifact was still the
   * wrong one, which is exactly why proof of completeness cannot be allowed to
   * answer it.
   */
  "WRONG_DELIVERY_TYPE",
  /*
   * THE FOUR TERMINAL NON-PACKET STATES.
   *
   * WRONG_DELIVERY_TYPE says what a family may NOT deliver. That is a finding,
   * not a destination, and a family left sitting in it forever is a family the
   * factory has given up on while still counting it as work in progress. These
   * four say what it DOES deliver instead, and they are terminal: no further
   * packet work is owed, because the packet was never the right instrument.
   *
   * None of them is a packet state and none opens anything. Checkout stays
   * closed on every route in all four; OUT_OF_SCOPE in particular means the
   * route is deliberately unsupported, which is a decision the owner already
   * made and this only records.
   */
  "GUIDANCE_READY",
  "HANDOFF_READY",
  "AGENCY_APPLICATION_READY",
  "OUT_OF_SCOPE"
];
const STATE_MEANINGS = {
  SOURCE_BLOCKED: "a required source is not held; the conveyor can resolve it",
  LEGAL_BLOCKED: "every source is held and a legal question is unresolved; only counsel can resolve it and no builder may be sent at it",
  LEGAL_REVIEW_READY: "a built packet awaiting counsel review",
  LEGAL_APPROVED: "counsel has answered",
  GUIDANCE_READY: "the route delivers substantive guidance, not a packet; terminal, checkout closed",
  HANDOFF_READY: "the route hands the participant to legal aid or an attorney; terminal, checkout closed",
  AGENCY_APPLICATION_READY: "the route delivers an agency application, not a court packet; terminal, checkout closed",
  OUT_OF_SCOPE: "the route is deliberately unsupported by owner decision; terminal, checkout closed"
};

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const readIf = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? read(rel) : null);
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
const sha = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex");

/* ---------------------------------------------------------------- *
 * STEP 1 — the live denominator, from evidence
 * ---------------------------------------------------------------- */
const INPUTS = {
  scoreboard: "data/rcap-grade-a/route-obligation-census-v1/COMPLETION_SCOREBOARD.json",
  census: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  custody: "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json",
  worklist: `${LC}/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json`,
  categoryB: `${LC}/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`,
  categoryBStatus: `${LC}/CATEGORY_B_INTEGRATION_STATUS.json`,
  counsel: `${LC}/COUNSEL_DETERMINATION_DELTA.json`,
  legalQueue: "data/rcap-grade-a/route-obligation-census-v1/legal-review-queue-v2.json",
  c11: `${LC}/C11_RETURN_REVIEW.json`,
  c11Stops: `${LC}/C11_STOP_CLASSIFICATION.json`,
  completeness: "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json",
  continuation: `${LC}/S2_CONTINUATION.json`,
  cloudContinuations: `${LC}/CODEX_CLOUD_CONTINUATIONS.json`,
  p2Verification: `${LC}/P2_WASHINGTON_VERIFICATION.json`,
  r8Split: `${LC}/R8_FOUR_WAY_SPLIT.json`,
  verificationLedger: `${LC}/WAVE_2_VERIFICATION_LEDGER.json`,
  wave2: `${LC}/WAVE_2_ASSIGNMENTS.json`,
  repairWave: `${LC}/COMPLETENESS_REPAIR_WAVE.json`,
  s2: `${LC}/S2_SHARED_HOST_ASSIGNMENT.json`,
  wave2Repairs: `${LC}/WAVE_2_REPAIR_ASSIGNMENTS.json`,
  corpusIndex: "data/rcap-all50/local-source-corpus-index.json",
  sourceDeterminations: "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json",
  staleBlock: "data/rcap-grade-a/stale-artifact-block.json",
  ownerCorrections: "data/rcap-grade-a/legal-decisions/OWNER_CORRECTIONS_REQUIRED.json",
  legalHoldReclassification: "data/rcap-grade-a/legal-decisions/LEGAL_HOLD_RECLASSIFICATION_2026-09-04.json"
};
const IN = Object.fromEntries(Object.entries(INPUTS).map(([k, p]) => [k, read(p)]));

/* An identity established by reading the document is exact in the only sense
 * this set cares about: the custody row names one path and one SHA-256, and
 * the binding below still refuses it unless the committed corpus index holds
 * that path at that hash. The reconciler's tier-3 comment says how it is
 * established and what it refuses. */
const EXACT_TIERS = new Set(["exact_form_number", "content_hash", "exact_content_hash", "exact_identity_confirmed_from_document_text"]);

/*
 * SOURCE_READY means a builder can open the bytes, not that the census can name
 * them.
 *
 * ks-21-6614-conviction-set was classified SOURCE_READY while none of its six
 * required binaries binds. It has no custody row at all, so the old test --
 * "no missing_source hold, and no source resolved to an inexact tier" -- found
 * an empty list of inexact sources and read the emptiness as satisfaction. That
 * is the absent-versus-empty failure this whole sprint keeps meeting, arriving
 * this time through the readiness classifier.
 *
 * A source is bound only when all seven hold: an exact identity, an accepted
 * tier, a held path, a held SHA-256, an entry for that path in the governed
 * corpus index, an indexed SHA-256 equal to the held one, and at least one
 * source resolved at all. An exact title with no held byte is SOURCE_BLOCKED,
 * and so is a family that names official forms and resolves none of them.
 */
const CUSTODY_CLASSES_NEVER_READY = new Set([
  "SOURCE_GENUINELY_MISSING", "SOURCE_IDENTITY_UNRESOLVED", "SOURCE_IDENTITY_NOT_EXACT"
]);

/* routes, keyed by packet family */
const routesByFamily = new Map();
for (const r of IN.census.routes) {
  const key = r.packetSetId ?? r.packetFamilyId;
  if (!key) continue;
  if (!routesByFamily.has(key)) routesByFamily.set(key, []);
  routesByFamily.get(key).push(r);
}
const custodyByGroup = new Map(IN.custody.rows.map((r) => [r.worklistGroupId, r]));
const completenessByFamily = new Map(IN.completeness.results.map((r) => [r.familyId, r]));
const verdictByFamily = new Map((IN.verificationLedger.rows ?? []).map((r) => [r.family, r]));
/*
 * A WAVE-2 LEGAL-APPROVAL VERDICT IS A READ, AND READS ARE ORDERED.
 *
 * `verdictByFamily` is the wave-2 verification ledger. Seventeen of its rows
 * are BLOCKED_LEGAL_APPROVAL_INPUT, and until now every one of them blocked its
 * family forever: `legalBlocked` consulted the row and nothing ever outranked
 * it. That is the one verdict record in the factory exempt from ordering, and
 * the exemption is not principled. extract-verifier-returns already settled the
 * rule for verifier rows -- a read made at a descendant of another read's base
 * is later, full stop -- after lane-number precedence kept stale FAILs current
 * and held finished families out of the queue. The same defect lives here, one
 * record further out.
 *
 * It is not academic. dc_seal_conviction, ut_pet_traffic, pa_790_nonconviction,
 * az_marijuana_expungement_arrest_no_charges and wa_vac_domestic_violence all
 * reached VERIFIED_PASS carrying a current independent verdict, and four of the
 * five could not be proven because a wave-2 row from 30-31 August still said
 * counsel had not answered. Thirteen of the seventeen rows say
 * `sendToLawrence: false` in their own text: by the wave-2 ledger's own
 * classification they were never counsel questions at all.
 *
 * So a wave-2 legal block is superseded when ALL of the following hold, and
 * otherwise it stands:
 *
 *   - a current independent verification exists for the family;
 *   - its verdict is PASS_COMPLETE_INDEPENDENT, which the extractor records
 *     only when all fifteen obligations were scored and none left unmeasured --
 *     so it is a claim about the very obligation the wave-2 row stopped at, and
 *     not merely about some others;
 *   - that read DECLARES the commit it was made at, on the row itself rather
 *     than at the document level, for the reason the extractor gives: these
 *     files are appended to, and a later team's base lands on top of rows it
 *     never read;
 *   - and that commit is later than the wave-2 return commit.
 *
 * "Later" is ancestry where ancestry answers. Here it usually does not: wave-2
 * returns came back as diffs on worker branches that were never merged, so
 * their commits are reachable but unrelated to ours. Committer date decides
 * those, and a pair orderable by neither is NOT superseded.
 *
 * Nothing here weakens the gate. A block with no later read, or with a later
 * read that failed, or with one that declares no base, keeps blocking -- which
 * is why az_marijuana_expungement_arrest_no_charges, the single row the wave-2
 * ledger classifies GENUINE_NARROW_LEGAL_QUESTION, stays blocked: its passing
 * read declares no base, so this cannot order it and does not pretend to.
 */
const isCommitish = (x) => typeof x === "string" && /^[0-9a-f]{7,40}$/.test(x);
const commitDateCache = new Map();
const commitDateOf = (c) => {
  if (commitDateCache.has(c)) return commitDateCache.get(c);
  const raw = git(["show", "-s", "--format=%ct", c]);
  const d = raw ? Number(raw) || null : null;
  commitDateCache.set(c, d);
  return d;
};
const readIsLaterThan = (candidate, prior) => {
  if (!isCommitish(candidate) || !isCommitish(prior) || candidate === prior) return false;
  try { execFileSync("git", ["merge-base", "--is-ancestor", prior, candidate], { cwd: ROOT, stdio: "ignore" }); return true; }
  catch { /* unrelated branches; the dates decide */ }
  const a = commitDateOf(prior), b = commitDateOf(candidate);
  return a !== null && b !== null && b > a;
};
const wave2LegalBlockSuperseded = (familyId) => {
  const w2 = verdictByFamily.get(familyId);
  if (w2?.verdict !== "BLOCKED_LEGAL_APPROVAL_INPUT") return null;
  const later = independentReturnByFamily.get(familyId) ?? null;
  const stands = (reason) => ({
    superseded: false, reason,
    wave2ReturnCommit: w2.returnCommit ?? null,
    wave2DecisiveObligation: w2.decisiveObligation ?? null,
    wave2LegalInputClass: w2.legalInputClass ?? null,
    wave2SendToLawrence: w2.sendToLawrence ?? null
  });
  if (!later) return stands("no independent verification has read this family since the wave-2 block");
  if (later.verdict !== "PASS_COMPLETE_INDEPENDENT")
    return stands(`the current independent read is ${later.verdict}, which does not answer the blocked obligation`);
  if (!isCommitish(later.verifiedAtBase))
    return stands("the current independent read declares no review base on its row, so it cannot be ordered against the wave-2 read");
  if (!readIsLaterThan(later.verifiedAtBase, w2.returnCommit))
    return stands(`the current read's base ${later.verifiedAtBase} is not later than the wave-2 return ${w2.returnCommit}`);
  return {
    superseded: true,
    wave2ReturnCommit: w2.returnCommit,
    wave2DecisiveObligation: w2.decisiveObligation ?? null,
    wave2LegalInputClass: w2.legalInputClass ?? null,
    wave2SendToLawrence: w2.sendToLawrence ?? null,
    supersededBy: { lane: later.lane, verdict: later.verdict, verifiedAtBase: later.verifiedAtBase },
    reason: "a later independent read, at a review base it declares and that is later than the wave-2 return commit, scored all fifteen obligations with none failing",
    whatThisDoesNotDo: "It lifts one stale block. It approves no output, opens no commercial route and proves no packet; COMPLETE_PACKET_PROVEN still needs its raster receipt and its wiring record."
  };
};
/*
 * What the independent verifiers returned, extracted from their own diffs by
 * scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs. Absent until
 * that has run, and the dispatch is still generatable without it -- but F29
 * refuses a dispatch that leaves a failed family in VERIFYING, so the omission
 * cannot pass silently.
 */
/*
 * The registry, summarized for the lanes that must act on it. Absent until it
 * has been generated, and the dispatch is still generatable without it -- but
 * C22 refuses a source prompt that does not carry the vocabulary, so the
 * omission cannot pass quietly.
 */
let registrySummary = null;
try {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/SOURCE_RELATIONSHIP_REGISTRY.json`), "utf8"));
  const byState = reg.counts?.byState ?? {};
  registrySummary = {
    file: `${OUT_DIR}/SOURCE_RELATIONSHIP_REGISTRY.json`,
    readItBeforeYouFetchAnything: "Look your obligation up by jurisdiction and canonical artifact id. Its sourceState tells you whether there is anything to fetch at all.",
    statesThatAreNotAFetch: {
      BUNDLE_COMPONENT: `${byState.BUNDLE_COMPONENT ?? 0} — the document is a page inside a public bundle whose address is already recorded. Record the component locator and alias. Acquire the BUNDLE once, never the page.`,
      EMBEDDED_SECTION: `${byState.EMBEDDED_SECTION ?? 0} — the document is a section inside another form. There is no separate binary to request from anyone.`,
      STALE_OR_VARIANT_ID: `${byState.STALE_OR_VARIANT_ID ?? 0} — the identity is missing its current suffix or its filing-mode variant. Normalize the identity first; the form is public.`,
      SOURCE_SCOPE_AND_VERSION_AMBIGUITY: `${byState.SOURCE_SCOPE_AND_VERSION_AMBIGUITY ?? 0} — statewide versus local scope is unsettled. Settle the scope before any inquiry.`,
      FAMILY_IDENTITY_AMBIGUOUS: `${byState.FAMILY_IDENTITY_AMBIGUOUS ?? 0} — several held artifacts match this identity. Which one the route requires is the question; do not pick one.`,
      CURRENTNESS_UNVERIFIED: `${byState.CURRENTNESS_UNVERIFIED ?? 0} — the corpus already HOLDS matching bytes. The open question is whether the publisher still issues that edition. This is not a missing source and it is not an acquisition.`,
      STATUTORY_CUSTOM_PLEADING: `${byState.STATUTORY_CUSTOM_PLEADING ?? 0} — a statutory citation. There is no document at the other end; a packet-build lane drafts against the statute.`,
      LICENSE_PERMISSION_REVIEW: `${byState.LICENSE_PERMISSION_REVIEW ?? 0} — the form is public and its publisher restricts commercial reuse. Counsel and business decide, not a clerk.`
    },
    statesThatAreAFetch: {
      STANDALONE_ARTIFACT: `${byState.STANDALONE_ARTIFACT ?? 0} — public, ordinary acquisition.`,
      PUBLIC_DOWNLOAD: `${byState.PUBLIC_DOWNLOAD ?? 0} — public, ordinary acquisition.`,
      MISSING_SOURCE_BINARY: `${byState.MISSING_SOURCE_BINARY ?? 0} — expected and absent; acquire once an exact address is settled.`,
      MISSING_CANONICAL_RELATIONSHIP_METADATA: `${byState.MISSING_CANONICAL_RELATIONSHIP_METADATA ?? 0} — no publisher, address or locator is recorded. Settle identity before fetching.`
    },
    neverAskAClerkWhenAPublicSourceIsKnown: "The previous human queue told a person to contact a clerk 101 times. Zero of the top twenty justified it. If the registry records an official source page, the answer is already known.",
    youDoNotDecideReuse: "A publisher's commercial-reuse restriction is a counsel and business decision. Record it; do not resolve it and do not ask a clerk about it."
  };
} catch { /* not generated yet */ }

const independentReturnByFamily = new Map();
const preclaimRefusalByFamily = new Map();
try {
  const vr = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/VERIFIER_RETURNS.json`), "utf8"));
  for (const r of vr.rows ?? []) {
    if (!r.isIndependentVerification || !r.verdict) continue;
    /* A superseded verdict is history, not state: a family failed by VF06 and
     * passed by VF23 after repair must not be re-dispatched for repair. */
    if (r.superseded) continue;
    /* BLOCKED_BEFORE_CLAIM is history about a lane that was not allowed to
     * read, not a verdict about the packet. Preserve it as a fail-closed
     * fallback, but never let its presentation order overwrite a substantive
     * current verdict selected by the extractor's authoritative chronology. */
    if (r.verdict === "BLOCKED_BEFORE_CLAIM") {
      preclaimRefusalByFamily.set(r.familyId, r);
      continue;
    }
    independentReturnByFamily.set(r.familyId, r);
  }
  for (const [familyId, refusal] of preclaimRefusalByFamily) {
    if (!independentReturnByFamily.has(familyId)) independentReturnByFamily.set(familyId, refusal);
  }
} catch { /* no extraction yet */ }
const continuationByFamily = new Map(IN.continuation.rows.map((r) => [r.familyId, r]));
const confirmBRoutes = new Set(IN.categoryB.rows.filter((r) => r.finalDecision === "CONFIRM_B").map((r) => r.originalRouteKey));
const openCounselRoutes = new Set((IN.legalQueue.trueCounselQueue?.questions ?? []).filter((q) => !q.answered).map((q) => q.routeKey));

/*
 * Families a lane STOPPED on for an unresolved legal question.
 *
 * The queue's legalInputStatus is derived from the counsel queue's route keys.
 * Thirteen families carry SETTLED there while a packet-factory lane that
 * actually tried to build them returned BLOCKED_LEGAL_INPUT -- Arizona's filing
 * court needing a case-by-case reading of the charging history, Nebraska's
 * vehicle conflicting with the controlling legal-design evidence, Kentucky's
 * route-election classification not yet approved. All thirteen were granted to
 * packet-build lanes, so the dispatch would have sent a builder at every one.
 *
 * A worker that tried to build a family and hit a legal wall is better evidence
 * about that family than a status field derived from a route key. The finding
 * holds the family out of build lanes until counsel clears it; it does not
 * silently become a counsel answer.
 *
 * Read defensively: the extraction is produced by a separate generator, and a
 * dispatch must still be generatable before it has ever run.
 */
/*
 * OWNER DETERMINATIONS THAT CHANGE WHAT A SOURCE OBLIGATION MEANS.
 *
 * Louisiana's statutory forms and Florida's Rule 3.989 instruments are
 * COMPOSE_FROM_AUTHORITY by owner decision: they are generated faithfully from
 * codified text, and there is no agency-issued fillable PDF to wait for. A
 * family holding them was nonetheless blocked with "MISSING_DOCUMENT — no held
 * corpus entry for this form number", which is true and beside the point: the
 * document is composed, not acquired, so a corpus that does not hold it is not
 * a gap.
 *
 * Only a determination whose AUTHORITY IS HELD releases anything. Arizona's
 * R-26-0001 amendments are equally settled and are NOT applied here, because
 * the adopted specification is measurably absent from every mounted custody --
 * composing from a specification the repository does not have would be
 * invention, and those families keep their block with that exact reason.
 */
const composeFromAuthority = new Map();
try {
  const det = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/legal-decisions/OWNER_DETERMINATIONS_2026-09-02.json"), "utf8"));
  for (const d of det.determinations ?? []) {
    if (d.decision !== "COMPOSE_FROM_AUTHORITY" || d.authorityHeld !== true) continue;
    for (const f of d.families ?? []) {
      composeFromAuthority.set(f.familyId, { determination: d.id, jurisdiction: d.jurisdiction, forms: f.composedFromAuthority ?? [] });
    }
  }
} catch { /* no determinations recorded; every obligation keeps its ordinary meaning */ }

/*
 * Owner refusals of a family's DELIVERY TYPE.
 *
 * These outrank every proof in the factory, and they have to, because they
 * answer a question no proof addresses. A packet can bind its sources exactly,
 * render deterministically, pass all fifteen obligations and hold a live raster
 * receipt while delivering an instrument the route may not use -- and every one
 * of those measurements stays true. So a refusal here is read before the state
 * machine reaches any proven state, and no accumulation of evidence overturns
 * it; only the owner withdrawing the refusal does.
 */
const ownerDeliveryTypeRefusals = new Map();
try {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/legal-decisions/OWNER_DELIVERY_TYPE_DECISIONS.json"), "utf8"));
  for (const r of d.decisions ?? []) if (r.refused === true && r.familyId) ownerDeliveryTypeRefusals.set(r.familyId, r);
} catch { /* no owner delivery-type decisions recorded */ }

/*
 * A REFUSAL ANSWERED BY A REGISTERED TREATMENT IS NO LONGER A PENDING QUESTION.
 *
 * The refusal settles that the current artifact may not ship. It does not
 * settle what replaces it, and until that second question was answered these
 * families genuinely had nowhere to be. Now the terminal-treatment record
 * answers it for all sixteen, reading the treatment off the controlling
 * route-ratification status rather than choosing one, so the family can rest in
 * the instrument it actually delivers.
 *
 * The refusal is NOT withdrawn and is not weakened. It still forbids the packet
 * and it still cannot be overturned by any measurement; what changes is only
 * that the family now names its replacement instead of naming its refusal. If
 * the owner withdraws a refusal, the treatment goes with it.
 *
 * The treatment's own independent read stays open and is carried on the family
 * as terminalTreatmentVerification. Nothing here treats a terminal state as
 * verified, and none of the four is a proven state or opens a route.
 */
const terminalTreatments = new Map();
try {
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/legal-decisions/TERMINAL_TREATMENTS_WRONG_DELIVERY_TYPE.json"), "utf8"));
  for (const r of t.families ?? []) {
    if (!r.familyId || !r.terminalTreatment) continue;
    /* A treatment for a family the owner never refused would be this record
     * moving a family on its own authority, which it does not have. */
    if (!ownerDeliveryTypeRefusals.has(r.familyId)) continue;
    terminalTreatments.set(r.familyId, r);
  }
} catch { /* no terminal treatments registered yet */ }

/*
 * Owner holds pending a NAMED correction.
 *
 * A refusal above says the packet is the wrong thing; a hold here says it is
 * the right thing and is not yet correct. The owner answered eight questions
 * over the excluded families and every answer withheld something -- an
 * unconfirmed fee the design refuses to publish, a timing rule with no source
 * anywhere, a required component deliberately unbuilt, a corrected waiting rule
 * counsel has not reconfirmed, a form whose mandatory status is unresolved.
 * Each names what would lift it, so each is carried as an open legal input
 * rather than a note somebody has to remember: the family cannot be proven and
 * cannot enter a cohort until the correction is made and re-read.
 */
const ownerCorrectionsRequired = new Map();
for (const r of IN.ownerCorrections?.corrections ?? []) {
  if (r.live !== false && r.familyId) ownerCorrectionsRequired.set(r.familyId, r);
}

/*
 * OWNER-DIRECTED EXECUTION RECLASSIFICATION.
 *
 * A historical legal stop remains evidence of what a lane encountered. It is
 * not authority to keep calling the work legal after the owner has classified
 * the exact remainder as repair, source identity, or route mapping. The owner
 * record names the execution state, owner, and next action; this generator
 * preserves the old hold on the family row but stops using it as the current
 * state. No reclassification grants commercial authority or opens checkout.
 */
const ownerExecutionReclassifications = new Map();
for (const r of IN.ownerCorrections?.executionReclassifications ?? []) {
  if (r.familyId) ownerExecutionReclassifications.set(r.familyId, r);
}

/*
 * OWNER-CONFIRMED HOLD RECLASSIFICATION, WITHOUT ERASING THE HOLD'S HISTORY.
 *
 * A named correction is legal work only until the owner answers what must be
 * changed. Once the exact repair is present, the remaining obligation is an
 * independent reread, not another legal decision. Separately, an isolated
 * verifier's missing private corpus is a source-environment fact and cannot
 * keep an already answered wave-2 legal question open. The record names the
 * exact two families and exact evidence; absent or unreadable means no relief.
 */
const legalHoldReclassifications = new Map();
const LEGAL_HOLD_RECLASSIFICATION = "data/rcap-grade-a/legal-decisions/LEGAL_HOLD_RECLASSIFICATION_2026-09-04.json";
for (const r of IN.legalHoldReclassification?.families ?? []) {
  if (r.familyId && r.disposition) legalHoldReclassifications.set(r.familyId, r);
}

const laneReturnLegalHolds = new Map();
try {
  const stale = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/STALE_LANE_RETURNS.json`), "utf8"));
  for (const r of stale.rows ?? []) {
    if (r.destination !== "LEGAL") continue;
    /*
     * A REASON THAT IS ONLY THE VERDICT'S OWN NAME STATES NO QUESTION.
     *
     * Four families -- Kentucky's post-pardon felony, both Nebraska set-asides
     * and Pennsylvania's underage route -- carried the bare string
     * "BLOCKED_LEGAL_INPUT" as their hold's reason, because the first stated
     * reason a lane recorded was the class name and the fallback took it. A
     * hold reading "BLOCKED_LEGAL_INPUT: BLOCKED_LEGAL_INPUT" is the legal-hold
     * form of the failure that left five Washington families unassignable: it
     * looks like an answer and names nothing anyone can resolve.
     *
     * So a reason equal to the class it belongs to is not a reason. The next
     * stated reason or blocker is taken instead, and every one of those four
     * turns out to HAVE one -- Kentucky's missing worklist obligations,
     * Nebraska's custom-pleading vehicle conflicting with the CC-6-11 packet,
     * Nebraska trafficking's duplicate vehicles and CC-6-12 being an
     * instruction document, Pennsylvania's court-status metadata. The honest
     * final fallback stays for a lane that genuinely said nothing.
     */
    const stated = [...(r.statedReasons ?? []), ...(r.statedBlockers ?? [])]
      .filter(Boolean)
      .filter((x) => String(x).trim() !== String(r.declaredClass ?? "").trim());
    const why = stated[0] ?? "a lane returned BLOCKED_LEGAL_INPUT without stating the question";
    if (!laneReturnLegalHolds.has(r.familyId)) laneReturnLegalHolds.set(r.familyId, { familyId: r.familyId, foundBy: [], why });
    laneReturnLegalHolds.get(r.familyId).foundBy.push(`${r.lane} (PR #${r.pr})`);
  }
} catch { /* no extraction yet; the dispatch is still generatable */ }

/*
 * A hold limb the repository has since answered by measurement.
 *
 * A legal hold must name ONE exact unresolved decision, and some were recorded
 * naming two or three at once. Where a later measurement removes a factual
 * premise from one of them -- not a judgement about it, a measurement of it --
 * the hold narrows to what is genuinely still open, and a reviewer is not sent
 * to decide something the bytes already settle.
 *
 * Nebraska's trafficking hold is the case in hand. It named a vehicle conflict
 * AND "held form CC-6-12 is an instruction document". The second was true of
 * what the lane was handed and false of the corpus: CC-6-12 is held as both a
 * form and an instruction sheet under one number, and every resolver's
 * last-write-wins map handed out the sheet. With that fixed the family binds
 * the two-page motion to seal, and the vehicle conflict is the whole hold.
 *
 * This narrows; it never lifts. A family with any limb still open stays
 * LEGAL_BLOCKED and fail-closed, which is why the record carries no mechanism
 * for marking a hold satisfied.
 */
let legalHoldLimbsAnswered = new Map();
try {
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/LEGAL_HOLD_LIMBS_ANSWERED.json`), "utf8"));
  for (const e of doc.entries ?? []) {
    if (!e.familyId || !e.limbAnswered || !e.measurement || !e.whatStillStandsAndIsTheWholeHoldNow) continue;
    if (!legalHoldLimbsAnswered.has(e.familyId)) legalHoldLimbsAnswered.set(e.familyId, []);
    legalHoldLimbsAnswered.get(e.familyId).push(e);
  }
} catch { /* no answered limbs recorded; every hold stands exactly as its lane wrote it */ }

const c11Stopped = new Set((IN.c11.families ?? []).filter((f) => f.classification !== "BUILT").map((f) => f.familyId));

/* overlay directories that exist */
const overlayDirs = [];
for (const st of fs.readdirSync(path.join(ROOT, OVERLAYS))) {
  const full = path.join(ROOT, OVERLAYS, st);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const d of fs.readdirSync(full)) overlayDirs.push(`${OVERLAYS}/${st}/${d}`);
}
/** Every corpus-index entry, by path and by form number. */
const indexByPath = new Map((IN.corpusIndex.entries ?? []).map((e) => [e.path, e]));
const indexByForm = new Map();
for (const e of IN.corpusIndex.entries ?? []) {
  indexByForm.set(e.formNumber, [...(indexByForm.get(e.formNumber) ?? []), e]);
}
const indexBySha = new Map();
for (const e of IN.corpusIndex.entries ?? []) {
  if (!e.sha256) continue;
  indexBySha.set(e.sha256, [...(indexBySha.get(e.sha256) ?? []), e]);
}

/*
 * THE 42-FAMILY SOURCE RECONCILIATION IS AN INPUT, NOT A QUEUE PATCH.
 *
 * The acquisition workers returned exact hashes and governed custody, and the
 * Captain settled the parent/component, supersession, phantom-document and
 * custom-pleading relationships. The previous generator read neither record,
 * so every regeneration discarded the completed work and recreated the same
 * generic source blocks. Consume both here, where source readiness is decided.
 */
const sourceReconciliationDoc = IN.sourceDeterminations?.reconciliation42 ?? null;
const sourceReconciliationByFamily = new Map((sourceReconciliationDoc?.families ?? [])
  .map((r) => [r.familyId, r]));
const sharedExactBindingBySourceId = new Map((sourceReconciliationDoc?.sharedExactBindings ?? [])
  .map((r) => [r.sourceId, r]));
const acquisitionEvidenceByItem = new Map();
const ACCEPTED_ACQUISITION_RESULTS = new Set([
  "ACQUIRED_CURRENT_OFFICIAL_BINARY",
  "OFFICIAL_SOURCE_ALREADY_HELD",
  "PASS"
]);
const itemIdParts = (itemId) => {
  const marker = "::official-form:";
  const at = String(itemId ?? "").indexOf(marker);
  return at < 0 ? null : {
    familyId: String(itemId).slice(0, at),
    sourceId: `official-form:${String(itemId).slice(at + marker.length)}`
  };
};
const evidencePathFor = (node, receipt) => {
  if (receipt?.fileId) return `google-drive:${receipt.fileId}`;
  if (receipt?.artifactId) return `github-actions-artifact:${receipt.artifactId}`;
  return node.heldCorpusPath
    ?? node.exactIgnoredLocalPath
    ?? (node.readbackResult?.status === "PASS" ? node.persistentStagingPath : null)
    ?? null;
};
const registerAcquisitionEvidence = (itemId, node, inheritedResult, evidencePath) => {
  const parts = itemIdParts(itemId);
  if (!parts) return;
  const receipt = node.privateArtifactReceipt ?? node.privateReceipt ?? null;
  const result = node.result ?? node.status ?? inheritedResult ?? null;
  const sha256 = node.sha256 ?? node.observedSha256 ?? node.expectedSha256 ?? receipt?.sha256 ?? null;
  const heldPath = evidencePathFor(node, receipt);
  if (!ACCEPTED_ACQUISITION_RESULTS.has(result) || !sha256 || !heldPath) return;
  const candidate = {
    sourceId: parts.sourceId,
    path: heldPath,
    sha256,
    tier: "exact_content_hash",
    resolvedBy: "committed_acquisition_return_and_governed_custody",
    evidencePath
  };
  const existing = acquisitionEvidenceByItem.get(itemId);
  /* Prefer a local governed path, then an owner-only Drive receipt, then a
   * time-limited hosted artifact. All three retain the exact hash. */
  const rank = (x) => x?.path?.startsWith("github-actions-artifact:") ? 1
    : x?.path?.startsWith("google-drive:") ? 2 : 3;
  if (!existing || rank(candidate) > rank(existing)) acquisitionEvidenceByItem.set(itemId, candidate);
};
const walkAcquisitionEvidence = (node, evidencePath, inherited = {}) => {
  if (!node || typeof node !== "object") return;
  const inheritedResult = node.result ?? node.status ?? inherited.result ?? null;
  const families = [...new Set([
    ...(node.familyIds ?? []),
    ...(node.dependentFamilies ?? []),
    ...(inherited.families ?? [])
  ])];
  const itemIds = new Set();
  if (typeof node.itemId === "string") itemIds.add(node.itemId);
  for (const key of ["itemIds", "coversItemIds", "claimItems"]) {
    for (const id of node[key] ?? []) if (typeof id === "string") itemIds.add(id);
  }
  const obligation = typeof node.sourceObligationId === "string" ? node.sourceObligationId : null;
  if (obligation?.includes("::official-form:")) itemIds.add(obligation);
  else if (obligation?.startsWith("official-form:")) {
    for (const familyId of families) itemIds.add(`${familyId}::${obligation}`);
  }
  for (const itemId of itemIds) registerAcquisitionEvidence(itemId, node, inheritedResult, evidencePath);
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") walkAcquisitionEvidence(value, evidencePath, { result: inheritedResult, families });
  }
};
for (const evidencePath of sourceReconciliationDoc?.acquisitionEvidencePaths ?? []) {
  const doc = readIf(evidencePath);
  if (doc) walkAcquisitionEvidence(doc, evidencePath);
}

/**
 * Can a builder actually open every byte this family needs?
 *
 * Two tiers, matching the preflight's own resolution so the two cannot disagree.
 * Tier 1 is the custody row, which already resolved each source to a held path
 * and a pinned digest. Tier 2 is the census route's `official-form:<number>`
 * against the committed corpus index, for a family that names no acquisition
 * task. A family whose route names official forms and resolves none of them is
 * blocked, whatever its custody class says.
 */
/*
 * SIMPLIFIED BY DIRECTIVE (Roger, 2026-09-01): the goal is the participant
 * deliverable, not the queueing system. If the official PDF a route names is
 * known and already held, it attaches DIRECTLY — a custody row with
 * unresolved relationship metadata is background bookkeeping, never a veto
 * over bytes we hold whose hash matches the governed index. Precedence:
 *   1. direct binding: named official form -> exactly one held, indexed,
 *      hash-carrying corpus entry;
 *   2. custody binding: an exact-tier custody entry whose held bytes match
 *      the index (this can bind documents the form-number join cannot);
 *   3. only what binds NEITHER way is a reason, and it is a SPECIFIC one —
 *      a missing document or an unresolved form identity, per escalation
 *      rule 10.
 * A custom-pleading family drafts from codified text: it is not blocked on
 * an official PDF it will never fill. Its named forms bind opportunistically
 * as references, and readiness turns on the route being settled.
 */
function sourceReadiness(familyId, worklistGroupId, custody, routes, holds, implementationStrategy, reconciliation) {
  const reasons = [];
  const bound = [];
  const boundIds = new Set();
  const customPleading = implementationStrategy === "custom_pleading"
    || implementationStrategy === "participant_agency_application";

  /* A codified-text pleading does not need a PDF, but it still needs a source.
   * Group C is the bounded source-strategy cohort that explicitly requires the
   * controlling statutes, rules, or official instructions to be bound before
   * release. Keep those authorities distinct from binary custody: an exact
   * official section URL is not a pretend local PDF and carries no invented
   * file hash. */
  const declaredAuthorities = reconciliation?.authorityBindings ?? [];
  const boundAuthorities = declaredAuthorities.filter((a) =>
    typeof a?.sourceId === "string" && a.sourceId.startsWith("official-authority:")
    && typeof a?.title === "string" && a.title.trim()
    && typeof a?.issuingAuthority === "string" && a.issuingAuthority.trim()
    && /^https:\/\//.test(String(a?.officialUrl ?? "")));
  if (reconciliation?.requireBoundAuthority === true) {
    if (declaredAuthorities.length === 0) {
      reasons.push("CUSTOM_PLEADING_AUTHORITY_UNBOUND — no controlling statute, rule, or official instruction is named");
    } else if (boundAuthorities.length !== declaredAuthorities.length) {
      reasons.push(`CUSTOM_PLEADING_AUTHORITY_INEXACT — ${declaredAuthorities.length - boundAuthorities.length} authority binding(s) lack an exact identity, issuer, or official HTTPS URL`);
    }
  }

  const namedFromRoute = [...new Set(routes.flatMap((r) => (r.requiredSourceIds ?? [])
    .filter((x) => typeof x === "string" && x.startsWith("official-form:"))))];
  const satisfiedWithoutStandaloneBinary = new Set(reconciliation?.satisfiedWithoutStandaloneBinary ?? []);
  const replacements = new Map(Object.entries(reconciliation?.sourceReplacements ?? {}));
  const retiredSourceIds = new Set([...satisfiedWithoutStandaloneBinary, ...replacements.keys()]);
  const named = [...new Set([
    ...namedFromRoute.flatMap((id) => replacements.has(id) ? replacements.get(id) : [id])
      .filter((id) => !satisfiedWithoutStandaloneBinary.has(id)),
    ...(reconciliation?.additionalRequiredSourceIds ?? [])
  ])];

  // 1. Direct: the obvious association, straight off the governed index.
  for (const id of named) {
    const acquired = acquisitionEvidenceByItem.get(`${familyId}::${id}`);
    if (acquired) {
      bound.push(acquired);
      boundIds.add(id);
      continue;
    }
    const shared = sharedExactBindingBySourceId.get(id);
    if (shared) {
      const indexed = indexBySha.get(shared.sha256) ?? [];
      const exact = indexed.find((e) => e.path === shared.path) ?? indexed[0] ?? null;
      if (exact) {
        bound.push({ sourceId: id, path: exact.path, sha256: exact.sha256, tier: shared.tier ?? "exact_content_hash", resolvedBy: "captain_shared_exact_binding" });
        boundIds.add(id);
        continue;
      }
    }
    const formNumber = id.slice("official-form:".length);
    let matches = indexByForm.get(formNumber) ?? [];
    let tier = "exact_form_number";
    let resolvedBy = "census_form_number_against_committed_index";
    /*
     * An instruction sheet is filed under the number of the form it explains,
     * so this set can hold the petition AND the sheet about the petition. They
     * are different bytes, so the identical-hash collapse below could not save
     * it and the whole number refused as an ambiguity -- an ambiguity only in
     * the index's filing, never in what the family named.
     */
    const setAside = nonFormCandidatesSetAside(matches);
    if (setAside.length > 0) {
      matches = preferOfficialForm(matches);
      resolvedBy = "census_form_number_against_committed_index_official_form_preferred_over_instructions";
    }
    /*
     * ONE DOCUMENT AT TWO PATHS IS ONE IDENTITY.
     *
     * The corpus index now carries more than one custody, and the same
     * official binary legitimately sits in two of them: the Master Library
     * holds Alaska's TF-810 at REV-2025-05, and so does the D source pack, at
     * the identical SHA-256. Requiring a single index entry read that as an
     * ambiguity and unbound the form -- twenty-three families that had been
     * proven for days went from a bound source to UNRESOLVED_FORM_IDENTITY on
     * the strength of a second copy of the bytes they were already using.
     *
     * The reconciler already states the rule for its own Texas branch, and it
     * is the right rule everywhere: identical hashes are one identity, and the
     * lexically first path is the deterministic pick. Differing bytes under
     * one form number remain a genuine ambiguity and still refuse -- sixteen
     * form numbers across the index are in that state, and they are the ones
     * this must not decide.
     */
    if (matches.length > 1) {
      const distinct = new Set(matches.map((m) => m.sha256));
      if (distinct.size === 1) {
        matches = [matches.slice().sort((a, b) => a.path.localeCompare(b.path))[0]];
        resolvedBy = "census_form_number_against_committed_index_one_identity_at_several_paths";
      }
    }
    /* The census sometimes names a document by its printed title while the
     * index keys the same bytes by short form ID — Texas: "OCA Model Order of
     * Nondisclosure under Section 411.0735" vs "TX-GC-411.0725-411.073-411.0735".
     * The statute section printed in both IS the identity, and petition/order
     * is disambiguated by what the filename says the document is. Only a
     * single match binds; anything else stays a stated reason. */
    if (matches.length !== 1) {
      const section = formNumber.match(/[Ss]ection\s+(411\.\d+[a-z\-]*)/)?.[1];
      /* Instructions, letters and statements are their own documents: they
       * must never bind the petition's or order's bytes by sharing a section. */
      const isOtherInstrument = /instruction|letter|statement/i.test(formNumber);
      const kind = isOtherInstrument ? null : /petition/i.test(formNumber) ? "petition" : /order/i.test(formNumber) ? "order" : null;
      if (section && kind) {
        /* Section as a whole token: "411.073" must not match 411.0731's
         * digits, while the combined order "TX-GC-411.0725-411.073-411.0735"
         * genuinely covers 411.073 and binds a name asking for it. */
        const sectionToken = new RegExp(`(^|[^0-9])${section.replace(/\./g, "\\.")}([^0-9]|$)`);
        const candidates = (IN.corpusIndex.entries ?? []).filter((e) =>
          sectionToken.test(String(e.formNumber ?? ""))
          /* An instructions document shares its form's section and even the
           * word "petition" in its filename; it is not the form. */
          && !/instructions/i.test(e.path)
          && (kind === "petition" ? /petition/i.test(e.path) : (/order-of-nondisclosure/i.test(e.path) && !/petition/i.test(e.path))));
        /* The corpus can hold one document at two paths; identical hashes are
         * one identity, and the lexically first path is the deterministic pick. */
        const bySha = new Set(candidates.map((c) => c.sha256));
        const unique = bySha.size === 1 && candidates.length > 0
          ? [candidates.slice().sort((a, b) => a.path.localeCompare(b.path))[0]]
          : candidates;
        if (unique.length === 1) {
          matches = unique;
          tier = "exact_statute_section_and_document_kind";
          resolvedBy = "census_title_section_number_against_committed_index_filename_kind";
        }
      }
    }
    if (matches.length === 1 && matches[0].sha256) {
      bound.push({ sourceId: id, path: matches[0].path, sha256: matches[0].sha256, tier, resolvedBy });
      boundIds.add(id);
    }
  }

  // 2. Custody entries supplement what the direct join could not bind.
  for (const d of custody?.documentSources ?? []) {
    if (retiredSourceIds.has(d.sourceId)) continue;
    if (boundIds.has(d.sourceId)) continue;
    if (!d.resolved || !EXACT_TIERS.has(d.tier) || !d.heldAs?.path || !d.heldAs?.sha256) continue;
    const entry = indexByPath.get(d.heldAs.path);
    if (!entry || entry.sha256 !== d.heldAs.sha256) continue;
    bound.push({ sourceId: d.sourceId, path: d.heldAs.path, sha256: d.heldAs.sha256, tier: d.tier, resolvedBy: "custody_reconciliation" });
    boundIds.add(d.sourceId);
  }

  // 2b. A component relationship can bind several source obligations to one
  // parent binary, or one generic obligation to several fact-selected current
  // binaries. The Captain record names every hash; the corpus must hold it.
  for (const relationship of reconciliation?.relationshipBindings ?? []) {
    const candidates = indexBySha.get(relationship.sha256) ?? [];
    if (candidates.length === 0) continue;
    const exact = candidates.slice().sort((a, b) => a.path.localeCompare(b.path))[0];
    bound.push({
      sourceId: relationship.sourceId,
      componentSourceId: relationship.componentSourceId,
      path: exact.path,
      sha256: exact.sha256,
      tier: "exact_content_hash",
      resolvedBy: "captain_parent_component_or_conditional_relationship"
    });
    boundIds.add(relationship.sourceId);
  }

  // 3. Reasons are per-document and specific.
  const composed = composeFromAuthority.get(familyId) ?? null;
  const composedForms = new Set((composed?.forms ?? []).map((f) => String(f)));
  const satisfiedByAuthority = [];
  const satisfiedByRelationship = [...satisfiedWithoutStandaloneBinary];
  for (const id of named) {
    if (boundIds.has(id)) continue;
    const formNumber = id.slice("official-form:".length);
    /* Composed, not acquired. The absence of a held PDF for a form the owner
     * determined is generated from codified text is not a gap in the corpus. */
    if (composed && composedForms.has(formNumber)) { satisfiedByAuthority.push(id); continue; }
    const matches = indexByForm.get(formNumber) ?? [];
    if (matches.length === 0) reasons.push(`${id}: MISSING_DOCUMENT — no held corpus entry for this form number and no exact custody binding`);
    else if (matches.length > 1) reasons.push(`${id}: UNRESOLVED_FORM_IDENTITY — ${matches.length} corpus entries share this form number and no custody entry disambiguates`);
    else reasons.push(`${id}: held corpus entry carries no SHA-256`);
  }

  /* Both strategies draft their deliverable from committed research rather
   * than filling a court PDF: a custom pleading from codified text, an agency
   * application from the agency's own published process. Neither is blocked
   * on an official form it will never fill; named missing components still
   * block both honestly. */
  if (!customPleading && named.length === 0 && bound.length === 0) {
    reasons.push("the family names no document-shaped source, so nothing binds");
  }
  /* A custom pleading drafts from codified text, so it needs no PDF to fill —
   * but a named required component it lacks (Alabama's CR-65) is a genuine
   * missing document, and that reason still blocks. */
  const customAuthorityReady = customPleading
    && (reconciliation?.requireBoundAuthority !== true || boundAuthorities.length > 0);
  const ready = reasons.length === 0
    && (customAuthorityReady || bound.length > 0 || satisfiedByAuthority.length > 0);
  return {
    ready,
    reasons,
    ...(satisfiedByAuthority.length
      ? {
          satisfiedByAuthority,
          composedFromAuthority: composed.determination,
          whatThatMeans: "These instruments are generated faithfully from codified text by owner determination. No agency-issued fillable PDF exists to acquire, so no held corpus entry is owed for them. Every other gate — mapping, completeness, visual acceptance and independent verification — still applies unchanged."
        }
      : {}),
    ...(satisfiedByRelationship.length
      ? {
          satisfiedByRelationship,
          whatThatMeansForSourceIdentity: "These obligations are embedded sections, parent-document components, phantom published documents, nonofficial templates replaced by the governed composition strategy, or a product-time conditional choice. They do not require a standalone source binary."
        }
      : {}),
    boundSources: bound,
    boundAuthorities,
    boundAuthorityCount: boundAuthorities.length,
    supersededSourceIds: [...replacements.keys()],
    namedOfficialForms: named.length,
    effectiveOfficialSourceIds: named,
    boundCount: bound.length,
    custodyClass: custody?.custodyClass ?? "NO_ACQUISITION_TASK_NAMED",
    directAttachment: true
  };
}

const slugOf = (id) => id.replace(/_/g, "-").toLowerCase();
const suffixOf = (s) => (s === "custom_pleading" ? "custom-pleading" : "official-pdf-fill");

/* ---------------------------------------------------------------- *
 * STEP 3 — the import graph (needed before ownership can be decided)
 * ---------------------------------------------------------------- */
const scriptFiles = fs.readdirSync(path.join(ROOT, SCRIPTS)).filter((f) => /^build-census-v1-.+\.mjs$/.test(f));
const directImports = new Map(scriptFiles.map((f) => [f,
  [...new Set([...fs.readFileSync(path.join(ROOT, SCRIPTS, f), "utf8")
    .matchAll(/from\s+["']\.\/(build-census-v1-[^"']+\.mjs)["']/g)].map((m) => m[1]))]]));
const transitiveImportsOf = (f, seen = new Set()) => {
  if (seen.has(f)) return [];
  seen.add(f);
  const out = [];
  for (const d of directImports.get(f) ?? []) { out.push(d, ...transitiveImportsOf(d, seen)); }
  return [...new Set(out)];
};
const importersOf = (target) => scriptFiles.filter((f) => f !== target && transitiveImportsOf(f).includes(target));
const familyOfScript = (f) => f.replace(/^build-census-v1-/, "").replace(/\.mjs$/, "");

/* ---------------------------------------------------------------- *
 * STEP 2 — active ownership
 * ---------------------------------------------------------------- */
/*
 * Every lane currently holding families, from every record that dispatches one.
 * The P2 Washington verification shards are here because a family under
 * independent verification is claimed: seeding it into a factory VF lane as well
 * would be two verifiers on one packet, reported as independent proof twice.
 */
const ACTIVE_LANES = [
  ...IN.cloudContinuations.assignments,
  ...(IN.p2Verification?.assignments ?? []),
  ...(IN.r8Split?.assignments ?? []),
  ...(IN.r8Split?.southDakotaVerification ? [IN.r8Split.southDakotaVerification] : [])
];
const activeFamilies = new Map();
const activePaths = [];
for (const a of ACTIVE_LANES) {
  for (const f of a.items) activeFamilies.set(f, a.assignmentId);
  for (const p of a.ownedPaths) activePaths.push({ lane: a.assignmentId, path: p });
}
/* Historical Wave 2 rows remain protective until a modern repair claim proves
 * who took custody. Once every such claim is released, keeping the historical
 * glob active would make the next repair own and prohibit the same family. */
let priorClaimsForOwnership = [];
try {
  priorClaimsForOwnership = JSON.parse(
    fs.readFileSync(path.join(ROOT, `${OUT_DIR}/claim-ledger.json`), "utf8")
  ).claims ?? [];
} catch { /* first generation: every historical hold stays conservative */ }
activePaths.push(...unresolvedHistoricalRepairPaths(IN.wave2Repairs.assignments, priorClaimsForOwnership));

const rootOf = (p) => p.replace(/\/?\*+$/, "");

/*
 * Did this family's own artefacts change between the base a verdict was read
 * at and the current head? Answers the one question the claim ledger cannot:
 * whether a released repair came before or after the verdict it is being
 * asked to supersede.
 *
 * A verdict that names no base cannot be ordered at all, and is treated as
 * still describing this head -- the conservative reading, since the cost of
 * being wrong the other way is publishing a defect as unverified.
 */
/*
 * WHAT COUNTS AS THE FAMILY MOVING.
 *
 * Not everything in a family's directory is the family. `product-wiring.json`
 * and `build-status.json` are written by this factory's own generators and are
 * refreshed on any chain run that re-pins a digest -- and on the very first run
 * after this test was added, exactly that refresh released two of FABLE-VA4's
 * failures. A regenerated wiring digest cannot answer a FEE_AND_WAIVER finding
 * about what a sentence says, or a SELF_HELP_STOP finding about a section that
 * is not in the file. Counting it as a repair is how a defect gets closed by
 * bookkeeping.
 *
 * What CAN answer such a verdict is what a repairer actually edits: the
 * fixtures, the packet PDFs, participant-instructions.md, the field maps, the
 * page manifests -- and the family's build script, which lives outside the
 * directory and is where several of these repairs are made, gated behind a
 * per-family flag.
 */
/*
 * Files the factory writes ABOUT a packet, which are not the packet.
 *
 * reports/rendered-artifacts.json joined this list on measurement rather than
 * on principle. Hoisting the staleness lapses above COMPLETE_PACKET_PROVEN
 * moved 28 families out of proven, and five of them had exactly one changed
 * file: this report, whose only diff was `scripts/lib/pdf-page-raster.mjs` ->
 * `scripts/raster/pdf-page-raster.mjs`. A tool moving on disk is not a packet
 * changing, and sending five families back for a re-read over a renamed path
 * would spend a verifier's day proving nothing.
 *
 * Excluding it costs no coverage. The report records the artifacts' own
 * byte-derived hashes, so any rebuild that actually moves bytes also moves the
 * PDFs beside it, and those are watched. A file that can only echo a change
 * visible elsewhere is safe to stop watching; the PDFs remain the witness.
 */
const GENERATED_BOOKKEEPING = ["product-wiring.json", "build-status.json", "reports/rendered-artifacts.json"];
/*
 * WHEN A VERDICT NAMES NO BASE, THE LEDGER STILL KNOWS WHEN IT ENDED.
 *
 * A verdict with no `verifiedAtBase` cannot be ordered against a repair by
 * commit, so it kept its failure under the conservative rule. Nine live
 * failures were in that state, and FABLE-FIX05 measured one of them:
 * wa_vac_survivor_felony-set was failed by VF16 on all four of
 * FEE_AND_WAIVER, FILING_DESTINATION, SELF_HELP_STOP and SERVICE for one
 * reason -- that no participant-instructions.md existed -- and that file was
 * created by FIX10 in commit 7c8970c44 at 12:46:38Z, three hours after VF16
 * released its grant at 09:34:12Z. The verdict was true when it was written
 * and describes a tree that no longer exists.
 *
 * `ledger.releases` carries the release time for exactly that lane, subject
 * and operation, so it dates the verdict when the row does not. Recovering the
 * thirty dropped log entries is what made this usable; without the log this
 * fallback would silently answer for a fraction of the cases and look
 * complete. A subject with no log entry either is still unorderable and keeps
 * its failure.
 */
const releaseTimeOf = (() => {
  let ledgerReleases = [];
  try {
    ledgerReleases = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/claim-ledger.json`), "utf8")).releases ?? [];
  } catch { /* a dispatch must still be generatable before the ledger exists */ }
  const byKey = new Map();
  for (const r of ledgerReleases) {
    const k = `${String(r.lane).toUpperCase()}\u0000${r.subjectId}\u0000${r.operation}`;
    const prior = byKey.get(k);
    /* The LAST release is the one this verdict ended at. */
    if (!prior || String(r.releasedAt) > prior) byKey.set(k, String(r.releasedAt));
  }
  return (lane, subjectId) => byKey.get(`${String(lane).toUpperCase()}\u0000${subjectId}\u0000independent-verification`) ?? null;
})();

/*
 * A SOURCE THAT DRIFTS UNDER A VERDICT LAPSES IT, JUST AS THE FAMILY'S OWN
 * BYTES DO.
 *
 * familyMovedSinceVerdict watches the family directory and its build script,
 * which is where a repairer edits. It does not watch what the family BINDS,
 * and SOURCE_IDENTITY is one of the fifteen obligations: "every source binds
 * by exact SHA-256, recomputed from the bytes". So a verdict could stay
 * standing over a receipt that had stopped being true.
 *
 * It did. Every one of the 31 families whose receipt pins the route-obligation
 * census pins it at e881e849 / 2,596,674 B; the file now hashes 09368333 /
 * 2,599,752 B. Eleven of those families were COMPLETE_PACKET_PROVEN, both
 * first-cohort members among them, each carrying a receipt that declares
 * allSourcesExact true over a hash that no longer matches. An independent read
 * of the Tennessee route artifacts failed them on SOURCE_IDENTITY alone for
 * exactly this, and the queue had no way to notice.
 *
 * The measurement is the obligation itself rather than a proxy for it: recompute
 * each pinned record and compare it to the pin. That is stricter than asking git
 * whether a path moved, because it catches a file that changed and changed back
 * in the tree but not on disk, and it does not care which commit did it.
 *
 * A drift is not a defect in the packet. It means the packet's proof of source
 * identity has to be made again -- usually a re-pin, sometimes a rebuild when an
 * anchor the packet names has left the source altogether. Either way the family
 * owes a fresh read, so it returns to VERIFY_PENDING rather than staying proven.
 */
const fileHashCache = new Map();
const hashOnDisk = (rel) => {
  if (fileHashCache.has(rel)) return fileHashCache.get(rel);
  let h = null;
  try { h = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"); }
  catch { h = null; }
  fileHashCache.set(rel, h);
  return h;
};
const sourceDriftCache = new Map();
function boundSourceDriftedSinceVerdict(directory) {
  if (sourceDriftCache.has(directory)) return sourceDriftCache.get(directory);
  let drifted = null;
  try {
    const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, directory, "source-receipt.json"), "utf8"));
    for (const rec of receipt.committedRecords ?? []) {
      const rel = rec.pathInRepository;
      if (!rel || !/^[0-9a-f]{64}$/.test(String(rec.sha256 ?? ""))) continue;
      const now = hashOnDisk(rel);
      /* A record that is GONE is a different failure -- the conveyor reports a
       * missing source -- and must not be read here as "unchanged". */
      if (now === null) { drifted = { path: rel, pinned: rec.sha256, now: "MISSING" }; break; }
      if (now !== rec.sha256) { drifted = { path: rel, pinned: rec.sha256, now }; break; }
    }
  } catch { drifted = null; /* no receipt to check; other gates cover that */ }
  sourceDriftCache.set(directory, drifted);
  return drifted;
}

const movedSinceCache = new Map();
function familyMovedSinceVerdict(independentReturn, directory, buildScript) {
  const base = independentReturn?.verifiedAtBase;
  const pathsOf = () => [directory, buildScript, ...GENERATED_BOOKKEEPING.map((f) => `:(exclude)${directory}/${f}`)];
  if (!base || !/^[0-9a-f]{7,40}$/.test(String(base))) {
    /* No base. Date the verdict from the ledger and ask git the same question
     * in the time domain: did anything a repairer edits land after it? */
    const at = releaseTimeOf(independentReturn?.lane, independentReturn?.familyId);
    if (!at) return false;
    const key = `since:${at}\u0000${directory}`;
    if (movedSinceCache.has(key)) return movedSinceCache.get(key);
    let moved = false;
    try {
      const out = spawnSync("git", ["log", "--format=%H", `--since=${at}`, "--", ...pathsOf()],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
      moved = out.status === 0 && out.stdout.trim().length > 0;
    } catch { moved = false; }
    movedSinceCache.set(key, moved);
    return moved;
  }
  const key = `${base}\u0000${directory}`;
  if (movedSinceCache.has(key)) return movedSinceCache.get(key);
  let moved = false;
  try {
    const paths = pathsOf();
    const r = spawnSync("git", ["diff", "--quiet", base, "HEAD", "--", ...paths], { cwd: ROOT });
    /* 0 = identical, 1 = differs. Anything else (an unknown base after a
     * shallow clone, a path git cannot resolve) is not an answer, and an
     * unanswered question must not release the family from FAIL. */
    if (r.status === 1) moved = true;
    else if (r.status !== 0) moved = false;
  } catch { moved = false; }
  movedSinceCache.set(key, moved);
  return moved;
}

/* ---------------------------------------------------------------- *
 * Build one record per family
 * ---------------------------------------------------------------- */
/*
 * A FAIL_REPAIR_REQUIRED verdict is superseded by a completed repair: the
 * repair lane released its claim after doing exactly the work the verdict
 * demanded, and holding the family in FAIL after that re-dispatches finished
 * work. A family with a LIVE repair claim is still being repaired and stays
 * failed until that lane returns. Ordering caveat, stated rather than implied:
 * the ledger does not order releases against verdicts, so a family failed
 * AGAIN after its repair released must come back through a new repair grant
 * (reissue/transfer), which flips it back to live here.
 */
const repairReleasedFamilies = new Set();
const repairLiveFamilies = new Set();
try {
  const led = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/claim-ledger.json`), "utf8"));
  for (const c of led.claims ?? []) {
    if (c.laneKind !== "repair" && c.laneKind !== "shared-host-repair") continue;
    for (const fid of c.familyIds ?? (c.familyId ? [c.familyId] : []))
      (c.released === true ? repairReleasedFamilies : repairLiveFamilies).add(fid);
  }
} catch { /* no ledger yet */ }

/* A released repair claim is not proof that it answered the selected FAIL.
 * Bind the transition to a completed repair row that names every failed
 * obligation and whose exact row did not exist at the verdict base. */
const repairCompletionsByFamily = new Map();
for (const root of [OUT_DIR, "data/rcap-grade-a/codex-cloud"]) {
  const absoluteRoot = path.join(ROOT, root);
  if (!fs.existsSync(absoluteRoot)) continue;
  for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const evidencePath = `${root}/${entry.name}/rows.json`;
    if (!fs.existsSync(path.join(ROOT, evidencePath))) continue;
    let doc = null;
    try { doc = JSON.parse(fs.readFileSync(path.join(ROOT, evidencePath), "utf8")); } catch { continue; }
    for (const row of doc.rows ?? []) {
      if (row.status !== "COMPLETED" || row.repairedByThisLane !== true) continue;
      if (row.laneKind && row.laneKind !== "repair" && row.laneKind !== "shared-host-repair") continue;
      const familyId = row.itemId ?? row.familyId;
      if (!familyId) continue;
      if (!repairCompletionsByFamily.has(familyId)) repairCompletionsByFamily.set(familyId, []);
      repairCompletionsByFamily.get(familyId).push({ row, evidencePath });
    }
  }
}

/* A completeness audit describes the bytes which happen to be present; it is
 * not a builder return.  In particular, a preserved WIP can contain auditable
 * PDFs while its current lane truthfully returns STOPPED because it cannot
 * reproduce those bytes from the exact source.  Do not turn that stopped WIP
 * into VERIFY_PENDING merely because the matrix can read it.  The live packet
 * claim identifies the authoritative lane, and that lane's last row identifies
 * whether the assigned build actually completed. */
const stoppedPacketBuildByFamily = new Map();
const completedPacketBuildFamilies = new Set();
for (const entry of fs.readdirSync(path.join(ROOT, OUT_DIR), { withFileTypes: true })) {
  if (!entry.isDirectory() || !/^pf\d+$/i.test(entry.name)) continue;
  const evidencePath = `${OUT_DIR}/${entry.name}/rows.json`;
  if (!fs.existsSync(path.join(ROOT, evidencePath))) continue;
  let doc;
  try { doc = JSON.parse(fs.readFileSync(path.join(ROOT, evidencePath), "utf8")); }
  catch { continue; }
  for (const row of doc.rows ?? []) {
    const familyId = row.itemId ?? row.familyId;
    if (!familyId) continue;
    if (row.status === "COMPLETED") completedPacketBuildFamilies.add(familyId);
    else if (row.status === "STOPPED") stoppedPacketBuildByFamily.set(familyId, { row, evidencePath });
  }
}
for (const familyId of completedPacketBuildFamilies) stoppedPacketBuildByFamily.delete(familyId);
function repairCompletionAnswersVerdict(independentReturn) {
  const familyId = independentReturn?.familyId;
  const base = independentReturn?.verifiedAtBase;
  const failed = independentReturn?.failedObligationNames ?? [];
  if (!familyId || !/^[0-9a-f]{7,40}$/.test(String(base ?? "")) || failed.length === 0) return false;
  try { execFileSync("git", ["cat-file", "-e", `${base}^{commit}`], { cwd: ROOT, stdio: "ignore" }); }
  catch { return false; }
  for (const candidate of repairCompletionsByFamily.get(familyId) ?? []) {
    const evidence = JSON.stringify(candidate.row);
    if (!failed.every((name) => evidence.includes(name))) continue;
    if (!candidate.row.countersAfter
      || !Object.values(candidate.row.countersAfter).every((value) => Number(value) === 0)) continue;
    let prior = null;
    try {
      const before = JSON.parse(execFileSync("git", ["show", `${base}:${candidate.evidencePath}`],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
      prior = (before.rows ?? []).find((row) => (row.itemId ?? row.familyId) === familyId
        && (row.laneKind === "repair" || row.laneKind === "shared-host-repair"));
    } catch { return true; /* the exact repair-return file is new after the verdict */ }
    if (!prior || JSON.stringify(prior) !== JSON.stringify(candidate.row)) return true;
  }
  return false;
}

/*
 * The terminal transition, derived from evidence and never stamped by hand:
 * COMPLETE_PACKET_PROVEN = a fifteen-obligation PASS_COMPLETE_INDEPENDENT
 * verdict + a complete-coverage RASTER_PASS receipt whose bound hashes are the
 * row's CURRENT canonical/boundary hashes + no open legal input + a declared
 * product wiring. Anything less stays VERIFIED_PASS and says why by absence.
 */
/*
 * Families the raster queue DECLINED TO ENROL, and why in its own words.
 *
 * Not being queued is not the same as being queued and pending: a family the
 * gate cannot even open has no path to a visual verdict at all, and calling it
 * VERIFIED_PASS puts it in a state L4 counts as proven while nothing has ever
 * measured its pixels. ca-prop64-set reached exactly that: fifteen obligations
 * passed on an independent read, and eight of its twelve documents will not
 * open in the parser that counts pages, so no row was ever written for it.
 *
 * L4 caught it, which is the gate working. The queue's own refusal is carried
 * here so the state machine can hold the family with the reason attached
 * instead of promoting it past a proof that does not exist.
 */
const rasterNotEligible = new Map();
const rasterPassByFamily = new Map();
try {
  const rq = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/RASTER_QUEUE.json`), "utf8"));
  for (const n of rq.notEligible ?? []) if (n.familyId) rasterNotEligible.set(n.familyId, n.why ?? []);
  for (const r of rq.rows ?? []) {
    const rec = r.rasterReceipt;
    /*
     * THE RECEIPT MUST BIND THE BYTES ON DISK, NOT THE QUEUE'S OWN COPY.
     *
     * The last two comparisons read the receipt against r.canonicalPdfSha256 --
     * a field of the same queue row the receipt lives in. When a packet is
     * rebuilt, BOTH move together on the next regeneration and the check keeps
     * passing over bytes nobody rastered. That is the mirror shape: a record
     * asserting its own consistency and calling it evidence.
     *
     * Kansas made it concrete. Its acceptance receipt claimed RASTER_PASS
     * covering the whole family, bound to canonical 6a4ce684; after the
     * route-key repair the canonical hashes aca94f8f, and none of its six
     * artifacts appears in the raster queue at all. The receipt was internally
     * consistent and described a packet that no longer exists.
     *
     * So the hash is recomputed from the file the row names. A row whose PDF is
     * missing or has moved is not a pass -- it is a family owing a re-raster,
     * which is exactly what RERASTER_REQUIRED means.
     */
    const canonicalNow = r.canonicalPdfPath ? hashOnDisk(r.canonicalPdfPath) : null;
    const boundaryNow = r.boundaryPdfPath ? hashOnDisk(r.boundaryPdfPath) : null;
    rasterPassByFamily.set(r.familyId,
      r.currentRasterState === "RASTER_PASS"
      && rec?.verdict === "RASTER_PASS"
      && r.coverage?.complete === true
      && canonicalNow !== null && boundaryNow !== null
      && rec?.boundToCanonicalSha256 === canonicalNow
      && rec?.boundToBoundarySha256 === boundaryNow);
  }
} catch { /* no raster queue yet: nothing can be proven */ }

const families = [];
const seen = new Set();
/* The census route join keys on packetSetId, which treatment-prefixed rows
 * (agency-application-treatment:*, composed-treatment:*, rcap-* tracks) never
 * carry — their routes travel on the worklist row itself. Reading them there
 * is not invention: the worklist is census-generated and committed. Without
 * this fallback 48 rows sat "route not bound" while their routes sat in the
 * same repository. */
const worklistRowById = new Map((JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json"), "utf8")).packetFamilies ?? []).map((r) => [r.worklistGroupId, r]));
for (const f of IN.scoreboard.familiesDetail) {
  const tail = String(f.worklistGroupId ?? "").split(":").pop();
  const familyId = routesByFamily.has(tail) ? tail : f.worklistGroupId;
  if (seen.has(familyId)) continue;
  seen.add(familyId);

  const routes = (routesByFamily.get(familyId) ?? []).length > 0
    ? routesByFamily.get(familyId)
    : (worklistRowById.get(f.worklistGroupId)?.routes ?? []);
  const custody = custodyByGroup.get(f.worklistGroupId) ?? null;
  const comp = completenessByFamily.get(familyId) ?? null;
  const cont = continuationByFamily.get(familyId) ?? null;
  const verdict = verdictByFamily.get(familyId) ?? null;
  const independentReturn = independentReturnByFamily.get(familyId) ?? null;
  const independentFail = independentReturn?.verdict === "FAIL_REPAIR_REQUIRED";

  const sourceReconciliation = sourceReconciliationByFamily.get(familyId) ?? null;
  const strategy = sourceReconciliation?.implementationStrategyOverride ?? f.implementationStrategy;
  const dirGuess = `${OVERLAYS}/${(f.jurisdictions[0] ?? "xx").toLowerCase()}/${slugOf(familyId)}--${suffixOf(strategy)}`;
  const directory = comp?.directory
    ?? overlayDirs.find((d) => path.basename(d).startsWith(`${slugOf(familyId)}--`))
    ?? dirGuess;
  const buildScript = `${SCRIPTS}/build-census-v1-${familyId}.mjs`;
  const buildScriptExists = fs.existsSync(path.join(ROOT, buildScript));
  const artifactPresent = fs.existsSync(path.join(ROOT, `${directory}/reports/rendered-artifacts.json`));

  const originalSourceIds = [...new Set(routes.flatMap((r) => (r.requiredSourceIds ?? []).filter((s) => s.startsWith("official-form:"))))];
  const removedSourceIds = new Set(sourceReconciliation?.satisfiedWithoutStandaloneBinary ?? []);
  const replacementSourceIds = new Map(Object.entries(sourceReconciliation?.sourceReplacements ?? {}));
  const effectiveSourceIds = [...new Set([
    ...originalSourceIds.flatMap((id) => replacementSourceIds.has(id) ? replacementSourceIds.get(id) : [id])
      .filter((id) => !removedSourceIds.has(id)),
    ...(sourceReconciliation?.additionalRequiredSourceIds ?? [])
  ])];
  const forms = effectiveSourceIds.map((s) => s.slice(14)).sort();
  const components = [...new Set(routes.flatMap((r) => (r.requiredSourceIds ?? []).filter((s) => s.startsWith("component:"))))].sort();
  const instrumentKinds = [...new Set(routes.flatMap((r) => String(r.participantFacingInstrument ?? "").split(/;\s*/).map((s) => s.split(":")[0].trim()).filter(Boolean)))].sort();

  const docs = custody?.documentSources ?? [];
  const inexact = docs.filter((d) => !d.resolved || !EXACT_TIERS.has(d.tier));
  const readiness = sourceReadiness(familyId, f.worklistGroupId, custody, routes, f.holds, strategy, sourceReconciliation);
  /* A route not bound to any packet family cannot be built whatever it holds;
   * the block carries its reason so no family is blocked silently. */
  if (routes.length === 0) {
    readiness.ready = false;
    readiness.reasons.push("route not bound to a packet family — route mapping open");
  }
  /* A verifier source hold explains the state transition without rewriting
   * custody. The held-source record remains exactly what the source registry
   * proves; this records why the current packet verdict nevertheless stops. */
  const verifierSourceHold = independentReturn?.verdict === "BLOCKED_SOURCE"
    ? {
        lane: independentReturn.lane,
        verdict: independentReturn.verdict,
        blockedObligations: independentReturn.unmeasuredObligations ?? ["SOURCE_IDENTITY"],
        evidencePath: independentReturn.evidencePath ?? null
      }
    : null;
  const sourceBound = readiness.ready;
  /* A ready custom pleading with nothing bound drafts from codified text —
   * calling that "bound by held bytes" would promote a source that has no
   * bytes, which F18 rightly refuses. */
  const sourceStatus = readiness.ready
    ? (readiness.boundCount === 0 ? "CUSTOM_PLEADING_FROM_CODIFIED_TEXT" : "SOURCE_BOUND_BY_HELD_BYTES")
    : !((f.holds ?? []).some((h) => h.kind === "missing_source"))
      ? (inexact.length > 0 ? "SOURCE_IDENTITY_NOT_EXACT" : `SOURCE_NAMED_BUT_NOT_HELD: ${readiness.reasons[0]}`)
      : (custody?.custodyClass ?? "SOURCE_IDENTITY_UNRESOLVED");
  const sourceIds = [...new Set([
    ...effectiveSourceIds,
    ...(readiness.satisfiedByRelationship ?? []),
    ...(readiness.satisfiedByAuthority ?? []),
    ...(readiness.boundAuthorities ?? []).map((a) => a.sourceId)
  ])];
  const sourceHashes = readiness.boundSources.map((d) => ({
    sourceId: d.sourceId,
    ...(d.componentSourceId ? { componentSourceId: d.componentSourceId } : {}),
    path: d.path,
    sha256: d.sha256,
    tier: d.tier
  }));

  /* A current independent BLOCKED_LEGAL_INPUT return is itself the freshest
   * legal stop. It must not wait to become a stale-lane return before the
   * queue can represent it, and it must carry the verifier's exact findings
   * rather than collapse back to VERIFYING. */
  const currentVerifierLegalHold = independentReturn?.verdict === "BLOCKED_LEGAL_INPUT"
    ? {
        familyId,
        foundBy: [`${independentReturn.lane} (current independent verification)`],
        why: (independentReturn.blockedLegalObligations ?? [])
          .map((o) => `${o.obligation}: ${o.finding ?? "legal input unresolved"}`)
          .join(" | ") || "a current independent verifier returned BLOCKED_LEGAL_INPUT",
        evidencePath: independentReturn.evidencePath ?? null
      }
    : null;
  const laneHold = currentVerifierLegalHold ?? laneReturnLegalHolds.get(familyId) ?? null;
  const answeredLimbs = legalHoldLimbsAnswered.get(familyId) ?? [];
  const laneHoldNarrowed = laneHold && answeredLimbs.length > 0
    ? {
        ...laneHold,
        limbsAnsweredByMeasurement: answeredLimbs.map((e) => ({
          limb: e.limbAnswered,
          answer: e.answer,
          measurement: e.measurement,
          reproduceIt: e.reproduceIt ?? null
        })),
        theOneDecisionStillOpen: answeredLimbs[answeredLimbs.length - 1].whatStillStandsAndIsTheWholeHoldNow,
        narrowingLiftsNothing: "The family stays LEGAL_BLOCKED and payment stays closed. A measurement removed a factual premise; it decided no legal question."
      }
    : laneHold;
  const holdReclassification = legalHoldReclassifications.get(familyId) ?? null;
  const wave2LegalMeasured = wave2LegalBlockSuperseded(familyId);
  const wave2Legal = holdReclassification?.disposition === "SELECT_SUBSTANTIVE_VERDICT"
    && wave2LegalMeasured?.superseded !== true
    ? {
        ...wave2LegalMeasured,
        superseded: true,
        reason: "the owner-confirmed hold reclassification selects the exact substantive verdict and routes changed bytes to independent reread; the historical source refusal remains preserved",
        supersededBy: holdReclassification.selectedVerdict,
        decisionRecord: LEGAL_HOLD_RECLASSIFICATION
      }
    : wave2LegalMeasured;
  const executionReclassification = ownerExecutionReclassifications.get(familyId) ?? null;
  const ownerCorrection = ownerCorrectionsRequired.get(familyId) ?? null;
  const ownerCorrectionAwaitsReread = Boolean(ownerCorrection)
    && holdReclassification?.disposition === "POST_REPAIR_REREAD_REQUIRED";
  /* A reclassification can request one fresh read; it cannot permanently
   * outrank the read after that read returns.  A plain PASS is the extractor's
   * deliberate downgrade for an incomplete obligation set, so it still leaves
   * the request pending.  Every substantive current return is allowed through
   * to the normal verdict state machine below. */
  const reclassificationRereadAnchor = holdReclassification?.disposition === "POST_REPAIR_REREAD_REQUIRED"
    ? holdReclassification.repairCommit
    : IN.legalHoldReclassification?.recordedAtCaptainSha;
  const reclassificationRereadReturned = Boolean(independentReturn)
    && !["PASS", "BLOCKED_BEFORE_CLAIM"].includes(independentReturn.verdict)
    && isCommitish(independentReturn.verifiedAtBase)
    && isCommitish(reclassificationRereadAnchor)
    && (independentReturn.verifiedAtBase === reclassificationRereadAnchor
      || readIsLaterThan(independentReturn.verifiedAtBase, reclassificationRereadAnchor))
    && !familyMovedSinceVerdict(independentReturn, directory, buildScript);
  const holdReclassificationNextState = ["POST_REPAIR_REREAD_REQUIRED", "SELECT_SUBSTANTIVE_VERDICT"]
    .includes(holdReclassification?.disposition)
    && !reclassificationRereadReturned ? "VERIFY_PENDING" : null;
  const legalBlocked = (executionReclassification || holdReclassification) ? false : (
    routes.some((r) => openCounselRoutes.has(r.routeKey))
    || (verdict?.verdict === "BLOCKED_LEGAL_APPROVAL_INPUT" && wave2Legal?.superseded !== true)
    || Boolean(laneHold)
    || (Boolean(ownerCorrection) && !ownerCorrectionAwaitsReread)
  );
  const guidanceOnly = routes.length > 0 && routes.every((r) => confirmBRoutes.has(r.routeKey));
  const notAFamily = routes.length === 0;
  const routeMappingOpen = executionReclassification?.stateOverride === "PRODUCT_PATH_PENDING" || notAFamily;

  const nineZero = comp ? Object.values(comp.counters).every((v) => v === 0) : null;
  const completenessStatus = comp ? comp.result : artifactPresent ? "NOT_AUDITED" : "NOT_BUILT";

  const activeOwner = activeFamilies.get(familyId) ?? null;
  /* What KIND of lane holds it, read from the lane's own record rather than
   * matched out of its id. A regex over assignment ids called every P2V shard a
   * builder, because it was written when the only verifiers were named VS. */
  const activeOwnerLane = ACTIVE_LANES.find((a) => a.assignmentId === activeOwner)?.lane ?? null;

  /* The one state this family is in, decided in a fixed order so a family
   * cannot be counted twice. */
  let state;
  /* An owner refusal of the delivery type is read first, above even the
   * guidance branch: the question "may this route deliver this instrument"
   * precedes every question about how good the instrument is. */
  const deliveryTypeRefusal = ownerDeliveryTypeRefusals.get(familyId) ?? null;
  const terminalTreatment = terminalTreatments.get(familyId) ?? null;
  /* Refused AND answered: the family rests in what it delivers, not in what it
   * may not. Refused and not yet answered stays WRONG_DELIVERY_TYPE, which is
   * where rcap-sc-custom-pleading correctly still sits. */
  if (terminalTreatment) state = terminalTreatment.terminalTreatment;
  else if (deliveryTypeRefusal) state = "WRONG_DELIVERY_TYPE";
  else if (holdReclassificationNextState) state = holdReclassificationNextState;
  else if (executionReclassification?.stateOverride) state = executionReclassification.stateOverride;
  /* An owner withholding outranks a passing verdict for the same reason a
   * delivery-type refusal does: the verdict says the packet is well made, and
   * the withholding says it may not ship as made. Left below the PASS branch
   * these nine families sat at VERIFIED_PASS, which L4 and F30 read as proven —
   * so a family the owner had expressly not approved would have counted among
   * the proven ones. */
  else if (ownerCorrection && !ownerCorrectionAwaitsReread && !executionReclassification) state = "LEGAL_BLOCKED";
  else if (independentReturn?.verdict === "BLOCKED_LEGAL_INPUT") state = "LEGAL_BLOCKED";
  /* A verifier can be unable to measure SOURCE_IDENTITY in its container even
   * after central custody has acquired and hash-bound the exact source. Once
   * readiness is true, that environment-scoped hold is no longer source work.
   * Preserve any packet defects the same row measured, and preserve an open
   * legal input above them; otherwise request the now-possible fresh read. */
  else if (independentReturn?.verdict === "BLOCKED_SOURCE" && !readiness.ready) state = "SOURCE_BLOCKED";
  else if (independentReturn?.verdict === "BLOCKED_SOURCE" && legalBlocked) state = "LEGAL_BLOCKED";
  else if (independentReturn?.verdict === "BLOCKED_SOURCE"
    && (independentReturn.failedObligationNames ?? []).length > 0) state = "FAIL_REPAIR_REQUIRED";
  else if (independentReturn?.verdict === "BLOCKED_SOURCE") state = "VERIFY_PENDING";
  else if (guidanceOnly) state = "LEGITIMATE_GUIDANCE_ONLY";
  /*
   * A returned verdict outranks an active-owner claim.
   *
   * VERIFYING was read off the presence of an independent-verification owner,
   * and the machine never asked whether that owner had returned. P2V01-P2V03
   * failed nine Washington families and all nine stayed VERIFYING -- so the
   * queue said a verdict was pending on nine families that had one, and they
   * would have reached Lawrence review as in-flight rather than as failed. A
   * lane that has returned is not still verifying.
   */
  /*
   * THE LAPSES GUARD THE STRONGEST STATE FIRST.
   *
   * Both lapse branches used to sit BELOW this one, so they only ever protected
   * VERIFIED_PASS -- the weaker of the two passing states. A family that cleared
   * raster and wiring reached COMPLETE_PACKET_PROVEN before either lapse was
   * consulted, which means the state that L4 and F30 read as proven, and that a
   * fulfilment record is keyed to, had no staleness guard at all while the
   * lesser state had two. Exactly backwards, and it is why eleven proven
   * families were sitting on receipts that had stopped being true.
   *
   * A verdict that no longer describes the bytes, or no longer describes the
   * sources those bytes bind, is not a weaker pass. It is not a pass.
   */
  else if (independentReturn?.verdict === "PASS_COMPLETE_INDEPENDENT"
    && familyMovedSinceVerdict(independentReturn, directory, buildScript)) state = "VERIFY_PENDING";
  else if (independentReturn?.verdict === "PASS_COMPLETE_INDEPENDENT"
    && boundSourceDriftedSinceVerdict(directory)) state = "VERIFY_PENDING";
  else if (independentReturn?.verdict === "PASS_COMPLETE_INDEPENDENT"
    && rasterPassByFamily.get(familyId) === true
    && !legalBlocked
    && fs.existsSync(path.join(ROOT, `${directory}/product-wiring.json`))) state = "COMPLETE_PACKET_PROVEN";
  /*
   * A family the visual gate declined to enrol is held at BUILT_RASTER_PENDING
   * with the queue's own reason, not advanced to VERIFIED_PASS. Its independent
   * read is current and complete; the work still owed is raster acceptance, not
   * another independent read. VERIFIED_PASS is one of the states L4 reads as
   * proven, and a family with no raster row has nothing for L4 to read.
   */
  else if (independentReturn?.verdict === "PASS_COMPLETE_INDEPENDENT"
    && rasterNotEligible.has(familyId)) state = "BUILT_RASTER_PENDING";
  /*
   * A PASS IS ABOUT BYTES, AND BYTES MOVE.
   *
   * The ordering rule below was built for the failing direction: a repair that
   * postdates a FAIL may answer it, and one that predates it cannot. The
   * passing direction has the same dependence on ordering and never had the
   * rule, so a PASS survived any later rebuild of the very packet it was about.
   *
   * wv_conv_single_misdemeanor-set is the case that proved it costly. It passed
   * all fifteen obligations in the morning; the AcroForm containment lane later
   * measured thirteen checkbox appearances landing at twice their true
   * coordinates in the artifact that verdict had read -- one of them off the
   * page -- and rebuilt it. The packet the verifier passed no longer exists,
   * and without this the family sat at VERIFIED_PASS on the strength of a read
   * of superseded bytes, with no raster receipt for the new ones. L4 and F30
   * caught it, which is the gate working; this is the state machine no longer
   * needing to be caught.
   *
   * Measured the same way as the failing direction, against the only thing that
   * decides it: whether the family's own artefacts moved between the base the
   * verdict declares and this head.
   */
  /*
   * VERIFIED_PASS IS READ AS PROVEN, SO IT OWES THE VISUAL GATE TOO.
   *
   * The branch above already holds a family the raster gate could not ENROL.
   * It did not hold one the gate had simply not finished: a family with a
   * passing verdict and a RASTER_PENDING row fell straight through to
   * VERIFIED_PASS, which F30 and L4 both count among the proven states. Two
   * families were sitting there -- rcap-ms-custom-pleading and
   * rcap-wa-custom-pleading-clean-tracks -- read and passed, with no rendered
   * page yet examined.
   *
   * Not enrolled and not yet run are different reasons and the same answer:
   * until a hash-bound RASTER_PASS covers the current bytes, the family remains
   * BUILT_RASTER_PENDING. The independent PASS still stands, so this is not
   * VERIFY_PENDING and must not manufacture a second verifier assignment.
   */
  else if (independentReturn?.verdict === "PASS_COMPLETE_INDEPENDENT"
    && rasterPassByFamily.get(familyId) !== true) state = "BUILT_RASTER_PENDING";
  else if (independentReturn?.verdict === "PASS_COMPLETE_INDEPENDENT") state = "VERIFIED_PASS";
  /*
   * AND THE REPAIR HAS TO POSTDATE THE VERDICT.
   *
   * The ordering caveat named above was real and it cost a legal-safety
   * defect. FABLE-VA3 failed ut_pet_dismissed_without_prejudice-set on
   * SELF_HELP_STOP -- nine stop conditions held in the track registry, none
   * carried by the packet, and line 36 telling a participant to attend the
   * very hearing the registry records as the end of self-help. That verdict
   * was read at base 9c2b39327, which already CONTAINS the repair 2b88bb70b
   * whose release triggers this downgrade, and nothing in the family's
   * directory has changed since. So the repair demonstrably did not fix what
   * the verdict found, and sending the family to VERIFY_PENDING on the
   * strength of that release published the defect as merely unverified.
   * VA3's own words for the history: the gap survived a fail, a repair and a
   * pass.
   *
   * The ordering the ledger could not give is measured instead, against the
   * only thing that decides it: whether the family's own artefacts moved
   * between the base the verdict was read at and this head. If they did, the
   * verdict is about a tree that no longer exists and re-verification is the
   * honest next step. If they did not, the verdict describes THIS head, and
   * an older repair does not answer it.
   *
   * Unmeasurable falls to FAIL, because a defect nobody can show was fixed is
   * a defect.
   */
  else if (independentFail
    && repairReleasedFamilies.has(familyId) && !repairLiveFamilies.has(familyId)
    && comp && nineZero
    && repairCompletionAnswersVerdict(independentReturn)
    && familyMovedSinceVerdict(independentReturn, directory, buildScript)) state = "VERIFY_PENDING";
  else if (independentFail) state = "FAIL_REPAIR_REQUIRED";
  else if (activeOwner && activeOwnerLane === "independent-verification") state = "VERIFYING";
  else if (activeOwner) state = "BUILD_IN_PROGRESS";
  /* A stopped packet-build return outranks a completeness read of preserved
   * WIP bytes.  Central custody still decides SOURCE_READY versus
   * SOURCE_BLOCKED; the worker's environment does not rewrite source truth. */
  else if (stoppedPacketBuildByFamily.has(familyId)) state = readiness.ready ? "SOURCE_READY" : "SOURCE_BLOCKED";
  /*
   * A COMPLETENESS FAILURE OUTRANKS A NON-INDEPENDENT PASS.
   *
   * This line used to read `else if (verdict?.verdict === "PASS") state =
   * "VERIFIED_PASS"` and sat ABOVE the two completeness cases, so a plain PASS
   * -- which is a lane's own verdict on its own work, never an independent one
   * -- promoted a family the completeness verifier was failing. Nothing between
   * "a lane says it built this" and "verified" asked the nine counters.
   *
   * It was invisible for as long as those families also had an active owner,
   * because `activeOwner` catches first and holds them at BUILD_IN_PROGRESS.
   * Retiring four dead Codex Cloud reservations removed the owners and all four
   * families -- nj_disorderly_persons-set, ca-17b-reduction-set, ca-1203-43-set
   * and az_marijuana_expungement_superior_court-set -- went straight to
   * VERIFIED_PASS carrying completenessStatus FAIL_MISSING_REQUIRED_FACTS and
   * up to four non-zero counters between them. ca-17b-reduction-set alone had
   * 54 known required fields missing, 71 unclassified blanks, 16 required
   * options missing and 3 required components missing.
   *
   * So the completeness measurement is consulted first, and a plain PASS can
   * only reach VERIFIED_PASS on a family whose nine counters are zero. A
   * measured failure is never outranked by anyone's opinion, least of all the
   * builder's own.
   */
  else if (comp && !nineZero) state = "FAIL_REPAIR_REQUIRED";
  /*
   * AND THESE TWO OWE THE VISUAL GATE AS WELL.
   *
   * The independent-verdict branch above was given a raster guard; these two
   * were not, and they reach the same state. Three families walked through
   * here -- az_marijuana_expungement_superior_court-set and
   * nj_disorderly_persons-set on RASTER_PENDING rows, ca-1203-43-set with no
   * raster row at all -- and F30 and L6 both caught them, which is the gates
   * doing their job and the state machine still needing to be caught.
   *
   * Guarding one entrance to a state and not the others is not a guard. It is
   * where a repaired family whose bytes just moved goes to look proven.
   */
  else if (verdict?.verdict === "PASS" && comp && nineZero
    && rasterPassByFamily.get(familyId) !== true) state = "VERIFY_PENDING";
  else if (verdict?.verdict === "PASS" && !comp
    && rasterPassByFamily.get(familyId) !== true) state = "VERIFY_PENDING";
  else if (verdict?.verdict === "PASS" && comp && nineZero) state = "VERIFIED_PASS";
  else if (verdict?.verdict === "PASS" && !comp) state = "VERIFIED_PASS";
  else if (comp && nineZero) state = "VERIFY_PENDING";
  /*
   * A legally blocked family is not source-blocked.
   *
   * Both used to collapse into SOURCE_BLOCKED, which was harmless while every
   * legally blocked family also lacked its sources. It stopped being harmless
   * the moment thirteen families whose sources bind exactly were held for an
   * unresolved legal question: the completeness verifier then reported them as
   * blocked with no readiness reason, because there is none -- their bytes are
   * held. Calling them source-blocked would have sent the conveyor after
   * documents it already has.
   */
  else if (legalBlocked) state = "LEGAL_BLOCKED";
  else if (!readiness.ready) state = "SOURCE_BLOCKED";
  else if (notAFamily) state = "SOURCE_BLOCKED";
  else if (independentReturn?.verdict === "BLOCKED_BEFORE_CLAIM") state = "VERIFY_PENDING";
  else state = "SOURCE_READY";

  /* A product/permission decision is downstream of completed source identity
   * and upstream of build. It must not be mislabeled as another acquisition,
   * and it must not override a later build, repair or verification result. */
  if (sourceReconciliation?.disposition === "PRODUCT_PATH_PENDING"
    && ["SOURCE_BLOCKED", "SOURCE_READY"].includes(state)) state = "PRODUCT_PATH_PENDING";

  families.push({
    familyId,
    worklistGroupId: f.worklistGroupId,
    jurisdiction: (f.jurisdictions ?? []).join("/"),
    routeKeys: routes.map((r) => r.routeKey),
    routeCount: routes.length,
    implementationStrategy: strategy,
    packetComponents: components,
    instrumentKinds,
    officialFormFamily: forms.join("+") || "NONE",
    forms,
    sourceIds,
    sourceHashes,
    sourceStatus,
    sourceBound,
    sourceReadiness: readiness,
    sourceReconciliation: sourceReconciliation
      ? {
          group: sourceReconciliation.group,
          disposition: sourceReconciliation.disposition,
          exactNextAction: sourceReconciliation.exactNextAction,
          exactResidual: sourceReconciliation.exactResidual ?? null,
          permissionHold: sourceReconciliation.permissionHold ?? null,
          productQuestion: sourceReconciliation.productQuestion ?? null,
          sourceReplacements: sourceReconciliation.sourceReplacements ?? null,
          determinationInput: INPUTS.sourceDeterminations
        }
      : null,
    verifierSourceHold,
    selectedIndependentVerdict: independentReturn
      ? {
          verdict: independentReturn.verdict,
          lane: independentReturn.lane,
          verifiedAtBase: independentReturn.verifiedAtBase ?? null,
          evidencePath: independentReturn.evidencePath ?? null
        }
      : null,
    rasterEnrolmentRefusal: rasterNotEligible.get(familyId) ?? null,
    legalInputStatus: legalBlocked ? "OPEN_LEGAL_INPUT" : "SETTLED",
    /* Carried on the row so a reader sees the refusal and its grounds where the
     * state is, rather than having to know a separate decision file exists. */
    ownerDeliveryTypeRefusal: deliveryTypeRefusal
      ? {
          decisionId: deliveryTypeRefusal.decisionId,
          decidedOn: deliveryTypeRefusal.decidedOn,
          decisionOwner: deliveryTypeRefusal.decisionOwner,
          decision: deliveryTypeRefusal.decision,
          consequences: deliveryTypeRefusal.consequences ?? [],
          commercialEligibility: "REMOVED",
          checkout: "DISABLED"
        }
      : null,
    /* A TERMINAL STATE IS NOT A VERIFIED ONE.
     *
     * The four terminal states are reached from a registered treatment whose
     * own independent read is still open, and a reader holding only this queue
     * would otherwise see GUIDANCE_READY with nothing beside it to say the
     * treatment has not been checked by anyone but its author. Carried here so
     * the caveat travels with the state instead of living in a file the reader
     * may not open. */
    /* Why a passing verdict stopped counting, carried where the state is. Only
     * packet/source lapse returns a PASS to VERIFY_PENDING. Missing raster proof
     * leaves the verdict current and uses BUILT_RASTER_PENDING instead. */
    verificationLapsedBecause: (independentReturn?.verdict === "PASS_COMPLETE_INDEPENDENT"
      && state === "VERIFY_PENDING")
      ? (boundSourceDriftedSinceVerdict(directory)
          ? { lapse: "BOUND_SOURCE_DRIFTED", ...boundSourceDriftedSinceVerdict(directory),
              meaning: "The receipt pins this record by SHA-256 and the bytes on disk no longer match it, so SOURCE_IDENTITY as verified no longer holds. Usually a re-pin; a rebuild when an anchor the packet names has left the source." }
          : { lapse: "FAMILY_MOVED_SINCE_THE_VERDICT",
              meaning: "The packet's own artefacts or its build script changed after the verdict was read, so the verdict describes bytes that no longer exist." })
      : null,
    terminalTreatment: terminalTreatment
      ? {
          treatment: terminalTreatment.terminalTreatment,
          authorizingRecord: terminalTreatment.authorizingRecord ?? null,
          treatmentWasReadNotChosen: terminalTreatment.treatmentReadNotChosen ?? null,
          independentVerification: terminalTreatment.independentVerification?.state
            ?? "pending_independent_verification_of_the_treatment",
          theRefusalIsStillInForce: true,
          opensNothing: "No terminal treatment opens a route, restores a packet or enables checkout."
        }
      : null,
    /* Where the hold came from, so a reader can tell a counsel-queue route key
     * from a lane that tried to build the family and hit a legal wall. */
    legalInputBasis: (executionReclassification || holdReclassification) ? null
      : (ownerCorrection && !ownerCorrectionAwaitsReread) ? "OWNER_CORRECTION_REQUIRED"
      : laneHold ? "LANE_RETURN_BLOCKED_LEGAL_INPUT"
      : routes.some((r) => openCounselRoutes.has(r.routeKey)) ? "OPEN_COUNSEL_QUESTION"
        : (verdict?.verdict === "BLOCKED_LEGAL_APPROVAL_INPUT" && wave2Legal?.superseded !== true) ? "LEGAL_APPROVAL_VERDICT" : null,
    /* Present on every family the wave-2 ledger blocked, whether or not a later
     * read outranked it, so the reason a block stands is as readable as the
     * reason one lifted. */
    wave2LegalBlock: wave2Legal,
    ownerCorrectionRequired: ownerCorrection,
    legalHoldReclassification: holdReclassification
      ? { ...holdReclassification, decisionRecord: LEGAL_HOLD_RECLASSIFICATION }
      : null,
    laneReturnLegalHold: laneHoldNarrowed,
    executionReclassification,
    executionOwner: executionReclassification?.executionOwner ?? holdReclassification?.executionOwner ?? null,
    nextExecutableAction: executionReclassification?.nextExecutableAction ?? holdReclassification?.nextExecutableAction ?? null,
    routeMappingStatus: routeMappingOpen
      ? (executionReclassification ? "OWNER_DIRECTED_MAPPING_PENDING" : "UNBOUND_TO_A_PACKET_FAMILY")
      : "BOUND",
    artifactStatus: artifactPresent ? "RENDERED" : "NOT_RENDERED",
    completenessStatus,
    allNineCountersZero: nineZero,
    counters: comp?.counters ?? null,
    failingCounters: comp ? Object.entries(comp.counters).filter(([, v]) => v > 0).map(([k]) => k) : [],
    failedObligationNames: independentFail ? independentReturn?.failedObligationNames ?? [] : [],
    failedObligations: independentFail ? independentReturn?.failedObligations ?? [] : [],
    continuationResult: cont?.resultAfter ?? null,
    c11Stopped: c11Stopped.has(familyId),
    state,
    activeOwner,
    activeOwnerLane,
    buildScript,
    buildScriptExists,
    sharedBuildHost: buildScriptExists
      ? (transitiveImportsOf(path.basename(buildScript)).find((d) => importersOf(d).length > 1) ?? null)
      : null,
    directory,
    ownedPaths: [`${directory}/**`, buildScript],
    prohibitedPaths: []
  });
}

/* Shared-host ownership: a family-specific script may be owned only when no
 * unassigned family imports it. Computed after every record exists. */
const familyByScript = new Map(families.map((f) => [path.basename(f.buildScript), f]));
const familyIndex = new Map(families.map((f) => [f.familyId, f]));
for (const f of families) {
  const base = path.basename(f.buildScript);
  const importers = importersOf(base).map(familyOfScript);
  f.importedBy = importers;
  f.exclusiveScript = importers.length === 0;
}

/* ---------------------------------------------------------------- *
 * Populations
 * ---------------------------------------------------------------- */
/*
 * A returned verdict outranks an active-owner claim — in the DISPATCH too,
 * not only in the state machine. The active-lane roster is static records,
 * and SDV01 kept "holding" sd_arrest_expungement-set months after returning
 * its FAIL, so the family was failed, unowned in the ledger, and dispatched
 * to no repair lane at once. The claim ledger is the ground truth for
 * ownership: a failed family with no LIVE claim on it is dispatchable.
 */
const liveClaimLanesByFamily = new Map();
const liveRepairClaimLaneByFamily = new Map();
try {
  const led = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/claim-ledger.json`), "utf8"));
  for (const c of led.claims ?? []) {
    if (c.released === true) continue;
    for (const fid of c.familyIds ?? (c.familyId ? [c.familyId] : [])) {
      if (!liveClaimLanesByFamily.has(fid)) liveClaimLanesByFamily.set(fid, new Set());
      liveClaimLanesByFamily.get(fid).add(c.lane);
      if (c.subjectType === "packet-family" && c.operation === "rapid-repair")
        liveRepairClaimLaneByFamily.set(fid, c.lane);
    }
  }
} catch { /* no ledger yet */ }
/*
 * A Captain-transferred repair claim can intentionally outlive the generator's
 * current FIX packing. It is still executable: claim.mjs accepts the lane, and
 * replacing it before its worker returns is double-dispatch. Carry that live
 * claim as active ownership so the ordinary packer leaves it alone.
 */
for (const f of families) {
  const lane = liveRepairClaimLaneByFamily.get(f.familyId);
  const numbered = /^FIX(\d+)$/.exec(lane ?? "");
  const outsideGeneratedPacking = numbered && Number(numbered[1]) > FIX_LANES_ELASTIC;
  if (!f.activeOwner && f.state === "FAIL_REPAIR_REQUIRED" && outsideGeneratedPacking) {
    f.activeOwner = lane;
    f.activeOwnerLane = "rapid-repair";
    f.activeOwnershipBasis = "the live Captain-transferred repair claim remains authoritative until it is released";
  }
}
/* The roster owner holds the family only while its own claim is alive (or the
 * family carries no returned FAIL). A live claim held by a DIFFERENT lane —
 * the repair grant this dispatch itself minted last run — is that lane's
 * ownership, not the roster's, and must not swallow the family back out of
 * the dispatch (that is the flap this comment is the tombstone of).
 *
 * VERIFY_PENDING does not belong in this rule AS A BLANKET, and it was tried.
 * Eight families -- sd_arrest_expungement-set and the seven wa_vac families --
 * are VERIFY_PENDING under a roster owner with no live ledger claim, so they
 * look exactly like the stale case above and nothing in the factory can read
 * them. Adding VERIFY_PENDING here does free them, and then C7 and E2 both go
 * red:
 * the wa_vac seven are owned by WARV01/WARV02, the Washington re-verification
 * lanes provisioned for precisely this second read, so a factory VF grant on
 * top is a real double-ownership rather than a rescue. A family waiting on a
 * lane that has not launched is not the same as a family waiting on nobody,
 * and only the second is this rule's business.
 *
 * THAT PREMISE HAS SINCE EXPIRED, AND IT IS MEASURED HERE RATHER THAN ASSUMED.
 * WASHINGTON_REPAIR.json records WARV01 and WARV02 as RETIRED_NEVER_EXECUTED;
 * they hold no claim, appear in no dispatch, and provision nothing. Meanwhile
 * P2V01, P2V02 and P2V03 have RETURNED -- their rows.json sit in
 * data/rcap-grade-a/codex-cloud/ and their verdicts are already extracted --
 * and FIX03 through FIX06 then repaired the families those verdicts failed. So
 * five wa_vac families are parked under readers that finished days ago, behind
 * re-readers that were retired before they ran. They are not waiting on a lane
 * that has not launched. They are waiting on nobody, which is the case this
 * rule exists for.
 *
 * A returned lane is therefore released PER FAMILY, on evidence the lane
 * itself produced: its return directory exists and names this family, and the
 * ledger holds no live claim for the family on that lane. SDV01 satisfies
 * neither -- it has no return directory at all -- so sd_arrest_expungement-set
 * stays exactly where it is. The rule frees what returned and holds what did
 * not, which is the distinction the paragraph above was drawing all along. */
const returnedRosterLanes = (() => {
  const byLane = new Map();
  const base = path.join(ROOT, "data/rcap-grade-a/codex-cloud");
  let dirs = [];
  try { dirs = fs.readdirSync(base); } catch { return byLane; }
  for (const a of ACTIVE_LANES) {
    const slug = String(a.assignmentId).toLowerCase().replace(/_/g, "-");
    const dir = dirs.find((d) => slug.startsWith(d) || d.startsWith(slug.split("-")[0] + "-"));
    if (!dir) continue;
    const rowsPath = path.join(base, dir, "rows.json");
    if (!fs.existsSync(rowsPath)) continue;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(rowsPath, "utf8")); } catch { continue; }
    const read = new Set();
    for (const r of doc.rows ?? []) { const id = r.itemId ?? r.familyId; if (id) read.add(id); }
    if (read.size) byLane.set(a.assignmentId, { dir, read });
  }
  return byLane;
})();
const rosterLaneHasReturnedThisFamily = (f) => {
  const ret = returnedRosterLanes.get(f.activeOwner);
  return Boolean(ret?.read.has(f.familyId))
    && !(liveClaimLanesByFamily.get(f.familyId)?.has(f.activeOwner));
};
const ownerStillHolds = (f) => f.activeOwner
  && !(f.state === "WRONG_DELIVERY_TYPE" && f.activeOwnerLane === "independent-verification")
  && !(f.state === "FAIL_REPAIR_REQUIRED" && !(liveClaimLanesByFamily.get(f.familyId)?.has(f.activeOwner)))
  && !rosterLaneHasReturnedThisFamily(f);
/* Ended ownership is cleared on the row itself, so every downstream reader —
 * the dispatch packers, F4's collision sweep, the checkpoint — sees one
 * consistent answer. The roster's name survives as staleRosterOwner. */
for (const f of families) {
  if (f.activeOwner && !ownerStillHolds(f)) {
    f.staleRosterOwner = f.activeOwner;
    f.whyTheRosterOwnerNoLongerHolds = rosterLaneHasReturnedThisFamily(f)
      ? `${f.activeOwner} returned a verdict for this family in data/rcap-grade-a/codex-cloud/${returnedRosterLanes.get(f.activeOwner).dir}/rows.json and holds no live claim on it; a lane that has returned is not still verifying`
      : "the roster names an owner the ledger does not back on a family carrying a returned FAIL";
    f.activeOwner = null;
    f.activeOwnerLane = null;
  }
}
const active = families.filter((f) => f.activeOwner);
const guidance = families.filter((f) => f.state === "LEGITIMATE_GUIDANCE_ONLY");
const remaining = families.filter((f) => !f.activeOwner && f.state !== "LEGITIMATE_GUIDANCE_ONLY");
const sourceReady = remaining.filter((f) => f.state === "SOURCE_READY");
const sourceBlocked = remaining.filter((f) => f.state === "SOURCE_BLOCKED" && f.legalInputStatus !== "OPEN_LEGAL_INPUT");
const legalBlocked = remaining.filter((f) => f.state === "LEGAL_BLOCKED");
/*
 * Verification work is represented by the verification state, not by an owner
 * product refusal. WRONG_DELIVERY_TYPE says the current instrument may not
 * ship and awaits the owner's replacement treatment. A second read of already
 * passed bytes cannot choose that treatment, and counting the refusal here made
 * the denominator claim one VERIFY_PENDING family while no family row had that
 * state. It also emitted a verifier assignment whose central claim was already
 * released. A later repair or rebuild will move the family to VERIFY_PENDING
 * through the ordinary byte-lapse guards when a new artifact actually exists.
 */
const verifyPending = remaining.filter((f) => f.state === "VERIFY_PENDING");
const repairRequired = remaining.filter((f) => f.state === "FAIL_REPAIR_REQUIRED");

/*
 * Elastic capacity, measured rather than asserted.
 *
 * The verification queue is every family awaiting an independent reading, and
 * that is the ones nobody holds PLUS the ones a verifier already has. Sizing
 * the roster on the unclaimed half alone under-provisions exactly when the
 * queue is deepest: twelve pending beside ten in flight is twenty-two families
 * of verification work, not twelve.
 */
const verifyingNow = families.filter((f) => f.state === "VERIFYING" || f.activeOwnerLane === "independent-verification");
const VERIFY_QUEUE = verifyPending.length + verifyingNow.length;
const REPAIR_QUEUE = repairRequired.length + families.filter((f) => f.state === "FAIL_REPAIR_REQUIRED").length - repairRequired.length;
const BUILD_QUEUE = sourceReady.length;
const ELASTICITY = [
  { id: "verification", rule: `VERIFY_PENDING > ${VERIFY_ELASTIC_THRESHOLD}`, measured: VERIFY_QUEUE,
    measuredAs: `${verifyPending.length} awaiting a verifier + ${verifyingNow.length} already held by one`,
    threshold: VERIFY_ELASTIC_THRESHOLD, triggered: VERIFY_QUEUE > VERIFY_ELASTIC_THRESHOLD,
    lanesWithout: VF_LANES_BASE, lanesWith: VF_LANES_ELASTIC, creates: ["VF09", "VF10", "VF11", "VF12"] },
  { id: "repair", rule: `FAIL_REPAIR_REQUIRED > ${REPAIR_ELASTIC_THRESHOLD}`, measured: REPAIR_QUEUE,
    measuredAs: `${repairRequired.length} families returned FAIL_REPAIR_REQUIRED and unclaimed`,
    threshold: REPAIR_ELASTIC_THRESHOLD, triggered: REPAIR_QUEUE > REPAIR_ELASTIC_THRESHOLD,
    lanesWithout: FIX_LANES_BASE, lanesWith: FIX_LANES_ELASTIC, creates: ["FIX05", "FIX06", "FIX07", "FIX08"] },
  { id: "build", rule: `SOURCE_READY > ${BUILD_ELASTIC_THRESHOLD}`, measured: BUILD_QUEUE,
    measuredAs: `${sourceReady.length} families hold every source they need`,
    threshold: BUILD_ELASTIC_THRESHOLD, triggered: BUILD_QUEUE > BUILD_ELASTIC_THRESHOLD,
    lanesWithout: PF_LANES_BASE, lanesWith: PF_LANES_ELASTIC,
    creates: ["PF17", "PF18", "PF19", "PF20", "PF21", "PF22", "PF23", "PF24"] }
];
const laneCount = (id) => { const e = ELASTICITY.find((x) => x.id === id); return e.triggered ? e.lanesWith : e.lanesWithout; };
const VF_LANES = laneCount("verification");
const FIX_LANES = laneCount("repair");
let packetClaimsForPacking = [];
try {
  packetClaimsForPacking = JSON.parse(
    fs.readFileSync(path.join(ROOT, `${OUT_DIR}/claim-ledger.json`), "utf8")
  ).claims ?? [];
} catch { /* no ledger yet */ }
const livePacketLane = livePacketLaneByFamily(packetClaimsForPacking);
const PF_LANES = effectivePacketLaneCount(laneCount("build"), livePacketLane);

/* ---------------------------------------------------------------- *
 * Grouping and lane packing
 * ---------------------------------------------------------------- */
const groupKeyOf = (f) => [f.sharedBuildHost ?? "NO_SHARED_HOST", f.officialFormFamily, f.implementationStrategy, f.instrumentKinds.join("+") || "NONE"].join("::");
const groupsOf = (pool) => {
  const m = new Map();
  for (const f of pool) {
    const k = groupKeyOf(f);
    if (!m.has(k)) m.set(k, { groupKey: k, families: [] });
    m.get(k).families.push(f);
  }
  return [...m.values()].sort((a, b) => b.families.length - a.families.length || a.groupKey.localeCompare(b.groupKey));
};
const kinds = (g) => new Set(g.families.flatMap((f) => f.instrumentKinds));
const jaccard = (a, b) => {
  const A = kinds(a); const B = kinds(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? 0 : inter / uni;
};
/** Pack whole groups into `laneCount` buckets, similarity-first, size-balanced. */
const packGroups = (pool, laneCount) => {
  const buckets = Array.from({ length: laneCount }, () => []);
  const size = (b) => b.reduce((n, g) => n + g.families.length, 0);
  for (const g of groupsOf(pool)) {
    const smallest = Math.min(...buckets.map(size));
    const candidates = buckets.map((b, j) => ({ j, b })).filter((x) => size(x.b) <= smallest);
    const pick = candidates
      .map((x) => ({ ...x, sim: x.b.length === 0 ? 0 : Math.max(...x.b.map((o) => jaccard(o, g))) }))
      .sort((a, b) => b.sim - a.sim || a.j - b.j)[0];
    buckets[pick.j].push(g);
  }
  return buckets;
};

/* A live packet-build claim pins its family to its lane, exactly as source
 * claims pin theirs: the packer re-deals on every regeneration, and a family
 * whose builder is mid-work must not drift to another lane's dispatch while
 * its grant stays put. Claimed families are placed first, on their claim
 * lanes; only unclaimed families are dealt. */
const pinnedFamilies = new Set(sourceReady.filter((f) => livePacketLane.has(f.familyId)).map((f) => f.familyId));
const pfBuckets = packGroups(sourceReady.filter((f) => !pinnedFamilies.has(f.familyId)), PF_LANES);
for (const f of sourceReady) {
  if (!pinnedFamilies.has(f.familyId)) continue;
  const laneIdx = Number(livePacketLane.get(f.familyId).slice(2)) - 1;
  if (laneIdx >= 0 && laneIdx < pfBuckets.length) pfBuckets[laneIdx].push({ families: [f], host: null, pinnedByClaim: true });
}
/* Any lane over the ceiling sheds its smallest group to the emptiest lane that
 * can take it, unless the group is a single shared-host group that cannot be
 * split without two writers on one script. */
const bucketSize = (b) => b.reduce((n, g) => n + g.families.length, 0);
for (let guard = 0; guard < 60; guard += 1) {
  const over = pfBuckets.findIndex((b) => bucketSize(b) > PF_MAX_FAMILIES);
  if (over < 0) break;
  /* A claim-pinned group is immovable: its grant names its lane. */
  const donor = [...pfBuckets[over]].filter((g) => !g.pinnedByClaim).sort((a, b) => a.families.length - b.families.length)[0];
  if (!donor || pfBuckets[over].length === 1) break;
  const target = pfBuckets
    .map((b, j) => ({ j, size: bucketSize(b) }))
    .filter((x) => x.j !== over && x.size + donor.families.length <= PF_MAX_FAMILIES)
    .sort((a, b) => a.size - b.size)[0];
  if (!target) break;
  pfBuckets[over].splice(pfBuckets[over].indexOf(donor), 1);
  pfBuckets[target.j].push(donor);
}

/* Source lanes: bounded by issuing host and identity class, never by state. */
const blockedBySource = [...sourceBlocked, ...legalBlocked];
const sourceRows = [];
for (const f of blockedBySource) {
  const custody = custodyByGroup.get(f.worklistGroupId);
  const docs = custody?.documentSources ?? [];
  let emitted = 0;
  const boundSourceIds = new Set((f.sourceReadiness?.boundSources ?? []).map((d) => d.sourceId));
  const effectiveUnboundIds = (f.sourceReadiness?.effectiveOfficialSourceIds ?? [])
    .filter((sourceId) => !boundSourceIds.has(sourceId));
  /* The readiness classifier has already applied supersessions, parent /
   * component decisions, and new exact identities. Dispatch that current
   * obligation set first. Falling back to the historical custody rows here
   * used to send Arizona's released 2024 Form 31 claims back to workers while
   * its actual R-26-0001 residual had no owner at all. */
  for (const sourceId of effectiveUnboundIds) {
    const fromReadiness = (f.sourceReadiness?.reasons ?? [])
      .find((reason) => reason.startsWith(`${sourceId}:`)) ?? null;
    emitted += 1;
    sourceRows.push({
      familyId: f.familyId, jurisdiction: f.jurisdiction, sourceId,
      absence: "named_form_number_not_in_corpus", tier: null,
      legalBlocked: f.legalInputStatus === "OPEN_LEGAL_INPUT", fromReadiness
    });
  }
  if (emitted === 0 && (f.sourceReadiness?.effectiveOfficialSourceIds ?? []).length === 0) {
    for (const d of docs) {
      if (d.resolved && EXACT_TIERS.has(d.tier)) continue;
      emitted += 1;
      sourceRows.push({
        familyId: f.familyId, jurisdiction: f.jurisdiction, sourceId: d.sourceId,
        absence: d.absence ?? (d.resolved ? "inexact_tier" : "unresolved"),
        tier: d.tier ?? null, legalBlocked: f.legalInputStatus === "OPEN_LEGAL_INPUT"
      });
    }
  }
  if (emitted === 0) {
    /* A family blocked with no unresolved document source is blocked on a source
     * it NAMES and does not hold: the readiness reasons say which. Every one of
     * them becomes an obligation, because a blocked family with no obligation is
     * a family nobody is working on. */
    for (const reason of (f.sourceReadiness?.reasons ?? ["no document-shaped source named"])) {
      const named = reason.match(/^(official-form:[^:]+):/);
      sourceRows.push({
        familyId: f.familyId, jurisdiction: f.jurisdiction,
        sourceId: named ? named[1] : null,
        absence: named ? "named_form_number_not_in_corpus" : "no_document_shaped_source_named",
        tier: null, legalBlocked: f.legalInputStatus === "OPEN_LEGAL_INPUT", fromReadiness: reason
      });
    }
  }
}
/* One obligation, one row: a family that names the same source twice is one
 * obligation, not two, and a duplicate would be dispatched to two lanes. */
const seenObligation = new Set();
const duplicateObligations = [];
for (let i = sourceRows.length - 1; i >= 0; i -= 1) {
  const key = `${sourceRows[i].familyId}::${sourceRows[i].sourceId ?? "NO_DOCUMENT_SOURCE_NAMED"}`;
  if (seenObligation.has(key)) { duplicateObligations.push(key); sourceRows.splice(i, 1); continue; }
  seenObligation.add(key);
}

/*
 * The source swarm.
 *
 * Four monolithic lanes made every obligation wait behind the slowest one in its
 * class. Sixteen exclusive lanes split the work by CUSTODY OPERATION -- identity,
 * inventory reconciliation, acquisition, promotion -- and then by issuer host
 * inside each, so an obligation moves through four short queues instead of one
 * long one and an exact official URL can be dispatched the moment it is known.
 * SRC01 to SRC04 keep their identifiers and take the reconciliation operation.
 *
 * The operations are ordered but not blocking: DISC hands a URL to ACQ as soon
 * as it has one, SRC can bind a held byte without waiting for any acquisition,
 * and PROMO releases a family the moment its last source is promoted.
 *
 * Six DISC, four SRC, three ACQ, three PROMO. DISC carries six because identity
 * is where the queue actually is -- most blocked families have a label and no
 * document -- and ACQ and PROMO carry three each because their work is bounded
 * by a workflow run and a hash comparison rather than by research.
 */
const SOURCE_OPERATIONS = [
  {
    prefix: "DISC", lanes: 6, operation: "exact-source-identity",
    absence: ["label_does_not_identify_a_document", "no_document_shaped_source_named"],
    mission: "Turn a descriptive label into a document identity: exact form number, official publisher, revision and the official URL it is published at. Resolve against committed inventories; never guess a form number.",
    records: ["official publisher", "exact title", "form number", "revision", "official URL"],
    handsOffTo: "ACQ, the moment an exact official URL is known — do not wait for the rest of this lane",
    bounded: "the issuing court or agency that publishes the document"
  },
  {
    prefix: "SRC", lanes: 4, operation: "held-inventory-reconciliation",
    absence: ["named_form_number_not_in_corpus", "named_content_hash_not_in_corpus"],
    mission: "Reconcile a named form number or pinned content hash against the private corpus and the committed inventory, and bind it by exact SHA-256 where the bytes are already held. A form the corpus already carries needs no acquisition.",
    records: ["custody path", "SHA-256", "byte size", "MIME", "pages", "technology"],
    handsOffTo: "PROMO where the byte is held and binds; DISC where the identity itself turns out to be wrong",
    bounded: "the private corpus and the committed inventory, read only — nothing is fetched here"
  },
  {
    prefix: "ACQ", lanes: 3, operation: "official-acquisition-dispatch",
    absence: [],
    mission: "Prepare the committed manifest row for one already-approved exact official URL. GitHub Actions performs acquisition; this no-egress agent does not dispatch or claim a workflow run.",
    records: ["official URL", "dispatch id", "workflow run", "receipt path"],
    handsOffTo: "PROMO, on the acquired artifact receipt",
    bounded: "one issuing host per lane, so a host that rate-limits blocks only its own lane"
  },
  {
    prefix: "PROMO", lanes: 3, operation: "promotion-and-release",
    absence: ["inexact_tier"],
    mission: "Take an acquired or reconciled artifact, register its custody, promote it into the governed index, and release every family whose last source is now bound. A promotion without exact bytes is refused.",
    records: ["custody path", "SHA-256", "indexed entry", "families released"],
    handsOffTo: "Captain, who assigns every released family to the next available PF lane immediately",
    bounded: "the custody register and the governed corpus index"
  }
];

/** Which operation an obligation belongs to, from its own absence class. */
const operationFor = (row) => {
  /* An inexact corpus tier is reconciliation work, not evidence that an
   * artifact and receipt already exist. PROMO is populated only by a later,
   * explicit handoff carrying those exact inputs. */
  if (row.tier && !EXACT_TIERS.has(row.tier)) return "SRC";
  const op = SOURCE_OPERATIONS.find((o) => o.absence.includes(row.absence));
  return op ? op.prefix : "PROMO";
};

const recordSchemaFor = (prefix) => ({
  DISC: ["itemId", "sourceId", "jurisdiction", "issuingAuthority", "officialTitle", "formNumber", "revision", "officialUrl", "urlKind", "intendedPacketRole", "statewideOrLocal", "familyIds", "evidencePaths", "handoffOperation"],
  SRC: ["itemId", "sourceId", "corpusPath", "title/formNumber", "sha256", "byteSize", "mime", "pageCount", "technology", "matchBasis", "familyIds", "handoffOperation"],
  ACQ: ["itemId", "sourceId", "jurisdiction", "issuingAuthority", "officialUrl", "urlKind", "expectedSha256", "title/formNumber", "manifestEntryId", "familyIds", "dispatchStatus", "handoffState"],
  PROMO: ["itemId", "sourceId", "acquisitionRunId or held-corpus evidence", "artifactName", "receiptPath", "acquiredSha256", "expectedSha256", "comparisonResult", "custodyRecordPath", "inventoryEntryPath", "remainingUnresolvedObligations", "familiesActuallyReleasedNow"]
})[prefix];
/* Inside an operation, N lanes by issuer host. Hosts are sorted and dealt
 * round-robin by total obligation weight so no lane inherits every large host. */
const laneWithinOperation = (rows, laneCount) => {
  const byHost = new Map();
  for (const r of rows) byHost.set(r.jurisdiction || "UNKNOWN", [...(byHost.get(r.jurisdiction || "UNKNOWN") ?? []), r]);
  const hosts = [...byHost.entries()].sort((a, b) => b[1].length - a[1].length);
  const buckets = Array.from({ length: laneCount }, () => []);
  for (const [, rs] of hosts) {
    const smallest = buckets.reduce((best, b, i) => (b.length < buckets[best].length ? i : best), 0);
    buckets[smallest].push(...rs);
  }
  return buckets;
};
for (const row of sourceRows) row.operation = operationFor(row);
/*
 * A live claim pins its obligation to its lane. The round-robin deals hosts
 * afresh every regeneration, so as the obligation set shrinks a claimed
 * obligation would drift to another lane while its grant stays put — the
 * dispatch and the ledger then disagree about who owns the work, which
 * verify-claim-ledger rightly refuses. Only unclaimed rows are re-dealt.
 */
const liveSourceLane = new Map();
try {
  const led = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/claim-ledger.json`), "utf8"));
  for (const c of led.claims ?? []) {
    if (c.subjectType === "source-obligation" && c.released !== true) liveSourceLane.set(c.subjectId, c.lane);
  }
} catch { /* no ledger yet */ }
const obligationItemIdOf = (r) => `${r.familyId}::${r.sourceId ?? "NO_DOCUMENT_SOURCE_NAMED"}`;
for (const op of SOURCE_OPERATIONS) {
  const rows = sourceRows.filter((r) => r.operation === op.prefix);
  const pinned = rows.filter((r) => (liveSourceLane.get(obligationItemIdOf(r)) ?? "").startsWith(op.prefix));
  const pinnedSet = new Set(pinned);
  for (const r of pinned) r.lane = liveSourceLane.get(obligationItemIdOf(r));
  const buckets = laneWithinOperation(rows.filter((r) => !pinnedSet.has(r)), op.lanes);
  buckets.forEach((bucket, i) => {
    for (const r of bucket) r.lane = `${op.prefix}${String(i + 1).padStart(2, "0")}`;
  });
}

/*
 * Who releases a family.
 *
 * A family's obligations do not have to live in one lane: a family may need
 * one identity resolved and one document acquired, and those are different
 * operations. The first cut listed such a family under familiesUnblocked in
 * both lanes, which reads as two promises to release one family and is a
 * duplicate release -- each lane believes it finishes the family, and neither
 * does. Twenty-four families were claimed twice.
 *
 * A family is released by the lane that holds ALL of its remaining
 * obligations, and by no one otherwise. Where the obligations are split, every
 * holding lane advances the family and the release is attributed to the set.
 */
const lanesHoldingFamily = new Map();
for (const r of sourceRows) {
  if (!lanesHoldingFamily.has(r.familyId)) lanesHoldingFamily.set(r.familyId, new Set());
  lanesHoldingFamily.get(r.familyId).add(r.lane);
}
const releaseOwner = new Map();
const splitFamilies = [];
for (const [familyId, lanes] of lanesHoldingFamily) {
  if (lanes.size === 1) releaseOwner.set(familyId, [...lanes][0]);
  else splitFamilies.push({ familyId, lanes: [...lanes].sort() });
}
splitFamilies.sort((a, b) => a.familyId.localeCompare(b.familyId));

/* ---------------------------------------------------------------- *
 * Assignments
 * ---------------------------------------------------------------- */
const FACT = "data/rcap-grade-a/packet-factory-24h";
const VERDICTS = ["PASS_COMPLETE_INDEPENDENT", "FAIL_REPAIR_REQUIRED", "BLOCKED_SOURCE", "BLOCKED_LEGAL_INPUT"];
const CLOUD_PROHIBITED = ["git fetch", "git pull", "git push", "gh ", "git worktree", "git remote add", "git clone"];

/*
 * How to raster, said explicitly.
 *
 * The prompts said "render all page rasters" and never said how. Four lanes
 * reached for pdftoppm or a hardcoded Chromium path and returned STOPPED on a
 * toolchain question the dispatch had left to them. An instruction that names
 * the outcome without naming the means is an invitation to improvise.
 */
const RASTER_RULE = [
  "**A missing Chromium is not a source blocker and it is not a legal blocker.** ENV-RAS01 established that this container cannot resolve or fetch one -- the Playwright CDN answers HTTP 403 from inside Codex. That is an environment fact about the container, not a fact about the packet, and classifying it as BLOCKED_SOURCE would put a packet defect on a record that has none.",
  "Finish every nonvisual obligation. Record the exact SHA-256 of the canonical and boundary PDFs you produced. Return the family `BUILT_RASTER_PENDING`.",
  "`BUILT_RASTER_PENDING` is a factory workflow state and not a launch verdict. It zeroes nothing and waives nothing: visualDefects stays whatever it is, because it records that nobody has looked, not that there is nothing to see. **No packet becomes PASS_COMPLETE without RASTER_PASS.**",
  "The render happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped runner, against the exact bytes your hashes pin. RASTER_PASS sends the family to independent verification; RASTER_FAIL sends it to FIX.",
  "Page rasters go through `scripts/raster/pdf-page-raster.mjs`. It discovers its own browser and calibrates the page-to-pixel mapping against both the paper bounds and stamped marks.",
  "NEVER `pdftoppm`. NEVER `apt-get`. NEVER `playwright install`. The environment refuses package installation and a Poppler fallback is not a fallback, it is a different measurement.",
  "The preflight now gates on the rasterizer resolving a browser it can execute, so a lane that cannot raster learns before it builds rather than after."
];

/* How to claim, said explicitly. The ledger exists; a prompt that does not
 * name it leaves the worker to invent a protocol, which is what VF12 correctly
 * refused to do. */
const shellQuote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
const CLAIM_RULE = (laneId, itemIds = []) => itemIds.length > 0 ? [
  `Assert only these ${itemIds.length} exact famil${itemIds.length === 1 ? "y" : "ies"} before reading or writing family content:`,
  ...itemIds.map((familyId) => `\`node scripts/grade-a-packet-factory-24h/claim.mjs --assert ${laneId} ${shellQuote(familyId)}\``),
  "A non-zero exit is a full stop for that family: report `BLOCKED_BEFORE_CLAIM` naming the exact refusal, and read none of its artifacts.",
  "Do not release a claim in a worker return. Captain releases it centrally after integrating the bounded return."
] : [
  "This lane currently holds no family. Do not launch it and do not invent a family identifier."
];
const SOURCE_CLAIM_RULE = (laneId, itemIds) => [
  `Assert each exact source obligation before reading evidence: \`node scripts/grade-a-packet-factory-24h/claim.mjs --assert ${laneId} <itemId>\``,
  `The committed assignment contains exactly ${itemIds.length} itemIds; iterate those values only. A familyId is metadata and is not a source claim key.`,
  "A non-zero exit stops that row only: record `BLOCKED_BEFORE_CLAIM`, read none of its evidence, and continue with unrelated obligations.",
  `Release each completed obligation independently: \`node scripts/grade-a-packet-factory-24h/claim.mjs --release ${laneId} <itemId>\`.`
];

/*
 * The lane gate and the row gate are different questions, and a prompt that
 * asked one of them for both stopped every lane on its first blocked family.
 *
 * The environment is a LANE question: node, pdf-lib, the corpus, the checkout,
 * private/ ignored. If it fails, nothing in the lane can run and the lane stops.
 * A family's own sources are a ROW question: one family whose bytes do not bind
 * is one BLOCKED_SOURCE row, and the lane continues. The old prompt ran a single
 * named-family preflight under "Before anything else" and demanded a full pass before
 * any work, so the first blocked family took fifteen good ones with it.
 */
const LANE_GATE_COMMAND = `node ${PREFLIGHT} --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA} --assignment ${FACT}/ACTIVE_ASSIGNMENTS.json`;

const ROW_STOP_CONTRACT = {
  laneGate: {
    what: "global environment integrity",
    command: LANE_GATE_COMMAND,
    // Measured from the command directly above, not from a number computed
    // elsewhere. The lane gate has no --family, so family_sources_bind is not
    // applicable and it prints one fewer than the row gate; both were stamped
    // with the row gate's number.
    mustReturn: denominatorForCommand(LANE_GATE_COMMAND).mustReturn,
    onFailure: "If it does not, STOP THE LANE: nothing in it can run and no row is written.",
    note: "family_sources_bind reports 'not applicable' here on purpose: it is a row question, asked once per family below."
  },
  rowGate: {
    what: "this family's own sources",
    command: `node ${PREFLIGHT} --family <FAMILY_ID> --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`,
    onFamilySourcesBindFailure: "write a BLOCKED_SOURCE row for that family naming the exact source identity that did not bind, and CONTINUE TO THE NEXT FAMILY.",
    onOpenLegalInput: "write a BLOCKED_LEGAL_INPUT row naming the open input, and CONTINUE TO THE NEXT FAMILY. Never guess a legal answer and never research one.",
    onAnyOtherCheckFailing: "that is a lane-level environment change, not a family defect. Stop the lane and say which check moved."
  },
  everyFamilyGetsExactlyOneRow: "COMPLETED or STOPPED, one row per assigned family, no family missing and none twice. A lane that returns fewer rows than it was assigned families has lost work silently.",
  aStoppedFamilyWritesNothing: "A family you stop must leave its overlay directory byte-for-byte unchanged. A half-built packet that reads as built is worse than one that was never started.",
  theLaneCompletesNormally: "A lane with blocked families still completes. Blocked rows are the finding, not a failure of the lane."
};

const TASK_ISOLATION = [
  "THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.",
  "DO NOT EXECUTE PF01-PF16 IN ONE TASK.",
  "DO NOT EXECUTE ANOTHER PF PROMPT IN THIS CONTAINER."
];

const BUILDER_OBLIGATIONS = [
  "bind every source by exact SHA-256, and stop the family rather than build on a source that does not bind",
  "render canonical and boundary artifacts",
  "include every required component the route names — a document mapped and not rendered is a missing companion form",
  "fill every known required fact",
  "classify every intentional blank against the closed vocabulary",
  "identify a missing participant fact as REQUIRED_BEFORE_FILING, declared explicitly and disclosed in participant-instructions.md",
  "select every route-determined option — a packet built for one statutory route states which route it is",
  "complete every repeating case and offence row, because a partly-filled row reads as finished and is not",
  "leave every protected field blank — participant signature, signature date, certificate of mailing before mailing, court-only and prosecutor-only",
  "generate participant instructions and filing instructions",
  "render all page rasters through scripts/raster/pdf-page-raster.mjs, which discovers its own browser",
  "verify the actual visible writes from the final PDF bytes, not from the finalizer's own report",
  "return all nine completeness counters equal to zero, or return the family as STOPPED with the counter that is not"
];

const base = (id, lane, slug, extra) => ({
  assignmentId: id,
  wave: "packet-factory-24h",
  engine: "Codex Cloud",
  lane,
  environment: "LegalEase Packet Factory",
  executionContract: CONTRACT,
  captainBranch: CAPTAIN_BRANCH,
  workerBranch: "work",
  minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  preflight: extra.items?.length
    ? `node ${PREFLIGHT} --family ${shellQuote(extra.items[0])} --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`
    : `node ${PREFLIGHT} --assignment ${FACT}/ACTIVE_ASSIGNMENTS.json --codex-cloud --minimum-captain-sha ${MINIMUM_CAPTAIN_SHA}`,
  preflightMustReturn: PREFLIGHT_MUST_RETURN,
  /*
   * Only a lane that produces a packet needs to know what happens to its pages.
   *
   * This went on every prompt, so DISC, SRC, ACQ and PROMO each carried a "How
   * to raster" section explaining BUILT_RASTER_PENDING and the central render
   * workflow. None of them opens a PDF: they settle source identity, fetch
   * bytes and write custody records. Instructions a lane cannot act on are not
   * harmless padding -- they are the reason a source worker starts wondering
   * whether a missing browser is its problem, and the whole point of the split
   * is that it is not.
   */
  rasterRule: lane === "packet-build" || lane === "rapid-repair" ? RASTER_RULE : null,
  claimRule: CLAIM_RULE(id, extra.items ?? []),
  prohibitedCommands: CLOUD_PROHIBITED,
  theDiffIsTheReturn: "Commit locally. Leave the final diff for the Codex Cloud interface. There is no PUSHED line in a cloud return.",
  returnDirectory: `${FACT}/${slug}`,
  ...extra
});

const assignments = [];

/* ---- PF01..PF16 ---- */
for (let i = 0; i < PF_LANES; i += 1) {
  const id = `PF${String(i + 1).padStart(2, "0")}`;
  const slug = id.toLowerCase();
  const fams = pfBuckets[i].flatMap((g) => g.families);
  const sharedAxes = ["sharedBuildHost", "officialFormFamily", "implementationStrategy"].filter((ax) => new Set(fams.map((f) => String(f[ax]))).size === 1);
  const scriptsOwned = fams.filter((f) => f.exclusiveScript || f.importedBy.every((imp) => fams.some((x) => x.familyId === imp))).map((f) => f.buildScript);
  const scriptsNotOwned = fams.filter((f) => !scriptsOwned.includes(f.buildScript))
    .map((f) => ({ script: f.buildScript, importedByFamiliesOutsideThisLane: f.importedBy.filter((imp) => !fams.some((x) => x.familyId === imp)) }));
  assignments.push(base(id, "packet-build", slug, {
    mission: fams.length === 0
      ? "This lane is provisioned and empty: no source-ready family remains for it at dispatch time. It starts the moment the source conveyor releases one, and the refill rule below says which."
      : `Build ${fams.length} packet families to the builder contract, one at a time, checkpointing as you go. A family that stops does not stop the lane.`,
    itemKind: "packetFamily",
    itemCount: fams.length,
    items: fams.map((f) => f.familyId),
    provisionedEmpty: fams.length === 0,
    refillRule: "When a source lane releases a family, Captain appends it to the emptiest PF lane and the lane starts it without waiting for the rest of the source lane to finish.",
    sharedAxes,
    groupsCarried: pfBuckets[i].map((g) => ({ groupKey: g.groupKey, families: g.families.map((f) => f.familyId) })),
    familyDetail: fams.map((f) => ({
      familyId: f.familyId, jurisdiction: f.jurisdiction, strategy: f.implementationStrategy,
      forms: f.forms, components: f.packetComponents.length, instrumentKinds: f.instrumentKinds,
      routeCount: f.routeCount, directory: f.directory, buildScript: f.buildScript,
      sharedBuildHost: f.sharedBuildHost, sourceStatus: f.sourceStatus, sourceHashes: f.sourceHashes
    })),
    builderObligations: BUILDER_OBLIGATIONS,
    rowStopContract: ROW_STOP_CONTRACT,
    taskIsolation: TASK_ISOLATION,
    checkpointRule: "Return every five completed families, or every two hours, whichever comes first. Do not hold a whole assignment back for the last family.",
    neverSelfVerify: "You do not verify your own packets. A builder verdict is not a verdict, and a VF lane that did not build them decides.",
    ownedPaths: [`${FACT}/${slug}/**`, ...fams.map((f) => `${f.directory}/**`), ...scriptsOwned],
    scriptsNotOwned,
    prohibitedPaths: [
      "scripts/rcap-packet-completeness/**",
      `${LC}/**`,
      ...scriptsNotOwned.map((s) => s.script),
      ...activePaths.map((p) => p.path)
    ],
    requiredOutputs: [
      `${FACT}/${slug}/rows.json — one row per family: itemId, status, the nine counters, and the artifacts produced`,
      `${FACT}/${slug}/checkpoints.json — one entry per five-family checkpoint, written as it lands`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
    focusedTests: fams.map((family) =>
      `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${shellQuote(family.familyId)}`),
    stopConditions: [
      "ROW STOP — a family whose source does not bind by exact SHA-256 is STOPPED as BLOCKED_SOURCE naming the identity that failed. Continue to the next family.",
      "ROW STOP — a family that needs a legal input you do not have is STOPPED as BLOCKED_LEGAL_INPUT. Never guess a legal answer and never research one.",
      "LANE STOP — you build only the families listed here, in only the paths listed here.",
      "NEVER invent a fact. An unavailable fact is REQUIRED_BEFORE_FILING, declared and disclosed, never guessed.",
      "NEVER commit a private source byte, and never write into private/.",
      "NEVER open a commercial route and never touch Production."
    ],
    returnFormat: [
      "ASSIGNMENT:", "BASE SHA:", "COMMIT:",
      "FAMILIES ASSIGNED:", "ROWS RETURNED (must equal FAMILIES ASSIGNED):",
      "FAMILIES COMPLETED:", "FAMILIES STOPPED:", "NINE COUNTERS ZERO ON:",
      "BLOCKED_SOURCE:", "BLOCKED_LEGAL_INPUT:",
      "OVERLAY DIRECTORIES TOUCHED BY A STOPPED FAMILY: 0",
      "CHECKPOINTS RETURNED:", "PACKETS SELF-VERIFIED: 0",
      "OTHER PF PROMPTS EXECUTED IN THIS CONTAINER: 0",
      "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
      `PREFLIGHT: ${mustReturnFor("packet-build").replace(": ", " ")}`, "DIFF LEFT FOR THE CODEX UI: YES"
    ],
    grantsNothing: "A built family is a built family. It is not verified, not approved, not sellable."
  }));
}

/* ---- VF01..VF08 ---- */
/*
 * THE ROUND-ROBIN MUST FOLLOW A LIVE GRANT, NOT FIGHT IT.
 *
 * This dealt families to verification lanes by index alone --
 * `pool.filter((_, j) => j % VF_LANES === i)` -- and took no account of which
 * lane already holds a live grant on a family. The source lanes have respected
 * live claims for a while ("a live claim pins its obligation to its lane"); the
 * verification deal never did.
 *
 * The result is a dispatch that names work its lane cannot take. A live grant
 * is owned and this generator will not re-pack it, so when the index deal put a
 * family on VF01 while VF06 held it live, VF01's assert answered exit 8
 * GRANTED_ELSEWHERE and VF06 was not the lane anyone launched. FABLE-VA1 hit it
 * on six of its seven families; measured across the whole dispatch, 69 of 80
 * VERIFY_PENDING families were in that state — unreachable, not for want of a
 * verifier but because two records disagreed about which lane owned them.
 *
 * So each lane is seeded FIRST with the families it already holds live, and the
 * unheld remainder is dealt round-robin over the leftover capacity. The ledger
 * decides ownership; the deal only fills the gaps.
 */
const liveVerificationLaneOf = (() => {
  const m = new Map();
  try {
    const led = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/claim-ledger.json`), "utf8"));
    for (const c of led.claims ?? []) {
      if (c.released === true || c.laneKind !== "independent-verification") continue;
      for (const f of c.familyIds ?? (c.familyId ? [c.familyId] : [])) {
        if (f && ["VERIFY_PENDING", "VERIFYING"].includes(familyIndex.get(f)?.state)) m.set(f, c.lane);
      }
    }
  } catch { /* no ledger yet; the deal is a plain round-robin */ }
  return m;
})();
const VF_IDS = Array.from({ length: VF_LANES }, (_, i) => `VF${String(i + 1).padStart(2, "0")}`);
const heldByLane = new Map(VF_IDS.map((id) => [id, []]));
const unheldPool = [];
for (const f of verifyPending) {
  const lane = liveVerificationLaneOf.get(f.familyId);
  if (lane && heldByLane.has(lane)) heldByLane.get(lane).push(f.familyId);
  else unheldPool.push(f.familyId);
}
/*
 * A LIVE GRANT PINS THE LANE; THE CURRENT STATE STILL DECIDES WHETHER WORK IS
 * OWED.
 *
 * The loop above walks verifyPending, so a lane holding a live grant on a
 * family in any other state contributes nothing to its own seed list. A live
 * grant used to override that and force even COMPLETE_PACKET_PROVEN families
 * back into the dispatch, which preserved two stale VF08 grants indefinitely:
 * F24 saw grant and dispatch agree and therefore had no mismatch to report.
 *
 * A legitimate reread first enters VERIFY_PENDING because its packet, source,
 * or raster evidence changed; a claimed read is VERIFYING. The ledger then
 * pins that current work to its holder. The grant is authority to perform work,
 * not authority to manufacture work the state machine says is finished.
 */
const seededAlready = new Set([...heldByLane.values()].flat());
for (const [familyId, lane] of liveVerificationLaneOf) {
  if (seededAlready.has(familyId) || !heldByLane.has(lane)) continue;
  heldByLane.get(lane).push(familyId);
  seededAlready.add(familyId);
}
const dealt = new Map(VF_IDS.map((id) => [id, []]));
unheldPool.forEach((familyId, j) => dealt.get(VF_IDS[j % VF_LANES]).push(familyId));

const verifiablePool = [...verifyPending];
for (let i = 0; i < VF_LANES; i += 1) {
  const id = `VF${String(i + 1).padStart(2, "0")}`;
  const slug = id.toLowerCase();
  const seedItems = [...heldByLane.get(id), ...dealt.get(id)];
  /* A verifier with nothing to inspect must not be launched: its checkout would
   * predate the packet commit it exists to read, and it would verify an artifact
   * that is not there yet. It is PROVISIONED and started by Captain on the first
   * integrated checkpoint that gives it families. */
  const launchable = seedItems.length > 0;
  assignments.push(base(id, "independent-verification", slug, {
    mission: "Verify returned packet families independently, in rolling checkpoints, as builders land them. You claim, you measure, you record a verdict. You never edit what you verify.",
    itemKind: "streamingClaim",
    itemCount: seedItems.length,
    items: seedItems,
    seedItemsAreNotTheWholeJob: "These are the families already complete and awaiting verification at dispatch. The rest arrive as PF checkpoints land; claim from the ledger.",
    /*
     * A verifier reads a packet commit. If that commit is not in its checkout,
     * it does not verify a packet -- it verifies the absence of one, and the
     * absence looks exactly like a defect. So an empty verifier is never
     * launched, and a launched one names the commit its seed packets exist at.
     */
    launchNow: launchable,
    launchRule: launchable
      ? `Launch now. Every seed family below is rendered at ${MINIMUM_CAPTAIN_SHA}, which your checkout must contain.`
      : "DO NOT LAUNCH YET. This lane is provisioned and holds no family. Captain launches it from a new HEAD on the first integrated checkpoint that gives it work. Started now, it would report an absent packet as a failing one.",
    /*
     * The commit a verifier READS is not the wave's minimum ancestor.
     *
     * This was MINIMUM_CAPTAIN_SHA, which is the floor every lane proves it
     * contains -- an old commit, from before any packet in this wave was
     * integrated. So every launchable verification lane named a commit at
     * which the directories it was sent to read do not exist, and a verifier
     * checking out that commit verifies an absence. An absence reads as a
     * defect, which is the one failure mode F20 exists to prevent, and F20 was
     * red on it across four Captain heads.
     *
     * The packets exist at the generation head, so that is what a verifier is
     * pointed at.
     */
    verifiesCommit: launchable ? PACKET_COMMIT : null,
    packetDirectories: seedItems.map((f) => familyIndex.get(f)?.directory).filter(Boolean),
    mayNotBeRunBy: [
      "the worker that built or last repaired any family below",
      "any PF or FIX lane in this dispatch"
    ],
    independenceIsThreeWay: "Not the builder, not the repairer, not a shard that has already formed a view of these packets. A second reading by the same eyes is not an independent one.",
    claimLedger: `${FACT}/claim-ledger.json`,
    /*
     * No lane-specific claim prose. This lane used to carry its own sentence
     * about claiming atomically, which read as a protocol and named no
     * mechanism -- so VF12 went looking for a ledger, found none, and stopped.
     * It was right. One mechanism, stated once in the shared base, is the whole
     * point; a lane that restates it in its own words is a second mechanism.
     */
    whyOneClaimMechanism: "Two verifiers on one family is duplicate work reported as independent proof. The ledger cannot express it, and the assert above is the only way to find out whether this lane holds a family.",
    checkpointRule: "Take rolling five-to-ten-family checkpoints as soon as they land. Do not wait for a whole builder assignment.",
    proofObligations: [
      "ROUTE IDENTITY: the packet is built for the route the record names",
      "SOURCE IDENTITY: every source binds by exact SHA-256, recomputed from the bytes",
      "COMPONENT SET: every component the route names is rendered and present",
      "KNOWN PREFILLS: every known required fact is written and visible on the page it belongs to",
      "REQUIRED_BEFORE_FILING: every declared item is named in participant-instructions.md, checked against the file",
      "ROUTE OPTIONS: every route-determined election is selected",
      "REPEATING ROWS: no row carries written cells beside required cells left blank",
      "PROTECTED FIELDS: no signature, signature date, certificate of mailing, court-only or prosecutor-only field carries ink",
      "ARTIFACTS: canonical and boundary bytes hash to what the record names",
      "PAGE ORDER: the rendered page order matches the packet manifest",
      "CLIPPING AND OVERLAP: no ink outside a measured write box",
      "FILING DESTINATION: the instructions name the court or agency the route names",
      "FEE AND WAIVER: the fee and any waiver route are stated",
      "SERVICE: who must be served, and how",
      "SELF-HELP STOP: the packet states where self-help ends"
    ],
    verdicts: VERDICTS,
    verdictRule: `Exactly one of ${VERDICTS.join(", ")} per family. PASS_COMPLETE_INDEPENDENT requires all nine counters zero, measured here rather than read from the builder's report.`,
    independenceRule: "You did not build these families and you may not repair them. A defect you find is a verdict and a repair assignment, never an edit.",
    ownedPaths: [`${FACT}/${slug}/**`],
    prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", "scripts/rcap-packet-completeness/**", `${LC}/**`, ...activePaths.map((p) => p.path)],
    requiredOutputs: [
      `${FACT}/${slug}/rows.json — one row per family claimed: itemId, verdict, the fifteen proof obligations as you measured them, and the evidence read`,
      `${FACT}/${slug}/repair-assignments.json — every FAIL_REPAIR_REQUIRED, with the decisive defect and the exact failed proof obligations`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: VERDICTS, rule: "An unrecognised verdict is refused at integration rather than translated." },
    focusedTests: seedItems.map((familyId) =>
      `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family ${shellQuote(familyId)}`),
    stopConditions: [
      "LANE STOP — you write into no overlay directory and no build script.",
      "LANE STOP — you claim before you read.",
      "ROW STOP — a family blocked by its source is BLOCKED_SOURCE and one blocked by an open legal input is BLOCKED_LEGAL_INPUT. Neither is a FAIL and neither is a PASS."
    ],
    returnFormat: [
      "ASSIGNMENT:", "BASE SHA:", "COMMIT:",
      "FAMILIES CLAIMED:", "PASS_COMPLETE_INDEPENDENT:", "FAIL_REPAIR_REQUIRED:",
      "BLOCKED_SOURCE:", "BLOCKED_LEGAL_INPUT:",
      "OVERLAY DIRECTORIES MODIFIED: 0",
      "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
      `PREFLIGHT: ${mustReturnFor("independent-verification").replace(": ", " ")}`, "DIFF LEFT FOR THE CODEX UI: YES"
    ],
    grantsNothing: "An independent PASS proves a packet is complete. It approves no output and opens no commercial route."
  }));
}

/* ---- the sixteen-lane source swarm ---- */
/*
 * Release leverage, so a lane knows which of its obligations to settle first.
 *
 * A source lane was handed its obligations grouped by issuer host and ordered
 * by nothing. That is fine for avoiding rate limits and useless for choosing
 * what to do first: one Texas form gates ten families and one Montana form
 * gates one, and a lane working alphabetically cannot tell them apart.
 *
 * Leverage is counted per DOCUMENT, not per obligation row, because acquiring
 * one document releases every family waiting on it. The 2026-08-31 acquisition
 * batch fetched thirty documents successfully and unblocked nothing, because
 * all thirty belonged to jurisdictions already resolved -- there was zero
 * overlap with the 238 documents actually gating the 256 blocked families.
 * Fetch capacity was never the constraint; knowing what to fetch is.
 */
const familiesPerDocument = new Map();
for (const f of sourceBlocked) {
  for (const form of f.forms ?? []) {
    const key = `${f.jurisdiction}|${form}`;
    if (!familiesPerDocument.has(key)) familiesPerDocument.set(key, new Set());
    familiesPerDocument.get(key).add(f.familyId);
  }
}
const leverageOf = (row) => {
  const fam = familyIndex.get(row.familyId);
  if (!fam) return 0;
  return Math.max(0, ...(fam.forms ?? []).map((form) => familiesPerDocument.get(`${fam.jurisdiction}|${form}`)?.size ?? 0));
};

for (const op of SOURCE_OPERATIONS) {
  for (let i = 1; i <= op.lanes; i += 1) {
    const id = `${op.prefix}${String(i).padStart(2, "0")}`;
    const slug = id.toLowerCase();
    const rows = sourceRows.filter((r) => r.lane === id);
    const fams = [...new Set(rows.map((r) => r.familyId))].sort();
    const hosts = [...new Set(rows.map((r) => r.jurisdiction))].filter(Boolean).sort();
    assignments.push(base(id, "source-swarm", slug, {
      operation: op.operation,
      mission: rows.length === 0
        ? `${op.mission} No obligation of this class is queued for this host group at dispatch; the lane starts the moment one arrives.`
        : op.mission,
      itemKind: "sourceObligation",
      /*
       * What the source relationship registry already knows about this backlog.
       *
       * The registry was generated and then read by nobody: zero prompts named
       * it or any of its states, so a DISC worker handed a bundle component
       * would still go hunting for a standalone form that does not exist
       * separately -- which is the exact behaviour the registry was built to
       * stop. A corrected model that never reaches the worker is a corrected
       * document.
       */
      sourceRelationshipRegistry: registrySummary,
      preflightMustReturn: "SOURCE_CONVEYOR_PREFLIGHT_READY",
      itemCount: rows.length,
      items: rows.map((r) => `${r.familyId}::${r.sourceId ?? "NO_DOCUMENT_SOURCE_NAMED"}`),
      itemDetails: rows.map((r) => ({
        itemId: `${r.familyId}::${r.sourceId ?? "NO_DOCUMENT_SOURCE_NAMED"}`,
        sourceId: r.sourceId ?? "NO_DOCUMENT_SOURCE_NAMED",
        jurisdiction: r.jurisdiction,
        familyIds: [r.familyId],
        currentOperation: op.operation,
        requiredInput: op.prefix === "DISC" ? "unresolved exact identity or URL"
          : op.prefix === "SRC" ? "named held-corpus identity or pinned SHA-256"
          : op.prefix === "ACQ" ? "approved exact HTTPS officialUrl in SOURCE_ACQUISITION_MANIFEST.json"
          : "exact artifactName and receiptPath from a named acquisition run or held-corpus evidence",
        handoffOperation: op.prefix === "DISC" ? "ACQ" : op.prefix === "SRC" ? "PROMO" : op.prefix === "ACQ" ? "PROMO" : "CAPTAIN"
      })),
      boundedBy: op.bounded,
      issuingHosts: hosts,
      /* What to settle first. Highest release leverage at the top: the number
       * of currently blocked families waiting on that one document. */
      leverageOrder: [...new Map(rows.map((r) => {
        const fam = familyIndex.get(r.familyId);
        const best = (fam?.forms ?? []).map((form) => ({ form, n: familiesPerDocument.get(`${fam.jurisdiction}|${form}`)?.size ?? 0 }))
          .sort((x, y) => y.n - x.n)[0] ?? null;
        return [best ? `${fam.jurisdiction}|${best.form}` : `${r.familyId}::no-document-named`,
          { document: best ? best.form : "NO_DOCUMENT_SOURCE_NAMED", jurisdiction: fam?.jurisdiction ?? null, familiesWaiting: best ? best.n : 0 }];
      })).values()].sort((x, y) => y.familiesWaiting - x.familiesWaiting).slice(0, 12),
      leverageRule: "Settle the documents at the top of this list first. Leverage is counted per DOCUMENT: acquiring one form releases every family waiting on it, and one form can gate ten families while the next gates one.",
      whatTheLastBatchTaught: "On 2026-08-31 an acquisition batch fetched thirty documents successfully and unblocked zero families — all thirty belonged to jurisdictions already resolved, with no overlap against the 238 documents gating the 256 blocked families. Fetch capacity is not the constraint. Knowing which document to fetch is.",
      // PROSPECTIVE, not achieved: the families this lane WOULD release if every
      // one of its obligations resolved. Nothing here is promoted yet.
      familiesThisLaneWouldRelease: fams.filter((f) => releaseOwner.get(f) === id),
      familiesThisLaneWouldReleaseCount: fams.filter((f) => releaseOwner.get(f) === id).length,
      countIsProspective: true,
      countMeaning: "families this lane would release if all of its obligations resolve. It is not a count of promoted sources and must not be read as one.",
      familiesUnblocked: fams.filter((f) => releaseOwner.get(f) === id),
      familiesUnblockedCount: fams.filter((f) => releaseOwner.get(f) === id).length,
      familiesUnblockedIsProspectiveAlias: "kept so an existing reader does not silently see zero; it means familiesThisLaneWouldRelease and nothing more",
      familiesAdvancedButNotReleasedHere: fams.filter((f) => releaseOwner.get(f) !== id)
        .map((f) => ({ familyId: f, releasedOnlyWhenAllOf: [...lanesHoldingFamily.get(f)].sort() })),
      splitFamilyRule: "A family whose obligations are split across lanes is released by no single lane. You advance it; the family is released when the last of the named lanes clears its share. Reporting it released alone is a duplicate release and is refused at integration.",
      absenceClasses: op.absence,
      everyResolvedSourceRecords: [
        "official publisher", "exact title", "form number", "revision", "official URL",
        "MIME type", "page count", "technology (acroform, xfa, flat)", "SHA-256", "byte size", "custody path"
      ],
      recordsForThisOperation: op.records,
      requiredRecordSchema: recordSchemaFor(op.prefix),
      handsOffTo: op.handsOffTo,
      dispatchImmediately: op.prefix === "DISC"
        ? "The moment you know an exact official URL, hand it to the ACQ lane for this host. Do not hold it until the rest of your obligations resolve."
        : op.prefix === "PROMO"
          ? "The moment a family's last source is promoted, report it released. Captain assigns it to the next available PF lane without waiting for this lane to finish."
          : "Report each resolution as it lands rather than at the end of the lane.",
      acquisitionWorkflow: op.prefix === "ACQ" ? ".github/workflows/rcap-official-source-acquisition.yml" : null,
      oneDispatchPerUrl: op.prefix === "ACQ" ? "One official URL, one dispatch, one receipt. A second dispatch for a URL already dispatched is a duplicate obligation and is refused." : null,
      promotionRule: op.prefix === "PROMO" ? "A source is promoted only with exact bytes: a custody path that exists and a SHA-256 that matches the indexed entry. A promotion without bytes releases a family into a builder that cannot open its source." : null,
      releaseRule: "Prospective release is never actual release. Record familiesActuallyReleasedNow only after every remaining source binds; otherwise it is an empty array.",
      continueAfterFailure: "An obligation that cannot be settled is a STOPPED row. The lane continues to the next one.",
      egressReality: "This environment refuses outbound egress to court and agency hosts. Identity and inventory work runs here; anything needing a fetch is dispatched through the acquisition workflow, never attempted locally and never faked.",
      ownedPaths: [`${FACT}/${slug}/**`, `data/rcap-grade-a/source-acquisition/packet-factory-24h/${slug}/**`],
      prohibitedPaths: [`${OVERLAYS}/**`, "scripts/build-census-v1-*.mjs", `${LC}/**`, "private/**", ...activePaths.map((p) => p.path)],
      requiredOutputs: [
        `${FACT}/${slug}/rows.json — one row per obligation: itemId, status, the identity or receipt, and the families it releases`,
        `data/rcap-grade-a/source-acquisition/packet-factory-24h/${slug}/receipts.json — the eleven recorded fields per resolved source; no body is committed`
      ],
      outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
      focusedTests: ["node scripts/grade-a-packet-factory-24h/verify.mjs"],
      stopConditions: [
        "NEVER guess a form number and never accept an unofficial mirror. A secondary copy does not override an available official original.",
        "NEVER commit a source body, an extracted archive or anything under private/. A receipt carrying an exact hash is the deliverable.",
        "NEVER promote a source without exact bytes. A promotion is a release, and a released family goes to a builder that will try to open the file.",
        "LANE STOP — you build no packet and you touch no overlay directory.",
        "ROW STOP — an obligation that cannot be settled here is STOPPED naming the exact host and the next operation that owns it."
      ],
      returnFormat: [
        "ASSIGNMENT:", "OPERATION:", "BASE SHA:", "COMMIT:",
        "OBLIGATIONS RESOLVED:", "OBLIGATIONS STOPPED:",
        "HANDED OFF:", "FAMILIES RELEASED:",
        "IDENTITIES GUESSED: 0", "SOURCE BODIES COMMITTED: 0", "PROMOTIONS WITHOUT EXACT BYTES: 0",
        "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
        `PREFLIGHT: ${mustReturnFor("source-swarm").replace(": ", " ")}`, "DIFF LEFT FOR THE CODEX UI: YES"
      ],
      grantsNothing: "A bound source is a bound source. It builds nothing, proves nothing and approves nothing."
    }));
  }
}

/* ---- FIX01..FIX04 ---- */
/*
 * Same rule as the verification deal: a live grant decides which lane owns a
 * family, and the round-robin only fills what nothing owns. Four repair
 * families were dispatched to a lane while another held them live, so the named
 * lane's assert would answer exit 8 GRANTED_ELSEWHERE and the holding lane was
 * not the one anyone launched.
 */
const liveRepairLaneOf = (() => {
  const m = new Map();
  try {
    const led = JSON.parse(fs.readFileSync(path.join(ROOT, `${OUT_DIR}/claim-ledger.json`), "utf8"));
    for (const c of led.claims ?? []) {
      if (c.released === true || c.operation !== "rapid-repair") continue;
      for (const f of c.familyIds ?? (c.familyId ? [c.familyId] : [])) if (f) m.set(f, c.lane);
    }
  } catch { /* no ledger yet; the deal is a plain round-robin */ }
  return m;
})();
const FIX_IDS = Array.from({ length: FIX_LANES }, (_, i) => `FIX${String(i + 1).padStart(2, "0")}`);
const fixHeld = new Map(FIX_IDS.map((id) => [id, []]));
const fixUnheld = [];
for (const f of repairRequired) {
  const lane = liveRepairLaneOf.get(f.familyId);
  if (lane && fixHeld.has(lane)) fixHeld.get(lane).push(f);
  else fixUnheld.push(f);
}
const fixDealt = new Map(FIX_IDS.map((id) => [id, []]));
fixUnheld.forEach((f, j) => fixDealt.get(FIX_IDS[j % FIX_LANES]).push(f));

const fixSeed = repairRequired;
for (let i = 0; i < FIX_LANES; i += 1) {
  const id = `FIX${String(i + 1).padStart(2, "0")}`;
  const slug = id.toLowerCase();
  const items = [...fixHeld.get(id), ...fixDealt.get(id)];
  assignments.push(base(id, "rapid-repair", slug, {
    mission: "Repair exactly the proof obligations a verifier failed, on exactly the families it failed them on. Nothing else.",
    itemKind: "packetFamily",
    itemCount: items.length,
    items: items.map((f) => f.familyId),
    seedItemsAreNotTheWholeJob: "These are the families already failing at dispatch. The rest arrive as VF verdicts land.",
    receivesOnly: "the failed families and their exact failed proof obligations",
    doNotRepeatAnalysis: "A repair lane does not repeat broad family analysis. If the failure is not reproducible from the obligations you were given, stop and say so rather than re-deriving the family.",
    reverificationRule: "After repair, the family goes to a verifier that is neither its builder nor its repairer. Captain routes it; you do not choose.",
    detail: items.map((f) => ({
      familyId: f.familyId, directory: f.directory, failingCounters: f.failingCounters, counters: f.counters,
      /* The verifier's own record, carried verbatim: a repair lane fixes the
       * exact obligations a verifier failed, and a dispatch that does not name
       * them hands the lane a family and a shrug. */
      failedObligationNames: f.failedObligationNames ?? [],
      failedObligations: f.failedObligations ?? []
    })),
    ownedPaths: [`${FACT}/${slug}/**`, ...items.map((f) => `${f.directory}/**`), ...items.filter((f) => f.exclusiveScript).map((f) => f.buildScript)],
    prohibitedPaths: ["scripts/rcap-packet-completeness/**", `${LC}/**`, ...activePaths.map((p) => p.path)],
    requiredOutputs: [
      `${FACT}/${slug}/rows.json — one row per family: itemId, status, the obligation repaired, and the nine counters after`
    ],
    outputSchema: { arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"], rule: "An unrecognised status is refused at integration rather than translated." },
    focusedTests: ["node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <familyId>"],
    stopConditions: [
      "LANE STOP — you do not change the completeness contract.",
      "LANE STOP — only the families and obligations handed to you.",
      "ROW STOP — an obligation you cannot repair without re-deriving the family is STOPPED with what is missing.",
      "NEVER invent a fact and never write a protected field."
    ],
    returnFormat: [
      "ASSIGNMENT:", "BASE SHA:", "COMMIT:",
      "FAMILIES REPAIRED:", "FAMILIES STOPPED:", "NINE COUNTERS ZERO ON:",
      "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO",
      `PREFLIGHT: ${mustReturnFor("rapid-repair").replace(": ", " ")}`, "DIFF LEFT FOR THE CODEX UI: YES"
    ],
    grantsNothing: "A repaired family is a repaired family. It must be verified again, by someone who neither built nor repaired it."
  }));
}

for (const a of assignments) a.promptFile = `${PROMPT_DIR}/${a.assignmentId}.md`;
for (const a of assignments.filter((x) => x.itemKind === "sourceObligation")) {
  a.claimRule = SOURCE_CLAIM_RULE(a.assignmentId, a.items);
}

/* ---------------------------------------------------------------- *
 * Collisions
 * ---------------------------------------------------------------- */
const wavePaths = assignments.flatMap((a) => a.ownedPaths.map((p) => ({ lane: a.assignmentId, path: p })));
const collisions = [];
for (const mine of wavePaths) {
  for (const other of activePaths) if (pathsOverlap(mine.path, other.path)) collisions.push({ kind: "ACTIVE_OWNERSHIP", lane: mine.lane, path: mine.path, other: other.lane, otherPath: other.path });
}
for (let i = 0; i < wavePaths.length; i += 1) {
  for (let j = i + 1; j < wavePaths.length; j += 1) {
    if (wavePaths[i].lane === wavePaths[j].lane) continue;
    if (pathsOverlap(wavePaths[i].path, wavePaths[j].path)) collisions.push({ kind: "WITHIN_WAVE", lane: wavePaths[i].lane, path: wavePaths[i].path, other: wavePaths[j].lane, otherPath: wavePaths[j].path });
  }
}
/* A family may be built by one lane and verified by another; a duplicate is a
 * collision only within one kind of work. */
const duplicateFamilies = [];
const byLaneKind = new Map();
for (const a of assignments) {
  if (a.itemKind !== "packetFamily") continue;
  for (const f of a.items) {
    const key = `${a.lane}::${f}`;
    if (byLaneKind.has(key)) duplicateFamilies.push({ familyId: f, lane: a.lane, claimedBy: [byLaneKind.get(key), a.assignmentId] });
    byLaneKind.set(key, a.assignmentId);
  }
}
/* Ownership that the ledger says has ended (a returned verdict, no live
 * claim held by that owner) is not re-dispatch: it is the stale roster row
 * SDV01 left behind. Ended ownership was cleared on the family rows above. */
const staleRosterFamilies = new Set(families.filter((f) => f.staleRosterOwner).map((f) => f.familyId));
const activeReDispatched = assignments.filter((a) => a.itemKind === "packetFamily")
  .flatMap((a) => a.items.filter((f) => activeFamilies.has(f) && !staleRosterFamilies.has(f)).map((f) => ({ familyId: f, lane: a.assignmentId, activeOwner: activeFamilies.get(f) })));

/* Shared host with two writers. */
const hostWriters = new Map();
for (const a of assignments) {
  for (const p of a.ownedPaths) {
    if (!/^scripts\/build-census-v1-.+\.mjs$/.test(p)) continue;
    if (!hostWriters.has(p)) hostWriters.set(p, []);
    hostWriters.get(p).push(a.assignmentId);
  }
}
const sharedHostCollisions = [...hostWriters.entries()].filter(([, ls]) => ls.length > 1).map(([script, lanes]) => ({ script, lanes }));

const ownedAndProhibited = [];
for (const a of assignments) {
  for (const p of a.prohibitedPaths ?? []) {
    if (a.ownedPaths.some((owned) => pathsOverlap(owned, p))) ownedAndProhibited.push({ lane: a.assignmentId, path: p });
  }
}
const unwritableOutputs = [];
for (const a of assignments) {
  for (const o of a.requiredOutputs) {
    const p = o.split("—")[0].trim().split(/[\s,]+/)[0].replace(/\/$/, "");
    if (!p || !/^[A-Za-z0-9_./*<>-]+$/.test(p)) { unwritableOutputs.push({ lane: a.assignmentId, output: o, why: "names no path" }); continue; }
    if (!a.ownedPaths.map(rootOf).some((root) => p === root || p.startsWith(`${root}/`))) unwritableOutputs.push({ lane: a.assignmentId, output: o, why: "outside every owned path" });
  }
}
/*
 * A double-underscore token is a placeholder only when it stands alone. The
 * Master Library names its binaries AL__FORM__C-10-CRIMINAL__..., so an
 * unanchored pattern reads every corpus path as an unfilled template and
 * refuses a dispatch for carrying real source filenames.
 */
const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX)\b|<placeholder>|(?<![A-Za-z0-9])__[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*__(?![A-Za-z0-9])/;
/* Placeholder detection ignores the fields that legitimately carry a literal
 * <FAMILY_ID> or a shell template: the preflight line, the stop conditions and
 * the focused tests are instructions to a worker, not values left unfilled. */
const scrubbed = (a) => JSON.stringify({
  ...a, requiredOutputs: undefined, stopConditions: undefined, focusedTests: undefined,
  returnFormat: undefined, builderObligations: undefined, proofObligations: undefined,
  preflight: undefined, prohibitedCommands: undefined, prohibitedPaths: undefined,
  scriptsNotOwned: undefined, claimRule: undefined, checkpointRule: undefined,
  everyAcquiredSourceRecords: undefined, seedItemsAreNotTheWholeJob: undefined
});
const placeholders = assignments.filter((a) => PLACEHOLDER.test(scrubbed(a))).map((a) => a.assignmentId);

/* A source-blocked or legally blocked family must never be handed to a builder. */
const blockedInPF = assignments.filter((a) => a.lane === "packet-build")
  .flatMap((a) => a.items.map((f) => families.find((x) => x.familyId === f)))
  .filter((f) => f && (f.state === "SOURCE_BLOCKED" || f.legalInputStatus === "OPEN_LEGAL_INPUT"))
  .map((f) => f.familyId);

const problems = [];
if (collisions.length) problems.push(`${collisions.length} path collision(s)`);
if (duplicateFamilies.length) problems.push(`${duplicateFamilies.length} duplicate famil(ies)`);
if (activeReDispatched.length) problems.push(`${activeReDispatched.length} active famil(ies) re-dispatched`);
if (sharedHostCollisions.length) problems.push(`${sharedHostCollisions.length} shared host(s) with two writers`);
if (ownedAndProhibited.length) problems.push(`${ownedAndProhibited.length} path(s) owned and prohibited at once`);
if (unwritableOutputs.length) problems.push(`${unwritableOutputs.length} unwritable output(s)`);
if (placeholders.length) problems.push(`${placeholders.length} assignment(s) with a placeholder: ${placeholders.slice(0, 3).join(", ")} -> ${(scrubbed(assignments.find((a) => a.assignmentId === placeholders[0])).match(PLACEHOLDER) ?? []).join("|")}`);
if (blockedInPF.length) problems.push(`${blockedInPF.length} blocked famil(ies) assigned to a builder`);
if (!/^[0-9a-f]{40}$/.test(MINIMUM_CAPTAIN_SHA)) problems.push("no real minimum Captain SHA");
if (git(["merge-base", "--is-ancestor", MINIMUM_CAPTAIN_SHA, "HEAD"]) === null) problems.push("the minimum Captain SHA is not an ancestor of HEAD");
/* Nothing may leave this generator in a state it has not declared. */
{
  const declared = new Set(STATES);
  const emitted = [...new Set(families.map((f) => f.state))];
  const undeclared = emitted.filter((x) => !declared.has(x));
  if (undeclared.length) problems.push(`${undeclared.length} undeclared state(s) emitted: ${undeclared.join(", ")}`);
}
if (assignments.length !== PF_LANES + VF_LANES + SOURCE_LANES + FIX_LANES) problems.push(`${assignments.length} lanes, expected ${PF_LANES + VF_LANES + SOURCE_LANES + FIX_LANES}`);
for (const e of ELASTICITY) {
  const have = e.id === "build"
    ? assignments.filter((a) => a.lane === "packet-build" && /^PF\d+$/.test(a.assignmentId)
      && Number(a.assignmentId.slice(2)) > e.lanesWithout).length
    : assignments.filter((a) => e.creates.includes(a.assignmentId)).length;
  const expected = e.id === "build"
    ? PF_LANES - e.lanesWithout
    : e.triggered ? e.creates.length : 0;
  if (have !== expected) problems.push(`${e.id} capacity requires ${expected} extra lane(s) at ${e.measured}, but ${have} exist`);
}
if (problems.length) {
  console.error(`packet factory 24h: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

/* ---------------------------------------------------------------- *
 * Records
 * ---------------------------------------------------------------- */
const countBy = (pool, key) => pool.reduce((acc, f) => ({ ...acc, [f[key]]: (acc[f[key]] ?? 0) + 1 }), {});

const masterQueue = {
  schemaVersion: "rcap-packet-factory-24h-master-queue/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate.mjs",
  question: "What is every packet family's exact state, owner and next action right now?",
  everyCountIsDerived: "The denominator is recomputed from the census scoreboard, the census routes, the custody reconciliation, the completeness matrix, the S2 continuation and the tree itself. No number here is carried forward from a previous record.",
  minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  inputs: Object.fromEntries(Object.entries(INPUTS).map(([, p]) => [p, sha(p)])),
  stateVocabulary: STATES,
  stateMeanings: STATE_MEANINGS,
  denominator: {
    liveFamilyDenominator: families.length,
    activeFamiliesExcluded: active.length,
    guidanceOnly: guidance.length,
    remaining: remaining.length,
    sourceReady: sourceReady.length,
    sourceBlocked: sourceBlocked.length,
    legalBlocked: legalBlocked.length,
    verifyPending: verifyPending.length,
    repairRequired: repairRequired.length,
    sumsToDenominator: active.length + guidance.length + remaining.length === families.length
  },
  byState: countBy(families, "state"),
  bySourceStatus: countBy(families, "sourceStatus"),
  activeOwnership: {
    lanes: ACTIVE_LANES.map((a) => a.assignmentId),
    /* The roster minus ownership the ledger says has ended: a family whose
     * owner returned its verdict and holds no live claim is not active, and
     * publishing it here would re-collide it with its own repair dispatch. */
    families: families.filter((f) => f.activeOwner).map((f) => f.familyId).sort(),
    staleRosterFamilies: families.filter((f) => f.staleRosterOwner).map((f) => ({ familyId: f.familyId, roster: f.staleRosterOwner })),
    paths: activePaths.length,
    rule: "Excluded from every new assignment. A collision with active ownership fails this generator rather than appearing as a note."
  },
  theHonestShape: {
    buildersProvisioned: PF_LANES,
    sourceReadyFamilies: sourceReady.length,
    familiesPerBuilder: PF_LANES > 0 ? Number((sourceReady.length / PF_LANES).toFixed(1)) : 0,
    targetPerBuilder: "15 to 25",
    finding: `${PF_LANES + VF_LANES + FIX_LANES} packet-factory lanes are created and queued as instructed. The builders are limited by how many families hold an exactly-identified official source: ${sourceReady.length} do, so a full roster of ${PF_LANES} builders averages ${(sourceReady.length / PF_LANES).toFixed(1)} families each rather than 15 to 25.`,
    whatWouldChangeIt: `The source conveyor. ${sourceRows.length} source obligations across ${sourceBlocked.length + legalBlocked.length} families stand between this dispatch and a full builder roster, and the ${SOURCE_LANES}-lane source swarm holds every one of them.`,
    whyNotFewerBuilders: `The roster is kept at ${PF_LANES}: ${laneCount("build")} lanes come from rolling-factory capacity, and any higher numbered lane exists only while a live packet-build grant requires it. An empty lane can accept the next released family without waiting another cycle.`,
    noFalsePass: "No source-blocked or legally blocked family is assigned to a builder. Each carries one exact blocker, one owner and one next action instead."
  },
  families,
  totals: {
    lanes: assignments.length,
    builders: PF_LANES, verifiers: VF_LANES, sourceLanes: SOURCE_LANES, repairLanes: FIX_LANES,
    familiesAssignedToBuilders: sourceReady.length,
    sourceObligationsAssigned: sourceRows.length,
    /*
     * Two counts that cannot be mistaken for each other.
     *
     * actualPromotedAndReleased is the achieved figure: families every one of
     * whose sources is held, indexed and hash-matched right now, so a builder
     * can open them today.
     *
     * currentlyPromotionReady is the next step, not the achieved one: families
     * whose remaining obligations all sit in a PROMO lane, meaning the bytes
     * exist and only the custody record is outstanding.
     *
     * Neither is the sum of the source lanes' prospective release counts, and
     * that sum is deliberately not reported as a total here.
     */
    actualPromotedAndReleased: sourceReady.length,
    actualPromotedAndReleasedMeaning: "families whose every source is held, indexed and hash-matched now — buildable today",
    currentlyPromotionReady: [...new Set(sourceRows.filter((r) => r.operation === "PROMO").map((r) => r.familyId))]
      .filter((f) => sourceRows.filter((r) => r.familyId === f).every((r) => r.operation === "PROMO")).length,
    currentlyPromotionReadyMeaning: "families whose only remaining obligations are promotions — the bytes exist and the custody record does not",
    prospectiveReleasesAcrossSourceLanes: [...new Set(sourceRows.map((r) => r.familyId))].length,
    prospectiveReleasesMeaning: "families the conveyor would release if every obligation in it resolved. A forecast, not an achievement.",
    commercialRoutesOpened: 0,
    productionTouched: false
  },
  commercialPosture: "This factory builds, verifies, repairs and acquires. It opens no commercial route, proves no fulfillment authority and approves no output."
};

const activeAssignmentsRecord = {
  schemaVersion: "rcap-packet-factory-24h-active-assignments/v1",
  generatedBy: masterQueue.generatedBy,
  minimumCaptainSha: MINIMUM_CAPTAIN_SHA,
  captainBranch: CAPTAIN_BRANCH,
  executionContract: CONTRACT,
  concurrency: {
    lanesCreated: assignments.length,
    rule: "If available Codex concurrency is lower than 32, every assignment is still created and queued. When a task finishes, the next queued task starts immediately.",
    startOrder: [
      "SRC01-SRC04 and every PF lane holding families start together — the conveyor and the builders are not sequential",
      "VF lanes start on the first PF checkpoint, not on a completed assignment",
      "FIX lanes start on the first FAIL_REPAIR_REQUIRED verdict",
      "an empty PF lane starts the moment a source lane releases a family into it"
    ],
    idleRule: "A lane is idle only when no executable work exists for its kind. An empty PF lane at dispatch is idle because the source queue is empty for it, and the source lanes are the work that ends that."
  },
  assignments
};

const importGraphRecord = {
  schemaVersion: "rcap-packet-factory-24h-import-graph/v1",
  generatedBy: masterQueue.generatedBy,
  question: "Which build scripts are shared, and may a lane own the script its family uses?",
  scriptsScanned: scriptFiles.length,
  rule: "A family worker may own a family-specific script only when no unassigned family imports it. One shared host has one owner.",
  edges: scriptFiles.map((f) => ({ script: f, imports: directImports.get(f) ?? [], transitiveImports: transitiveImportsOf(f), importedBy: importersOf(f) })).filter((e) => e.imports.length || e.importedBy.length),
  sharedHosts: scriptFiles.filter((f) => importersOf(f).length > 1).map((f) => ({ script: f, importers: importersOf(f).map(familyOfScript), owner: hostWriters.get(`${SCRIPTS}/${f}`)?.[0] ?? "UNOWNED_IN_THIS_WAVE" })),
  scriptsWithheldFromLanes: assignments.filter((a) => (a.scriptsNotOwned ?? []).length).map((a) => ({ lane: a.assignmentId, withheld: a.scriptsNotOwned }))
};

const collisionsRecord = {
  schemaVersion: "rcap-packet-factory-24h-collisions/v1",
  generatedBy: masterQueue.generatedBy,
  checkedAgainst: { activeLanes: ACTIVE_LANES.map((a) => a.assignmentId), activePaths: activePaths.length, wavePaths: wavePaths.length, comparisons: wavePaths.length * activePaths.length + (wavePaths.length * (wavePaths.length - 1)) / 2 },
  results: { pathCollisions: collisions, duplicateFamilies, activeFamiliesReDispatched: activeReDispatched, sharedHostCollisions, ownedAndProhibited, requiredOutputsOutsideOwnedPaths: unwritableOutputs, placeholders, blockedFamiliesAssignedToBuilders: blockedInPF },
  counts: { pathCollisions: collisions.length, duplicateFamilies: duplicateFamilies.length, activeFamiliesReDispatched: activeReDispatched.length, sharedHostCollisions: sharedHostCollisions.length, ownedAndProhibited: ownedAndProhibited.length, requiredOutputsOutsideOwnedPaths: unwritableOutputs.length, placeholders: placeholders.length, blockedFamiliesAssignedToBuilders: blockedInPF.length },
  rule: "A nonzero count here fails the generator. This record exists so the zero can be read rather than trusted."
};

const checkpointRecord = {
  schemaVersion: "rcap-packet-factory-24h-checkpoint/v1",
  generatedBy: masterQueue.generatedBy,
  everyCountIsDerived: "No number here is typed.",
  cadence: "every 2 hours",
  checkpointNumber: 0,
  checkpointMeans: "checkpoint 0 is the dispatch: the state the first two-hour checkpoint is measured against.",
  liveFamilyDenominator: families.length,
  completePacketProven: families.filter((f) => f.state === "COMPLETE_PACKET_PROVEN").length,
  states: Object.fromEntries(STATES.map((s) => [s, families.filter((f) => f.state === s).length])),
  sourceReady: sourceReady.length,
  sourceBlocked: sourceBlocked.length,
  assigned: sourceReady.length,
  completedSinceLastCheckpoint: 0,
  newlySourceReady: 0,
  returnedForRepair: 0,
  codex: {
    activeTasks: 0,
    queuedTasks: assignments.length,
    lanesWithWorkAtDispatch: assignments.filter((a) => (a.items ?? []).length > 0).length,
    lanesProvisionedEmpty: assignments.filter((a) => (a.items ?? []).length === 0).length,
    idleCapacityRule: "A provisioned-empty lane is not idle capacity being wasted; it is capacity waiting on the source conveyor, which is itself fully assigned."
  },
  blockers: [...sourceBlocked, ...legalBlocked].map((f) => ({
    family: f.familyId,
    exactBlocker: f.legalInputStatus === "OPEN_LEGAL_INPUT" ? "an open legal input on one of its routes"
      : f.routeMappingStatus === "UNBOUND_TO_A_PACKET_FAMILY" ? "no census route binds this id to a packet family"
      : `${f.sourceStatus}: ${(f.sourceIds ?? []).join(", ") || "no document-shaped source named"}`,
    owner: f.legalInputStatus === "OPEN_LEGAL_INPUT" ? "counsel" : (sourceRows.find((r) => r.familyId === f.familyId)?.lane ?? "PROMO03"),
    nextAction: f.legalInputStatus === "OPEN_LEGAL_INPUT" ? "await the counsel determination; do not research it here"
      : f.routeMappingStatus === "UNBOUND_TO_A_PACKET_FAMILY" ? "Captain route/family binding"
      : "resolve or acquire the exact source identity, then release into the next available PF lane"
  })),
  commercialRoutesOpened: 0,
  productionTouched: false
};

/* ---------------------------------------------------------------- *
 * Prompts
 * ---------------------------------------------------------------- */
const bullet = (xs) => (xs ?? []).map((x) => `- ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n");
const promptFor = (a) => {
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Environment:** ${a.environment} (Codex Cloud)  ·  **Lane:** ${a.lane}`);
  p.push(`**Repository branch to select:** \`${a.captainBranch}\``);
  p.push(`**Branch in the container:** \`work\` — Codex Cloud names it. Do not rename it and do not create another.`);
  p.push(`**Minimum required ancestor:** \`${a.minimumCaptainSha}\` (or the newer dispatch base)`);
  p.push(`**Execution contract:** \`${a.executionContract}\` — read it before you start.`);
  p.push("**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean", "");
  p.push("> There is no origin, the checkout is shallow, and your finished diff returns through the Codex Cloud interface. That is the design.", "");
  /*
   * The isolation banner goes on EVERY prompt, not only the sixteen builders.
   *
   * F28 was added after C13 showed the prompt checks could not see the repair
   * subdirectories, and the first thing it found was that thirty-two prompts --
   * every source, verifier and fix lane -- had no banner at all. Only the
   * builders did. A container handed VF01 with no banner can run VF01 through
   * VF12 in one task and return twelve independent verifications, which is the
   * single failure the independent-verification design exists to prevent: the
   * whole point of VF is that it is not the same reader as PF, and twelve
   * verdicts from one reader are one verdict wearing twelve names.
   */
  const family = a.assignmentId.replace(/[0-9].*$/, "") || a.assignmentId;
  const isolation = a.taskIsolation ?? [
    "THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.",
    `DO NOT EXECUTE THE OTHER ${family} PROMPTS IN THIS TASK.`,
    "DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER."
  ];
  p.push("> ## " + isolation[0], ">", ...isolation.slice(1).map((l) => `> **${l}**`), "");
  if (a.rowStopContract) {
    const rc = a.rowStopContract;
    p.push("## Two gates, and only one of them stops the lane", "");
    p.push(`### 1. Lane gate — ${rc.laneGate.what}`, "", "```sh",
      "source $HOME/.legalease-corpus-env",
      rc.laneGate.command.replace(" --codex-cloud", " \\\n  --codex-cloud").replace(" --minimum-captain-sha", " \\\n  --minimum-captain-sha").replace(" --assignment", " \\\n  --assignment"),
      "```", "");
    p.push(`Must print **\`${rc.laneGate.mustReturn}\`**. ${rc.laneGate.onFailure}`, "", `_${rc.laneGate.note}_`, "");
    p.push(`### 2. Row gate — ${rc.rowGate.what}, once per family`, "", "```sh", rc.rowGate.command, "```", "");
    p.push(`- **family_sources_bind fails** → ${rc.rowGate.onFamilySourcesBindFailure}`);
    p.push(`- **an open legal input** → ${rc.rowGate.onOpenLegalInput}`);
    p.push(`- **any other check fails** → ${rc.rowGate.onAnyOtherCheckFailing}`, "");
    p.push(`**${rc.everyFamilyGetsExactlyOneRow}**`, "");
    p.push(`**${rc.aStoppedFamilyWritesNothing}**`, "");
    p.push(rc.theLaneCompletesNormally, "");
  } else {
    const exactFamily = a.items?.[0] ?? null;
    p.push("## Before anything else", "", "```sh",
      "source $HOME/.legalease-corpus-env",
      `node ${PREFLIGHT} \\`,
      ...(a.itemKind === "sourceObligation" ? [
        `  --assignment-id ${a.assignmentId} \\`,
        ...(a.items?.length ? [`  --source-obligation '${a.items[0].replaceAll("'", "'\\''")}' \\`] : [])
      ] : exactFamily
        ? [`  --family ${shellQuote(exactFamily)} \\`]
        : [`  --assignment ${FACT}/ACTIVE_ASSIGNMENTS.json \\`]),
      "  --codex-cloud \\",
      `  --minimum-captain-sha ${a.minimumCaptainSha}`,
      "```", "");
    /*
     * Measured from the command this branch just printed, rather than from a
     * number decided once for the whole dispatch. FIX and VF prompts gate
     * family-scoped and print one MORE than the PF lane gate, and every one of
     * them stated the lane gate's number. The trailing sentence stated "13/14"
     * by hand as well, which is a third number and belongs to no command here.
     */
    const mustReturn = a.itemKind === "sourceObligation"
      ? a.preflightMustReturn
      : denominatorForCommand(exactFamily
        ? `node ${PREFLIGHT} --family ${shellQuote(exactFamily)} --codex-cloud`
        : `node ${PREFLIGHT} --assignment ${FACT}/ACTIVE_ASSIGNMENTS.json --codex-cloud`).mustReturn;
    const shortOne = a.itemKind === "sourceObligation" ? null : Number(/(\d+)\/\d+/.exec(mustReturn)?.[1] ?? 0) - 1;
    p.push(`It must print **\`${mustReturn}\`**.${a.itemKind === "sourceObligation"
      ? " The lane gate and each owned row gate must both pass."
      : ` A ${shortOne}/${shortOne + 1} in cloud mode is a real failure, not the shallow checkout being tolerated.`}`, "");
  }
  p.push("## Never run these", "", bullet(a.prohibitedCommands.map((c) => `\`${c}\``)), "");
  if (a.claimRule) p.push("## Claim before you read", "", bullet(a.claimRule), "");
  /* The registry, rendered where a source worker will actually read it --
   * before the section telling them what to fetch. */
  if (a.sourceRelationshipRegistry) {
    const g = a.sourceRelationshipRegistry;
    p.push("## Read the source relationship registry first", "");
    p.push(`\`${g.file}\` — ${g.readItBeforeYouFetchAnything}`, "");
    p.push("**These states are NOT a fetch. Acting on them as one is the defect this registry exists to stop.**", "");
    for (const [k, v] of Object.entries(g.statesThatAreNotAFetch)) p.push(`- \`${k}\` — ${v}`);
    p.push("", "**These are:**", "");
    for (const [k, v] of Object.entries(g.statesThatAreAFetch)) p.push(`- \`${k}\` — ${v}`);
    p.push("", `**${g.neverAskAClerkWhenAPublicSourceIsKnown}**`, "");
    p.push(g.youDoNotDecideReuse, "");
  }
  if (a.rasterRule) p.push("## How to raster", "", bullet(a.rasterRule), "");
  p.push("## Mission", "", a.mission, "");
  if (a.provisionedEmpty) p.push(`**This lane has no families at dispatch.** ${a.refillRule}`, "");

  if (a.itemKind === "packetFamily" && a.familyDetail) {
    p.push(`## The ${a.itemCount} families`, "");
    if (a.sharedAxes?.length) p.push(`Shared across the lane: **${a.sharedAxes.join(", ")}**. Grouped by shared host, official form, composer and component assembly — never by state.`, "");
    p.push("| Family | Jur | Strategy | Official forms | Component assembly | Routes | Overlay directory |", "| --- | --- | --- | --- | --- | ---: | --- |");
    for (const f of a.familyDetail) p.push(`| \`${f.familyId}\` | ${f.jurisdiction} | ${f.strategy} | ${f.forms.join(", ") || "—"} | ${f.instrumentKinds.join(", ") || "—"} | ${f.routeCount} | \`${f.directory}\` |`);
    p.push("");
  } else if (a.itemKind === "packetFamily") {
    p.push(`## The ${a.itemCount} famil${a.itemCount === 1 ? "y" : "ies"}`, "", (a.detail ?? a.items.map((f) => ({ familyId: f }))).map((d) => `- \`${d.familyId}\`${d.failingCounters?.length ? ` — failing: ${d.failingCounters.join(", ")}` : ""}`).join("\n"), "");
  } else if (a.itemKind === "sourceObligation") {
    p.push("## What bounds this lane", "", a.boundedBy, "");
    p.push(`**${a.itemCount} obligations · ${a.familiesThisLaneWouldReleaseCount} families this lane WOULD release if every one of them resolves · hosts: ${a.issuingHosts.join(", ") || "—"}**`, "");
    p.push(`> Prospective. Nothing below is promoted custody yet, and this number is not a count of families you can build today.`, "");
    p.push(`> ${a.egressReality}`, "");
    p.push("### Required operation record schema", "", bullet(a.requiredRecordSchema), "");
    p.push("### Exact obligation rows", "", "| Item id | Source id | Jurisdiction | Current operation | Family ownership | Required input | Handoff |", "| --- | --- | --- | --- | --- | --- | --- |");
    for (const r of a.itemDetails) p.push(`| \`${r.itemId}\` | \`${r.sourceId}\` | ${r.jurisdiction} | \`${r.currentOperation}\` | ${r.familyIds.map((f) => `\`${f}\``).join(", ")} | ${r.requiredInput} | \`${r.handoffOperation}\` |`);
    if (!a.itemDetails.length) p.push(`| _No current obligations_ | — | — | \`${a.operation}\` | — | Lane remains queued; do not invent an input. | — |`);
    if (a.itemDetails.length) p.push("", `Deterministically assert exactly the ${a.itemCount} committed itemIds (failures are recorded per row and do not terminate the loop):`, "", "```sh", `node - <<'NODE'\nconst {spawnSync}=require('node:child_process');\nconst a=require('./${FACT}/ACTIVE_ASSIGNMENTS.json').assignments.find(x=>x.assignmentId==='${a.assignmentId}');\nif (!a || a.items.length !== ${a.itemCount}) throw new Error('${a.assignmentId} committed item count changed');\nfor (const itemId of a.items) {\n  const r=spawnSync(process.execPath,['scripts/grade-a-packet-factory-24h/claim.mjs','--assert','${a.assignmentId}',itemId],{stdio:'inherit'});\n  if (r.status !== 0) console.error('ROW_STOP', itemId);\n}\nNODE`, "```", "");
    if (a.itemDetails.length) p.push("", "Run the row gate once per listed item, after the lane gate. This exact first command demonstrates the interface; substitute each other exact item id from the table without changing the lane:", "", "```sh", `node ${PREFLIGHT} --assignment-id ${a.assignmentId} --source-obligation '${a.itemDetails[0].itemId.replaceAll("'", "'\\''")}' --codex-cloud --minimum-captain-sha ${a.minimumCaptainSha}`, "", "# A failed row is recorded STOPPED; continue with unrelated rows.", "```", "");
    p.push(`**${a.releaseRule}**`, "");
    p.push("### Families this lane would release", "", a.familiesThisLaneWouldRelease.map((f) => `\`${f}\``).join(", "), "");
    if (a.leverageOrder?.length) {
      p.push("", "### Settle these first", "", `**${a.leverageRule}**`, "", "| Document | Jurisdiction | Families waiting |", "| --- | --- | --- |");
      for (const l of a.leverageOrder) p.push(`| ${l.document} | ${l.jurisdiction ?? "—"} | ${l.familiesWaiting} |`);
      p.push("", `> ${a.whatTheLastBatchTaught}`, "");
    }
  } else if (a.itemKind === "streamingClaim") {
    p.push("## How work reaches you", "", a.seedItemsAreNotTheWholeJob, "");
    p.push(`- **Claim ledger:** \`${a.claimLedger}\``, `- **Rule:** ${a.claimRule}`, `- **Cadence:** ${a.checkpointRule}`, "");
    if (a.items.length) p.push("### Families already awaiting verification at dispatch", "", a.items.map((f) => `\`${f}\``).join(", "), "");
    p.push("");
  }

  if (a.builderObligations) {
    p.push("## The builder contract — every family, all thirteen", "", bullet(a.builderObligations), "");
    p.push(`**${a.checkpointRule}**`, "", `**${a.neverSelfVerify}**`, "");
  }
  if (a.proofObligations) p.push("## Proof obligations — measure each, per family", "", bullet(a.proofObligations), "");
  if (a.verdicts) p.push("## Verdicts", "", bullet(a.verdicts.map((v) => `\`${v}\``)), "", a.verdictRule, "", `**${a.independenceRule}**`, "");
  if (a.receivesOnly) p.push("## What you receive", "", `Only ${a.receivesOnly}.`, "", a.doNotRepeatAnalysis, "", `**${a.reverificationRule}**`, "");

  p.push("## Owned paths — write only here", "", bullet(a.ownedPaths.map((x) => `\`${x}\``)), "");
  if (a.scriptsNotOwned?.length) {
    p.push("### Scripts you may NOT own", "", "A family-specific script is yours only when no family outside this lane imports it. These are imported from outside and belong to nobody here:", "");
    for (const s of a.scriptsNotOwned) p.push(`- \`${s.script}\` — imported by ${s.importedByFamiliesOutsideThisLane.join(", ")}`);
    p.push("");
  }
  p.push("## Never write here", "", bullet([...new Set(a.prohibitedPaths)].slice(0, 24).map((x) => `\`${x}\``)), "");
  p.push("## Required outputs", "", bullet(a.requiredOutputs), "");
  p.push("### Output schema", "", `Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, status words: ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(", ")}.`, "", a.outputSchema.rule, "");
  p.push("## Focused tests", "", bullet(a.focusedTests.map((t) => `\`${t}\``)), "", "> Focused checks only. The full national repository chain runs at Captain checkpoints, never inside a worker.", "");
  p.push("## Stop conditions", "", bullet(a.stopConditions), "", "Stopping with an honest account of what is missing is a complete return. One blocked family never stops the lane.", "");
  p.push("## How you return", "", a.theDiffIsTheReturn, "", "```text", ...a.returnFormat, "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  return p.join("\n");
};

const OUT = makeEmitter({ root: ROOT, check: CHECK, label: "packet factory 24h" });

/* Queue writes; flush after the destruction guard. See the guard below. */
const PENDING_EMITS = [];
{
  const immediateEmit = OUT.emit.bind(OUT);
  OUT.emit = (rel, content) => PENDING_EMITS.push([rel, content]);
  /* Flushing also restores immediate writes: emits after the guard (the claim
   * ledger, the repair record, every prompt) must land on disk, not in a queue
   * nothing drains. The first flush-only version dropped all of them silently
   * while printing "Wrote 52 prompts". */
  OUT.flushPendingEmits = () => { for (const [r, c] of PENDING_EMITS) immediateEmit(r, c); PENDING_EMITS.length = 0; OUT.emit = immediateEmit; };
}
OUT.emit(`${OUT_DIR}/MASTER_QUEUE.json`, `${JSON.stringify(masterQueue, null, 2)}\n`);
OUT.emit(`${OUT_DIR}/ACTIVE_ASSIGNMENTS.json`, `${JSON.stringify(activeAssignmentsRecord, null, 2)}\n`);
OUT.emit(`${OUT_DIR}/IMPORT_GRAPH.json`, `${JSON.stringify(importGraphRecord, null, 2)}\n`);
OUT.emit(`${OUT_DIR}/COLLISIONS.json`, `${JSON.stringify(collisionsRecord, null, 2)}\n`);
OUT.emit(`${OUT_DIR}/CHECKPOINT.json`, `${JSON.stringify(checkpointRecord, null, 2)}\n`);
/*
 * The claim ledger.
 *
 * VF12 stopped at BLOCKED_BEFORE_CLAIM because the ledger its prompt named was
 * never generated. It was right to stop, and the omission was here: prompts
 * pointed workers at a file no generator wrote.
 *
 * Atomicity comes from a single writer. Every family is granted to exactly one
 * lane OF EACH KIND at generation time -- which the collision record already
 * proves -- and the grant is committed before any worker starts. A worker
 * asserts its grant through scripts/grade-a-packet-factory-24h/claim.mjs and
 * stops if the ledger does not name it. There is no second mechanism.
 */
const PACKET_LANE_KIND = { "packet-build": "packet-build", "independent-verification": "independent-verification", "rapid-repair": "repair", "shared-host-repair": "shared-host-repair" };
const SOURCE_LANE_KIND = { DISC: "source-discovery", SRC: "source-reconciliation", ACQ: "source-acquisition", PROMO: "source-promotion" };
const sourceConveyor = read(`${OUT_DIR}/SOURCE_CONVEYOR_ASSIGNMENTS.json`);
const activeSourceLaneIds = new Set(sourceConveyor.lanes.filter((lane) => lane.status === "ACTIVE").map((lane) => lane.assignmentId));
const packetClaimRows = assignments
  .filter((a) => a.itemKind === "packetFamily" || a.itemKind === "streamingClaim")
  .flatMap((a) => (a.items ?? []).map((familyId) => ({
    subjectType: "packet-family", subjectId: familyId, familyId, itemId: null, familyIds: [familyId], sourceId: null,
    operation: a.lane, lane: a.assignmentId, laneKind: PACKET_LANE_KIND[a.lane], released: false, releasedAt: null
  })));
const sourceClaimRows = assignments
  .filter((a) => a.itemKind === "sourceObligation" && activeSourceLaneIds.has(a.assignmentId))
  .flatMap((a) => a.itemDetails.map((item) => ({
    subjectType: "source-obligation", subjectId: item.itemId, itemId: item.itemId, familyIds: item.familyIds,
    sourceId: item.sourceId, operation: item.currentOperation, lane: a.assignmentId,
    laneKind: SOURCE_LANE_KIND[a.assignmentId.replace(/[0-9]+$/, "")], released: false, releasedAt: null
  })));
const claimRows = [...packetClaimRows, ...sourceClaimRows]
  .sort((x, y) => x.subjectType.localeCompare(y.subjectType) || x.subjectId.localeCompare(y.subjectId) || x.operation.localeCompare(y.operation) || x.lane.localeCompare(y.lane));
const digestFields = ["subjectType", "subjectId", "itemId", "familyId", "familyIds", "sourceId", "operation", "lane", "laneKind", "released", "releasedAt"];
const digestClaims = (rows) => crypto.createHash("sha256").update(JSON.stringify(rows.map((row) => digestFields.map((field) => row[field] ?? null)))).digest("hex");

/*
 * Carry the live state of the existing ledger onto the regenerated grant set.
 *
 * This generator rebuilt claimRows from scratch with releases hardcoded to [],
 * so running it destroyed every release, every re-issue, and every grant minted
 * outside it. I ran it once to refresh MASTER_QUEUE counters and it silently
 * deleted 27 claims -- the 25 verification grants for VF13-VF17 that five
 * workers were about to assert, plus 339 release records and 3 re-issues. The
 * ledger still verified afterwards, because a smaller consistent ledger is
 * still consistent, which is exactly why this had to be caught by counting
 * rather than by a green check.
 *
 * Three things carry:
 *   - released/releasedAt per claim, so finishing work is not undone;
 *   - grants this generator does not produce, such as verification lanes minted
 *     for a cross-read, which would otherwise vanish under their owners;
 *   - the releases and reissues logs, which are the audit trail.
 *
 * Nothing carried can invent a grant: a preserved claim is only kept if this
 * run did not already produce one for the same subject and operation, and the
 * digest is recomputed over the merged set.
 */
const priorLedgerPath = path.join(ROOT, `${OUT_DIR}/claim-ledger.json`);
const priorLedger = fs.existsSync(priorLedgerPath)
  ? JSON.parse(fs.readFileSync(priorLedgerPath, "utf8"))
  : { claims: [], releases: [], reissues: [] };
const claimKey = (c) => `${c.subjectType}\u0000${c.subjectId}\u0000${c.operation}`;
const priorByKey = new Map((priorLedger.claims ?? []).map((c) => [claimKey(c), c]));

let carriedReleases = 0;
for (const row of claimRows) {
  const prior = priorByKey.get(claimKey(row));
  if (prior?.released === true) { row.released = true; row.releasedAt = prior.releasedAt; carriedReleases++; }
}
/*
 * Preserve only grants in lanes this generator does not manage.
 *
 * Keying on subject+operation alone was wrong in the other direction: it
 * resurrected four source obligations the generator had deliberately withdrawn
 * because their lanes are no longer ACTIVE, and the ledger verifier caught it
 * as "source assignment omitted from ledger" -- 449 claims against 445
 * expected. A withdrawn grant coming back is as bad as a live one vanishing.
 *
 * The generator owns every lane it emits. A lane it does not emit at all --
 * a verification lane Captain minted by hand for a cross-read, say -- is
 * external, and dropping it would delete a grant its owner is about to assert.
 */
/*
 * External lanes are dispatched outside this generator and must survive it.
 *
 * EXTERNAL_ASSIGNMENTS.json is the control plane's record of which lanes belong
 * to a Codespace or a Codex Cloud slot. This generator does not emit them, so
 * without reading that file a routine regeneration would drop every external
 * grant the moment one existed -- the same class of loss that wiped 25 raster
 * receipts and 339 releases earlier in this shift, and the reason the mission
 * requires this integration rather than trusting the carry-forward alone.
 */
const EXTERNAL_INDEX = "data/rcap-grade-a/external-worker-control/EXTERNAL_ASSIGNMENTS.json";
const externalLanes = new Set((() => {
  const abs = path.join(ROOT, EXTERNAL_INDEX);
  if (!fs.existsSync(abs)) return [];
  try { return JSON.parse(fs.readFileSync(abs, "utf8")).externalLanes ?? []; }
  catch { return []; }
})());

const generatedLanes = new Set(claimRows.map((c) => c.lane));
for (const lane of externalLanes) generatedLanes.delete(lane);
const generatedKeys = new Set(claimRows.map(claimKey));
/*
 * Preserve by IDENTITY, not by lane.
 *
 * This read `!generatedLanes.has(c.lane) && !generatedKeys.has(key)`, which
 * drops a claim whose lane the generator still emits but which it no longer
 * dispatches -- a family that has moved past SOURCE_READY keeps its
 * packet-build grant on PF01 while PF01 goes on being emitted for other
 * families. Twelve identities were being destroyed on every regeneration,
 * including six Virginia and Kentucky packet-build grants and a Rhode Island
 * repair, and the earlier check that said "0 lost" only compared
 * independent-verification subjects, so it never looked at them.
 *
 * The lane condition was there to stop four withdrawn Arkansas grants
 * reappearing. It was aimed at the wrong mechanism: those came back through the
 * MERGE RESOLVER pulling them off a worker branch, not through this generator,
 * and the resolver now refuses them by consulting the merge base. A grant
 * withdrawn from the ledger is absent from priorLedger and cannot return here.
 */
/*
 * A prior claim on an EXTERNAL lane beats the freshly generated row for the
 * same identity. The generator packs its own lanes and knows nothing about
 * transfers, so re-emitting an identity moved to PF17 put it back on PF09 —
 * six build grants, one repair grant, silently, while their workers were
 * asserting them. Identity preservation without lane comparison is how it got
 * past the destruction guard.
 */
/*
 * A LIVE prior claim beats the freshly generated row for the same identity,
 * whatever lane it sits on. The first version protected only external lanes,
 * and the next regeneration tried to re-pack seventeen live GENERATOR-lane
 * grants (FIX02 -> FIX01, VF07 -> VF08, ...) because its inputs had moved --
 * which is precisely the churn that stranded workers on emptied lanes earlier
 * in this shift. A live grant is owned; only released history may be
 * re-packed.
 */
const priorPinned = new Map((priorLedger.claims ?? [])
  .filter((c) => c.released !== true || externalLanes.has(c.lane))
  .map((c) => [claimKey(c), c]));
const claimRowsRespectingExternal = claimRows.filter((c) => !priorPinned.has(claimKey(c)));
const preservedGrants = (priorLedger.claims ?? [])
  .filter((c) => priorPinned.has(claimKey(c))
    ? true
    : !generatedKeys.has(claimKey(c)) );
/*
 * DISSOLUTION (simplification directive): a live grant whose subject the
 * current dispatch no longer names — in ACTIVE_ASSIGNMENTS or the external
 * worker index — is moot: the obligation dissolved (a family's documents
 * attached directly, or a family left the state the grant's kind serves).
 * Withdrawing it is safe exactly because nothing dispatches it: no worker can
 * hold work the dispatch does not name. Withdrawals are logged with reasons
 * and change the claims digest, so a stale ledger cannot pass for this one.
 * Released claims are history and are never withdrawn.
 */
const dispatchedKeys = new Set(assignments.flatMap((x) => (x.items ?? []).map((id) =>
  `${x.itemKind === "sourceObligation" ? "source-obligation" : "packet-family"}::${id}::${x.itemKind === "sourceObligation" ? x.operation : x.lane}`)));
try {
  const ext = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/external-worker-control/EXTERNAL_ASSIGNMENTS.json"), "utf8"));
  for (const w of ext.workers ?? []) {
    const op = w.operation ?? w.laneKind;
    for (const id of w.subjectIds ?? []) dispatchedKeys.add(`packet-family::${id}::${op}`);
  }
} catch { /* no external index */ }
const claimDispatchKey = (c) => `${c.subjectType}::${c.subjectId}::${c.operation}`;
/*
 * A LIVE GRANT ON A LANE THAT NO LONGER EXISTS CAN NEVER BE EXERCISED.
 *
 * The dissolution rule below withdraws a live grant whose SUBJECT the dispatch
 * no longer names. This is the other half: the subject is still dispatched, but
 * to a lane that is gone. Four repair families sat live on FIX06 and FIX10
 * after the repair roster shrank to FIX01-FIX04 — claim.mjs answers
 * GRANTED_ELSEWHERE to every lane that exists and the holder cannot be reached,
 * so the work is unreachable by construction.
 *
 * Withdrawing it is safe for the same reason the dissolution rule is safe: no
 * worker can hold work through a lane the dispatch does not carry. The
 * withdrawal is logged with its reason, changes the claims digest, and the
 * lane-seeding above then deals the family to a lane that does exist. External
 * lanes are exempt — they are not this dispatch's to retire.
 */
const dispatchLaneIds = new Set(assignments.map((a) => a.assignmentId));
const claimDispatchKey2 = (c) => `${c.subjectType}::${c.subjectId}::${c.operation}`;
const withdrawnNow = [];
const survivingClaims = [...claimRowsRespectingExternal, ...preservedGrants].filter((c) => {
  if (c.released === true) return true;
  /* Active ownership derived from this exact live claim is an intentional
   * hold, not a retired-lane orphan or a dissolved obligation. */
  const heldFamily = c.subjectType === "packet-family" ? familyIndex.get(c.subjectId) : null;
  if (heldFamily?.activeOwner === c.lane) return true;
  if (!dispatchLaneIds.has(c.lane) && !externalLanes.has(c.lane) && dispatchedKeys.has(claimDispatchKey2(c))) {
    withdrawnNow.push({ subjectType: c.subjectType, subjectId: c.subjectId, operation: c.operation, lane: c.lane,
      withdrawnAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      reason: `lane retired: ${c.lane} is not in the current dispatch, so no worker can ever assert this grant — claim.mjs answers GRANTED_ELSEWHERE to every lane that exists. The subject is still dispatched and is re-dealt to a lane that does exist.` });
    return false;
  }
  if (dispatchedKeys.has(claimDispatchKey(c))) return true;
  withdrawnNow.push({ subjectType: c.subjectType, subjectId: c.subjectId, operation: c.operation, lane: c.lane,
    withdrawnAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    reason: "obligation dissolved: no current dispatch names this subject for this operation (direct source attachment or state change removed the work)" });
  return false;
});
/*
 * A DISPATCH THAT NAMES WORK NOBODY CAN CLAIM IS A BROKEN DISPATCH.
 *
 * The ledger grants one claim per subject per operation ever. That is the right
 * rule and it is what makes a claim atomic. Its consequence is that once a lane
 * releases a family, no lane can ever assert that family for that operation
 * again — and a family whose bytes change AFTER its verifier released is a
 * family that needs verifying again.
 *
 * Twenty-six families were in exactly that position: the current dispatch names
 * a lane, the family's state says the work is owed, and an assert returns exit
 * 9 ALREADY_RELEASED. Nineteen were VERIFY_PENDING packets whose bytes moved
 * after a verifier read them; seven were builds. Every one of those lanes would
 * have been sent to work it could not touch. FABLE-CA2 ran 74 asserts across
 * seven California families and got exit 0 zero times, which is how this was
 * found.
 *
 * The remedy already exists and already has a name: --reissue, a deliberate act
 * with a stated cause. generate.mjs's own state-machine comment says a family
 * failed again after its repair released "must come back through a new repair
 * grant (reissue/transfer)". Nobody was performing it, so the dispatch and the
 * ledger disagreed on every regeneration and the families sat still.
 *
 * The dispatch owns the roster, so the generator performs it — under four
 * conditions together, none of which is a judgement call:
 *
 *   1. the CURRENT dispatch names this family to this lane;
 *   2. EVERY prior claim for this family and this operation is released, so
 *      nothing live is being disturbed;
 *   3. the family's state genuinely owes this operation — VERIFY_PENDING owes
 *      verification, FAIL_REPAIR_REQUIRED owes repair, SOURCE_READY owes a
 *      build. A reissue for an operation the state does not owe is refused;
 *   4. a claim row for it exists to reissue in the first place.
 *
 * Every reissue lands in the ledger's `reissues` log with its cause, so this
 * mints nothing invisibly and a reviewer can read exactly why each one exists.
 * It cannot manufacture work: it re-opens a grant on a family the dispatch is
 * already asking a named lane to do, and nothing else.
 */
const OPERATION_THE_STATE_OWES = {
  VERIFY_PENDING: "independent-verification",
  FAIL_REPAIR_REQUIRED: "rapid-repair",
  SOURCE_READY: "packet-build"
};
const reissuedNow = [];
const stateOfFamily = new Map(families.map((r) => [r.familyId, r.state]));
const sourceFamilyOfItem = new Map(assignments
  .filter((a) => a.itemKind === "sourceObligation")
  .flatMap((a) => (a.itemDetails ?? []).map((item) => [item.itemId, item.familyIds?.[0] ?? null])));
/*
 * A subject an external worker holds is not ours to re-open.
 *
 * Seven packet-build subjects were released precisely BECAUSE they went to an
 * external worker, and re-opening an internal grant on them double-books the
 * family: E2 counted eight collisions against CODEX-CS-A the moment this ran.
 * The external index is the authority on what is out with a worker, so it is
 * consulted before anything is reissued rather than after the gate complains.
 */
const heldExternally = new Set();
try {
  const ext = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/external-worker-control/EXTERNAL_ASSIGNMENTS.json"), "utf8"));
  for (const w of ext.workers ?? []) for (const id of w.subjectIds ?? []) heldExternally.add(`${id}::${w.operation ?? w.laneKind}`);
} catch { /* no external index; nothing is out with a worker */ }
const everReleasedFor = new Map();
for (const c of survivingClaims) {
  const k = `${c.subjectId}::${c.operation}`;
  if (!everReleasedFor.has(k)) everReleasedFor.set(k, []);
  everReleasedFor.get(k).push(c);
}
for (const asg of assignments) {
  for (const id of asg.items ?? []) {
    if (typeof id !== "string") continue;
    const familyId = sourceFamilyOfItem.get(id) ?? id;
    const familyState = stateOfFamily.get(familyId) ?? "";
    const owed = asg.itemKind === "sourceObligation"
      ? (["SOURCE_BLOCKED", "LEGAL_BLOCKED"].includes(familyState) ? asg.operation : null)
      : OPERATION_THE_STATE_OWES[familyState];
    const dispatchedOperation = asg.itemKind === "sourceObligation" ? asg.operation : asg.lane;
    if (!owed || owed !== dispatchedOperation) continue;
    if (heldExternally.has(`${id}::${dispatchedOperation}`)) continue;
    const claims = everReleasedFor.get(`${id}::${dispatchedOperation}`) ?? [];
    if (claims.length === 0 || !claims.every((c) => c.released === true)) continue;
    /*
     * REISSUE ONCE, NOT ON A LOOP.
     *
     * Without this, a lane that takes a reissued grant, does the work and
     * releases it gets the same grant re-opened on the very next regeneration —
     * because the family may still owe the operation while its return is being
     * integrated. That is a treadmill: the lane can never finish, and "one
     * claim per subject per operation" stops meaning anything.
     *
     * So a subject is reissued again only if it was RELEASED AFTER its last
     * reissue. A release later than the reissue means a lane took the re-opened
     * grant and finished with it, and finishing is not a reason to start over.
     * A release EARLIER than the last reissue is the old history this mechanism
     * exists to step past.
     */
    const priorReissue = (priorLedger.reissues ?? [])
      .filter((r) => r.subjectId === id && r.operation === dispatchedOperation && r.reissuedAt)
      .sort((x, y) => String(x.reissuedAt).localeCompare(String(y.reissuedAt)))
      .pop();
    const holdReclassification = legalHoldReclassifications.get(id) ?? null;
    const reclassificationAlreadyReissued = (priorLedger.reissues ?? []).some((r) =>
      r.subjectId === id
      && r.operation === dispatchedOperation
      && r.decisionRecord === LEGAL_HOLD_RECLASSIFICATION);
    if (priorReissue) {
      const releasedAfter = claims.some((c) => c.releasedAt && String(c.releasedAt) > String(priorReissue.reissuedAt));
      /* A later owner-confirmed hold reclassification is a new work cycle,
       * not the just-completed cycle this guard protects. Re-open it once,
       * name the decision record, and then restore the ordinary anti-loop
       * rule on every later regeneration. */
      if (releasedAfter && (!holdReclassification || reclassificationAlreadyReissued)) continue;
    }
    /*
     * ONLY the claim the current dispatch's own lane holds.
     *
     * The first version re-opened whichever claim existed when the dispatch's
     * lane held none, and that helps nobody: ca-1203-4-set's history sits on
     * PF17 while the dispatch names PF02, so re-opening PF17's grant left the
     * family held by a lane nobody is dispatching and idle to the one that is.
     * F22 and C9 both caught it. A mismatch between the dispatch's lane and the
     * ledger's history is a transfer question, not a reissue question, and it
     * stays visible rather than being papered over here.
     */
    const target = claims.find((c) => c.lane === asg.assignmentId);
    if (!target) continue;
    target.released = false;
    delete target.releasedAt;
    delete target.releaseReason;
    reissuedNow.push({
      subjectType: target.subjectType, subjectId: id, operation: dispatchedOperation,
      lane: target.lane, dispatchNames: asg.assignmentId,
      familyState,
      reissuedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      reason: `the current dispatch names ${asg.assignmentId} for this subject, its family is ${familyState} and owes ${owed}, and every prior claim for this subject and operation is released — so an assert would answer ALREADY_RELEASED and the lane could not begin. Re-opened by the dispatch, which owns the roster.`,
      ...(holdReclassification ? { decisionRecord: LEGAL_HOLD_RECLASSIFICATION,
        reclassificationDisposition: holdReclassification.disposition } : {})
    });
  }
}

const mergedClaims = survivingClaims
  .sort((x, y) => x.subjectType.localeCompare(y.subjectType) || x.subjectId.localeCompare(y.subjectId) || x.operation.localeCompare(y.operation) || x.lane.localeCompare(y.lane));

/*
 * FAIL CLOSED BEFORE ANY GENERATED FILE IS FLUSHED.
 *
 * A released claim is legitimate history only while it is outside the current
 * dispatch. If a VF assignment names it, claim.mjs --assert will return exit 9
 * and the worker cannot begin. The reissue logic above deliberately declines
 * to reopen a just-completed work cycle; this guard keeps that anti-loop rule
 * while refusing to publish the unassertable assignment it leaves behind.
 */
if (reportUnassertableVerificationDispatch(assignments, mergedClaims)) process.exit(1);

const claimLedgerRecord = {
  schemaVersion: "rcap-claim-ledger/v2",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate.mjs",
  generatedAtCommit: MINIMUM_CAPTAIN_SHA,
  mechanism: "scripts/grade-a-packet-factory-24h/claim.mjs",
  howAtomicityWorks: "One writer. Captain grants every family to exactly one lane of each kind when the dispatch is generated and commits it before any worker starts. Workers assert grants; they never acquire them. Isolated Codex Cloud containers share no lock, so run-time contention is not available and pretending otherwise would be a race with a protocol painted on it.",
  laneKinds: ["packet-build", "independent-verification", "repair", "shared-host-repair", "source-discovery", "source-reconciliation", "source-acquisition", "source-promotion"],
  oneOwnerPerFamilyPerKind: "A builder and its verifier holding one family is the design. Two verifiers holding it is the collision, and this ledger cannot express it.",
  workerContract: [
    "node scripts/grade-a-packet-factory-24h/claim.mjs --assert <LANE> <familyId> before reading any artifact",
    "a non-zero exit is a full stop: report laneStatus BLOCKED_BEFORE_CLAIM naming the exact refusal, and read nothing",
    "node scripts/grade-a-packet-factory-24h/claim.mjs --release <LANE> <familyId> when the family is finished, and leave it in the diff"
  ],
  claims: mergedClaims,
  /*
   * The identity of THIS grant set.
   *
   * C13 found the hole: commit 068136465 revoked thirteen packet-build grants
   * -- exactly the families found legally blocked -- and generatedAtCommit did
   * not move, because it is a declared constant. Both ledgers said 7476708c, so
   * a worker holding the pre-revocation copy asserted revoked grants and its
   * return was indistinguishable from one made against the current ledger.
   *
   * claimsDigest is a function of the grants themselves, so revocation always
   * changes it. claim.mjs recomputes it, refuses a ledger whose digest does not
   * describe its own claims, and prints it in every CLAIM_OK, so a lane return
   * names the grant set it acted on and Captain can tell at integration whether
   * that is the current one.
   *
   * What this does NOT do, stated plainly rather than implied away: an isolated
   * container with no network cannot discover that its whole checkout is stale.
   * A stale ledger and a stale prompt agree with each other. The residual risk
   * is bounded Captain-side -- a lane is never launched against a superseded
   * SHA -- and this digest is what makes a violation visible in the return
   * rather than silent.
   */
  claimsDigest: digestClaims(mergedClaims),
  claimsDigestCovers: digestFields,
  revocationIsVisibleHow: "the digest changes whenever a grant is added or withdrawn; generatedAtCommit is a declared floor and does not",
  /*
   * A RELEASE LOG ENTRY AND ITS CLAIM CAN NAME DIFFERENT LANES, LEGITIMATELY.
   *
   * claim.mjs refuses a cross-lane release: `locate()` exits 8
   * GRANTED_ELSEWHERE unless the releasing lane is the lane holding the grant.
   * So `releases[].lane` is always the lane that actually held it at the moment
   * it was released. But this generator re-packs RELEASED claims onto whatever
   * lane the current dispatch puts the subject on -- a released claim's lane is
   * history and may be re-packed freely, which is what keeps the roster stable
   * while lanes come and go. The claim's `lane` is therefore a CURRENT packing
   * and the release log's `lane` is a HISTORICAL fact, and after a repack they
   * differ.
   *
   * That is not a defect and it is easy to read as one. FABLE-PD reported five
   * agency treatments "released without being built" because the claims said
   * PF14 while the release log said PF04, all within 0.3 seconds -- which looks
   * exactly like one lane reaching into another's grants. It was not: PF04 held
   * them, PF04 released them, and a later regeneration re-packed the released
   * identities onto PF14.
   *
   * Reading it wrong costs real time, so the record says which field answers
   * which question.
   */
  whatTheReleaseLogsLaneMeans: "releases[].lane is the lane that HELD the grant when it was released — claim.mjs refuses any other lane from releasing it (exit 8 GRANTED_ELSEWHERE). claims[].lane is the CURRENT dispatch packing, and this generator re-packs released claims freely because a released claim's lane is history. The two differing after a repack is expected; it is not a cross-lane release, and a cross-lane release cannot happen through claim.mjs at all.",
  releases: priorLedger.releases ?? [],
  reissues: [...(priorLedger.reissues ?? []), ...reissuedNow],
  /* The transfer log carries the same weight as releases and reissues: it is
   * how a family read twice is auditable at all. It was added to claim.mjs
   * after this generator was last touched, so without this line the first
   * regeneration after any transfer would erase the record of it. */
  transfers: priorLedger.transfers ?? [],
  withdrawals: [...(priorLedger.withdrawals ?? []), ...withdrawnNow]
};

/*
 * Identity comparison, not counts.
 *
 * A smaller consistent ledger is still consistent, which is how a regeneration
 * destroyed 27 claims, 339 releases and 3 reissues earlier in this shift and
 * still verified afterwards. Counting caught it only because I happened to
 * compare 537 against 510. So the check is set difference on identity, and it
 * refuses rather than warns: a destructive regeneration that prints a warning
 * and writes anyway has destroyed the thing the warning is about.
 */
const identityOf = (c) => `${c.subjectType}|${c.subjectId}|${c.operation}`;
const beforeIds = new Set((priorLedger.claims ?? []).map(identityOf));
const afterIds = new Set(mergedClaims.map(identityOf));
/* A withdrawal logged in this run's withdrawals list is not silent
 * destruction — the identity moves into the ledger's withdrawal log with a
 * reason, and the claims digest changes with it. Only an UNLOGGED absence is
 * destroyed history. */
const withdrawnIds = new Set(withdrawnNow.map((w) => [w.subjectType, w.subjectId, w.operation].join("|")));
const lostIdentities = [...beforeIds].filter((k) => !afterIds.has(k) && !withdrawnIds.has(k));
const beforeReleased = new Set((priorLedger.claims ?? []).filter((c) => c.released === true).map(identityOf));
/* A live grant is owned; regeneration may not move it between lanes. A
 * released claim's lane is history and may be re-packed freely. */
const priorLiveLane = new Map((priorLedger.claims ?? []).filter((c) => c.released !== true).map((c) => [identityOf(c), c.lane]));
const movedLiveLanes = mergedClaims
  .filter((c) => c.released !== true && priorLiveLane.has(identityOf(c)) && priorLiveLane.get(identityOf(c)) !== c.lane)
  .map((c) => `${identityOf(c)}: ${priorLiveLane.get(identityOf(c))} -> ${c.lane}`);
/*
 * A CLEARED RELEASE FLAG IS HISTORY DESTRUCTION -- UNLESS IT IS A LOGGED
 * REISSUE, WHICH IS THE ONE THING A CLEARED RELEASE FLAG IS SUPPOSED TO BE.
 *
 * This guard exists because a regeneration that quietly un-releases a claim
 * erases the record that a lane finished with it. That is exactly right for
 * every accidental case. It is wrong for the deliberate one: reissuing IS
 * clearing a release flag, on purpose, with a stated cause, and the whole
 * mechanism above does nothing else.
 *
 * The exemption is as narrow as it can be: only identities the same run wrote
 * into `reissuedNow`, each of which lands in the ledger's reissues log with the
 * dispatch that asked for it, the family's state, and why an assert would
 * otherwise have answered ALREADY_RELEASED. Anything else clearing a release
 * flag still stops the run and still writes nothing.
 */
const deliberatelyReissued = new Set(reissuedNow.map((r) => `${r.subjectType}|${r.subjectId}|${r.operation}`));
const lostReleaseFlags = [...beforeReleased].filter((k) => {
  const after = mergedClaims.find((c) => identityOf(c) === k);
  if (!after || after.released === true) return false;
  return !deliberatelyReissued.has(k);
});
const shrank = [
  ["releases", (priorLedger.releases ?? []).length, (claimLedgerRecord.releases ?? []).length],
  ["reissues", (priorLedger.reissues ?? []).length, (claimLedgerRecord.reissues ?? []).length],
  ["transfers", (priorLedger.transfers ?? []).length, (claimLedgerRecord.transfers ?? []).length],
].filter(([, b, a]) => a < b);

if (lostIdentities.length || lostReleaseFlags.length || shrank.length || movedLiveLanes.length) {
  console.error("REFUSED: this regeneration would destroy history the tree cannot rebuild.");
  if (lostIdentities.length) {
    console.error(`  ${lostIdentities.length} claim identity(ies) present before and absent after:`);
    for (const k of lostIdentities.slice(0, 8)) console.error(`    ${k}`);
  }
  if (lostReleaseFlags.length) {
    console.error(`  ${lostReleaseFlags.length} released flag(s) would be cleared:`);
    for (const k of lostReleaseFlags.slice(0, 8)) console.error(`    ${k}`);
  }
  for (const [name, b, a] of shrank) console.error(`  ${name}: ${b} -> ${a}`);
  if (movedLiveLanes.length) {
    console.error(`  ${movedLiveLanes.length} LIVE grant(s) would change lanes — a live grant is owned:`);
    for (const m of movedLiveLanes.slice(0, 8)) console.error(`    ${m}`);
  }
  console.error("  Nothing was written. Fix the generator, not the data.");
  process.exit(1);
}

/* Guard satisfied: everything the run produced lands atomically-ish now. */
OUT.flushPendingEmits();
OUT.emit(`${OUT_DIR}/claim-ledger.json`, `${JSON.stringify(claimLedgerRecord, null, 2)}\n`);
OUT.emit(`${OUT_DIR}/CLAIM_LEDGER_REPAIR.json`, `${JSON.stringify({
  schemaVersion: "rcap-claim-ledger-repair/v1",
  assignment: "CLM01_SOURCE_CLAIM_LEDGER_REPAIR",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate.mjs",
  generatedAtCommit: claimLedgerRecord.generatedAtCommit,
  reproducedFailure: { disc06Active: true, obligations: 42, usableClaimsBefore: 0, laneKindMismatchFound: true },
  repairedContract: { sourceClaimKey: "subjectType=source-obligation + subjectId=itemId + operation", packetClaimKey: "subjectType=packet-family + subjectId=familyId + operation" },
  disc06ClaimsAfter: sourceClaimRows.filter((c) => c.lane === "DISC06").length,
  sourcePromptsRegenerated: assignments.filter((a) => a.itemKind === "sourceObligation").length,
  sourceResearchPerformed: 0,
  sourceBodiesCommitted: 0,
  packetOrOverlayFilesModified: 0,
  commercialRoutesOpened: 0,
  productionTouched: false
}, null, 2)}\n`);

for (const a of assignments) OUT.emit(a.promptFile, promptFor(a));

// This generator owns every top-level prompt in the dispatch directory. A .md
// file here that no assignment produced is an injected instruction, and C13
// showed the prompt checks would not have seen it.
/*
 * Every top-level prompt in the dispatch directory belongs to this generator,
 * EXCEPT the documents another generator writes there. Two generators owning
 * files in one directory is fine; a sweep that does not know it is not, and it
 * would report a correctly generated report as an injected instruction.
 * Named explicitly rather than pattern-matched, so adding one is a decision
 * somebody made on purpose.
 */
const OWNED_BY_ANOTHER_GENERATOR = new Set(["ROGER_SOURCE_UNBLOCK_LIST.md"]);
OUT.sweep(PROMPT_DIR, (n) => n.endsWith(".md") && !OWNED_BY_ANOTHER_GENERATOR.has(n));
OUT.finish();
if (CHECK) process.exit(0);

console.log(`Wrote ${OUT_DIR}/{MASTER_QUEUE,ACTIVE_ASSIGNMENTS,IMPORT_GRAPH,COLLISIONS,CHECKPOINT}.json`);
console.log(`Wrote ${assignments.length} prompts into ${PROMPT_DIR}/`);
console.log("");
console.log(`  live denominator ${families.length} = ${active.length} active + ${guidance.length} guidance-only + ${remaining.length} remaining`);
console.log(`  source-ready ${sourceReady.length} · source-blocked ${sourceBlocked.length} · legal-blocked ${legalBlocked.length} · verify-pending ${verifyPending.length} · repair ${repairRequired.length}`);
console.log(`  lanes: ${PF_LANES} PF · ${VF_LANES} VF · ${SOURCE_LANES} SRC · ${FIX_LANES} FIX = ${assignments.length}`);
console.log(`  collisions ${collisions.length} · duplicates ${duplicateFamilies.length} · shared-host collisions ${sharedHostCollisions.length} · placeholders ${placeholders.length}`);
for (const a of assignments.filter((x) => x.lane === "packet-build")) console.log(`    ${a.assignmentId}: ${String(a.itemCount).padStart(2)} famil(ies)  ${a.sharedAxes?.join(", ") || ""}`);
for (const a of assignments.filter((x) => x.lane === "source-swarm")) console.log(`    ${a.assignmentId}: ${String(a.itemCount).padStart(3)} obligations, ${a.familiesUnblockedCount} families`);
