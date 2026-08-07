// Nevada NRS 179.245, 179.255, 179.259, 179.271, 179.273 and 179.2595 sealing
// routes — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right: Nevada
// is not enabled and its shared surfaces are untouched, the assignment is
// exactly the six assigned tracks and their twenty-four assigned custom-pleading
// components, every component has a governing legal-design specification, the
// design's boundaries hold on the face of every document — the prosecutor comes
// first and is never spoken for, the repository record is required, no period is
// computed, no amount is printed, sealing is never called expungement and never
// said to restore firearm rights — the typed stops fail closed, participant
// values land in the rendered bytes, every page is read rather than counted, and
// every outside-party execution block is blank and confined to the two roles
// that are allowed one.
//
// Runs offline against the real renderer, resolver and assembler. No network,
// no database, no promotion.
//
// Deterministic fixtures are defined here rather than in a data file because
// this job owns exactly two paths: the implementation module and this verifier.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";

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
  NEVADA_CUSTOM_PLEADING_TRACKS,
  NEVADA_PLEADING_TEMPLATES,
  NV_DESIGN_ROLE_TO_ENGINE_ROLE,
  NV_ASSIGNED_TRACK_IDS,
  NV_OFFENCE_CATEGORIES,
  NV_NONCONVICTION_DISPOSITIONS,
  NV_PARDON_TYPES,
  NV_COURT_LEVELS,
  NV_YES_NO,
  NV_REFERRAL,
  NV_ROUTING_REFERRAL,
  NV_REPOSITORY_REFERRAL,
  deriveNevadaFacts,
  NevadaBranchError,
  NevadaEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/nevada/custom-pleading");

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
  "nv_seal_conviction",
  "nv_seal_decrim",
  "nv_seal_multi",
  "nv_seal_nonconviction",
  "nv_seal_pardon",
  "nv_seal_reentry"
];

/** The two roles that may carry an outside party's execution block. */
const OUTSIDE_PARTY_ROLES = new Set(["proposed_order", "notice"]);

// ---------------------------------------------------------------------------
// 0. Nevada is not enabled, and the shared surfaces are untouched
// ---------------------------------------------------------------------------

const assignedIds = new Set(NEVADA_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Nevada track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("nv_")).length === 0,
  "Nevada templates are wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);

// Injected for verification only. The committed shared files stay untouched;
// this is what lets the real renderer, resolver and assembler be exercised.
for (const track of NEVADA_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, NEVADA_PLEADING_TEMPLATES);

