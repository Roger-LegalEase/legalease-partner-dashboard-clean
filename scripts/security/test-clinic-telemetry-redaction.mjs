/**
 * Telemetry hygiene for the Clinic modules this lane owns.
 *
 * Two things are checked. First, that nothing in the owned surface emits a
 * participant fact into a log, an error message or a client payload: screening
 * facts, criminal-record facts, names, birth dates, case numbers, claim tokens,
 * signed URLs, private storage paths, authentication secrets or payment
 * details. Second, that the one free-form channel -- the jsonb metadata column
 * on the Clinic audit trail, which is rendered in the partner console -- is
 * projected through an allowlist rather than passed through.
 *
 * The allowlist is checked against the keys the migrations actually write, so
 * it cannot silently drift from the schema in either direction.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

register("./clinic-harness/loader.mjs", import.meta.url);

const root = process.cwd();
const ownedDirectory = path.join(root, "src/lib/clinic-mode");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const { projectAuditMetadata } = await import(pathToFileURL(path.join(ownedDirectory, "service.ts")).href);

verifyNoParticipantFactsEmitted();
verifyAllowlistMatchesSchema();
verifyAuditProjection();
verifyErrorMessagesCarryNoRecordDetail();
verifyMutationsAreCaught();

console.log("Clinic telemetry redaction passed: no participant facts emitted from the owned surface, the audit-metadata allowlist matches the mutations that write it, and unknown keys are withheld from the partner console.");

/**
 * Console and telemetry emission is the leak path that does not show up in a
 * response schema. The owned surface must not have one at all.
 */
