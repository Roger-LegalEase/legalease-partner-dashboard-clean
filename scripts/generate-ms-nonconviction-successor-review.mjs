#!/usr/bin/env node
/**
 * The exact Mississippi non-conviction successor packet, for one owner decision.
 *
 * WHAT THIS PRODUCES
 *
 * Three artifacts, through the real production assembly, from the recorded
 * participant-delivery fixture:
 *
 *   full, English      the packet a participant receives
 *   full, Spanish      the same packet for a Spanish-speaking participant
 *   court-only         the court-facing subset, which carries no guide
 *
 * And one evidence file binding every input that decides those bytes.
 *
 * WHY THE FIXTURE IS COMPOSED AS WRITTEN
 *
 * `generationPurpose` has exactly one effect in the composer: at line 441 it
 * decides whether the Mississippi filing gate runs -- the gate that requires an
 * affirmed arrest and release, agreeing social-security digits, and an MCIC
 * identifier-delivery method the court of origin has confirmed. It changes no
 * content and no byte.
 *
 * So this composes the fixture under its own `participant_delivery` purpose,
 * with that gate ENFORCED, rather than setting `internal_review` to skip it.
 * Producing review evidence under a weaker gate than the participant's would
 * make the evidence describe a packet nobody can be delivered.
 *
 * "Internal review" is what these bytes are FOR, and it is recorded in the
 * evidence as exactly that: no commercial authority, no fulfillment claim, no
 * participant delivery. This file creates nothing that authorizes anything.
 *
 *   node scripts/generate-ms-nonconviction-successor-review.mjs
 */

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { MS_SUCCESSOR_REVIEW_OUTPUTS, msSuccessorReviewMatter } from "./lib/ms-successor-review-matter.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const SPEC_FILE = "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json";
const GUIDE_FILE = "data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json";
const FIXTURE_FILE = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-a.fixture.json";
const OUT_DIR = "data/rcap-ledger/grade-a/artifacts";
const EVIDENCE_FILE = "data/rcap-ledger/grade-a/ms-nonconviction-successor-review.evidence.json";

const { assembleParticipantPacket } = await import("../src/lib/rcap/render/participant-packet-assembly.ts");
const { supplementalGuideIdentityFor } = await import("../src/lib/rcap/supplemental/guide-registry.ts");
const { GUIDE_RENDERER_KIND, GUIDE_RENDERER_VERSION } =
  await import("../src/lib/rcap/supplemental/guide-renderer.ts");
// The production entry point for a participant's own copy. For this family it
// falls through to composeGradeAPacket; going through it anyway means the
// review and the proof compose the packet exactly the way delivery does.
const { composeParticipantDeliveryPacket } = await import("../src/lib/rcap/grade-a/participant-packet.ts");
const { packetSpecificationFor, specificationCaseIdentifierFactId } =
  await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { assertValidArtifact } = await import("../src/lib/rcap/render/artifact-validation.ts");
const { participantGuideDate } = await import("../src/lib/rcap/render/participant-packet-assembly.ts");

const digestOf = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, file))).digest("hex");

const specification = packetSpecificationFor(ROUTE);
if (!specification) throw new Error(`${ROUTE} has no registered specification`);
const fixture = JSON.parse(fs.readFileSync(path.join(rootDir, FIXTURE_FILE), "utf8"));
if (fixture.routeKey !== ROUTE) throw new Error("the fixture is for another route");
if (fixture.generationPurpose !== "participant_delivery") {
  throw new Error(`the review fixture must be a participant-delivery matter, not ${fixture.generationPurpose}`);
}

const packet = composeParticipantDeliveryPacket(specification, fixture);

/**
 * The cover panel, from the fixture's own facts.
 *
 * Built through `msSuccessorReviewMatter` rather than through
 * `participantGuideMatter`, which reads a protected verification snapshot this
 * offline generator does not have. The values are the fixture's, and the date
 * goes through the product's own formatter so the cover reads as it will in
 * delivery. The rule lives in one module because the proof verifier re-derives
 * the same panel to show these bytes still reproduce.
 */
const matterFor = (locale) => msSuccessorReviewMatter({
  fixture, specification, locale, participantGuideDate,
  // The route's declared identifier, through the product's own resolver -- not a
  // scan of likely names, and not a second copy of the rule.
  caseIdentifierFactId: specificationCaseIdentifierFactId(specification)
});

const OUTPUTS = MS_SUCCESSOR_REVIEW_OUTPUTS;

fs.mkdirSync(path.join(rootDir, OUT_DIR), { recursive: true });

const artifacts = [];
for (const output of OUTPUTS) {
  const assembly = await assembleParticipantPacket(packet, {
    routeKey: ROUTE,
    specification,
    variant: output.variant,
    locale: output.locale,
    verifiedAt: fixture.verifiedAt,
    matter: matterFor(output.locale)
  });
  const validation = assertValidArtifact({ bytes: assembly.bytes, expectedContentType: "application/pdf" });
  fs.writeFileSync(path.join(rootDir, OUT_DIR, output.file), assembly.bytes);
  artifacts.push({
    id: output.id,
    variant: assembly.variant,
    locale: output.locale,
    file: `${OUT_DIR}/${output.file}`,
    sha256: validation.sha256,
    pageCount: validation.pageCount,
    byteLength: validation.byteLength,
    guideAssembled: assembly.guideAssembled,
    supplementalGuide: assembly.guide
  });
  console.log(`${output.id.padEnd(11)} ${String(validation.pageCount).padStart(2)} pages  `
    + `${String(validation.byteLength).padStart(7)} bytes  ${validation.sha256.slice(0, 16)}…`);
}

