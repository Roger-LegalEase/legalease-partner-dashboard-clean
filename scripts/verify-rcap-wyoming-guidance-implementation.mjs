// Wyoming process guidance — component verification.
//
// Proves what a rendered sheet cannot prove by looking right: Wyoming is not
// enabled and the shared surfaces are untouched; the assignment is exactly
// wy_nc_1401-filing-instructions-5, with the four delivered custom-pleading
// components present in the packet but implemented elsewhere and the two
// blocked tracks absent; the sheet holds the design's controlling facts on its
// face and states none of the things the design forbids; every material
// fail-closed branch throws a typed stop naming a reason, a destination and a
// next step, and none routes back into the step it just closed; one canonical
// sample renders deterministically and every page of it is read line by line;
// and nothing this lane owns claims the packet is filing-complete.
//
// Six boundaries carry most of section 3:
//
//   1. The statutory filing fee is $0, stated as the statute setting no fee and
//      never as a fee that has been waived. It is the only amount printed.
//   2. The prosecuting attorney is the service recipient. The Division of
//      Criminal Investigation is not, and no instrument to it is generated.
//   3. No summons, praecipe, victim notice or prosecutor response exists on
//      this route, and none is generated.
//   4. No service fact is stated as completed, and no period is calculated.
//   5. Wyoming publishes no statewide form, so no form number is cited, and the
//      judicial and clerk fields stay blank.
//   6. Casper Municipal Court's packets bind that court alone, and unpublished
//      county preference is sent to the participant's own clerk rather than
//      asserted here.
//
// Runs offline against the real renderer, resolver and assembler. No network,
// no database, no promotion.

import { register } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { PLEADING_TEMPLATES } = await import("@/lib/rcap/packets/engines/pleading-templates");
const processGuidance = await import("@/lib/rcap/packets/engines/process-guidance");
const { resolvePacket } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const {
  WY_CUSTOM_PLEADING_TRACKS,
  WY_PLEADING_TEMPLATES,
  deriveWyomingFacts
} = await import("@/lib/rcap/packets/jurisdictions/wyoming/custom-pleading");
const {
  WYOMING_GUIDANCE_TEMPLATES,
  WY_FILING_INSTRUCTIONS_TEMPLATE_ID,
  WY_FILING_INSTRUCTIONS_NOTICE,
  WY_GUIDANCE_COMPONENT,
  WY_GUIDANCE_COMPONENT_ID,
  WY_GUIDANCE_TRACK_ID,
  WY_GUIDANCE_ROLE,
  WY_GUIDANCE_DESIGN_ROLE,
  WY_GUIDANCE_PACKET_TRACKS,
  WY_GUIDANCE_DESTINATIONS,
  WY_GUIDANCE_EXCLUDED_TRACK_IDS,
  WY_GUIDANCE_EXCLUDED_INSTRUMENTS,
  WY_GUIDANCE_FOREIGN_COMPONENT_IDS,
  WY_GUIDANCE_GATE_KEYS,
  WY_GUIDANCE_REFUSED_REQUESTS,
  withWyomingGuidanceComponent,
  deriveWyomingGuidanceFacts,
  refuseWyomingGuidanceRequest,
  WyomingGuidanceStopError,
  WyomingGuidanceBranchError,
  WyomingGuidanceComponentError
} = await import("@/lib/rcap/packets/jurisdictions/wyoming/guidance");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");

const MODULE_PATH = "src/lib/rcap/packets/jurisdictions/wyoming/guidance.ts";
const VERIFIER_PATH = "scripts/verify-rcap-wyoming-guidance-implementation.mjs";

// ---------------------------------------------------------------------------
// 0. Wyoming is not enabled, and the shared surfaces are intact
// ---------------------------------------------------------------------------

ok(
  RELIEF_TRACKS.filter((track) => track.jurisdiction === "WY").length === 0,
  "Wyoming already has a track in the shared relief-track registry."
);
ok(
  Object.keys(WYOMING_GUIDANCE_TEMPLATES).every(
    (id) => !Object.prototype.hasOwnProperty.call(processGuidance.GUIDANCE_TEMPLATES, id)
  ),
  "A Wyoming guidance template is registered in the shared guidance template pack."
);
ok(
  WY_GUIDANCE_PACKET_TRACKS.every((track) => track.runtimeDisabled === true),
  "A Wyoming packet-context track is not runtime-disabled."
);
ok(
  WY_GUIDANCE_PACKET_TRACKS.every((track) => track.technicalFixture === true),
  "A Wyoming packet-context track is not a technical fixture."
);
ok(
  WY_GUIDANCE_PACKET_TRACKS.every((track) => track.statuses.runtime === "runtime_disabled"),
  "A Wyoming packet-context track does not compute to runtime_disabled."
);
note(
  `0. Enablement: Wyoming is absent from the shared registry, the ${Object.keys(WYOMING_GUIDANCE_TEMPLATES).length} guidance template is absent from the shared pack, and the packet-context track computes runtime_disabled.`
);

