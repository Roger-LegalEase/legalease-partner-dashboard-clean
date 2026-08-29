#!/usr/bin/env node
// Lane D — focused tests for the North Dakota composed-pleading reference packet.
//
//   node scripts/verify-nd-composed-packet.mjs
//
// Proves, in order:
//
//   1. each side of the N.D.C.C. 12-60.1-05 date split selects the correct
//      specification, and the boundary date itself lands on the automatic side;
//   2. required facts are enforced, one at a time;
//   3. missing local filing configuration fails closed with its own reason;
//   4. composer output is deterministic;
//   5. long-value and pagination fixtures stay filing-readable;
//   6. the proposed order, the service component and the filed-with list appear
//      exactly when the route requires them, and carry this route's relief
//      scope rather than the default agency-wide direction;
//   7. a wrong state, a wrong specification identity and a wrong route family
//      are denied;
//   8. placeholder or incomplete content cannot pass;
//   9. a stale specification hash or a drifted provider binding invalidates
//      authority;
//  10. the committed artifacts and the committed review record still match what
//      the current build produces.
//
// Every check is an assertion against real composer output. Nothing is mocked.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT_DIR = path.join(
  rootDir,
  "data/rcap-lane-d/north-dakota/nd-nonconviction-closing-petition"
);
const REVIEW_PATH = path.join(rootDir, "docs/rcap/lane-d/ND_COMPOSED_PACKET_REVIEW.json");

const {
  ND_NONCONVICTION_PETITION_SPEC,
  ND_NONCONVICTION_DATE_SPLIT,
  ND_NONCONVICTION_EXCLUSIONS,
  ND_JUDICIAL_DISTRICT_BY_COUNTY,
  resolveNdNonconvictionRoute,
  ndComposedPacketSpecHash
} = await import("../src/lib/record-clearing/north-dakota-nonconviction-spec.ts");
const { composeNdNonconvictionPacket, ND_PACKET_LAYOUT, wrapLine, longDate, scanPlaceholders } =
  await import("../src/lib/record-clearing/composers/nd-composed-packet-composer.ts");
const { ndNonconvictionClosingConfig } = await import(
  "../src/lib/record-clearing/north-dakota-nonconviction-config.ts"
);
const { runPleadingQa } = await import("../src/lib/record-clearing/pleading-qa.ts");
const ndPack = await import("../src/lib/rcap/state-packs/north-dakota/index.ts");

const failures = [];
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

const readFixture = (id) =>
  JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, `fixtures/${id}.json`), "utf8"));
const canonicalFixture = readFixture("canonical");
const multilineFixture = readFixture("multiline");
const PRODUCT_NAME = "LegalEase RCAP";

const compose = (facts, extra = {}) =>
  composeNdNonconvictionPacket({ facts, productName: PRODUCT_NAME, ...extra });

// ---------------------------------------------------------------------------
// 1. Date split
// ---------------------------------------------------------------------------

check(
  ND_NONCONVICTION_DATE_SPLIT === "2025-08-01",
  `Date split must be 2025-08-01, got ${ND_NONCONVICTION_DATE_SPLIT}.`
);

const splitCases = [
  ["2019-01-01", "composed_packet"],
  ["2025-07-30", "composed_packet"],
  ["2025-07-31", "composed_packet"],
  ["2025-08-01", "no_filing_required"],
  ["2025-08-02", "no_filing_required"],
  ["2026-12-31", "no_filing_required"]
];
for (const [orderDate, expected] of splitCases) {
  const resolution = resolveNdNonconvictionRoute({
    nonconvictionOrderDate: orderDate,
    allChargesDismissedOrAcquitted: true
  });
  check(
    resolution.status === expected,
    `Date split: ${orderDate} must resolve to ${expected}, got ${resolution.status}.`
  );
  if (expected === "composed_packet") {
    check(
      resolution.specId === ND_NONCONVICTION_PETITION_SPEC.specId
        && resolution.specVersion === ND_NONCONVICTION_PETITION_SPEC.specVersion,
      `Date split: ${orderDate} must select ${ND_NONCONVICTION_PETITION_SPEC.specId}@${ND_NONCONVICTION_PETITION_SPEC.specVersion}.`
    );
  } else {
    check(
      resolution.specId === null,
      `Date split: ${orderDate} is the automatic branch and must select no specification.`
    );
  }
}

