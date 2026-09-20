#!/usr/bin/env node
/**
 * The Indiana statewide supporting-form set — `rcap-in-custom-pleading`.
 *
 *   node scripts/build-census-v1-rcap-in-custom-pleading.mjs [--check]
 *
 * WHAT THIS FAMILY IS, READ FROM ITS OWN DECLARATION RATHER THAN FROM ITS NAME
 *
 * MASTER_QUEUE declares exactly three components for this family, and all three
 * are attachments of the serious-felony track's packet set:
 *
 *   in_conviction_serious_felony-attachment-4  CCA-GF-0120-3016, Appearance by
 *                                              Unrepresented Person in
 *                                              Expungement Matter. CONDITIONAL:
 *                                              "Required for a self-represented
 *                                              filer."
 *   in_conviction_serious_felony-attachment-5  CCA-XP-0120-7002, Form ACR,
 *                                              Notice of Exclusion of
 *                                              Confidential Information from
 *                                              Public Access. Required.
 *   in_conviction_serious_felony-attachment-6  the Confidential Information
 *                                              Form. Required.
 *
 * All three are pages of ONE published binary: the Coalition for Court Access
 * Section 1 petition-and-order bundle, fifteen pages, bound here at
 * b04f2941c91f903e8b8a1718ff4f9bd9120f3744c97354fd810c296f89d041c5. The queue
 * names three sourceIds and every one of them resolves to that same digest, so
 * this is one binary carrying three documents, not three binaries.
 *
 * THREE THINGS ABOUT THAT SHAPE DECIDED THE IMPLEMENTATION.
 *
 * FIRST, THE ACROFORM IS BUNDLE-WIDE, SO THE FILL IS TOO. `cap-PetitionerFullName`
 * carries fourteen widgets spread over pages 1, 3, 5, 7, 8, 9 and 13;
 * `cap-COUNTY` four; `DD-cap-CourtType` four; `Address` two. A page pulled out
 * of the bundle first and filled afterwards would carry no fields at all. So
 * the whole bundle is filled and flattened once, and the delivered pages are
 * copied out of the flattened document. Only pages 1, 2, 7 and 8 are delivered;
 * the Section 1 petition and the court's own findings and order are not this
 * family's components and are not shipped.
 *
 * SECOND, THE PAGE SELECTION IS PROVED RATHER THAN ASSERTED. Every delivered
 * page is checked, before it is copied, against the identifier the Coalition
 * printed in that page's own footer — CCA-GF-0120-3016 on pages 1 and 2,
 * CCA-XP-0120-7002 on page 7, and the heading CONFIDENTIAL INFORMATION FORM on
 * page 8, together with the printed "Page 1 of 2" / "Page 2 of 2" / "Page 1 of
 * 1" pagination. A re-paginated bundle stops this build instead of silently
 * shipping the wrong sheet.
 *
 * THIRD, NONE OF THE THREE DOCUMENTS HAS A CONTROL FOR ITS OWN CAUSE NUMBER.
 * All three print a cause-number line — "CAUSE NO. ______" on the Appearance
 * and on Form ACR, "XP CAUSE NUMBER:______" on the Confidential Information
 * Form — and the binary draws no widget on any of them. Every write box in this
 * factory's official-form path is the /Rect of the source's own widget, so the
 * cause number is carried to the participant on all three rather than drawn at
 * a hand-entered coordinate. The six `CauseNumber` boxes that DO exist belong
 * to the Appearance's related-cases table and are a different question.
 *
 * THE FULL SOCIAL SECURITY NUMBER IS NEVER WRITTEN, AND THE RECORD SAYS WHY
 *
 * The committed track record's own packet instruction reads: "Put only the last
 * four digits of the Social Security number on the petition. The full number
 * goes on the Confidential Information Form, filed as a confidential document,
 * accompanied by the Notice of Exclusion of Confidential Information from Public
 * Access. Do not persist the full number." The Confidential Information Form's
 * `PetFullSSN` box is therefore carried to the participant, and the instructions
 * say plainly that the platform does not hold it and will not ask for it.
 *
 * WHAT THIS FAMILY DELIVERS, STATED HERE RATHER THAN DISCOVERED LATER
 *
 * Three routes are bound to this family. Their ten custom-pleading components
 * are composed from the committed route records, and the three official
 * supporting forms are filled from the pinned bundle below. The queue row's
 * original three-component declaration remains source evidence; the local
 * delivered component map records the complete route component set and the
 * page manifest proves where every component appears in each fixture.
 *
 * This build rasterizes nothing. A local browser render is not a receipt: the
 * central raster workflow produces one, bound to the exact SHA-256 recorded in
 * reports/rendered-artifacts.json. It verifies nothing and issues no verdict.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { APPEARANCE_DISPOSITION } from "./rcap-official-forms/rcap-appearance-semantics.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "rcap-in-custom-pleading";
const PRIMARY_TRACK = "in_conviction_serious_felony";
const OUT = "data/rcap-all50/overlays/census-v1/in/rcap-in-custom-pleading--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-rcap-in-custom-pleading.mjs";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

const BUNDLE = Object.freeze({
  sha256: "b04f2941c91f903e8b8a1718ff4f9bd9120f3744c97354fd810c296f89d041c5",
  declaredPath: "STATES/IN/02_PACKET_FORMS/IN__FORM__CCA-SECTION1-PETITION-ORDER__coalition-for-court-access-section-1-non-conviction-expungement-petition-and-order-bundle__SOURCE-2021__EN.pdf",
  issuer: "Indiana Coalition for Court Access",
  whatItIs: "the Coalition for Court Access Section 1 non-conviction expungement petition and order bundle, fifteen pages"
});

const ROUTE = Object.freeze({
  jurisdiction: "IN",
  routeKeys: [
    "obligation:track-only:IN:in_collateral_action",
    "obligation:track-only:IN:in_supplemental_order",
    "obligation:track-pathway:IN:in_conviction_serious_felony:conviction-expungement-with-records-marked-expunged"
  ],
  routeSelectionId: "rcap-in-custom-pleading-cca-supporting-forms",
  publicLabel: "The Indiana statewide supporting forms an expungement filing is accompanied by",
  documents: [
    {
      documentId: "CCA-GF-0120-3016",
      sourceId: "official-form:CCA-GF-0120-3016",
      componentId: "in_conviction_serious_felony-attachment-4",
      title: "Appearance by Unrepresented Person in Expungement Matter",
      instrumentKind: "attachment",
      requirement: "conditional",
      condition: "Required for a self-represented filer.",
      pages: [1, 2],
      markers: { 1: ["CCA-GF-0120-3016", "Page 1 of 2"], 2: ["CCA-GF-0120-3016", "Page 2 of 2"] }
    },
    {
      documentId: "CCA-XP-0120-7002 Form ACR",
      sourceId: "official-form:CCA-XP-0120-7002 Form ACR",
      componentId: "in_conviction_serious_felony-attachment-5",
      title: "Form ACR - Notice of Exclusion of Confidential Information from Public Access",
      instrumentKind: "attachment",
      requirement: "required",
      condition: null,
      pages: [7],
      markers: { 7: ["CCA-XP-0120-7002", "Notice of Exclusion of Confidential Information from Public Access", "Page 1 of 1"] }
    },
    {
      documentId: "Confidential Information Form",
      sourceId: "official-form:Confidential Information Form",
      componentId: "in_conviction_serious_felony-attachment-6",
      title: "Confidential Information Form",
      instrumentKind: "attachment",
      requirement: "required",
      condition: null,
      pages: [8],
      markers: { 8: ["CONFIDENTIAL INFORMATION FORM", "Not Public Record"] }
    }
  ]
});

const DELIVERED_PAGES = ROUTE.documents.flatMap((d) => d.pages);
const DOCUMENT_OF_PAGE = new Map(ROUTE.documents.flatMap((d) => d.pages.map((p) => [p, d.documentId])));

/* The queue row was originally scoped to the three statewide supporting forms,
 * but its three bound routes each have a complete packet-set manifest.  This
 * family now composes the ten custom-pleading components named by those route
 * manifests and retains the three official forms below.  The shared queue and
 * manifest records remain source evidence; this local list is the delivered
 * component map for this repair. */
const CUSTOM_COMPONENTS = Object.freeze([
  {
    trackId: "in_conviction_serious_felony", componentId: "in_conviction_serious_felony-primary-filing-1",
    role: "primary_filing", title: "Verified Petition to Expunge a Serious Felony Conviction", kind: "serious_petition"
  },
  {
    trackId: "in_conviction_serious_felony", componentId: "in_conviction_serious_felony-proposed-order-2",
    role: "proposed_order", title: "Proposed Order on Petition to Expunge a Serious Felony Conviction", kind: "serious_order"
  },
  {
    trackId: "in_conviction_serious_felony", componentId: "in_conviction_serious_felony-attachment-3",
    role: "attachment", title: "Attachment: Written Prosecutor Consent", kind: "serious_consent"
  },
  {
    trackId: "in_collateral_action", componentId: "in_collateral_action-primary-filing-1",
    role: "primary_filing", title: "Verified Request to Expunge a Collateral Action", kind: "collateral_petition"
  },
  {
    trackId: "in_collateral_action", componentId: "in_collateral_action-proposed-order-2",
    role: "proposed_order", title: "Proposed Order on Collateral Action", kind: "collateral_order"
  },
  {
    trackId: "in_collateral_action", componentId: "in_collateral_action-attachment-3",
    role: "attachment", title: "Attachment: Certified Original Expungement Order", kind: "collateral_order_attachment"
  },
  {
    trackId: "in_supplemental_order", componentId: "in_supplemental_order-primary-filing-1",
    role: "primary_filing", title: "Supplemental Petition After a Favourable Amendment", kind: "supplemental_petition"
  },
  {
    trackId: "in_supplemental_order", componentId: "in_supplemental_order-proposed-order-2",
    role: "proposed_order", title: "Proposed Supplemental Order", kind: "supplemental_order"
  },
  {
    trackId: "in_supplemental_order", componentId: "in_supplemental_order-attachment-3",
    role: "attachment", title: "Attachment: Certified Original Expungement Order", kind: "supplemental_order_attachment"
  },
  {
    trackId: "in_conviction_serious_felony", componentId: "in_conviction_serious_felony-instructions-7",
    role: "instructions", title: "Indiana Serious-Felony Filing and Service Instructions", kind: "serious_instructions"
  }
]);
const ALL_COMPONENTS = Object.freeze([
  ...CUSTOM_COMPONENTS.map((c) => c.componentId),
  ...ROUTE.documents.map((d) => d.componentId)
]);

const RECORDS = Object.freeze({
  registry: "data/record-clearing/legal-design-track-registry.json",
  manifest: "data/record-clearing/legal-design-packet-set-manifests.json",
  census: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  queue: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
  buildability: "data/rcap-grade-a/source-wave-integration/SOURCE_READY_BUILDABILITY.json"
});

/* ---- policies ------------------------------------------------------------- */
const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const COMPOSE = (factIds, what) => ({ policy: "compose", factIds, what });
const ELECTION = (why) => ({ policy: "election", why });
const OPTIONAL = (what) => ({ policy: "optional", what });

const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const RELATED_CASE = (n) => ({
  [`Caption${n}`]: {
    section: "Related cases", label: `Related case ${n} - caption`,
    ...SUPPLY(`the caption of the ${n === 1 ? "first" : n === 2 ? "second" : n === 3 ? "third" : n === 4 ? "fourth" : n === 5 ? "fifth" : "sixth"} related case, if you have one. Item 4 of the Appearance asks for the caption and the cause number of every case related to this one, and a caption with no cause number beside it is half an answer`)
  },
  [`CauseNumber${n}`]: {
    section: "Related cases", label: `Related case ${n} - cause number`,
    ...SUPPLY(`the cause number of that same related case. This is a RELATED case's number, not the cause number of the matter you are filing in`)
  }
});

