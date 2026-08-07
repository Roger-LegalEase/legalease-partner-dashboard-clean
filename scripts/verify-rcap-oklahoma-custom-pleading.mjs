// Oklahoma 22 O.S. §§ 18, 19, 19a, 60.18 and 991c custom-pleading routes —
// packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// Oklahoma is not enabled and its shared surfaces are untouched, the assignment
// is exactly the eight assigned tracks and their sixteen assigned
// custom-pleading components, every component has a governing legal-design
// specification, the design's three hard boundaries hold on the face of every
// document — no § 18 category is asserted, no period is computed, no monetary
// amount is printed, the free-route caution is present and the § 991c limit is
// stated — the typed stops fail closed, participant values land in the rendered
// bytes, every page carries text, and the only outside-party signature block in
// the module is the judge's, on a proposed order, blank.
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
  OKLAHOMA_CUSTOM_PLEADING_TRACKS,
  OKLAHOMA_PLEADING_TEMPLATES,
  OK_DESIGN_ROLE_TO_ENGINE_ROLE,
  OK_ASSIGNED_TRACK_IDS,
  OK_VPO_OUTCOMES,
  OK_YES_NO,
  OK_REFERRAL,
  OK_FREE_ROUTE_REFERRAL,
  OK_ARREST_RECORD_REFERRAL,
  deriveOklahomaFacts,
  OklahomaBranchError,
  OklahomaEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/oklahoma/custom-pleading");

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
  "ok_18_19_deferred_dismissal",
  "ok_18_19_felony_conviction",
  "ok_18_19_misdemeanor_conviction",
  "ok_18_19_nonconviction",
  "ok_18_19_pardon",
  "ok_991c_deferred",
  "ok_identity_theft",
  "ok_vpo_60_18"
];

/** The seven routes that run on 22 O.S. §§ 18 and 19 and their neighbours. */
const SECTION_18_TRACKS = ASSIGNED.filter((id) => id !== "ok_991c_deferred");

// ---------------------------------------------------------------------------
// 0. Oklahoma is not enabled, and the shared surfaces are untouched
// ---------------------------------------------------------------------------

const assignedIds = new Set(OKLAHOMA_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Oklahoma track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("ok_")).length === 0,
  "Oklahoma templates are wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);

// Injected for verification only. The committed shared files stay untouched;
// this is what lets the real renderer, resolver and assembler be exercised.
for (const track of OKLAHOMA_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, OKLAHOMA_PLEADING_TEMPLATES);