note(
  "0. Enablement: all six assigned tracks and all twenty-four templates are absent from the shared registry and template pack; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly the six assigned tracks and their components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The implemented track set is not exactly the assigned track set."
);
ok(
  JSON.stringify([...NV_ASSIGNED_TRACK_IDS].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The module's closed track list is not exactly the assigned track set."
);

let componentCount = 0;
for (const track of NEVADA_CUSTOM_PLEADING_TRACKS) {
  const manifest = manifests.find((m) => m.trackId === track.trackId);
  ok(Boolean(manifest), `${track.trackId}: no packet-set manifest in the adopted legal design.`);
  if (!manifest) continue;

  // Every custom_pleading component in the design must be implemented, and
  // nothing else may be. Nevada's process_guidance components — the repository
  // record instructions and the prosecutor-submission instructions — belong to
  // the guidance lane and are not this job's to build.
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
    const designComponent = manifest.components.find((c) => c.componentId === component.componentId);
    ok(
      designComponent && designComponent.order === component.order,
      `${component.componentId}: packet order ${component.order} is not the order the design assigns.`
    );
    ok(
      designComponent && designComponent.requirement === component.requirement,
      `${component.componentId}: requirement does not match the design.`
    );

    const spec = specs.find((s) => s.componentId === component.componentId);
    ok(Boolean(spec), `${component.componentId}: no governing custom-pleading specification.`);
    if (spec) {
      ok(
        NV_DESIGN_ROLE_TO_ENGINE_ROLE[spec.role] === component.role,
        `${component.componentId}: design role ${spec.role} is not mapped to engine role ${component.role}.`
      );
      for (const requirement of spec.generationRequirements) {
        ok(
          track.requiredInputs.some((input) => input.key === requirement.key),
          `${track.trackId}: the design asks for ${requirement.key} and the track declares no such input.`
        );
      }
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

  const designKeys = new Set(
    specs
      .filter((s) => s.trackId === track.trackId)
      .flatMap((s) => s.generationRequirements.map((r) => r.key))
  );
  for (const input of track.requiredInputs) {
    ok(
      designKeys.has(input.key),
      `${track.trackId}: declares input ${input.key}, which the design does not ask for.`
    );
  }

  const designTrack = registry.find((t) => t.trackId === track.trackId);
  ok(Boolean(designTrack), `${track.trackId}: not in the normalized track registry.`);
  if (designTrack) {
    ok(
      designTrack.outputStrategy === "custom_pleading",
      `${track.trackId}: the design does not classify this as custom_pleading.`
    );
    ok(
      designTrack.geographicScope === track.geographicScope,
      `${track.trackId}: geographic scope does not match the design.`
    );
    ok(
      JSON.stringify(designTrack.dispositions) === JSON.stringify(track.dispositions),
      `${track.trackId}: dispositions do not match the design.`
    );
    ok(
      JSON.stringify(designTrack.recordTypes) === JSON.stringify(track.recordTypes),
      `${track.trackId}: record types do not match the design.`
    );
  }
  ok(track.runtimeDisabled === true, `${track.trackId}: is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId}: is not a technical fixture.`);
}
note(
  `1. Assignment: exactly ${ASSIGNED.length} assigned tracks and ${componentCount} assigned custom-pleading components, each pinned to the design's component id, order, role and declared inputs; no process_guidance component was implemented.`
);

// ---------------------------------------------------------------------------
// 2. The design's boundaries, on the face of the templates
// ---------------------------------------------------------------------------

/** A computed or asserted waiting period. */
const STATED_PERIOD = /\b(one|two|five|seven|ten|\d+)[- ]year (period|wait|waiting)/i;

for (const track of NEVADA_CUSTOM_PLEADING_TRACKS) {
  for (const component of track.packetSet.components) {
    const template = pleadingTemplate(component.templateId);
    const source = JSON.stringify(template);
    ok(
      !STATED_PERIOD.test(source),
      `${component.componentId}: states a waiting period. Nevada eligibility turns on the offence category and on whether the offence is a crime of violence, and neither is drawn here.`
    );
    ok(
      !/\$\s?\d/.test(source),
      `${component.componentId}: prints a monetary amount. Nevada fees are county-dependent and were not established.`
    );
    // Nevada does not expunge. The one place the word may appear is the
    // sentence saying so.
    const expungementMentions = (source.match(/expunge/gi) ?? []).length;
    const disclaimed = /sealing is not expungement/.test(source);
    ok(
      expungementMentions === 0 || (disclaimed && expungementMentions <= 2),
      `${component.componentId}: uses the word expungement for what Nevada does, outside the sentence that denies it.`
    );
  }

  // Every filing and every declaration must carry the repository requirement,
  // the prosecutor-first workflow and the effect disclosures.
  const filing = track.packetSet.components.find((c) => c.role === "primary_filing");
  const filingSource = JSON.stringify(pleadingTemplate(filing.templateId));
  ok(
    /Nevada Central Repository/.test(filingSource) && /179\.245\(2\)\(a\)/.test(filingSource),
    `${track.trackId}: the filing does not state the statutory repository-record attachment.`
  );
  ok(
    /LegalEase does not hold it, has not seen it/.test(filingSource),
    `${track.trackId}: the filing does not disclaim holding the repository record.`
  );
  ok(
    /files with the clerk of the court only once the prosecuting agency stipulates/.test(filingSource),
    `${track.trackId}: the filing does not put the prosecuting agency before the clerk.`
  );
  ok(
    /LegalEase has not asked the prosecuting agency for anything, holds nothing from it, and states nothing about what it will do/.test(
      filingSource
    ),
    `${track.trackId}: the filing does not disclaim speaking for the prosecuting agency.`
  );
  ok(
    /sealing is not expungement/.test(filingSource),
    `${track.trackId}: the filing does not record that Nevada sealing is not expungement.`
  );
  ok(
    /179\.295/.test(filingSource) && /179\.301/.test(filingSource),
    `${track.trackId}: the filing does not record that a sealed record may be reopened or inspected.`
  );
  ok(
    /does not restore the right to bear arms/.test(filingSource),
    `${track.trackId}: the filing does not record that sealing does not restore firearm rights.`
  );
  ok(
    /179\.245\(9\)/.test(filingSource),
    `${track.trackId}: the filing does not surface the NRS 179.245(9) fee waiver where fees are mentioned.`
  );
  ok(
    /WHERE THIS PACKET STOPS/.test(filingSource) && filingSource.includes(NV_REFERRAL),
    `${track.trackId}: the filing carries no self-help stop section with a referral.`
  );

  // Every declaration must tell the participant to sign by hand.
  const declaration = track.packetSet.components.find((c) => c.role === "affidavit");
  const declarationSource = JSON.stringify(pleadingTemplate(declaration.templateId));
  ok(
    /Sign it by hand, in ink/.test(declarationSource) &&
      /typed signature is treated by the Las Vegas Municipal Court as cause for immediate denial/.test(
        declarationSource
      ),
    `${track.trackId}: the declaration does not require a handwritten signature or record why.`
  );
  ok(
    /penalty of perjury/.test(declarationSource),
    `${track.trackId}: the declaration carries no verification.`
  );

  // Every stipulation must be unexecuted and say so.
  const stipulation = track.packetSet.components.find((c) => c.role === "notice");
  const stipulationSource = JSON.stringify(pleadingTemplate(stipulation.templateId));
  ok(
    /UNEXECUTED — NO AGREEMENT HAS BEEN SOUGHT OR GIVEN/.test(stipulationSource),
    `${track.trackId}: the stipulation does not mark itself unexecuted.`
  );
  ok(
    /LegalEase has not contacted the prosecuting agency/.test(stipulationSource),
    `${track.trackId}: the stipulation does not disclaim contacting the prosecuting agency.`
  );
  ok(
    /Nothing above is marked/.test(stipulationSource),
    `${track.trackId}: the stipulation does not say that its election boxes are unmarked.`
  );
  ok(
    /The petitioner does not complete any part of this document/.test(stipulationSource),
    `${track.trackId}: the stipulation does not tell the participant to leave it alone.`
  );

  // Every proposed order must be marked proposed and carry the repository
  // transmission the statute requires.
  const order = track.packetSet.components.find((c) => c.role === "proposed_order");
  const orderSource = JSON.stringify(pleadingTemplate(order.templateId));
  ok(
    /PROPOSED — NOT YET MADE/.test(orderSource),
    `${track.trackId}: the proposed order does not mark itself as proposed and not yet made.`
  );
  ok(
    /179\.275/.test(orderSource),
    `${track.trackId}: the proposed order does not direct transmission to the Central Repository under NRS 179.275.`
  );
  ok(
    /They are blank because LegalEase has obtained nothing from that agency/.test(orderSource),
    `${track.trackId}: the proposed order does not explain why the prosecuting agency's lines are blank.`
  );
  ok(
    /Leave the judge's signature, the date and the prosecuting agency's lines blank/.test(orderSource),
    `${track.trackId}: the proposed order does not tell the participant to leave the outside-party lines blank.`
  );
}
note(
  `2. Design boundaries: on all ${ASSIGNED.length} routes the filing carries the repository requirement, the prosecutor-first workflow with its disclaimer, the sealing-is-not-expungement, reopening, inspection and firearm-rights disclosures, and the NRS 179.245(9) fee waiver; every declaration requires a handwritten signature; every stipulation is unexecuted and says so; every proposed order is marked proposed and directs NRS 179.275 transmission. No document states a period or prints an amount.`
);

// Route-specific boundaries.
const convictionFiling = JSON.stringify(pleadingTemplate("nv_seal_conviction-petition"));
ok(
  /does not say which paragraph applies, does not compute a period/.test(convictionFiling),
  "nv_seal_conviction: the petition does not refuse to compute a period."
);
ok(
  /179\.2445/.test(convictionFiling) && /it does not assert that the petitioner satisfies the requirements/.test(convictionFiling),
  "nv_seal_conviction: the petition does not describe the NRS 179.2445 presumption without claiming it."
);
const nonconvictionFiling = JSON.stringify(pleadingTemplate("nv_seal_nonconviction-petition"));
ok(
  /do not govern this section/.test(nonconvictionFiling) &&
    /this petition does not import that list/.test(nonconvictionFiling),
  "nv_seal_nonconviction: the petition does not keep the NRS 179.245(6) conviction exclusions out."
);
ok(
  /179\.255\(9\)/.test(nonconvictionFiling),
  "nv_seal_nonconviction: the petition does not carry the NRS 179.255(9) declination warning."
);
const multiOrder = JSON.stringify(pleadingTemplate("nv_seal_multi-order"));
ok(
  /For the district attorney/.test(multiOrder) && /For the city attorney/.test(multiOrder),
  "nv_seal_multi: the proposed order does not carry a separate approval line for each prosecuting agency."
);
const pardonFiling = JSON.stringify(pleadingTemplate("nv_seal_pardon-petition"));
ok(
  /does not state how the automatic sealing is triggered/.test(pardonFiling),
  "nv_seal_pardon: the petition does not refuse to state what NRS 179.273 requires."
);
const decrimFiling = JSON.stringify(pleadingTemplate("nv_seal_decrim-request"));
ok(
  /Whether that conduct has in fact been decriminalised is a legal conclusion and this request does not draw it/.test(
    decrimFiling
  ),
  "nv_seal_decrim: the request draws, or fails to refuse, the decriminalization conclusion."
);
ok(
  /WRITTEN REQUEST/.test(pleadingTemplate("nv_seal_decrim-request").title),
  "nv_seal_decrim: the instrument is titled as a petition, and the design records it as a written request."
);
const reentryFiling = JSON.stringify(pleadingTemplate("nv_seal_reentry-petition"));
ok(
  /The text of NRS 179\.259 was not retrievable/.test(reentryFiling),
  "nv_seal_reentry: the petition does not record that the section's text was not read."
);
note(
  "2b. Route-specific boundaries: the conviction petition computes no period and claims no presumption; the non-conviction petition keeps the NRS 179.245(6) exclusions out and carries the NRS 179.255(9) declination warning; the consolidated order carries an approval line for each prosecuting agency; and the three routes whose section text was not retrievable each say so rather than paraphrasing."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical positive per assigned track, plus
//    regression variants where a branch changes the document
// ---------------------------------------------------------------------------

const common = (prefix) => ({
  [`${prefix}FullLegalName`]: "Marisol Reyes Delgado, formerly Marisol Reyes",
  [`${prefix}DateOfBirth`]: "2 August 1988",
  [`${prefix}County`]: "Clark County, district court",
  [`${prefix}CaseNumber`]: "C-14-298877-1",
  [`${prefix}OffenceDetails`]:
    "Possession of a controlled substance, NRS 453.336, on 11 May 2014",
  [`${prefix}AllNevadaRecords`]: [
    "A 2011 Las Vegas Justice Court misdemeanour, dismissed",
    "No other Nevada matter in any county"
  ],
  [`${prefix}Trafficking`]: "no"
});

const FIXTURES = [
  {
    fixtureId: "nv-conviction-positive-1",
    trackId: "nv_seal_conviction",
    answers: {
      ...common("cvs"),
      cvsPendingCharges: "no",
      cvsOffenceCategory: "category_e_felony",
      cvsReleaseDate:
        "Released from custody on 3 March 2016 and discharged from probation on 3 March 2018",
      cvsSuspendedSentence: "",
      cvsDuiDetails: "",
      cvsOutstandingFees: "no",
      cvsDishonourableDischarge: "no",
      cvsPriorDenial: "I have never asked a Nevada court to seal any record"
    }
  },
  {
    fixtureId: "nv-conviction-outstanding-fees-2",
    trackId: "nv_seal_conviction",
    variantOf: "nv-conviction-positive-1",
    // An unpaid balance is not a statutory bar and is widely reported to stall
    // a petition, so the document says something different in each case.
    answers: {
      ...common("cvs"),
      cvsPendingCharges: "no",
      cvsOffenceCategory: "gross_misdemeanour",
      cvsReleaseDate:
        "Released from custody on 3 March 2016 and discharged from probation on 3 March 2018",
      cvsSuspendedSentence: "A suspended sentence ended on 3 March 2017",
      cvsDuiDetails: "",
      cvsOutstandingFees: "yes",
      cvsDishonourableDischarge: "no",
      cvsPriorDenial: "A petition in 2019 was denied in Clark County"
    }
  },
  {
    fixtureId: "nv-nonconviction-dismissed-positive-1",
    trackId: "nv_seal_nonconviction",
    answers: {
      ...common("ncv"),
      ncvDisposition: "dismissed",
      ncvArrestDate: "11 May 2014",
      ncvDeferredJudgment: "no",
      ncvFurtherAction: "no"
    }
  },
  {
    fixtureId: "nv-nonconviction-declined-2",
    trackId: "nv_seal_nonconviction",
    variantOf: "nv-nonconviction-dismissed-positive-1",
    // The declination route carries the NRS 179.255(9) warning in terms and a
    // different timing rule, so the document is materially different.
    answers: {
      ...common("ncv"),
      ncvDisposition: "declined",
      ncvArrestDate: "11 May 2014",
      ncvDeferredJudgment: "no",
      ncvFurtherAction: "no"
    }
  },
  {
    fixtureId: "nv-nonconviction-acquitted-3",
    trackId: "nv_seal_nonconviction",
    variantOf: "nv-nonconviction-dismissed-positive-1",
    // An acquittal carries mandatory relief on the statutory findings, which
    // the petition states and the other two dispositions do not.
    answers: {
      ...common("ncv"),
      ncvDisposition: "acquitted",
      ncvArrestDate: "11 May 2014",
      ncvDeferredJudgment: "no",
      ncvFurtherAction: "no"
    }
  },
  {
    fixtureId: "nv-multi-district-only-positive-1",
    trackId: "nv_seal_multi",
    answers: {
      ...common("sea"),
      mltCourtLevels: ["district"],
      mltTownship: ""
    }
  },
  {
    fixtureId: "nv-multi-district-and-justice-2",
    trackId: "nv_seal_multi",
    variantOf: "nv-multi-district-only-positive-1",
    // A justice court matter has to be captioned to its township, so the
    // township reaches the document only on this branch.
    answers: {
      ...common("sea"),
      mltCourtLevels: ["district", "justice"],
      mltTownship: "Las Vegas Township"
    }
  },
  {
    fixtureId: "nv-pardon-positive-1",
    trackId: "nv_seal_pardon",
    answers: {
      ...common("sea"),
      pdnPardonType: "unconditional",
      pdnPardonDate: "9 December 2023",
      pdnStillShowing: "yes",
      pdnFirearms: "The pardon says nothing about firearms"
    }
  },
  {
    fixtureId: "nv-decrim-positive-1",
    trackId: "nv_seal_decrim",
    answers: {
      ...common("sea"),
      dcrConduct:
        "I was accused of possessing a small amount of cannabis for my own use. I believe that is no longer a crime in Nevada.",
      dcrOffenceDate: "The conduct was on 11 May 2014 and the record was entered on 2 July 2014"
    }
  },
  {
    fixtureId: "nv-reentry-positive-1",
    trackId: "nv_seal_reentry",
    answers: {
      ...common("sea"),
      rntProgram: "The Clark County reentry court programme, finished on 18 April 2023",
      rntCompletionProof: "yes"
    }
  }
];

const fixtureFor = (trackId) => FIXTURES.find((f) => f.trackId === trackId && !f.variantOf).answers;

// ---------------------------------------------------------------------------
// 4. Typed stops and closed lists
// ---------------------------------------------------------------------------

const NEGATIVE = [
  [
    "a charge is pending now",
    "nv_seal_conviction",
    { ...fixtureFor("nv_seal_conviction"), cvsPendingCharges: "yes" },
    "nv-pending-charge"
  ],
  [
    "dishonourably discharged from probation",
    "nv_seal_conviction",
    { ...fixtureFor("nv_seal_conviction"), cvsDishonourableDischarge: "yes" },
    "nv-dishonourable-discharge-removes-the-presumption"
  ],
  [
    "a DUI, where the NRS 179.245(7) carve-back has to be applied",
    "nv_seal_conviction",
    {
      ...fixtureFor("nv_seal_conviction"),
      cvsDuiDetails: "Punished under NRS 484C.400(1)(c); I was in the NRS 484C.392 programme"
    },
    "nv-dui-carve-back-needs-counsel"
  ],
  [
    "a deferred judgment dismissal, which is a different section",
    "nv_seal_nonconviction",
    { ...fixtureFor("nv_seal_nonconviction"), ncvDeferredJudgment: "yes" },
    "nv-deferred-judgment-routes-to-176-211"
  ],
  [
    "the case might be refiled",
    "nv_seal_nonconviction",
    { ...fixtureFor("nv_seal_nonconviction"), ncvFurtherAction: "yes" },
    "nv-further-action-may-be-brought"
  ],
  [
    "municipal court matters mixed with district court matters",
    "nv_seal_multi",
    { ...fixtureFor("nv_seal_multi"), mltCourtLevels: ["district", "municipal"] },
    "nv-municipal-and-non-municipal-in-one-packet"
  ],
  [
    "a justice court matter with no township",
    "nv_seal_multi",
    { ...fixtureFor("nv_seal_multi"), mltCourtLevels: ["justice"], mltTownship: "" },
    "nv-justice-court-township-not-given"
  ],
  [
    "a conditional pardon",
    "nv_seal_pardon",
    { ...fixtureFor("nv_seal_pardon"), pdnPardonType: "conditional" },
    "nv-conditional-pardon-outside-179-273"
  ],
  [
    "the automatic sealing has not been checked",
    "nv_seal_pardon",
    { ...fixtureFor("nv_seal_pardon"), pdnStillShowing: "no" },
    "nv-pardon-sealing-not-yet-verified"
  ],
  [
    "no document evidencing completion of the reentry programme",
    "nv_seal_reentry",
    { ...fixtureFor("nv_seal_reentry"), rntCompletionProof: "no" },
    "nv-reentry-completion-not-evidenced"
  ]
];

let stopped = 0;
for (const [label, trackId, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveNevadaFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof NevadaEligibilityStopError,
    `${trackId}: ${label} did not fail closed with a typed stop.`
  );
  if (caught instanceof NevadaEligibilityStopError) {
    ok(
      caught.stopId === expectedStopId,
      `${trackId}: ${label} raised ${caught.stopId} rather than ${expectedStopId}.`
    );
    ok(caught.referral.length > 20, `${trackId}: ${label} lost its referral.`);
    ok(caught.reason.length > 40, `${trackId}: ${label} gives no reason a participant could act on.`);
    stopped += 1;
  }
}

// The DUI stop is a referral, not a rejection: it must say so, because the
// design's warning is that a blanket exclusion turns away eligible people.
let duiStop = null;
try {
  deriveNevadaFacts("nv_seal_conviction", {
    ...fixtureFor("nv_seal_conviction"),
    cvsDuiDetails: "Punished under NRS 484C.400(1)(b)"
  });
} catch (error) {
  duiStop = error;
}
ok(
  /referral and not a refusal/.test(duiStop?.reason ?? ""),
  "The DUI stop reads as a rejection rather than as the referral the design requires."
);

// The deferred-judgment stop routes to another mechanism, not to a lawyer.
let deferredStop = null;
try {
  deriveNevadaFacts("nv_seal_nonconviction", {
    ...fixtureFor("nv_seal_nonconviction"),
    ncvDeferredJudgment: "yes"
  });
} catch (error) {
  deferredStop = error;
}
ok(
  deferredStop?.referral === NV_ROUTING_REFERRAL,
  "The deferred-judgment stop does not route to the mechanism that fits."
);

// The pardon verification stop sends the participant to the repository.
let pardonStop = null;
try {
  deriveNevadaFacts("nv_seal_pardon", {
    ...fixtureFor("nv_seal_pardon"),
    pdnStillShowing: "no"
  });
} catch (error) {
  pardonStop = error;
}
ok(
  pardonStop?.referral === NV_REPOSITORY_REFERRAL,
  "The pardon verification stop does not send the participant to the Central Repository."
);

// Closed lists reject anything outside them.
const BRANCH_CASES = [
  ["nv_seal_conviction", "cvsOffenceCategory", "a bad one"],
  ["nv_seal_conviction", "cvsPendingCharges", "not sure"],
  ["nv_seal_nonconviction", "ncvDisposition", "it went away"],
  ["nv_seal_multi", "mltCourtLevels", ["family"]],
  ["nv_seal_pardon", "pdnPardonType", "partial"],
  ["nv_seal_reentry", "rntCompletionProof", "probably"]
];
let branchRejected = 0;
for (const [trackId, key, value] of BRANCH_CASES) {
  let caught = null;
  try {
    deriveNevadaFacts(trackId, { ...fixtureFor(trackId), [key]: value });
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof NevadaBranchError,
    `${trackId}: ${JSON.stringify(value)} for ${key} was not rejected as outside the approved list.`
  );
  if (caught instanceof NevadaBranchError) branchRejected += 1;
}

let unassigned = null;
try {
  deriveNevadaFacts("nv_something_else", {});
} catch (error) {
  unassigned = error;
}
ok(
  unassigned instanceof NevadaBranchError,
  "An unassigned Nevada track identifier was accepted by the fact derivation."
);

ok(Object.keys(NV_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(
  Object.keys(NV_OFFENCE_CATEGORIES).length === 7,
  "The offence-category list is not the seven classes Nevada eligibility turns on."
);
ok(
  Object.keys(NV_NONCONVICTION_DISPOSITIONS).length === 3,
  "The NRS 179.255(1) disposition list changed size."
);
ok(Object.keys(NV_PARDON_TYPES).length === 2, "The pardon-type list changed size.");
ok(Object.keys(NV_COURT_LEVELS).length === 3, "The Nevada court-level list changed size.");
ok(NV_REFERRAL.length > 20, "The default referral destination is empty.");

note(
  `4. Stops: ${stopped} negative cases fail closed with the expected typed stop and a referral; the DUI stop reads as a referral rather than a refusal; the deferred-judgment stop routes to NRS 176.211 and the pardon stop to the repository rather than either sending the participant to a lawyer for a question a lawyer is not needed for; ${branchRejected} out-of-list branch values rejected; an unassigned track identifier is refused; five closed lists hold their size.`
);

// ---------------------------------------------------------------------------
// 5. Rendered content, read page by page
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/will be granted|you are eligible|you will succeed|is entitled to relief/i, "a prediction or an eligibility assertion"],
  [/we have (reviewed|verified|confirmed)/i, "a claim that LegalEase reviewed or verified records"],
  [/on your behalf we (filed|served)/i, "a claim that LegalEase filed or served"],
  // The assertion, not the condition. "Once the prosecuting agency stipulates"
  // is the workflow; "the prosecuting agency has stipulated" is a claim about
  // an office LegalEase has not contacted.
  [/the (district attorney|city attorney|prosecutor|prosecuting agency) (has stipulated|has agreed|will stipulate|will not object|does not object to)/i, "an assertion about the prosecuting agency's position"],
  [/your record (is|will be) clear\b/i, "a promise about the result"],
  [/restores? (your )?firearm rights/i, "a claim that sealing restores firearm rights"],
  [/the court finds that the petitioner/i, "a judicial finding written as though already made"]
];

/**
 * The rendered pages, as the lines a reader would see on each of them.
 *
 * A page count proves nothing about what is on a page. pdf-lib writes one
 * Flate-compressed content stream per page, each run positioned by an explicit
 * text matrix, so inflating the streams in page order and grouping runs by their
 * y position reconstructs the page as lines. That is what catches a blank page,
 * a heading stranded at the foot of a page with its section overleaf, and a
 * paragraph rendered twice.
 *
 * Em dashes and section marks decode to a replacement character under latin1.
 * That is an artefact of reading the stream, not of the render.
 */
function renderedPages(bytes) {
  const buffer = Buffer.from(bytes);
  const pages = [];
  let index = 0;
  while (index < buffer.length) {
    const marker = buffer.indexOf("stream", index);
    if (marker === -1) break;
    let start = marker + "stream".length;
    if (buffer[start] === 0x0d) start += 1;
    if (buffer[start] === 0x0a) start += 1;
    const end = buffer.indexOf("endstream", start);
    if (end === -1) break;
    let inflated = null;
    try {
      inflated = zlib.inflateSync(buffer.subarray(start, end)).toString("latin1");
    } catch {
      // Font programs and other embedded objects are not content streams.
    }
    index = end + "endstream".length;
    if (inflated === null) continue;
    if (!/\bTm\b/.test(inflated) && !/\bre\b/.test(inflated)) continue;

    const runs = [];
    const pattern = /1 0 0 1 ([-\d.]+) ([-\d.]+) Tm[\s\S]*?<([0-9a-fA-F]*)>\s*Tj/g;
    let match;
    while ((match = pattern.exec(inflated))) {
      let text = "";
      const hex = match[3];
      for (let i = 0; i + 1 < hex.length; i += 2) {
        const code = parseInt(hex.slice(i, i + 2), 16);
        text += code >= 32 && code < 127 ? String.fromCharCode(code) : code === 0 ? "" : "?";
      }
      runs.push({ x: parseFloat(match[1]), y: parseFloat(match[2]), text });
    }
    const byLine = new Map();
    for (const run of runs) {
      const key = Math.round(run.y);
      if (!byLine.has(key)) byLine.set(key, []);
      byLine.get(key).push(run);
    }
    pages.push(
      [...byLine.entries()]
        .sort((left, right) => right[0] - left[0])
        .map(([, group]) =>
          group
            .sort((left, right) => left.x - right.x)
            .map((run) => run.text)
            .join("   ")
            .trim()
        )
    );
  }
  return pages;
}

/** Section headings, as they are drawn: uppercase, on a line of their own. */
function headingLines(template) {
  return new Set(
    (template.sections ?? [])
      .map((section) => section.heading)
      .filter(Boolean)
      .map((heading) => heading.replace(/[^\x20-\x7e]/g, "?"))
  );
}

/**
 * Repeated fill-in rules are not duplicated paragraphs.
 *
 * Every proposed order prints three blank agency lines on purpose, and a
 * duplicate check that could not tell those apart from repeated copy would have
 * to be weakened rather than kept honest.
 */
const isFillInRule = (line) => {
  const solid = line.replace(/\s+/g, "");
  if (solid.length === 0) return true;
  return (solid.match(/_/g) ?? []).length / solid.length > 0.6;
};

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveNevadaFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "NV",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`
  );
  ok(
    resolved.components.length === 4,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than the four the design assigns.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "NV",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "NV",
      geography: null,
      facts,
      rootDir: root
    });
    ok(
      sha(output.bytes) === sha(again.bytes),
      `${component.componentId}: rendering is not deterministic.`
    );

    const template = pleadingTemplate(component.templateId);
    const pages = renderedPages(output.bytes);
    const headings = headingLines(template);
    ok(
      pages.length === (output.pageCount ?? 0),
      `${fixture.fixtureId}/${component.componentId}: ${pages.length} content streams for ${output.pageCount} pages, so a page carries nothing.`
    );
    pages.forEach((lines, pageIndex) => {
      const written = lines.filter((line) => line.length > 0);
      ok(
        written.length > 0,
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} is blank.`
      );
      const last = written[written.length - 1];
      ok(
        pageIndex === pages.length - 1 || !headings.has(last),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} ends on the heading "${last}", stranding it from its section.`
      );
      ok(
        written.every((line) => line.length < 220),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} carries a line long enough to have run past the margin.`
      );
    });
    const allLines = pages.flat().filter((line) => line.length > 24 && !isFillInRule(line));
    for (let i = 1; i < allLines.length; i += 1) {
      ok(
        allLines[i] !== allLines[i - 1],
        `${fixture.fixtureId}/${component.componentId}: the line "${allLines[i].slice(0, 60)}..." is rendered twice in succession.`
      );
    }
    inspectedPages += output.pageCount ?? 0;

    ok(
      !output.warnings.some((warning) => /Rendered blank lines for absent values/.test(warning)),
      `${fixture.fixtureId}/${component.componentId}: a declared value was absent and rendered as a blank line: ${output.warnings.join(" ")}`
    );

    ok(template.technicalFixture === true, `${component.templateId}: is not marked a technical fixture.`);
    ok(
      template.fixtureBanner && /DRAFT PENDING LEGAL REVIEW/.test(template.fixtureBanner),
      `${component.templateId}: carries no draft banner.`
    );
    const source = JSON.stringify(template);
    for (const [pattern, description] of PROHIBITED) {
      ok(!pattern.test(source), `${component.templateId}: contains ${description}.`);
    }
    ok(
      !/\{\{/.test(source.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "")),
      `${component.templateId}: malformed placeholder.`
    );

    const outsideParty = template.signatureBlock.some((line) =>
      /Judge|Justice of the Peace|district attorney|city attorney|prosecuting agency/i.test(line)
    );
    if (OUTSIDE_PARTY_ROLES.has(component.role)) {
      ok(
        template.signatureLabel === null,
        `${component.componentId}: an outside party's document carries a participant signature rule.`
      );
      ok(
        template.verification === undefined,
        `${component.componentId}: an outside party's document carries the participant's verification.`
      );
      // Every line an outside party would complete stays blank.
      const populated = template.signatureBlock
        .concat(
          (template.sections ?? []).flatMap((section) => section.paragraphs)
        )
        .filter((line) => /^\s*(Signed|\/s\/|By:\s*\w)/i.test(line));
      ok(
        populated.length === 0,
        `${component.componentId}: an outside party's execution block is populated: ${JSON.stringify(populated)}`
      );
    } else {
      ok(
        typeof template.signatureLabel === "string" && template.signatureLabel.length > 0,
        `${component.componentId}: a document the participant signs carries no signature rule.`
      );
      ok(
        typeof template.verification === "string" && template.verification.length > 40,
        `${component.componentId}: the participant's document carries no verification.`
      );
      ok(
        !outsideParty,
        `${component.componentId}: carries a signature line for an outside party.`
      );
      ok(
        !template.signatureBlock.some((line) => /Notary Public|sworn to before me/i.test(line)),
        `${component.componentId}: carries a notarial block, which the design records as county-dependent and unestablished.`
      );
      ok(
        template.signatureBlock.some((line) => /[Nn]otar/.test(line)),
        `${component.componentId}: does not tell the participant what to do about notarization.`
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
    jurisdiction: "NV",
    jurisdictionName: "Nevada",
    packetName: resolved.track.assembledPacketName,
    caseReference: facts.packetCaseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  };
  const assembled = await assemblePacketPdf(assemblyRequest);
  const againAssembled = await assemblePacketPdf(assemblyRequest);
  ok(
    assembled.sha256 === againAssembled.sha256,
    `${fixture.fixtureId}: assembly is not deterministic.`
  );
  ok(assembled.pageCount > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);
  ok(
    JSON.stringify(assembled.componentRanges.map((r) => r.role)) ===
      JSON.stringify(["primary_filing", "proposed_order", "affidavit", "notice"]),
    `${fixture.fixtureId}: the assembled packet is not in the order the design assigns.`
  );

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    // The fixture table already records which canonical fixture a regression
    // variant belongs to. Emitting it makes the packet proof's canonical and
    // variant partition derived from this verifier rather than inferred from a
    // fixture-id suffix downstream.
    sampleRole: fixture.variantOf ? "variant" : "canonical",
    variantOf: fixture.variantOf ?? null,
    components: assemblyComponents.length,
    pages: assembled.pageCount,
    sha256: assembled.sha256
  });
}

