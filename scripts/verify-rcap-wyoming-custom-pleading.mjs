// Wyoming custom pleading, clean track — packet verification.
//
// Proves what a rendered sample cannot prove by looking right: Wyoming is not
// enabled and the shared surfaces are untouched; the assignment is exactly
// wy_nc_1401 and its four assigned custom-pleading components, with the
// process-guidance component excluded by strategy rather than forgotten and
// the two blocked tracks absent; every document holds the design's boundaries
// on its face; every material fail-closed branch throws a typed stop naming a
// reason, a destination and a next step, and none of them routes back into the
// route it just closed; and every rendered page is read line by line.
//
// Five boundaries carry most of section 2:
//
//   1. No statewide form exists, so both documents are drafted. No Wyoming
//      statewide form number may be cited, because there is none to cite.
//   2. The packet contains no summons, no praecipe, no victim notice, no
//      prosecutor response, no Division of Criminal Investigation instrument,
//      no completed proof of service and no Casper Municipal Court form.
//   3. The proposed order is unexecuted: unmarked boxes only, judicial
//      signature and date blank, and no participant signature rule on it.
//   4. The statutory filing fee is $0, stated as the statute setting no fee
//      and never as a fee that has been waived. It is the only amount printed.
//   5. The prosecuting attorney is the service recipient. The Division of
//      Criminal Investigation is not, and the certificate says so.
//
// Runs offline against the real renderer, resolver and assembler. No network,
// no database, no promotion.

import { register } from "node:module";
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
  WY_CUSTOM_PLEADING_TRACKS,
  WY_PLEADING_TEMPLATES,
  WY_DESIGN_ROLE_TO_ENGINE_ROLE,
  WY_EXCLUDED_COMPONENTS,
  WY_EXCLUDED_TRACK_IDS,
  WY_EXCLUDED_INSTRUMENTS,
  WY_ASSIGNED_TRACK_IDS,
  WY_NONCONVICTION_TRACK,
  WY_YES_NO,
  WY_QUALIFYING_DISPOSITIONS,
  WY_DEFERRAL_LEVELS,
  WY_TRACK_INPUT_KEYS,
  WY_REFERRALS,
  WY_OPEN_RELEASE_BLOCKERS,
  captionCourtLine,
  countyPhrase,
  deriveWyomingFacts,
  WyomingBranchError,
  WyomingEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/wyoming/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// ---------------------------------------------------------------------------
// 0. Wyoming is not enabled, and the shared surfaces are intact
// ---------------------------------------------------------------------------

const assignedIds = new Set(WY_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Wyoming track is wired into the shared relief-track registry."
);
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "WY").length === 0,
  "Wyoming already has a track in the shared relief-track registry."
);
ok(
  Object.keys(WY_PLEADING_TEMPLATES).every(
    (id) => !Object.prototype.hasOwnProperty.call(PLEADING_TEMPLATES, id)
  ),
  "A Wyoming template is registered in the shared template pack."
);
ok(WY_CUSTOM_PLEADING_TRACKS.every((t) => t.runtimeDisabled === true), "A Wyoming track is not runtime-disabled.");
note(
  `0. Enablement: the ${WY_CUSTOM_PLEADING_TRACKS.length} assigned track and all ${Object.keys(WY_PLEADING_TEMPLATES).length} templates are absent from the shared registry and template pack, and the track is runtime-disabled.`
);

for (const track of WY_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, WY_PLEADING_TEMPLATES);

// ---------------------------------------------------------------------------
// 1. The clean split, pinned
// ---------------------------------------------------------------------------

ok(
  WY_ASSIGNED_TRACK_IDS.length === 1 && WY_ASSIGNED_TRACK_IDS[0] === WY_NONCONVICTION_TRACK,
  `The assignment is ${WY_ASSIGNED_TRACK_IDS.join(", ")} rather than the single clean track.`
);
for (const excluded of WY_EXCLUDED_TRACK_IDS) {
  ok(!WY_ASSIGNED_TRACK_IDS.includes(excluded), `The blocked track ${excluded} is in the assignment.`);
  ok(
    WY_CUSTOM_PLEADING_TRACKS.every((t) => t.trackId !== excluded),
    `The blocked track ${excluded} is implemented.`
  );
  ok(
    Object.keys(WY_PLEADING_TEMPLATES).every((id) => !id.startsWith(excluded)),
    `A template exists for the blocked track ${excluded}.`
  );
}
ok(WY_EXCLUDED_TRACK_IDS.length === 2, `${WY_EXCLUDED_TRACK_IDS.length} blocked tracks are recorded rather than 2.`);

// Component ids, roles and order pinned from the packet-set manifest, and the
// count pinned independently of anything the renderer returns.
const EXPECTED_COMPONENTS = [
  { componentId: `${WY_NONCONVICTION_TRACK}-primary-filing-1`, role: "primary_filing", designRole: "primary_filing", order: 1 },
  { componentId: `${WY_NONCONVICTION_TRACK}-proposed-order-2`, role: "proposed_order", designRole: "proposed_order", order: 2 },
  { componentId: `${WY_NONCONVICTION_TRACK}-verification-3`, role: "affidavit", designRole: "verification", order: 3 },
  {
    componentId: `${WY_NONCONVICTION_TRACK}-certificate-of-service-4`,
    role: "certificate_of_service",
    designRole: "certificate_of_service",
    order: 4
  }
];
const EXPECTED_COMPONENT_COUNT = 4;

const track = WY_CUSTOM_PLEADING_TRACKS[0];
const actualComponents = track.packetSet.components;
ok(
  actualComponents.length === EXPECTED_COMPONENT_COUNT,
  `${track.trackId}: declares ${actualComponents.length} components rather than ${EXPECTED_COMPONENT_COUNT}.`
);
ok(track.packetSet.packetSetId === `${WY_NONCONVICTION_TRACK}-set`, "The packet-set id does not match the manifest.");
EXPECTED_COMPONENTS.forEach((want, index) => {
  const got = actualComponents[index];
  ok(got?.componentId === want.componentId, `${track.trackId}: component ${index + 1} is ${got?.componentId}.`);
  ok(got?.role === want.role, `${want.componentId}: engine role is ${got?.role} rather than ${want.role}.`);
  ok(got?.order === want.order, `${want.componentId}: order is ${got?.order}.`);
  ok(got?.requirement === "required", `${want.componentId}: requirement is ${got?.requirement}.`);
  ok(got?.outputStrategy === "custom_pleading", `${want.componentId}: output strategy is not custom_pleading.`);
  ok(got?.rendererStrategy === "custom_pleading", `${want.componentId}: renderer strategy is not custom_pleading.`);
  ok(got?.sourcePath === null && got?.sourceSha256 === null, `${want.componentId}: claims an official source.`);
  ok(got?.geographicScope === "statewide", `${want.componentId}: is not statewide.`);
  ok(
    WY_DESIGN_ROLE_TO_ENGINE_ROLE[want.designRole] === want.role,
    `${want.componentId}: the design role ${want.designRole} does not map to ${want.role}.`
  );
  ok(
    typeof got?.templateId === "string" &&
      Object.prototype.hasOwnProperty.call(WY_PLEADING_TEMPLATES, got.templateId),
    `${want.componentId}: names a template this module does not define.`
  );
});
ok(
  Object.keys(WY_DESIGN_ROLE_TO_ENGINE_ROLE).length === 4,
  "The design-role mapping no longer covers exactly the four assigned design roles."
);