note(
  "0. Enablement: all eight assigned tracks and all sixteen templates are absent from the shared registry and template pack; injection is verification-time only."
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
ok(
  JSON.stringify([...OK_ASSIGNED_TRACK_IDS].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The module's closed track list is not exactly the assigned track set."
);

let componentCount = 0;
for (const track of OKLAHOMA_CUSTOM_PLEADING_TRACKS) {
  const manifest = manifests.find((m) => m.trackId === track.trackId);
  ok(Boolean(manifest), `${track.trackId}: no packet-set manifest in the adopted legal design.`);
  if (!manifest) continue;

  // Every custom_pleading component in the design must be implemented, and
  // nothing else may be. Oklahoma's process_guidance components — the free
  // route screen, the record-gathering instructions, the fee disclosure, the
  // hearing instructions and the effect disclosure — belong to the guidance
  // lane and are not this job's to build.
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

  // Packet order is the design's, not this module's.
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
        OK_DESIGN_ROLE_TO_ENGINE_ROLE[spec.role] === component.role,
        `${component.componentId}: design role ${spec.role} is not mapped to engine role ${component.role}.`
      );
      // Every generation requirement the design declares must be a declared
      // participant input, or nothing can be checked as answered.
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

  // And no input is declared that the design did not ask for.
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

/** A subdivision of § 18 — the one citation the design forbids asserting. */
const SECTION_18_SUBDIVISION = /§+\s?18\s*\(/;
/** A stated waiting period. */
const STATED_PERIOD = /\b(one|two|three|five|seven|ten|\d+)[- ]year (period|wait|waiting)/i;

for (const track of OKLAHOMA_CUSTOM_PLEADING_TRACKS) {
  for (const component of track.packetSet.components) {
    const template = pleadingTemplate(component.templateId);
    const source = JSON.stringify(template);
    ok(
      !SECTION_18_SUBDIVISION.test(source),
      `${component.componentId}: cites a subdivision of 22 O.S. § 18. The section has been renumbered three years running and the design forbids asserting a category.`
    );
    ok(
      !STATED_PERIOD.test(source),
      `${component.componentId}: states a waiting period. The § 18(A) periods are known but the module asserts none, because the paragraph numbering has moved three years running and a period stated here would have to be tied to a category this petition does not assert.`
    );
    ok(
      !/\$\s?\d/.test(source),
      `${component.componentId}: prints a monetary amount. The district court filing fee is unresolved and no amount belongs in a filing.`
    );
  }
}

for (const trackId of SECTION_18_TRACKS) {
  const track = OKLAHOMA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const petition = JSON.stringify(
    pleadingTemplate(track.packetSet.components.find((c) => c.role === "primary_filing").templateId)
  );

  // The free-route caution: the design's central warning.
  ok(
    /Senate Bill 2030/.test(petition),
    `${trackId}: the petition never mentions Senate Bill 2030, which provides for sealing without a petition.`
  );
  // The enrolled text has been read, so the packet may no longer say it has not.
  ok(
    !/enrolled text (has|had) not been (read|obtained)/i.test(petition),
    `${trackId}: the petition still says Senate Bill 2030's enrolled text has not been read. It has.`
  );
  ok(
    /18b/.test(petition) && /19d/.test(petition),
    `${trackId}: the petition does not name §§ 18b and 19d, where the sealing-without-petition route actually sits.`
  );
  ok(
    /19d\(G\)/.test(petition),
    `${trackId}: the petition does not cite § 19d(G), which is where the right to petition is expressly preserved.`
  );
  ok(
    /1 November 2026/.test(petition) && /1 November 2027/.test(petition),
    `${trackId}: the petition does not carry the portal and automatic-process dates, which are the reason the route is not yet a live alternative.`
  );
  ok(
    /does not state that the petitioner is within it, and it does not state that the petitioner is outside it/.test(
      petition
    ),
    `${trackId}: the petition does not refuse, in terms, to place the petitioner inside or outside the SB 2030 route.`
  );
  ok(
    /Oklahoma State Bureau of Investigation whether this record is one that will be sealed without a petition/.test(
      petition
    ),
    `${trackId}: the petition does not tell the petitioner to ask the Bureau before paying.`
  );

  // Sealing, not expungement, and not destruction.
  ok(
    /expungement means sealing/i.test(petition),
    `${trackId}: the petition does not say that Oklahoma expungement means sealing.`
  );
  ok(
    /does not authorise the physical destruction/i.test(petition),
    `${trackId}: the petition does not say that § 19 authorises no destruction.`
  );
  ok(
    /Fully sealed records .* Partially sealed records/s.test(petition),
    `${trackId}: the petition does not disclose the difference between full and partial sealing.`
  );
  ok(
    /19\(L\)/.test(petition),
    `${trackId}: the petition does not record the § 19(L) ten-year position.`
  );
  // Senate Bill 2030 shifted the surviving § 19 subsections up three letters, so
  // the obliteration rule moved from former O to L and current N is the
  // impeachment rule. A petition that still cited N would point a reader at a
  // different rule, which is the one substantive citation error the current-law
  // decision found in participant-facing Oklahoma text.
  ok(
    !/19\(N\)/.test(petition),
    `${trackId}: the petition still cites § 19(N), which is now the impeachment and character-evidence rule.`
  );

  // The court gives notice; the petitioner does not serve.
  ok(
    /puts the notice on the Court/.test(petition) && /thirty days/.test(petition),
    `${trackId}: the petition does not put the § 19 thirty-day notice on the court.`
  );
  ok(
    /no certificate of service is included/.test(petition),
    `${trackId}: the petition does not say why no certificate of service is generated.`
  );

  // The stops are printed, not just enforced.
  ok(
    /WHERE THIS PACKET STOPS/.test(petition),
    `${trackId}: the petition carries no self-help stop section.`
  );
  ok(
    petition.includes(OK_REFERRAL),
    `${trackId}: the petition's stop section carries no referral.`
  );

  // The proposed order names the agencies and is unsigned.
  const order = JSON.stringify(
    pleadingTemplate(track.packetSet.components.find((c) => c.role === "proposed_order").templateId)
  );
  ok(
    /PROPOSED — NOT YET MADE/.test(order),
    `${trackId}: the proposed order does not mark itself as proposed and not yet made.`
  );
  ok(
    /Oklahoma State Bureau of Investigation/.test(order) &&
      /arresting agency/.test(order) &&
      /district attorney/.test(order) &&
      /court clerk/.test(order),
    `${trackId}: the proposed order does not name the agencies it would apply to.`
  );
  ok(
    /Any other agency holding records of this case must be added/.test(order),
    `${trackId}: the proposed order gives the petitioner no way to add an agency LegalEase cannot know about.`
  );
  ok(
    /Leave every line of it blank/.test(order),
    `${trackId}: the proposed order does not tell the petitioner to leave the judicial signature block blank.`
  );
}
note(
  `2. Design boundaries: on all ${SECTION_18_TRACKS.length} § 18 routes the petition carries the SB 2030 caution, the sealing-not-destruction and full-versus-partial disclosures, the § 19(L) position, the court's notice duty and the printed stops; the proposed order names every agency it can and is marked unsigned. No document in the module cites a § 18 subdivision, states a period, or prints an amount.`
);

// The § 991c limit is the design's most important consumer-facing point.
const nineNineOneC = OKLAHOMA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === "ok_991c_deferred");
for (const component of nineNineOneC.packetSet.components) {
  const source = JSON.stringify(pleadingTemplate(component.templateId));
  ok(
    /will not expunge the arrest record/.test(source),
    `${component.componentId}: does not state that a § 991c expungement does not remove the arrest record.`
  );
  ok(
    /needs a separate petition under 22 O.S. .. 18 and 19/.test(source),
    `${component.componentId}: does not route the participant to the §§ 18 and 19 petition for the arrest record.`
  );
}
// And the deferred-dismissal petition must not be mistaken for one.
const deferredPetition = JSON.stringify(
  pleadingTemplate("ok_18_19_deferred_dismissal-petition")
);
ok(
  /THIS IS NOT A SECTION 991c MOTION/.test(deferredPetition),
  "ok_18_19_deferred_dismissal: the petition does not distinguish itself from a § 991c motion."
);

// The protective-order route states what it does not know.
const vpoPetition = JSON.stringify(pleadingTemplate("ok_vpo_60_18-petition"));
ok(
  /without stating the section's conditions and without saying that they are met/.test(vpoPetition),
  "ok_vpo_60_18: the petition does not refuse to state the § 60.18 conditions."
);

// The identity-theft account stays the participant's.
const identityPetition = JSON.stringify(pleadingTemplate("ok_identity_theft-petition"));
ok(
  /has not investigated it, has not corroborated it and does not assert it/.test(identityPetition),
  "ok_identity_theft: the petition does not disclaim the participant's account of the misidentification."
);
ok(
  /Whether this record belongs to the petitioner is for the Court to determine/.test(identityPetition),
  "ok_identity_theft: the petition does not leave the identity question to the court."
);

// The prosecutor's position stays the prosecutor's.
const nonconvictionPetition = JSON.stringify(pleadingTemplate("ok_18_19_nonconviction-petition"));
ok(
  /LegalEase did not obtain and does not hold any confirmation from the prosecuting agency/.test(
    nonconvictionPetition
  ),
  "ok_18_19_nonconviction: the petition does not disclaim holding the prosecuting agency's confirmation."
);

note(
  "2b. Route-specific boundaries: both § 991c documents state the arrest-record limit and route to §§ 18 and 19; the deferred-dismissal petition distinguishes itself from a § 991c motion; the protective-order petition refuses to state § 60.18's conditions; the identity-theft account and the prosecutor's no-refile statement are both left as the participant's own."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical positive per assigned track, plus
//    regression variants where a branch changes the document
// ---------------------------------------------------------------------------

const eighteen = (prefix) => ({
  [`${prefix}FullLegalName`]: "Dana Marie Whitfield, formerly Dana Marie Pruitt",
  [`${prefix}DateOfBirth`]: "14 March 1991",
  [`${prefix}County`]: "Oklahoma County",
  [`${prefix}CaseNumber`]:
    "CF-2016-4471, District Court of Oklahoma County; arresting agency Oklahoma City Police Department",
  [`${prefix}OffenceDescription`]:
    "Described on the docket as possession of a controlled dangerous substance",
  [`${prefix}DispositionAndDate`]: "Dismissed on the State's motion on 8 November 2019",
  [`${prefix}SameCountyArrests`]: [
    "An arrest in Oklahoma County on 2 February 2015 for public intoxication, dismissed"
  ],
  [`${prefix}PriorRecord`]: ["No other convictions anywhere", "No charge is pending"],
  [`${prefix}Restitution`]: "yes",
  [`${prefix}TribalRecord`]: "no",
  [`${prefix}FreeRouteChecked`]: "no",
  [`${prefix}ArrestRecordToo`]: "yes"
});

const FIXTURES = [
  {
    fixtureId: "ok-nonconviction-positive-1",
    trackId: "ok_18_19_nonconviction",
    answers: { ...eighteen("18_"), ncvNoRefile: "yes" }
  },
  {
    fixtureId: "ok-nonconviction-court-record-only-2",
    trackId: "ok_18_19_nonconviction",
    variantOf: "ok-nonconviction-positive-1",
    // The arrest-record answer changes what is asked for and what the prayer
    // seeks, so it is a material branch rather than a cosmetic one.
    answers: { ...eighteen("18_"), ncvNoRefile: "yes", "18_ArrestRecordToo": "no" }
  },
  {
    fixtureId: "ok-deferred-dismissal-positive-1",
    trackId: "ok_18_19_deferred_dismissal",
    answers: {
      ...eighteen("18_"),
      "18_DispositionAndDate": "Dismissed on 12 June 2021 after the deferred sentence was completed",
      dfdCompletion:
        "The deferred sentence ended on 1 June 2021 and the case was dismissed on 12 June 2021"
    }
  },
  {
    fixtureId: "ok-misdemeanor-positive-1",
    trackId: "ok_18_19_misdemeanor_conviction",
    answers: {
      ...eighteen("18_"),
      "18_OffenceDescription": "Described on the judgment as larceny of merchandise from a retailer",
      "18_DispositionAndDate": "Convicted on a plea of guilty on 3 April 2017",
      misSentenceComplete:
        "Probation ended on 3 April 2018 and the last payment was made on 20 May 2018"
    }
  },
  {
    fixtureId: "ok-felony-positive-1",
    trackId: "ok_18_19_felony_conviction",
    answers: {
      ...eighteen("18_"),
      "18_OffenceDescription": "Described on the judgment as knowingly concealing stolen property",
      "18_DispositionAndDate": "Convicted on a plea of guilty on 19 September 2014",
      felReclassified: "no",
      felOtherMisdemeanors: "One misdemeanour conviction for driving under suspension in 2012"
    }
  },
  {
    fixtureId: "ok-felony-reclassified-2",
    trackId: "ok_18_19_felony_conviction",
    variantOf: "ok-felony-positive-1",
    // Reclassification changes which paragraph the petition recites and is the
    // route the design directs be screened first, so it is a material branch.
    answers: {
      ...eighteen("18_"),
      "18_OffenceDescription": "Described on the judgment as knowingly concealing stolen property",
      "18_DispositionAndDate": "Convicted on a plea of guilty on 19 September 2014",
      felReclassified: "yes",
      felOtherMisdemeanors: "None"
    }
  },
  {
    fixtureId: "ok-pardon-positive-1",
    trackId: "ok_18_19_pardon",
    answers: {
      ...eighteen("18_"),
      "18_OffenceDescription": "Described on the judgment as second degree burglary",
      "18_DispositionAndDate": "Convicted on a plea of guilty on 11 January 2009",
      pdnPardonDate: "The pardon was granted on 4 December 2024 and I hold the signed document"
    }
  },
  {
    fixtureId: "ok-identity-theft-positive-1",
    trackId: "ok_identity_theft",
    answers: {
      ...eighteen("ide"),
      ideOffenceDescription: "Described on the docket as uttering a forged instrument",
      ideDispositionAndDate: "Bench warrant issued 5 May 2018; the case is shown as open",
      idtHowMisidentified:
        "Someone used my name and my old address when they were arrested. I found out in 2023 when a background check for a job came back with a case I had never heard of, in a county I have never lived in."
    }
  },
  {
    fixtureId: "ok-vpo-dismissed-positive-1",
    trackId: "ok_vpo_60_18",
    answers: {
      ...eighteen("vpo"),
      vpoOffenceDescription: "Petition for a victim protective order filed against me",
      vpoDispositionAndDate: "Dismissed on 7 July 2022",
      vpoOutcome: "dismissed"
    }
  },
  {
    fixtureId: "ok-vpo-denied-2",
    trackId: "ok_vpo_60_18",
    variantOf: "ok-vpo-dismissed-positive-1",
    // Dismissed, denied and expired are three different things on the face of
    // the record, and the petition recites which one it was.
    answers: {
      ...eighteen("vpo"),
      vpoOffenceDescription: "Petition for a victim protective order filed against me",
      vpoDispositionAndDate: "Denied after hearing on 7 July 2022",
      vpoOutcome: "denied"
    }
  },
  {
    fixtureId: "ok-991c-positive-1",
    trackId: "ok_991c_deferred",
    answers: {
      dfcFullLegalName: "Dana Marie Whitfield",
      dfcCounty: "Oklahoma County, District Court of Oklahoma County",
      dfcCaseNumber: "CM-2018-1102",
      dfcCompletionDate: "The deferred sentence and everything it required were finished on 9 August 2020",
      dfcArrestRecordGoal: "no"
    }
  }
];

const fixtureFor = (trackId) => FIXTURES.find((f) => f.trackId === trackId && !f.variantOf).answers;

// ---------------------------------------------------------------------------
// 4. Typed stops and closed lists
// ---------------------------------------------------------------------------

const NEGATIVE = [
  // The free-route screen, on every § 18 route.
  ...SECTION_18_TRACKS.map((trackId) => {
    const prefix = trackId === "ok_identity_theft" ? "ide" : trackId === "ok_vpo_60_18" ? "vpo" : "18_";
    return [
      "the participant asks whether the free route reaches them",
      trackId,
      { ...fixtureFor(trackId), [`${prefix}FreeRouteChecked`]: "yes" },
      "ok-free-route-check-not-available"
    ];
  }),
  // Records an Oklahoma order does not reach.
  [
    "a tribal record exists for the same events",
    "ok_18_19_nonconviction",
    { ...fixtureFor("ok_18_19_nonconviction"), "18_TribalRecord": "yes" },
    "ok-record-outside-oklahoma-reach"
  ],
  [
    "a tribal record exists on the identity-theft route",
    "ok_identity_theft",
    { ...fixtureFor("ok_identity_theft"), ideTribalRecord: "yes" },
    "ok-record-outside-oklahoma-reach"
  ],
  // The prosecutor's no-refile confirmation is the prosecutor's.
  [
    "the prosecuting agency has not confirmed the case will not be refiled",
    "ok_18_19_nonconviction",
    { ...fixtureFor("ok_18_19_nonconviction"), ncvNoRefile: "no" },
    "ok-no-refile-not-confirmed"
  ],
  // The § 991c limit, enforced rather than only printed.
  [
    "the participant's real goal is the arrest record",
    "ok_991c_deferred",
    { ...fixtureFor("ok_991c_deferred"), dfcArrestRecordGoal: "yes" },
    "ok-991c-does-not-reach-the-arrest-record"
  ]
];

let stopped = 0;
for (const [label, trackId, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveOklahomaFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof OklahomaEligibilityStopError,
    `${trackId}: ${label} did not fail closed with a typed stop.`
  );
  if (caught instanceof OklahomaEligibilityStopError) {
    ok(
      caught.stopId === expectedStopId,
      `${trackId}: ${label} raised ${caught.stopId} rather than ${expectedStopId}.`
    );
    ok(caught.referral.length > 20, `${trackId}: ${label} lost its referral.`);
    ok(caught.reason.length > 40, `${trackId}: ${label} gives no reason a participant could act on.`);
    stopped += 1;
  }
}

// The free-route stop must send the participant to the Bureau, not to a lawyer:
// the question is whether a free route exists, and a lawyer is not the answer.
let freeRouteStop = null;
try {
  deriveOklahomaFacts("ok_18_19_pardon", {
    ...fixtureFor("ok_18_19_pardon"),
    "18_FreeRouteChecked": "yes"
  });
} catch (error) {
  freeRouteStop = error;
}
ok(
  freeRouteStop?.referral === OK_FREE_ROUTE_REFERRAL,
  "The free-route stop does not refer the participant to the Oklahoma State Bureau of Investigation."
);

// The § 991c stop must route to the §§ 18 and 19 petition, not to a lawyer.
let arrestGoalStop = null;
try {
  deriveOklahomaFacts("ok_991c_deferred", {
    ...fixtureFor("ok_991c_deferred"),
    dfcArrestRecordGoal: "yes"
  });
} catch (error) {
  arrestGoalStop = error;
}
ok(
  arrestGoalStop?.referral === OK_ARREST_RECORD_REFERRAL,
  "The § 991c arrest-record stop does not route the participant to the §§ 18 and 19 petition."
);

// Closed lists reject anything outside them.
const BRANCH_CASES = [
  ["ok_18_19_nonconviction", "18_TribalRecord", "not sure"],
  ["ok_18_19_nonconviction", "18_ArrestRecordToo", "maybe"],
  ["ok_18_19_nonconviction", "ncvNoRefile", "they said probably not"],
  ["ok_vpo_60_18", "vpoOutcome", "withdrawn"],
  ["ok_991c_deferred", "dfcArrestRecordGoal", "both"]
];
let branchRejected = 0;
for (const [trackId, key, value] of BRANCH_CASES) {
  let caught = null;
  try {
    deriveOklahomaFacts(trackId, { ...fixtureFor(trackId), [key]: value });
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof OklahomaBranchError,
    `${trackId}: "${value}" for ${key} was not rejected as outside the approved list.`
  );
  if (caught instanceof OklahomaBranchError) branchRejected += 1;
}

// A track this job was not assigned cannot be derived for.
let unassigned = null;
try {
  deriveOklahomaFacts("ok_something_else", {});
} catch (error) {
  unassigned = error;
}
ok(
  unassigned instanceof OklahomaBranchError,
  "An unassigned Oklahoma track identifier was accepted by the fact derivation."
);

ok(Object.keys(OK_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(Object.keys(OK_VPO_OUTCOMES).length === 3, "The protective-order outcome list changed size.");
ok(OK_REFERRAL.length > 20, "The default referral destination is empty.");

note(
  `4. Stops: ${stopped} negative cases fail closed with the expected typed stop and a referral; the free-route stop refers to the Bureau and the § 991c stop routes to the §§ 18 and 19 petition rather than either sending the participant to a lawyer for a question a lawyer is not needed for; ${branchRejected} out-of-list branch values rejected; an unassigned track identifier is refused; two closed lists hold their size.`
);

// ---------------------------------------------------------------------------
// 5. Rendered content
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/will be granted|you are eligible|you will succeed|is entitled to relief/i, "a prediction or an eligibility assertion"],
  [/we have (reviewed|verified|confirmed)/i, "a claim that LegalEase reviewed or verified records"],
  [/on your behalf we (filed|served)/i, "a claim that LegalEase filed or served"],
  [/the (district attorney|prosecutor|prosecuting agency) (has consented|consents|agrees|will not object)/i, "an assertion about the prosecuting agency's position"],
  [/an official (state|statewide) form (exists|is available)/i, "a claim that an official Oklahoma form exists"],
  [/your record (is|will be) clear\b/i, "a promise about the result"],
  [/the Court finds that the petitioner/i, "a judicial finding written as though already made"]
];

/**
 * The rendered pages, as the lines a reader would see on each of them.
 *
 * A page count proves nothing about what is on a page. pdf-lib writes one
 * Flate-compressed content stream per page, each run positioned by an explicit
 * text matrix, so inflating the streams in page order and grouping runs by their
 * y position reconstructs the page as lines. That is what catches a blank page,
 * a heading stranded at the foot of a page with its section overleaf, and a
 * paragraph rendered twice — none of which a page count or a byte length shows.
 *
 * Em dashes and section marks decode to a replacement character under latin1.
 * That is an artefact of reading the stream, not of the render, so comparisons
 * here are made on the decoded text as-is rather than on the template source.
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

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveOklahomaFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "OK",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`
  );
  ok(
    resolved.components.length === 2,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than the two the design assigns.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "OK",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    // Rendering the same facts twice must produce the same bytes.
    const again = await renderPacketComponent({
      component,
      jurisdiction: "OK",
      geography: null,
      facts,
      rootDir: root
    });
    ok(
      sha(output.bytes) === sha(again.bytes),
      `${component.componentId}: rendering is not deterministic.`
    );

    // Every page is inspected as lines, not counted.
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
      // A heading is not allowed to be the last thing on a page: its section
      // would begin overleaf and the heading would read as belonging to
      // whatever came before it.
      const last = written[written.length - 1];
      ok(
        pageIndex === pages.length - 1 || !headings.has(last),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} ends on the heading "${last}", stranding it from its section.`
      );
      // Nothing may run off the page. The renderer wraps to the content width,
      // so an over-long line means a value was drawn without wrapping.
      ok(
        written.every((line) => line.length < 220),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} carries a line long enough to have run past the margin.`
      );
    });
    // No paragraph is rendered twice in a row. Repeated fill-in rules are not
    // duplicated paragraphs: the proposed order deliberately prints three blank
    // agency lines, and a check that cannot tell those apart from repeated copy
    // would have to be weakened rather than kept honest.
    const isFillInRule = (line) => {
      const solid = line.replace(/\s+/g, "");
      if (solid.length === 0) return true;
      return (solid.match(/_/g) ?? []).length / solid.length > 0.6;
    };
    const allLines = pages
      .flat()
      .filter((line) => line.length > 24 && !isFillInRule(line));
    for (let i = 1; i < allLines.length; i += 1) {
      ok(
        allLines[i] !== allLines[i - 1],
        `${fixture.fixtureId}/${component.componentId}: the line "${allLines[i].slice(0, 60)}..." is rendered twice in succession.`
      );
    }
    inspectedPages += output.pageCount ?? 0;

    // No unresolved placeholder reached the participant.
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
    // Unresolved placeholders would print as literal braces.
    ok(
      !/\{\{/.test(source.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "")),
      `${component.templateId}: malformed placeholder.`
    );

    if (component.role === "proposed_order") {
      // The court signs an order. The participant must not be invited to.
      ok(
        template.signatureLabel === null,
        `${component.componentId}: a proposed order carries a participant signature rule.`
      );
      ok(
        template.verification === undefined,
        `${component.componentId}: a proposed order carries a verification, which is the petitioner's instrument and not the court's.`
      );
      ok(
        template.signatureBlock.some((line) => /Judge of the District Court/.test(line)),
        `${component.componentId}: a proposed order carries no judicial signature block.`
      );
      // Blank, and told to stay blank.
      ok(
        template.signatureBlock.every((line) => !/^\s*(Signed|\/s\/)/i.test(line)),
        `${component.componentId}: the judicial signature block is populated.`
      );
    } else {
      ok(
        typeof template.signatureLabel === "string" && template.signatureLabel.length > 0,
        `${component.componentId}: a document the participant signs carries no signature rule.`
      );
      ok(
        typeof template.verification === "string" && template.verification.length > 40,
        `${component.componentId}: the participant's filing carries no verification.`
      );
      // Oklahoma prescribes no notarization on these routes. Printing a
      // notarial block would invite an oath the statutes do not ask for.
      ok(
        !template.signatureBlock.some((line) => /Notary Public|sworn to before me/i.test(line)),
        `${component.componentId}: carries a notarial block, which the design records as not established.`
      );
      ok(
        template.signatureBlock.some((line) => /[Nn]otariz/.test(line)),
        `${component.componentId}: does not tell the participant what to do about notarization.`
      );
      // The judge's line belongs on the order and nowhere else.
      ok(
        !template.signatureBlock.some((line) => /Judge|District Attorney|Clerk of/.test(line)),
        `${component.componentId}: carries a signature line for an outside party.`
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
    jurisdiction: "OK",
    jurisdictionName: "Oklahoma",
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
    assembled.componentRanges.length === 2 &&
      assembled.componentRanges[0].role === "primary_filing" &&
      assembled.componentRanges[1].role === "proposed_order",
    `${fixture.fixtureId}: the assembled packet does not put the filing before the proposed order.`
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
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected and every one positions text; no prohibited content; no notarial block; the only outside-party signature block in the module is the judge's, on a proposed order, blank.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const identityFacts = deriveOklahomaFacts(
  "ok_identity_theft",
  fixtureFor("ok_identity_theft")
);
ok(
  identityFacts.misidentificationAccount === fixtureFor("ok_identity_theft").idtHowMisidentified,
  "The participant's account of the misidentification was rewritten rather than carried through."
);
ok(
  /Somebody|Someone/.test(identityFacts.misidentificationAccount),
  "The identity-theft account did not reach the fact bag."
);

// No yes-or-no answer reaches a document as a bare word.
for (const fixture of FIXTURES) {
  const facts = deriveOklahomaFacts(fixture.trackId, fixture.answers);
  for (const [key, value] of Object.entries(facts)) {
    if (value !== "yes" && value !== "no") continue;
    ok(
      !key.endsWith("Statement") && !key.endsWith("Relief"),
      `${fixture.fixtureId}: ${key} carries a bare yes-or-no answer into a rendered sentence.`
    );
  }
}

// The material branches produce different documents.
const branchPairs = [
  ["ok-nonconviction-positive-1", "ok-nonconviction-court-record-only-2"],
  ["ok-felony-positive-1", "ok-felony-reclassified-2"],
  ["ok-vpo-dismissed-positive-1", "ok-vpo-denied-2"]
];
for (const [baseId, variantId] of branchPairs) {
  const base = results.find((r) => r.fixtureId === baseId);
  const variant = results.find((r) => r.fixtureId === variantId);
  ok(
    base && variant && base.sha256 !== variant.sha256,
    `${variantId}: the regression variant assembles to the same bytes as ${baseId}, so it tests nothing.`
  );
}

// The arrest-record branch changes what is asked for.
const withArrest = deriveOklahomaFacts("ok_18_19_nonconviction", fixtureFor("ok_18_19_nonconviction"));
const withoutArrest = deriveOklahomaFacts("ok_18_19_nonconviction", {
  ...fixtureFor("ok_18_19_nonconviction"),
  "18_ArrestRecordToo": "no"
});
ok(
  /arrest/i.test(withArrest.arrestRecordRelief) && !/arrest/i.test(withoutArrest.arrestRecordRelief),
  "The arrest-record answer does not change the relief the petition asks for."
);

note(
  "6. Values: the identity-theft account is carried through verbatim, no yes-or-no answer reaches a sentence as a bare word, and all three regression variants assemble to different bytes from their canonical fixture."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const track of OKLAHOMA_CUSTOM_PLEADING_TRACKS) {
  ok(track.statuses.runtime === "runtime_disabled", `${track.trackId}: is not runtime-disabled.`);
  ok(track.statuses.legal === "not_submitted", `${track.trackId}: claims a legal review status.`);
  ok(track.statuses.visual === "not_reviewed", `${track.trackId}: claims a visual review status.`);
  ok(track.jurisdiction === "OK", `${track.trackId}: is not an Oklahoma track.`);
  ok(track.outputStrategy === "custom_pleading", `${track.trackId}: is not custom_pleading.`);
  ok(
    track.requiredInputs.length > 0,
    `${track.trackId}: declares no participant inputs, so nothing can be checked as answered.`
  );
}
note("7. Runtime: every track is runtime-disabled, legally unsubmitted and visually unreviewed.");

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Oklahoma custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Oklahoma custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(36)} ${result.trackId.padEnd(32)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(2)} pages  sha256=${result.sha256}`
  );
}
