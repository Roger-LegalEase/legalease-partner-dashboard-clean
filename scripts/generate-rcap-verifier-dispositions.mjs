// Generates the verifier disposition register.
//
// Every verifier script gets a recorded decision. A script with no decision is
// the failure mode this closes: 41 red verifiers and 75 unrun green ones sat in
// the tree for months because nothing forced anyone to say what they were for.
//
// Dispositions:
//   wired             already reached by `npm test`
//   wire              belongs in required CI; a milestone gate depends on it
//   keep_available    green and useful ad hoc, but no gate depends on it
//   fix_then_wire     broken, worth repairing, then reconsidered for the chain
//   blocked_on_family root-blockered to a packet family; not fixable alone
//   quarantine        unsafe to run as-is (mutates tracked state, hangs)
//   retire            delete, with a recorded reason
//
// Human decisions already in the register are preserved. Only scripts absent
// from it receive a generated default, so re-running never overwrites a call
// somebody made deliberately.
//
// Usage: node scripts/generate-rcap-verifier-dispositions.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditPath = path.join(rootDir, "data/rcap-verifier-audit.json");
const registerPath = path.join(rootDir, "data/rcap-verifier-dispositions.json");

if (!fs.existsSync(auditPath)) {
  console.error("No audit data. Run: npm run rcap:audit-orphaned-verifiers");
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));

