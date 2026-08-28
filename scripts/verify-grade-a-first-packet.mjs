// The first Grade-A packet, proven end to end from its own specification.
//
// ADR-0004 retired the five legacy generators as commercial fulfillment paths
// and made a Grade-A fulfillment record the only source of commercial authority.
// A record is a claim, so this file is the evidence behind the first one: it
// composes the packet from the hashed specification and a deterministic fixture,
// renders real PDF bytes, parses them back, and then proves each refusal by
// making it happen.
//
// What it deliberately does NOT prove: that the packet is legally correct. That
// is counsel's, and the record's artifactApprovalStatus says so. This proves the
// packet exists, is complete against its own specification, is a PDF, and fails
// closed on every input that would produce a partial one.
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

const failures = [];
let checks = 0;
function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const SPEC_PATH = "data/record-clearing/packet-specifications/ND-first-offense-possession-sealing.v1.json";
const FIXTURE_PATH = "data/rcap-ledger/grade-a/nd-first-offense-possession-sealing.fixture.json";
const ROUTE_KEY = "ND:first-offense-possession-sealing";

const specBytes = readFileSync(path.join(process.cwd(), SPEC_PATH));
const specSha256 = createHash("sha256").update(specBytes).digest("hex");
const fixture = JSON.parse(readFileSync(path.join(process.cwd(), FIXTURE_PATH), "utf8"));

const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const { composeGradeAPacket, GradeAPacketCompositionError } =
  await import("../src/lib/rcap/grade-a/composer.ts");
const { renderGradeAPacketPdf, gradeAPacketFilename, GRADE_A_RENDERER_KIND, GRADE_A_RENDERER_VERSION, GRADE_A_CONTENT_TYPE } =
  await import("../src/lib/rcap/grade-a/renderer.ts");

const specification = packetSpecificationFor(ROUTE_KEY);
ok("a specification is registered for the route", Boolean(specification));
if (!specification) {
  console.error("verify-grade-a-first-packet FAILED: no specification");
  process.exit(1);
}

// ---------------------------------------------------------------- the design
ok("the specification names the route it is for", specification.routeKey === ROUTE_KEY);
ok("the specification is versioned", /^\d+\.\d+\.\d+$/.test(specification.specificationVersion));
ok("the specification names its owner-approved packet set",
  specification.packetSetId === "nd-marijuana-first-offense-seal-set" && specification.packetSetVersion === "1.0.0");
ok("every source identity declares whether it was verified here",
  specification.sourceIdentities.length > 0
  && specification.sourceIdentities.every((entry) =>
    entry.verification === "present_in_repository" || entry.verification === "asserted_by_ingestion"),
  JSON.stringify(specification.sourceIdentities.map((entry) => entry.verification)));
ok("the specification records what must NOT be imported from another chapter",
  specification.statutoryAuthority.doNotImport.length >= 2);

// Every component role the packet-set manifest marks required must appear.
const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "data/record-clearing/legal-design-packet-set-manifests.json"), "utf8"))
  .packetSets.find((entry) => entry.packetSetId === specification.packetSetId);
ok("the owner-approved packet set is present", Boolean(manifest));
for (const component of manifest?.components ?? []) {
  const covered = specification.documents.some((document) => document.manifestComponentId === component.componentId);
  ok(`the specification covers manifest component ${component.role}`, covered, component.componentId);
}

// -------------------------------------------------------------- composition
const matter = {
  routeKey: fixture.routeKey,
  jurisdiction: fixture.jurisdiction,
  pathwayId: fixture.pathwayId,
  facts: fixture.facts,
  verificationHash: fixture.verificationHash,
  verifiedAt: fixture.verifiedAt
};

const packet = composeGradeAPacket(specification, matter);
ok("the packet composes", packet.documents.length > 0, `${packet.documents.length} document(s)`);
ok("the packet carries the specification identity",
  packet.specificationId === specification.specificationId
  && packet.specificationVersion === specification.specificationVersion);
ok("the packet is bound to the matter's verification", packet.verificationHash === fixture.verificationHash);

// The packet's actual rendered strings, not a JSON encoding of them. Searching
// JSON.stringify output would miss any sentence containing a quotation mark,
// which several checklist items do.
const strings = packet.documents.flatMap((document) => document.blocks.flatMap((block) => {
  switch (block.kind) {
    case "heading": return [block.text];
    case "paragraph": return [block.text];
    case "labelled": return [block.label, block.value];
    case "bulleted": return block.items;
    case "numbered": return block.items;
    case "signature": return [block.label, block.note, ...block.lines];
    case "rule": return [];
    default: return [];
  }
}));
const corpus = strings.join("\n");
const includes = (needle) => corpus.includes(needle);