for (const excluded of WY_EXCLUDED_COMPONENTS) {
  ok(
    actualComponents.every((c) => c.componentId !== `${excluded.trackId}${excluded.componentIdSuffix}`),
    `${excluded.trackId}: implements ${excluded.componentIdSuffix}, which is ${excluded.strategy}.`
  );
}
ok(
  WY_EXCLUDED_COMPONENTS.length === 1 && WY_EXCLUDED_COMPONENTS[0].strategy === "process_guidance",
  "The excluded filing-instructions component is not recorded as process guidance."
);
ok(
  /not filing-complete without it/.test(track.notes ?? ""),
  "The track notes do not record that the packet is incomplete without the process-guidance component."
);
note(
  `1. Assignment: exactly wy_nc_1401 and its ${EXPECTED_COMPONENT_COUNT} assigned custom-pleading components, each pinned to the packet-set manifest's component id, design role, engine role and order, with the count pinned independently of the render; the one process-guidance component on the track is recorded as excluded by strategy and is not implemented; wy_misd_1501 and wy_fel_1502 are neither assigned, implemented nor given a template, and the mixed-strategy gap is stated rather than papered over.`
);

// ---------------------------------------------------------------------------
// 2. Design boundaries on the face of every document
// ---------------------------------------------------------------------------

const templateSource = (id) => JSON.stringify(pleadingTemplate(id));
const petitionId = `${WY_NONCONVICTION_TRACK}-petition`;
const orderId = `${WY_NONCONVICTION_TRACK}-order`;
const verificationId = `${WY_NONCONVICTION_TRACK}-verification`;
const certificateId = `${WY_NONCONVICTION_TRACK}-certificate-of-service`;

const petitionSource = templateSource(petitionId);
const orderSource = templateSource(orderId);
const verificationSource = templateSource(verificationId);
const certificateSource = templateSource(certificateId);
const allSource = petitionSource + orderSource + verificationSource + certificateSource;

// 2a. Instruments the design excludes appear nowhere.
const EXCLUDED_INSTRUMENT_PATTERNS = [
  [/\bsummons\b/i, "a summons"],
  [/\bpraecipe\b/i, "a praecipe"],
  [/\bvictim\b/i, "a victim notice"],
  [/\bCasper\b/i, "a Casper Municipal Court form"],
  [/\bproof of service\b/i, "a completed proof of service"]
];
for (const [pattern, description] of EXCLUDED_INSTRUMENT_PATTERNS) {
  ok(!pattern.test(allSource), `A Wyoming template mentions ${description}, which the design excludes.`);
}
ok(WY_EXCLUDED_INSTRUMENTS.length === 11, `${WY_EXCLUDED_INSTRUMENTS.length} excluded instruments are recorded rather than 11.`);

// 2b. No statewide form is invented, and the drafted basis is on the face.
//
// The petition holds these as placeholders, so the assertion is made against
// the text the placeholder resolves to as well as against its presence. A
// template scan alone would pass on a placeholder that resolved to nothing.
const canonicalFacts = deriveWyomingFacts(WY_NONCONVICTION_TRACK, {
  arrestDate: "3 March 2024",
  arrestCounty: "Laramie",
  chargesFiled: "yes",
  caseNumber: "CR-2024-0417",
  courtName: "Laramie County Circuit Court",
  qualifyingDisposition: "dismissed_by_prosecutor",
  dispositionDate: "19 August 2024",
  deferredDisposition: "no",
  deferralToLesserCharge: "no",
  deferralUnderlyingLevel: "",
  pendingCharges: "no",
  dciRecordStatus: "yes"
});
ok(
  /\{\{wyNoStatewideFormStatement\}\}/.test(petitionSource),
  "The petition carries no statement about the absence of a statewide form."
);
ok(
  /Wyoming publishes no statewide petition form/.test(canonicalFacts.wyNoStatewideFormStatement),
  "The petition does not say that Wyoming publishes no statewide petition form."
);
ok(
  /invents none/.test(canonicalFacts.wyNoStatewideFormStatement),
  "The petition does not say that it invents no form number."
);
ok(
  !/\bform\s+(?:no\.?|number)\s+[A-Za-z0-9-]*\d/i.test(canonicalFacts.wyNoStatewideFormStatement),
  "The statement about the absence of a statewide form cites one."
);
// A form number is a token carrying a digit. "form number" as an English
// phrase is not one, and the petition uses that phrase to say there is none.
ok(
  !/\bform\s+(?:no\.?|number)\s+[A-Za-z0-9-]*\d/i.test(allSource),
  "A Wyoming document cites a statewide form number, and Wyoming publishes none."
);
ok(/\{\{wyLocalFormStatement\}\}/.test(petitionSource), "The petition carries no local-template statement.");
ok(/\{\{wyVenueStatement\}\}/.test(petitionSource), "The petition carries no venue statement.");

// 2c. The blocked tracks are not named as routes this packet produces.
ok(
  !/7-13-1501|7-13-1502/.test(allSource),
  "A Wyoming template names a conviction section that belongs to the blocked tracks."
);

// 2d. The proposed order is proposed, unmarked and unsigned.
const orderTemplate = pleadingTemplate(orderId);
ok(/proposed order/i.test(orderSource), "The order does not say it is proposed.");
ok(/granted by nobody and signed by nobody/.test(orderSource), "The order does not say it has been granted and signed by nobody.");
ok(/\(  \)/.test(orderSource), "The order has no unmarked finding box.");
ok(!/\(x\)|\(X\)|\[x\]|\[X\]/.test(orderSource), "The order carries a marked finding box.");
ok(
  /JUDGE OF THE ABOVE-ENTITLED COURT/.test(orderSource) && /Dated: _/.test(orderSource),
  "The order does not leave the judicial signature and date blank."
);
ok(orderTemplate.signatureLabel === null, "The proposed order carries a participant signature rule.");
ok(
  (orderTemplate.verification ?? "") === "",
  "The proposed order carries a verification, which belongs to a document the participant signs."
);
ok(orderTemplate.prayer.length === 0, "The proposed order carries a prayer, which belongs to the petition.");
ok(
  /be sealed/.test(orderSource) && /inspection only upon order of this Court/.test(orderSource),
  "The proposed order does not direct that the file be sealed and inspected only on order of the Court."
);
ok(
  /certified copy of this order be transmitted to the Wyoming Division of Criminal Investigation/.test(orderSource),
  "The proposed order does not direct transmittal of a certified copy to the Division of Criminal Investigation."
);

