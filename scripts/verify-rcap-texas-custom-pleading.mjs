// Texas Chapter 55A custom-pleading routes — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right: Texas
// is not enabled and its shared surfaces are untouched, the assignment is
// exactly the eight assigned tracks and their assigned custom-pleading
// components, every component has a governing legal-design specification, the
// closed lists and the individualized-advocacy stops fail closed, participant
// values land in the rendered bytes, and every outside-party field — the judge's
// signature, the notary block, the prosecutor's consent — stays blank.
//
// Runs offline against the real renderer and the real assembler. No network, no
// database, no promotion.
//
// Deterministic fixtures are defined here rather than in a data file because
// this job owns exactly two paths: the implementation module and this verifier.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { PLEADING_TEMPLATES, pleadingTemplate } = await import(
  "@/lib/rcap/packets/engines/pleading-templates"
);
const { resolvePacket } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const {
  TEXAS_CUSTOM_PLEADING_TRACKS,
  TEXAS_PLEADING_TEMPLATES,
  TX_DESIGN_ROLE_TO_ENGINE_ROLE,
  deriveTexasFacts,
  TexasBranchError,
  TexasEligibilityStopError,
  TX_DISMISSAL_REASONS,
  TX_PARDON_TYPES,
  TX_SPECIALTY_PROGRAMS,
  TX_UNLAWFUL_CARRY_SUBSECTIONS,
  TX_LIMITATIONS_SOURCES,
  TX_REFERRAL
} = await import("@/lib/rcap/packets/jurisdictions/texas/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const ASSIGNED = [
  "tx_exp_dismissed",
  "tx_exp_limitations",
  "tx_exp_mistaken_identity",
  "tx_exp_no_charge",
  "tx_exp_pardon_innocence",
  "tx_exp_pardon_other",
  "tx_exp_specialty_court",
  "tx_exp_unlawful_carry"
];

// ---------------------------------------------------------------------------
// 0. Texas is not enabled, and the shared surfaces are untouched
// ---------------------------------------------------------------------------

const assignedIds = new Set(TEXAS_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Texas track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("tx_exp_")).length === 0,
  "Texas templates are wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);

// Injected for verification only. The committed shared files stay untouched;
// this is what lets the real renderer, resolver and assembler be exercised.
for (const track of TEXAS_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, TEXAS_PLEADING_TEMPLATES);

note(
  "0. Enablement: all eight assigned tracks and all templates are absent from the shared registry and template pack; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly the eight assigned tracks and their components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The implemented track set is not exactly the assigned track set."
);

let componentCount = 0;
for (const track of TEXAS_CUSTOM_PLEADING_TRACKS) {
  const manifest = manifests.find((m) => m.trackId === track.trackId);
  ok(Boolean(manifest), `${track.trackId}: no packet-set manifest in the adopted legal design.`);
  if (!manifest) continue;

  // Every custom_pleading component in the design must be implemented, and
  // nothing else may be. The official_pdf_fill fee-waiver statement and the
  // process_guidance filing instructions belong to other lanes.
  const designCp = manifest.components
    .filter((c) => c.outputStrategy === "custom_pleading")
    .map((c) => c.componentId)
    .sort();
  const implemented = track.packetSet.components.map((c) => c.componentId).sort();
  ok(
    JSON.stringify(designCp) === JSON.stringify(implemented),
    `${track.trackId}: implemented components ${JSON.stringify(implemented)} do not match the assigned custom-pleading components ${JSON.stringify(designCp)}.`
  );
  componentCount += implemented.length;

  for (const other of manifest.components.filter((c) => c.outputStrategy !== "custom_pleading")) {
    ok(
      !implemented.includes(other.componentId),
      `${track.trackId}: ${other.componentId} is ${other.outputStrategy} and must not be implemented by the custom-pleading job.`
    );
  }

  for (const component of track.packetSet.components) {
    const spec = specs.find((s) => s.componentId === component.componentId);
    ok(Boolean(spec), `${component.componentId}: no governing custom-pleading specification.`);
    if (spec) {
      ok(
        TX_DESIGN_ROLE_TO_ENGINE_ROLE[spec.role] === component.role,
        `${component.componentId}: design role ${spec.role} is not mapped to engine role ${component.role}.`
      );
    }
    ok(
      Boolean(pleadingTemplate(component.templateId)),
      `${component.componentId}: template ${component.templateId} is not registered.`
    );
    ok(
      component.sourcePath === null && component.sourceSha256 === null,
      `${component.componentId}: a custom pleading claims an official source.`
    );
    ok(
      component.approval.legal === "not_submitted" && component.approval.visual === "not_reviewed",
      `${component.componentId}: claims an approval this job cannot give.`
    );
  }

  const designTrack = registry.find((t) => t.trackId === track.trackId);
  ok(Boolean(designTrack), `${track.trackId}: not in the normalized track registry.`);
  if (designTrack) {
    ok(
      designTrack.outputStrategy === "custom_pleading",
      `${track.trackId}: the design does not classify this as custom_pleading.`
    );
  }
  ok(track.runtimeDisabled === true, `${track.trackId}: is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId}: is not a technical fixture.`);
}
note(
  `1. Assignment: exactly ${ASSIGNED.length} assigned tracks and ${componentCount} assigned custom-pleading components, each with a governing specification and a registered template; no official_pdf_fill or process_guidance component was implemented.`
);