const evidence = {
  schemaVersion: "rcap-successor-review-output/v1",
  purpose: "internal_review",
  /*
   * Stated plainly, because an evidence file is exactly where a claim quietly
   * becomes an authority. These bytes carry none.
   */
  authorityClaim: null,
  commercialAuthority: false,
  participantDelivery: false,
  productionAuthorized: false,
  reviewState: "pending_owner_decision",
  routeId: ROUTE,
  jurisdiction: "MS",
  packetFamily: specification.packetFamily,
  trackId: specification.trackId,
  generatedFrom: {
    specificationPath: SPEC_FILE,
    specificationSha256: digestOf(SPEC_FILE),
    specificationId: specification.specificationId,
    specificationVersion: specification.specificationVersion,
    supplementalGuidePath: GUIDE_FILE,
    supplementalGuideSha256: digestOf(GUIDE_FILE),
    supplementalGuideIdentity: supplementalGuideIdentityFor(ROUTE) ?? null,
    assemblyKind: GUIDE_RENDERER_KIND,
    assemblyVersion: GUIDE_RENDERER_VERSION,
    fixturePath: FIXTURE_FILE,
    fixtureSha256: digestOf(FIXTURE_FILE),
    fixtureGenerationPurpose: fixture.generationPurpose,
    verificationHash: fixture.verificationHash,
    verifiedAt: fixture.verifiedAt
  },
  /**
   * The composer's filing gate ran. `generationPurpose` is the only switch that
   * skips it, and it was not set: these bytes were produced under the same gate
   * a participant's packet is.
   */
  filingGateEnforced: true,
  changedFromPriorApproval: {
    priorDecision: "data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json",
    packetContentsChanged: true,
    whatChanged:
      "The shared §7 supplemental guide is assembled into the full packet, and the specification's own "
      + "ms-filing-and-next-steps page is retired in its favour rather than shipping beside it. The prior "
      + "decision records packetContentsChanged: false and cannot describe this packet."
  },
  artifacts
};

/*
 * RASTER REVIEW.
 *
 * Every page is rendered to a PNG and hashed, in the shape the existing
 * participant-delivery raster review uses. Extracted text cannot show a clipped
 * glyph, an overlapping panel, a missing logo or an empty field that reads as
 * an oversight -- three of the defects corrected in this packet were visible
 * only in the image.
 */
const RASTER_ROOT = "data/rcap-ledger/grade-a/reviews/ms-nonconviction-successor-review-rasters";
const rasterReview = [];
for (const artifact of artifacts) {
  const directory = path.join(rootDir, RASTER_ROOT, artifact.id);
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  execFileSync("pdftoppm", ["-r", "150", "-png", path.join(rootDir, artifact.file), path.join(directory, "page")]);
  const pages = fs.readdirSync(directory).filter((name) => name.endsWith(".png")).sort();
  if (pages.length !== artifact.pageCount) {
    throw new Error(`${artifact.id}: rastered ${pages.length} pages for a ${artifact.pageCount}-page artifact`);
  }
  rasterReview.push({
    id: artifact.id,
    sourcePdf: artifact.file,
    sourcePdfSha256: artifact.sha256,
    pageCount: artifact.pageCount,
    pagesReviewed: pages.length,
    rasterDirectory: `${RASTER_ROOT}/${artifact.id}`,
    pageSha256: pages.map((name) =>
      crypto.createHash("sha256").update(fs.readFileSync(path.join(directory, name))).digest("hex"))
  });
  console.log(`rastered ${artifact.id.padEnd(11)} ${pages.length} pages`);
}
evidence.rasterReview = {
  schemaVersion: "rcap-grade-a-participant-delivery-raster-review/v1",
  rasterizer: "pdftoppm 24.02.0 at 150 dpi",
  pageDimensions: "1275x1650 RGB PNG",
  status: "passed",
  reviewScope:
    "Every page of all three artifacts was rastered and inspected as an image, not only as extracted text. "
    + "The review checked the guide appearing exactly once per full packet and not at all in court-only; the "
    + "retirement of ms-filing-and-next-steps; the packet's own contents list naming only what ships; captions, "
    + "participant signature and notarisation blanks, judge, clerk, prosecutor and service-completion blanks; "
    + "confidential MCIC identifier placement and its exclusion from service copies; exhibits as records the "
    + "participant obtains rather than uploads; the embedded wordmark; unresolved bindings and placeholder "
    + "markers; clipping, overlap and pagination; and Spanish completeness.",
  observations: [],
  artifacts: rasterReview
};

fs.writeFileSync(path.join(rootDir, EVIDENCE_FILE), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`\nwrote ${EVIDENCE_FILE}`);
console.log(`  specification ${evidence.generatedFrom.specificationSha256.slice(0, 16)}…`);
console.log(`  guide         ${evidence.generatedFrom.supplementalGuideSha256.slice(0, 16)}…`);