// 2e. The verification is the statutory one, signed by the petitioner alone.
const verificationTemplate = pleadingTemplate(verificationId);
const sworn = (verificationTemplate.sections ?? []).find((section) => section.heading === "VERIFICATION");
ok(
  sworn !== undefined && sworn.paragraphs.join(" ").length > 120,
  "The verification component carries no sworn verification."
);
// Carried as a section, not as the engine's `verification` field: the engine
// reserves a heading and the first line under it, but writes its own
// "VERIFICATION" heading with no such reservation, which stranded that heading
// at the foot of a page with the words it named overleaf.
ok(
  (verificationTemplate.verification ?? "") === "",
  "The verification component uses the engine's unreserved verification heading, which can be stranded at a page foot."
);
ok(
  /the statements in it are mine and are true/.test(JSON.stringify(sworn ?? {})),
  "The sworn verification does not adopt the statements in the petition."
);
ok(
  /required by the statute|requires the petition to be verified/i.test(verificationSource),
  "The verification component does not say the statute requires it."
);
ok(
  /final page of the Verified Petition/.test(verificationSource),
  "The verification component does not say it is executed as the final page of the petition."
);
ok(
  /Whether the clerk of the filing court requires the verification to be sworn before a notary is that court's own requirement/.test(
    verificationSource
  ),
  "The verification component asserts or denies a notarization requirement rather than sending the participant to the clerk."
);
ok(
  /LegalEase has administered no oath and witnessed no signature/.test(verificationSource),
  "The verification component does not disclaim administering the oath."
);
const petitionTemplate = pleadingTemplate(petitionId);
ok(
  (petitionTemplate.verification ?? "") === "",
  "The petition carries its own verification as well as the verification component, which puts two on one filing."
);
ok(
  /\{\{wyVerificationPageStatement\}\}/.test(petitionSource),
  "The petition does not tell the participant that the verification page is executed with it."
);

// 2f. The certificate of service is written entirely in the future.
ok(
  /Complete and sign this only after you have actually served/.test(certificateSource),
  "The certificate of service does not say it is completed only after service."
);
ok(
  /Until then it certifies nothing/.test(certificateSource),
  "The certificate of service does not say it certifies nothing until service is made."
);
ok(
  /Date of service: _/.test(certificateSource),
  "The certificate of service does not leave the date of service blank."
);
ok(
  !/I served|was served on|service was made on \d/.test(certificateSource.replace(/I certify that on the date written below I served/, "")),
  "The certificate of service states that service has already happened."
);
ok(
  /\{\{wyServiceRecipientStatement\}\}/.test(certificateSource),
  "The certificate of service does not name who is served."
);
ok(
  /No address is printed here/.test(certificateSource),
  "The certificate of service does not say that no address is printed."
);
ok(
  (pleadingTemplate(certificateId).certificateOfService ?? []).length === 0,
  "The certificate-of-service component also uses the engine's appended certificate block, which would print the heading twice."
);

// 2g. Money. The statutory fee is the only amount, and it is not a waiver.
const MONEY = /\$\s*\d[\d,]*(?:\.\d+)?/g;
const templateMoney = allSource.match(MONEY) ?? [];
ok(
  templateMoney.every((amount) => amount === "$0"),
  `A Wyoming template prints an amount other than the statutory $0: ${templateMoney.filter((a) => a !== "$0").join(", ")}`
);
const petitionFacts = pleadingTemplate(petitionId);
ok(/\{\{wyFeeStatement\}\}/.test(JSON.stringify(petitionFacts)), "The petition carries no fee statement.");
ok(
  !/fee (is|has been|was) waived|apply for a fee waiver|fee waiver (is )?available/i.test(allSource),
  "A Wyoming document offers or asserts a fee waiver, which the design does not establish."
);
note(
  "2. Design boundaries: no summons, praecipe, victim notice, completed proof of service or Casper form appears in any template; the petition states that Wyoming publishes no statewide form and cites no form number; the blocked conviction sections are named nowhere; the proposed order is marked proposed, carries only unmarked boxes, leaves the judicial signature and date blank, carries no participant signature rule and no prayer, and carries both the sealing and the transmittal directions; the statutory verification is its own component, is signed by the petitioner alone, sends the notarization question to the clerk and is not duplicated on the petition; the certificate of service is written entirely in the future and prints no address; and no amount other than the statutory $0 appears anywhere, with no fee waiver offered."
);

// ---------------------------------------------------------------------------
// 3. Normalizers, which are where a caption goes wrong
// ---------------------------------------------------------------------------

ok(
  captionCourtLine("Laramie County Circuit Court") === "LARAMIE COUNTY CIRCUIT COURT",
  "The caption court line does not carry the participant's own court name."
);
ok(
  captionCourtLine("In the District Court of the Ninth Judicial District") ===
    "DISTRICT COURT OF THE NINTH JUDICIAL DISTRICT",
  "The caption court line does not drop a leading \"in the\", which the template already supplies."
);
ok(
  !/COUNTY COUNTY/.test(captionCourtLine("Natrona County Circuit Court")),
  "The caption court line doubles a county."
);
ok(
  captionCourtLine("Sweetwater  County   Circuit Court") === "SWEETWATER COUNTY CIRCUIT COURT",
  "The caption court line does not collapse repeated whitespace."
);
ok(countyPhrase("Laramie") === "Laramie County", "A bare county name does not gain its noun.");
ok(countyPhrase("Laramie County") === "Laramie County", "A county name that already says County is doubled.");
ok(countyPhrase("laramie county") === "laramie County", "The county normalizer rewrites the participant's own spelling.");
note(
  "3. Normalizers: the caption carries the participant's own court name with nothing composed onto it — no county, judicial district or court level is appended — a leading \"in the\" is dropped because the template supplies one, and the county is said once rather than twice."
);

// ---------------------------------------------------------------------------
// 4. Fixtures
// ---------------------------------------------------------------------------

const base = (overrides = {}) => ({
  arrestDate: "3 March 2024",
  arrestCounty: "Laramie",
  chargesFiled: "yes",
  caseNumber: "CR-2024-0417",
  courtName: "Laramie County Circuit Court",
  qualifyingDisposition: "dismissed_by_prosecutor",
  dispositionDate: "19 August 2024",
  deferredDisposition: "no",
  deferralToLesserCharge: "no",
  deferralUnderlyingLevel: "",
  pendingCharges: "no",
  dciRecordStatus: "yes",
  ...overrides
});

