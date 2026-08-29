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
  "test-internal-admin-rls-hardening.mjs": {
    disposition: "wired",
    reason:
      "Applies the authorized internal-admin authority migration to isolated PGlite and proves the content resolver, Wilma telemetry policy, support USING/WITH CHECK policy, service role, public view, tenant isolation, and historical-row preservation boundaries. Its in-process mutation controls prove each of the three changed authority contracts turns the verifier red. Required by the default npm test chain and the focused security:test-internal-admin chain; it never contacts an external database."
  },
  "verify-internal-admin-security-tools.mjs": {
    disposition: "wired",
    reason:
      "Proves the exact-email audit remains read-only and the remediation tool remains dry-run by default, UUID-distinct, receipt-first, tracked/unignored/symlink-path refusing, non-overwriting, history-preserving, and guarded by pre-plan and post-apply recovery-administrator invariants. Its in-process mutation controls make receipt and lockout contract breaks red. Required by the default npm test chain and the focused security:test-internal-admin chain; it performs no production mutation."
  },
  "verify-rcap-guidance-terminalization.mjs": {
    disposition: "keep_available",
    reason:
      "Lane B's acceptance contract for guidance/exclusion/deferral treatments. Red by design until lane B delivers every assigned state (window 2 imported the six completed B1 treatments; B2/B3 and the rest of B1 are still in flight), so it runs per-partition inside lane B and becomes a wired blocking step when the lane completes. Wiring it now would fail the chain on work that is assigned, not late."
  },
  "verify-rcap-problematic-pdf-ci-wiring.mjs": {
    disposition: "wired",
    reason:
      "Proves the problematic-PDF contract is actually reached by CI: the All50 handoff workflow must invoke it, and unconditionally, because a step guarded by the RCAP scope detector would be skipped on exactly the commit that flips a problematic route sellable. Invoked directly from the workflow rather than through npm test, since package.json is a worker image input. `--mutations` proves removing the step, making it conditional, or letting the disposition register drift each turn a named check red."
  },
  "verify-rcap-problematic-pdf-remediation.mjs": {
    disposition: "wired",
    reason:
      "The problematic-PDF lane's fail-closed contract: the structural-class vocabulary, the finalized-artifact audit's internal consistency, every unfinalized artifact and factory-written protected field reaching the register, both launch counters at zero, the master list covering the register exactly once with no vague status and nothing released from HELD, lane A claimed only with a binary in the clone, every evidence path resolving, and no blank contact sheet signed off as visual evidence. Green, with `--mutations` proving all sixteen checks go red one at a time under the tracked mutation guard. Wired directly from .github/workflows/rcap-all50-handoff.yml, both the contract and its `--mutations` pass, alongside the migration-sequence, worker-tag and hosted-verdict guards that are invoked the same way and for the same reason: package.json is a worker image input, so an npm script entry would change the image fingerprint and force a rebuild for a check that alters nothing the image contains. verify-rcap-problematic-pdf-ci-wiring.mjs holds that invocation in place."
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
  "verify-rcap-answer-dependent-patches.mjs": {
    disposition: "wired",
    reason:
      "The eight answer-dependent patch bundles for the four Blocker-4 legal questions, prepared and proved without applying. Each branch is dry-run applied to an in-memory copy of its targets and the result is diffed field by field: a repin must move provenance.profileSha256 and nothing else, a retirement must move no hash at all. It then recomputes every target's digest and requires it unchanged on disk, so \"prepared, not applied\" is asserted rather than promised. Wired because it is the guard on eight held records: if a bundle were applied without an answer, or a target drifted from the hash the matrix measured, this goes red before anything downstream reads the manifest as current.",
    decidedBy: "captain"
  },
  "verify-rcap-oregon-decision-alternatives.mjs": {
    disposition: "wired",
    reason:
      "The four Oregon alternatives -- ORS 137.225(1)(c) or (1)(d), and one acquittal packet or three routes -- measured against the repository without choosing between them. It proves the (1)(d) route id does not already exist, enumerates every committed record that carries the current route id so the rename's blast radius is a list rather than an estimate, and confirms both unreached packet sets are complete seven-component sets, which is what makes the scope question a real participant-facing gap. Wired because its last three checks are the ones that matter while waiting: the route id is unchanged, it still binds only or_acquittal-set, and no new Oregon route was created. A branch applied quietly turns those red.",
    decidedBy: "captain"
  },
  "verify-rcap-nonproduction-readiness-audit.mjs": {
    disposition: "keep_available",
    reason:
      "What publication would need, audited without dispatching. Credential presence is recorded by name and no value is ever read, printed or transmitted; absence in a non-workflow session is reported as expected rather than as a defect. It found the one live blocker: the publish workflow pins RELEASE_INTEGRATION_BRANCH to sprint/20260825-full-product-captain by literal name and refuses any SHA not contained in main or that branch, and the captain head is in neither -- so publication of this candidate would be refused before anything was fetched. Not wired: its findings are about workflow secrets and the live git graph, both of which legitimately differ between environments, so a chain entry would be red for reasons that are not defects. Run it before any dispatch.",
    decidedBy: "captain"
  },
  "verify-rcap-candidate-freeze-readiness.mjs": {
    disposition: "keep_available",
    reason:
      "The candidate-freeze checklist, evaluated rather than asserted: it shells out to verify-rcap-terminalize-c1 and counts its actual drift failures instead of restating a number, so it cannot report a count the verifier disagrees with. Expected to report NOT READY, and the value is in which gates are open -- three wait on counsel, two are the captain's. It names no candidate SHA and freezes nothing. Not wired: it is deliberately red until the legal answers land, and a chain entry that is red by design teaches a reader to ignore a red chain.",
    decidedBy: "captain"
  },
  "verify-rcap-lane-i-oregon-first-packet.mjs": {
    disposition: "fix_then_wire",
    reason:
      "The acceptance contract for the first Oregon Grade-A route. It ranks the three candidates from signals other generators already wrote, re-hashes every bound source against the mounted corpus, proves the specification hash moves when a bound official form is swapped (by swapping one, regenerating, and restoring), proves the record validates the filed PDF rather than a text composition, exercises the product path against the live record and two in-memory counterfactuals across all ten admission points, and derives four evidence records as a fixed point. Seventy-eight checks, green. It is NOT wired, and the reason is exact rather than a preference: two of its checks require the private source corpus mounted at private/source-imports/, which is git-ignored and behind a private release, and without it C1-sources fails and the derived closure drifts on sourceProvenanceMode. Wiring it would make the chain red in every environment that has not run bootstrap-private-corpus.sh. The fix is to give it the two modes the Colorado supplement verifier already has -- contract always, bytes when mounted -- with the byte checks reported as skipped rather than failed and the drift comparison excluding the corpus-dependent field. Then wire it.",
    decidedBy: "captain"
  },
  "verify-rcap-oregon-independent-visual-review.mjs": {
    disposition: "fix_then_wire",
    reason:
      "The independent page-by-page raster review of the two finalized Oregon filing artifacts, and the evidence the Grade-A record's visualReview dimension now cites. Lane C's byte-level review recorded rasterReview: not performed because it had no rasteriser, and a review that never rendered a page cannot have seen a clipped value, a caption over preprinted wording or a page that renders blank -- the defects visual review exists to catch. This renders all seven pages through Chromium's PDF engine and inspects ink coverage and luminance, bound to the artifact hashes, the page count, the specification hash and the commit carrying the bytes. Not wired yet for one reason: it launches Chromium, and the chain's other browser-dependent checks are held in the hosted workflow rather than in npm test for the same reason. The fix is to place it alongside them in .github/workflows/rcap-all50-handoff.yml rather than in package.json, and to prove it fails when a page renders blank.",
    decidedBy: "captain"
  },
  "verify-rcap-oregon-durable-render.mjs": {
    disposition: "fix_then_wire",
    reason:
      "Durable render exercised rather than reasoned about: an ephemeral PostgreSQL 16 cluster carrying the committed render-job schema, the shipped job-queue and delivery code, the real Oregon filing PDF, and a filesystem backend implementing the same PacketArtifactStorage interface as the Supabase adapter. Twenty-one checks including the write-once rule watched refusing a second write, a disagreeing stored digest failing the job with checksum_mismatch, tampered bytes failing closed at delivery, and -- with payment, validation, ownership and hash verification all satisfied -- the last door being Grade-A commercial admission, which refuses. Not wired yet because its committed evidence is compared on findings rather than bytes (job ids are generated per run), and a chain check should compare a fixed point. The fix is to make the evidence fully reproducible under a fixed id seed, then wire it beside verify-rcap-packet-delivery-db.mjs, whose PostgreSQL prerequisite it shares.",
    decidedBy: "captain"
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
  "test-rcap-hosted-acceptance-readjob.mjs": {
    disposition: "keep_available",
    reason:
      "The hosted matrix's job read, executed from the shipped bytes against a stubbed transport. It used to hash the fencing token with extensions.digest(...) through the Supabase Management API; that function is not exposed on the acceptance project, so the query errored, its non-array error body fell through an Array.isArray check, readJob returned null, and run 32195867963 reported a job that plainly existed — and that the binding case read successfully moments later — as \"(no job row)\". Fourteen checks: a real row returns with no database hashing anywhere in the query, the claim token is recorded as a deterministic Node-computed sha256 and never as itself, the raw token reaches neither the serialized diagnostics nor stdout nor stderr, person_id, matter_id and the artifact identity survive, an empty result is no_row, a PostgREST error body, an unparseable body and an error string are each query_error with a sanitized class and message carrying no credential, and only a genuine row passes jobRowOrNull. Its --mutations suite requires three breakages red: hashing in SQL again, collapsing query_error into no_row, and carrying the raw token out on the row. Blocking on every pull request via rcap-all50-handoff.yml rather than the npm test chain, because package.json is an image input for both images.",
    decidedBy: "captain"
  },
  "verify-rcap-authoritative-profile-version.mjs": {
    disposition: "keep_available",
    reason:
      "The render job's profile identity must come from the profile its route was resolved against. The consumer caller used to pass profileId: item.state beside a literal profileVersion: \"1.3.0\" that no compiled profile has ever carried, so the worker's allowlist refused every paid consumer claim with profile_version_unknown before rendering anything and no packet could be delivered (hosted run 32195867963, job ca12bf6b). Twenty-four checks: the value is derived from getProfileByJurisdiction(route.jurisdiction), no caller can name it, no version literal survives on the enqueue path, an underivable profile raises the same typed code the worker raises and the caller turns it into a typed outcome before anything durable exists; then every renderable route across all 51 compiled jurisdictions is built and checked for a nonempty id and version that exist together in the registry, come from the route's own profile, agree with the route id and renderer, and never reproduce the \"1.3.0\" stamp; hostile browser, Stripe and stale-Briefcase values are ignored; and the worker's real allowlist accepts all 49 specifications. Mississippi's hosted fixture, the three reachable Illinois sellable pathways and a composed-document route are proved by name; the absence of any renderable official-form overlay route is recorded rather than skipped; Pennsylvania is recorded as guidance-held in the evaluator while its routes still derive correctly. Its --mutations suite requires eight breakages red, including pinning today's corpus version, because that fix would recreate the same failure on the next profile update. Blocking on every pull request via rcap-all50-handoff.yml rather than the npm test chain, because package.json is an image input for both images.",
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
  },
  "verify-rcap-official-forms-d1-controls.mjs": {
    disposition: "keep_available",
    reason:
      "Controls for the reconciled verify-rcap-official-forms-d1. That reconciliation REMOVED 28 assertions - participant fixtures are no longer demanded of families whose approved terminal state is no-fill - and a check that stops failing is worth exactly what it can still catch. Six controls each reintroduce one real defect and require the verifier to go red: a participant PDF added back to a reference-only translation, a withdrawal receipt removed while the artifacts stay absent, a filing-artifact family marked complete with its canonical PDF absent, a scoped authorization removed from a family whose Edition hold was lifted, a chooser placeholder reintroduced into an expected filing artifact, and a protected-actor family turned into a participant-filled outcome. Every mutation is restored and the run refuses to finish with data/rcap-all50 dirty. Ad hoc rather than wired: it mutates tracked source, so it must not run concurrently with commits or tree reads in the shared chain, and wiring it would mean editing package.json - a worker image input - for a check that alters nothing the image contains.",
    decidedBy: "captain"
  },
  "verify-rcap-problematic-pdf-register-source-modes.mjs": {
    disposition: "keep_available",
    reason:
      "Controls for the problematic-PDF register's three source-validation states. Source-empty `--check` no longer rederives platform-ready outcomes from an empty corpus - which had silently demoted four approved assets, 5 platform_ready to 1 and the accounting 128 to 124 - and instead validates the committed register against the promotion proof generated WITH the corpus mounted. That is only defensible if it can still fail, so six controls prove it does: a current matching proof passes; a removed proof, an altered reviewed source digest and a non-approved review binding each fail in proof-backed mode; a partial corpus root fails as partial_or_invalid_source_mount rather than falling back to proof mode; and a complete mounted corpus whose bytes are not the reviewed bytes fails in mounted_corpus mode. Reads the generator's real exit code, never a pipeline sink's. Ad hoc for the same reason as the D1 controls: it mutates tracked data under data/rcap-all50 and refuses to finish dirty.",
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
// Both the top level and scripts/security/. The scan used to read only the top
// level, which meant no security verifier had ever been registered -- not the
// Clinic denial suites, and not the auth-redirect and sign-out checks that
// predate them. A register that silently omits the security directory is worse
// than no register for those files, because it reads as coverage.
//
// Entries are keyed by path relative to scripts/, so a security verifier is
// distinguishable from a top-level one of the same name and the chain-membership
// test below still matches the command as written in package.json.
function verifierFilesUnder(relativeDir) {
  const absolute = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absolute)) return [];
  return fs
    .readdirSync(absolute)
    .filter((f) => /^(verify|test|audit)-.*\.mjs$/.test(f))
    .map((f) => (relativeDir === "scripts" ? f : `${relativeDir.slice("scripts/".length)}/${f}`));
}
const onDisk = [...verifierFilesUnder("scripts"), ...verifierFilesUnder("scripts/security")].sort();

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
