#!/usr/bin/env node
/**
 * What the five repaired-specification routes would actually deliver, today.
 *
 * WHY THIS IS NOT THE BUILD HOST'S ARTIFACT
 *
 * Each of these routes carries an owner-approved PDF that a census-v1 build
 * host produced. The specification derivation reconciliation showed those bytes
 * never moved, and that the repaired specifications restore the build host's
 * own already-approved words rather than inventing new ones.
 *
 * None of that is the packet a participant receives. For an ordinary paid
 * Grade-A route the product composes at delivery --
 * `packetFulfillmentAuthority` -> `rcap_grade_a_composer_v1` ->
 * `buildGradeAArtifact` -> the CURRENT specification -> `composeGradeAPacket`
 * -> `assembleParticipantPacket` -- and Illinois composes the same way inside
 * the personalized worker. So this produces the bytes through that path, for
 * one owner review, and it approves nothing by producing them.
 *
 * THE PARTICIPANT IS THE ONE ALREADY REVIEWED
 *
 * Each family's build host carries the canonical fixture its approved artifact
 * was reviewed for. This uses that same person, so the review compares the same
 * participant through two providers rather than comparing two strangers.
 *
 * SYNTHESIZED FACTS, AND THE CONTROL THAT THEY DO NOT LEAK
 *
 * The composer requires every declared fact to be present before it will
 * compose anything, including facts the packet prints as a dotted blank because
 * a court, a notary, a prosecutor or the participant-at-filing owns them. A
 * review has to supply something for those, and a supplied value that reached
 * the page would be this script inventing content.
 *
 * So every packet is composed TWICE, with two different alphabets for every
 * non-participant fact, and the bytes must be identical. Any fact whose value
 * changes the output is reported and refuses the route.
 *
 *   node scripts/generate-current-commercial-artifact-review.mjs [--write]
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { assembleParticipantPacket, packetRequiresSupplementalGuide, participantGuideMatter } =
  await import("../src/lib/rcap/render/participant-packet-assembly.ts");
const { composeParticipantDeliveryPacket } = await import("../src/lib/rcap/grade-a/participant-packet.ts");
const { supplementalGuideFor, supplementalGuideIdentityFor } =
  await import("../src/lib/rcap/supplemental/guide-registry.ts");
const { assertValidArtifact } = await import("../src/lib/rcap/render/artifact-validation.ts");

/*
 * The visual review is keyed to bytes, so it cannot drift onto different ones.
 *
 * It records that a person opened every page of a named artifact as an image
 * and what they saw. If the artifact is rebuilt and its digest moves, the
 * record no longer describes what would ship -- so it is matched by sha256 and
 * a produced artifact with no match is reported, never quietly carried forward
 * as reviewed. A batch with an unreviewed artifact is still written; what it
 * must not do is claim the artifact was looked at.
 */
const VISUAL_REVIEW = "data/rcap-grade-a/legal-decisions/CURRENT_COMMERCIAL_ARTIFACT_VISUAL_REVIEW_2026-09-20.json";
const OUT_DIR = "data/rcap-ledger/grade-a/artifacts/current-commercial-review";
const RASTER_ROOT = "data/rcap-ledger/grade-a/reviews/current-commercial-artifact-rasters";
const EVIDENCE = "data/rcap-grade-a/legal-decisions/CURRENT_COMMERCIAL_ARTIFACT_REVIEW_2026-09-20.json";
const VERIFIED_AT = "2026-09-03T15:00:00.000Z";

const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const read = (rel) => fs.readFileSync(path.join(rootDir, rel));

/**
 * The five routes, their family's canonical reviewed participant, and the
 * approved adopted artifact each is being compared against.
 */
const ROUTES = [
  {
    routeId: "DC:dc_actual_innocence_expungement_16_803", familyId: "dc_innocence_expungement-set",
    overlay: "data/rcap-all50/overlays/census-v1/dc/dc-innocence-expungement-set--custom-pleading",
    slug: "dc-actual-innocence"
  },
  {
    routeId: "IL:felony-prostitution-relief", familyId: "il-prostitution-j-vacate-set",
    overlay: "data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading",
    slug: "il-felony-prostitution"
  },
  {
    routeId: "MS:additional-justice-court-misdemeanor-relief-9-11-15-3", familyId: "ms-misd-addl-set",
    overlay: "data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading",
    slug: "ms-justice-court-misdemeanor"
  },
  {
    routeId: "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6", familyId: "ms-misd-addl-set",
    overlay: "data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading",
    slug: "ms-municipal-court-misdemeanor"
  },
  {
    routeId: "WY:felony-conviction-expungement-w-s-7-13-1502", familyId: "wy_fel_1502-set",
    overlay: "data/rcap-all50/overlays/census-v1/wy/wy-fel-1502-set--custom-pleading",
    slug: "wy-felony-expungement"
  }
];