const FIXTURES = [
  {
    fixtureId: "wy-1401-dismissed-by-prosecutor-1",
    trackId: WY_NONCONVICTION_TRACK,
    expectedComponents: EXPECTED_COMPONENT_COUNT,
    expectedRoles: "primary_filing,proposed_order,affidavit,certificate_of_service",
    expectedClock: "dismissal",
    expectedCaption: "criminal",
    answers: base()
  },
  {
    fixtureId: "wy-1401-no-charges-ever-filed-2",
    trackId: WY_NONCONVICTION_TRACK,
    variantOf: "wy-1401-dismissed-by-prosecutor-1",
    variantPurpose:
      "Where no charges were ever filed there is no existing criminal case, so the caption is not State of Wyoming versus a defendant at all: it is an in-the-matter caption with the participant as Petitioner, the case-number box is blank for the clerk to assign, and the statutory period runs from the arrest rather than from a dismissal that never happened. Caption, case-number line, charges allegation, disposition allegation, period allegation and the proposed order's period finding all change together.",
    materialBranch: "no charges ever filed — the in-the-matter caption, the unassigned case number and the arrest-date clock",
    exactBranchExercised: "chargesFiled=no with qualifyingDisposition=no_charges_filed",
    expectedComponents: EXPECTED_COMPONENT_COUNT,
    expectedRoles: "primary_filing,proposed_order,affidavit,certificate_of_service",
    expectedClock: "arrest",
    expectedCaption: "in_the_matter",
    answers: base({
      chargesFiled: "no",
      qualifyingDisposition: "no_charges_filed",
      caseNumber: "",
      dispositionDate: ""
    })
  },
  {
    fixtureId: "wy-1401-charged-but-not-convicted-3",
    trackId: WY_NONCONVICTION_TRACK,
    variantOf: "wy-1401-dismissed-by-prosecutor-1",
    variantPurpose:
      "The design runs the one-hundred-and-eighty-day period from the dismissal where charges were dismissed and from the arrest where charges were filed and did not result in a conviction. A charge that was tried and lost is therefore on a different clock from a charge the prosecutor dropped, and the period allegation, the proposed order's period finding and the disposition allegation all change even though the caption does not.",
    materialBranch: "a filed charge that ended without a conviction rather than by dismissal — the arrest-date clock inside a criminal caption",
    exactBranchExercised: "chargesFiled=yes with qualifyingDisposition=not_convicted",
    expectedComponents: EXPECTED_COMPONENT_COUNT,
    expectedRoles: "primary_filing,proposed_order,affidavit,certificate_of_service",
    expectedClock: "arrest",
    expectedCaption: "criminal",
    answers: base({ qualifyingDisposition: "not_convicted" })
  },
  {
    fixtureId: "wy-1401-repository-status-unknown-4",
    trackId: WY_NONCONVICTION_TRACK,
    variantOf: "wy-1401-dismissed-by-prosecutor-1",
    variantPurpose:
      "A Wyoming criminal history record exists only where an arrest fingerprint card was submitted, so a participant may have a court record with no repository record or the reverse. Where they do not know which, the petition carries the repository caveat and sends them to the Criminal Records Unit before filing, because that answer changes what the relief is worth rather than whether it is available. Only the repository allegation changes, and it changes on the participant's own answer.",
    materialBranch: "the participant does not know whether the arrest reached the state central repository",
    exactBranchExercised: "dciRecordStatus=no",
    expectedComponents: EXPECTED_COMPONENT_COUNT,
    expectedRoles: "primary_filing,proposed_order,affidavit,certificate_of_service",
    expectedClock: "dismissal",
    expectedCaption: "criminal",
    answers: base({ dciRecordStatus: "no" })
  }
];

const canonicalFixtures = FIXTURES.filter((f) => !f.variantOf);
ok(
  canonicalFixtures.length === 1 && canonicalFixtures[0].trackId === WY_NONCONVICTION_TRACK,
  `There are ${canonicalFixtures.length} canonical fixtures rather than exactly one per assigned track.`
);
for (const fixture of FIXTURES.filter((f) => f.variantOf)) {
  ok(
    typeof fixture.variantPurpose === "string" && fixture.variantPurpose.length > 80,
    `${fixture.fixtureId}: the variant does not state its purpose.`
  );
  ok(
    typeof fixture.materialBranch === "string" && fixture.materialBranch.length > 0,
    `${fixture.fixtureId}: no material branch named.`
  );
  ok(
    typeof fixture.exactBranchExercised === "string" && /=/.test(fixture.exactBranchExercised),
    `${fixture.fixtureId}: does not name the exact branch it exercises.`
  );
  ok(
    FIXTURES.some((f) => f.fixtureId === fixture.variantOf),
    `${fixture.fixtureId}: names a canonical fixture that does not exist.`
  );
}
const fixtureAnswers = () => canonicalFixtures[0].answers;

// The declared inputs and the echoed keys are one list.
const declaredInputs = track.requiredInputs.map((i) => i.key);
ok(
  declaredInputs.length === WY_TRACK_INPUT_KEYS[WY_NONCONVICTION_TRACK].length &&
    WY_TRACK_INPUT_KEYS[WY_NONCONVICTION_TRACK].every((k) => declaredInputs.includes(k)),
  "The declared inputs and the echoed keys have drifted apart."
);
ok(declaredInputs.length === 12, `The track declares ${declaredInputs.length} inputs rather than the design's 12.`);
for (const conditional of ["caseNumber", "dispositionDate", "deferralUnderlyingLevel"]) {
  ok(
    track.requiredInputs.find((i) => i.key === conditional)?.required === false,
    `${conditional} is declared unconditionally required, and the design asks it only on one branch.`
  );
}
// The design asks nothing about who the participant is, so the packet holds no
// name and no date of birth and prints blank rules for both. `courtName` is a
// question about a court, not about a person, and is deliberately not caught.
ok(
  !declaredInputs.some((k) =>
    /^(applicantName|petitionerName|fullLegalName|legalName|dateOfBirth|dob|socialSecurityNumber)$/i.test(k)
  ),
  "The module declares a participant-identity input the design does not ask for."
);
note(
  `4. Fixtures: 1 canonical fixture and ${FIXTURES.length - 1} variants, each naming its canonical fixture, its purpose, its material branch and the exact branch it exercises; the 12 declared inputs match the design exactly, the three conditional ones are declared conditional, and no identity question the design does not ask has been added.`
);

// ---------------------------------------------------------------------------
// 5. Negative cases
// ---------------------------------------------------------------------------

const NEGATIVE_CASES = [
  [{ deferredDisposition: "yes", deferralUnderlyingLevel: "misdemeanor" }, "wy-1401-deferral-misdemeanor"],
  [{ deferralToLesserCharge: "yes", deferralUnderlyingLevel: "misdemeanor" }, "wy-1401-deferral-misdemeanor"],
  [{ deferredDisposition: "yes", deferralUnderlyingLevel: "felony" }, "wy-1401-completed-felony-deferral"],
  [{ deferralToLesserCharge: "yes", deferralUnderlyingLevel: "felony" }, "wy-1401-completed-felony-deferral"],
  [{ deferredDisposition: "yes" }, "wy-1401-deferral-level-not-established"],
  [{ deferralToLesserCharge: "yes" }, "wy-1401-deferral-level-not-established"],
  [{ pendingCharges: "yes" }, "wy-1401-charges-pending"],
  [{ chargesFiled: "no", qualifyingDisposition: "dismissed_by_court" }, "wy-1401-disposition-contradicts-charges"],
  [{ chargesFiled: "yes", qualifyingDisposition: "no_charges_filed" }, "wy-1401-disposition-contradicts-charges"],
  [{ caseNumber: "" }, "wy-1401-case-number-not-established"],
  [{ dispositionDate: "" }, "wy-1401-disposition-date-not-established"],
  [{ courtName: "" }, "wy-answer-missing"],
  [{ arrestDate: "" }, "wy-answer-missing"],
  [{ arrestCounty: "" }, "wy-answer-missing"],
  [{ qualifyingDisposition: "" }, "wy-answer-missing"],
  [{ pendingCharges: "" }, "wy-answer-missing"],
  [{ deferredDisposition: "" }, "wy-answer-missing"]
];