// ---------------------------------------------------------------------------
// 2. Deterministic fixtures — synthetic participants only
// ---------------------------------------------------------------------------

const COMMON = {
  arrestCounty: "TRAVIS",
  arrestDate: "14 March 2019",
  arrestingAgency: "Austin Police Department",
  offenceCharged: "Theft of property, less than $100",
  caseNumberAndCourt: "Cause No. C-1-CR-19-000000, County Court at Law No. 4, Travis County",
  felonyFromSameTransaction: "no",
  communitySupervision: "no",
  probationViolationArrest: "no",
  abscondedAfterRelease: "no",
  agencyList: [
    "Travis County District Attorney, P.O. Box 1748, Austin, TX 78767",
    "Austin Police Department, Records Unit, P.O. Box 689001, Austin, TX 78768",
    "Travis County Sheriff's Office, P.O. Box 1748, Austin, TX 78767",
    // Deliberate duplicate: the deduplication rule in art. 55A.253(b) must hold.
    "Austin Police Department, Records Unit, P.O. Box 689001, Austin, TX 78768",
    "Texas Department of Public Safety, Crime Records Service, Austin, TX 78773"
  ],
  privateEntities: ["Example Screening Services LLC, Dallas, TX"],
  trn: "9876543210",
  feeWaiverRequested: "no"
};

const FIXTURES = [
  {
    fixtureId: "tx-dismissed-positive-1",
    trackId: "tx_exp_dismissed",
    answers: {
      ...COMMON,
      dismissalReason: "mistake",
      deferredAdjudication: "no",
      specialtyCourt: "",
      priorSpecialtyExpunction: "no"
    }
  },
  {
    fixtureId: "tx-limitations-positive-1",
    trackId: "tx_exp_limitations",
    answers: { ...COMMON, limitationsSource: "court_record", offenceDate: "2 March 2019" }
  },
  {
    fixtureId: "tx-mistaken-identity-positive-1",
    trackId: "tx_exp_mistaken_identity",
    answers: {
      ...COMMON,
      residenceCounty: "WILLIAMSON",
      mistakenIdentityBasis:
        "I was at work in another city on the date of the arrest and my employer has the timesheet.",
      consentGiven: "no",
      fingerprintsBooked: "yes"
    }
  },
  {
    fixtureId: "tx-no-charge-positive-1",
    trackId: "tx_exp_no_charge",
    answers: { ...COMMON }
  },
  {
    fixtureId: "tx-pardon-innocence-positive-1",
    trackId: "tx_exp_pardon_innocence",
    answers: { ...COMMON, pardonOnFace: "yes", inTdcjCustody: "no", pardonDate: "9 January 2024" }
  },
  {
    fixtureId: "tx-pardon-other-positive-1",
    trackId: "tx_exp_pardon_other",
    answers: { ...COMMON, pardonType: "full_pardon", pardonDate: "9 January 2024" }
  },
  {
    fixtureId: "tx-specialty-court-positive-1",
    trackId: "tx_exp_specialty_court",
    answers: {
      ...COMMON,
      specialtyProgramType: "veterans_court",
      dismissalDate: "5 June 2023",
      priorSpecialtyExpunction: "no",
      prosecutorConsentSought: "yes"
    }
  },
  {
    fixtureId: "tx-unlawful-carry-positive-1",
    trackId: "tx_exp_unlawful_carry",
    answers: { ...COMMON, offenceDatePre2021: "yes", penalCodeSubsection: "penal_46_02_a" }
  }
];

