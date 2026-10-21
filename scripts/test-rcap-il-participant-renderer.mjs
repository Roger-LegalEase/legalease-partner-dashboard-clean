#!/usr/bin/env node
// The Illinois participant-rendering entry point, on its own.
//
//   node scripts/test-rcap-il-participant-renderer.mjs
//
// Isolated on purpose: no database, no queue, no storage, no authority, no
// worker. Two synthetic participants who do not exist go in, two composed
// packets and two rendered PDFs come out, and this file asks the four questions
// that decide whether the entry point is real:
//
//   1. does the composed pleading carry a pleading caption, so the shared
//      renderer draws it instead of refusing it;
//   2. do distinct participants produce distinct rendered content, with neither
//      one's facts appearing in the other's document;
//   3. are identical inputs byte-deterministic, which is what a render job's
//      input hash is worth nothing without;
//   4. does the caption carry the participant's OWN case-caption facts, and do
//      the family's approved REQUIRED_BEFORE_FILING blanks stay blank.
//
// It also holds the renderer's generic caption default in place: a caption that
// names no defendant designation still prints DEFENDANT/PETITIONER, so the
// families that were rendering before this change render the same way after it.
//
// Passing proves the entry point composes and renders. It proves nothing about
// approval, delivery or the Illinois route, all of which stay where the
// committed authority puts them.
import assert from "node:assert/strict";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
register("./lib/ts-esm-loader.mjs", import.meta.url);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const { extractTextItems, groupIntoLines } = await import("./rcap-official-forms/rcap-pdf-anchor-capture.mjs");
const { composablePacketSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");
const { composeIlProstitutionJVacateParticipantPacket, IL_PROSTITUTION_J_VACATE_ROUTE_KEY } =
  await import("../src/lib/rcap/grade-a/families/il-prostitution-j-vacate-set.ts");
const { composeParticipantDeliveryPacket, hasParticipantFamilyComposer } =
  await import("../src/lib/rcap/grade-a/participant-packet.ts");

const ROUTE_KEY = IL_PROSTITUTION_J_VACATE_ROUTE_KEY;
const specification = composablePacketSpecificationFor(ROUTE_KEY);
assert.ok(specification, "the registered Illinois specification must resolve");
assert.equal(specification.packetFamily, "il-prostitution-j-vacate-set");

/* Two people who do not exist. No real participant, no production fact, no
 * screening answer from any live system reaches this file. */
const SYNTHETIC = [
  {
    label: "A",
    facts: {
      participant_full_legal_name: "Wren Isabel Castellanos",
      mailing_address: "77 Sycamore Lane, Peoria, IL 61602",
      phone_number: "309-555-0111",
      email_address: "wren.castellanos@example.invalid",
      conviction_county: "Sangamon",
      case_number: "2011-CF-000111",
      conviction_date: "2011-03-02",
      conviction_as_worded: "SYNTHETIC CHARGE TEXT A",
      sentence_completion_date: "2014-06-30",
      adverse_consequences: "Synthetic housing consequence A.",
      trafficking_status: "No"
    }
  },
  {
    label: "B",
    facts: {
      participant_full_legal_name: "Osvaldo Reinholt-Byrne",
      mailing_address: "9042 Lakeshore Terrace, Apartment 6C, Waukegan, IL 60085",
      phone_number: "847-555-0222",
      email_address: "osvaldo.reinholt.byrne@example.invalid",
      conviction_county: "Kane",
      case_number: "2009-CF-000222",
      conviction_date: "2009-11-19",
      conviction_as_worded: "SYNTHETIC CHARGE TEXT B",
      sentence_completion_date: "2013-01-15",
      adverse_consequences: "Synthetic employment consequence B.",
      trafficking_status: "No"
    }
  }
];

const matterFor = (facts) => ({
  routeKey: ROUTE_KEY,
  jurisdiction: "IL",
  pathwayId: "felony-prostitution-relief",
  facts,
  verificationHash: createHash("sha256").update(JSON.stringify(facts)).digest("hex"),
  verifiedAt: "2026-09-05T00:00:00.000Z"
});

async function textOf(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const text = pages
    .map((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" "))
    .join("\n")
    .replace(/\s+/g, " ");
  return { text, pageCount: pages.length };
}

const checks = [];
const check = (name, run) => { run(); checks.push(name); };

/* ---- 1. the composed packet is a pleading with a caption ------------------ */

const rendered = [];
for (const participant of SYNTHETIC) {
  const packet = composeIlProstitutionJVacateParticipantPacket(specification, matterFor(participant.facts));
  assert.deepEqual(packet.documents.map((d) => d.documentId), ["primary_filing", "proposed_order"]);
  for (const document of packet.documents) {
    assert.equal(document.presentation, "pleading");
    const captions = document.blocks.filter((block) => block.kind === "pleading_caption");
    assert.equal(captions.length, 1, `${document.documentId} must carry exactly one pleading caption`);
    const [caption] = captions;

    /* 4. the caption carries this participant's own case-caption facts, and the
     * family's approved blanks stay blank. */
    assert.equal(caption.defendant, participant.facts.participant_full_legal_name);
    assert.equal(caption.defendantRole, "DEFENDANT-MOVANT");
    assert.equal(caption.plaintiff, "PEOPLE OF THE STATE OF ILLINOIS");
    assert.match(caption.court, /^IN THE CIRCUIT COURT OF \.{42} COUNTY, ILLINOIS$/);
    assert.match(caption.caseNumber, /^\.{20}$/);
    assert.ok(!caption.court.includes(participant.facts.conviction_county),
      "the county of conviction is an approved REQUIRED_BEFORE_FILING blank and is not written");
    assert.ok(!caption.caseNumber.includes(participant.facts.case_number),
      "the case number is an approved REQUIRED_BEFORE_FILING blank and is not written");
  }
  const bytes = await renderGradeAPacketPdf(packet);
  assert.equal(bytes.subarray(0, 5).toString("latin1"), "%PDF-", "the entry point renders an actual PDF");
  const { text, pageCount } = await textOf(bytes);
  assert.ok(pageCount >= 2, `expected at least one page per document, got ${pageCount}`);
  rendered.push({ ...participant, packet, bytes, text, pageCount });
}
checks.push("both documents compose as pleadings carrying exactly one pleading caption each");
checks.push("the caption carries the participant's own name and the approved blanks stay blank");

/* ---- 2. distinct participants, distinct rendered content ------------------ */

const [a, b] = rendered;
check("distinct participants render distinct bytes", () => {
  assert.notEqual(a.bytes.toString("base64"), b.bytes.toString("base64"));
});
check("each rendered document carries its own participant's written facts and none of the other's", () => {
  for (const [self, other] of [[a, b], [b, a]]) {
    for (const factId of ["participant_full_legal_name", "mailing_address", "phone_number", "email_address"]) {
      assert.ok(self.text.includes(self.facts[factId].replace(/\s+/g, " ")),
        `participant ${self.label}: ${factId} is not readable in the rendered bytes`);
      assert.ok(!self.text.includes(other.facts[factId].replace(/\s+/g, " ")),
        `participant ${self.label}: participant ${other.label}'s ${factId} appears in the wrong document`);
    }
  }
});

/* ---- 3. identical inputs are byte-deterministic --------------------------- */

const repeat = await renderGradeAPacketPdf(
  composeIlProstitutionJVacateParticipantPacket(specification, matterFor(a.facts))
);
check("identical inputs reproduce identical bytes", () => {
  assert.deepEqual(repeat, a.bytes);
});

/* ---- the approved family text, not a paraphrase of it --------------------- */

const APPROVED_PHRASES = [
  "MOTION TO VACATE AND EXPUNGE CONVICTION FOR CLASS 4 FELONY PROSTITUTION",
  "moves under 20 ILCS 2630/5.2(j)(3) to vacate and expunge a prior Class 4 felony prostitution conviction",
  "The movant has completed any sentence and every condition imposed by the conviction",
  "The State's Attorney may object within 60 days after notice.",
  "No verification language appears on this motion because 20 ILCS 2630/5.2(j)(3) requires none",
  "PROPOSED ORDER",
  "TENDERED FOR THE COURT'S CONSIDERATION",
  "The date of entry and the judge's signature are the Court's. They are left blank."
];
check("the rendered pages carry the family's approved sentences", () => {
  for (const phrase of APPROVED_PHRASES) {
    assert.ok(a.text.includes(phrase.replace(/\s+/g, " ")), `approved sentence missing: ${phrase}`);
  }
});
check("no judicial act and no case fact the platform has not seen is written", () => {
  for (const factId of ["conviction_date", "conviction_as_worded", "sentence_completion_date",
    "adverse_consequences", "case_number", "conviction_county"]) {
    assert.ok(!a.text.includes(a.facts[factId]),
      `${factId} is an approved participant blank and must not be written into the document`);
  }
});

/* ---- refusals -------------------------------------------------------------- */

check("a missing required fact refuses rather than composing a gap", () => {
  const gapped = { ...a.facts };
  delete gapped.mailing_address;
  assert.throws(() => composeIlProstitutionJVacateParticipantPacket(specification, matterFor(gapped)),
    /required fact\(s\) are missing or blank: mailing_address/);
});
check("an unbound matter refuses", () => {
  assert.throws(
    () => composeIlProstitutionJVacateParticipantPacket(specification,
      { ...matterFor(a.facts), verificationHash: "  " }),
    /no final-verification hash/);
});
check("another route's matter refuses", () => {
  assert.throws(
    () => composeIlProstitutionJVacateParticipantPacket(specification,
      { ...matterFor(a.facts), routeKey: "MS:some-other-route" }),
    /never composed from another route's specification/);
});
check("another family's specification refuses", () => {
  assert.throws(
    () => composeIlProstitutionJVacateParticipantPacket(
      { ...specification, packetFamily: "ms-nonconv-set" }, matterFor(a.facts)),
    /never composed from another family's specification/);
});
check("a specification whose document set is not the approved family refuses", () => {
  assert.throws(
    () => composeIlProstitutionJVacateParticipantPacket(
      { ...specification, documents: [specification.documents[0]] }, matterFor(a.facts)),
    /Refusing rather than composing a different packet/);
});

/* ---- the dispatcher and the untouched families ---------------------------- */

check("the dispatcher routes this family to this composer and leaves others alone", () => {
  assert.equal(hasParticipantFamilyComposer("il-prostitution-j-vacate-set"), true);
  assert.equal(hasParticipantFamilyComposer("ms-nonconv-set"), false);
  const viaDispatcher = composeParticipantDeliveryPacket(specification, matterFor(a.facts));
  assert.deepEqual(viaDispatcher, a.packet);
});

const genericCaptionPacket = {
  routeKey: "SYN:generic-caption-default",
  specificationId: "synthetic",
  specificationVersion: "0.0.0",
  packetFamily: "synthetic-family",
  packetFamilyLabel: "Synthetic family",
  verificationHash: "0".repeat(64),
  verifiedAt: "2026-09-05T00:00:00.000Z",
  documents: [{
    documentId: "synthetic_filing",
    role: "primary_filing",
    title: "Synthetic Filing",
    order: 1,
    outputStrategy: "custom_pleading",
    presentation: "pleading",
    blocks: [{
      kind: "pleading_caption",
      court: "IN THE SYNTHETIC COURT",
      plaintiff: "STATE",
      defendant: "Synthetic Person",
      caseNumber: "SYN-1",
      title: "SYNTHETIC MOTION"
    }]
  }]
};
const generic = await textOf(await renderGradeAPacketPdf(genericCaptionPacket));
check("a caption that names no defendant designation still prints the renderer's generic one", () => {
  assert.ok(generic.text.includes("DEFENDANT/PETITIONER"));
  assert.ok(!generic.text.includes("DEFENDANT-MOVANT"));
});

console.log(JSON.stringify({
  entryPoint: "composeIlProstitutionJVacateParticipantPacket",
  dispatcher: "composeParticipantDeliveryPacket",
  routeKey: ROUTE_KEY,
  participants: rendered.map((participant) => ({
    synthetic: participant.label,
    pages: participant.pageCount,
    renderedSha256: createHash("sha256").update(participant.bytes).digest("hex"),
    byteLength: participant.bytes.length
  })),
  approvalsGranted: 0,
  routesOpened: 0,
  realParticipantData: false
}, null, 2));
console.log(`IL participant renderer PASS — ${checks.length} checks`);
for (const name of checks) console.log(`  ok  ${name}`);