// The automatic branch never yields a packet, even with every fact present.
const automaticCompose = compose({
  ...canonicalFixture.facts,
  nonconvictionOrderDate: "2025-08-01"
});
check(
  automaticCompose.status === "refused" && automaticCompose.reasonCode === "route_not_composed_packet",
  "A complete matter on the automatic branch must still be refused a composed packet."
);
check(
  automaticCompose.status === "refused"
    && automaticCompose.reason.includes("61 days"),
  "The automatic-branch refusal must say what actually happens: the court closes the record 61 days after the order."
);

// Unresolvable facts fail closed rather than picking a branch.
for (const [label, input, expectedCode] of [
  ["absent order date", { allChargesDismissedOrAcquitted: true }, "missing_or_invalid_order_date"],
  [
    "non-calendar order date",
    { allChargesDismissedOrAcquitted: true, nonconvictionOrderDate: "2025-02-30" },
    "missing_or_invalid_order_date"
  ],
  [
    "malformed order date",
    { allChargesDismissedOrAcquitted: true, nonconvictionOrderDate: "07/31/2025" },
    "missing_or_invalid_order_date"
  ],
  [
    "unestablished nonconviction",
    { nonconvictionOrderDate: "2021-04-12" },
    "missing_nonconviction_status"
  ],
  [
    "explicit conviction",
    { nonconvictionOrderDate: "2021-04-12", allChargesDismissedOrAcquitted: false },
    "missing_nonconviction_status"
  ]
]) {
  const resolution = resolveNdNonconvictionRoute(input);
  check(
    resolution.status === "unresolved" && resolution.reasonCode === expectedCode,
    `Fail-closed: ${label} must return unresolved/${expectedCode}, got ${resolution.status}/${resolution.reasonCode ?? "-"}.`
  );
}

// Every statutory exclusion blocks both branches.
for (const exclusion of ND_NONCONVICTION_EXCLUSIONS) {
  for (const orderDate of ["2021-04-12", "2025-12-01"]) {
    const resolution = resolveNdNonconvictionRoute({
      nonconvictionOrderDate: orderDate,
      allChargesDismissedOrAcquitted: true,
      exclusions: [exclusion.id]
    });
    check(
      resolution.status === "excluded" && resolution.exclusionIds.includes(exclusion.id),
      `Exclusion ${exclusion.id} must block the route on ${orderDate}, got ${resolution.status}.`
    );
  }
}
check(
  ND_NONCONVICTION_EXCLUSIONS.length === 4,
  `The source states four § 12-60.1-05 exclusions; the spec carries ${ND_NONCONVICTION_EXCLUSIONS.length}.`
);
// Each exclusion is carried verbatim from the compiled ND profile, which states
// them as discrete sentences; ndDisqualifyingOffenseNotes[3] states the same
// four as one run-on sentence and is checked for the operative phrase.
const compiledNdProfileText = fs.readFileSync(
  path.join(rootDir, "src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json"),
  "utf8"
);
for (const exclusion of ND_NONCONVICTION_EXCLUSIONS) {
  check(
    compiledNdProfileText.includes(exclusion.text),
    `Exclusion "${exclusion.id}" is not carried verbatim from the compiled ND profile.`
  );
  const operativePhrase = exclusion.text
    .replace(/^The /, "")
    .replace(/\.$/, "")
    .replace(/^dismissal was due to a finding that the person/, "dismissal was due to a finding the person");
  check(
    ndPack.ndDisqualifyingOffenseNotes[3].toLowerCase().includes(operativePhrase.toLowerCase()),
    `Exclusion "${exclusion.id}" is not the exclusion the ND state pack records.`
  );
}

// ---------------------------------------------------------------------------
// 2. Required facts
// ---------------------------------------------------------------------------

const requiredFactIds = ND_NONCONVICTION_PETITION_SPEC.requiredFacts
  .filter((fact) => !fact.optional)
  .map((fact) => fact.factId);
const localConfigFactIds = ["countyName", "judicialDistrict", "courtName", "clerkOfCourtDestination"];

// Spec fidelity: every state-pack required field for this pathway is required here.
for (const field of ndPack.ndRequiredFields.nonconviction_closing_petition) {
  check(
    requiredFactIds.includes(field),
    `State-pack required field "${field}" for nonconviction_closing_petition is missing from the specification.`
  );
}