// Decisions already made, by Roger or recorded in the build plan. These are not
// defaults and are re-applied on every generation.
const OVERRIDES = {
  "verify-rcap-guidance-terminalization.mjs": {
    disposition: "keep_available",
    reason:
      "Lane B's acceptance contract for guidance/exclusion/deferral treatments. Red by design until lane B delivers every assigned state (window 2 imported the six completed B1 treatments; B2/B3 and the rest of B1 are still in flight), so it runs per-partition inside lane B and becomes a wired blocking step when the lane completes. Wiring it now would fail the chain on work that is assigned, not late."
  },
  "verify-rcap-problematic-pdf-remediation.mjs": {
    disposition: "keep_available",
    reason:
      "The problematic-PDF lane's fail-closed contract: the structural-class vocabulary, the finalized-artifact audit's internal consistency, every unfinalized artifact and factory-written protected field reaching the register, both launch counters at zero, the master list covering the register exactly once with no vague status and nothing released from HELD, lane A claimed only with a binary in the clone, every evidence path resolving, and no blank contact sheet signed off as visual evidence. Green, with `--mutations` proving all sixteen checks go red one at a time under the tracked mutation guard. Not wired because wiring it edits package.json, which is a release-source input this lane is not authorized to touch; promoting it to `wired` is a one-line change for whoever holds that authorization."
  },
  "verify-rcap-official-forms-d1.mjs": {
    disposition: "wired",
    reason:
      "D1's acceptance verifier: 146 family packages structurally complete and sha-pinned, 62 completed implementation packages rendered with no unwritable field written. Lane D1 recorded it green but could not edit package.json; the captain wired it in the first terminalization integration window (2026-08-12-w2)."
  },
  "verify-rcap-hard-form-dispositions.mjs": {
    disposition: "wired",
    reason:
      "Lane E's non-packet treatment contract: every exact supported deferral carries exact evidence, an owner, a next action and a complete participant treatment (DE Form 281, ME CR-289). Wired by the captain in window 2026-08-12-w2."
  },
  "verify-rcap-hard-form-outputs.mjs": {
    disposition: "wired",
    reason:
      "Lane E's rendered-output proof: 12 fixtures across the four California Tier-1 hard-form families render to their recorded fingerprints with protected fields untouched. Wired by the captain in window 2026-08-12-w2."
  },
  "verify-rcap-no-checkout-on-automatic-routes.mjs": {
    disposition: "wired",
    reason:
      "The lane-B invariant made checkable everywhere: no automatic/no-filing route can produce a packet-ready result, open payment, or carry a checkout-declaring compiled rule (the MI rule-11 defect class, found in 57 rules across 14 profiles and corrected in window 2026-08-12-w2). Static sweep + live evaluation sweep + resolver assertions."
  },
  "verify-f1-evidence-markers.mjs": {
    disposition: "keep_available",
    reason:
      "F1-R evidence-hardening tool: proves a run's marked log block and its evidence artifact say the same thing, re-deriving totals from per-case results. Takes a run log as input, so it runs against each F1 run's output (and via --self-test), not in the repository chain."
  },
  "verify-tracked-mutation-safety.mjs": {
    disposition: "wired",
    reason:
      "Proof that an interrupted mutation harness cannot strand tracked bytes. Every case kills a real child process mid-mutation and hashes what is left on disk: SIGTERM against application source and against two migrations, SIGHUP, an uncaught exception, and SIGKILL — which is expected to strand the mutation, because no process can catch it, and which then proves the journal recovery puts the file back. Also proves a second mutator is refused by name, a tree-reading guard refuses to read a tree mid-mutation, and the Phase 52 and 54 suites still report every mutation red under the guard. Runs first in the chain so a stranded journal is recovered before anything else reads the tree."
  },
  "generate-rcap-d-adoption-reconciliation.mjs": {
    disposition: "wired",
    reason:
      "Reconciles Codex's D adoption-continuity findings against the final family handoff. It keeps 'the adoption is stale' separate from 'the adoption holds but the track is blocked on a different gate', and it refuses to treat an unclassifiable adoption as a legal question when it is a missing component bridge — which is what all 36 unclassified tracks turned out to be. Runs with --check in the chain. It promotes nothing and opens no speculative counsel work."
  },
  "generate-rcap-d-track-queue.mjs": {
    disposition: "wired",
    reason:
      "The captain-owned D work queue. It reconciles the final family handoff (157/8/88 across 253 families, each appearing once), recomputes every one of the 67 track gates against those final dispositions rather than carrying over the track map's older outcomes, keeps the 104 blocked component relationships in their seven distinct classifications instead of one source bucket, and freezes the four bounded correction assignments over exactly the eight open families. Runs with --check in the chain so the queue cannot drift from its inputs. It promotes nothing."
  },
  "verify-rcap-lane-b-exact-deferrals.mjs": {
    disposition: "wired",
    reason:
      "The acceptance contract for lane-B exact supported deferrals. It derives the packet set from repository bytes rather than a list, checks all ten recognition safeguards per packet, and asks the authoritative route resolver whether the packet's promise that nothing is being sold is actually true of the runtime. Its --mutations suite requires eight deliberate breakages to come back red, including blind promotion of all nine packets. Wired by the captain in window 2026-08-12-w3."
  },
  "verify-rcap-component-deferral-runtime.mjs": {
    disposition: "wired",
    reason:
      "The captain-owned runtime proof for the ten dependency-bearing composed routes: all 31 component treatments resolve, English and Spanish are complete and genuinely distinct, every participant claim cites a resolving evidence carrier, payment and checkout stay closed, no packet or partner credit is consumed, no render job is built, and the Briefcase handoff is present. Includes --mutations, which requires ten deliberate breakages — among them making the deferred route sellable in the resolver and removing either engine adapter's clamp — to come back red. Wired by the captain in window 2026-08-12-w3. It proves runtime behaviour only; it promotes nothing."
  },
  "verify-rcap-terminalize-c1.mjs": {
    disposition: "wired",
    reason:
      "Lane C1's acceptance contract, green at 27/27 (11 pleading + 16 composed tracks, 64 components, 5 recorded external-source blocks, 18 canonical renders). Wired by the captain in window 2026-08-12-w2 after re-pinning provenance profile hashes that moved with the automatic-route rule corrections."
  },
  "verify-rcap-terminalize-c2.mjs": {
    disposition: "wired",
    reason:
      "Lane C2's partition contract, complete at 24 tracks including the previously-missing Tennessee jurisdiction (tip 6b4895f4). Wired by the captain in window 2026-08-12-w3."
  },
  "verify-rcap-terminalize-c3.mjs": {
    disposition: "wired",
    reason:
      "Lane C3's partition contract, complete at 21 tracks including the previously-missing Wisconsin jurisdiction with fixture/signal hardening (tip d7fa8e5c). Wired by the captain in window 2026-08-12-w3."
  },
  "verify-rcap-no-null-presentation.mjs": {
    disposition: "wired",
    reason:
      "The lane-C3 18-document defect regression: renders every pleading config (pleadings and composed-route components) through the live renderer and fails on any escaped literal null/undefined/NaN, on a null-sovereign caption that still carries a v. line or a borrowed sovereign, and on a null custodian that does not fall back to the bracketed placeholder. Wired blocking with the captain's renderer fix in window 2026-08-12-w3."
  },
  "verify-rcap-hard-form-rendered-assertions.mjs": {
    disposition: "wired",
    reason:
      "Lane E's corrected-input proof: 43 assertions over the rendered hard-form artifacts (the F2 correction wave). Wired by the captain in window 2026-08-12-w3."
  },
  "verify-all51-launch-enabled.mjs": {
    disposition: "retire",
    reason:
      "Forces all 51 jurisdictions to enable together, which contradicts the Milestone 1 model where routes go live in certification order behind one authorization. The build plan names it for deletion and replacement by verify-national-jurisdiction-experience and verify-route-packet-readiness."
  },
  "verify-all51-source-engine.mjs": {
    disposition: "keep_available",
    reason:
      "Was rewriting its coverage report on every run, so verifying dirtied a tracked file. Now compares by default and writes only under --write, and detects a stale report. No gate depends on it yet."
  },
  "verify-mississippi-document-generator.mjs": {
    disposition: "blocked_on_family",
    rootBlocker: "legacy_generator_family_mississippi",
    reason:
      "Loads src/lib/rcap/documents/mississippi/generator.ts, which exists on no current ref. Added in e58bcc0b and since removed. AGENTS.md requires the Mississippi legacy generator be preserved while verify-all50-build asserts legacy generators are removed from the active runtime; that contradiction is the root blocker and is not resolvable inside this script."
  },
  "verify-dc-document-generator.mjs": {
    disposition: "blocked_on_family",
    rootBlocker: "legacy_generator_family_dc",
    reason: "Same root blocker as Mississippi, for the District of Columbia family."
  },
  "verify-illinois-document-generator.mjs": {
    disposition: "blocked_on_family",
    rootBlocker: "legacy_generator_family_illinois",
    reason: "Same root blocker as Mississippi, for the Illinois family."
  },
  "verify-pennsylvania-document-generator.mjs": {
    disposition: "blocked_on_family",
    rootBlocker: "legacy_generator_family_pennsylvania",
    reason: "Same root blocker as Mississippi, for the Pennsylvania family."
  },
  "verify-texas-harris-document-generator.mjs": {
    disposition: "blocked_on_family",
    rootBlocker: "legacy_generator_family_texas_harris",
    reason: "Same root blocker as Mississippi, for the Texas-Harris family."
  },
  "verify-rcap-worker-tag-guard.mjs": {
    disposition: "keep_available",
    reason:
      "Proves the worker publication workflow cannot move an existing source-SHA tag. Two publications of source 664b8ddd wrote the same tag and no record noticed, because a tag is an alias and only the sha256 digest is immutable. Ten checks: publication is serialized by source SHA, a queued publication is not cancelled, the tag is checked before the build and re-checked adjacent to the push, exactly one source-SHA tag is pushed with no latest, a short SHA is refused before any lookup, a missing credential and a refusing registry both fail closed, an existing latest alias is refused, and replacing an existing alias requires a named replace-<sha> authorization. Blocking on every pull request via rcap-all50-handoff.yml rather than the npm test chain, because package.json is an image input for both the application and the worker and adding a script entry there would invalidate the very digest this guard protects.",
    decidedBy: "captain"
  },
  "test-rcap-worker-tag-guard-mutations.mjs": {
    disposition: "keep_available",
    reason:
      "Proves each part of the source-SHA tag guard is load-bearing. Nine mutations - concurrency group no longer keyed on the source SHA, cancel-in-progress enabled, pre-push re-check removed, pre-build tag check removed, a latest alias added to the push, a short SHA accepted, a missing credential read as the tag being free, replacement no longer requiring a named authorization, and a registry lookup failure read as the tag being absent - each turn verify-rcap-worker-tag-guard red for its own named check, with signal-safe byte restoration. Blocking alongside that verifier in rcap-all50-handoff.yml for the same image-input reason.",
    decidedBy: "captain"
  },
  "verify-rcap-consumer-lifecycle-boundaries.mjs": {
    disposition: "keep_available",
    reason:
      "Proves WHERE each consumer record is created, on an ephemeral PostgreSQL 16 cluster carrying the authorized migration sequence. Fourteen checks walk one consumer matter from checkout to finalized artifact: the canonical matter id is derived from the item, checkout stores the binding the webhook must match, the server-only writer records the payment and creates NO consumption row or ledger event, enqueue binds person, matter and owner in the INSERT itself and still creates none, claim/start_packet_render/start_packet_validation each accept the state before them (so a worker that leaves a job in 'claimed' is not being refused by this contract), finalization writes the consumption row and the credit ledger event with the same identity as the job, and a reported failure leaves the job 'failed' rather than 'claimed' and consumes nothing. The hosted acceptance matrix had guessed two of these boundaries and turned one unfinalized render into four separate-looking failures; this is the contract that matrix is now written against. Blocking on every pull request via rcap-all50-handoff.yml rather than the npm test chain, because package.json is an image input for both images.",
    decidedBy: "captain"
  },
  "verify-rcap-hosted-acceptance-verdicts.mjs": {
    disposition: "keep_available",
    reason:
      "Proves the hosted Stripe payment matrix cannot report a verdict it has not earned. The matrix itself needs Stripe, Vercel and the acceptance project, but its verdict function does not: this extracts record() from the shipped bytes and executes it, requiring it to throw on a string, an empty string, a number, zero, an object, an array, null, undefined, a Boolean wrapper, one, two or four arguments, an empty case id and an empty observation, while still accepting real booleans and refusing a second verdict for the same case. It then scans every call site with a string-and-comment-aware masker (the four-argument call that made a case incapable of failing was invisible to node --check and to eslint), requires the worker case to be the conjunction of nine delivery conditions rather than a process exit code, requires queued/claimed/rendering/validating all to be failures, requires both worker streams to be captured in full and written to the uploaded evidence, and requires the binding, replay and delivery cases to stand on their own evidence rather than on finalization. Blocking on every pull request via rcap-all50-handoff.yml rather than the npm test chain, because package.json is an image input for both images.",
    decidedBy: "captain"
  },
  "test-rcap-hosted-acceptance-verdict-mutations.mjs": {
    disposition: "keep_available",
    reason:
      "Proves each part of the hosted acceptance verdict guard is load-bearing. Nineteen mutations - record() stops counting arguments, accepts anything truthy, allows a case to be recorded twice, accepts an empty observation, a real call site regains a fourth argument, the worker verdict reads a process exit code again, a claimed job stops counting as in flight, the cycle result is parsed from stdout and stderr together, a worker account contradicting the database is tolerated, the claim duration reverts to the 600-second worker default, the immutable-digest condition is dropped, the binding case loses its substitution negative controls, the owner content type stops being checked, the jurisdiction scope disappears from the evidence, the worker output is concatenated and cut to a tail again, the binding case joins the finalization-written accounting row again, the replay case demands an entitlement only finalization writes, delivery passes on refusals alone, and delivery is pointed back at the legacy consumer route - each turn verify-rcap-hosted-acceptance-verdicts red for its own named check, with signal-safe byte restoration. Blocking alongside that verifier in rcap-all50-handoff.yml for the same image-input reason.",
    decidedBy: "captain"
  }
};

