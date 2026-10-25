// The migration authority for the hosted acceptance environment.
//
// Everything in this module is PURE: it reads files and returns decisions, and
// it opens no network connection and executes no SQL. That is deliberate — the
// selection defect this module exists to close (phase 55 applied twice, once by
// a regex-excluded baseline sweep and once by the authorized sequence) was
// invisible precisely because the decision lived inline in a script that could
// only be exercised by running it against a real project.
//
// The rules, stated once:
//
//   * data/rcap-acceptance-migration-manifest.json is the ONLY authority for
//     which migrations execute. A filename pattern is not an authority.
//   * The baseline sweep excludes manifest members BY EXACT FILENAME. It does
//     not match /^phase-(49|50|51|52|53|54)-/, which is what let phase 55
//     through.
//   * Nothing is applied until every manifest hash agrees with the file on
//     disk AND with both independent authorization records.
//   * The ledger decides what still needs applying. A recorded set that is not
//     an exact prefix of the manifest is not resumable and says so.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const MANIFEST_RELATIVE_PATH = "data/rcap-acceptance-migration-manifest.json";
export const STAGING_ACTION_RELATIVE_PATH = "data/rcap-staging-action.json";
export const AUTHORIZATION_READINESS_RELATIVE_PATH = "data/rcap-staging-authorization-readiness.json";

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

export function loadManifest(rootDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, MANIFEST_RELATIVE_PATH), "utf8"));
  if (!Array.isArray(manifest.migrations) || manifest.migrations.length === 0) {
    throw new Error("migration manifest carries no migrations");
  }
  return manifest;
}

/** sha256 over the newline-joined `phase:path:sha256` triples, in manifest order. */
export function computeManifestHash(manifest) {
  return sha256(manifest.migrations.map((m) => `${m.phase}:${m.path}:${m.sha256}`).join("\n"));
}

/**
 * The complete pre-write gate. Returns { ok, rows, errors }. `ok` false means
 * NOTHING may be applied — not the sequence, not the baseline, not the
 * hardening phase.
 */
export function verifyManifest({ manifest, rootDir, action, readiness }) {
  const errors = [];
  const rows = [];

  // 1. The manifest's own hash must describe the manifest's own contents.
  const recomputed = computeManifestHash(manifest);
  if (manifest.manifestHash !== recomputed) {
    errors.push(`manifest_hash_mismatch: recorded ${manifest.manifestHash}, recomputed ${recomputed}`);
  }

  // 2. Order must be strictly ascending, contiguous, and inside the declared range.
  const phases = manifest.migrations.map((m) => m.phase);
  const { min, max } = manifest.authorizedPhaseRange ?? {};
  for (let i = 1; i < phases.length; i += 1) {
    if (phases[i] <= phases[i - 1]) errors.push(`manifest_out_of_order: phase ${phases[i]} follows ${phases[i - 1]}`);
    if (phases[i] !== phases[i - 1] + 1) errors.push(`manifest_not_contiguous: gap between ${phases[i - 1]} and ${phases[i]}`);
  }
  if (typeof min === "number" && phases[0] !== min) errors.push(`manifest_range_start: expected ${min}, found ${phases[0]}`);
  if (typeof max === "number" && phases[phases.length - 1] !== max) errors.push(`manifest_range_end: expected ${max}, found ${phases[phases.length - 1]}`);

  // 3. The second-opinion hash records.
  const fromAction = new Map(
    (action?.migrationsInApplyOrder ?? []).map((entry) => [entry.phase, entry.sha256])
  );
  const fromReadiness =
    readiness?.blockers?.find((b) => b.id === "RCAP-SEC-001")?.resolution?.migrationSha256 ?? {};

  for (const entry of manifest.migrations) {
    const absolute = path.join(rootDir, entry.path);
    const present = fs.existsSync(absolute);
    const buf = present ? fs.readFileSync(absolute) : null;
    const onDisk = present ? sha256(buf) : null;
    const row = {
      phase: entry.phase,
      path: entry.path,
      manifestSha256: entry.sha256,
      onDiskSha256: onDisk,
      present,
      matchesManifest: present && onDisk === entry.sha256,
      matchesStagingAction: fromAction.get(entry.phase) === entry.sha256,
      matchesAuthorizationReadiness: fromReadiness[`phase-${entry.phase}`] === entry.sha256,
      byteLength: present ? buf.length : null,
      authorizationId: entry.authorizationId ?? null
    };
    rows.push(row);
    if (!row.present) errors.push(`missing_migration: ${entry.path} is listed in the manifest and absent on disk`);
    else if (!row.matchesManifest) errors.push(`hash_mismatch: ${entry.path} on disk is ${onDisk}, manifest says ${entry.sha256}`);
    if (!row.matchesStagingAction) errors.push(`staging_action_disagrees: phase ${entry.phase}`);
    if (!row.matchesAuthorizationReadiness) errors.push(`authorization_readiness_disagrees: phase ${entry.phase}`);
  }

  // 4. No extra migration inside the authorized range may exist on disk.
  //    This is what catches a phase-53a or phase-55b added after authorization.
  const listed = new Set(manifest.migrations.map((m) => m.path));
  const dir = manifest.migrationsRootDir ?? "supabase";
  const onDiskInRange = fs
    .readdirSync(path.join(rootDir, dir))
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({ name, rel: `${dir}/${name}`, phase: phaseNumberOf(name) }))
    .filter((f) => f.phase !== null && typeof min === "number" && typeof max === "number" && f.phase >= min && f.phase <= max);
  for (const f of onDiskInRange) {
    if (!listed.has(f.rel)) {
      errors.push(`unknown_migration: ${f.rel} sits inside the authorized range ${min}-${max} and is not in the manifest`);
    }
  }
  // And no manifest member may sit outside the declared range.
  for (const entry of manifest.migrations) {
    const n = phaseNumberOf(path.basename(entry.path));
    if (n === null || n < min || n > max) errors.push(`manifest_member_out_of_range: ${entry.path}`);
  }

  return { ok: errors.length === 0, rows, errors, manifestHash: recomputed };
}