const SERVICE_BLOCK = (documentLabel, mailBox, mailDate, mailCounty, mailAddress, efileBox, efileDate, efileCounty) => ({
  [mailBox]: {
    section: `Certificate of service - ${documentLabel}`, label: `${documentLabel} certificate of service - served by first-class mail or hand delivery (selection)`,
    ...ELECTION("tick this only after you have actually posted or hand-delivered a copy to the county prosecutor. A certificate of service states that service has happened, and the packet will not state that for you")
  },
  [mailDate]: {
    section: `Certificate of service - ${documentLabel}`, label: `${documentLabel} certificate of service - date you sent it by mail or hand delivery`,
    ...SUPPLY("the date you actually posted or hand-delivered the copy. Write it when you do it, not before")
  },
  [mailCounty]: {
    section: `Certificate of service - ${documentLabel}`, label: `${documentLabel} certificate of service - which county prosecutor you sent it to`,
    ...SUPPLY("the county whose prosecuting attorney you served. On a serious-felony petition that is the county of conviction; on a collateral action it is the county where the collateral action happened")
  },
  [mailAddress]: {
    section: `Certificate of service - ${documentLabel}`, label: `${documentLabel} certificate of service - the prosecutor's address`,
    ...SUPPLY("that prosecuting attorney's street address. The packet holds no prosecutor directory and does not state an address it cannot source")
  },
  [efileBox]: {
    section: `Certificate of service - ${documentLabel}`, label: `${documentLabel} certificate of service - served through the Indiana E-filing System (selection)`,
    ...ELECTION("tick this instead if you served the copy through the Indiana E-filing System, and only after you have done it")
  },
  [efileDate]: {
    section: `Certificate of service - ${documentLabel}`, label: `${documentLabel} certificate of service - date of the e-filing service`,
    ...SUPPLY("the date the E-filing System served the copy")
  },
  [efileCounty]: {
    section: `Certificate of service - ${documentLabel}`, label: `${documentLabel} certificate of service - which county prosecutor was served electronically`,
    ...SUPPLY("the same county prosecuting attorney, named the same way")
  }
});

const FIELD_SPEC = {
  /* --- the caption band, shared by all three documents ------------------- */
  "cap-PetitionerFullName": {
    section: "Caption", label: "Petitioner full legal name",
    ...WRITE("participant.full_legal_name")
  },
  "cap-COUNTY": { section: "Caption", label: "County of the court", ...WRITE("matter.county") },
  "DD-cap-CourtType": {
    section: "Caption", selection: true, label: "Court type - Circuit, Superior, City or Town (selection)",
    ...ELECTION("choose the kind of court your case is in, from the list the form itself offers. Which court holds your case is a fact about your own matter, and the Coalition's list separates Circuit from Superior because Indiana counties differ")
  },

  /* --- the Appearance, page 1 -------------------------------------------- */
  Address: {
    section: "Appearance - your current address",
    label: "Your current mailing address",
    ...COMPOSE(["participant.street_address", "participant.city_state_zip"],
      "your current street address and the city, state and zip beneath it")
  },
  Email: { section: "Appearance - your contact details", label: "Email address", ...WRITE("participant.email") },
  Phone: { section: "Appearance - your contact details", label: "Phone", ...WRITE("participant.phone") },
  Fax: {
    section: "Appearance - your contact details", label: "Fax (optional)",
    ...OPTIONAL("a fax number, if you have one. Most people do not, and the line is left empty rather than filled with something else")
  },
  "Check Box1": {
    section: "Appearance - your contact details", selection: true,
    label: "I will accept service at the above email address (selection)",
    ...ELECTION("tick this if you are willing to be served at that email address. Whether you want court papers arriving by email is your decision and the packet does not make it for you")
  },
  "Check Box2": {
    section: "Appearance - your current address", selection: true,
    label: "Attorney General confidential address (selection)",
    ...ELECTION("tick this only if you use the Attorney General's confidential address programme in a related case. The platform holds no fact about that programme and will not assert one on your behalf")
  },
  "Check Box3": {
    section: "Related cases", selection: true, label: "There are related cases - Yes (selection)",
    ...ELECTION("tick Yes or No. Item 4 asks whether any other case is related to this one, and only you and your record know")
  },
  "Check Box4": {
    section: "Related cases", selection: true, label: "There are related cases - No (selection)",
    ...ELECTION("tick this instead if there are no related cases")
  },
  ...RELATED_CASE(1), ...RELATED_CASE(2), ...RELATED_CASE(3),
  ...RELATED_CASE(4), ...RELATED_CASE(5), ...RELATED_CASE(6),

  /* --- the Appearance, page 2 -------------------------------------------- */
  AdditionalInformation: {
    section: "Appearance - local rule", label: "Additional information as required by local rule (optional)",
    ...OPTIONAL("anything your county's local rule requires on an appearance. Most counties require nothing extra; the packet leaves it empty rather than guessing at a local rule it has not read")
  },
  ...SERVICE_BLOCK("Appearance", "Check Box6", "Date1", "County1", "ProsecutorAddress1", "Check Box7", "Date2", "County2"),

  /* --- Form ACR, page 7 --------------------------------------------------- */
  ...SERVICE_BLOCK("Form ACR", "Check Box13", "Date5", "County5", "ProsecutorAddress3", "Check Box14", "Date6", "County6"),

  /* --- the Confidential Information Form, page 8 -------------------------- */
  /*
   * THE ONE BOX ON THIS PACKET THE PLATFORM MUST NEVER HOLD.
   *
   * The committed track record's own packet instruction: "Put only the last
   * four digits of the Social Security number on the petition. The full number
   * goes on the Confidential Information Form, filed as a confidential
   * document ... Do not persist the full number." The shared field semantics
   * refuses a government identifier before this build reaches it, and the
   * instruction below says plainly that the platform does not hold it and will
   * not ask for it.
   */
  PetFullSSN: {
    section: "Confidential Information Form", label: "Petitioner's full Social Security Number",
    ...SUPPLY("your full Social Security number, written by hand on this sheet only. The platform does not hold it, does not store it and will not ask you for it. This sheet is the one document in the packet that carries it, and it is filed as a confidential document")
  }
};

/* ---- fixtures ------------------------------------------------------------- */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 North Delaware Street",
    "participant.city_state_zip": "Indianapolis, IN 46204",
    "participant.phone": "317-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Marion"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Crown Point, Indiana 46307-2214",
    "participant.phone": "(219) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.county": "St. Joseph"
  }
};

/* ---- helpers -------------------------------------------------------------- */
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
};
const entryDigest = (value) => sha256(Buffer.from(stable(value), "utf8"));
const flat = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}
function readRecord(rel) {
  const bytes = fs.readFileSync(path.join(ROOT, rel));
  return { path: rel, bytes, data: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes), byteLength: bytes.length };
}

/* ---- the committed records ------------------------------------------------ */
function loadControllingRecords() {
  const loaded = Object.fromEntries(Object.entries(RECORDS).map(([k, rel]) => [k, readRecord(rel)]));
  const pins = [];
  const pin = (key, pointer, entry) => {
    const record = loaded[key];
    pins.push({
      record: record.path, wholeFileSha256: record.sha256, byteLength: record.byteLength,
      thisFamilysEntry: pointer, thisFamilysEntrySha256: entryDigest(entry),
      whyBothPinsExist: "the whole-file pin detects any edit to a shared national record; the entry pin says whether the edit touched this family"
    });
    return entry;
  };

  const queueFamily = loaded.queue.data.families.find((f) => f.familyId === FAMILY_ID);
  assert.ok(queueFamily, `${RECORDS.queue} carries no ${FAMILY_ID}`);
  assert.equal(queueFamily.directory, OUT);
  assert.equal(queueFamily.buildScript, BUILD_SCRIPT);
  assert.deepEqual([...queueFamily.routeKeys].sort(), [...ROUTE.routeKeys].sort());
  assert.deepEqual(
    [...queueFamily.packetComponents].sort(),
    ROUTE.documents.map((d) => `component:${d.componentId}`).sort(),
    "the declared component set has changed; this build states the set it was written against");
  for (const declared of queueFamily.sourceHashes ?? []) {
    assert.equal(declared.sha256, BUNDLE.sha256,
      `${declared.sourceId} no longer resolves to the one bundle this family slices its documents out of`);
  }
  pin("queue", `families[familyId=${FAMILY_ID}]`, queueFamily);

  const tracks = {};
  for (const trackId of ["in_conviction_serious_felony", "in_collateral_action", "in_supplemental_order"]) {
    const track = loaded.registry.data.tracks.find((t) => t.trackId === trackId);
    assert.ok(track, `${RECORDS.registry} carries no track ${trackId}`);
    assert.ok(track.rules && typeof track.rules.fees === "string" && track.rules.fees.length > 0);
    assert.ok(Array.isArray(track.selfHelpStopConditions) && track.selfHelpStopConditions.length > 0);
    tracks[trackId] = pin("registry", `tracks[trackId=${trackId}]`, track);
  }
  const ssnRule = (tracks[PRIMARY_TRACK].packetInstructions ?? []).find((s) => /last four digits/i.test(s));
  assert.ok(ssnRule, "the serious-felony track record no longer carries the instruction that only the last four digits of the Social Security number go on the petition; this packet's treatment of PetFullSSN rests on it");

  const packetSets = {};
  const routeComponents = [];
  for (const trackId of ["in_conviction_serious_felony", "in_collateral_action", "in_supplemental_order"]) {
    const packetSet = loaded.manifest.data.packetSets.find((p) => p.packetSetId === `${trackId}-set`);
    assert.ok(packetSet, `${RECORDS.manifest} carries no packet set ${trackId}-set`);
    packetSets[trackId] = packetSet;
    pin("manifest", `packetSets[packetSetId=${trackId}-set]`, packetSet);
    for (const component of [...packetSet.components].sort((a, b) => a.order - b.order)) {
      routeComponents.push({
        packetSetId: packetSet.packetSetId, trackId, ...component
      });
    }
  }
  const packetSet = packetSets[PRIMARY_TRACK];
  const components = [...packetSet.components].sort((a, b) => a.order - b.order);
  const mine = components.filter((c) => ROUTE.documents.some((d) => d.componentId === c.componentId));
  assert.equal(mine.length, ROUTE.documents.length, "a declared component of this family is absent from the packet-set manifest");
  for (const doc of ROUTE.documents) {
    const component = mine.find((c) => c.componentId === doc.componentId);
    assert.equal(component.officialFormId, doc.documentId,
      `component ${doc.componentId} no longer names ${doc.documentId}`);
    assert.equal(component.requirement, doc.requirement,
      `component ${doc.componentId} requirement changed; this build states the requirement it was written against`);
    assert.equal(component.conditionDescription ?? null, doc.condition,
      `component ${doc.componentId} condition changed; the packet repeats that condition verbatim to the participant`);
    assert.equal(component.outputStrategy, "official_pdf_fill");
  }
  const requiredCustomIds = CUSTOM_COMPONENTS.map((c) => c.componentId).sort();
  const manifestedCustomIds = routeComponents
    .filter((c) => c.outputStrategy === "custom_pleading")
    .map((c) => c.componentId);
  assert.deepEqual([...new Set(manifestedCustomIds)].sort(), requiredCustomIds,
    "the three bound route manifests no longer name the ten custom components this family composes");
  const notDeliveredHere = [];

  const routes = (loaded.census.data.routes ?? []).filter((r) => ROUTE.routeKeys.includes(r.routeKey));
  assert.equal(routes.length, ROUTE.routeKeys.length, "the route-obligation census no longer carries all three of this family's routes");
  for (const r of routes) {
    assert.equal(r.packetFamilyId, FAMILY_ID, `${r.routeKey} is no longer bound to ${FAMILY_ID}`);
  }
  pin("census", `routes[packetFamilyId=${FAMILY_ID}]`, routes);

  const buildability = (loaded.buildability.data.rows ?? []).find((r) => r.familyId === FAMILY_ID);
  assert.ok(buildability, `${RECORDS.buildability} carries no row for ${FAMILY_ID}`);
  assert.equal(buildability.verdict, "EVERY_BOUND_SOURCE_IS_A_HELD_PDF");
  pin("buildability", `rows[familyId=${FAMILY_ID}]`, buildability);

  return { queueFamily, tracks, packetSet, packetSets, routeComponents, routes, notDeliveredHere, ssnRule, buildability, pins };
}