const seenStops = new Set();
for (const [override, expectedStop] of NEGATIVE_CASES) {
  let thrown = null;
  try {
    deriveWyomingFacts(WY_NONCONVICTION_TRACK, { ...fixtureAnswers(), ...override });
  } catch (error) {
    thrown = error;
  }
  const label = JSON.stringify(override);
  ok(thrown instanceof WyomingEligibilityStopError, `${label}: did not fail closed, it produced ${thrown?.name ?? "no error"}.`);
  if (!(thrown instanceof WyomingEligibilityStopError)) continue;
  ok(thrown.stopId === expectedStop, `${label}: stopped as ${thrown.stopId} rather than ${expectedStop}.`);
  ok(thrown.message.length > 80, `${thrown.stopId}: the stop gives no reason.`);
  ok(typeof thrown.destination === "string" && thrown.destination.length > 20, `${thrown.stopId}: no destination.`);
  ok(typeof thrown.nextStep === "string" && thrown.nextStep.length > 20, `${thrown.stopId}: no next step.`);
  ok(WY_REFERRALS.includes(thrown.destination), `${thrown.stopId}: the destination is not a declared referral.`);
  ok(
    !thrown.destination.includes(WY_NONCONVICTION_TRACK) && !thrown.nextStep.includes(WY_NONCONVICTION_TRACK),
    `${thrown.stopId}: routes back to its own track as the solution.`
  );
  ok(
    !/^\s*(Run|Try) (the packet|this) again\.?\s*$/i.test(thrown.nextStep),
    `${thrown.stopId}: the next step is to run the same route again, which is circular.`
  );
  seenStops.add(thrown.stopId);
}
// 8 = the misdemeanour-deferral route, the completed felony deferral, the
// unestablished deferral level, pending charges, the charges-and-disposition
// contradiction, the unestablished case number, the unestablished disposition
// date, and the missing-answer stop.
ok(seenStops.size === 8, `${seenStops.size} distinct typed stops fired rather than the 8 the design declares.`);

// The felony-deferral stop says the honest thing the decision record requires:
// nothing reaches it, and correction is not expungement.
let felonyStop = null;
try {
  deriveWyomingFacts(WY_NONCONVICTION_TRACK, {
    ...fixtureAnswers(),
    deferredDisposition: "yes",
    deferralUnderlyingLevel: "felony"
  });
} catch (error) {
  felonyStop = error;
}
ok(
  /nothing in Wyoming clears the record of a completed felony deferral/i.test(felonyStop?.message ?? ""),
  "The completed-felony-deferral stop does not say that nothing reaches it."
);
ok(
  /correction rather than expungement/i.test(felonyStop?.message ?? ""),
  "The completed-felony-deferral stop does not distinguish correction from expungement."
);
ok(
  !/7-19-109/.test(felonyStop?.message ?? ""),
  "The completed-felony-deferral stop cites the correction section as though it were a fourth Wyoming track."
);

// The misdemeanour-deferral stop routes onward without producing the blocked
// track's packet.
let misdemeanourStop = null;
try {
  deriveWyomingFacts(WY_NONCONVICTION_TRACK, {
    ...fixtureAnswers(),
    deferredDisposition: "yes",
    deferralUnderlyingLevel: "misdemeanor"
  });
} catch (error) {
  misdemeanourStop = error;
}
ok(
  /this packet does not produce a petition under it/i.test(misdemeanourStop?.message ?? ""),
  "The misdemeanour-deferral stop implies this packet produces the blocked track's petition."
);

let branchRejections = 0;
for (const [key, value] of [
  ["chargesFiled", "possibly"],
  ["pendingCharges", "maybe"],
  ["deferredDisposition", "sort of"],
  ["deferralToLesserCharge", "unknown"],
  ["dciRecordStatus", "unsure"],
  ["qualifyingDisposition", "convicted"],
  ["deferralUnderlyingLevel", "citation"]
]) {
  const answers = { ...fixtureAnswers(), [key]: value };
  if (key === "deferralUnderlyingLevel") answers.deferredDisposition = "yes";
  try {
    deriveWyomingFacts(WY_NONCONVICTION_TRACK, answers);
    ok(false, `${key}: the out-of-list answer "${value}" was accepted.`);
  } catch (error) {
    ok(error instanceof WyomingBranchError, `${key}: the out-of-list answer "${value}" produced ${error?.name}.`);
    branchRejections += 1;
  }
}
ok(
  Object.keys(WY_YES_NO).length === 2 &&
    Object.keys(WY_QUALIFYING_DISPOSITIONS).length === 4 &&
    Object.keys(WY_DEFERRAL_LEVELS).length === 2,
  "A closed list changed size."
);
for (const excluded of WY_EXCLUDED_TRACK_IDS) {
  try {
    deriveWyomingFacts(excluded, fixtureAnswers());
    ok(false, `The blocked track ${excluded} was accepted by the fact deriver.`);
  } catch (error) {
    ok(error instanceof WyomingBranchError, `The blocked track ${excluded} produced ${error?.name}.`);
  }
}
note(
  `5. Stops: ${NEGATIVE_CASES.length} negative cases fail closed across ${seenStops.size} typed-stop families, each carrying a reason, a named declared destination and a non-circular next step, and none routing back into wy_nc_1401; the completed-felony-deferral stop says plainly that nothing reaches it and that correction is not expungement without opening a fourth track; ${branchRejections} out-of-list answers rejected; three closed lists hold their size; and both blocked tracks are refused outright by the fact deriver.`
);

// ---------------------------------------------------------------------------
// 6. Rendered content, read page by page
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/\byou are eligible\b|\bwill be granted\b|\byou will succeed\b/i, "a prediction or an eligibility assertion"],
  [/\bwe have (reviewed|verified|confirmed)\b/i, "a claim that LegalEase reviewed or verified records"],
  [/\bon your behalf we (filed|served|sent)\b/i, "a claim that LegalEase filed, served or sent"],
  [/\b(the )?(prosecuting attorney|prosecutor) (has agreed|does not object|will not oppose|has not objected)\b/i, "an assertion about the prosecuting attorney's position"],
  [/\byour record (is|will be) clear\b/i, "a promise about the result"],
  [/\bthe (court|judge) has (found|granted|ordered|entered|signed)\b/i, "a claim that the court has acted"],
  [/\b(a|the) hearing (was|has been) (held|scheduled|set)\b/i, "a claim about a hearing"],
  [/\bDivision of Criminal Investigation (has|have|will) (act|acted|expunge|expunged|delete|deleted|remove|removed|process|processed)\b/i, "a claim that the Division of Criminal Investigation has acted"],
  [/\bthe clerk (has|will have) (filed|entered|certified)\b/i, "a claim that the clerk has acted"],
  [/\bthis (petition|packet) (was|has been) filed\b/i, "a claim that something has been filed"],
  [/\b\d+\s*days?\b/i, "a numeral deadline the design places in the excluded instructions sheet"]
];