// Verifiers a milestone gate depends on behaviourally. Only these are proposed
// for required CI; the plan is explicit that the chain carries gate guards, not
// everything that happens to be green.
const MILESTONE_GATE_GUARDS = new Set([
  "verify-rcap-authorization-queue.mjs",
  "verify-rcap-render-job-contract.mjs",
  "verify-rcap-render-worker.mjs",
  "verify-rcap-partner-entitlement.mjs",
  "verify-rcap-slot-lifecycle.mjs",
  "verify-internal-admin-browser-access.mjs",
  "verify-first-admin-provisioning.mjs"
]);

function defaultFor(row) {
  if (row.mutatesTrackedFiles) {
    return {
      disposition: "quarantine",
      reason: "Rewrites tracked files when run; verification must not mutate what it verifies."
    };
  }
  switch (row.status) {
    case "in_chain":
      return { disposition: "wired", reason: "Already reached by npm test." };
    case "generator_skipped":
      return {
        disposition: "keep_available",
        reason: "Generator rather than verifier; writes its own report and is run deliberately."
      };
    case "orphan_passing":
      return MILESTONE_GATE_GUARDS.has(row.file)
        ? { disposition: "wire", reason: "Green, and a milestone gate depends on this behaviour." }
        : {
            disposition: "keep_available",
            reason: "Green but no milestone gate depends on it; useful ad hoc."
          };
    case "orphan_broken":
      return {
        disposition: "fix_then_wire",
        reason: `Red when executed${row.detail ? `: ${row.detail}` : "."}`
      };
    case "orphan_timeout":
      return {
        disposition: "quarantine",
        reason: `Exceeded the ${audit.timeoutMs}ms budget; either genuinely slow or hung. Needs a bounded runtime before any gate can depend on it.`
      };
    case "added_since_audit":
      return {
        disposition: "keep_available",
        reason:
          "Added after the last coverage audit, so no measured status exists yet. Provisional; the next audit run replaces this with a measured disposition."
      };
    default:
      return { disposition: "fix_then_wire", reason: "Unclassified; needs a decision." };
  }
}

