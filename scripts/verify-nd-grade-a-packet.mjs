#!/usr/bin/env node
// Lane D — focused tests for the North Dakota Chapter 12-60.1 Grade-A packet.
//
//   node scripts/verify-nd-grade-a-packet.mjs
//
// Proves, in order:
//
//   1. the selected route requires participant filing, and the rejected
//      non-filing route is still classified non-filing by current authority;
//   2. the ground resolver picks the right ground and fails closed everywhere;
//   3. every statutory exclusion denies the route outright;
//   4. required facts are enforced one at a time, per ground;
//   5. missing local filing configuration fails closed with its own reason;
//   6. composer output is deterministic;
//   7. long-value and pagination fixtures stay filing-readable;
//   8. every Grade-A packet element is present, and the relief asked for does
//      not exceed what Chapter 12-60.1 grants;
//   9. a wrong state, a wrong specification identity and a stale specification
//      hash are denied;
//  10. placeholder or incomplete content cannot pass;
//  11. the committed artifacts, the committed reviews and the committed
//      fulfillment patch request still match what this build produces;
//  12. commercial status stays closed.
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
  "data/rcap-lane-d/north-dakota/nd-chapter-12-60-1-conviction-sealing"
);
const DOCS_DIR = path.join(rootDir, "docs/rcap/grade-a/north-dakota");
const GRADE_A = "../src/lib/rcap/state-packs/north-dakota/grade-a";

const {
  ND_CHAPTER_12_60_1_SEALING_SPEC,
  ND_SEALING_GROUNDS,
  ND_SEALING_EXCLUSIONS,
  ND_CHAPTER_12_60_1_STOP_CONDITIONS,
  resolveNdSealingRoute,
  ndGradeASpecHash,
  ndGradeASpecCompleteness
} = await import(`${GRADE_A}/packet-spec.ts`);
const {
  composeNdSealingPacket,
  ND_GRADE_A_LAYOUT,
  wrapLine,
  longDate,
  scanPlaceholders
} = await import(`${GRADE_A}/composer.ts`);
const { ndSealingConfigForGround } = await import(`${GRADE_A}/pleading-config.ts`);
const { runPleadingQa } = await import("../src/lib/record-clearing/pleading-qa.ts");
const ndPack = await import("../src/lib/rcap/state-packs/north-dakota/index.ts");

const failures = [];
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const readFixture = (id) => readJson(path.join(ARTIFACT_DIR, `fixtures/${id}.json`));
const PRODUCT_NAME = "LegalEase RCAP";
const compose = (facts, extra = {}) =>
  composeNdSealingPacket({ facts, productName: PRODUCT_NAME, ...extra });

const canonicalFixture = readFixture("canonical");
const felonyFixture = readFixture("felony");
const pardonFixture = readFixture("pardon");
const multilineFixture = readFixture("multiline");

// ---------------------------------------------------------------------------
// 1. Route selection: the selected route files, the rejected route does not
// ---------------------------------------------------------------------------

const SELECTED = "ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1";
const REJECTED = "ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05";

check(
  ND_CHAPTER_12_60_1_SEALING_SPEC.routeId === SELECTED,
  `The specification must bind ${SELECTED}, got ${ND_CHAPTER_12_60_1_SEALING_SPEC.routeId}.`
);
check(
  ND_CHAPTER_12_60_1_SEALING_SPEC.requiresParticipantFiling === true,
  "The selected route must be one that requires participant filing."
);
check(
  ND_CHAPTER_12_60_1_SEALING_SPEC.serviceDisposition === "paid_packet_intended",
  "The selected route must carry the paid-packet service disposition."
);

// The rejected route is still non-filing under current authority. If that ever
// changes this test fails, which is the point: the rejection is bound to the
// authority that produced it, not asserted once in prose.
const closure = readJson(path.join(rootDir, "data/rcap-ledger/sellable-pathway-closure.json"));
const rejectedRow = JSON.stringify(closure).includes(REJECTED)
  ? findRow(closure, REJECTED)
  : null;
check(Boolean(rejectedRow), `The closure ledger must still carry a row for ${REJECTED}.`);
if (rejectedRow) {
  check(
    rejectedRow.category === "non_filing_guidance",
    `${REJECTED} must still be classified non_filing_guidance, got ${rejectedRow.category}.`
  );
  check(
    String(rejectedRow.categoryBasis ?? "").includes("ND-2026-08-28-NO-PARTICIPANT-FILING"),
    "The non-filing classification must still rest on the signed reclassification."
  );
  check(
    rejectedRow.route?.sellable === false && rejectedRow.route?.creditConsumable === false,
    `${REJECTED} must remain unsellable and non-credit-consuming.`
  );
}