function renderedPages(bytes) {
  const buffer = Buffer.from(bytes);
  const pages = [];
  let cursor = 0;
  while (cursor < buffer.length) {
    const start = buffer.indexOf("stream", cursor);
    if (start === -1) break;
    let from = start + 6;
    if (buffer[from] === 13) from += 1;
    if (buffer[from] === 10) from += 1;
    const end = buffer.indexOf("endstream", from);
    if (end === -1) break;
    cursor = end + 9;
    let inflated = null;
    try {
      inflated = zlib.inflateSync(buffer.subarray(from, end)).toString("latin1");
    } catch {
      continue;
    }
    if (!/\bTm\b/.test(inflated)) continue;
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
    if (runs.length === 0) continue;
    const byLine = new Map();
    for (const run of runs) {
      const key = Math.round(run.y);
      if (!byLine.has(key)) byLine.set(key, []);
      byLine.get(key).push(run);
    }
    pages.push(
      [...byLine.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, group]) => group.sort((a, b) => a.x - b.x).map((r) => r.text).join("   ").trim())
    );
  }
  return pages;
}

/**
 * Every line that is a heading for whatever follows it.
 *
 * The engine writes two headings of its own — "VERIFICATION" above a
 * `verification` field and "CERTIFICATE OF SERVICE" above a
 * `certificateOfService` block — and reserves no room for the line under
 * either. They are counted here so that a heading stranded at the foot of a
 * page is caught whichever of the two writes it.
 */
function headingLines(template) {
  const set = new Set();
  for (const section of template.sections ?? []) if (section.heading) set.add(section.heading);
  if (template.verification) set.add("VERIFICATION");
  if ((template.certificateOfService ?? []).length > 0) set.add("CERTIFICATE OF SERVICE");
  return set;
}

const isFillInRule = (line) => /^[_\s§)(]+$/.test(line) || /_{10,}/.test(line);

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveWyomingFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "WY",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);
  ok(
    resolved.components.length === fixture.expectedComponents,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than the pinned ${fixture.expectedComponents}.`
  );

  const echoedKeys = new Set(WY_TRACK_INPUT_KEYS[fixture.trackId] ?? []);
  for (const [key, value] of Object.entries(facts)) {
    if (typeof value !== "string" || echoedKeys.has(key)) continue;
    ok(
      !/\bundefined\b|\bNaN\b|\[object Object\]|\{\{|^\s*(true|false)\s*$/.test(value),
      `${fixture.fixtureId}: derived fact ${key} carries a leaked placeholder or a raw boolean: ${value}`
    );
  }

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "WY",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);
    ok(
      !output.warnings.some((warning) => /absent values/i.test(warning)),
      `${fixture.fixtureId}/${component.componentId}: rendered a fill-in rule for a placeholder that had no value: ${output.warnings.join(" | ")}`
    );

    const again = await renderPacketComponent({
      component,
      jurisdiction: "WY",
      geography: null,
      facts,
      rootDir: root
    });
    ok(sha(output.bytes) === sha(again.bytes), `${component.componentId}: rendering is not deterministic.`);

    const template = pleadingTemplate(component.templateId);
    const pages = renderedPages(output.bytes);
    const headings = headingLines(template);
    ok(
      pages.length === (output.pageCount ?? 0),
      `${fixture.fixtureId}/${component.componentId}: ${pages.length} content streams for ${output.pageCount} pages.`
    );
    pages.forEach((lines, pageIndex) => {
      const written = lines.filter((line) => line.length > 0);
      ok(written.length > 0, `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} is blank.`);
      ok(
        written.some((line) => !isFillInRule(line)),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} carries nothing but rules.`
      );
      const last = written[written.length - 1];
      ok(
        pageIndex === pages.length - 1 || !headings.has(last),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} ends on the heading "${last}".`
      );
      ok(
        written.every((line) => line.length < 220),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} carries an over-long line.`
      );
      written.forEach((line) => {
        ok(
          !/\bundefined\b|\bNaN\b|\[object Object\]|\{\{/.test(line),
          `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} prints a leaked placeholder: ${line}`
        );
        for (const [pattern, description] of PROHIBITED) {
          ok(
            !pattern.test(line),
            `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} contains ${description}: ${line}`
          );
        }
      });
    });

    // The execution block is one unit. A proposed order whose judicial
    // signature line sits on a page carrying none of the words that identify
    // what is being signed is the failure this guards against, so where the
    // block starts a page every line of it has to be on that page too.
    const executionLines = [
      ...(template.signatureLabel === null ? [] : [template.signatureLabel]),
      ...template.signatureBlock
    ]
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !isFillInRule(line))
      .map((line) => line.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "").trim().slice(0, 40))
      .filter((line) => line.length > 8);
    const executionPages = new Set();
    executionLines.forEach((fragment) => {
      pages.forEach((lines, pageIndex) => {
        if (lines.some((line) => line.includes(fragment))) executionPages.add(pageIndex);
      });
    });
    ok(
      executionPages.size <= 1,
      `${fixture.fixtureId}/${component.componentId}: the execution block is split across pages ${[...executionPages].map((p) => p + 1).join(" and ")}.`
    );

    const allLines = pages.flat().filter((line) => line.length > 12 && !isFillInRule(line));
    for (let i = 1; i < allLines.length; i += 1) {
      ok(
        allLines[i] !== allLines[i - 1],
        `${fixture.fixtureId}/${component.componentId}: the line "${allLines[i].slice(0, 60)}..." is rendered twice in succession.`
      );
    }

    const allText = pages.flat().join(" ");
    const money = allText.match(MONEY) ?? [];
    ok(
      money.every((amount) => amount === "$0"),
      `${fixture.fixtureId}/${component.componentId}: prints an amount other than $0: ${money.join(", ")}`
    );
    ok(
      !/\bCasper\b|\bsummons\b|\bpraecipe\b|\bvictim\b|7-13-1501|7-13-1502/i.test(allText),
      `${fixture.fixtureId}/${component.componentId}: prints an excluded instrument or a blocked track's section.`
    );

    // The caption carries the participant's own court, with nothing composed on.
    ok(
      pages[0].join(" ").toUpperCase().includes(`IN THE ${facts.wyCourtLine}`),
      `${fixture.fixtureId}/${component.componentId}: the caption does not name ${facts.wyCourtLine}.`
    );
    if (fixture.expectedCaption === "criminal") {
      ok(
        allText.includes(facts.caseNumber),
        `${fixture.fixtureId}/${component.componentId}: the case number is not carried through.`
      );
      ok(
        pages[0].join(" ").includes("STATE OF WYOMING"),
        `${fixture.fixtureId}/${component.componentId}: the criminal caption does not name the State as plaintiff.`
      );
    } else {
      ok(
        pages[0].join(" ").includes("IN THE MATTER OF THE EXPUNGEMENT"),
        `${fixture.fixtureId}/${component.componentId}: the no-case caption is not an in-the-matter caption.`
      );
      ok(
        !pages[0].join(" ").includes("Defendant."),
        `${fixture.fixtureId}/${component.componentId}: the no-case caption names a defendant in a case that does not exist.`
      );
    }

    // The numbered allegations run 1..n without a gap or a repeat.
    if (component.role === "primary_filing") {
      // The writer collapses the run of spaces after the numeral when it wraps,
      // so the marker is one number, a full stop and a single space.
      const numbers = pages
        .flat()
        .map((line) => line.match(/^(\d{1,2})\.\s/))
        .filter(Boolean)
        .map((match) => Number(match[1]));
      ok(
        numbers.length === 8 && numbers.every((value, index) => value === index + 1),
        `${fixture.fixtureId}: the numbered allegations render as ${numbers.join(",")} rather than 1..8.`
      );

      // Two consecutive allegations that say the same thing in different words
      // survive a duplicate-line test and still read as a drafting error to a
      // judge. Word overlap catches the restatement that exact comparison
      // misses: the no-charges branch once alleged that no charges were filed
      // in paragraph three and again in paragraph four.
      const flat = pages.flat().join(" ");
      const allegations = [];
      for (let n = 1; n <= 8; n += 1) {
        const from = flat.indexOf(`${n}. `);
        const to = n === 8 ? flat.indexOf("II. WHAT THIS PETITION") : flat.indexOf(`${n + 1}. `);
        if (from >= 0 && to > from) allegations.push(flat.slice(from, to));
      }
      ok(allegations.length === 8, `${fixture.fixtureId}: only ${allegations.length} allegations could be read back.`);
      const words = (text) =>
        new Set(
          text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((word) => word.length > 2)
        );
      for (let a = 0; a < allegations.length; a += 1) {
        for (let b = a + 1; b < allegations.length; b += 1) {
          const left = words(allegations[a]);
          const right = words(allegations[b]);
          const shared = [...left].filter((word) => right.has(word)).length;
          const overlap = shared / new Set([...left, ...right]).size;
          ok(
            overlap < 0.55,
            `${fixture.fixtureId}: allegations ${a + 1} and ${b + 1} restate each other (${Math.round(overlap * 100)}% of their words are shared).`
          );
        }
      }
    }

    // A proposed order never carries the participant's execution block.
    if (component.role === "proposed_order") {
      ok(
        !/Petitioner, self-represented/.test(allText),
        `${fixture.fixtureId}: the proposed order carries the participant's signature rule.`
      );
      ok(
        !/\(x\)|\(X\)/.test(allText),
        `${fixture.fixtureId}: the proposed order carries a marked finding box.`
      );
      ok(
        /JUDGE OF THE ABOVE-ENTITLED COURT/.test(allText),
        `${fixture.fixtureId}: the proposed order has no blank judicial signature line.`
      );
    }

    renderedComponents += 1;
    inspectedPages += pages.length;
    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: output.bytes
    });
  }

  ok(
    assemblyComponents.map((c) => c.role).join(",") === fixture.expectedRoles,
    `${fixture.fixtureId}: the assembled role order is ${assemblyComponents.map((c) => c.role).join(",")}.`
  );

  const assembled = await assemblePacketPdf({
    jurisdiction: "WY",
    jurisdictionName: "Wyoming",
    packetName: resolved.assembledPacketName ?? `${fixture.trackId}-packet`,
    caseReference: facts.packetCaseReference,
    title: resolved.assembledPacketTitle ?? fixture.trackId,
    components: assemblyComponents
  });
  ok((assembled.pageCount ?? 0) > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    sampleRole: fixture.variantOf ? "variant" : "canonical",
    components: assemblyComponents.length,
    pages: renderedPages(assembled.bytes).length,
    sha256: sha(assembled.bytes)
  });
}