/** The canonical participant each family's approved artifact was reviewed for. */
function canonicalParticipant(familyId) {
  const host = {
    "dc_innocence_expungement-set": "scripts/build-census-v1-dc_innocence_expungement-set.mjs",
    "il-prostitution-j-vacate-set": "scripts/build-census-v1-il-prostitution-j-vacate-set.mjs",
    "ms-misd-addl-set": "scripts/build-census-v1-ms-misd-addl-set.mjs",
    "wy_fel_1502-set": "scripts/build-census-v1-wy_fel_1502-set.mjs"
  }[familyId];
  const source = read(host).toString("utf8");
  // The host declares its fixtures as a literal; the canonical participant's
  // own values are read out of it rather than restated here, so this cannot
  // drift into reviewing a different person than the artifact was reviewed for.
  const grab = (key) => source.match(new RegExp(`"participant\\.${key}":\\s*"([^"]*)"`))?.[1] ?? null;
  return {
    host,
    full_legal_name: grab("full_legal_name"),
    date_of_birth: grab("date_of_birth"),
    street_address: grab("street_address"),
    phone: grab("phone"),
    email: grab("email")
  };
}

/** Fact ids the participant themself owns, by the specification's own ownership. */
function participantOwned(specification) {
  const ownership = specification.fieldOwnership ?? {};
  return new Set(ownership.participantOwnedFacts ?? []);
}

/** Every fact the composer will demand. */
function declaredFacts(specification) {
  const ids = new Set((specification.requiredFacts ?? []).map((entry) => entry.factId));
  for (const document of specification.documents ?? []) {
    for (const section of document.sections ?? []) {
      for (const field of section.fields ?? []) ids.add(field);
      for (const assertion of section.assertions ?? []) for (const id of assertion.facts ?? []) ids.add(id);
    }
  }
  return [...ids].sort();
}

/**
 * The review fixture. Participant identity is the reviewed person's; everything
 * else is a marked placeholder whose value must not reach the page.
 */
function reviewFacts(specification, participant, alphabet) {
  const owned = participantOwned(specification);
  const facts = {};
  /*
   * The subset a real matter would actually carry as an ANSWER.
   *
   * The guide cover is drawn from the matter, and the matter is drawn from the
   * participant's answers -- so feeding it every declared fact would print, on
   * the cover, a value for a blank the packet leaves for the participant to
   * write on paper. The leak control catches that as a varying byte, which is
   * exactly right: a case number the platform never had must not appear under
   * CASE / MATTER because a review harness invented one.
   */
  const participantAnswers = {};
  const synthesized = [];
  /*
   * Participant-owned placeholders do NOT vary between the two runs.
   *
   * They are the participant's own content and they are supposed to print --
   * varying them would make the leak control report the packet working
   * correctly as a defect. What must not print is a value for a fact the
   * platform never supplies: a court's finding, a notary's block, a signature
   * line, a blank the participant fills in on paper. Those vary.
   */
  const participantPlaceholder = (id) => `REVIEW-SUPPLIED-${id}`;
  const identity = {
    participant_full_legal_name: participant.full_legal_name,
    full_legal_name: participant.full_legal_name,
    date_of_birth: participant.date_of_birth,
    mailing_address: participant.street_address,
    street_address: participant.street_address,
    contact_information: `${participant.street_address} · ${participant.phone} · ${participant.email}`,
    phone_number: participant.phone,
    phone: participant.phone,
    email_address: participant.email,
    email: participant.email
  };
  for (const id of declaredFacts(specification)) {
    if (identity[id] !== undefined && identity[id] !== null) {
      facts[id] = identity[id];
      participantAnswers[id] = identity[id];
      continue;
    }
    if (owned.has(id)) {
      // A participant-owned fact with no reviewed value is still the
      // participant's, so it is marked as supplied by the review rather than
      // dressed up as one of their answers. It prints, and it is listed for the
      // owner as review-supplied content rather than reviewed content.
      facts[id] = participantPlaceholder(id);
      participantAnswers[id] = facts[id];
      synthesized.push({ factId: id, ownership: "participant_owned", printsOnThePage: true,
        note: "The reviewed fixture does not carry this answer, so the review supplied a marked placeholder. It is the participant's own content and it appears in the packet." });
      continue;
    }
    facts[id] = `${alphabet}-${id}`;
    synthesized.push({ factId: id, ownership: "not_supplied_by_the_platform", printsOnThePage: false });
  }
  return { facts, participantAnswers, synthesized };
}