for (const factId of requiredFactIds) {
  const facts = { ...canonicalFixture.facts };
  delete facts[factId];
  const result = compose(facts);
  check(result.status === "refused", `Dropping required fact "${factId}" must refuse the compose.`);
  if (result.status === "refused") {
    const expectedCode = localConfigFactIds.includes(factId)
      ? "missing_local_configuration"
      : factId === "nonconvictionOrderDate" || factId === "allChargesDismissedOrAcquitted"
        ? "route_not_composed_packet"
        : "missing_required_facts";
    check(
      result.reasonCode === expectedCode,
      `Dropping "${factId}" must refuse with ${expectedCode}, got ${result.reasonCode}.`
    );
    if (expectedCode !== "route_not_composed_packet") {
      check(
        result.detail.includes(factId),
        `The refusal for "${factId}" must name the missing fact; detail was ${JSON.stringify(result.detail)}.`
      );
    }
  }
  // A blank string is as absent as a missing key.
  const blanked = compose({ ...canonicalFixture.facts, [factId]: typeof canonicalFixture.facts[factId] === "boolean" ? false : "   " });
  check(blanked.status === "refused", `A blank value for "${factId}" must refuse the compose.`);
}

// ---------------------------------------------------------------------------
// 3. Local configuration fails closed
// ---------------------------------------------------------------------------

check(
  ND_JUDICIAL_DISTRICT_BY_COUNTY.size === 0,
  "The county-to-judicial-district map must stay empty until a committed source supports a row."
);
const noDistrict = compose({ ...canonicalFixture.facts, judicialDistrict: undefined });
check(
  noDistrict.status === "refused" && noDistrict.reasonCode === "missing_local_configuration",
  "A matter with no judicial district must fail closed on local configuration."
);
const noClerk = compose({ ...canonicalFixture.facts, clerkOfCourtDestination: undefined });
check(
  noClerk.status === "refused" && noClerk.reasonCode === "missing_local_configuration",
  "A matter with no clerk destination must fail closed on local configuration."
);

// ---------------------------------------------------------------------------
// 4. Determinism
// ---------------------------------------------------------------------------

const runA = compose(canonicalFixture.facts);
const runB = compose(canonicalFixture.facts);
check(runA.status === "composed" && runB.status === "composed", "The canonical fixture must compose.");
check(
  runA.status === "composed"
    && runB.status === "composed"
    && runA.packet.fullTextSha256 === runB.packet.fullTextSha256,
  "Two composes of the same facts must produce identical bytes."
);
check(
  runA.status === "composed"
    && JSON.stringify(runA.packet.documentManifest) === JSON.stringify(runB.packet.documentManifest),
  "Two composes of the same facts must produce an identical document manifest."
);
// Fact order must not move a byte.
const reordered = Object.fromEntries(Object.entries(canonicalFixture.facts).reverse());
const runC = compose(reordered);
check(
  runC.status === "composed" && runC.packet.fullTextSha256 === runA.packet.fullTextSha256,
  "Reordering the fact object must not change the composed bytes."
);

const canonicalPacket = runA.packet;

/** Composed text is wrapped to the measure, so phrase checks read it flattened. */
const flat = (text) => text.replace(/\s+/g, " ");
const canonicalFlat = flat(canonicalPacket.fullText);

// ---------------------------------------------------------------------------
// 5. Filing readability: measure, pagination, orphan control
// ---------------------------------------------------------------------------