note(
  `6. Rendering: ${renderedComponents} components across ${results.length} packets render deterministically as PDFs; ${inspectedPages} pages read line by line with no blank page, no page of rules alone, no stranded heading, no paragraph rendered twice in succession, no over-long line, no leaked placeholder, no fill-in rule standing in for an absent value and no prohibited content; the numbered allegations run 1..8 in every petition; every caption carries the participant's own court and takes its shape from whether a case exists; and no proposed order carries a participant execution block or a marked box.`
);

// ---------------------------------------------------------------------------
// 7. Values carried through
// ---------------------------------------------------------------------------

const canonical = results.find((r) => r.fixtureId === canonicalFixtures[0].fixtureId);
for (const variant of results.filter((r) => r.sampleRole === "variant")) {
  ok(
    canonical.sha256 !== variant.sha256,
    `${variant.fixtureId} assembles to the same bytes as its canonical fixture, so it tests nothing.`
  );
}
const variantHashes = new Set(results.map((r) => r.sha256));
ok(variantHashes.size === results.length, "Two fixtures assemble to identical bytes.");

const dismissedFacts = deriveWyomingFacts(WY_NONCONVICTION_TRACK, fixtureAnswers());
const noChargesFacts = deriveWyomingFacts(
  WY_NONCONVICTION_TRACK,
  FIXTURES.find((f) => f.fixtureId === "wy-1401-no-charges-ever-filed-2").answers
);
const notConvictedFacts = deriveWyomingFacts(
  WY_NONCONVICTION_TRACK,
  FIXTURES.find((f) => f.fixtureId === "wy-1401-charged-but-not-convicted-3").answers
);
const unknownRepositoryFacts = deriveWyomingFacts(
  WY_NONCONVICTION_TRACK,
  FIXTURES.find((f) => f.fixtureId === "wy-1401-repository-status-unknown-4").answers
);

// The clock. A dismissal runs from the dismissal date; everything else from
// the arrest, and the proposed order's finding follows the same branch.
ok(
  /since the date the charges were dismissed/.test(dismissedFacts.wyWaitingPeriodStatement) &&
    dismissedFacts.wyWaitingPeriodStatement.includes(fixtureAnswers().dispositionDate),
  "The dismissal branch does not run the statutory period from the dismissal date."
);
ok(
  /since the arrest/.test(noChargesFacts.wyWaitingPeriodStatement) &&
    noChargesFacts.wyWaitingPeriodStatement.includes(fixtureAnswers().arrestDate),
  "The no-charges branch does not run the statutory period from the arrest."
);
ok(
  /since the arrest/.test(notConvictedFacts.wyWaitingPeriodStatement),
  "The charged-but-not-convicted branch does not run the statutory period from the arrest."
);
ok(
  /since the date the charges were dismissed/.test(dismissedFacts.wyOrderPeriodFinding) &&
    /since the date of the arrest/.test(noChargesFacts.wyOrderPeriodFinding),
  "The proposed order's period finding does not follow the same branch as the petition's allegation."
);
for (const facts of [dismissedFacts, noChargesFacts, notConvictedFacts, unknownRepositoryFacts]) {
  ok(
    /computes no period/.test(facts.wyWaitingPeriodStatement),
    "A period allegation does not say that the packet computes no period."
  );
  ok(
    /for the Court on the record before it/.test(facts.wyWaitingPeriodStatement),
    "A period allegation does not leave the elapsed period to the Court."
  );
}