const visualReview = (() => {
  const file = path.join(rootDir, VISUAL_REVIEW);
  if (!fs.existsSync(file)) return null;
  const record = JSON.parse(fs.readFileSync(file, "utf8"));
  const byBytes = new Map();
  for (const entry of record.artifacts ?? []) {
    byBytes.set(`${entry.routeId}|${entry.artifactId}|${entry.sha256}`, entry);
  }
  return { record, byBytes };
})();

const failures = [];
const routes = [];
fs.mkdirSync(path.join(rootDir, OUT_DIR), { recursive: true });

for (const route of ROUTES) {
  const specification = packetSpecificationFor(route.routeId);
  if (!specification) { failures.push(`${route.routeId}: no registered specification`); continue; }
  const participant = canonicalParticipant(route.familyId);
  const guide = supplementalGuideFor(route.routeId) ?? null;
  const requiresGuide = packetRequiresSupplementalGuide(specification);

  const matterFor = (facts) => ({
    routeKey: route.routeId, generationPurpose: "internal_review", facts,
    verifiedAt: VERIFIED_AT, verificationHash: "current-commercial-artifact-review"
  });
  /*
   * The guide cover is drawn from the MATTER, and the matter is built the one
   * way participant delivery builds it.
   *
   * Omitting it did not fail: the renderer drew "Not established for this
   * route - ask the clerk or filing office" under PREPARED FOR, COURT / AGENCY,
   * CASE / MATTER and REMEDY, which is a sentence the renderer means for a
   * field the ROUTE establishes nothing for -- not for a field the caller
   * simply did not pass. A review artifact carrying that cover is not the
   * artifact the commercial provider delivers, and it is the cover that says so
   * least visibly, because every cell looks deliberate.
   */
  const packetId = `current-commercial-artifact-review-${route.slug}`;
  const guideMatter = (answers, locale) => participantGuideMatter({
    verifiedAt: VERIFIED_AT,
    jurisdiction: route.routeId.split(":")[0],
    screeningAnswers: {}, prefilledAnswers: {}, packetAnswers: answers, serverFacts: {}
  }, packetId, locale, specification);
  const assemble = async (composed, variant, locale) => (await assembleParticipantPacket(
    composeParticipantDeliveryPacket(specification, matterFor(composed.facts)),
    { routeKey: route.routeId, specification, variant, locale, verifiedAt: VERIFIED_AT,
      matter: guideMatter(composed.participantAnswers, locale) }
  ));

  // The leak control: two alphabets, one expected set of bytes.
  const primary = reviewFacts(specification, participant, "AAA");
  const alternate = reviewFacts(specification, participant, "ZZZ");
  let leaked = null;
  try {
    const a = await assemble(primary, "full", "en");
    const b = await assemble(alternate, "full", "en");
    if (digest(a.bytes) !== digest(b.bytes)) {
      leaked = primary.synthesized
        .filter((entry) => entry.ownership === "not_supplied_by_the_platform")
        .map((entry) => entry.factId);
    }
  } catch (error) {
    /*
     * A route that cannot produce a packet at all is a finding for this batch,
     * not a reason to withhold the batch. The owner needs to see that this
     * route currently delivers nothing as much as they need to see the four
     * that deliver something.
     */
    routes.push({
      routeId: route.routeId, familyId: route.familyId,
      composedBy: "rcap_grade_a_composer_v1 -> composeGradeAPacket -> assembleParticipantPacket",
      currentCommercialArtifact: null,
      producesNoPacket: true,
      refusal: String(error.message ?? error).slice(0, 400),
      adoptedArtifact: {
        path: `${route.overlay}/fixtures/canonical.pdf`,
        sha256: digest(read(`${route.overlay}/fixtures/canonical.pdf`)),
        approvedAndUnchanged: true
      },
      existingApprovalNamesTheseBytes: false,
      artifacts: []
    });
    continue;
  }
  if (leaked) {
    failures.push(`${route.routeId}: a fact the platform does not supply reaches the page: ${leaked.join(", ")}`);
    continue;
  }

  const outputs = [{ id: "full-en", variant: "full", locale: "en" }, { id: "court-only", variant: "court_only", locale: "en" }];
  if (guide) outputs.push({ id: "full-es", variant: "full", locale: "es" });

  const artifacts = [];
  for (const output of outputs) {
    let assembly;
    try { assembly = await assemble(primary, output.variant, output.locale); }
    catch (error) {
      artifacts.push({ id: output.id, variant: output.variant, locale: output.locale,
        produced: false, refusal: String(error.message ?? error).slice(0, 300) });
      continue;
    }
    const file = `${OUT_DIR}/${route.slug}-${output.id}.pdf`;
    const validation = assertValidArtifact({ bytes: assembly.bytes, expectedContentType: "application/pdf" });
    fs.writeFileSync(path.join(rootDir, file), assembly.bytes);

    // Every page as an image, in the shape the other participant-delivery
    // reviews use. Extracted text cannot show a clipped glyph or an overlap.
    const directory = path.join(rootDir, RASTER_ROOT, `${route.slug}-${output.id}`);
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
    execFileSync("pdftoppm", ["-r", "150", "-png", path.join(rootDir, file), path.join(directory, "page")]);
    const pages = fs.readdirSync(directory).filter((name) => name.endsWith(".png")).sort();
    if (pages.length !== validation.pageCount) {
      failures.push(`${route.routeId} ${output.id}: rastered ${pages.length} pages for a ${validation.pageCount}-page packet`);
    }

    artifacts.push({
      id: output.id, variant: output.variant, locale: output.locale, produced: true,
      file, sha256: validation.sha256, byteLength: validation.byteLength, pageCount: validation.pageCount,
      guideAssembled: assembly.guideAssembled,
      supplementalGuide: assembly.guide,
      rasterDirectory: `${RASTER_ROOT}/${route.slug}-${output.id}`,
      pageSha256: pages.map((name) => digest(fs.readFileSync(path.join(directory, name)))),
      visualReview: (() => {
        const entry = visualReview?.byBytes.get(`${route.routeId}|${output.id}|${validation.sha256}`);
        if (!entry) {
          return { status: "not_inspected", why: visualReview
            ? "These exact bytes are not the bytes the visual review record names, so nothing here has been looked at."
            : "No visual review record is present." };
        }
        if (entry.pagesInspectedAsImages !== validation.pageCount) {
          return { status: "partially_inspected", pagesInspectedAsImages: entry.pagesInspectedAsImages,
            pageCount: validation.pageCount };
        }
        return { status: entry.status, pagesInspectedAsImages: entry.pagesInspectedAsImages,
          record: `${VISUAL_REVIEW}#${entry.routeId}|${entry.artifactId}` };
      })()
    });
  }

  // The court-facing subset must carry no participant guide. Checked, not assumed.
  const courtOnly = artifacts.find((entry) => entry.id === "court-only");
  if (courtOnly?.produced && courtOnly.guideAssembled !== false) {
    failures.push(`${route.routeId}: the court-only packet carries a participant guide`);
  }

  const adoptedPath = `${route.overlay}/fixtures/canonical.pdf`;
  const adoptedSha256 = digest(read(adoptedPath));
  const full = artifacts.find((entry) => entry.id === "full-en");
  routes.push({
    routeId: route.routeId,
    familyId: route.familyId,
    specificationPath: `data/record-clearing/packet-specifications/${{
      "dc_innocence_expungement-set": "DC-actual-innocence-expungement.v1.json",
      "il-prostitution-j-vacate-set": "IL-felony-prostitution-relief.v1.json",
      "ms-misd-addl-set": "MS-additional-misdemeanor-relief.v1.json",
      "wy_fel_1502-set": "WY-felony-conviction-expungement.v1.json"
    }[route.familyId]}`,
    specificationSha256: digest(read(`data/record-clearing/packet-specifications/${{
      "dc_innocence_expungement-set": "DC-actual-innocence-expungement.v1.json",
      "il-prostitution-j-vacate-set": "IL-felony-prostitution-relief.v1.json",
      "ms-misd-addl-set": "MS-additional-misdemeanor-relief.v1.json",
      "wy_fel_1502-set": "WY-felony-conviction-expungement.v1.json"
    }[route.familyId]}`)),
    composedBy: "rcap_grade_a_composer_v1 -> composeGradeAPacket -> assembleParticipantPacket",
    reviewedParticipant: { source: participant.host, fullLegalName: participant.full_legal_name },
    supplementalGuide: guide ? supplementalGuideIdentityFor(route.routeId) : null,
    specificationRetiresAComponentForTheGuide: requiresGuide,
    synthesizedFacts: primary.synthesized,
    reviewSuppliedParticipantFacts: primary.synthesized
      .filter((entry) => entry.ownership === "participant_owned").map((entry) => entry.factId),
    platformNotSuppliedFactsReachThePage: false,
    synthesizedFactLeakControl:
      "Composed twice with two different alphabets for every fact the platform does not supply -- court, notary, "
      + "prosecutor, at-signing and completed-on-paper fields. The bytes were identical, so none of those values is "
      + "printed. Participant-owned placeholders are held constant between the runs because they are the "
      + "participant's own content and are supposed to appear; they are listed separately as review-supplied.",
    adoptedArtifact: { path: adoptedPath, sha256: adoptedSha256, approvedAndUnchanged: true },
    currentCommercialArtifact: full?.produced
      ? { sha256: full.sha256, pageCount: full.pageCount, byteLength: full.byteLength }
      : null,
    differsFromAdoptedArtifact: full?.produced ? full.sha256 !== adoptedSha256 : null,
    existingApprovalNamesTheseBytes: false,
    artifacts
  });
}