for (const fixture of [canonicalFixture, multilineFixture, readFixture("boundary")]) {
  const result = compose(fixture.facts);
  check(result.status === "composed", `Fixture ${fixture.fixtureId} must compose.`);
  if (result.status !== "composed") continue;
  for (const document of result.packet.documents) {
    check(document.pageCount >= 1, `${fixture.fixtureId}/${document.documentId}: no pages composed.`);
    document.pages.forEach((pageLines, index) => {
      const pageLabel = `${fixture.fixtureId}/${document.documentId} page ${index + 1}`;
      check(
        pageLines.length <= ND_PACKET_LAYOUT.bodyLinesPerPage,
        `${pageLabel}: ${pageLines.length} lines exceeds the ${ND_PACKET_LAYOUT.bodyLinesPerPage}-line page.`
      );
      check(pageLines.length > 0, `${pageLabel}: composed empty.`);
      check(pageLines[0].trim().length > 0, `${pageLabel}: starts with a blank line.`);
      check(
        pageLines[pageLines.length - 1].trim().length > 0,
        `${pageLabel}: ends with a blank line.`
      );
      for (const line of pageLines) {
        check(
          line.length <= ND_PACKET_LAYOUT.measureChars,
          `${pageLabel}: line exceeds the ${ND_PACKET_LAYOUT.measureChars}-character measure: ${line.slice(0, 50)}...`
        );
      }
      // No orphaned signature: a signature rule must never be the first line of
      // a page with nothing above it identifying what is being signed.
      if (pageLines[0].startsWith("________________________________")) {
        failures.push(`${pageLabel}: a signature rule is orphaned at the top of a page.`);
        checks += 1;
      }
      // A signature rule must be followed on the same page by the signer line.
      pageLines.forEach((line, lineIndex) => {
        if (!line.startsWith("________________________________")) return;
        checks += 1;
        if (lineIndex === pageLines.length - 1) {
          failures.push(`${pageLabel}: a signature rule is the last line on the page.`);
        }
      });
    });
  }
  // Long values survive: the petitioner's full name still appears, wrapped.
  const flattened = result.packet.fullText.replace(/\n\s*/g, " ");
  void flattened;
  check(
    flattened.includes(fixture.facts.petitionerName),
    `${fixture.fixtureId}: the petitioner name must survive wrapping intact.`
  );
  check(
    flattened.includes(fixture.facts.caseNumber),
    `${fixture.fixtureId}: the case number must survive wrapping intact.`
  );
  check(
    flattened.includes(fixture.facts.clerkOfCourtDestination),
    `${fixture.fixtureId}: the filing destination must survive wrapping intact.`
  );
}

// The wrapper itself: a single word wider than the measure is split, not run on.
const longWord = "A".repeat(ND_PACKET_LAYOUT.measureChars * 3);
for (const row of wrapLine(longWord)) {
  check(row.length <= ND_PACKET_LAYOUT.measureChars, "wrapLine must split an over-wide word.");
}
check(
  wrapLine(longWord).join("").replace(/\s/g, "") === longWord,
  "wrapLine must not lose characters when it splits an over-wide word."
);
check(wrapLine("short line")[0] === "short line", "wrapLine must leave a short line alone.");
check(longDate("2021-04-12") === "April 12, 2021", "longDate must render an ISO date as a court date.");
check(longDate("not-a-date") === "not-a-date", "longDate must leave a non-date value alone.");

// ---------------------------------------------------------------------------
// 6. Components appear exactly when required
// ---------------------------------------------------------------------------

const documentIds = canonicalPacket.documents.map((document) => document.documentId);
check(
  JSON.stringify(documentIds)
    === JSON.stringify(ND_NONCONVICTION_PETITION_SPEC.documents.map((document) => document.documentId)),
  `Composed documents must match the specification sequence; got ${JSON.stringify(documentIds)}.`
);
const proposedOrder = canonicalPacket.documents.find(
  (document) => document.documentId === "nd_proposed_order_closing_nonconviction_records"
);
const proofOfService = canonicalPacket.documents.find(
  (document) => document.documentId === "nd_proof_of_service_prosecutor"
);
check(Boolean(proposedOrder), "The proposed order must be composed.");
check(Boolean(proofOfService), "The proof of service must be composed.");
check(
  proofOfService?.requirement === "conditional",
  "The proof of service is conditional on this route and must be labelled conditional."
);
check(
  proposedOrder?.requirement === "required",
  "The proposed order must be labelled required."
);
check(
  flat(proofOfService?.text ?? "").includes("the judge may require service on the prosecutor"),
  "The proof of service must state the condition that makes it required."
);
check(
  flat(proposedOrder?.text ?? "").includes("is CLOSED under N.D.C.C. § 12-60.1-05"),
  "The proposed order must order the closing under the operative statute."
);
check(
  flat(proposedOrder?.text ?? "").includes(
    "it does not close records controlled by the prosecutor or law-enforcement entities"
  ),
  "The proposed order must carry the route's relief scope."
);
// The default agency-wide relief must not survive onto this route.
for (const forbidden of [
  "Direct all criminal justice agencies having custody of such records",
  "all other criminal justice agencies with records pertaining to this matter"
]) {
  check(
    !canonicalFlat.includes(flat(forbidden)),
    `This route's order does not reach every criminal justice agency; the packet must not say it does: "${forbidden}".`
  );
}
check(
  canonicalPacket.fullText.includes("FILED WITH THIS PETITION"),
  "The petition must list what is filed with it."
);
check(
  canonicalFlat.includes(
    "Proof of Service on the Prosecuting Attorney (filed only if the judge requires service"
  ),
  "The filed-with list must not assert the conditional service component as mandatory."
);
// Filing destination, fee and post-filing timing are all present and governed.
for (const [label, needle] of [
  ["filing destination", canonicalFixture.facts.clerkOfCourtDestination],
  ["no filing fee", "has no filing fee"],
  ["post-filing timing", "within 10 days"],
  ["access after closing", "Access to closed nonconviction court records is limited"],
  ["date-split explanation", "close on their own 61 days after the order"]
]) {
  check(
    canonicalFlat.includes(flat(needle)),
    `The packet must state the ${label}.`
  );
}
// Nothing invents a hearing or an objection window the source does not state.
check(
  canonicalFlat.includes(
    "No hearing date, objection window, or appearance instruction is asserted."
  ),
  "The packet must record that the source states no hearing and no objection process for this route."
);
for (const invented of [
  "your hearing is scheduled",
  "you must appear",
  "the objection deadline is",
  "a hearing will be held on"
]) {
  check(
    !canonicalFlat.toLowerCase().includes(invented),
    `The source states no hearing or objection process for this route; the packet must not assert "${invented}".`
  );
}