const existing = fs.existsSync(registerPath)
  ? JSON.parse(fs.readFileSync(registerPath, "utf8"))
  : { entries: {} };
const previous = existing.entries || {};

const entries = {};
let generated = 0;
let preserved = 0;
let overridden = 0;

// Scripts added since the last audit still need a decision. Classifying them by
// chain membership is honest and provisional: the next audit replaces the
// guess with a measured status. Leaving them out would let a new verifier slip
// in with no recorded decision, which is the exact gap this register closes.
const auditedFiles = new Set(audit.scripts.map((r) => r.file));
const onDisk = fs
  .readdirSync(path.join(rootDir, "scripts"))
  .filter((f) => /^(verify|test|audit)-.*\.mjs$/.test(f))
  .sort();

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const testChain = pkg.scripts?.test ?? "";

// Chain membership is measured NOW from package.json, so it always outranks a
// stale audit row: a script wired after the last audit is in_chain, not the
// orphan the old measurement remembers.
const rowsToProcess = [
  ...audit.scripts.map((row) =>
    testChain.includes(row.file) && row.status !== "in_chain"
      ? { ...row, status: "in_chain" }
      : row),
  ...onDisk
    .filter((f) => !auditedFiles.has(f))
    .map((f) => ({
      file: f,
      status: testChain.includes(f) ? "in_chain" : "added_since_audit",
      detail: null,
      wiredToNamedScript: true,
      mutatesTrackedFiles: false
    }))
];