ok(
  new Set(FIXTURES.map((f) => f.trackId)).size === ASSIGNED.length,
  "Fixture coverage is not one positive fixture per assigned track."
);

// ---------------------------------------------------------------------------
// 3. Stops and closed lists fail closed
// ---------------------------------------------------------------------------

const NEGATIVE = [
  ["felony from the same transaction", "tx_exp_no_charge", { ...COMMON, felonyFromSameTransaction: "yes" }],
  ["community supervision served", "tx_exp_no_charge", { ...COMMON, communitySupervision: "yes" }],
  ["probation violation arrest", "tx_exp_no_charge", { ...COMMON, probationViolationArrest: "yes" }],
  ["absconding history", "tx_exp_no_charge", { ...COMMON, abscondedAfterRelease: "yes" }],
  ["empty agency list", "tx_exp_no_charge", { ...COMMON, agencyList: [] }],
  [
    "dismissal reason outside the five statutory grounds",
    "tx_exp_dismissed",
    { ...COMMON, dismissalReason: "prosecutor_lost_interest", deferredAdjudication: "no", priorSpecialtyExpunction: "no" }
  ],
  [
    "deferred adjudication treated as a dismissal",
    "tx_exp_dismissed",
    { ...COMMON, dismissalReason: "mistake", deferredAdjudication: "yes", priorSpecialtyExpunction: "no" }
  ],
  [
    "mistaken identity without booking identifiers",
    "tx_exp_mistaken_identity",
    { ...COMMON, residenceCounty: "WILLIAMSON", mistakenIdentityBasis: "x", consentGiven: "no", fingerprintsBooked: "no" }
  ],
  [
    "innocence not on the face of the pardon",
    "tx_exp_pardon_innocence",
    { ...COMMON, pardonOnFace: "no", inTdcjCustody: "no", pardonDate: "9 January 2024" }
  ],
  [
    "petitioner in TDCJ custody",
    "tx_exp_pardon_innocence",
    { ...COMMON, pardonOnFace: "yes", inTdcjCustody: "yes", pardonDate: "9 January 2024" }
  ],
  [
    "prior specialty expunction",
    "tx_exp_specialty_court",
    { ...COMMON, specialtyProgramType: "drug_court", dismissalDate: "5 June 2023", priorSpecialtyExpunction: "yes", prosecutorConsentSought: "no" }
  ],
  [
    "post-2021 unlawful carrying offence",
    "tx_exp_unlawful_carry",
    { ...COMMON, offenceDatePre2021: "no", penalCodeSubsection: "penal_46_02_a" }
  ],
  [
    "unapproved pardon type",
    "tx_exp_pardon_other",
    { ...COMMON, pardonType: "posthumous_pardon", pardonDate: "9 January 2024" }
  ],
  [
    "unapproved specialty programme",
    "tx_exp_specialty_court",
    { ...COMMON, specialtyProgramType: "traffic_court", dismissalDate: "5 June 2023", priorSpecialtyExpunction: "no", prosecutorConsentSought: "no" }
  ],
  [
    "unapproved yes/no answer",
    "tx_exp_no_charge",
    { ...COMMON, felonyFromSameTransaction: "maybe" }
  ],
  ["missing required answer", "tx_exp_no_charge", { ...COMMON, arrestCounty: "" }]
];