// ---------------------------------------------------------------------------
// 7. Wrong state, wrong specification, wrong route family
// ---------------------------------------------------------------------------

for (const jurisdiction of ["PA", "DC", "OK", "WY", "MS", "NE"]) {
  const result = compose(canonicalFixture.facts, { expectedJurisdiction: jurisdiction });
  check(
    result.status === "refused" && result.reasonCode === "jurisdiction_mismatch",
    `A ${jurisdiction} request must be denied by the North Dakota composer.`
  );
}
check(
  compose(canonicalFixture.facts, { expectedSpecId: "nd-seal-felony-conviction" }).reasonCode
    === "spec_identity_mismatch",
  "A different North Dakota route family must be denied by specification identity."
);
check(
  compose(canonicalFixture.facts, { expectedSpecVersion: "0.9.0" }).reasonCode
    === "spec_identity_mismatch",
  "A different specification version must be denied."
);
// No wrong-state fallback in the output itself.
for (const foreign of [
  "Commonwealth of Pennsylvania",
  "Court of Common Pleas",
  "Pennsylvania State Police",
  "District of Columbia",
  "STATE OF OKLAHOMA",
  "State of Wyoming",
  "Mississippi",
  "Nebraska"
]) {
  check(
    !canonicalPacket.fullText.includes(foreign),
    `North Dakota output must not carry other-state boilerplate: "${foreign}".`
  );
}
for (const required of [
  "STATE OF NORTH DAKOTA",
  "North Dakota",
  "N.D.C.C. § 12-60.1-05",
  "Burleigh County"
]) {
  check(
    canonicalPacket.fullText.includes(required),
    `North Dakota output is missing a required North Dakota term: "${required}".`
  );
}

// ---------------------------------------------------------------------------
// 8. Placeholder and incomplete content cannot pass
// ---------------------------------------------------------------------------