// The delivered track object is another assignment's. Composing the packet
// context must not have reached into it.
const deliveredComponentCount = WY_CUSTOM_PLEADING_TRACKS.find(
  (track) => track.trackId === WY_GUIDANCE_TRACK_ID
).packetSet.components.length;
ok(
  deliveredComponentCount === 4,
  `Composing the packet context mutated the delivered custom-pleading track: it now carries ${deliveredComponentCount} components rather than 4.`
);
ok(
  withWyomingGuidanceComponent(WY_GUIDANCE_PACKET_TRACKS)
    .find((track) => track.trackId === WY_GUIDANCE_TRACK_ID)
    .packetSet.components.filter((c) => c.componentId === WY_GUIDANCE_COMPONENT_ID).length === 1,
  "Composing the packet context twice adds the guidance component twice."
);
note(
  "0. Ownership: the delivered custom-pleading track still carries its own 4 components, and composition is idempotent."
);

for (const track of WY_GUIDANCE_PACKET_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, WY_PLEADING_TEMPLATES);
Object.assign(processGuidance.GUIDANCE_TEMPLATES, WYOMING_GUIDANCE_TEMPLATES);

// ---------------------------------------------------------------------------
// 1. The assignment is one component
// ---------------------------------------------------------------------------

ok(
  Object.keys(WYOMING_GUIDANCE_TEMPLATES).length === 1,
  `This lane owns ${Object.keys(WYOMING_GUIDANCE_TEMPLATES).length} guidance templates rather than one.`
);
ok(
  WY_GUIDANCE_COMPONENT_ID === "wy_nc_1401-filing-instructions-5",
  `The implemented component is ${WY_GUIDANCE_COMPONENT_ID} rather than the assigned one.`
);
ok(WY_GUIDANCE_TRACK_ID === "wy_nc_1401", `The track is ${WY_GUIDANCE_TRACK_ID} rather than wy_nc_1401.`);
ok(
  WY_GUIDANCE_COMPONENT.outputStrategy === "process_guidance" &&
    WY_GUIDANCE_COMPONENT.rendererStrategy === "process_guidance",
  "The component does not declare the process-guidance strategy the design gives it."
);
ok(
  WY_GUIDANCE_DESIGN_ROLE === "filing_instructions" && WY_GUIDANCE_ROLE === "instructions",
  "The design role is not carried, or is not translated to the engine's own closed role list."
);
ok(WY_GUIDANCE_COMPONENT.requirement === "required", "The component is not required.");
ok(WY_GUIDANCE_COMPONENT.order === 5, `The component is at order ${WY_GUIDANCE_COMPONENT.order} rather than 5.`);
ok(
  WY_GUIDANCE_COMPONENT.sourcePath === null && WY_GUIDANCE_COMPONENT.sourceSha256 === null,
  "The component names an official source. Wyoming publishes no statewide form."
);
ok(
  WY_GUIDANCE_COMPONENT.approval.visual === "not_reviewed" &&
    WY_GUIDANCE_COMPONENT.approval.legal === "not_submitted",
  "The component claims a visual or legal approval this lane cannot grant."
);

for (const excluded of WY_GUIDANCE_EXCLUDED_TRACK_IDS) {
  ok(
    WY_GUIDANCE_PACKET_TRACKS.every((track) => track.trackId !== excluded),
    `The blocked track ${excluded} is implemented.`
  );
  ok(
    !Object.keys(WYOMING_GUIDANCE_TEMPLATES).some((id) => id.includes(excluded.replace(/_/g, "-"))),
    `A guidance template exists for the blocked track ${excluded}.`
  );
}

// The four delivered components are another assignment's owned work. This lane
// renders them to read its own sheet in context and implements none of them.
for (const foreign of WY_GUIDANCE_FOREIGN_COMPONENT_IDS) {
  ok(
    !Object.keys(WYOMING_GUIDANCE_TEMPLATES).some(
      (id) => WYOMING_GUIDANCE_TEMPLATES[id].templateId === foreign
    ),
    `This lane implements the delivered component ${foreign}.`
  );
}
note(
  `1. Assignment: one component (${WY_GUIDANCE_COMPONENT_ID}), one template, design role ${WY_GUIDANCE_DESIGN_ROLE} carried as engine role ${WY_GUIDANCE_ROLE}; ${WY_GUIDANCE_FOREIGN_COMPONENT_IDS.length} delivered components untouched and ${WY_GUIDANCE_EXCLUDED_TRACK_IDS.length} blocked tracks absent.`
);

// ---------------------------------------------------------------------------
// 2. The packet this sheet sits in
// ---------------------------------------------------------------------------