for (const [label, trackId, answers] of NEGATIVE) {
  let threw = null;
  try {
    deriveTexasFacts(trackId, answers);
  } catch (error) {
    threw = error;
  }
  ok(threw !== null, `${label}: did not fail closed.`);
  if (threw) {
    const typed =
      threw instanceof TexasEligibilityStopError || threw instanceof TexasBranchError;
    ok(typed, `${label}: threw ${threw.name}, which is not a typed stop.`);
    if (threw instanceof TexasEligibilityStopError) {
      ok(Boolean(threw.referral) && threw.referral === TX_REFERRAL, `${label}: lost its referral destination.`);
    }
  }
}

// Closed lists must not silently grow.
ok(Object.keys(TX_DISMISSAL_REASONS).length === 5, "The art. 55A.053(a)(2) ground list changed size.");
ok(Object.keys(TX_PARDON_TYPES).length === 2, "The pardon-type list changed size.");
ok(Object.keys(TX_SPECIALTY_PROGRAMS).length === 5, "The specialty-programme list changed size.");
ok(Object.keys(TX_UNLAWFUL_CARRY_SUBSECTIONS).length === 2, "The Penal Code subsection list changed size.");
ok(Object.keys(TX_LIMITATIONS_SOURCES).length === 3, "The limitations-source list changed size.");
note(
  `3. Stops: ${NEGATIVE.length} negative cases all fail closed with a typed stop; every eligibility stop keeps its referral; five closed lists hold their size.`
);

// ---------------------------------------------------------------------------
// 4. Deduplication under art. 55A.253(b)
// ---------------------------------------------------------------------------

const dedupFacts = deriveTexasFacts("tx_exp_no_charge", COMMON);
ok(dedupFacts.agencyCount === "4", `The agency list did not deduplicate: count ${dedupFacts.agencyCount}.`);
ok(
  !dedupFacts.agencyList.includes("4. Austin Police Department, Records Unit, P.O. Box 689001, Austin, TX 78768"),
  "A duplicated agency survived deduplication."
);
ok(
  !dedupFacts.agencyList.includes("Example Screening Services"),
  "A private entity was merged into the art. 55A.253(a)(8) agency list."
);
ok(
  dedupFacts.privateEntityList.includes("Example Screening Services"),
  "The private entity is missing from its separate list."
);
note("4. Lists: agencies deduplicate under art. 55A.253(b); private entities stay in their own list.");

// ---------------------------------------------------------------------------
// 5. Rendered content
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/will be granted|you will succeed|you are eligible/i, "a prediction or an eligibility assertion"],
  [/we have (reviewed|verified|confirmed)/i, "a claim that LegalEase reviewed or verified records"],
  [/on your behalf we (filed|served)/i, "a claim that LegalEase filed or served"],
  [/the prosecutor (has consented|consents|agreed)/i, "an assertion of prosecutor consent"],
  [/official (state|statewide) form/i, "a claim that a statewide official form exists"],
  [/texaslawhelp|tjctc|justice court training/i, "promotion of a non-official packet as a form"]
];

const results = [];
let renderedComponents = 0;