/**
 * The AUTHORIZATION gate, kept separate from the integrity gate above.
 *
 * verifyManifest answers "are these the authorized bytes". This answers a
 * different question that nothing previously asked: "is this migration
 * authorized to be applied to a hosted acceptance project at all".
 *
 * They are separate because they fail for different reasons and are fixed by
 * different people. A hash mismatch is an engineering fault. A withheld
 * authorization is Roger's decision, and no amount of correct hashing makes a
 * `queued` migration runnable.
 *
 * Every member must carry an acceptance/staging record beginning with the word
 * "authorized". `queued` — including "queued — explicitly withheld by the
 * authorizing instruction" — is a refusal.
 */
export function verifyAcceptanceAuthorization({ manifest }) {
  const rows = manifest.migrations.map((entry) => ({
    phase: entry.phase,
    path: entry.path,
    authorizationId: entry.authorizationId ?? null,
    authorizationScope: entry.authorizationScope ?? null,
    acceptanceAuthorizationRecord: entry.acceptanceAuthorizationRecord ?? null,
    acceptanceAuthorized: entry.acceptanceAuthorized === true,
    productionAuthorizationRecord: entry.productionAuthorizationRecord ?? null
  }));
  const withheld = rows.filter((r) => !r.acceptanceAuthorized);
  const errors = withheld.map(
    (r) =>
      `acceptance_authorization_withheld: phase ${r.phase} (${r.path}) is recorded as ` +
      `"${r.acceptanceAuthorizationRecord ?? "no acceptance authorization recorded"}" under scope ` +
      `"${r.authorizationScope ?? "none"}"`
  );
  return {
    ok: withheld.length === 0,
    rows,
    withheldPhases: withheld.map((r) => r.phase),
    errors,
    // Named here so the runner's refusal message and the report cannot drift apart.
    remedy:
      "Roger must record an acceptance authorization for each withheld phase in " +
      "data/rcap-staging-action.json (migrationsInApplyOrder[].scopedAuthorization.staging or " +
      ".acceptance), naming the migration files and the acceptance environment, and the manifest " +
      "must be regenerated from it. Until then hosted_migrate applies nothing."
  };
}

/** `phase-53-…sql` -> 53. `phase-35b-…sql` -> 35. Anything else -> null. */
export function phaseNumberOf(basename) {
  const m = /^phase-(\d+)([a-z]*)-/.exec(basename);
  return m ? Number(m[1]) : null;
}

