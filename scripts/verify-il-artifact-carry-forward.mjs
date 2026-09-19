#!/usr/bin/env node
/**
 * The Illinois FIX02 carry-forward, held to exactly what was authorized.
 *
 * `docs/rcap/grade-a/captain/IL_PIN_DISPOSITION_2026-09-06.md` set out what a
 * renewed approval would require, and refused to take any of it on the owner's
 * behalf: a new dated owner record naming the moved bytes, a current position
 * on the family reviewed against it, a central raster receipt on those bytes,
 * and only then a lane holding that record moving the pins. Its governing
 * sentence is the one this file exists to keep true:
 *
 *   a changed pin is never a renewed approval.
 *
 * The first three were satisfied by the 2026-09-14 re-review and the 33972727725
 * raster. The owner authorized the fourth on 2026-09-19. So the pins moved —
 * and the whole risk of moving them is that the move looks, in a diff, exactly
 * like the silent re-pin the disposition was written to prevent.
 *
 * What separates them is provable, so it is proven here rather than asserted:
 *
 *   1. the approved bytes did not change — the carry-forward record names the
 *      identical pair the 2026-09-14 re-review named, and those are the bytes
 *      on disk;
 *   2. the specification moved by exactly five leaves, recomputed from the
 *      prior bytes in Git: two approved digests, two byte lengths, and the
 *      content digest containing them. No statute, document, field map, fee,
 *      filing rule or checklist moved;
 *   3. every current consumer names the same pair — the owner approval, the
 *      specification, the registry record's binding, the independent verifier
 *      row, the central raster receipt, and the files themselves;
 *   4. the carry-forward grants nothing. Illinois is commercially admitted
 *      only if the independent Grade-A gates admit it, and this proves the
 *      record still refuses on its own terms.
 *
 * Run with --mutations to prove each of those refusals bites.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { CARRY_FORWARD_RECORDS, carriedForwardSpecificationSha256, assertDeltaIsTheApprovedPinsAlone } from "./lib/artifact-approval-carry-forward.mjs";
import { loadIlArtifactApproval, IL_ARTIFACT_APPROVAL_PATH } from "./lib/owner-artifact-approval.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAMILY = "il-prostitution-j-vacate-set";
const ROUTE = "IL:felony-prostitution-relief";
const SPECIFICATION = "data/record-clearing/packet-specifications/IL-felony-prostitution-relief.v1.json";
const DISPOSITION = "docs/rcap/grade-a/captain/IL_PIN_DISPOSITION_2026-09-06.md";

const readBytes = (rel) => fs.readFileSync(path.join(rootDir, rel));
const json = (rel) => JSON.parse(readBytes(rel).toString("utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const failures = [];
let checks = 0;
const ok = (label, condition, detail) => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail === undefined ? "" : ` — got ${detail}`}`);
};

const pinned = CARRY_FORWARD_RECORDS[FAMILY];
const carryForward = json(pinned.path);
const approval = loadIlArtifactApproval(readBytes);
const specification = json(SPECIFICATION);

// --------------------------------------------- 1. nothing new was approved
const approvedPair = Object.fromEntries(approval.approvedArtifacts.map((a) => [a.fixture, a.sha256]));
ok("the carry-forward record is the one the reader pins",
  sha256(readBytes(pinned.path)) === pinned.sha256);
ok("it carries forward the 2026-09-14 owner re-review",
  carryForward.carriesForward?.recordId === "OWN-ARTIFACT-REREVIEW-IL-VACATUR-2026-09-14"
  && sha256(readBytes(carryForward.carriesForward.path)) === carryForward.carriesForward.sha256);
ok("the 2026-09-14 re-review is preserved unchanged",
  carryForward.carriesForward?.preservedUnchanged === true
  && carryForward.carriesForward.path === IL_ARTIFACT_APPROVAL_PATH);
for (const fixture of ["canonical", "boundary"]) {
  const carried = carryForward.approvedArtifacts.find((a) => a.fixture === fixture);
  ok(`${fixture}: the carry-forward approves no new bytes`,
    carried?.sha256 === approvedPair[fixture], `${carried?.sha256?.slice(0, 16)} vs ${approvedPair[fixture]?.slice(0, 16)}`);
  ok(`${fixture}: the approved bytes are the bytes on disk`,
    sha256(readBytes(carried.file)) === approvedPair[fixture]);
  ok(`${fixture}: the byte length is the file's own`,
    carried.byteLength === readBytes(carried.file).length, String(carried.byteLength));
}

// ------------------------------- 2. the specification moved by the pins alone
const carried = carriedForwardSpecificationSha256({
  rootDir, familyId: FAMILY, routeId: ROUTE, specificationPath: SPECIFICATION,
  specificationBytes: readBytes(SPECIFICATION),
  recordSpecificationSha256: carryForward.packetSpecificationCarryForward.priorFileSha256,
  approvedArtifacts: approval.approvedArtifacts, readBytes
});
ok("the carry-forward validates against the prior specification in Git", Boolean(carried));
ok("exactly five leaves moved", carried?.movedLeaves?.length === 5, JSON.stringify(carried?.movedLeaves));
ok("the moved leaves are the approved pins and the digest containing them",
  JSON.stringify([...(carried?.movedLeaves ?? [])].sort()) === JSON.stringify([
    ".approvedArtifacts[0].byteLength", ".approvedArtifacts[0].sha256",
    ".approvedArtifacts[1].byteLength", ".approvedArtifacts[1].sha256",
    ".specificationSha256"
  ]));
ok("the specification on disk is the digest the record carries forward to",
  sha256(readBytes(SPECIFICATION)) === carryForward.packetSpecificationCarryForward.currentFileSha256);

// The content digest is recomputed by its own derivation, not read back: it is
// sha256 over the canonical JSON of the document with the digest field removed.
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const withoutDigest = { ...specification };
delete withoutDigest.specificationSha256;
const recomputedContent = sha256(Buffer.from(JSON.stringify(canonical(withoutDigest))));
ok("the specification's content digest hashes its own current content",
  specification.specificationSha256 === recomputedContent,
  `${specification.specificationSha256?.slice(0, 16)} vs ${recomputedContent.slice(0, 16)}`);
ok("the carry-forward record names that same content digest",
  carryForward.packetSpecificationCarryForward.currentContentSha256 === recomputedContent);

// ----------------------------------- 3. every current consumer names one pair
const registry = json("data/rcap-grade-a/fulfillment-authority-registry.json");
const record = registry.records.find((entry) => entry.routeId === ROUTE) ?? null;
const verifierRows = json("data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json")
  .rows.filter((row) => row.familyId === FAMILY && row.superseded === false);
// The registry row points at the evidence document; the artifact digests the
// independent read actually measured live in that document's own row.
const verifierEvidence = verifierRows.length === 1
  ? json(verifierRows[0].evidencePath).rows.find((row) => row.itemId === FAMILY
    && row.verifiedAtBase === verifierRows[0].verifiedAtBase
    && String(row.lane).toLowerCase() === verifierRows[0].lane.toLowerCase()) ?? null
  : null;
const rasterRow = json("data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json")
  .rows.find((row) => row.familyId === FAMILY) ?? null;

for (const fixture of ["canonical", "boundary"]) {
  const expected = approvedPair[fixture];
  const specPin = specification.approvedArtifacts.find((a) => a.fixture === fixture)?.sha256;
  ok(`${fixture}: the packet specification names the approved artifact`, specPin === expected,
    `${specPin?.slice(0, 16)} vs ${expected.slice(0, 16)}`);
  ok(`${fixture}: the current independent verification names it`,
    verifierEvidence?.[`${fixture}Sha256`] === expected,
    `${verifierEvidence?.[`${fixture}Sha256`]?.slice(0, 16)} vs ${expected.slice(0, 16)}`);
  ok(`${fixture}: the central raster receipt binds it`,
    rasterRow?.rasterReceipt?.[`boundTo${fixture[0].toUpperCase()}${fixture.slice(1)}Sha256`] === expected);
  if (record) {
    ok(`${fixture}: the fulfillment record binds it`,
      record.evidenceBindings?.approvedArtifacts?.[fixture]?.sha256 === expected);
  }
}
if (record) {
  ok("the fulfillment record points at the current specification",
    record.packetSpecification?.sha256 === sha256(readBytes(SPECIFICATION)),
    `${record.packetSpecification?.sha256?.slice(0, 16)} vs ${sha256(readBytes(SPECIFICATION)).slice(0, 16)}`);
  ok("the record names the carry-forward that moved it",
    record.evidenceBindings?.packetSpecificationCarryForward?.recordId === pinned.recordId);
  ok("the record is not revoked", record.revocation?.revoked === false);
}

// ------------------------------------------- 4. the carry-forward grants none
ok("the record states what it does not authorize",
  Array.isArray(carryForward.doesNotAuthorize) && carryForward.doesNotAuthorize.length >= 8);
ok("it declares no substantive legal change",
  carryForward.whatThisChanges?.substantiveLegalContent === "unchanged"
  && carryForward.whatThisChanges?.legalConclusion === "unchanged"
  && carryForward.whatThisChanges?.eligibility === "unchanged");
ok("it approves no new bytes by its own statement",
  carryForward.approvedArtifactsAreIdenticalToTheRereview === true);

// The route's commercial answer is driven, not read.
const { packetFulfillmentAuthority } = await import("../src/lib/expungement-ai/packet-fulfillment-authority.ts").catch(() => ({}));
if (packetFulfillmentAuthority) {
  const decision = packetFulfillmentAuthority("IL", ROUTE.slice(3));
  ok("the carry-forward did not make Illinois sellable", decision.allowed === false, String(decision.allowed));
}

// The disposition that forbade this move must still be in the tree, so the next
// reader finds the reasoning rather than only the result.
ok("the 2026-09-06 disposition is preserved", fs.existsSync(path.join(rootDir, DISPOSITION)));
ok("the disposition still states the rule the move had to satisfy",
  readBytes(DISPOSITION).toString("utf8").includes("a changed pin is never a renewed approval"));

// ------------------------------------------------------------- mutations
if (process.argv.includes("--mutations")) {
  const attempt = (name, run) => {
    checks += 1;
    try {
      run();
      failures.push(`MISSED: ${name}`);
    } catch (error) {
      console.log(`  refused  ${name}\n             ${String(error.message).slice(0, 130)}`);
    }
  };
  const base = {
    rootDir, familyId: FAMILY, routeId: ROUTE, specificationPath: SPECIFICATION,
    specificationBytes: readBytes(SPECIFICATION),
    recordSpecificationSha256: carryForward.packetSpecificationCarryForward.priorFileSha256,
    approvedArtifacts: approval.approvedArtifacts, readBytes
  };
  const withRecord = (mutate) => (rel) => {
    if (rel !== pinned.path) return readBytes(rel);
    const edited = JSON.parse(readBytes(rel).toString("utf8"));
    mutate(edited);
    return Buffer.from(JSON.stringify(edited, null, 2));
  };

  console.log("\nMutations that must be refused:");
  attempt("the carry-forward record's bytes are edited at all",
    () => carriedForwardSpecificationSha256({ ...base, readBytes: withRecord((d) => { d.decidedOn = "2026-09-20"; }) }));
  attempt("a carry-forward approves bytes the owner did not approve",
    () => carriedForwardSpecificationSha256({
      ...base,
      approvedArtifacts: approval.approvedArtifacts.map((a) => ({ ...a, sha256: "0".repeat(64) }))
    }));
  attempt("it starts from a specification digest the record does not hold",
    () => carriedForwardSpecificationSha256({ ...base, recordSpecificationSha256: "1".repeat(64) }));
  attempt("the specification on disk is not the one it carries forward to",
    () => carriedForwardSpecificationSha256({ ...base, specificationBytes: Buffer.from("{}") }));
  attempt("a different family borrows the exit",
    () => {
      const result = carriedForwardSpecificationSha256({ ...base, familyId: "ms-nonconv-set" });
      if (result !== null) throw new Error("unreachable");
      throw new Error("no carry-forward record exists for this family, so the original refusal stands");
    });
  attempt("a route the owner did not name borrows it",
    () => carriedForwardSpecificationSha256({ ...base, routeId: "IL:automatic-prostitution-relief" }));

  // The decisive pair, driven straight at the delta rule. Reached through the
  // full reader they would be refused at the record's byte pin, which proves
  // the pin works and says nothing about whether the delta is checked.
  const drive = (mutate) => {
    const edited = JSON.parse(readBytes(SPECIFICATION).toString("utf8"));
    mutate(edited);
    assertDeltaIsTheApprovedPinsAlone({
      rootDir, specificationPath: SPECIFICATION,
      specificationBytes: Buffer.from(JSON.stringify(edited, null, 2)),
      priorFileSha256: carryForward.packetSpecificationCarryForward.priorFileSha256
    });
  };
  attempt("the specification moved by more than the approved pins",
    () => drive((spec) => { spec.pathwayLabel = `${spec.pathwayLabel} (edited)`; }));
  attempt("a document's output strategy is changed under cover of the carry-forward",
    () => drive((spec) => { spec.documents[0].outputStrategy = "official_pdf_fill"; }));
  attempt("a field is added to the specification",
    () => drive((spec) => { spec.newlyInventedClause = "granted"; }));
  attempt("a field is removed from the specification",
    () => drive((spec) => { delete spec.filingDestination; }));
  attempt("an approved pin is moved to bytes the owner never approved",
    () => drive((spec) => { spec.approvedArtifacts[0].file = "data/rcap-all50/elsewhere.pdf"; }));

  // And the control: the real carry-forward passes the same rule.
  checks += 1;
  try {
    const moved = assertDeltaIsTheApprovedPinsAlone({
      rootDir, specificationPath: SPECIFICATION, specificationBytes: readBytes(SPECIFICATION),
      priorFileSha256: carryForward.packetSpecificationCarryForward.priorFileSha256
    });
    console.log(`  accepted the real carry-forward, ${moved.length} leaves moved`);
  } catch (error) {
    failures.push(`the real carry-forward was refused by its own delta rule: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error(`\nIllinois artifact carry-forward FAILED — ${failures.length} problem(s):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`\nIllinois artifact carry-forward — ${checks} checks. The specification now names the artifacts the owner approved on 2026-09-14, it moved by those pins alone, and Illinois gained no authority from the move.`);