for (const row of rowsToProcess) {
  if (OVERRIDES[row.file]) {
    entries[row.file] = {
      ...OVERRIDES[row.file],
      observedStatus: row.status,
      decidedBy: "recorded_decision"
    };
    overridden += 1;
    continue;
  }
  // "human" and "captain" decisions are both pinned records: a captain entry
  // carries context (source commits, artifact rules, mutation evidence) that a
  // regenerated two-liner would silently destroy — window 2 nearly lost the
  // phase-51 audit's committedArtifactRule this way.
  if (previous[row.file] && ["human", "captain"].includes(previous[row.file].decidedBy)) {
    entries[row.file] = { ...previous[row.file], observedStatus: row.status };
    preserved += 1;
    continue;
  }
  entries[row.file] = { ...defaultFor(row), observedStatus: row.status, decidedBy: "generated" };
  generated += 1;
}

const counts = {};
for (const entry of Object.values(entries)) {
  counts[entry.disposition] = (counts[entry.disposition] || 0) + 1;
}

const register = {
  schemaVersion: "rcap-verifier-dispositions/v1",
  purpose:
    "One recorded decision per verifier script. Reconciliation workstream opened by commit 1c3015a8, which found that only 60 of 200 verifier scripts are reached by npm test.",
  note:
    "decidedBy 'generated' is a default and may be changed freely. Set decidedBy to 'human' to pin a decision so regeneration preserves it. Entries in the script's OVERRIDES map are re-applied every run.",
  counts,
  entries
};

fs.writeFileSync(registerPath, `${JSON.stringify(register, null, 2)}\n`, "utf8");

console.log("Verifier disposition register generated.");
console.log(`  scripts        : ${Object.keys(entries).length}`);
console.log(`  generated      : ${generated}`);
console.log(`  preserved human: ${preserved}`);
console.log(`  recorded calls : ${overridden}`);
console.log("");
for (const [disposition, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${disposition}`);
}
console.log("");
console.log(`Written: ${path.relative(rootDir, registerPath)}`);