const CANONICAL_SAMPLE = {
  fixtureId: "wy_nc_1401-canonical",
  trackId: WY_GUIDANCE_TRACK_ID,
  answers: {
    arrestDate: "2021-03-14",
    arrestCounty: "Albany",
    chargesFiled: "yes",
    caseNumber: "CR-2021-0184",
    courtName: "Albany County Circuit Court",
    qualifyingDisposition: "dismissed_by_court",
    dispositionDate: "2021-09-02",
    deferredDisposition: "no",
    deferralToLesserCharge: "no",
    deferralUnderlyingLevel: "",
    pendingCharges: "no",
    dciRecordStatus: "yes",
    prosecutingAttorneyIdentified: "yes",
    serviceAlreadyCompleted: "no"
  }
};

/**
 * A second sample, differing in every track answer this sheet does not print.
 *
 * It exists to justify there being one canonical sample rather than a family of
 * them: the sheet is statewide text plus the participant's own court, so where
 * the court is held constant a different route through the same track must
 * produce byte-identical guidance. If that ever stops being true the sheet has
 * started varying with an input, and this assertion fails rather than a variant
 * quietly going missing.
 */
const SAME_COURT_DIFFERENT_ROUTE = {
  ...CANONICAL_SAMPLE.answers,
  chargesFiled: "no",
  caseNumber: "",
  qualifyingDisposition: "no_charges_filed",
  dispositionDate: "",
  dciRecordStatus: "no"
};

function factsFor(answers) {
  return {
    ...deriveWyomingFacts(WY_GUIDANCE_TRACK_ID, answers),
    ...deriveWyomingGuidanceFacts(WY_GUIDANCE_COMPONENT_ID, answers)
  };
}

async function renderPacket(answers) {
  const facts = factsFor(answers);
  const resolved = resolvePacket({
    jurisdiction: "WY",
    trackId: WY_GUIDANCE_TRACK_ID,
    facts,
    allowTechnicalFixtures: true
  });
  const rendered = [];
  for (const component of resolved.components) {
    rendered.push({
      component,
      result: await renderPacketComponent({
        component,
        jurisdiction: "WY",
        geography: null,
        facts,
        rootDir: root
      })
    });
  }
  const assembled = await assemblePacketPdf({
    jurisdiction: "WY",
    jurisdictionName: "Wyoming",
    packetName: resolved.track.assembledPacketName,
    caseReference: answers.caseNumber || "no-case-number",
    title: resolved.track.assembledPacketTitle,
    components: rendered.map((entry) => ({
      componentId: entry.component.componentId,
      role: entry.component.role,
      order: entry.component.order,
      bytes: entry.result.bytes
    }))
  });
  return { resolved, rendered, assembled };
}

const canonical = await renderPacket(CANONICAL_SAMPLE.answers);

ok(
  canonical.resolved.runtimeStatus === "runtime_disabled",
  `The canonical sample resolved to ${canonical.resolved.runtimeStatus}.`
);
ok(
  canonical.resolved.components.length === 5,
  `The packet resolved ${canonical.resolved.components.length} components rather than the design's 5.`
);
const orders = canonical.resolved.components.map((c) => c.order);
ok(
  orders.join(",") === "1,2,3,4,5",
  `The packet component order is ${orders.join(",")} rather than 1,2,3,4,5.`
);
const guidanceEntry = canonical.rendered.find(
  (entry) => entry.component.componentId === WY_GUIDANCE_COMPONENT_ID
);
ok(Boolean(guidanceEntry), "The guidance component did not render in the packet context.");
ok(
  canonical.resolved.components.every(
    (component) =>
      component.componentId === WY_GUIDANCE_COMPONENT_ID ||
      WY_GUIDANCE_FOREIGN_COMPONENT_IDS.includes(component.componentId)
  ),
  "The packet resolved a component that is neither this lane's nor the delivered four."
);
ok(
  guidanceEntry.result.rendererStrategy === "process_guidance",
  "The sheet did not render through the shared process-guidance engine."
);
ok(
  guidanceEntry.result.metadata.isCourtFiling === false,
  "The sheet's metadata does not record that it is not a court filing."
);
ok(
  guidanceEntry.result.sourceIdentity === WY_FILING_INSTRUCTIONS_TEMPLATE_ID,
  "The sheet does not carry its own approved template identity."
);
ok(
  guidanceEntry.result.sourceSha256 === null,
  "The sheet claims an official source hash. It is generated, not filled."
);
ok(guidanceEntry.result.warnings.length === 0, `The sheet rendered with warnings: ${guidanceEntry.result.warnings.join("; ")}.`);
const guidanceRange = canonical.assembled.componentRanges.find(
  (range) => range.componentId === WY_GUIDANCE_COMPONENT_ID
);
ok(
  guidanceRange.endPage === canonical.assembled.pageCount,
  "The sheet is not the last thing in the assembled packet."
);
note(
  `2. Packet context: ${canonical.resolved.components.length} components in order 1-5, assembled to ${canonical.assembled.pageCount} pages, with the sheet at pages ${guidanceRange.startPage}-${guidanceRange.endPage} and ${guidanceEntry.result.pageCount} pages of its own.`
);