const evidence = {
  schemaVersion: "rcap-current-commercial-artifact-review/v1",
  recordId: "CURRENT-COMMERCIAL-ARTIFACT-REVIEW-2026-09-20",
  generatedBy: "scripts/generate-current-commercial-artifact-review.mjs",
  preparedOn: "2026-09-20",
  purpose: "one_owner_review_batch",
  /* Said at the top, because a review file is where a measurement turns into a
   * permission if nobody says otherwise. */
  createsApproval: false,
  approvesAnyArtifact: false,
  opensAnyRoute: false,
  productionAuthorized: false,
  whatThisIs: "The packet each of these five routes would actually deliver today, produced through the commercial "
    + "path the participant's own download goes through, for one owner decision. Their adopted build-host artifacts "
    + "remain approved and unchanged; these are different bytes, from a different producer, and no approval names "
    + "them. Until one does, every route here stays held by the current-commercial-artifact proof in the fulfillment "
    + "authority, which worker publication cannot clear.",
  relatedReconciliation: "data/rcap-grade-a/legal-decisions/SPECIFICATION_DERIVATION_RECONCILIATION_2026-09-20.json",
  visualReview: visualReview
    ? {
        record: VISUAL_REVIEW,
        recordId: visualReview.record.recordId,
        sha256: digest(read(VISUAL_REVIEW)),
        /* Said plainly, because a page-hash list next to a page count reads
         * like acceptance to anyone who does not stop on the sentence. */
        pageHashesAreNotVisualAcceptance:
          "Page hashes in this file say which bytes were inspected. They do not say the pages are acceptable. "
          + "That is what the visual review record says, artifact by artifact, and it is bound here by sha256."
      }
    : { record: null, status: "no_visual_review_record" },
  reviewScope: "For each route: the full participant packet, the court-facing subset, and the Spanish full packet "
    + "where the route carries a §7 guide. Every page of every artifact is rendered to an image and hashed. The "
    + "court-only packet is checked to carry no participant guide. Facts the reviewed fixture does not supply are "
    + "proven not to reach the page.",
  routes
};