const authority = readJson(path.join(rootDir, "src/lib/legal-authority/authority.json"));
const ndDecision = authority.decisions.find((decision) => decision.jurisdiction === "ND");
check(Boolean(ndDecision), "The legal-authority file must still carry a North Dakota decision.");
if (ndDecision) {
  check(
    ndDecision.routeKeys.includes(REJECTED) && !ndDecision.routeKeys.includes(SELECTED),
    "The ND decision on record still governs the non-filing route, not the selected filing route."
  );
  check(
    String(ndDecision.effectiveDateNote).includes("is not built"),
    "The ND decision must still record that the pre-2025-08-01 branch is a service branch that is not built."
  );
}
const nationalReport = readJson(
  path.join(rootDir, "src/lib/legal-authority/routes/national-report-2026-08-28.json")
);
const rejectedContract = nationalReport.routes.find((route) => route.routeKey === REJECTED);
check(Boolean(rejectedContract), "The national report must still carry the rejected route's contract.");
if (rejectedContract) {
  check(
    rejectedContract.outcomeMode === "automatic_relief" && rejectedContract.stage === "automatic",
    "The rejected route's contract must still be automatic relief at the automatic stage."
  );
}

function findRow(node, routeKey) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRow(item, routeKey);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    if (node.pathwayKey === routeKey && "category" in node) return node;
    for (const value of Object.values(node)) {
      const found = findRow(value, routeKey);
      if (found) return found;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. Ground resolution, and failing closed
// ---------------------------------------------------------------------------

const satisfied = {
  convicted: true,
  imprisonmentAndProbationComplete: true,
  restitutionPaid: true,
  newConvictionInCleanPeriod: false
};

for (const [label, input, expectedGround] of [
  ["misdemeanor", { ...satisfied, offenseLevel: "Class A misdemeanor" }, "misdemeanor_conviction"],
  ["felony", { ...satisfied, offenseLevel: "Class C felony" }, "felony_conviction"],
  [
    "pardon outranks level",
    { ...satisfied, offenseLevel: "Class C felony", unconditionalPardon: true },
    "unconditional_pardon"
  ],
  [
    "pardon with no clean period established",
    {
      convicted: true,
      imprisonmentAndProbationComplete: true,
      restitutionPaid: true,
      unconditionalPardon: true
    },
    "unconditional_pardon"
  ]
]) {
  const resolution = resolveNdSealingRoute(input);
  check(
    resolution.status === "eligible_to_file" && resolution.groundId === expectedGround,
    `Ground resolution (${label}): expected ${expectedGround}, got ${resolution.status}/${resolution.groundId ?? "-"}.`
  );
  if (resolution.status === "eligible_to_file") {
    check(
      resolution.specId === ND_CHAPTER_12_60_1_SEALING_SPEC.specId
        && resolution.specVersion === ND_CHAPTER_12_60_1_SEALING_SPEC.specVersion,
      `Ground resolution (${label}) must select the Chapter 12-60.1 specification.`
    );
  }
}

for (const [label, input, expectedCode] of [
  ["no conviction established", { offenseLevel: "misdemeanor" }, "conviction_not_established"],
  [
    "explicit non-conviction",
    { ...satisfied, convicted: false, offenseLevel: "misdemeanor" },
    "conviction_not_established"
  ],
  [
    "sentence not complete",
    { ...satisfied, imprisonmentAndProbationComplete: false, offenseLevel: "misdemeanor" },
    "statutory_findings_not_established"
  ],
  [
    "restitution unpaid",
    { ...satisfied, restitutionPaid: false, offenseLevel: "misdemeanor" },
    "statutory_findings_not_established"
  ],
  [
    "findings not established at all",
    { convicted: true, offenseLevel: "misdemeanor" },
    "statutory_findings_not_established"
  ],
  ["offence level unknown", { ...satisfied, offenseLevel: "" }, "offense_level_not_established"],
  [
    "offence level nonsense",
    { ...satisfied, offenseLevel: "some other thing" },
    "offense_level_not_established"
  ],
  [
    "clean period not established",
    {
      convicted: true,
      imprisonmentAndProbationComplete: true,
      restitutionPaid: true,
      offenseLevel: "misdemeanor"
    },
    "clean_period_not_established"
  ],
  [
    "new conviction inside the clean period",
    { ...satisfied, newConvictionInCleanPeriod: true, offenseLevel: "misdemeanor" },
    "clean_period_not_satisfied"
  ]
]) {
  const resolution = resolveNdSealingRoute(input);
  check(
    resolution.status === "unresolved" && resolution.reasonCode === expectedCode,
    `Fail-closed (${label}): expected unresolved/${expectedCode}, got ${resolution.status}/${resolution.reasonCode ?? "-"}.`
  );
}

// The pardon ground is not a way around the § 12-60.1-04(1)(c)/(d) findings.
check(
  resolveNdSealingRoute({
    convicted: true,
    unconditionalPardon: true,
    imprisonmentAndProbationComplete: false,
    restitutionPaid: true
  }).status === "unresolved",
  "An unconditional pardon must not bypass the statutory completion findings."
);

// ---------------------------------------------------------------------------
// 3. Exclusions
// ---------------------------------------------------------------------------

check(
  ND_SEALING_EXCLUSIONS.length === 3,
  `The state pack states three Chapter 12-60.1 bars; the spec carries ${ND_SEALING_EXCLUSIONS.length}.`
);
for (const exclusion of ND_SEALING_EXCLUSIONS) {
  check(
    ndPack.ndDisqualifyingOffenseNotes.includes(exclusion.text),
    `Exclusion "${exclusion.id}" is not carried verbatim from ndDisqualifyingOffenseNotes.`
  );
  for (const ground of ND_SEALING_GROUNDS) {
    const resolution = resolveNdSealingRoute({
      ...satisfied,
      offenseLevel: ground.groundId === "felony_conviction" ? "felony" : "misdemeanor",
      unconditionalPardon: ground.groundId === "unconditional_pardon",
      exclusions: [exclusion.id]
    });
    check(
      resolution.status === "excluded" && resolution.exclusionIds.includes(exclusion.id),
      `Exclusion ${exclusion.id} must deny the ${ground.groundId} ground, got ${resolution.status}.`
    );
  }
  const refused = compose({ ...canonicalFixture.facts, exclusions: [exclusion.id] });
  check(
    refused.status === "refused" && refused.reasonCode === "route_not_eligible_to_file",
    `An excluded matter (${exclusion.id}) must be refused a packet.`
  );
}
// Impaired driving is routed away rather than merely denied.
check(
  resolveNdSealingRoute({ ...satisfied, offenseLevel: "misdemeanor", exclusions: ["impaired_driving_offense"] })
    .reason.includes("39-08-01.6"),
  "An impaired-driving refusal must name the separate DUI statute the participant needs."
);

// ---------------------------------------------------------------------------
// 4. Required facts, per ground
// ---------------------------------------------------------------------------

const localConfigFactIds = ["countyName", "judicialDistrict", "courtName", "clerkOfCourtDestination"];
const packPathwayByGround = {
  misdemeanor_conviction: "conviction_sealing_misdemeanor",
  felony_conviction: "conviction_sealing_felony",
  unconditional_pardon: "conviction_sealing_pardon_supported"
};

for (const [fixture, groundId] of [
  [canonicalFixture, "misdemeanor_conviction"],
  [felonyFixture, "felony_conviction"],
  [pardonFixture, "unconditional_pardon"]
]) {
  // Spec fidelity: every state-pack required field for this pathway is required here.
  for (const field of ndPack.ndRequiredFields[packPathwayByGround[groundId]]) {
    const fact = ND_CHAPTER_12_60_1_SEALING_SPEC.requiredFacts.find((entry) => entry.factId === field);
    check(
      fact && !fact.optional && (!fact.grounds || fact.grounds.includes(groundId)),
      `State-pack required field "${field}" for ${packPathwayByGround[groundId]} is not required by the specification for ${groundId}.`
    );
  }

  const required = ND_CHAPTER_12_60_1_SEALING_SPEC.requiredFacts
    .filter((fact) => !fact.optional)
    .filter((fact) => !fact.grounds || fact.grounds.includes(groundId))
    .map((fact) => fact.factId);
  check(required.length > 0, `${groundId}: no required facts are declared.`);

  for (const factId of required) {
    const facts = { ...fixture.facts };
    delete facts[factId];
    const result = compose(facts);
    check(result.status === "refused", `${groundId}: dropping "${factId}" must refuse the compose.`);
    if (result.status === "refused") {
      // offenseLevel is also a route fact: dropping it stops the resolver before
      // the fact check ever runs, which is the earlier and stricter refusal.
      const expectedCode = factId === "offenseLevel"
        ? "route_not_eligible_to_file"
        : localConfigFactIds.includes(factId)
          ? "missing_local_configuration"
          : "missing_required_facts";
      check(
        result.reasonCode === expectedCode,
        `${groundId}: dropping "${factId}" must refuse with ${expectedCode}, got ${result.reasonCode}.`
      );
      if (expectedCode !== "route_not_eligible_to_file") {
        check(
          result.detail.includes(factId),
          `${groundId}: the refusal for "${factId}" must name the missing fact.`
        );
      }
    }
    // A blank string is as absent as a missing key.
    const blanked = compose({ ...fixture.facts, [factId]: "   " });
    check(blanked.status === "refused", `${groundId}: a blank value for "${factId}" must refuse.`);
  }
}

// ---------------------------------------------------------------------------
// 5. Local configuration fails closed
// ---------------------------------------------------------------------------

for (const factId of localConfigFactIds) {
  const result = compose({ ...canonicalFixture.facts, [factId]: undefined });
  check(
    result.status === "refused" && result.reasonCode === "missing_local_configuration",
    `A matter with no ${factId} must fail closed on local configuration, got ${result.reasonCode}.`
  );
}

// ---------------------------------------------------------------------------
// 6. Determinism
// ---------------------------------------------------------------------------

const runA = compose(canonicalFixture.facts);
const runB = compose(canonicalFixture.facts);
check(runA.status === "composed" && runB.status === "composed", "The canonical fixture must compose.");
check(
  runA.status === "composed" && runB.status === "composed"
    && runA.packet.fullTextSha256 === runB.packet.fullTextSha256,
  "Two composes of the same facts must produce identical bytes."
);
check(
  runA.status === "composed"
    && JSON.stringify(runA.packet.documentManifest) === JSON.stringify(runB.packet.documentManifest),
  "Two composes of the same facts must produce an identical document manifest."
);
const reordered = Object.fromEntries(Object.entries(canonicalFixture.facts).reverse());
const runC = compose(reordered);
check(
  runC.status === "composed" && runC.packet.fullTextSha256 === runA.packet.fullTextSha256,
  "Reordering the fact object must not change the composed bytes."
);
const canonicalPacket = runA.packet;

// Different grounds must produce genuinely different packets.
const felonyPacket = compose(felonyFixture.facts);
const pardonPacket = compose(pardonFixture.facts);
check(felonyPacket.status === "composed", "The felony fixture must compose.");
check(pardonPacket.status === "composed", "The pardon fixture must compose.");
check(
  felonyPacket.status === "composed" && felonyPacket.packet.fullTextSha256 !== canonicalPacket.fullTextSha256,
  "The felony ground must not produce the misdemeanor packet's bytes."
);
check(
  felonyPacket.status === "composed" && felonyPacket.packet.fullText.includes("at least 5 years"),
  "The felony packet must state the five-year clean period."
);
check(
  canonicalPacket.fullText.includes("at least 3 years"),
  "The misdemeanor packet must state the three-year clean period."
);
check(
  pardonPacket.status === "composed" && pardonPacket.packet.fullText.includes("unconditional pardon"),
  "The pardon packet must state the pardon ground."
);
// The statutory-authority block quotes § 12-60.1-02 in full, clean periods and
// all, because that is the statute. What must not happen is the packet ALLEGING
// a clean period as a fact about a petitioner whose ground does not carry one.
check(
  pardonPacket.status === "composed"
    && !pardonPacket.packet.fullText.includes("Petitioner has not been convicted of a new crime during"),
  "The pardon packet must not allege a clean period its ground does not carry."
);
check(
  pardonPacket.status === "composed"
    && !pardonPacket.packet.fullText.includes("All restitution ordered in this case has been paid:"),
  "The pardon packet must not allege facts the pardon ground does not require."
);

// ---------------------------------------------------------------------------
// 7. Filing readability
// ---------------------------------------------------------------------------

for (const fixture of [canonicalFixture, felonyFixture, pardonFixture, multilineFixture]) {
  const result = compose(fixture.facts);
  check(result.status === "composed", `Fixture ${fixture.fixtureId} must compose.`);
  if (result.status !== "composed") continue;
  for (const document of result.packet.documents) {
    check(document.pageCount >= 1, `${fixture.fixtureId}/${document.documentId}: no pages composed.`);
    document.pages.forEach((pageLines, index) => {
      const label = `${fixture.fixtureId}/${document.documentId} page ${index + 1}`;
      check(
        pageLines.length <= ND_GRADE_A_LAYOUT.bodyLinesPerPage,
        `${label}: ${pageLines.length} lines exceeds the ${ND_GRADE_A_LAYOUT.bodyLinesPerPage}-line page.`
      );
      check(pageLines.length > 0, `${label}: composed empty.`);
      check(pageLines[0].trim().length > 0, `${label}: starts with a blank line.`);
      check(pageLines[pageLines.length - 1].trim().length > 0, `${label}: ends with a blank line.`);
      for (const line of pageLines) {
        check(
          line.length <= ND_GRADE_A_LAYOUT.measureChars,
          `${label}: line exceeds the ${ND_GRADE_A_LAYOUT.measureChars}-character measure: ${line.slice(0, 50)}...`
        );
      }
      if (pageLines[0].startsWith("________________________________")) {
        checks += 1;
        failures.push(`${label}: a signature rule is orphaned at the top of a page.`);
      }
      if (pageLines[pageLines.length - 1].startsWith("________________________________")) {
        checks += 1;
        failures.push(`${label}: a signature rule is the last line on the page.`);
      }
    });
  }
  const flattened = result.packet.fullText.replace(/\s+/g, " ");
  for (const [what, value] of [
    ["petitioner name", fixture.facts.petitionerName],
    ["case number", fixture.facts.caseNumber],
    ["filing destination", fixture.facts.clerkOfCourtDestination],
    ["prosecuting attorney", fixture.facts.prosecutorOffice]
  ]) {
    check(
      flattened.includes(String(value).replace(/\s+/g, " ")),
      `${fixture.fixtureId}: the ${what} must survive wrapping intact.`
    );
  }
  // Roman-numeral headings must be unique within the petition.
  const petition = result.packet.documents.find(
    (document) => document.documentId === "nd_petition_to_seal_criminal_records"
  );
  const numerals = (petition?.text.match(/^([IVX]+)\. [A-Z]/gm) ?? []).map((line) => line.split(".")[0]);
  check(
    new Set(numerals).size === numerals.length,
    `${fixture.fixtureId}: the petition repeats a section numeral: ${numerals.join(", ")}.`
  );
}

const longWord = "A".repeat(ND_GRADE_A_LAYOUT.measureChars * 3);
for (const row of wrapLine(longWord)) {
  check(row.length <= ND_GRADE_A_LAYOUT.measureChars, "wrapLine must split an over-wide word.");
}
check(
  wrapLine(longWord).join("").replace(/\s/g, "") === longWord,
  "wrapLine must not lose characters when it splits an over-wide word."
);
check(wrapLine("short line")[0] === "short line", "wrapLine must leave a short line alone.");
check(longDate("2018-06-01") === "June 1, 2018", "longDate must render an ISO date as a court date.");
check(longDate("not-a-date") === "not-a-date", "longDate must leave a non-date value alone.");

// ---------------------------------------------------------------------------
// 8. Every Grade-A packet element, and relief that does not exceed the statute
// ---------------------------------------------------------------------------

const flat = (text) => text.replace(/\s+/g, " ");
const canonicalFlat = flat(canonicalPacket.fullText);

check(
  JSON.stringify(canonicalPacket.documents.map((document) => document.documentId))
    === JSON.stringify(
      ND_CHAPTER_12_60_1_SEALING_SPEC.documents
        .filter((document) => document.requirement === "required")
        .map((document) => document.documentId)
    ),
  `Composed documents must be exactly the specification's required documents; got ${canonicalPacket.documents.map((d) => d.documentId).join(", ")}.`
);
check(
  ND_CHAPTER_12_60_1_SEALING_SPEC.documents.some(
    (document) => document.documentId === "nd_notice_affidavit" && document.requirement === "absent_by_design"
  ),
  "The absent notice/affidavit component must be recorded as absent by design, with its basis."
);

for (const [element, needle] of [
  ["complete filing", "PETITION TO SEAL CRIMINAL RECORDS PURSUANT TO N.D.C.C. CHAPTER 12-60.1"],
  ["caption and court identification", "IN THE DISTRICT COURT OF THE STATE OF NORTH DAKOTA"],
  ["proposed order", "[PROPOSED] ORDER"],
  ["service component", "PROOF OF SERVICE ON THE PROSECUTING ATTORNEY"],
  ["service authority", "N.D.C.C. § 12-60.1-03(4)"],
  ["filing destination", canonicalFixture.facts.clerkOfCourtDestination],
  ["venue rule", "under N.D.C.C. § 12-60.1-03(1)"],
  ["fee instruction", "verified before a user pays"],
  ["fee waiver instruction", "without payment of fees"],
  ["copy requirement", "keep a complete copy of everything filed"],
  ["post-filing step", "no earlier than 45 days after filing"],
  ["hearing stop condition", "The court sets a hearing."],
  ["objection stop condition", "The prosecuting attorney objects"],
  ["refiling stop condition", "prohibit refiling for up to one year"],
  ["signature block", "Date: ________________________________"],
  ["relief scope", "court and prosecution records only"]
]) {
  check(canonicalFlat.includes(flat(String(needle))), `The packet must state the ${element}.`);
}

// Every stop condition reaches the participant.
for (const stop of ND_CHAPTER_12_60_1_STOP_CONDITIONS) {
  check(
    canonicalFlat.includes(flat(stop.condition)),
    `Stop condition "${stop.id}" must appear in the packet.`
  );
}

// The relief asked for may not exceed what Chapter 12-60.1 grants.
for (const overbroad of [
  "Direct all criminal justice agencies having custody of such records",
  "all other criminal justice agencies with records pertaining to this matter"
]) {
  check(
    !canonicalFlat.includes(flat(overbroad)),
    `Chapter 12-60.1 does not reach every criminal justice agency; the packet must not ask for it: "${overbroad}".`
  );
}
check(
  canonicalFlat.includes("Order that the court and prosecution records in the above-captioned criminal case be sealed"),
  "The requested relief must be the sealing Chapter 12-60.1 actually authorizes."
);
const proposedOrder = canonicalPacket.documents.find(
  (document) => document.documentId === "nd_proposed_order_to_seal_criminal_records"
);
check(
  flat(proposedOrder?.text ?? "").includes("does not reach BCI criminal history record information"),
  "The proposed order must state the limit of what it reaches."
);
// Nothing invents a fee amount or a deadline the source does not state.
check(
  !/\$\s?\d/.test(canonicalPacket.fullText),
  "No committed source states a Chapter 12-60.1 filing fee; the packet must not print a dollar amount."
);

// ---------------------------------------------------------------------------
// 9. Wrong state, wrong specification, stale hash
// ---------------------------------------------------------------------------

for (const jurisdiction of ["PA", "DC", "OK", "WY", "MS", "OR"]) {
  const result = compose(canonicalFixture.facts, { expectedJurisdiction: jurisdiction });
  check(
    result.status === "refused" && result.reasonCode === "jurisdiction_mismatch",
    `A ${jurisdiction} request must be denied by the North Dakota composer.`
  );
}
check(
  compose(canonicalFixture.facts, { expectedSpecId: "nd-nonconviction-closing-petition" }).reasonCode
    === "spec_identity_mismatch",
  "The rejected non-filing route's specification identity must be denied."
);
check(
  compose(canonicalFixture.facts, { expectedSpecVersion: "0.9.0" }).reasonCode === "spec_identity_mismatch",
  "A different specification version must be denied."
);
const specHash = ndGradeASpecHash();
check(
  compose(canonicalFixture.facts, { expectedSpecHash: specHash }).status === "composed",
  "The current specification hash must be accepted."
);
const stale = compose(canonicalFixture.facts, { expectedSpecHash: "0".repeat(64) });
check(
  stale.status === "refused" && stale.reasonCode === "stale_spec_hash",
  "A pinned specification hash that no longer matches must invalidate the packet authority."
);
check(
  ndGradeASpecHash({ ...ND_CHAPTER_12_60_1_SEALING_SPEC, authority: ["changed"] }) !== specHash,
  "The specification hash must change when the specification changes."
);
check(
  ndGradeASpecHash({ ...ND_CHAPTER_12_60_1_SEALING_SPEC }) === specHash,
  "The specification hash must not depend on property order."
);

// No wrong-state fallback in the output.
for (const foreign of [
  "Commonwealth of Pennsylvania",
  "Court of Common Pleas",
  "District of Columbia",
  "STATE OF OKLAHOMA",
  "State of Wyoming",
  "Mississippi",
  "Oregon"
]) {
  check(
    !canonicalPacket.fullText.includes(foreign),
    `North Dakota output must not carry other-state boilerplate: "${foreign}".`
  );
}
for (const required of ["STATE OF NORTH DAKOTA", "N.D.C.C. Chapter 12-60.1", "Burleigh County"]) {
  check(
    canonicalPacket.fullText.includes(required),
    `North Dakota output is missing a required North Dakota term: "${required}".`
  );
}

// ---------------------------------------------------------------------------
// 10. Placeholder and incomplete content cannot pass
// ---------------------------------------------------------------------------

check(
  canonicalPacket.placeholderScan.disallowedTokens.length === 0,
  `The canonical packet carries disallowed tokens: ${canonicalPacket.placeholderScan.disallowedTokens.join(", ")}.`
);
for (const fixtureId of ["felony", "pardon", "multiline"]) {
  const result = compose(readFixture(fixtureId).facts);
  check(
    result.status === "composed" && result.packet.placeholderScan.disallowedTokens.length === 0,
    `Fixture ${fixtureId} carries disallowed tokens.`
  );
}
for (const poison of [
  "The clerk is undefined.",
  "Serve the null office.",
  "TODO: confirm the venue.",
  "File in {county} County.",
  "[CITATION REQUIRED — FLAGGED FOR COUNSEL] see counsel."
]) {
  check(
    scanPlaceholders(`Some real text. ${poison} More real text.`).disallowedTokens.length > 0,
    `The placeholder scan must reject: "${poison}".`
  );
}
check(
  scanPlaceholders("A nullity is nullified by the nullifier.").disallowedTokens.length === 0,
  "The placeholder scan must not fire on a word that merely contains 'null'."
);

const allowedBrackets = [
  "[PROSECUTING ATTORNEY ADDRESS — CONFIRM WITH CLERK OF COURT]",
  "[personal delivery / first-class mail / other as permitted by applicable court rules]",
  "[NOTE: Date of birth and Social Security Number should be added by petitioner if required by the applicable form or local court rules.]",
  "[PROPOSED] ORDER",
  "[PROPOSED]",
  "[Proposed] Order to Seal Criminal Records"
];
for (const token of canonicalPacket.placeholderScan.bracketTokensPresent) {
  const flattenedToken = token.replace(/\s+/g, " ");
  check(
    allowedBrackets.some((allowed) => allowed.replace(/\s+/g, " ").startsWith(flattenedToken)),
    `Unreviewed bracketed merge field in the canonical packet: ${token}`
  );
}

const qa = runPleadingQa({
  config: ndSealingConfigForGround(canonicalPacket.groundId),
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
  check(document.text.replace(/[\s-]/g, "").length > 0, `${document.documentId} composed empty.`);
}
const completeness = ndGradeASpecCompleteness();
check(completeness.complete, `The specification is incomplete: ${completeness.missing.join("; ")}`);

// ---------------------------------------------------------------------------
// 11. Committed artifacts, reviews and patch request are current
// ---------------------------------------------------------------------------

const report = readJson(path.join(ARTIFACT_DIR, "rendered/render-report.json"));
const committedPdf = fs.readFileSync(path.join(ARTIFACT_DIR, "rendered/canonical.pdf"));
const committedText = fs.readFileSync(path.join(ARTIFACT_DIR, "rendered/canonical.txt"), "utf8");
const committedPages = fs.readFileSync(path.join(ARTIFACT_DIR, "rendered/canonical-pages.txt"), "utf8");

check(committedPdf.subarray(0, 5).toString("latin1") === "%PDF-", "The committed artifact must be a real PDF.");
check(sha256(committedPdf) === report.artifact.sha256, "The committed PDF does not match its render report.");
check(report.artifact.contentType === "application/pdf", "The artifact must be recorded as application/pdf.");
check(report.artifact.byteSize === committedPdf.length, "The recorded byte size does not match the PDF.");
check(committedText === `${canonicalPacket.fullText}\n`, "The committed canonical text is stale.");
check(report.text.composedTextSha256 === canonicalPacket.fullTextSha256, "The composed-text hash is stale.");
check(report.specHash === specHash, "The render report specification hash is stale.");
check(report.totalPageCount === canonicalPacket.totalPageCount, "The recorded page count is stale.");
check(
  report.artifact.pageCount === canonicalPacket.totalPageCount,
  `The PDF page count (${report.artifact.pageCount}) must equal the composed page count (${canonicalPacket.totalPageCount}).`
);
check(
  JSON.stringify(report.documentManifest) === JSON.stringify(canonicalPacket.documentManifest),
  "The render report document manifest is stale."
);
check(
  report.pagedText.sha256 === sha256(Buffer.from(committedPages, "utf8")),
  "The page-ruled review rendition is stale against its recorded hash."
);

// Source identities must still be the ones two independent records agree on.
const corpusIndex = readJson(path.join(rootDir, "data/rcap-all50/local-source-corpus-index.json"));
const corpusText = JSON.stringify(corpusIndex);
for (const source of ND_CHAPTER_12_60_1_SEALING_SPEC.sources) {
  const inventory = [
    ...ndPack.northDakotaAll50BuildMetadata.officialFormInventory,
    ...ndPack.northDakotaAll50BuildMetadata.resourcePacketInventory
  ].find((entry) => entry.fileName === source.fileName);
  check(
    inventory && inventory.sha256 === source.sha256,
    `Source identity drift for ${source.fileName}: the ND build metadata no longer carries the pinned hash.`
  );
  if (source.corpusPath) {
    check(
      corpusText.includes(source.corpusPath) && corpusText.includes(source.sha256),
      `Source identity drift for ${source.sourceId}: the corpus index no longer agrees with the pinned hash.`
    );
  }
  check(
    source.heldInRepository === false,
    `${source.sourceId} is recorded as held, but the Master Library extract is not mounted; that would be an unproven claim.`
  );
}
check(
  ND_CHAPTER_12_60_1_SEALING_SPEC.provider.compiledProfileVersion
    === readJson(path.join(rootDir, "src/lib/rcap-engine/compiled/profiles/ND-north-dakota.json")).profileVersion,
  "Provider binding is stale: the compiled ND profile version moved."
);

// Reviews
for (const [file, kind] of [
  ["VISUAL_REVIEW.json", "visual"],
  ["OUTPUT_LEGAL_REVIEW.json", "output legal"]
]) {
  const reviewPath = path.join(DOCS_DIR, file);
  if (!fs.existsSync(reviewPath)) {
    checks += 1;
    failures.push(`Missing ${kind} review: docs/rcap/grade-a/north-dakota/${file}`);
    continue;
  }
  const review = readJson(reviewPath);
  check(
    review.artifactSha256 === report.artifact.sha256,
    `The ${kind} review was performed against different artifact bytes; it is stale.`
  );
  check(review.specHash === specHash, `The ${kind} review was performed against a different specification.`);
  check(
    review.commercialPosture === "candidate_evidence_only",
    `The ${kind} review must not assert a commercial posture.`
  );
  check(
    Array.isArray(review.openDefects) && review.openDefects.length === 0,
    `The ${kind} review records open defects: ${(review.openDefects ?? []).map((d) => d.id).join(", ")}.`
  );
}
const visualReview = fs.existsSync(path.join(DOCS_DIR, "VISUAL_REVIEW.json"))
  ? readJson(path.join(DOCS_DIR, "VISUAL_REVIEW.json"))
  : null;
if (visualReview) {
  check(
    Array.isArray(visualReview.pageByPage)
      && visualReview.pageByPage.length === canonicalPacket.totalPageCount,
    `The visual review must cover all ${canonicalPacket.totalPageCount} pages, covers ${visualReview.pageByPage?.length ?? 0}.`
  );
  check(
    visualReview.pageEvidenceSha256 === report.pagedText.sha256,
    "The visual review must be bound to the exact page rendition it reviewed."
  );
}

// Fulfillment patch request
const patch = readJson(path.join(ARTIFACT_DIR, "fulfillment-record-patch.json"));
check(patch.routeId === SELECTED, "The fulfillment patch request must target the selected route.");
check(
  patch.target === "data/rcap-grade-a/fulfillment-authority-registry.json" && patch.targetOwner === "captain",
  "The fulfillment patch request must name the captain-owned target rather than editing it."
);
check(
  patch.proposedProofFields.packetSpecification.sha256 === specHash,
  "The patch request's specification hash is stale."
);
check(
  patch.proposedProofFields.artifactValidation.artifactSha256 === report.artifact.sha256,
  "The patch request's artifact hash is stale."
);
check(
  patch.proposedProofFields.outputLegalApproval.state === "pending",
  "Lane D must not self-approve output-level legal review in the patch request."
);
check(
  patch.expectedStateAfterPatch === "INCOMPLETE",
  "The patch request must expect the route to stay INCOMPLETE."
);
check(
  patch.proofsThisLaneCannotSupply.some((proof) => proof.proof === "legal_authority" && proof.blocksCompletePacketProven),
  "The patch request must record legal authority as a blocking proof this lane cannot supply."
);

// ---------------------------------------------------------------------------
// 12. Commercial status stays closed
// ---------------------------------------------------------------------------

const registry = readJson(path.join(rootDir, "data/rcap-grade-a/fulfillment-authority-registry.json"));
const projection = readJson(path.join(rootDir, "data/rcap-grade-a/fulfillment-authority-projection.json"));
const registryRecord = registry.records.find((record) => record.routeId === SELECTED);
const projectedRoute = projection.routes.find((route) => route.routeId === SELECTED);
check(Boolean(registryRecord), "The captain registry must still carry the selected route's record.");
check(
  registryRecord && registryRecord.legalAuthority.status !== "approved_by_decision_owner",
  "Lane D must not have moved legal-authority status; that is the decision owner's."
);
check(
  projectedRoute && projectedRoute.state !== "COMPLETE_PACKET_PROVEN",
  "The selected route must not be COMPLETE_PACKET_PROVEN; Lane D opens nothing."
);
check(
  projectedRoute && projectedRoute.commercialStatus === "not_commercially_eligible",
  "The selected route must remain not_commercially_eligible."
);
check(
  projection.counters.completePacketProven === 0 && projection.counters.commerciallyEligible === 0,
  "No route may become commercially eligible through this lane."
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`North Dakota Grade-A packet verification FAILED (${failures.length} of ${checks} checks).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`North Dakota Grade-A packet verification PASSED (${checks} checks).`);
console.log(`  selected route:    ${SELECTED}`);
console.log(`  rejected route:    ${REJECTED} (non_filing_guidance, still)`);
console.log(`  spec:              ${ND_CHAPTER_12_60_1_SEALING_SPEC.specId}@${ND_CHAPTER_12_60_1_SEALING_SPEC.specVersion}`);
console.log(`  spec sha256:       ${specHash}`);
console.log(`  grounds:           ${ND_SEALING_GROUNDS.map((g) => g.groundId).join(", ")}`);
console.log(`  documents:         ${canonicalPacket.documents.length}`);
console.log(`  pages:             ${canonicalPacket.totalPageCount}`);
console.log(`  artifact sha256:   ${report.artifact.sha256}`);
console.log("  relief scope:      court and prosecution records only — agency-wide relief asserted absent");
console.log("  commercial status: closed (INCOMPLETE, not_commercially_eligible)");