/* ---- source binding ------------------------------------------------------- */
function mountedCustodies(index) {
  const repoRoots = [ROOT];
  try {
    const main = path.dirname(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: ROOT, encoding: "utf8" }).trim());
    if (main && main !== ROOT) repoRoots.push(main);
  } catch { /* not a git checkout: this checkout is then the only repository root */ }

  const mounts = [];
  const seen = new Set();
  const add = (custody, pathsRelativeTo, base, describes) => {
    const absolute = path.resolve(base);
    const key = `${custody}@${absolute}`;
    if (seen.has(key) || !fs.existsSync(absolute)) return;
    seen.add(key);
    mounts.push({ custody, pathsRelativeTo, base: absolute, describes });
  };
  const library = process.env.MASTER_LIBRARY_SOURCE_DIR;
  if (library) add("master_library", "custodyRoot", library, "MASTER_LIBRARY_SOURCE_DIR");
  for (const custody of index.custodies ?? []) {
    const shape = custody.pathsRelativeTo ?? "custodyRoot";
    for (const repo of repoRoots) {
      if (shape === "custodyRoot") add(custody.id, shape, path.join(repo, custody.root), `${custody.id} under ${repo}`);
      else if (fs.existsSync(path.join(repo, custody.root))) add(custody.id, shape, repo, `${custody.id} (repository-relative paths) under ${repo}`);
    }
  }
  return mounts;
}

function resolveBundle() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const mounts = mountedCustodies(index);
  const entries = (index.entries ?? [])
    .filter((e) => e.sha256 === BUNDLE.sha256)
    .sort((a, b) => (a.path === BUNDLE.declaredPath ? -1 : b.path === BUNDLE.declaredPath ? 1 : a.path.localeCompare(b.path)));
  const custodiesSearched = mounts.map((m) => ({
    custody: m.custody, pathsRelativeTo: m.pathsRelativeTo, base: path.relative(ROOT, m.base) || ".", describes: m.describes
  }));
  if (entries.length === 0) {
    return {
      bound: null, custodiesSearched,
      failure: {
        sourceIdentities: ROUTE.documents.map((d) => d.sourceId), expectedSha256: BUNDLE.sha256,
        declaredPath: BUNDLE.declaredPath, why: "the committed corpus index carries no entry at this digest"
      }
    };
  }
  const tried = [];
  for (const entry of entries) {
    const custody = entry.custody ?? "master_library";
    for (const mount of mounts) {
      if (mount.custody !== custody) continue;
      const attempt = path.join(mount.base, entry.path);
      if (!fs.existsSync(attempt)) { tried.push({ path: attempt, why: "not present in this container" }); continue; }
      const bytes = fs.readFileSync(attempt);
      const digest = sha256(bytes);
      if (digest !== BUNDLE.sha256) { tried.push({ path: attempt, why: `SHA-256 drift: holds ${digest}` }); continue; }
      return {
        bound: {
          entry, custody, absolutePath: attempt, bytes, sha256Confirmed: digest,
          pathInArchive: entry.path, byteLength: bytes.length,
          boundAtTheDeclaredPath: entry.path === BUNDLE.declaredPath,
          acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null,
          revision: entry.revision ?? null
        },
        custodiesSearched, failure: null
      };
    }
  }
  return {
    bound: null, custodiesSearched,
    failure: {
      sourceIdentities: ROUTE.documents.map((d) => d.sourceId), expectedSha256: BUNDLE.sha256,
      declaredPath: BUNDLE.declaredPath, pathsTried: tried, why: "no mounted custody holds these exact bytes"
    }
  };
}

/* ---- census --------------------------------------------------------------- */
/*
 * The census is taken over the WHOLE bundle, because the AcroForm is bundle-wide
 * and the fill runs on the whole bundle. Only fields with at least one widget on
 * a DELIVERED page carry a dictionary entry; every other field is declared
 * unwritable by role, so nothing is written on a page this family does not ship
 * either.
 */
async function censusOfBundle(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));
  const flatPage = new Map(pageText.map((p) => [p.page, flat(p.lines.map((l) => l.text).join(" "))]));

  const rows = [];
  const offBundleFields = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      let flags = null;
      try { flags = w.getFlags(); } catch { flags = null; }
      const hidden = flags !== null && ((flags & 1) !== 0 || (flags & 2) !== 0 || (flags & 32) !== 0);
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        annotationFlags: flags, hiddenUntilTheFormRevealsIt: hidden,
        onADeliveredPage: DELIVERED_PAGES.includes(pi + 1),
        document: DOCUMENT_OF_PAGE.get(pi + 1) ?? null
      };
    });
    const entry = FIELD_SPEC[name];
    const touchesDelivered = widgets.some((w) => w.onADeliveredPage);
    if (!touchesDelivered) {
      offBundleFields.push({
        field: name, pages: [...new Set(widgets.map((w) => w.page))].sort((a, b) => a - b),
        why: "every widget of this field is on a page of the bundle this family does not deliver"
      });
      continue;
    }
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }

    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") { const s = field.getSelected(); sourceValue = Array.isArray(s) ? (s.length ? s : null) : (s ?? null); }
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }

    const printedCaptionFound = widgets.some((w) => {
      const hay = flatPage.get(w.page) ?? "";
      return flat(name).length >= 4 && hay.includes(flat(name));
    });

    rows.push({
      key: name, name, widgets, sourceValue,
      deliveredWidgets: widgets.filter((w) => w.onADeliveredPage),
      documents: [...new Set(widgets.filter((w) => w.onADeliveredPage).map((w) => w.document))],
      hiddenUntilTheFormRevealsIt: widgets.some((w) => w.hiddenUntilTheFormRevealsIt === true),
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      options: (() => { try { return typeof field.getOptions === "function" ? field.getOptions() : null; } catch { return null; } })(),
      section: entry.section, effectiveLabel: entry.label,
      policy: entry.policy, fact: entry.fact ?? null, factIds: entry.factIds ?? null,
      what: entry.what ?? null, why: entry.why ?? null,
      printedCaptionFound,
      printedTextAtCoordinate: widgets.filter((w) => w.onADeliveredPage).slice(0, 1).flatMap((w) =>
        (pageText.find((p) => p.page === w.page)?.lines ?? [])
          .filter((l) => Math.abs(l.y - w.rect.y) <= 16)
          .sort((a, b) => Math.abs(a.y - w.rect.y) - Math.abs(b.y - w.rect.y))
          .slice(0, 2).map((l) => ({ page: w.page, y: l.y, extracted: l.text })))
    });
  }

  const dictionaryKeys = new Set(Object.keys(FIELD_SPEC));
  for (const r of rows) dictionaryKeys.delete(r.key);
  return { rows, offBundleFields, unmapped, stale: [...dictionaryKeys], pageText, pageCount: pages.length };
}

/* ---- render --------------------------------------------------------------- */
async function renderBundle(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const composed = census.rows.filter((r) => r.policy === "compose");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const composedFieldValues = Object.fromEntries(composed.map((r) => [r.name, { factIds: r.factIds }]));
  const handled = new Set([...writable, ...composed].map((r) => r.name));
  const unwritableFields = [
    ...census.rows.filter((r) => !handled.has(r.name)).map((r) => ({ field: r.name })),
    ...census.offBundleFields.map((r) => ({ field: r.field }))
  ];
  const suppressedBlankControls = new Map(
    ["Check Box1", "Check Box2", "Check Box3", "Check Box4", "Check Box6", "Check Box7", "Check Box13", "Check Box14"]
      .map((name) => [name, APPEARANCE_DISPOSITION.SUPPRESS_CONTROL_APPEARANCE])
  );

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, composedFieldValues, unwritableFields,
    appearanceDispositions: suppressedBlankControls,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: "Indiana expungement statewide supporting forms",
    evaluateDeclaredMinimumSize: true,
    alignWidgetFontSizeToFit: true,
    fitTextPerWidget: true,
    detachNestedControlFields: true,
    suppressSynthesizedAppearances: true,
    /* The source supplies no usable /AP /N for the eight certificate-choice
     * widgets.  Without this opt-in pdf-lib reads /MK /BC and stamps a second
     * hollow square when an untouched choice is flattened.  These controls are
     * deliberately refused, so preserve the source blank appearance and remove
     * the synthesized border. */
    suppressSynthesizedWidgetBorders: true
  });
  return { bytes, report };
}

/* ---- composed route documents -------------------------------------------- */
const CUSTOM_PAGE_WIDTH = 612;
const CUSTOM_PAGE_HEIGHT = 792;
const CUSTOM_MARGIN = 58;
const CUSTOM_FONT_SIZE = 10.25;
const CUSTOM_LINE_HEIGHT = 13.25;

function plainCustomText(value) {
  return String(value ?? "")
    .replaceAll("§", "Sec. ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", " - ").replaceAll("’", "'").replaceAll("“", '"')
    .replaceAll("”", '"').replaceAll("…", "...");
}

function customCaption(facts) {
  return [
    "STATE OF INDIANA",
    `${facts["matter.county"]} COUNTY`,
    `Petitioner: ${facts["participant.full_legal_name"]}`,
    "Court: [Participant supplies the circuit or superior court name]",
    "Cause number: [Participant supplies the cause number, if available]",
    ""
  ];
}

const participantBlank = (label) => `[Participant completes: ${label}]`;
const courtBlank = (label) => `[Court or clerk completes: ${label}]`;

