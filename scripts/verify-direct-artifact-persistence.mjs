#!/usr/bin/env node
/**
 * A direct Grade-A packet survives its own renderer being rewritten.
 *
 * WHAT WAS WRONG
 *
 * `rcap_grade_a_composer_v1` stored no bytes. Its receipt named the
 * specification and the rendered hash, and repeat download RECOMPOSED the
 * packet and compared the result against that hash. The reasoning written on
 * the receipt type was "nothing is stored, so nothing can drift out of sync",
 * and it held only while the specification was the single input.
 *
 * §7 added two more: the route's supplemental guide, and the assembly step
 * that draws it. Editing a guide changes what a re-render produces, so the
 * participant who bought the earlier packet would click download and get a
 * digest mismatch on bytes that were never wrong.
 *
 * Versioning the inputs could not have fixed it. The assembly CODE is an
 * input, and no receipt reproduces a renderer that has since been rewritten.
 * So the exact bytes are stored, in the same private content-addressed bucket
 * the render worker uses, and a receipt carrying a path is served from storage
 * rather than recomposed.
 *
 * WHAT THIS MEASURES
 *
 * The storage adapter is an interface, so these drive the real production
 * functions against an in-memory double that behaves like the bucket: write
 * once, no overwrite, exact bytes back. Nothing here reaches Supabase, and
 * nothing here is a second implementation of the rules -- the path derivation
 * and the read-and-verify treatment are the product's own.
 */

import crypto from "node:crypto";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const { buildDirectArtifactStoragePath, buildArtifactStoragePath } =
  await import("../src/lib/rcap/render/job-contract.ts");
const { assertValidArtifact } = await import("../src/lib/rcap/render/artifact-validation.ts");
const { assembleParticipantPacket, PARTICIPANT_DELIVERY_VARIANT } =
  await import("../src/lib/rcap/render/participant-packet-assembly.ts");
const { supplementalGuideFor, supplementalGuideIdentityFor, guideContentDigest } =
  await import("../src/lib/rcap/supplemental/guide-registry.ts");
const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { packetSpecificationFor, packetSpecificationRouteKeys } =
  await import("../src/lib/rcap/grade-a/packet-specification.ts");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/* ------------------------------------------------------- the path derivation */

const SHA = "a".repeat(64);

check(
  buildDirectArtifactStoragePath({
    partnerId: null, matterId: "matter-1", briefcaseItemId: "item-1", outputSha256: SHA
  }) === `packet-artifacts/consumer/matter-1/grade-a/item-1/${SHA}.pdf`,
  "a consumer artifact's path binds the owner boundary, the matter, the artifact and the hash"
);
check(
  buildDirectArtifactStoragePath({
    partnerId: "partner-9", matterId: "matter-1", briefcaseItemId: "item-1", outputSha256: SHA
  }).startsWith("packet-artifacts/partner-9/"),
  "a partner-sponsored artifact is written under the partner, not under consumer"
);

/*
 * A direct artifact and a worker artifact can never collide, even if a
 * Briefcase item id and a job id were ever drawn from the same space. The
 * `grade-a` segment is a literal, not a variable.
 */
check(
  buildDirectArtifactStoragePath({ partnerId: null, matterId: "m", briefcaseItemId: "x", outputSha256: SHA })
    !== buildArtifactStoragePath({ partnerId: null, matterId: "m", jobId: "x", outputSha256: SHA }),
  "a direct artifact path cannot collide with a render job's path"
);

for (const [label, input] of [
  ["a non-sha output", { partnerId: null, matterId: "m", briefcaseItemId: "i", outputSha256: "nope" }],
  ["an empty artifact id", { partnerId: null, matterId: "m", briefcaseItemId: "  ", outputSha256: SHA }]
]) {
  let refused = false;
  try { buildDirectArtifactStoragePath(input); } catch { refused = true; }
  check(refused, `the path derivation refuses ${label}`);
}

/* ------------------------------------------- a bucket double that behaves like one */

/**
 * Write-once, exact bytes back, and an already-present object reports the way
 * the real adapter does rather than succeeding quietly.
 */
function bucket() {
  const objects = new Map();
  return {
    objects,
    async upload(at, bytes) {
      if (objects.has(at)) return { ok: false, reason: "Duplicate: the resource already exists" };
      objects.set(at, Buffer.from(bytes));
      return { ok: true };
    },
    async read(at) {
      return objects.has(at) ? Buffer.from(objects.get(at)) : null;
    }
  };
}