note(
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages read line by line with no blank page, no stranded heading and no paragraph rendered twice; no prohibited content; every outside-party execution block is blank and confined to the proposed order and the stipulation.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const decrimFacts = deriveNevadaFacts("nv_seal_decrim", fixtureFor("nv_seal_decrim"));
ok(
  decrimFacts.dcrConduct === fixtureFor("nv_seal_decrim").dcrConduct,
  "The participant's account of the conduct was rewritten rather than carried through."
);

// No yes-or-no answer reaches a rendered sentence as a bare word.
for (const fixture of FIXTURES) {
  const facts = deriveNevadaFacts(fixture.trackId, fixture.answers);
  for (const [key, value] of Object.entries(facts)) {
    if (value !== "yes" && value !== "no") continue;
    ok(
      !key.endsWith("Statement") && !key.endsWith("Warning"),
      `${fixture.fixtureId}: ${key} carries a bare yes-or-no answer into a rendered sentence.`
    );
  }
}

const branchPairs = [
  ["nv-conviction-positive-1", "nv-conviction-outstanding-fees-2"],
  ["nv-nonconviction-dismissed-positive-1", "nv-nonconviction-declined-2"],
  ["nv-nonconviction-dismissed-positive-1", "nv-nonconviction-acquitted-3"],
  ["nv-multi-district-only-positive-1", "nv-multi-district-and-justice-2"]
];
for (const [baseId, variantId] of branchPairs) {
  const base = results.find((r) => r.fixtureId === baseId);
  const variant = results.find((r) => r.fixtureId === variantId);
  ok(
    base && variant && base.sha256 !== variant.sha256,
    `${variantId}: the regression variant assembles to the same bytes as ${baseId}, so it tests nothing.`
  );
}

// The three NRS 179.255(1) dispositions each produce their own timing sentence.
const timings = new Set(
  ["dismissed", "declined", "acquitted"].map(
    (disposition) =>
      deriveNevadaFacts("nv_seal_nonconviction", {
        ...fixtureFor("nv_seal_nonconviction"),
        ncvDisposition: disposition
      }).timingStatement
  )
);
ok(
  timings.size === 3,
  "The three NRS 179.255(1) dispositions do not each produce their own timing statement."
);

// The acquittal is the one with mandatory relief on the statutory findings.
const acquittalTiming = deriveNevadaFacts("nv_seal_nonconviction", {
  ...fixtureFor("nv_seal_nonconviction"),
  ncvDisposition: "acquitted"
}).timingStatement;
ok(
  /shall order the records sealed/.test(acquittalTiming),
  "The acquittal route does not record that relief is mandatory on the statutory findings."
);

// The township reaches the document only where a justice court matter is in it.
const districtOnly = deriveNevadaFacts("nv_seal_multi", fixtureFor("nv_seal_multi"));
const withJustice = deriveNevadaFacts("nv_seal_multi", {
  ...fixtureFor("nv_seal_multi"),
  mltCourtLevels: ["district", "justice"],
  mltTownship: "Las Vegas Township"
});
ok(
  !/township as:/.test(districtOnly.townshipStatement) &&
    /Las Vegas Township/.test(withJustice.townshipStatement),
  "The township is not confined to the branch that needs it."
);

// The trafficking answer changes what the costs section says, and both forms
// surface the NRS 179.245(9) waiver.
const noTrafficking = deriveNevadaFacts("nv_seal_reentry", fixtureFor("nv_seal_reentry"));
const withTrafficking = deriveNevadaFacts("nv_seal_reentry", {
  ...fixtureFor("nv_seal_reentry"),
  seaTrafficking: "yes"
});
ok(
  noTrafficking.traffickingStatement !== withTrafficking.traffickingStatement &&
    /waiver above/.test(noTrafficking.traffickingStatement) &&
    /waiver above/.test(withTrafficking.traffickingStatement),
  "The sex-trafficking fee waiver is not addressed on both branches of the answer."
);
// The citation itself is static language and lives in the costs section of
// every filing, which section 2 above already asserts.
ok(
  /179\.245\(9\) waives every one of those fees/.test(
    JSON.stringify(pleadingTemplate("nv_seal_reentry-petition"))
  ),
  "The costs section does not carry the NRS 179.245(9) waiver in terms."
);

note(
  "6. Values: the participant's account of the conduct is carried through verbatim, no yes-or-no answer reaches a sentence as a bare word, all four regression variants assemble to different bytes from their canonical fixture, each NRS 179.255(1) disposition produces its own timing statement, the township appears only where a justice court matter does, and the NRS 179.245(9) waiver is surfaced whichever way the trafficking question is answered."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const track of NEVADA_CUSTOM_PLEADING_TRACKS) {
  ok(track.statuses.runtime === "runtime_disabled", `${track.trackId}: is not runtime-disabled.`);
  ok(track.statuses.legal === "not_submitted", `${track.trackId}: claims a legal review status.`);
  ok(track.statuses.visual === "not_reviewed", `${track.trackId}: claims a visual review status.`);
  ok(track.jurisdiction === "NV", `${track.trackId}: is not a Nevada track.`);
  ok(track.outputStrategy === "custom_pleading", `${track.trackId}: is not custom_pleading.`);
  ok(
    track.requiredInputs.length > 0,
    `${track.trackId}: declares no participant inputs, so nothing can be checked as answered.`
  );
}
note("7. Runtime: every track is runtime-disabled, legally unsubmitted and visually unreviewed.");

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Nevada custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Nevada custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(38)} ${result.trackId.padEnd(22)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(2)} pages  sha256=${result.sha256}`
  );
}