/** Deterministic baseline ordering: the un-numbered schema file, then phases ascending with letter suffixes in order. */
export function baselineSortKey(basename) {
  const m = /^phase-(\d+)([a-z]*)-/.exec(basename);
  if (!m) return [-2, "", basename];
  return [Number(m[1]), m[2], basename];
}

/**
 * The baseline set: every .sql file that is NOT a manifest member and NOT an
 * explicit exclusion, in deterministic order.
 *
 * The exclusion is by EXACT relative path taken from the manifest, never by
 * pattern. Under the old regex (`/^phase-(49|50|51|52|53|54)-/`) phase 55 was
 * not excluded, so it was applied here AND again as the last authorized entry.
 */
export function selectBaselineFiles({ manifest, fileNames }) {
  const dir = manifest.migrationsRootDir ?? "supabase";
  const excluded = new Set([
    ...manifest.migrations.map((m) => m.path),
    ...(manifest.baselineExclusions ?? [])
  ]);
  return fileNames
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({ name, rel: `${dir}/${name}` }))
    .filter((f) => !excluded.has(f.rel))
    .sort((a, b) => {
      const [an, as_, af] = baselineSortKey(a.name);
      const [bn, bs, bf] = baselineSortKey(b.name);
      return an - bn || as_.localeCompare(bs) || af.localeCompare(bf);
    })
    .map((f) => f.rel);
}

/**
 * What the authorized sequence still has to do, given the ledger.
 *
 * ledgerRows: [{ phase, sha256 }] as read from rcap_acceptance_migration_ledger.
 *
 * Returns one of three modes and never a fourth:
 *   apply    — the recorded set is an exact prefix; resume at `toApply[0]`
 *   noop     — all manifest hashes are already recorded; verify only
 *   blocked  — the recorded set is not resumable; `recovery` says exactly what to do
 */
export function planSequence({ manifest, ledgerRows }) {
  const ledger = new Map((ledgerRows ?? []).map((r) => [Number(r.phase), String(r.sha256)]));
  const manifestPhases = new Set(manifest.migrations.map((m) => m.phase));

  const unknown = [...ledger.keys()].filter((p) => !manifestPhases.has(p)).sort((a, b) => a - b);
  if (unknown.length > 0) {
    return blocked(
      `ledger_records_unknown_phase`,
      `The ledger records phase(s) ${unknown.join(", ")}, which the manifest does not authorize. This environment was built by a different authority than the one this run carries.`,
      { unknownPhases: unknown }
    );
  }

  const drift = manifest.migrations
    .filter((m) => ledger.has(m.phase) && ledger.get(m.phase) !== m.sha256)
    .map((m) => ({ phase: m.phase, recorded: ledger.get(m.phase), manifest: m.sha256 }));
  if (drift.length > 0) {
    return blocked(
      `ledger_hash_differs_from_manifest`,
      `Phase(s) ${drift.map((d) => d.phase).join(", ")} are recorded at bytes this manifest does not authorize. Re-applying would layer authorized bytes on top of unauthorized ones.`,
      { drift }
    );
  }

  // The recorded set must be a PREFIX. A gap means an earlier phase never took
  // effect while a later one did, and the sequence is indivisible by design.
  const appliedFlags = manifest.migrations.map((m) => ledger.has(m.phase));
  const firstUnapplied = appliedFlags.indexOf(false);
  if (firstUnapplied !== -1 && appliedFlags.slice(firstUnapplied).some(Boolean)) {
    const gaps = manifest.migrations.filter((m, i) => !appliedFlags[i] && i > firstUnapplied - 1 && appliedFlags.slice(i).some(Boolean));
    return blocked(
      `ledger_sequence_has_a_gap`,
      `The ledger is not a prefix of the manifest: phase(s) ${gaps.map((g) => g.phase).join(", ")} are unrecorded while a later phase is recorded. An environment that skipped a phase mid-sequence reintroduces RCAP-SEC-001 by construction and must not serve a participant.`,
      { recordedPhases: [...ledger.keys()].sort((a, b) => a - b) }
    );
  }

  const alreadyApplied = manifest.migrations.filter((m) => ledger.has(m.phase));
  const toApply = manifest.migrations.filter((m) => !ledger.has(m.phase));

  if (toApply.length === 0) {
    return {
      mode: "noop",
      toApply: [],
      alreadyApplied,
      blocked: false,
      reason: `all ${manifest.migrations.length} manifest hashes are already recorded in the ledger; this run verifies and applies nothing`,
      recovery: null
    };
  }

  return {
    mode: "apply",
    toApply,
    alreadyApplied,
    blocked: false,
    reason:
      alreadyApplied.length === 0
        ? `no phase is recorded; the full sequence ${manifest.migrations.map((m) => m.phase).join(",")} will be applied in order`
        : `phases ${alreadyApplied.map((m) => m.phase).join(",")} are recorded at their exact manifest hashes; resuming at phase ${toApply[0].phase}`,
    recovery: null
  };
}