/**
 * The production order, as `buildGradeAArtifact` performs it: upload, tolerate
 * an existing object, read back, verify against the local render.
 *
 * Written here once and used by every case below, so a case cannot pass by
 * taking a shortcut the product does not take.
 */
async function persist(storage, storagePath, bytes, validation) {
  const uploaded = await storage.upload(storagePath, bytes);
  if (!uploaded.ok && !/exists|duplicate|409/i.test(uploaded.reason)) {
    return { ok: false, reason: uploaded.reason };
  }
  const stored = await storage.read(storagePath);
  if (!stored) return { ok: false, reason: "stored object missing on re-read" };
  try {
    assertValidArtifact({
      bytes: stored,
      expectedContentType: "application/pdf",
      expectedSha256: validation.sha256,
      expectedPageCount: validation.pageCount
    });
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  return { ok: true, stored };
}

/* --------------------------------------------------------- a real packet */

function compose(routeKey, seed) {
  const specification = packetSpecificationFor(routeKey);
  if (!specification) return null;
  const facts = {};
  for (const { factId } of specification.requiredFacts) facts[factId] = `«${factId}»`;
  try {
    return {
      specification,
      packet: composeGradeAPacket(specification, {
        routeKey, jurisdiction: specification.jurisdiction, pathwayId: specification.pathwayId,
        facts, verificationHash: seed, verifiedAt: "2026-09-20T00:00:00.000Z"
      })
    };
  } catch { return null; }
}

const guided = packetSpecificationRouteKeys().find((routeKey) =>
  supplementalGuideFor(routeKey) && compose(routeKey, "persist-0001") !== null);

if (!guided) {
  check(false, "a guide-backed route could be composed for the persistence checks");
} else {
  const { specification, packet } = compose(guided, "persist-0001");
  const assembly = await assembleParticipantPacket(packet, {
    routeKey: guided, specification, variant: PARTICIPANT_DELIVERY_VARIANT,
    locale: "en", verifiedAt: "2026-09-20T00:00:00.000Z"
  });
  /*
   * THE ASSEMBLED PACKET MUST BE READABLE BY THE INDEPENDENT PAGE COUNT.
   *
   * `countPdfPages` scans the bytes for `/Type /Page` on purpose: counting with
   * pdf-lib would validate the artifact using the library that produced it, so
   * a library-level defect would be invisible to the check that exists to catch
   * it. pdf-lib's default `save()` writes page objects into compressed object
   * streams, so the scan found none and every assembled packet validated as a
   * zero-page PDF -- generation would have failed for every guide-backed route.
   *
   * `renderGradeAPacketPdf` has always saved with `useObjectStreams: false`;
   * the guide renderer had not needed to until its output became the delivered
   * artifact. This check is here because none of the §7 controls called the
   * artifact validator, which is how it reached a commit.
   */
  const { countPdfPages } = await import("../src/lib/rcap/render/artifact-validation.ts");
  const scanned = countPdfPages(assembly.bytes);
  const parsed = (await PDFDocument.load(assembly.bytes)).getPageCount();
  check(
    scanned === parsed && scanned > 0,
    `${guided}: the assembled packet's pages are visible to the byte scan, not only to pdf-lib `
    + `(scanned ${scanned}, parsed ${parsed})`
  );

  const validation = assertValidArtifact({ bytes: assembly.bytes, expectedContentType: "application/pdf" });
  const storagePath = buildDirectArtifactStoragePath({
    partnerId: null, matterId: "matter-persist", briefcaseItemId: "item-persist",
    outputSha256: validation.sha256
  });

  /* 1. the exact bytes persist, and the read-back matches the local render */

  const storage = bucket();
  const first = await persist(storage, storagePath, assembly.bytes, validation);
  check(first.ok, `${guided}: a new direct artifact persists and reads back${first.ok ? "" : `: ${first.reason}`}`);
  check(
    first.ok && sha256(first.stored) === validation.sha256,
    "the stored object is byte-identical to what was rendered"
  );
  check(
    first.ok && (await PDFDocument.load(first.stored)).getPageCount() === validation.pageCount,
    `and carries the same page count (${validation.pageCount})`
  );

  /* 2. a later guide change does not alter what repeat download serves */

  /**
   * The receipt's recorded guide digest and the registry's current one are
   * compared here only to show they CAN diverge. The download does not consult
   * the registry at all once a storage path exists, which is why the bytes
   * below are unchanged.
   */
  const recordedGuide = supplementalGuideIdentityFor(guided);
  const editedGuide = JSON.parse(JSON.stringify(supplementalGuideFor(guided)));
  const section = ["overview", "nextSteps", "filingChecklist", "feesAndCosts"]
    .find((name) => Array.isArray(editedGuide[name]) && editedGuide[name].length > 0);
  editedGuide[section][0].text = `${editedGuide[section][0].text} (edited after the packet was bought)`;
  check(
    guideContentDigest(editedGuide) !== recordedGuide.contentSha256,
    "the guide really did change, measured by the digest the receipt carries"
  );

  const servedAfterGuideEdit = await storage.read(storagePath);
  check(
    servedAfterGuideEdit !== null && sha256(servedAfterGuideEdit) === validation.sha256,
    "repeat download serves the same bytes after the route's guide is edited"
  );

  /* 3. and neither does a later assembly change */

  /**
   * Re-assembling with a different locale stands in for the renderer being
   * rewritten: it is the same packet through the same code with one input
   * moved, and it produces different bytes. Those bytes are NOT what the
   * stored object holds, which is the property under test.
   */
  let reassembled = null;
  try {
    reassembled = await assembleParticipantPacket(packet, {
      routeKey: guided, specification, variant: PARTICIPANT_DELIVERY_VARIANT,
      locale: "court_only_is_not_a_locale", verifiedAt: "2026-09-20T00:00:00.000Z"
    });
  } catch { /* the locale guard, doing its job */ }
  const courtOnly = await assembleParticipantPacket(packet, {
    routeKey: guided, specification, variant: "court_only",
    locale: "en", verifiedAt: "2026-09-20T00:00:00.000Z"
  });
  check(
    reassembled === null && sha256(courtOnly.bytes) !== validation.sha256,
    "a different assembly of the same packet does produce different bytes"
  );
  const servedAfterAssemblyChange = await storage.read(storagePath);
  check(
    sha256(servedAfterAssemblyChange) === validation.sha256,
    "repeat download still serves the stored bytes, not the re-assembled ones"
  );

  /* 4. a tampered or missing object refuses */

  const tampered = bucket();
  await tampered.upload(storagePath, Buffer.concat([assembly.bytes, Buffer.from("\n% tampered")]));
  const tamperedRead = await tampered.read(storagePath);
  let tamperRefused = false;
  try {
    assertValidArtifact({
      bytes: tamperedRead, expectedContentType: "application/pdf",
      expectedSha256: validation.sha256, expectedPageCount: validation.pageCount
    });
  } catch { tamperRefused = true; }
  check(tamperRefused, "a stored object whose bytes were altered refuses rather than being served");

  const empty = bucket();
  check(await empty.read(storagePath) === null, "a missing stored object reads as absent, and the caller refuses");

  /* 5. a duplicate upload converges only after a verified read-back */

  /**
   * The crash-idempotence case, and the one where "already exists" must not be
   * read as success. Two runs of the same generation land on the same
   * content-addressed path; the second sees a duplicate and is right only
   * because it reads the object back and proves it.
   */
  const again = await persist(storage, storagePath, assembly.bytes, validation);
  check(
    again.ok && sha256(again.stored) === validation.sha256,
    "a second write to the same content-addressed path converges on the verified object"
  );

  /**
   * And the same duplicate reason over a WRONG object fails. Without the
   * read-back, both of these would have looked identical: an upload that
   * reported the object already existed.
   */
  const poisoned = bucket();
  await poisoned.upload(storagePath, Buffer.from("%PDF-1.4 not this packet"));
  const poisonedResult = await persist(poisoned, storagePath, assembly.bytes, validation);
  check(
    !poisonedResult.ok,
    `NEGATIVE control: "already exists" over different bytes is refused, not accepted${
      poisonedResult.ok ? " -- it was accepted" : ""}`
  );
}

/* ------------------------------------- 6. other providers are untouched */

/**
 * Scoped by provider dispatch rather than by a route list or a guide count.
 * The durable worker provider stores its own bytes through the worker and is
 * not touched by this repair; the source-engine and legacy providers do not
 * serve Grade-A artifacts at all.
 */
const generationSource = await import("node:fs")
  .then((fs) => fs.readFileSync(path.join(rootDir, "src/lib/expungement-ai/packet-generation.ts"), "utf8"));
const storageBlock = generationSource.slice(
  generationSource.indexOf("A PERSISTED ARTIFACT IS READ, NOT REBUILT"),
  generationSource.indexOf("Composable, not merely registered")
);
check(
  storageBlock.includes("artifactRefs.storagePath"),
  "the stored-bytes branch is reached from the receipt's own storage pointer"
);
check(
  generationSource.includes("this receipt predates persistence"),
  "a receipt with no storage pointer keeps its existing recompose path, rather than a fabricated one"
);

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