// Determinism: same answers, same bytes.
const repeat = await renderPacket(CANONICAL_SAMPLE.answers);
const repeatGuidance = repeat.rendered.find(
  (entry) => entry.component.componentId === WY_GUIDANCE_COMPONENT_ID
);
ok(
  sha(guidanceEntry.result.bytes) === sha(repeatGuidance.result.bytes),
  "The sheet is not deterministic: two renders of the canonical sample differ."
);
ok(
  canonical.assembled.sha256 === repeat.assembled.sha256,
  "The assembled packet is not deterministic across two runs."
);

// One canonical sample is enough because the sheet does not vary with the route.
const otherRoute = await renderPacket(SAME_COURT_DIFFERENT_ROUTE);
const otherGuidance = otherRoute.rendered.find(
  (entry) => entry.component.componentId === WY_GUIDANCE_COMPONENT_ID
);
ok(
  sha(guidanceEntry.result.bytes) === sha(otherGuidance.result.bytes),
  "The sheet varies with a track answer other than the court, so one canonical sample no longer covers it and a variant is owed."
);
note(
  `2. Fixture: one canonical sample (${CANONICAL_SAMPLE.fixtureId}), byte-identical across two runs and across a different route through the same track in the same court, so no variant is owed.`
);

// ---------------------------------------------------------------------------
// 3. What the sheet says, read off its own rendered bytes
// ---------------------------------------------------------------------------

const WIN_ANSI = { 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—", 0xa7: "§" };
const decodeByte = (code) =>
  code >= 32 && code < 127 ? String.fromCharCode(code) : (WIN_ANSI[code] ?? (code === 0 ? "" : "�"));

/** Page-by-page lines, in reading order, from a rendered PDF's own bytes. */
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
    let content;
    try {
      content = zlib.inflateSync(buffer.subarray(from, end)).toString("latin1");
    } catch {
      content = buffer.subarray(from, end).toString("latin1");
    }
    if (!/\bTm\b/.test(content) || !/\bTj\b/.test(content)) continue;

    const runs = [];
    // Every drawText emits a text matrix and then one show-text operator. Both
    // the hex and the literal-string forms appear, depending on the font, and
    // reading only one of them silently loses whole lines.
    const pattern =
      /1\s+0\s+0\s+1\s+([-\d.]+)\s+([-\d.]+)\s+Tm[\s\S]*?(?:<([0-9a-fA-F\s]*)>|\(((?:\\.|[^\\)])*)\))\s*Tj/g;
    let match;
    while ((match = pattern.exec(content))) {
      let text = "";
      if (match[3] !== undefined) {
        const hex = match[3].replace(/\s+/g, "");
        for (let i = 0; i + 1 < hex.length; i += 2) {
          text += decodeByte(parseInt(hex.slice(i, i + 2), 16));
        }
      } else {
        const raw = match[4] ?? "";
        for (let i = 0; i < raw.length; i += 1) {
          if (raw[i] !== "\\") {
            text += decodeByte(raw.charCodeAt(i));
            continue;
          }
          const next = raw[i + 1];
          if (next >= "0" && next <= "7") {
            let oct = "";
            let j = i + 1;
            while (j < raw.length && oct.length < 3 && raw[j] >= "0" && raw[j] <= "7") oct += raw[j++];
            text += decodeByte(parseInt(oct, 8));
            i = j - 1;
            continue;
          }
          text += { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" }[next] ?? next;
          i += 1;
        }
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
        .sort((a, b) => b[0] - a[0])
        .map(([, group]) => group.sort((a, b) => a.x - b.x).map((run) => run.text).join("   ").trim())
        .filter((line) => line !== "")
    );
  }
  return pages;
}

const pages = renderedPages(guidanceEntry.result.bytes);
// The sheet's own text, and nothing from the four documents it sits behind.
// A packet-wide read would let a delivered pleading satisfy an assertion about
// this sheet, and would let its verification prose trip this sheet's bans.
const sheet = pages.map((lines) => lines.join(" ")).join(" ");

ok(
  pages.length === guidanceEntry.result.pageCount,
  `The sheet reads as ${pages.length} pages but the renderer reported ${guidanceEntry.result.pageCount}.`
);