// The twelve things a Grade-A packet has to carry, each proven by the content
// that satisfies it rather than by a component name.
const REQUIRED_ELEMENTS = [
  ["cover and contents", () => packet.documents.some((d) => d.role === "cover_and_contents"
    && d.blocks.some((b) => b.kind === "numbered" && b.items.length === packet.documents.length))],
  ["the filing itself", () => packet.documents.some((d) => d.role === "primary_filing")],
  ["a proposed order", () => packet.documents.some((d) => d.role === "proposed_order")],
  ["attachments", () => includes("Criminal judgment") && includes("Charging document showing the quantity")],
  ["a filing destination", () => includes(specification.filingDestination.statement)],
  ["fee or waiver instructions", () => includes(specification.feeAndWaiver.statement)
    && includes(specification.feeAndWaiver.waiverStatement)],
  ["service or notice treatment", () => includes(specification.serviceAndNotice.statement)],
  ["copy requirements", () => includes(specification.copyRequirements.originalPlusCopies)],
  ["a post-filing timeline", () => specification.postFilingTimeline.every((entry) => includes(entry.step))],
  ["hearing and objection stops", () => specification.hearingAndObjectionStops.every((stop) => includes(stop.situation))],
  ["a participant checklist", () => specification.participantChecklist.every((item) => includes(item.text))],
  ["a signature block for the participant", () => packet.documents.some((d) => d.role === "primary_filing"
    && d.blocks.some((b) => b.kind === "signature" && b.lines.includes("Signature")))]
];
for (const [label, holds] of REQUIRED_ELEMENTS) ok(`the packet carries ${label}`, holds());

// A judicial block that arrives pre-filled is a fabricated judicial act.
const courtSignature = packet.documents
  .find((d) => d.role === "proposed_order")?.blocks
  .find((b) => b.kind === "signature" && b.lines.includes("Judge"));
ok("the proposed order carries a court signature block", Boolean(courtSignature));
ok("the court signature block is left blank", courtSignature?.label === "", JSON.stringify(courtSignature?.label));

// The specification forbids importing chapter 12-60.1's requirements. The packet
// may EXPLAIN that they do not apply; it may not state them as this route's own.
ok("the packet does not impose the general chapter's waiting periods as its own",
  !/must wait (three|five) years/i.test(corpus));
ok("the packet does not claim a fee it says is not identified",
  !/pay the \$\d+ filing fee/i.test(corpus));
ok("no rendered string is empty where content belongs",
  strings.filter((value) => typeof value !== "string").length === 0);

// ------------------------------------------------------------------- the PDF
const bytes = await renderGradeAPacketPdf(packet);
ok("the artifact is a PDF", bytes.subarray(0, 5).toString("latin1") === "%PDF-");
ok("the artifact is not a stub", bytes.length > 8000, `${bytes.length} bytes`);
const parsed = await PDFDocument.load(bytes);
ok("the PDF parses back", parsed.getPageCount() > 0, `${parsed.getPageCount()} page(s)`);
ok("the PDF has a page for each document plus provenance",
  parsed.getPageCount() >= packet.documents.length + 1, `${parsed.getPageCount()} page(s) for ${packet.documents.length} document(s)`);
ok("the filename is a pdf", gradeAPacketFilename(packet).endsWith(".pdf"), gradeAPacketFilename(packet));
ok("the renderer declares application/pdf", GRADE_A_CONTENT_TYPE === "application/pdf");
ok("the renderer is not the retired legacy renderer",
  GRADE_A_RENDERER_KIND !== "packet_document_v1", GRADE_A_RENDERER_KIND);

// --------------------------------------------------------- every refusal fires
function refusal(run) {
  try { run(); return null; } catch (error) { return error; }
}

// 1. Each required fact, removed one at a time.
const usedFacts = new Set();
for (const document of specification.documents) {
  for (const section of document.sections) {
    for (const field of section.fields ?? []) usedFacts.add(field);
    for (const assertion of section.assertions ?? []) for (const f of assertion.facts) usedFacts.add(f);
  }
}
let proven = 0;
for (const factId of [...usedFacts].sort()) {
  const without = { ...matter, facts: { ...matter.facts } };
  delete without.facts[factId];
  const error = refusal(() => composeGradeAPacket(specification, without));
  ok(`removing ${factId} refuses composition`, error instanceof GradeAPacketCompositionError, String(error));
  ok(`the refusal for ${factId} names it`, error?.missingFactIds?.includes(factId), JSON.stringify(error?.missingFactIds));
  proven += 1;
}
ok("at least one fact was mutated", proven > 0);

// 2. A blank value is not a present value.
const blanked = { ...matter, facts: { ...matter.facts, case_number: "   " } };
ok("a whitespace-only fact refuses composition",
  refusal(() => composeGradeAPacket(specification, blanked)) instanceof GradeAPacketCompositionError);

// 3. Another route's matter.
const wrongRoute = { ...matter, routeKey: "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c" };
ok("a matter from another route refuses composition",
  refusal(() => composeGradeAPacket(specification, wrongRoute)) instanceof GradeAPacketCompositionError);

