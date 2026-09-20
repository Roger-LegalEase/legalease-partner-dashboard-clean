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
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

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
const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
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

const packet = composeGradeAPacket(specification, fixture);

/**
 * The cover panel, from the fixture's own facts.
 *
 * Built here rather than through `participantGuideMatter`, which reads a
 * protected verification snapshot this offline generator does not have. The
 * values are the fixture's, and the date goes through the product's own
 * formatter so the cover reads as it will in delivery.
 */
const fact = (id) => {
  const value = fixture.facts?.[id];
  return typeof value === "string" && value.trim() ? value : null;
};
const matterFor = (locale) => ({
  preparedFor: fact("participant_full_legal_name"),
  preparedOn: participantGuideDate(fixture.verifiedAt, locale),
  jurisdiction: "MS",
  courtOrAgency: fact("court_name"),
  caseOrMatter: fact("cause_number"),
  remedy: specification.pathwayLabel ?? null,
  packetId: "ms-nonconv-successor-review"
});

const OUTPUTS = [
  { id: "full-en", variant: "full", locale: "en", file: "ms-nonconviction-successor-review-full-en.pdf" },
  { id: "full-es", variant: "full", locale: "es", file: "ms-nonconviction-successor-review-full-es.pdf" },
  { id: "court-only", variant: "court_only", locale: "en", file: "ms-nonconviction-successor-review-court-only.pdf" }
];

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

fs.writeFileSync(path.join(rootDir, EVIDENCE_FILE), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`\nwrote ${EVIDENCE_FILE}`);
console.log(`  specification ${evidence.generatedFrom.specificationSha256.slice(0, 16)}…`);
console.log(`  guide         ${evidence.generatedFrom.supplementalGuideSha256.slice(0, 16)}…`);