if (process.argv.includes("--write") && failures.length === 0) {
  fs.writeFileSync(path.join(rootDir, EVIDENCE), `${JSON.stringify(evidence, null, 2)}\n`);
}

for (const route of routes) {
  console.log(`${route.routeId}`);
  if (route.producesNoPacket) {
    console.log(`  PRODUCES NO PACKET: ${route.refusal.slice(0, 150)}`);
    console.log(`  adopted ${route.adoptedArtifact.sha256.slice(0, 16)}…`);
    continue;
  }
  for (const artifact of route.artifacts) {
    console.log(artifact.produced
      ? `  ${artifact.id.padEnd(11)} ${String(artifact.pageCount).padStart(2)} pages  ${String(artifact.byteLength).padStart(7)} bytes  ${artifact.sha256.slice(0, 16)}…  guide=${artifact.guideAssembled}`
      : `  ${artifact.id.padEnd(11)} REFUSED: ${artifact.refusal.slice(0, 110)}`);
  }
  console.log(`  adopted ${route.adoptedArtifact.sha256.slice(0, 16)}…  differs from the current commercial artifact: ${route.differsFromAdoptedArtifact}`);
}

if (failures.length > 0) {
  console.error(`\nCURRENT COMMERCIAL ARTIFACT REVIEW FAILED — ${failures.length}:`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`\n${routes.length} routes prepared for one owner review.`);
console.log(process.argv.includes("--write") ? `Wrote ${EVIDENCE}` : "Not written (pass --write).");