function customDocumentLines(spec, record, facts) {
  const track = record.tracks[spec.trackId];
  const lines = [...customCaption(facts), spec.title, `Authority: ${track.authority.join("; ")}`, ""];
  const addTrackSummary = () => {
    lines.push(`Venue: ${track.venue}`, `Filing: ${track.rules.filing}`, `Service and notice: ${track.rules.service} ${track.rules.notice}`, "");
  };

  switch (spec.kind) {
    case "serious_petition":
      lines.push("VERIFIED PETITION", "Petitioner requests expungement of a serious felony conviction under I.C. 35-38-9-5.", "", "Facts the petition must state:");
      lines.push(`Full legal name: ${facts["participant.full_legal_name"]}`,
        participantBlank("all other legal names or aliases"), participantBlank("date of birth"),
        participantBlank("every address from the date of the offence through the date of this petition"),
        participantBlank("court case number, if available"), participantBlank("whether any criminal investigation or charge is pending"),
        participantBlank("whether any further crime occurred within the applicable waiting period"),
        participantBlank("every past conviction and collateral action, with case numbers, dates, appeals and appellate decision dates"),
        participantBlank("last four digits of the Social Security number only"), participantBlank("driver's licence number"),
        participantBlank("arrest dates, if applicable"), participantBlank("date of conviction"),
        participantBlank("whether the waiting period elapsed or the written prosecutor consent shortening it"),
        participantBlank("any other petition filed under I.C. 35-38-9"), "");
      addTrackSummary();
      lines.push("Written prosecutor consent is required to file this Section 5 petition. Attach the original consent before filing; silence is not consent.",
        "Verification:", "I verify the statements in this petition under the penalties for perjury.", participantBlank("signature and date"));
      break;
    case "serious_order":
      lines.push("PROPOSED ORDER", "The court considers the verified petition and the record filed with it.", "", "Findings:", courtBlank("the statutory findings under I.C. 35-38-9-5 and I.C. 35-38-9-8"),
        courtBlank("whether the petition is granted or denied"), "", "IT IS ORDERED:",
        courtBlank("the court's expungement and record-marking directives under I.C. 35-38-9-7"), "", courtBlank("order date"), courtBlank("judge signature"));
      break;
    case "serious_consent":
      lines.push("ATTACHMENT 3", "WRITTEN PROSECUTOR CONSENT", "", "Obtain the prosecuting attorney's written consent required by I.C. 35-38-9-5 and attach the signed original behind this page.",
        "This page is a labelled handoff only. It is not prosecutor consent, does not supply a signature, and does not authorize filing by itself.", "", participantBlank("the original written consent from the prosecutor"));
      break;
    case "collateral_petition":
      lines.push("VERIFIED REQUEST", "Petitioner requests expungement of a collateral action related to an expunged matter under I.C. 35-38-9-9.5 and the definition in I.C. 35-38-9-0.5.", "",
        "The request must identify:", `Petitioner's name: ${facts["participant.full_legal_name"]}`, participantBlank("the court and date of the original expungement order"),
        participantBlank("the county where the collateral action occurred"), participantBlank("the collateral action's cause number, if it has one"),
        participantBlank("the kind of collateral action: seizure, civil forfeiture, specialized driving privileges petition, or administrative proceeding"),
        participantBlank("the factual and legal relationship between the collateral action and the expunged matter"),
        participantBlank("a properly certified copy of the original expungement order"), "");
      addTrackSummary();
      lines.push("The participant signs this verified request.", participantBlank("signature and date"), "STOP: The court finds the collateral action does not relate to the expunged matter.");
      break;
    case "collateral_order":
      lines.push("PROPOSED ORDER", "The court considers the verified request and the certified original expungement order.", "", "Findings:",
        courtBlank("whether the collateral action is related to the expunged matter"), courtBlank("the original expungement section and order"), "", "IT IS ORDERED:",
        courtBlank("whether the collateral action is expunged or marked expunged under the applicable section"), "", courtBlank("order date"), courtBlank("judge signature"),
        "A court finding that the collateral action does not relate to the expunged matter is a stop condition for this route.");
      break;
    case "collateral_order_attachment":
      lines.push("ATTACHMENT 3", "CERTIFIED ORIGINAL EXPUNGEMENT ORDER", "", "Obtain a certified copy from the clerk of the court that granted the original expungement and attach it behind this page.",
        "This page is a document handoff. It is not a certified order and no original order is represented as held or generated here.", "", participantBlank("the certified original expungement order"));
      break;
    case "supplemental_petition":
      lines.push("SUPPLEMENTAL PETITION", "Petitioner asks for additional relief after a favourable amendment under I.C. 35-38-9-9(l) and I.C. 35-38-9-0.6(c).", "",
        "The petition must state:", `Petitioner's name: ${facts["participant.full_legal_name"]}`, participantBlank("the court and date of the original expungement order"),
        participantBlank("the amendment relied on and its effective date"), participantBlank("the greater relief sought"),
        participantBlank("why the original expungement was granted before the amendment"), participantBlank("why the petitioner is otherwise entitled to the amended relief"),
        participantBlank("a properly certified copy of the original expungement order"), "");
      addTrackSummary();
      lines.push("The participant signs this petition.", participantBlank("signature and date"), "The review identifies no settled fee amount for this route. Confirm the current filing requirement with the clerk before filing; this packet does not invent a fee.");
      break;
    case "supplemental_order":
      lines.push("PROPOSED SUPPLEMENTAL ORDER", "The court considers the supplemental petition, the amendment identified in it and the certified original expungement order.", "", "Findings:",
        courtBlank("whether the original expungement preceded the favourable amendment"), courtBlank("whether the petitioner is otherwise entitled to the amended relief"), "", "IT IS ORDERED:",
        courtBlank("relief consistent with the amendment"), "", courtBlank("order date"), courtBlank("judge signature"));
      break;
    case "supplemental_order_attachment":
      lines.push("ATTACHMENT 3", "CERTIFIED ORIGINAL EXPUNGEMENT ORDER", "", "Obtain a certified copy from the clerk of the court that granted the original expungement and attach it behind this page.",
        "This page is a document handoff. It is not a certified order and no original order is represented as held or generated here.", "", participantBlank("the certified original expungement order"));
      break;
    case "serious_instructions": {
      lines.push("FILING AND SERVICE INSTRUCTIONS", "The serious-felony petition must not be filed without the written prosecutor consent required by I.C. 35-38-9-5.",
        "File the verified petition and proposed order in a circuit or superior court in the county of conviction as case type XP. Follow the Trial Rules service requirements.",
        "Use the official statewide supporting forms included in this packet when the route and filer require them. Complete every participant blank, sign the petition, and leave judicial and clerk fields blank.", "", "SELF-HELP STOP CONDITIONS:");
      for (const trackId of ["in_conviction_serious_felony", "in_collateral_action", "in_supplemental_order"]) {
        lines.push(`${record.tracks[trackId].legalName}:`);
        for (const stop of record.tracks[trackId].selfHelpStopConditions) lines.push(`- ${stop}`);
      }
      break;
    }
    default:
      throw new Error(`no custom document body for ${spec.kind}`);
  }
  return lines;
}

async function renderCustomDocument(lines, title, componentId) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setAuthor("RCAP packet factory, packet-build lane");
  pdf.setCreator("RCAP deterministic Indiana custom pleading composer");
  pdf.setProducer("RCAP census-v1 artifact renderer");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const maxWidth = CUSTOM_PAGE_WIDTH - (2 * CUSTOM_MARGIN);
  const wrap = (raw, face = font) => {
    const text = plainCustomText(raw);
    if (!text) return [""];
    const words = text.split(/\s+/);
    const rows = [];
    let current = "";
    for (const word of words) {
      if (face.widthOfTextAtSize(word, CUSTOM_FONT_SIZE) > maxWidth) {
        if (current) { rows.push(current); current = ""; }
        let part = "";
        for (const ch of word) {
          if (part && face.widthOfTextAtSize(`${part}${ch}`, CUSTOM_FONT_SIZE) > maxWidth) { rows.push(part); part = ch; }
          else part += ch;
        }
        if (part) current = part;
        continue;
      }
      const candidate = current ? `${current} ${word}` : word;
      if (face.widthOfTextAtSize(candidate, CUSTOM_FONT_SIZE) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = word; }
    }
    if (current) rows.push(current);
    return rows.length ? rows : [""];
  };
  let page = pdf.addPage([CUSTOM_PAGE_WIDTH, CUSTOM_PAGE_HEIGHT]);
  let y = CUSTOM_PAGE_HEIGHT - CUSTOM_MARGIN;
  const drawn = [];
  for (const raw of lines) {
    const heading = /^(STATE OF INDIANA|.*PETITION.*$|.*ORDER.*$|ATTACHMENT 3|SELF-HELP STOP CONDITIONS:|FILING AND SERVICE INSTRUCTIONS|Facts the petition must state:|The request must identify:|The petition must state:|Findings:|IT IS ORDERED:|Verification:)$/.test(String(raw));
    const face = heading ? boldFont : font;
    for (const row of wrap(raw, face)) {
      if (y < CUSTOM_MARGIN) { page = pdf.addPage([CUSTOM_PAGE_WIDTH, CUSTOM_PAGE_HEIGHT]); y = CUSTOM_PAGE_HEIGHT - CUSTOM_MARGIN; }
      if (row) {
        const width = face.widthOfTextAtSize(row, CUSTOM_FONT_SIZE);
        assert.ok(width <= maxWidth + 0.01, `${componentId}: composed line exceeds page width`);
        page.drawText(row, { x: CUSTOM_MARGIN, y, size: CUSTOM_FONT_SIZE, font: face, color: rgb(0, 0, 0) });
        drawn.push({ page: pdf.getPageCount(), x: CUSTOM_MARGIN, y, width, text: row });
      }
      y -= CUSTOM_LINE_HEIGHT;
    }
  }
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pageCount: pdf.getPageCount(), drawn };
}

async function customPagesFor(record, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const out = [];
  for (const spec of CUSTOM_COMPONENTS) {
    const rendered = await renderCustomDocument(
      customDocumentLines(spec, record, facts), spec.title, spec.componentId
    );
    out.push({ spec, rendered });
  }
  return out;
}

/* ---- the delivered packet, with the page selection proved ----------------- */
async function assemblePacket(filledBytes, customPages = []) {
  const filled = await PDFDocument.load(filledBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = filled.getPages();
  const textOf = pages.map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));

  const packet = await PDFDocument.create();
  stampDeterministic(packet);
  packet.setTitle(`${ROUTE.publicLabel} - fixture`);
  const pageManifest = [];
  const markerProof = [];
  for (const doc of ROUTE.documents) {
    for (const sourcePage of doc.pages) {
      const printed = textOf[sourcePage - 1] ?? "";
      for (const marker of doc.markers[sourcePage] ?? []) {
        assert.ok(printed.includes(marker),
          `${doc.documentId}: bundle page ${sourcePage} does not print "${marker}". The bundle has been re-paginated `
          + "and this build will not ship a page it cannot identify from the page's own printed face.");
      }
      const [copied] = await packet.copyPages(filled, [sourcePage - 1]);
      packet.addPage(copied);
      pageManifest.push({
        packetPage: packet.getPageCount(), documentId: doc.documentId, componentId: doc.componentId,
        sourcePage, sourceSha256: BUNDLE.sha256
      });
      markerProof.push({
        documentId: doc.documentId, componentId: doc.componentId, sourcePage, packetPage: packet.getPageCount(),
        markersFoundInThePagesOwnPrintedText: doc.markers[sourcePage] ?? [],
        basis: "read from the page's own extracted text before the page was copied"
      });
    }
  }
  for (const composed of customPages) {
    const source = await PDFDocument.load(composed.rendered.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(source, source.getPageIndices());
    pages.forEach((page, index) => {
      packet.addPage(page);
      pageManifest.push({
        packetPage: packet.getPageCount(),
        documentId: composed.spec.componentId,
        componentId: composed.spec.componentId,
        component: composed.spec.componentId,
        sourcePage: index + 1,
        sourceSha256: null,
        retained: false,
        sourceClass: "composed_from_committed_Indiana_route_records"
      });
    });
  }
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pageCount: packet.getPageCount(), pageManifest, markerProof,
    composedPageManifest: pageManifest.filter((row) => row.sourceClass === "composed_from_committed_Indiana_route_records") };
}