check(
  canonicalPacket.placeholderScan.disallowedTokens.length === 0,
  `The canonical packet carries disallowed tokens: ${canonicalPacket.placeholderScan.disallowedTokens.join(", ")}.`
);
for (const fixtureId of ["multiline", "boundary"]) {
  const result = compose(readFixture(fixtureId).facts);
  check(
    result.status === "composed" && result.packet.placeholderScan.disallowedTokens.length === 0,
    `Fixture ${fixtureId} carries disallowed tokens.`
  );
}
// The scan is not vacuous: it catches what it is there to catch.
for (const poison of [
  "The clerk is undefined.",
  "Serve the null office.",
  "TODO: confirm the venue.",
  "File in {county} County.",
  "[CITATION REQUIRED — FLAGGED FOR COUNSEL] see counsel."
]) {
  const scan = scanPlaceholders(`Some real text. ${poison} More real text.`);
  check(
    scan.disallowedTokens.length > 0,
    `The placeholder scan must reject: "${poison}".`
  );
}
check(
  scanPlaceholders("A nullity is nullified by the nullifier. Nothing here is wrong.").disallowedTokens.length === 0,
  "The placeholder scan must not fire on a word that merely contains 'null'."
);
// Every bracketed merge field left in the packet is a known, reviewed one.
const allowedBrackets = new Set([
  "[PROSECUTING ATTORNEY ADDRESS — CONFIRM WITH CLERK OF COURT]",
  "[personal delivery / first-class mail / other as permitted by applicable court rules]",
  "[NOTE: Date of birth and Social Security Number should be added by petitioner if required by the applicable form or local court rules.]",
  "[PROPOSED] ORDER",
  "[PROPOSED]",
  "[Proposed] Order Closing Nonconviction Records"
]);
for (const token of canonicalPacket.placeholderScan.bracketTokensPresent) {
  const flattened = token.replace(/\s+/g, " ");
  check(
    [...allowedBrackets].some((allowed) => allowed.replace(/\s+/g, " ").startsWith(flattened)),
    `Unreviewed bracketed merge field in the canonical packet: ${token}`
  );
}
// Vocabulary QA, on the composed pleading body.
const qa = runPleadingQa({
  config: ndNonconvictionClosingConfig,
  renderResult: canonicalPacket.pleadingRenderResult,
  prohibitedTerms: ["expungement", "expunge", "set aside", "set-aside", "annulment", "vacatur"]
});
check(qa.passed, `Pleading QA failed: ${qa.failures.join("; ")}`);
check(
  canonicalPacket.pleadingRenderResult.templateLifecycle === "replacement_candidate",
  "The composed pleading must remain a replacement candidate, never a verified replacement."
);
for (const document of canonicalPacket.documents) {
  check(
    flat(document.text).includes("This is not an official court form"),
    `${document.documentId} must carry the not-an-official-form footer.`
  );
  check(
    document.text.replace(/[\s-]/g, "").length > 0,
    `${document.documentId} composed empty.`
  );
}

// ---------------------------------------------------------------------------
// 9. Stale specification or provider binding invalidates authority
// ---------------------------------------------------------------------------

const specHash = ndComposedPacketSpecHash();
check(
  compose(canonicalFixture.facts, { expectedSpecHash: specHash }).status === "composed",
  "The current specification hash must be accepted."
);
const stale = compose(canonicalFixture.facts, { expectedSpecHash: "0".repeat(64) });
check(
  stale.status === "refused" && stale.reasonCode === "stale_spec_hash",
  "A pinned specification hash that no longer matches must invalidate the packet authority."
);
// The hash is a real function of the specification, not a constant.
const mutatedSpec = {
  ...ND_NONCONVICTION_PETITION_SPEC,
  authority: [...ND_NONCONVICTION_PETITION_SPEC.authority, "N.D.C.C. § 12-60.1-02"]
};
check(
  ndComposedPacketSpecHash(mutatedSpec) !== specHash,
  "The specification hash must change when the specification changes."
);
check(
  ndComposedPacketSpecHash({ ...ND_NONCONVICTION_PETITION_SPEC }) === specHash,
  "The specification hash must not depend on property order."
);

// The provider binding must still describe the compiled profile it was read from.
const profile = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json"), "utf8")
);
check(
  profile.profileVersion === ND_NONCONVICTION_PETITION_SPEC.provider.profileVersion,
  `Provider binding is stale: spec pins profile ${ND_NONCONVICTION_PETITION_SPEC.provider.profileVersion}, compiled profile is ${profile.profileVersion}.`
);
check(
  profile.source.sourceCorpusSha256 === ND_NONCONVICTION_PETITION_SPEC.provider.sourceCorpusSha256,
  "Provider binding is stale: the compiled ND source corpus hash moved."
);
// The source identities must still be the ones the ND inventory carries.
for (const source of ND_NONCONVICTION_PETITION_SPEC.sources) {
  const inventory = [
    ...ndPack.northDakotaAll50BuildMetadata.officialFormInventory,
    ...ndPack.northDakotaAll50BuildMetadata.resourcePacketInventory
  ].find((entry) => entry.fileName === source.fileName);
  check(
    inventory && inventory.sha256 === source.sha256,
    `Source identity drift for ${source.fileName}: the ND inventory no longer carries the pinned hash.`
  );
}
// Every module the provider binding names must exist.
for (const modulePath of [
  ND_NONCONVICTION_PETITION_SPEC.provider.composerModule,
  ND_NONCONVICTION_PETITION_SPEC.provider.rendererModule
]) {
  check(fs.existsSync(path.join(rootDir, modulePath)), `Provider binding names a missing module: ${modulePath}.`);
}