// The caption follows whether a case exists.
ok(
  dismissedFacts.wyCaptionPartyLine1 === "STATE OF WYOMING," && dismissedFacts.wyCaptionPartyLine5 === "Defendant.",
  "The criminal caption is not State of Wyoming versus a defendant."
);
ok(
  /IN THE MATTER OF THE EXPUNGEMENT/.test(noChargesFacts.wyCaptionPartyLine1) &&
    noChargesFacts.wyCaptionPartyLine4 === "Petitioner.",
  "The no-case caption is not an in-the-matter caption naming a petitioner."
);
ok(
  dismissedFacts.wyCaptionCaseNumberLine === `Case No. ${fixtureAnswers().caseNumber}`,
  "The criminal caption does not carry the participant's own case number."
);
ok(
  /Case No\. _+$/.test(noChargesFacts.wyCaptionCaseNumberLine) &&
    /assigned by the clerk/i.test(noChargesFacts.wyCaptionCaseNumberNote),
  "The no-case caption does not leave the case number for the clerk to assign."
);
ok(
  noChargesFacts.packetCaseReference === "New matter, no case number assigned",
  "The no-case packet reference invents a case number."
);

// The repository caveat follows the participant's own answer, and it is
// addressed to them before filing rather than pleaded: "I know whether my
// record shows this" is not an allegation a court can act on.
ok(
  /do not know whether this arrest reached the state central repository/.test(
    unknownRepositoryFacts.wyRepositoryStatement
  ) && /Request a personal criminal history record/.test(unknownRepositoryFacts.wyRepositoryStatement),
  "The unknown-repository branch does not carry the repository caveat and the referral to the Criminal Records Unit."
);
ok(
  !/do not know whether this arrest reached/.test(dismissedFacts.wyRepositoryStatement),
  "The known-repository branch carries the caveat meant for the unknown branch."
);
ok(
  dismissedFacts.wyRepositoryStatement !== unknownRepositoryFacts.wyRepositoryStatement,
  "The repository statement does not follow the participant's answer at all."
);
ok(
  !/wyRepositoryStatement/.test(JSON.stringify(pleadingTemplate(petitionId).sections?.[2] ?? {})),
  "The repository statement is pleaded as a numbered allegation rather than addressed to the participant."
);
ok(
  /records the Petitioner asks the Court to expunge/.test(dismissedFacts.wyRecordsSoughtStatement) &&
    /no federal, tribal or out-of-state record/.test(dismissedFacts.wyRecordsSoughtStatement),
  "The petition does not identify the records it reaches, or does not exclude the records it cannot reach."
);

// The fee is the statute setting none, not a waiver.
ok(/\$0/.test(dismissedFacts.wyFeeStatement), "The fee statement does not state the statutory $0.");
ok(
  /not a fee that anyone has waived/.test(dismissedFacts.wyFeeStatement),
  "The fee statement does not say that $0 is the statute rather than a waiver."
);
ok(
  /Copying charges, certification charges, postage and record-retrieval charges are separate/.test(
    dismissedFacts.wyFeeStatement
  ),
  "The fee statement does not separate the statutory fee from the other charges."
);

// Service.
ok(
  /prosecuting attorney is the party served/.test(dismissedFacts.wyServiceRecipientStatement),
  "The service statement does not name the prosecuting attorney as the recipient."
);
ok(
  /Division of Criminal Investigation is not a service recipient/.test(dismissedFacts.wyServiceRecipientStatement),
  "The service statement does not exclude the Division of Criminal Investigation."
);

// No answer reaches a sentence as a bare word.
for (const [key, value] of Object.entries(dismissedFacts)) {
  if ((WY_TRACK_INPUT_KEYS[WY_NONCONVICTION_TRACK] ?? []).includes(key)) continue;
  ok(
    typeof value !== "string" || !/^\s*(yes|no|misdemeanor|felony|not_convicted|no_charges_filed|dismissed_by_prosecutor|dismissed_by_court)\s*$/i.test(value),
    `An answer reached the fact ${key} as a bare word: ${value}`
  );
}
note(
  "7. Values: the statutory period runs from the dismissal on a dismissal and from the arrest on every other qualifying disposition, and the proposed order's finding follows the same branch; every period allegation says the packet computes none and leaves the elapsed period to the Court; the caption is State of Wyoming versus a defendant where a case exists and an in-the-matter caption with the case number left for the clerk where none does; the repository caveat follows the participant's own answer; the fee is stated as the statute setting $0 rather than as a waiver and is separated from copying, certification, postage and record-retrieval charges; the prosecuting attorney is the service recipient and the Division of Criminal Investigation is not; all four packets assemble to distinct bytes; and no answer reaches a sentence as a bare word."
);

// ---------------------------------------------------------------------------
// 8. Runtime
// ---------------------------------------------------------------------------

for (const entry of WY_CUSTOM_PLEADING_TRACKS) {
  ok(entry.statuses.runtime === "runtime_disabled", `${entry.trackId}: runtime status is ${entry.statuses.runtime}.`);
  ok(entry.statuses.legal === "not_submitted", `${entry.trackId}: legal status is ${entry.statuses.legal}.`);
  ok(entry.statuses.visual === "not_reviewed", `${entry.trackId}: visual status is ${entry.statuses.visual}.`);
  ok(entry.statuses.technical === "renderer_ready", `${entry.trackId}: technical status is ${entry.statuses.technical}.`);
  ok(entry.runtimeDisabled === true, `${entry.trackId}: is not runtime-disabled.`);
  ok(entry.technicalFixture === true, `${entry.trackId}: is not marked a technical fixture.`);
  for (const component of entry.packetSet.components) {
    ok(
      component.approval.legal === "not_submitted" && component.approval.visual === "not_reviewed",
      `${component.componentId}: carries an approval it has not received.`
    );
  }
}
ok(
  WY_OPEN_RELEASE_BLOCKERS === 1,
  `The module records ${WY_OPEN_RELEASE_BLOCKERS} open release blockers rather than the one the track carries.`
);
note(
  "8. Runtime: the track is runtime-disabled, legally unsubmitted and visually unreviewed, every component carries an approval it has not received, and the open release blocker on unpublished local filing preferences is declared so readiness cannot be reached by an implementation alone."
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Wyoming custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wyoming custom-pleading verification passed.");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
const width = Math.max(...results.map((r) => r.fixtureId.length));
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(width)}  ${result.trackId.padEnd(12)} ${result.sampleRole.padEnd(9)}  ${result.components} components  ${String(result.pages).padStart(2)} pages  sha256=${result.sha256}`
  );
}