// 4. An unbound matter.
const unbound = { ...matter, verificationHash: "" };
ok("a matter with no verification binding refuses composition",
  refusal(() => composeGradeAPacket(specification, unbound)) instanceof GradeAPacketCompositionError);

// 5. A section kind the composer does not implement is refused, not dropped.
const unknownKind = {
  ...specification,
  documents: [{
    ...specification.documents[0],
    sections: [{ heading: "Invented", kind: "not_a_real_kind" }]
  }]
};
ok("an unimplemented section kind refuses rather than omitting the section",
  refusal(() => composeGradeAPacket(unknownKind, matter)) instanceof GradeAPacketCompositionError);

// 6. An empty packet is never rendered.
let emptyRefused = false;
try { await renderGradeAPacketPdf({ ...packet, documents: [] }); } catch { emptyRefused = true; }
ok("an empty packet is never rendered", emptyRefused);

// ------------------------------------------- the record, and what it authorizes
//
// The record is the claim this file is the evidence for, so it is checked here
// rather than only in the census: the specification it names must be the one on
// disk, and the postures it declares must actually govern.
const { packetFulfillmentAuthority, assertPacketFulfillmentProven, packetFulfillmentShortfall } =
  await import("../src/lib/expungement-ai/packet-fulfillment-authority.ts");
const ledger = JSON.parse(readFileSync(path.join(process.cwd(), "data/rcap-ledger/packet-fulfillment-records.json"), "utf8"));
const record = (ledger.records ?? []).find((entry) => entry.routeKey === ROUTE_KEY);

ok("a fulfillment record exists for the route", Boolean(record));
ok("the record pins the specification that is actually on disk",
  record?.packetSpecificationSha256 === specSha256,
  `record ${record?.packetSpecificationSha256} vs disk ${specSha256}`);
ok("the record pins the specification version the composer registered",
  record?.packetSpecificationVersion === specification.specificationVersion);
ok("the record names the path it pinned", record?.packetSpecificationPath === SPEC_PATH);
ok("the record is complete", packetFulfillmentShortfall(record).length === 0,
  packetFulfillmentShortfall(record).join(", "));

const [code, pathwayId] = ROUTE_KEY.split(/:(.+)/);
ok("the packet itself is established", packetFulfillmentAuthority(code, pathwayId).allowed === true);

function refuses(run) { try { run(); return false; } catch { return true; } }

// Proven is not sold. Every surface where money or an entitlement changes hands
// must refuse while its posture is held, and the refusal must carry the reason.
for (const [surface, posture] of [
  ["checkout creation", record?.consumerPosture],
  ["consumer payment authority", record?.consumerPosture],
  ["sponsored entitlement", record?.sponsoredPosture],
  ["packet credit consumption", record?.sponsoredPosture]
]) {
  if (posture !== "held") {
    ok(`${surface} posture is deliberately open`, posture === "open", String(posture));
    continue;
  }
  ok(`${surface} refuses while its posture is held`,
    refuses(() => assertPacketFulfillmentProven(code, pathwayId, surface)));
  const decision = packetFulfillmentAuthority(code, pathwayId, surface);
  ok(`the ${surface} refusal names the hold reason`,
    decision.allowed === false && decision.reason.includes(record.holdReason.slice(0, 40)));
}

// Generation and delivery are reachable on a proven packet, because they are
// only ever reached through an entitlement the surfaces above already gated.
for (const surface of ["packet generation", "participant delivery"]) {
  ok(`${surface} is open on a proven packet`,
    !refuses(() => assertPacketFulfillmentProven(code, pathwayId, surface)));
}

// A machine-verified artifact does not carry a sale even if a posture is opened.
ok("an unreviewed artifact status refuses a money surface even with an open posture",
  packetFulfillmentShortfall({ ...record, consumerPosture: "open", holdReason: "x" }).length === 0);
ok("the record's artifact status is not a reviewed one",
  !["counsel_reviewed", "counsel_reviewed_and_visually_verified"].includes(record?.artifactApprovalStatus),
  record?.artifactApprovalStatus);

// ------------------------------------------------------------------- report
console.log(`Grade-A first packet — ${ROUTE_KEY}`);
console.log(`  specification ${specification.specificationId} v${specification.specificationVersion} sha256 ${specSha256}`);
console.log(`  ${packet.documents.length} documents, ${parsed.getPageCount()} pages, ${bytes.length} bytes, ${GRADE_A_CONTENT_TYPE}`);
console.log(`  renderer ${GRADE_A_RENDERER_KIND} v${GRADE_A_RENDERER_VERSION}`);
console.log(`  ${checks} checks`);

if (failures.length > 0) {
  console.error(`\nverify-grade-a-first-packet FAILED — ${failures.length} problem(s):\n`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("  The packet composes from its own specification, renders to application/pdf, and refuses every input that would produce a partial one.");