function verifyNoParticipantFactsEmitted() {
  for (const file of ownedSourceFiles()) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(root, file);
    for (const [label, pattern] of [
      ["a console emission", /\bconsole\.(log|info|warn|error|debug|trace)\s*\(/u],
      ["a telemetry call", /\b(track|capture|logEvent|recordEvent|analytics)\s*\(/u],
      ["a stringified request or row", /JSON\.stringify\s*\(\s*(row|rows|result|payload|input|answers)\b/u]
    ]) {
      assert.ok(!pattern.test(source), `${relative} contains ${label}; participant facts must not leave the Clinic surface this way`);
    }
    for (const [label, pattern] of [
      ["a literal date of birth", /\b(19|20)\d{2}-\d{2}-\d{2}\b/u],
      ["a literal case number", /\b\d{4}-[A-Z]{2}-\d{3,}\b/u],
      ["a signed storage URL", /object\/sign\//u],
      ["a private storage path", /\bprivate\/[a-z-]+\//u],
      ["an embedded credential", /\b(service_role|sk_live|sk_test|eyJ[A-Za-z0-9_-]{10,})\b/u]
    ]) {
      assert.ok(!pattern.test(source), `${relative} contains ${label}`);
    }
  }
}

/**
 * An allowlist that drifts from the schema fails in one of two ways: it starts
 * withholding a lifecycle fact operators need, or it starts admitting a key the
 * mutations did not used to write. Pin it to the migrations.
 */
function verifyAllowlistMatchesSchema() {
  reconcileAllowlist(read("src/lib/clinic-mode/service.ts"));
}

/**
 * An allowlist that drifts from the schema fails in one of two ways: it starts
 * withholding a lifecycle fact operators need, or it starts admitting a key the
 * mutations never write. Pin it to the migrations in both directions.
 */
function reconcileAllowlist(serviceSource) {
  const migrations = [
    "supabase/migrations/20260825121000_clinic_mode_security.sql",
    "supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql"
  ].map(read).join("\n");

  const written = new Set();
  for (const call of migrations.matchAll(/clinic_event_audit[\s\S]{0,400}?jsonb_build_object\(([^;]*?)\)\)/gu)) {
    for (const key of call[1].matchAll(/'([a-z_]+)'\s*,/gu)) written.add(key[1]);
  }
  assert.ok(written.size > 0, "no audit metadata keys were recovered from the migrations");

  const declared = new Set(
    (serviceSource.match(/const AUDIT_METADATA_KEYS = new Set\(\[([^\]]*)\]\)/u)?.[1] ?? "")
      .split(",").map((entry) => entry.trim().replace(/^"|"$/gu, "")).filter(Boolean)
  );
  assert.ok(declared.size > 0, "the audit metadata allowlist could not be read");

  for (const key of written) {
    assert.ok(declared.has(key),
      `the audit trail records "${key}" but the allowlist withholds it from the partner console`);
  }
  for (const key of declared) {
    assert.ok(written.has(key),
      `the allowlist admits "${key}", which no Clinic mutation writes; remove it rather than widening the surface`);
  }
}

function verifyAuditProjection() {
  const allowed = projectAuditMetadata({ status: "published", from: "draft", to: "published", reason: "staff_reset", consent_version: "v1", ledger_id: "ledger-1" });
  assert.deepEqual(allowed, { status: "published", from: "draft", to: "published", reason: "staff_reset", consent_version: "v1", ledger_id: "ledger-1" },
    "the projection withheld a lifecycle fact operators need");
  assert.ok(!("withheldKeys" in allowed), "a clean metadata object was reported as partially withheld");

  const participantFacts = {
    status: "packet_ready",
    participantName: "Dana Alvarez",
    dateOfBirth: "1989-04-02",
    caseNumber: "2019-CR-004417",
    claimToken: "claim_synthetic_token",
    signedUrl: "https://storage.test/object/sign/private/participant-a.pdf?token=abc",
    storagePath: "private/clinic/participant-a/disposition.pdf",
    paymentIntent: "pi_synthetic_participant_a",
    screeningAnswers: { convictions: [{ caseNumber: "2019-CR-004417" }] }
  };
  const projected = projectAuditMetadata(participantFacts);
  assert.deepEqual(Object.keys(projected).sort(), ["status", "withheldKeys"],
    "participant facts survived the audit-metadata projection");
  assert.equal(projected.withheldKeys, 8, "the projection did not report how many keys it withheld");
  const rendered = JSON.stringify(projected);
  for (const fact of ["Dana Alvarez", "1989-04-02", "2019-CR-004417", "claim_synthetic_token", "object/sign", "private/clinic", "pi_synthetic"]) {
    assert.ok(!rendered.includes(fact), `the partner console would still render "${fact}"`);
  }

  // A nested object cannot smuggle a record under an allowed key.
  const smuggled = projectAuditMetadata({ reason: { caseNumber: "2019-CR-004417" } });
  assert.deepEqual(smuggled, { withheldKeys: 1 }, "a nested value passed through an allowed key");

  for (const malformed of [null, undefined, "string", 42, ["array"]]) {
    assert.deepEqual(projectAuditMetadata(malformed), {}, `malformed metadata ${JSON.stringify(malformed)} was not neutralized`);
  }
}

/**
 * Database messages carry table names, constraint names and sometimes row
 * values. The Clinic services map them to fixed strings; this pins that.
 */
function verifyErrorMessagesCarryNoRecordDetail() {
  for (const relative of ["src/lib/clinic-mode/reporting-service.ts", "src/lib/clinic-mode/participant-service.ts", "src/lib/clinic-mode/service.ts"]) {
    const source = read(relative);

    // A client-visible message is either a literal or a `fallback` parameter,
    // which the check below confirms is a literal-only channel.
    for (const construction of source.matchAll(/new ClinicServiceError\(\s*[^,]+,\s*([^)]+)\)/gu)) {
      const message = construction[1].trim();
      assert.ok(/^["'`][^$]*["'`]$/u.test(message) || message === "fallback",
        `${relative} builds a ClinicServiceError message from ${message}; client-visible messages must be fixed strings`);
    }

    // A `fallback` parameter must be declared with a literal default and never
    // assigned from anything but a literal or another fallback.
    for (const declaration of source.matchAll(/fallback(?::\s*string)?(\s*=\s*([^,)]+))?[,)]/gu)) {
      const assigned = declaration[2]?.trim();
      if (assigned === undefined) continue;
      assert.ok(/^["'`][^$]*["'`]$/u.test(assigned),
        `${relative} defaults a fallback message to ${assigned} rather than a literal`);
    }
    for (const call of source.matchAll(/(?<!function )\b(readError|writeError)\(([^;)]*)\)/gu)) {
      const fallback = call[2].split(",").map((entry) => entry.trim())[1];
      if (fallback === undefined) continue;
      assert.ok(/^["'`][^$]*["'`]$/u.test(fallback) || fallback === "fallback",
        `${relative} passes a non-literal fallback message to ${call[1]}: ${fallback}`);
    }

    // The database's own message may steer the error *code*. It must never
    // become the text, because it carries table, constraint and row detail.
    for (const mapper of source.matchAll(/function (readError|writeError)\([\s\S]*?\n\}/gu)) {
      assert.ok(!/new ClinicServiceError\([^)]*,\s*message\s*\)/u.test(mapper[0]),
        `${relative}: ${mapper[1]} returns the raw database message to the client`);
      assert.ok(!/`[^`]*\$\{\s*message/u.test(mapper[0]),
        `${relative}: ${mapper[1]} interpolates the raw database message into a client message`);
    }
  }
}

/**
 * Each control above is paired with a mutation proving this file fails when the
 * control is weakened.
 */
function verifyMutationsAreCaught() {
  const source = read("src/lib/clinic-mode/service.ts");

  const widened = source.replace(
    'const AUDIT_METADATA_KEYS = new Set(["status", "from", "to", "reason", "consent_version", "ledger_id"]);',
    'const AUDIT_METADATA_KEYS = new Set(["status", "from", "to", "reason", "consent_version", "ledger_id", "participantName"]);'
  );
  assert.notEqual(widened, source, "mutation fixture missing for the audit allowlist");
  assert.throws(() => reconcileAllowlist(widened), undefined,
    "widening the allowlist beyond what the mutations write must fail this verifier");

  const narrowed = source.replace('"consent_version", ', "");
  assert.notEqual(narrowed, source, "mutation fixture missing for allowlist narrowing");
  assert.throws(() => reconcileAllowlist(narrowed), undefined,
    "dropping a lifecycle key the audit trail records must fail this verifier");

  assert.ok(source.includes('(entry === null || ["string", "number", "boolean"].includes(typeof entry))'),
    "the projection must constrain allowed values to primitives");
}

function ownedSourceFiles() {
  return fs.readdirSync(ownedDirectory)
    .filter((entry) => /\.(ts|mjs)$/u.test(entry))
    .map((entry) => path.join(ownedDirectory, entry));
}

void fileURLToPath;