const REQUIRED = [
  [/This document is not a court filing\./, "the not-a-court-filing sentence"],
  [/There is no statutory filing fee for this petition/, "the no-statutory-fee statement"],
  [/sets none, so the amount is \$0/, "the $0 amount"],
  [/not a fee that has been waived/, "the fee-is-not-waived statement"],
  [/served on the prosecuting attorney/, "the prosecuting attorney as service recipient"],
  [/Division of Criminal Investigation is not served/, "DCI excluded as a service recipient"],
  [/no document to the Division is generated/, "no DCI instrument generated"],
  [/No summons is generated and none is required/, "no summons"],
  [/No praecipe is generated and none is required/, "no praecipe"],
  [/No victim notice is generated/, "no victim-notice instrument"],
  [/that is that office's own work and is not a document you file/, "victim notice as outside-party work"],
  [/No prosecutor response is generated/, "no prosecutor response"],
  [/written entirely in the future/, "the certificate of service as not-yet-completed"],
  [/Nothing generated for you says that service has happened/, "no completed service fact"],
  [/no statewide expungement petition form and no statewide proposed-order/, "no statewide form"],
  [/no Wyoming statewide form number/i, "no form number to cite"],
  [/drafted documents rather than an official form/, "the petition and order as drafted pleadings"],
  [/Leave alone[\s\S]{0,120}judge's findings/, "judicial fields left to the court"],
  [/blank on purpose because only the court completes them/, "clerk and judicial fields blank"],
  [/Casper Municipal Court/, "the Casper boundary"],
  [/bind that court alone/, "Casper bound to that court alone"],
  [/Natrona County Circuit Court/, "Casper not imported into Natrona County"],
  [/no order may be granted before 20 days/i, "the statutory objection window"],
  [/at least 180 days/, "the statutory waiting period"],
  [/has not calculated any of those dates/, "no period calculated"],
  [/cover sheet, how\s+many copies|whether it wants a cover sheet/, "the clerk call on local mechanics"],
  [/No Wyoming county has been surveyed/, "county preference not asserted"],
  [/proposed Order for Expungement with that clerk/, "where the packet is filed"]
];
for (const [pattern, what] of REQUIRED) {
  ok(pattern.test(sheet), `The sheet does not state ${what}.`);
}

// Prohibitions. Each is written to catch an assertion rather than a denial, so
// the sheet's own disclaimers cannot satisfy or trip it.
const FORBIDDEN = [
  [/\b\d{2,5}\s+[A-Z][a-z]+\s+(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Drive|Dr\.|Boulevard|Blvd\.?|Lane|Way|Suite)\b/, "a street address"],
  [/\bP\.?\s?O\.?\s+Box\s+\d+/i, "a post office box"],
  [/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:gov|org|com|us)\b/i, "a web address or portal"],
  [/\(\d{3}\)\s*\d{3}-\d{4}|\b\d{3}-\d{3}-\d{4}\b/, "a telephone number"],
  [/\b(?:bring|file|submit|make|provide)\s+(?:\w+\s+){0,3}\b(?:two|three|four|five|\d+)\s+copies\b/i, "a copy count"],
  [/\bmust\s+(?:use|attach|include|file)\s+a\s+cover\s+sheet\b/i, "a cover-sheet requirement"],
  [/\bhearing\s+(?:is\s+set\s+for|date\s+is)\s+\S/i, "a hearing date"],
  [/\b(?:was|has been|have been)\s+(?:filed|served)\b/i, "a claim that filing or service has occurred"],
  [/\bthe (?:court|judge) has (?:found|granted|ordered|entered|signed)\b/i, "a claim that the court has acted"],
  [/\bthe clerk has (?:filed|entered|certified)\b/i, "a claim that the clerk has acted"],
  [/\byour record (?:is|will be) clear(?:ed)?\b/i, "a promise about the result"],
  [/\bfee\s+(?:has been|is|was)\s+waived\b/i, "a waived fee"],
  [/\bfee waiver (?:is |may be )?(?:available|granted)\b/i, "an available fee waiver"],
  [/\bForm\s+(?:No\.?\s*)?[A-Z]{1,4}[-\s]?\d+/i, "an official form number"],
  [/\bin\s+[A-Z][a-z]+\s+County\s+you\s+must\b/i, "a county-specific requirement"],
  [/\$(?!0\b)[\d,]+/, "an amount other than the $0 statutory fee"],
  [/\{\{|\}\}/, "an unresolved placeholder"],
  [/\bundefined\b|\bNaN\b|\[object Object\]/, "a rendering artifact"],
  [/(?<![A-Za-z])(?:true|false|null)(?![A-Za-z])/, "a raw boolean or null"],
  [/\b(?:packet[_ -]?ready|runtimeDisabled|ownedPaths|templateId|componentId|trackId|outputStrategy|rendererStrategy|semantic fingerprint|process_guidance|custom_pleading|legal[_ -]design|memo)\b/i, "internal design jargon"],
  [/\bwy_misd_1501\b|\bwy_fel_1502\b|\b7-13-1501\b|\b7-13-1502\b/, "a blocked Wyoming track"]
];
for (const [pattern, what] of FORBIDDEN) {
  ok(!pattern.test(sheet), `The sheet states ${what}.`);
}

// Every instrument the design excludes is either absent or explicitly negated.
for (const instrument of ["summons", "praecipe"]) {
  const affirmative = new RegExp(`(?<!no )\\b${instrument}\\b(?![\\s\\S]{0,40}is (?:generated|required))`, "i");
  ok(!affirmative.test(sheet), `The sheet refers to a ${instrument} as something this packet produces.`);
}
ok(
  WY_GUIDANCE_EXCLUDED_INSTRUMENTS.length === 11,
  `The excluded-instrument list carries ${WY_GUIDANCE_EXCLUDED_INSTRUMENTS.length} entries rather than the design's 11.`
);
note(
  `3. Content: ${REQUIRED.length} controlling facts present and ${FORBIDDEN.length} prohibited statements absent, read from the sheet's own ${pages.length} rendered pages.`
);

// The notice override is the packet-bound one, not the engine's default.
ok(
  WY_FILING_INSTRUCTIONS_NOTICE.startsWith(processGuidance.NOT_A_COURT_FILING_SENTENCE),
  "The notice override drops the sentence the engine asserts."
);
ok(
  WY_FILING_INSTRUCTIONS_NOTICE !== processGuidance.NOT_A_COURT_FILING_NOTICE,
  "The sheet uses the engine's default notice, which describes a route completed outside a court petition — the opposite of a sheet bound into a filing packet."
);
ok(
  /these instructions are not|Those documents are filed/.test(sheet),
  "The sheet does not tell the reader that the documents in front of it are what gets filed."
);
ok(
  !/completed outside a court petition/.test(sheet),
  "The sheet tells a participant with a petition to file that their route is completed outside a court petition."
);
note("3. Notice: the packet-bound override is used, and it keeps the sentence the engine asserts.");

// ---------------------------------------------------------------------------
// 4. Every page, read
// ---------------------------------------------------------------------------

const SECTION_HEADINGS = [
  "WHAT YOU NEED FIRST",
  "RECORDS AND DOCUMENTS TO OBTAIN",
  "INFORMATION TO GATHER",
  "WHERE THIS GOES",
  "WHAT TO DO, IN ORDER",
  "HOW TO SUBMIT",
  "FEES",
  "NOTICE AND SERVICE",
  "WHAT HAPPENS NEXT",
  "WHAT LEGALEASE CAN PREPARE",
  "WHAT LEGALEASE CANNOT DO",
  "WHEN TO GET LEGAL HELP",
  "OFFICIAL SOURCES"
];
for (const heading of SECTION_HEADINGS) {
  ok(sheet.includes(heading), `The sheet is missing its ${heading} section.`);
}

const footerOf = (index, total) => `LegalEase instructions — page ${index} of ${total}`;
pages.forEach((lines, index) => {
  const humanPage = index + 1;
  const body = lines.filter((line) => !line.startsWith("LegalEase instructions —"));

  ok(body.length > 0, `Page ${humanPage} of the sheet is blank.`);
  ok(
    lines.some((line) => line === footerOf(humanPage, pages.length)),
    `Page ${humanPage} of the sheet does not carry its own page footer.`
  );
  // A heading alone at the foot of a page announces a section the reader has to
  // turn over to find.
  ok(
    !SECTION_HEADINGS.includes(body[body.length - 1]),
    `Page ${humanPage} of the sheet ends on the detached heading "${body[body.length - 1]}".`
  );
  // A numbered or bulleted item split from its own marker reads as two items.
  ok(
    !/^[•\d]\s*$/.test(body[body.length - 1]),
    `Page ${humanPage} of the sheet ends on a list marker with no item.`
  );
  for (const line of body) {
    ok(
      !/�/.test(line),
      `Page ${humanPage} of the sheet has an undecodable glyph: ${line.slice(0, 60)}.`
    );
    ok(line.length < 200, `Page ${humanPage} of the sheet has a line that did not wrap: ${line.slice(0, 60)}.`);
  }
});

// The list markers survive pagination: every bullet and every step is present
// once, in order, across the whole sheet. Counted inside the ordered section
// only — a statute citation elsewhere ends in a numeral and a full stop too.
const orderedSection = sheet.slice(
  sheet.indexOf("WHAT TO DO, IN ORDER"),
  sheet.indexOf("HOW TO SUBMIT")
);
ok(orderedSection.length > 0, "The ordered \"what to do\" section could not be located on the sheet.");
const stepNumbers = [...orderedSection.matchAll(/(?:^|\s)(\d+)\.\s+[A-Z]/g)].map((m) => Number(m[1]));
ok(
  stepNumbers.length === 9 && stepNumbers.every((n, i) => n === i + 1),
  `The ordered "what to do" list reads as ${stepNumbers.join(",") || "empty"} rather than 1..9.`
);
ok(
  (sheet.match(/•/g) ?? []).length >= 30,
  "The sheet lost bullets somewhere in pagination."
);
note(
  `4. Pages: all ${pages.length} pages of the sheet read line by line — none blank, none ending on a detached heading or an orphaned marker, each footered, ${SECTION_HEADINGS.length} sections present and the 9 numbered steps intact.`
);

// Nothing in the assembled packet is a blank page either.
const assembledPages = renderedPages(canonical.assembled.bytes);
ok(
  assembledPages.length === canonical.assembled.pageCount,
  `The assembled packet reads as ${assembledPages.length} pages but reports ${canonical.assembled.pageCount}.`
);
assembledPages.forEach((lines, index) => {
  ok(lines.length > 0, `Page ${index + 1} of the assembled packet is blank.`);
});
note(
  `4. Assembly: all ${assembledPages.length} assembled pages carry content, with this lane's sheet at ${guidanceRange.startPage}-${guidanceRange.endPage}.`
);

// ---------------------------------------------------------------------------
// 5. Every material fail-closed branch
// ---------------------------------------------------------------------------

const answersWith = (overrides) => ({ ...CANONICAL_SAMPLE.answers, ...overrides });

const INPUT_STOPS = [
  ["court_identity_unestablished", answersWith({ courtName: "" }), "court or case identity cannot be established"],
  ["case_identity_unestablished", answersWith({ caseNumber: "" }), "the case number is missing where charges were filed"],
  [
    "prosecuting_attorney_unidentified",
    answersWith({ prosecutingAttorneyIdentified: "no" }),
    "the participant cannot identify the prosecuting attorney"
  ],
  [
    "service_represented_as_completed",
    answersWith({ serviceAlreadyCompleted: "yes" }),
    "the participant represents service as already completed"
  ]
];

const seenStops = new Set();
const assertStop = (error, stopId, scenario) => {
  ok(error instanceof WyomingGuidanceStopError, `${scenario}: did not throw a typed guidance stop.`);
  if (!(error instanceof WyomingGuidanceStopError)) return;
  seenStops.add(error.stopId);
  ok(error.stopId === stopId, `${scenario}: threw ${error.stopId} rather than ${stopId}.`);
  ok(error.componentId === WY_GUIDANCE_COMPONENT_ID, `${stopId}: does not name the component it belongs to.`);
  ok(typeof error.message === "string" && error.message.length > 40, `${stopId}: carries no reason.`);
  ok(
    typeof error.destination === "string" && WY_GUIDANCE_DESTINATIONS.includes(error.destination),
    `${stopId}: names a destination outside this sheet's declared list.`
  );
  ok(typeof error.nextStep === "string" && error.nextStep.length > 40, `${stopId}: carries no next step.`);
  // A stop that sends someone back into what it just closed is not a stop.
  ok(
    !/^\s*(?:file|serve|submit) (?:the )?(?:petition|verified petition)\b/i.test(error.nextStep),
    `${stopId}: routes straight back into the step it just closed.`
  );
};

for (const [stopId, answers, scenario] of INPUT_STOPS) {
  let thrown = null;
  try {
    deriveWyomingGuidanceFacts(WY_GUIDANCE_COMPONENT_ID, answers);
  } catch (error) {
    thrown = error;
  }
  ok(thrown !== null, `${scenario}: produced a sheet instead of stopping.`);
  if (thrown) assertStop(thrown, stopId, scenario);
}

const REQUEST_STOPS = [
  [
    "county_specific_rule",
    "county_specific_rule_requested",
    "the participant asks for a county-specific rule the statewide design does not establish"
  ],
  [
    "casper_form_outside_casper",
    "casper_form_outside_casper",
    "the participant attempts to use a Casper form outside Casper Municipal Court"
  ],
  [
    "populate_judicial_or_clerk_field",
    "judicial_or_clerk_field_population_requested",
    "the participant asks LegalEase to populate a judicial or clerk field"
  ]
];
for (const [request, stopId, scenario] of REQUEST_STOPS) {
  let thrown = null;
  try {
    refuseWyomingGuidanceRequest(request);
  } catch (error) {
    thrown = error;
  }
  ok(thrown !== null, `${scenario}: was answered instead of refused.`);
  if (thrown) assertStop(thrown, stopId, scenario);
}
ok(
  Object.keys(WY_GUIDANCE_REFUSED_REQUESTS).length === REQUEST_STOPS.length,
  "A refused-request kind exists with no stop covering it."
);
ok(seenStops.size === 7, `The sheet carries ${seenStops.size} distinct stops rather than the 7 the design owes.`);

// An answer outside a closed list is refused rather than normalized.
for (const key of ["chargesFiled", ...WY_GUIDANCE_GATE_KEYS]) {
  let thrown = null;
  try {
    deriveWyomingGuidanceFacts(WY_GUIDANCE_COMPONENT_ID, answersWith({ [key]: "maybe" }));
  } catch (error) {
    thrown = error;
  }
  ok(thrown instanceof WyomingGuidanceBranchError, `${key}: an answer outside its closed list was not refused.`);
}
let componentGuard = null;
try {
  deriveWyomingGuidanceFacts(WY_GUIDANCE_FOREIGN_COMPONENT_IDS[0], CANONICAL_SAMPLE.answers);
} catch (error) {
  componentGuard = error;
}
ok(
  componentGuard instanceof WyomingGuidanceComponentError,
  "This module derived facts for a component it does not own."
);
let unknownRequest = null;
try {
  refuseWyomingGuidanceRequest("something_else");
} catch (error) {
  unknownRequest = error;
}
ok(
  unknownRequest instanceof WyomingGuidanceBranchError,
  "An unknown request kind was not refused as an out-of-list answer."
);

// The happy path still produces a sheet.
ok(
  factsFor(CANONICAL_SAMPLE.answers).courtName === CANONICAL_SAMPLE.answers.courtName,
  "The canonical sample's own court is not carried into the sheet."
);
ok(
  sheet.includes(CANONICAL_SAMPLE.answers.courtName),
  "The sheet does not print the participant's own court where the design says it goes."
);
note(
  `5. Stops: ${seenStops.size} typed fail-closed branches, each naming a reason, a destination from the declared list and a next step, none routing back into the step it closed; closed lists refuse ${WY_GUIDANCE_GATE_KEYS.length + 1} out-of-list answers and the component guard holds.`
);

// ---------------------------------------------------------------------------
// 6. The packet boundary
// ---------------------------------------------------------------------------

const OWNED = [MODULE_PATH, VERIFIER_PATH];
for (const owned of OWNED) {
  ok(fs.existsSync(path.join(root, owned)), `The owned path ${owned} does not exist.`);
}
const ownedText = OWNED.map((owned) => fs.readFileSync(path.join(root, owned), "utf8")).join("\n");

/**
 * Assertions of a status, with denials of the same status excluded.
 *
 * Two traps this walks around. This lane states in as many words that it does
 * *not* make these claims, so a blunt word match fails on its own disclaimer.
 * And a verifier that spells a banned phrase out in a message matches itself
 * the moment it reads its own source — so the phrases below are assembled from
 * fragments and the message is built at run time, never written out here.
 */
// Each subject is written with a character class where a space or a hyphen
// goes, so the phrase never appears literally in this file and the scan below
// cannot match its own source.
const STATUS_SUBJECTS = [
  "filing[- ]complete",
  "technically[ ]approved",
  "packet[- ]ready",
  "production[- ]enabled",
  "ready[ ]to[ ]file"
];
const DENIAL = /\b(?:not|never|cannot|nothing|none|neither|nor)\b/i;

function assertedStatuses(text) {
  const found = [];
  for (const subject of STATUS_SUBJECTS) {
    const pattern = new RegExp(`\\b(?:is|are|was|becomes)\\s+(?:now |formally )?${subject}\\b`, "gi");
    let match;
    while ((match = pattern.exec(text))) {
      const preceding = text.slice(Math.max(0, match.index - 90), match.index);
      if (!DENIAL.test(preceding)) found.push(`${subject} @${match.index}`);
    }
  }
  return found;
}

const asserted = assertedStatuses(ownedText);
ok(
  asserted.length === 0,
  `An owned artifact asserts a status this lane cannot derive: ${asserted.join(", ")}.`
);
ok(
  assertedStatuses(sheet).length === 0,
  "The rendered sheet asserts a readiness status this lane cannot derive."
);

// Machine-readable forms, which have no legitimate negated spelling.
const SET_FLAGS = [
  [/\bpacket_?ready\s*[:=]\s*(?:true|1)\b/i, "packetReady"],
  [/\bcounselAdopted\s*[:=]\s*true\b/, "counselAdopted"],
  [/\bproductionEnabled\s*[:=]\s*true\b/, "productionEnabled"],
  [/\bruntimeDisabled\s*[:=]\s*false\b/, "runtimeDisabled"],
  [/\benabledJurisdictions\s*[:=]\s*[1-9]/, "enabledJurisdictions"]
];
for (const [pattern, flag] of SET_FLAGS) {
  ok(!pattern.test(ownedText), `An owned artifact sets ${flag} to a runtime-enabling value.`);
}
ok(
  /does not assert that the packet is filing-complete/i.test(ownedText),
  "This lane does not say plainly that completing one component does not make the packet filing-complete."
);
ok(
  !/\bnpm run rcap:(?:integrate|promote|deploy)\b/.test(ownedText),
  "An owned artifact reaches for integration, promotion or deployment."
);
note(
  `6. Boundary: neither owned artifact asserts any of the ${STATUS_SUBJECTS.length} derived statuses, and none of the ${SET_FLAGS.length} runtime flags is set; the packet's standing is the integration captain's to record from a regenerated proof and a current technical review, not this lane's to claim.`
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log("RCAP Wyoming guidance implementation verification");
console.log("");
for (const line of checks) console.log(`  ${line}`);
console.log("");
if (failures.length) {
  console.error(`FAILED — ${failures.length} problem${failures.length === 1 ? "" : "s"}:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `PASSED — ${WY_GUIDANCE_COMPONENT_ID} renders ${guidanceEntry.result.pageCount} inspected pages inside the ${canonical.assembled.pageCount}-page wy_nc_1401 packet, runtime disabled.`
);