function blocked(code, reason, detail = {}) {
  return {
    mode: "blocked",
    toApply: [],
    alreadyApplied: [],
    blocked: true,
    code,
    reason,
    detail,
    recovery:
      "RECOVERY: this acceptance project is not resumable. Delete the Supabase project " +
      "and create a new one, then re-run hosted_preflight (which re-proves the new project " +
      "carries no production data) followed by hosted_migrate. Do NOT re-run hosted_migrate " +
      "against this project: the ledger and the manifest disagree, and applying authorized " +
      "bytes on top of an unauthorized state produces an environment no evidence describes. " +
      "No production project is ever eligible for this action."
  };
}

/**
 * Proves the ledger, after a run, is exactly the manifest sequence once each.
 * This is the assertion the runner records as `ledger_sequence_is_exactly_the_manifest`.
 */
export function assertLedgerSequence({ manifest, ledgerRows }) {
  const expected = manifest.migrations.map((m) => m.phase);
  const observedRaw = (ledgerRows ?? []).map((r) => Number(r.phase));
  const observed = [...observedRaw].sort((a, b) => a - b);
  const errors = [];

  const duplicates = observedRaw.filter((p, i) => observedRaw.indexOf(p) !== i);
  if (duplicates.length > 0) errors.push(`duplicate_ledger_entries: ${[...new Set(duplicates)].join(", ")}`);
  if (observed.length !== expected.length) errors.push(`ledger_length: expected ${expected.length}, observed ${observed.length}`);
  for (const phase of expected) if (!observed.includes(phase)) errors.push(`ledger_missing_phase: ${phase}`);
  for (const phase of observed) if (!expected.includes(phase)) errors.push(`ledger_extra_phase: ${phase}`);
  if (observed.join(",") !== expected.join(",")) errors.push(`ledger_sequence: expected ${expected.join(",")}, observed ${observed.join(",")}`);

  // One entry per migration, and exactly one — this is the phase-55 assertion.
  const perPhase = Object.fromEntries(expected.map((p) => [p, observedRaw.filter((o) => o === p).length]));
  for (const [phase, count] of Object.entries(perPhase)) {
    if (count !== 1) errors.push(`phase_${phase}_execution_count: ${count} (must be exactly 1)`);
  }

  return { ok: errors.length === 0, expected, observed, perPhase, errors };
}

/**
 * Which partial states force delete-and-recreate rather than a resume.
 * Readback facts come from the runner; this keeps the rule in one place.
 */
export function recoveryDisposition({ plan, readback }) {
  if (plan.blocked) {
    return { resumeSafe: false, action: "delete_and_recreate", reason: plan.reason, code: plan.code };
  }
  const forced = [];
  if (readback?.phase50Recorded && readback?.phase50ObjectsIncomplete) {
    forced.push(
      "phase 50 is recorded but its objects are incomplete. Phase 50 DROPS the phase-49 accounting tables and creates its triggers unconditionally, so the pre-drop state cannot be re-derived and a re-run collides on the trigger."
    );
  }
  if (readback?.phase53Recorded && readback?.phase53SignatureWrong) {
    forced.push(
      "phase 53 is recorded but the enqueue signature is wrong. Phase 53 DROPS the 13-argument enqueue; a half-state can create a consumer job with no consumer binding, which finalization then correctly refuses forever."
    );
  }
  if (forced.length > 0) {
    return { resumeSafe: false, action: "delete_and_recreate", reason: forced.join(" "), code: "irreversible_partial_state" };
  }
  return {
    resumeSafe: true,
    action: plan.mode === "noop" ? "verify_only" : "resume_from_first_unapplied",
    reason: plan.reason,
    code: plan.mode
  };
}