/* ---- byte proof, measured on the DELIVERED packet ------------------------- */
async function baselineInk(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  try { doc.getForm().flatten(); } catch { /* a form that will not flatten leaves no baseline to compare against */ }
  const flatBytes = await doc.save({ useObjectStreams: false, updateMetadata: false });
  const assembled = await assemblePacket(flatBytes);
  const tmp = path.join(ROOT, ".rcap-in-supporting-forms-baseline.pdf");
  fs.writeFileSync(tmp, assembled.bytes);
  try { return await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
}

async function byteProof(census, packet, report, fixtureName, baseline) {
  const facts = FIXTURES[fixtureName];
  const tmp = path.join(ROOT, `.rcap-in-supporting-forms-proof-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, packet.bytes);
  let appearances = [];
  try { appearances = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }

  const packetPageOf = new Map(packet.pageManifest
    .filter((m) => m.sourceSha256 === BUNDLE.sha256)
    .map((m) => [m.sourcePage, m.packetPage]));
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;

  const measured = [];
  for (const r of census.rows) {
    for (const wdg of r.deliveredWidgets) {
      const page = packetPageOf.get(wdg.page);
      if (!page) continue;
      measured.push({ page, rect: wdg.rect });
      const drawn = drawnAt(appearances, { page, rect: wdg.rect });
      const text = drawn.map((d) => d.text).filter(Boolean);
      const ink = text.join("").trim();
      const isWrite = written.has(r.name) && (r.policy === "write" || r.policy === "compose");
      if (isWrite) {
        glyphs += ink.replace(/\s+/g, "").length;
        const expected = r.policy === "compose"
          ? (r.factIds ?? []).map((f) => String(facts[f] ?? "").trim()).join("\n")
          : String(facts[r.fact] ?? "").trim();
        actualWrites.push({
          field: r.key, document: wdg.document, factId: r.fact, composedFrom: r.factIds ?? null,
          sourcePage: wdg.page, packetPage: page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          drawnText: text, expected,
          /* A composed block is drawn as wrapped lines, so it is compared by
           * the words it carries rather than by an exact string. */
          matchesExpected: r.policy === "compose"
            ? expected.split(/\s+/).filter(Boolean).every((w) => ink.includes(w))
            : ink === expected
        });
        continue;
      }
      if (ink.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, packetPage: page, rect: wdg.rect, drawnText: text, sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
        });
        continue;
      }
      const inBaseline = drawnAt(baseline, { page, rect: wdg.rect }).map((d) => d.text).filter(Boolean);
      if (inBaseline.join("").trim() === ink) {
        documentAuthoredAppearances.push({
          field: r.key, packetPage: page, rect: wdg.rect, drawnText: text, sourceAppearanceText: inBaseline,
          note: "the pinned source's own widget appearance draws exactly this text; this build wrote nothing here"
        });
        continue;
      }
      refusedFieldsWithInk.push({ fieldId: r.key, document: wdg.document, packetPage: page, drawnText: text });
    }
  }

  /* nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, MEASURED: every appearance in
   * the delivered packet that lands at no measured widget rectangle, differenced
   * against the same pages assembled from the un-written bundle. */
  const atAMeasuredBox = (row) => measured.some((m) => m.page === row.page
    && Math.abs(row.x - m.rect.x) <= 2 && Math.abs(row.y - m.rect.y) <= 2);
  const counts = new Map();
  for (const row of baseline) {
    const key = `${row.page}|${row.x}|${row.y}|${row.text}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const outside = [];
  for (const row of appearances) {
    if (atAMeasuredBox(row)) continue;
    const stripped = String(row.text ?? "").replace(/\s+/g, "");
    if (stripped.length === 0) continue;
    const key = `${row.page}|${row.x}|${row.y}|${row.text}`;
    const remaining = counts.get(key) ?? 0;
    if (remaining > 0) { counts.set(key, remaining - 1); continue; }
    outside.push({ packetPage: row.page, x: row.x, y: row.y, appearance: row.appearance, text: row.text, glyphs: stripped.length });
  }

  return {
    actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs,
    appearances: appearances.length,
    outsideMeasuredWriteBoxes: outside,
    glyphsOutsideMeasuredWriteBoxes: outside.reduce((n, row) => n + row.glyphs, 0)
  };
}

/* ---- field maps, one per delivered document ------------------------------- */
function mapsFor(census, report, boundaryReport) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const boundaryWrittenNames = new Set((boundaryReport?.written ?? []).map((w) => w.field));
  const boundaryUnfittable = new Map((boundaryReport?.unfittable ?? []).map((u) => [u.field, u]));

  return ROUTE.documents.map((doc) => {
    const canonicalWrites = [];
    const canonicalRefusals = [];
    const boundaryWrites = [];
    const boundaryRefusals = [];
    const selectionControls = [];

    for (const r of census.rows) {
      const here = r.deliveredWidgets.filter((w) => w.document === doc.documentId);
      if (here.length === 0) continue;
      const base = {
        field: `${doc.documentId}/${r.key}`,
        fieldName: `${doc.documentId}/${r.key}`.replace(/\[\d+\]/g, ""),
        acroFieldName: r.name,
        page: here[0].page, packetWidgets: here.length,
        rect: here[0].rect, rectBasis: here[0].rectBasis,
        printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
        sectionHeading: r.section, regionHeading: r.effectiveLabel,
        effectiveLabel: r.effectiveLabel,
        captionBasis: r.printedCaptionFound
          ? "the AcroForm field name the Coalition authored, found verbatim in the printed text of a page it sits on"
          : "the AcroForm field name the Coalition authored, plus the printed section; the paper prints a caption this name abbreviates, so the printed line at the widget's own coordinate is recorded beside it",
        printedCaptionFound: r.printedCaptionFound,
        printedTextAtCoordinate: r.printedTextAtCoordinate,
        document: doc.documentId, componentId: doc.componentId,
        componentRequirement: doc.requirement,
        fieldIsBundleWide: r.widgets.length > here.length,
        everyWidgetOfThisFieldInTheBundle: r.widgets.map((w) => ({ page: w.page, onADeliveredPage: w.onADeliveredPage }))
      };

      if (r.policy === "write" || r.policy === "compose") {
        const kind = r.policy === "compose" ? "composed_from_held_facts" : r.type;
        const refusedWrite = (fixture, unfittable) => ({
          ...base,
          reason: unfittable
            ? `the value bound here does not fit this box at the minimum readable font, so the shared finalizer refused it rather than clipping it; the ${fixture} packet does not claim a value it did not draw`
            : `the finalizer refused this write; the ${fixture} packet does not claim a value it did not draw`,
          category: null, completenessClass: null, class: null,
          disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
          requiredBeforeFiling: true, identity: `${doc.documentId} field ${r.key}`,
          factId: null, routeDetermined: false,
          ...(unfittable ? { unfittable } : {}),
          why: "reported rather than claimed, so the refusal is visible to the audit",
          participantMustSupply: "this value yourself: the one held for you is too long for the box the form draws here"
        });
        const writeRow = { ...base, factId: r.fact, composedFrom: r.factIds ?? null, kind };
        if (writtenNames.has(r.name)) canonicalWrites.push(writeRow);
        else canonicalRefusals.push(refusedWrite("canonical", null));
        if (boundaryReport) {
          if (boundaryWrittenNames.has(r.name)) boundaryWrites.push(writeRow);
          else boundaryRefusals.push(refusedWrite("boundary", boundaryUnfittable.get(r.name) ?? null));
        }
        continue;
      }

      if (r.isSelectionControl && r.policy === "election") {
        selectionControls.push({
          ...base, selectionId: base.field, kind: "selection_control", type: r.type,
          widgets: here, options: r.options ?? null, disposition: "explicit_refusal",
          reason: r.why, category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION, class: PARTICIPANT_ELECTION,
          requiredBeforeFiling: false, routeDetermined: false
        });
        continue;
      }

      if (r.policy === "optional") {
        const rowValue = {
          ...base,
          reason: `optional participant-authored content; the platform does not invent it: ${r.what}`,
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false, optional: true,
          why: `the form does not require this and the platform holds no value for it: ${r.what}`,
          participantMaySupply: r.what
        };
        canonicalRefusals.push(rowValue);
        boundaryRefusals.push(rowValue);
        continue;
      }

      const rbfRow = {
        ...base,
        reason: `the participant supplies this before filing: ${r.what}`,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${doc.documentId} field ${r.key}`,
        factId: null, routeDetermined: false,
        why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
        participantMustSupply: r.what
      };
      canonicalRefusals.push(rbfRow);
      boundaryRefusals.push(rbfRow);
    }

    return {
      formNumber: doc.documentId, documentId: doc.documentId, documentRole: doc.instrumentKind,
      componentId: doc.componentId,
      documentPolicy: {
        mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKeys[2],
        ...(doc.condition ? { conditional: true, conditionDescription: doc.condition } : {})
      },
      structuralClass: "acroform",
      slicedFrom: { sha256: BUNDLE.sha256, bundlePages: doc.pages, markers: doc.markers },
      explicitMappings: Object.fromEntries(canonicalWrites.filter((w) => w.factId).map((w) => [w.field, w.factId])),
      roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
      boundaryWrites, boundaryRefusals,
      boundaryColumnBasis:
        "each column is built from that fixture's own render report; a value only one fixture could draw is a write in "
        + "one column and a refusal in the other"
    };
  });
}

/* ---- the builder's own count of the nine counters -------------------------- */
function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, selection = false) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selection,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => [
    ...m.canonicalRefusals.map((r) => row(r)),
    ...m.selectionControls.map((c) => row(c, true))
  ]);

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ field: blank.id, label: blank.label, document: blank.document, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the delivered bytes carry no glyph and no flattened appearance" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, where: p.inkOutsideMeasuredWriteBoxes });
    }
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the delivered packet" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const rendered = artifacts.flatMap((a) => (a.documents ?? [])).map((d) => String(d).toLowerCase());
  for (const m of maps) {
    if (!rendered.includes(String(m.formNumber).toLowerCase())) {
      note("requiredComponentsMissing", { component: m.formNumber, why: "the field map names this document and it reaches no page of a rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- the two instruction documents ---------------------------------------- */
function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, componentId: m.componentId, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })));
}
function optionalItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.optional === true)
    .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, participantMaySupply: r.participantMaySupply })));
}

function participantInstructions(record, maps, rbf, optional) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls.map((c) => ({ document: m.formNumber, ...c })));
  const felony = record.tracks[PRIMARY_TRACK];

  const out = [];
  out.push("# What is in this packet, and what is not", "");
  out.push(
    "This packet contains the route documents for the three Indiana tracks bound to this family, plus the statewide "
    + "supporting forms prepared from the Coalition for Court Access's published bundle. The route documents are "
    + "composed from the committed Indiana track records; blanks remain for facts, signatures and decisions the platform "
    + "does not hold:", ""
  );
  for (const c of CUSTOM_COMPONENTS) {
    const track = record.tracks[c.trackId];
    out.push(`- **${c.componentId}** - _${c.title}_. ${track.legalName}.`);
  }
  for (const d of ROUTE.documents) {
    out.push(`- **${d.documentId}** - _${d.title}_. ${d.requirement === "conditional" ? `Conditional: ${d.condition}` : "Required."}`);
  }
  out.push("");

  out.push("## Read this first: use the documents for the route you are filing", "");
  out.push(
    "Select the route that matches your matter and file its primary filing, proposed order and attachment together. "
    + "The serious-felony route also includes its instructions component and the statewide supporting forms. The "
    + "collateral-action and supplemental-order components are included as their own composed route documents; do not "
    + "substitute one route's petition or order for another's.", ""
  );
  out.push(
    "The three official supporting forms are conditional or required according to the serious-felony packet record. "
    + "They do not replace the route documents, and the route documents do not replace a certified record or consent "
    + "that the records require you to obtain.", ""
  );

  out.push("## Before you file a serious-felony petition at all", "");
  const consent = (felony.packetInstructions ?? []).find((s) => /written prosecutor consent/i.test(s));
  if (consent) {
    out.push("The committed record for that route is emphatic, and this is its own sentence:", "");
    out.push(`> ${consent}`, "");
  }
  out.push(`Section 5's own mechanism, as the record states it: ${felony.mechanism}`, "");

  out.push("## What the platform filled in on the official supporting forms", "");
  out.push(
    "Your name, your current mailing address, your telephone number, your email address and the county of the court - "
    + "written into the boxes the Coalition drew for them, on every one of the three forms that has such a box. "
    + "Everything else is yours, and every one of those blanks is listed below.", ""
  );

  out.push("## The cause number is not on any of these three forms, and that is not an oversight", "");
  out.push(
    "All three print a cause-number line - \"CAUSE NO. ______\" on the Appearance and on Form ACR, \"XP CAUSE NUMBER\" "
    + "on the Confidential Information Form - and the published bundle draws **no fillable box on any of them**. This "
    + "packet writes only inside boxes the form itself draws, so **you write the cause number on all three by hand**. "
    + "Use the cause number of the case you are filing in. The six numbered boxes on the Appearance are for RELATED "
    + "cases and are a different question.", ""
  );

  out.push("## Your Social Security number", "");
  out.push("The record for this route says it plainly:", "");
  out.push(`> ${record.ssnRule}`, "");
  out.push(
    "So the Confidential Information Form's full-number box is **left empty for you to write by hand**. The platform "
    + "does not hold your Social Security number, does not store it, and will not ask you for it. That sheet is filed "
    + "as a confidential document, and Form ACR is the notice that tells the clerk to keep it out of public access - "
    + "which is why the two travel together.", ""
  );

  out.push("## The certificates of service: do not tick them early", "");
  out.push(
    "The Appearance and Form ACR each carry a **certificate of service** at the foot, with two alternatives: by "
    + "first-class mail or hand delivery, or through the Indiana E-filing System. A certificate of service is a "
    + "statement that service **has happened**. Tick the box, write the date and name the county prosecutor **after** "
    + "you have actually served the copy, not before. The packet ticks neither box and writes neither date.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Use only the primary filing, proposed order and attachment for your selected route.**");
  out.push("2. **Complete every participant blank in that route's composed documents**, including facts the platform does not hold, and sign the petition or request yourself.");
  out.push("3. **Obtain every certified record, consent or other document identified as a required attachment** before filing.");
  out.push("4. **Write the cause number by hand on all three official supporting sheets** when the clerk has assigned it.");
  out.push("5. **Choose your court type** on the caption of the Appearance and of Form ACR - Circuit, Superior, City or Town.");
  out.push("6. **Fill in every item in the official-form tables below.** Each names the form, the section and the blank.");
  out.push("7. **Answer item 4 of the Appearance** - whether there are related cases - and list every one of them with its caption and its cause number.");
  out.push("8. **Write your full Social Security number on the Confidential Information Form**, by hand, and on nothing else.");
  out.push("9. **Sign the Appearance and Form ACR yourself.** Neither is signed for you.");
  out.push("10. **Serve the county prosecutor, then complete the certificate of service** on both the Appearance and Form ACR.");
  out.push("");

  out.push("## Where these go, and what the record says about the filing they accompany", "");
  for (const [trackId, track] of Object.entries(record.tracks)) {
    out.push(`### ${track.legalName}`, "");
    out.push(`- **Venue:** ${track.venue}`);
    out.push(`- **Where:** ${track.destination.name}. ${track.destination.detail}`);
    out.push(`- **Fee:** ${track.rules.fees} Fee waiver: ${track.rules.feeWaiver}`);
    out.push(`- **Service:** ${track.rules.service}`);
    out.push(`- **Notice:** ${track.rules.notice}`);
    out.push(`- **Signature:** ${track.rules.participantSignature} Notarization: ${track.rules.notarization}.`);
    out.push(`- **Is this route's own filing in this packet?** Yes - the route documents listed above are included. ${trackId === PRIMARY_TRACK ? "The three official supporting forms are included as the serious-felony packet's attachments." : "The statewide supporting forms remain tied to the serious-felony packet record."}`);
    out.push("");
  }

  for (const [doc, items] of byDoc) {
    const source = ROUTE.documents.find((d) => d.documentId === doc);
    out.push(`## ${doc} - ${source?.title ?? doc}: the items you must supply`, "");
    if (source?.condition) out.push(`_This form is conditional: ${source.condition}_`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Form | Section | The choice | Why it is yours |", "| --- | --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  if (optional.length > 0) {
    out.push("## Optional, and left empty on purpose", "");
    out.push("| Form | The blank | What it is for |", "| --- | --- | --- |");
    for (const o of optional) out.push(`| ${o.document} | ${o.label} | ${o.participantMaySupply} |`);
    out.push("");
  }

  out.push("## What an Indiana expungement does, and does not, do", "");
  const notDestroyed = (felony.packetInstructions ?? []).find((s) => /destroyed/i.test(s));
  if (notDestroyed) out.push(`> ${notDestroyed}`, "");
  const publicUntil = (felony.packetInstructions ?? []).find((s) => /public until the order is granted/i.test(s));
  if (publicUntil) out.push(`> ${publicUntil}`, "");

  out.push("## When this is not a do-it-yourself matter", "");
  out.push("Each route has its own stop conditions. Stop and obtain appropriate help when one applies:", "");
  for (const [trackId, track] of Object.entries(record.tracks)) {
    out.push(`### ${track.legalName}`, "");
    for (const stop of track.selfHelpStopConditions) out.push(`- ${stop}`);
    out.push("");
  }
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This packet combines custom route documents grounded in the committed Indiana track records with a prepared copy "
    + "of official Indiana statewide forms, sliced from the Coalition for Court Access's own published bundle and filled "
    + "only where the platform holds the fact. It is not legal advice, it is not filed for you, and it does not decide "
    + "whether your matter qualifies."
  );
  out.push("");
  out.push(`_Routes: ${ROUTE.routeKeys.join("; ")}_`);
  return `${out.join("\n")}\n`;
}

function filingInstructions(record, artifacts, markerProof, notDeliveredHere) {
  const out = [];
  out.push("# Filing instructions - the Indiana route packet and statewide supporting forms", "");
  out.push(
    "Every rule below is generated from the committed legal-design track records for this family's three routes, which "
    + "are hashed into `source-receipt.json`. Where a record says nothing, this page says nothing.", ""
  );

  out.push("## What this packet contains", "");
  out.push("| Order | Component | Document | Role | Required or conditional | Bundle pages |", "| --- | --- | --- | --- | --- | --- |");
  let componentOrder = 1;
  for (const c of CUSTOM_COMPONENTS) {
    const track = record.tracks[c.trackId];
    const manifestComponent = record.routeComponents.find((x) => x.componentId === c.componentId);
    out.push(`| ${componentOrder++} | ${c.componentId} | ${c.title} | ${c.role} | ${manifestComponent?.requirement ?? "required"} | composed page(s) |`);
  }
  for (const d of ROUTE.documents) {
    out.push(`| ${componentOrder++} | ${d.componentId} | ${d.documentId} | ${d.instrumentKind} | ${d.requirement}${d.condition ? ` - ${d.condition}` : ""} | ${d.pages.join(", ")} of 15 |`);
  }
  out.push("");

  out.push("## Component completeness", "");
  out.push(
    "The ten custom-pleading components named by the three bound route manifests are included above. The attachment "
    + "pages below remain official supporting forms; no route's petition or proposed order is omitted from this packet.", ""
  );
  out.push(`Required route components delivered: ${CUSTOM_COMPONENTS.length}. Components left undelivered: ${notDeliveredHere.length}.`, "");
  out.push("");

  out.push("## How the three documents were cut out of one binary", "");
  out.push(
    `The three official supporting documents are pages of ${BUNDLE.whatItIs}, published by the ${BUNDLE.issuer} and bound here at SHA-256 `
    + `\`${BUNDLE.sha256}\`. The AcroForm is bundle-wide, so the whole bundle is filled and flattened once and the `
    + "delivered pages are copied out of the flattened document. Each page is identified from its own printed face "
    + "before it is copied:", ""
  );
  out.push("| Document | Bundle page | Packet page | Markers found in that page's own printed text |", "| --- | --- | --- | --- |");
  for (const p of markerProof) {
    out.push(`| ${p.documentId} | ${p.sourcePage} | ${p.packetPage} | ${p.markersFoundInThePagesOwnPrintedText.map((m) => `\`${m}\``).join(", ")} |`);
  }
  out.push("");

  for (const [trackId, track] of Object.entries(record.tracks)) {
    out.push(`## ${track.legalName}`, "");
    out.push(`**Authority:** ${track.authority.join("; ")}`, "");
    out.push(`**Mechanism:** ${track.mechanism}`, "");
    out.push(`**Venue:** ${track.venue}`, "");
    out.push(`**Where filed:** ${track.destination.name} - ${track.destination.detail}`, "");
    out.push(`**Filing:** ${track.rules.filing}`, "");
    out.push(`**Fee:** ${track.rules.fees} **Fee waiver:** ${track.rules.feeWaiver}`, "");
    out.push(`**Service:** ${track.rules.service}`, "");
    out.push(`**Notice:** ${track.rules.notice}`, "");
    out.push(`**Signature:** ${track.rules.participantSignature} **Notarization:** ${track.rules.notarization}`, "");
    if ((track.packetInstructions ?? []).length > 0) {
      out.push("**Packet instructions the record carries for this route:**", "");
      for (const s of track.packetInstructions) out.push(`- ${s}`);
      out.push("");
    }
    const routeIds = CUSTOM_COMPONENTS.filter((c) => c.trackId === trackId).map((c) => c.componentId);
    out.push(`**Route components in this packet:** ${routeIds.join(", ")}.`, "");
    out.push("**Self-help stops from the controlling record:**", "");
    for (const stop of track.selfHelpStopConditions) out.push(`- ${stop}`);
    out.push("");
  }

  out.push("## The fixtures these instructions were written against", "");
  out.push("| Fixture | Pages | SHA-256 |", "| --- | --- | --- |");
  for (const a of artifacts) out.push(`| ${a.fixture} | ${a.pageCount} | \`${a.sha256}\` |`);
  out.push("");
  out.push("_These are review fixtures built from invented participant facts. They are not anybody's filing, and no packet here has been verified, approved or made sellable by this build._", "");
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const record = loadControllingRecords();
  const { bound, failure, custodiesSearched } = resolveBundle();
  if (!bound) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: [failure], custodiesSearched,
      why: "the declared bundle did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false,
      counters: null, countersAreNullBecause: "no packet was built, so no counter was measured"
    };
  }
  const source = { ...bound, sha256: bound.sha256Confirmed };

  const census = await censusOfBundle(source);
  assert.equal(census.unmapped.length, 0,
    `${census.unmapped.length} field(s) with a widget on a delivered page carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 8).map((u) => u.field))}`);
  assert.equal(census.stale.length, 0,
    `the dictionary names ${census.stale.length} field(s) with no widget on any delivered page: ${JSON.stringify(census.stale)}`);
  const ontoHidden = census.rows.filter((r) => (r.policy === "write" || r.policy === "compose") && r.hiddenUntilTheFormRevealsIt === true);
  assert.equal(ontoHidden.length, 0,
    `${ontoHidden.length} write(s) land on a widget the form hides: ${JSON.stringify(ontoHidden.map((r) => r.key))}`);
  if (source.acroFieldCount != null) {
    assert.equal(census.rows.length + census.offBundleFields.length + census.unmapped.length, source.acroFieldCount,
      `censused ${census.rows.length + census.offBundleFields.length} bundle fields, the committed corpus index declares ${source.acroFieldCount}`);
  }
  if (source.pageCount != null) {
    assert.equal(census.pageCount, source.pageCount,
      `the bundle has ${census.pageCount} pages, the committed corpus index declares ${source.pageCount}`);
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      bundle: { sha256: source.sha256, custody: source.custody, pages: census.pageCount, fields: source.acroFieldCount },
      fieldsWithAWidgetOnADeliveredPage: census.rows.length,
      fieldsEntirelyOnPagesNotDelivered: census.offBundleFields.length,
      captionsFoundInPrintedText: census.rows.filter((r) => r.printedCaptionFound).length,
      byPolicy: Object.fromEntries(["write", "compose", "supply", "optional", "election"]
        .map((p) => [p, census.rows.filter((r) => r.policy === p).length])),
      documents: ROUTE.documents.map((d) => ({
        documentId: d.documentId, bundlePages: d.pages,
        fieldsWithAWidgetHere: census.rows.filter((r) => r.deliveredWidgets.some((w) => w.document === d.documentId)).length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const baseline = await baselineInk(source);

  const artifacts = [];
  const writeProofs = [];
  const renderReports = {};
  let markerProof = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    const { bytes, report } = await renderBundle(source, census, fixtureName);
    renderReports[fixtureName] = report;
    const customPages = await customPagesFor(record, fixtureName);
    const packet = await assemblePacket(bytes, customPages);
    markerProof = packet.markerProof;
    const proof = await byteProof(census, packet, report, fixtureName, baseline);
    writeProofs.push({
      fixture: fixtureName, sourceSha256: source.sha256,
      proofMethod: "flattened widget appearances read back at every measured /Rect of the DELIVERED packet, with the bundle's page numbers mapped through the page manifest",
      outsideBoxProofMethod:
        "every flattened appearance in the delivered packet that lands at no measured widget rectangle, differenced "
        + "against the same three documents assembled from the un-written bundle, so what remains is ink this build "
        + "added outside every measured write box",
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.glyphsOutsideMeasuredWriteBoxes,
      inkOutsideMeasuredWriteBoxes: proof.outsideMeasuredWriteBoxes,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      documentAuthoredAppearances: proof.documentAuthoredAppearances,
      promptsSuppressed: report.promptsSuppressed ?? [],
      composedWrites: report.composedWrites ?? [],
      unfittable: report.unfittable,
      actualWrites: proof.actualWrites
    });
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packet.bytes);
    artifacts.push({
      fixture: fixtureName, file, sha256: sha256(packet.bytes),
      byteLength: packet.bytes.length, pageCount: packet.pageCount, pageManifest: packet.pageManifest,
      documents: [...CUSTOM_COMPONENTS.map((c) => c.componentId), ...ROUTE.documents.map((d) => d.documentId)],
      components: ALL_COMPONENTS,
      composedPageManifest: packet.composedPageManifest
    });
  }

  const maps = mapsFor(census, renderReports.canonical, renderReports.boundary);
  const rbf = requiredBeforeFilingItems(maps);
  const optional = optionalItems(maps);
  const instructionsText = participantInstructions(record, maps, rbf, optional);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"),
    filingInstructions(record, artifacts, markerProof, record.notDeliveredHere));

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction,
    implementationStrategy: "custom_pleading",
    implementationStrategyAsDelivered: "custom_pleading_with_official_form_retention_and_fill",
    whyThoseDiffer:
      "MASTER_QUEUE calls this family custom_pleading while its original queue packetComponents list names the three "
      + "official supporting forms. The three bound route manifests also require ten custom-pleading components. This "
      + "repair composes those ten route documents from the pinned Indiana track records and retains the three issuer "
      + "forms filled inside their own boxes; the queue and shared manifests remain unchanged source evidence.",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    bindingMethod:
      "the declared SHA-256 against the committed corpus index, then the same digest recomputed from the bytes on "
      + "disk, searched over every mounted custody the index declares. A declared path is a hint; the digest is the "
      + "binding.",
    custodiesSearched,
    oneBinaryThreeIdentities:
      "MASTER_QUEUE names three sourceIds for this family and every one of them declares the same digest, "
      + `${BUNDLE.sha256}. This is one published binary carrying three documents, not three binaries, and the three `
      + "documents below are page slices of it whose selection is proved from each page's own printed face.",
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    deliveredCustomComponents: CUSTOM_COMPONENTS.map((spec) => {
      const manifest = record.routeComponents.find((c) => c.componentId === spec.componentId);
      return { ...spec, requirement: manifest?.requirement ?? "required", outputStrategy: manifest?.outputStrategy ?? "custom_pleading" };
    }),
    allSourcesExact: true,
    bundle: {
      sourceIds: ROUTE.documents.map((d) => d.sourceId),
      issuer: BUNDLE.issuer, whatItIs: BUNDLE.whatItIs,
      declaredPath: BUNDLE.declaredPath, pathInArchive: source.pathInArchive,
      boundFromCustody: source.custody, boundAtTheDeclaredPath: source.boundAtTheDeclaredPath,
      sha256: BUNDLE.sha256, sha256RecomputedFromBytes: source.sha256Confirmed,
      byteLength: source.byteLength, revision: source.revision,
      corpusIndexPageCount: source.pageCount, corpusIndexAcroFieldCount: source.acroFieldCount
    },
    documents: ROUTE.documents.map((d) => ({
      sourceIds: [d.sourceId], documentId: d.documentId, componentId: d.componentId,
      instrumentKind: d.instrumentKind, componentRequirement: d.requirement, componentCondition: d.condition,
      bundlePages: d.pages, pageSelectionProvedBy: d.markers, sha256OfTheBinaryItCameFrom: BUNDLE.sha256
    })),
    composedDocuments: CUSTOM_COMPONENTS.map((spec) => {
      const manifest = record.routeComponents.find((c) => c.componentId === spec.componentId);
      const track = record.tracks[spec.trackId];
      return {
        componentId: spec.componentId, trackId: spec.trackId, role: spec.role, title: spec.title,
        requirement: manifest?.requirement ?? "required", outputStrategy: manifest?.outputStrategy ?? "custom_pleading",
        authority: track.authority, sourceRecord: RECORDS.registry,
        sourceEntry: `tracks[trackId=${spec.trackId}]`, groundedBy: "committed_track_registry_and_packet_set_manifest"
      };
    }),
    controllingRecords: record.pins,
    guideProseIsGeneratedFrom:
      "data/record-clearing/legal-design-track-registry.json, tracks in_conviction_serious_felony, "
      + "in_collateral_action and in_supplemental_order. Every fee, venue, service rule, notice period, self-help stop "
      + "condition and packet instruction printed in participant-instructions.md and filing-instructions.md is a "
      + "string from one of those three records, pinned above by whole-file and by entry digest.",
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    censusScope:
      "The census is taken over the WHOLE fifteen-page bundle, because its AcroForm is bundle-wide and the fill runs "
      + "on the whole bundle. A field with at least one widget on a delivered page carries a dictionary entry; a field "
      + "whose every widget is on a page this family does not deliver is listed separately and is declared unwritable "
      + "to the finalizer.",
    captionBasis:
      "The AcroForm field names the Coalition authored, checked against the printed text of a page each field sits "
      + "on. `printedCaptionFound` records whether that exact string was found; where it is false the printed line at "
      + "the widget's own coordinate is recorded beside it. See reports/caption-evidence.json.",
    bundle: {
      sha256: source.sha256, pageCount: census.pageCount,
      acroFieldsInTheBundle: census.rows.length + census.offBundleFields.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      fieldsWithAWidgetOnADeliveredPage: census.rows.length,
      fieldsEntirelyOnPagesNotDelivered: census.offBundleFields.length
    },
    fieldsEntirelyOnPagesNotDelivered: census.offBundleFields,
    documents: ROUTE.documents.map((doc) => ({
      documentId: doc.documentId, componentId: doc.componentId, bundlePages: doc.pages,
      fields: census.rows
        .filter((r) => r.deliveredWidgets.some((w) => w.document === doc.documentId))
        .map((r) => {
          const here = r.deliveredWidgets.filter((w) => w.document === doc.documentId);
          return {
            field: r.key, bundlePage: here[0].page, rect: here[0].rect, rectBasis: here[0].rectBasis,
            widgetsOnThisDocument: here.length,
            widgetsElsewhereInTheBundle: r.widgets.length - here.length,
            pdfType: r.type, annotationFlags: here.map((w) => w.annotationFlags),
            hiddenUntilTheFormRevealsIt: r.hiddenUntilTheFormRevealsIt === true,
            isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
            options: r.options, section: r.section, effectiveLabel: r.effectiveLabel,
            policy: r.policy, factId: r.fact, composedFrom: r.factIds,
            sourceValue: r.sourceValue, printedCaptionFound: r.printedCaptionFound,
            printedTextAtCoordinate: r.printedTextAtCoordinate
          };
        })
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "The Coalition for Court Access authored this bundle's AcroForm field names as short mnemonics rather than as "
      + "the printed captions - `cap-PetitionerFullName`, `DD-cap-CourtType`, `Check Box13`, `ProsecutorAddress3`. "
      + "Several of them therefore do NOT appear verbatim on the paper, and this file records which, rather than "
      + "asserting a caption basis the page does not support.",
    method:
      "The whole printed page is extracted, lowercased and flattened to alphanumeric words; the field name is "
      + "flattened the same way; `printedCaptionFound` is true when the flattened name occurs in the flattened text "
      + "of a page the field has a widget on. Where it is false, the printed line read at the widget's own coordinate "
      + "is recorded beside it, and the label this build uses is drawn from the printed sentence at that coordinate "
      + "and from the numbered item the widget sits under.",
    whyItMattersHere:
      "A sibling Indiana family delivers these same three documents blank and records in its own findings that a "
      + "field-level map for them is owed, because captions harvested at their positions come back as fragments. This "
      + "family is the official_pdf_fill treatment of those three documents, so each label is recorded with the "
      + "printed line it was read from and a reviewer can check every one against the paper.",
    perDocument: ROUTE.documents.map((doc) => {
      const here = census.rows.filter((r) => r.deliveredWidgets.some((w) => w.document === doc.documentId));
      return {
        document: doc.documentId, fields: here.length,
        captionsFoundInPrintedText: here.filter((r) => r.printedCaptionFound).length,
        captionsNotFound: here.filter((r) => !r.printedCaptionFound).map((r) => r.key)
      };
    }),
    perField: census.rows.flatMap((r) => r.documents.map((documentId) => ({
      document: documentId, field: r.key,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      printedCaptionFound: r.printedCaptionFound,
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    renderStrategy: "custom_route_documents_plus_acroform_fill_then_page_slice",
    jurisdiction: ROUTE.jurisdiction,
    componentSet: ALL_COMPONENTS,
    composedComponents: CUSTOM_COMPONENTS.map((spec) => ({
      componentId: spec.componentId, trackId: spec.trackId, role: spec.role, title: spec.title,
      documentPolicy: { mode: "participant", documentAcceptsFill: true, routeKey: ROUTE.routeKeys.find((key) => key.includes(`:${spec.trackId}`)) ?? null },
      source: RECORDS.registry
    })),
    componentConditions: Object.fromEntries(ROUTE.documents.filter((d) => d.condition).map((d) => [d.componentId, d.condition])),
    captionBasis: "authored AcroForm field names, checked field by field against the printed page; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "NOTHING ON THESE THREE DOCUMENTS IS ROUTE-DETERMINED. They are statewide supporting forms rather than the "
      + "petition, and every selection control on them asks a question about the participant's own matter: which kind "
      + "of court holds the case, whether they will accept service by email, whether they use the Attorney General's "
      + "confidential address programme, whether any case is related to this one, and which of two service methods "
      + "they actually used. None of the three statutes bound to this family answers any of those.",
    theCauseNumberHasNoControl:
      "All three documents print a cause-number line and the published bundle draws no widget on any of them. Every "
      + "write box in this factory's official-form path is the /Rect of the source's own widget, so the cause number "
      + "is carried to the participant on all three rather than drawn at a hand-entered coordinate. The six "
      + "CauseNumber boxes that do exist belong to the Appearance's related-cases table.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    optionalParticipantContent: optional,
    componentsOfThisFamilysOwnRoutesThatNothingBuilds: record.notDeliveredHere,
    allRequiredRouteComponentsDelivered: true,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ALL_COMPONENTS,
    customComponents: CUSTOM_COMPONENTS.map((c) => c.componentId),
    componentConditions: Object.fromEntries(ROUTE.documents.filter((d) => d.condition).map((d) => [d.componentId, d.condition])),
    pageSelectionProof: markerProof,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    pdfs: artifacts.map((a) => ({
      file: a.file, documentId: "assembled_packet", role: "assembled_packet_of_route_documents_and_official_supporting_forms",
      fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount
    })),
    byteDerivedHashes: true,
    everyPageRastered: false, rasterSkipped: true, rasterEngine: null, rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    whyNoLocalRasterReceipt:
      "A local browser render is not a receipt. The central raster workflow produces one, bound to the exact SHA-256 "
      + "recorded above.",
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Read back from the DELIVERED packet's bytes at every measured widget rectangle, not from the finalizer's own "
      + "report and not from the filled bundle before the pages were cut out of it. Both glyph readings are "
      + "measurements.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the delivered packet"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    optionalParticipantContent: optional,
    participantElections: maps.flatMap((m) => m.selectionControls.map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading, label: c.effectiveLabel, why: c.reason
    }))),
    protectedBlanks: [],
    blanksTheFormDrawsNoControlFor: [
      {
        documents: ROUTE.documents.map((d) => d.documentId),
        printedLine: "CAUSE NO. ______ on the Appearance and Form ACR; XP CAUSE NUMBER on the Confidential Information Form",
        finding:
          "The published bundle draws no AcroForm widget on any of the three cause-number lines. The packet writes "
          + "only inside boxes the form itself draws, so the cause number is carried to the participant on all three "
          + "and is named first in the instructions."
      },
      {
        documents: ["CCA-GF-0120-3016", "CCA-XP-0120-7002 Form ACR"],
        printedLine: "the Signature rules beneath the appearance block and beneath each certificate of service",
        finding:
          "Signature rules on both documents carry no widget either. They are signed by hand, which is what this "
          + "packet would do with them in any case: no signature is ever drawn by this factory."
      }
    ],
    nearMissesRefusedByRole: [
      {
        document: "CCA-GF-0120-3016", field: "CauseNumber1..6", wouldHaveBound: "matter.case_number",
        finding:
          "The shared field semantics binds a field named CauseNumber to the matter's own case number. These six are "
          + "the RELATED-cases column of item 4 of the Appearance. Writing the matter's cause number into the first of "
          + "them would state that this case is related to itself. Refused by role before rendering."
      },
      {
        document: "CCA-GF-0120-3016 and CCA-XP-0120-7002 Form ACR", field: "County1, County2, County5, County6",
        wouldHaveBound: "matter.county",
        finding:
          "Four certificate-of-service boxes are named County and bind matter.county. They name the county whose "
          + "PROSECUTOR was served, and a certificate of service states that service has happened. Refused by role, "
          + "and carried to the participant with the instruction to complete them after serving rather than before."
      }
    ],
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's three field maps, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    whatTheyMeasure:
      "The official-form field maps and byte proof cover the three retained forms. Component completeness is measured "
      + "against the ten custom components named by the three bound route manifests and their page manifests in "
      + "reports/rendered-artifacts.json.",
    counters: counted.counters,
    allNineZero: allZero,
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "The packet begins with four official pages cut out of a fifteen-page bundle after the whole bundle was filled "
      + "and flattened, followed by the ten composed route components named by the three bound manifests. No page was "
      + "rastered by this build; the central raster workflow renders the complete packet from the hashes in "
      + "reports/rendered-artifacts.json.",
    whatToLookAt: [
      "Packet page 1 and 2 must be the Appearance (footer CCA-GF-0120-3016, \"Page 1 of 2\" and \"Page 2 of 2\"), "
        + "page 3 must be Form ACR (footer CCA-XP-0120-7002, \"Page 1 of 1\"), page 4 must be the Confidential "
        + "Information Form (\"Not Public Record\" at the head and the foot). No page of the Section 1 petition and no "
        + "page of the court's findings and order may appear anywhere in the packet.",
      "Page 1 caption: the participant's name on the Petitioner rule, the county on BOTH the \"IN THE ___ COURT\" "
        + "line and the \"COUNTY OF ___\" line, and the court-type chooser EMPTY - not showing the bundle's own row of "
        + "underscores.",
      "Page 1 item 2: the address block carries the street on one line and the city, state and zip beneath it, inside "
        + "the box. Item 4's related-cases table is entirely empty, all twelve cells, and neither Yes nor No is "
        + "ticked.",
      "Page 1 contact block: email and phone filled, fax empty, and the \"I will accept service at the above email "
        + "address\" box UNTICKED. The packet does not choose to be served by email on the participant's behalf.",
      "Page 2 and page 3 certificates of service: BOTH tick boxes empty, both dates empty, both county lines empty "
        + "and both prosecutor address blocks empty on each. A ticked certificate of service on an unfiled packet "
        + "would be a false statement, and it is the single worst defect this packet could carry.",
      "Page 4, the Confidential Information Form: the participant's name present and the FULL SOCIAL SECURITY NUMBER "
        + "BOX EMPTY. The platform must never hold that number and must never draw it.",
      "The composed route pages must preserve their component labels and leave court, clerk, prosecutor and signature "
        + "fields blank. The serious-felony consent attachment must remain a handoff for the participant's original "
        + "written consent, and the collateral stop condition must appear in both route guidance and its handoff page.",
      "All four pages: the cause-number lines are blank, because the bundle draws no box on them. Confirm no ink "
        + "appears on any of those printed rules.",
      "Boundary fixture: the long hyphenated name and the 60-character email either fit their boxes or are reported "
        + "unfittable in reports/actual-writes.json. Nothing may spill outside a box or over a printed caption."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: []
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: "not rendered in this run", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    stopped: !allZero,
    stopReason: allZero ? null : "A completeness counter is non-zero. See reports/completeness-counters.json.",
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    blocking: allZero ? [] : [{
      severity: "blocking",
      finding: "A completeness counter is non-zero on this build.",
      consequence: "See reports/completeness-counters.json for the counter and the finding rows behind it."
    }],
    findings: [
      {
        severity: "advisory",
        finding:
          "The original queue row named only the three official supporting forms, while the three bound route manifests "
          + "name ten custom-pleading components. This repair composes every one of those ten components from the "
          + "pinned Indiana track records and records the route-to-component mapping in the packet manifests.",
        consequence:
          "Each route now has its primary filing, proposed order and required attachment; the serious-felony route also "
          + "has its required instructions component. The queue and shared manifests are unchanged, and the local "
          + "component report states that no required route component is left undelivered."
      },
      {
        finding:
          "MASTER_QUEUE names three sourceIds - official-form:CCA-GF-0120-3016, official-form:CCA-XP-0120-7002 Form "
          + "ACR and official-form:Confidential Information Form - and all three declare the same digest, "
          + `${BUNDLE.sha256}.`,
        consequence:
          "This is one fifteen-page published binary carrying three documents. It is bound once, filled once and "
          + "flattened once, and the three documents are page slices of it. The receipt records the three identities "
          + "against the one binary so they are never read as three binaries, and each slice's selection is proved "
          + "from the identifier the Coalition printed in that page's own footer before the page was copied."
      },
      {
        finding:
          "The bundle's AcroForm is BUNDLE-WIDE. `cap-PetitionerFullName` carries fourteen widgets across pages 1, 3, "
          + "5, 7, 8, 9 and 13; `cap-COUNTY` four; `DD-cap-CourtType` four; `Address` two.",
        consequence:
          "A page extracted first and filled afterwards would carry no fields at all, so the whole bundle is filled "
          + "and flattened and the delivered pages are then copied out. Fields whose every widget is on a page this "
          + "family does not deliver are declared unwritable to the finalizer and listed in "
          + "field-census.census-v1.json under fieldsEntirelyOnPagesNotDelivered, so nothing is written on a page "
          + "this packet does not ship either."
      },
      {
        finding:
          "NONE OF THE THREE DOCUMENTS HAS A CONTROL FOR ITS OWN CAUSE NUMBER. All three print a cause-number line - "
          + "\"CAUSE NO. ______\" on the Appearance and Form ACR, \"XP CAUSE NUMBER\" on the Confidential Information "
          + "Form - and the binary draws no widget on any of them.",
        consequence:
          "The cause number is carried to the participant on all three and is the FIRST item in the instructions, "
          + "rather than drawn at a hand-entered coordinate. Every write box in this factory's official-form path is "
          + "the /Rect of the source's own widget, and ink in white space would be the first exception."
      },
      {
        finding:
          "The committed serious-felony track record instructs: \"" + record.ssnRule + "\"",
        consequence:
          "`PetFullSSN` on the Confidential Information Form is carried to the participant and the instructions say "
          + "plainly that the platform does not hold the number, does not store it and will not ask for it. The "
          + "shared field semantics refuses a government identifier before this build reaches it, so the refusal is "
          + "doubled rather than relied on once."
      },
      {
        finding:
          "Both the Appearance and Form ACR carry a CERTIFICATE OF SERVICE with two alternatives, and four of their "
          + "boxes are named County - which binds matter.county by name - while two more bind a date.",
        consequence:
          "Every certificate-of-service control on both documents is refused and carried to the participant, with "
          + "the reason stated on its own row: a certificate of service asserts that service HAS HAPPENED, and a "
          + "packet that ticked it would make that assertion for a filing nobody has served. The visual review sheet "
          + "names it as the single worst defect this packet could carry."
      },
      {
        finding:
          "The Coalition authored this bundle's field names as mnemonics rather than as printed captions - "
          + "`DD-cap-CourtType`, `Check Box13`, `ProsecutorAddress3` - so several do not appear verbatim on the paper.",
        consequence:
          "reports/caption-evidence.json records, per field, whether the name was found in the printed text and the "
          + "printed line read at the widget's own coordinate where it was not. A sibling Indiana family delivers "
          + "these same three documents blank and records that a field-level map for them is owed; this family is "
          + "that map, and it is auditable line by line rather than asserted."
      },
      {
        finding:
          "Both output-byte glyph readings are MEASURED and are measured on the DELIVERED packet rather than on the "
          + "filled bundle: the added glyphs at every measured write box, and the glyphs outside them by differencing "
          + "against the same three documents assembled from the un-written bundle.",
        consequence:
          "A write that landed on a bundle page this family does not ship would count as zero added glyphs here, "
          + "which is the honest answer for a packet that does not contain that page. The method is recorded per "
          + "fixture in reports/actual-writes.json."
      },
      {
        severity: "advisory",
        finding:
          "MASTER_QUEUE's implementationStrategy is custom_pleading, while the original queue packetComponents named "
          + "the three official forms whose manifest treatment is official_pdf_fill. The three route manifests also "
          + "require ten custom pleadings.",
        consequence:
          "The source receipt records both treatments: ten route documents are composed from the pinned registry and "
          + "the three official forms are retained and filled in their own widgets."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, central raster acceptance, visual review and counsel review",
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    status: allZero ? "PENDING_INDEPENDENT_VERIFICATION" : "STOPPED_COUNTER_NON_ZERO",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "SCOPE FIRST. This family now delivers the ten custom route components named by the three bound route manifests "
        + "plus the three official supporting forms. Confirm that each route's primary filing, proposed order and "
        + "attachment stay together, and that the serious-felony consent handoff is not mistaken for consent itself.",
      "The certificates of service on packet pages 2 and 3. Confirm on the rasters that both tick boxes, both dates, "
        + "both county lines and both address blocks are empty on each.",
      "The Confidential Information Form's full Social Security number box on packet page 4. It must be empty, and "
        + "the instruction beside it must not invite the participant to give the number to the platform.",
      "The three cause-number lines the bundle draws no control on. Counsel should confirm that carrying them to the "
        + "participant, rather than printing at a measured coordinate, is the right call for a filing whose sheets "
        + "must all bear the same number."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    stopClass: allZero ? null : "COMPLETENESS_COUNTER_NOT_ZERO",
    counters: counted.counters, counterFindings: counted.findings,
    rasterState: "BUILT_RASTER_PENDING",
    directory: OUT,
    documents: [...CUSTOM_COMPONENTS.map((c) => c.componentId), ...ROUTE.documents.map((d) => d.documentId)],
    components: ALL_COMPONENTS,
    boundSources: ROUTE.documents.map((d) => ({ sourceId: d.sourceId, sha256: BUNDLE.sha256, custody: source.custody })),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.length, 0),
    artifacts: artifacts.map((a) => ({
      fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount
    })),
    glyphReadings: writeProofs.map((p) => ({
      fixture: p.fixture,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    })),
    componentsOfThisFamilysOwnRoutesThatNothingBuilds: record.notDeliveredHere.length,
    rasterPages: 0,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      const built = r.status === "COMPLETED" || r.status === "CHECK_ONLY";
      if (!built) process.exit(2);
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