// ---------------------------------------------------------------------------
// 10. Committed artifacts and committed review still match this build
// ---------------------------------------------------------------------------

const report = JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, "rendered/render-report.json"), "utf8"));
const committedPdf = fs.readFileSync(path.join(ARTIFACT_DIR, "rendered/canonical.pdf"));
const committedText = fs.readFileSync(path.join(ARTIFACT_DIR, "rendered/canonical.txt"), "utf8");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

check(
  committedPdf.subarray(0, 5).toString("latin1") === "%PDF-",
  "The committed artifact must be a real PDF."
);
check(
  sha256(committedPdf) === report.artifact.sha256,
  "The committed PDF does not match the SHA-256 in its render report."
);
check(
  report.artifact.contentType === "application/pdf",
  "The render report must record the artifact as application/pdf."
);
check(
  report.artifact.byteSize === committedPdf.length,
  "The render report byte size does not match the committed PDF."
);
check(
  committedText === `${canonicalPacket.fullText}\n`,
  "The committed canonical text is stale against the current composer."
);
check(
  report.text.composedTextSha256 === canonicalPacket.fullTextSha256,
  "The render report composed-text hash is stale."
);
check(
  report.specHash === specHash,
  "The render report specification hash is stale."
);
check(
  report.totalPageCount === canonicalPacket.totalPageCount,
  `The render report page count (${report.totalPageCount}) does not match the composer (${canonicalPacket.totalPageCount}).`
);
check(
  report.artifact.pageCount === canonicalPacket.totalPageCount,
  `The PDF page count (${report.artifact.pageCount}) does not match the composed page count (${canonicalPacket.totalPageCount}).`
);
check(
  JSON.stringify(report.documentManifest) === JSON.stringify(canonicalPacket.documentManifest),
  "The render report document manifest is stale."
);

if (fs.existsSync(REVIEW_PATH)) {
  const review = JSON.parse(fs.readFileSync(REVIEW_PATH, "utf8"));
  check(
    review.artifactSha256 === report.artifact.sha256,
    "The committed review was performed against different artifact bytes; the review is stale."
  );
  check(
    review.specHash === specHash,
    "The committed review was performed against a different specification; the review is stale."
  );
  check(
    review.totalPageCount === canonicalPacket.totalPageCount,
    "The committed review covers a different number of pages than the artifact has."
  );
  check(
    Array.isArray(review.pageByPage) && review.pageByPage.length === canonicalPacket.totalPageCount,
    `The page-by-page visual review must cover all ${canonicalPacket.totalPageCount} pages.`
  );
  check(
    review.openDefects.length === 0,
    `The review still records open defects: ${review.openDefects.map((defect) => defect.id).join(", ")}.`
  );
  check(
    review.commercialPosture === "candidate_evidence_only",
    "Lane D produces candidate evidence only; the review must not assert a commercial posture."
  );
} else {
  failures.push(`Missing review record: ${path.relative(rootDir, REVIEW_PATH)}`);
  checks += 1;
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`North Dakota composed-packet verification FAILED (${failures.length} of ${checks} checks).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`North Dakota composed-packet verification PASSED (${checks} checks).`);
console.log(`  spec:              ${ND_NONCONVICTION_PETITION_SPEC.specId}@${ND_NONCONVICTION_PETITION_SPEC.specVersion}`);
console.log(`  spec sha256:       ${specHash}`);
console.log(`  date split:        ${ND_NONCONVICTION_DATE_SPLIT} (boundary date -> automatic branch, no packet)`);
console.log(`  documents:         ${canonicalPacket.documents.length}`);
console.log(`  pages:             ${canonicalPacket.totalPageCount}`);
console.log(`  artifact sha256:   ${report.artifact.sha256}`);
console.log(`  disallowed tokens: none`);
console.log(`  wrong-state leak:  none`);