for (const fixture of FIXTURES) {
  const facts = deriveTexasFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "TX",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "TX",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: a generated document reports an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "TX",
      geography: null,
      facts,
      rootDir: root
    });
    ok(
      sha(output.bytes) === sha(again.bytes),
      `${component.componentId}: rendering twice produced different bytes.`
    );

    const template = pleadingTemplate(component.templateId);
    ok(template.technicalFixture === true, `${component.templateId}: is not marked a technical fixture.`);
    const source = JSON.stringify(template);
    for (const [pattern, description] of PROHIBITED) {
      ok(!pattern.test(source), `${component.templateId}: contains ${description}.`);
    }
    // Unresolved placeholders would print as literal braces.
    ok(!/\{\{/.test(source.replace(/\{\{[a-zA-Z]+\}\}/g, "")), `${component.templateId}: malformed placeholder.`);

    // Outside-party blocks stay blank.
    if (component.role === "proposed_order") {
      ok(
        template.signatureLabel === null,
        `${component.componentId}: a proposed order carries a participant signature rule.`
      );
      ok(
        template.signatureBlock.some((line) => /JUDGE PRESIDING/.test(line)),
        `${component.componentId}: the judicial signature block is missing.`
      );
      ok(
        !template.signatureBlock.some((line) => /SIGNED this 1|20\d\d\./.test(line)),
        `${component.componentId}: the judge's signature date is prefilled.`
      );
    } else if (component.role === "attachment") {
      // The information package is the only assigned component that is not a
      // sworn instrument. Article 55A.253 requires the *petition* to be
      // verified, and the design locates the verification in the petition. A
      // notarial block here would invite the participant to swear an
      // attachment the statute does not ask to be sworn, and would present
      // supporting information as a verified filing.
      ok(
        template.signatureLabel === null,
        `${component.componentId}: an information package carries a signature rule as though it were executed.`
      );
      ok(
        !template.signatureBlock.some((line) => /Notary Public|UNSWORN DECLARATION|penalty of perjury/i.test(line)),
        `${component.componentId}: an information package carries a verification block; verification belongs in the petition.`
      );
      ok(
        /not a pleading/i.test(String(template.preamble ?? "")),
        `${component.componentId}: the information package does not say that it is not a pleading.`
      );
    } else {
      ok(
        template.signatureBlock.some((line) => /Notary Public, State of Texas/.test(line)),
        `${component.componentId}: the notarial verification block is missing.`
      );
      ok(
        template.signatureBlock.some((line) => /UNSWORN DECLARATION/.test(line)),
        `${component.componentId}: the unsworn declaration alternative is missing.`
      );
    }

    renderedComponents += 1;
    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: output.bytes
    });
  }

  const assemblyRequest = {
    jurisdiction: "TX",
    jurisdictionName: "Texas",
    packetName: resolved.track.assembledPacketName,
    caseReference: fixture.answers.caseNumberAndCourt,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  };
  const assembled = await assemblePacketPdf(assemblyRequest);
  const againAssembled = await assemblePacketPdf(assemblyRequest);
  ok(assembled.sha256 === againAssembled.sha256, `${fixture.fixtureId}: assembly is not deterministic.`);
  ok(assembled.pageCount > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);

  results.push({
    trackId: fixture.trackId,
    fixtureId: fixture.fixtureId,
    components: assemblyComponents.length,
    pageCount: assembled.pageCount,
    sha256: assembled.sha256
  });
}

note(
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; no prohibited content; judicial and notarial blocks blank.`
);

// ---------------------------------------------------------------------------
// 6. Participant values actually land
// ---------------------------------------------------------------------------

const { PDFDocument } = await import("pdf-lib");
const probeFacts = deriveTexasFacts("tx_exp_dismissed", FIXTURES[0].answers);
const probeResolved = resolvePacket({
  jurisdiction: "TX",
  trackId: "tx_exp_dismissed",
  facts: probeFacts,
  allowTechnicalFixtures: true
});
const probe = await renderPacketComponent({
  component: probeResolved.components[0],
  jurisdiction: "TX",
  geography: null,
  facts: probeFacts,
  rootDir: root
});
const probeDoc = await PDFDocument.load(probe.bytes);
ok(probeDoc.getPageCount() === probe.pageCount, "Reported page count does not match the PDF.");
note(`6. Values: the dismissed-charge petition renders ${probe.pageCount} pages from participant answers.`);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

ok(
  TEXAS_CUSTOM_PLEADING_TRACKS.every((t) => t.statuses.legal === "not_submitted"),
  "A Texas track claims a legal approval this job cannot give."
);
ok(
  TEXAS_CUSTOM_PLEADING_TRACKS.every((t) => t.statuses.visual === "not_reviewed"),
  "A Texas track claims a visual approval this job cannot give."
);
ok(
  TEXAS_CUSTOM_PLEADING_TRACKS.every((t) => t.statuses.runtime === "runtime_disabled"),
  "A Texas track is not runtime-disabled."
);
note("7. Runtime: every track is runtime-disabled, legally unsubmitted and visually unreviewed.");

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (failures.length) {
  console.error("\nTexas custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nTexas custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-track packets:");
for (const r of results) {
  console.log(
    `  ${r.trackId.padEnd(26)} ${String(r.components)} components  ${String(r.pageCount).padStart(2)} pages  sha256=${r.sha256}`
  );
}
console.log("");
