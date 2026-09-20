await import("./verify-rcap-il-delivery-binding.mjs");
// Regression: the deployed packet serving path produces real, parseable PDF bytes.
//
// This exists because the previous request path launched Playwright per request.
// That cannot run on the deployed serverless runtime, so every packet download
// failed and no packet had ever been delivered from production. A source-text
// assertion would not have caught it, so this renders actual bytes and parses
// them back.
//
// It also holds the resolver's fail-closed contract: an unlisted jurisdiction
// used to fall through to the Mississippi template, which would hand a
// participant another state's petition.
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}
function read(rel) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

const { renderRcapPacketPdf, rcapPacketPdfFilename } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");
const { resolvePacketRoute, packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");

const packet = {
  id: "3f6b1d0e-2c44-4a6f-9c1e-1b7d9a0e5c22",
  partnerSlug: "we-must-vote",
  state: "MS",
  county: "Hinds",
  pathway: "misdemeanor_conviction",
  status: "ready_for_review",
  petitionerFirstName: "Test",
  petitionerLastName: "Participant",
  courtName: "Hinds County Circuit Court",
  causeNumber: "25-CR-0142",
  charge: "Possession of a controlled substance",
  arrestDate: "2019-04-02",
  arrestingAgency: "Jackson Police Department",
  offenseDate: "2019-03-28",
  dispositionDate: "2020-01-15",
  agencyCaseNumber: "JPD-2019-8841",
  generatedPlainText: "Petitioner respectfully requests expungement of the above matter.\n\nThe waiting period has elapsed and no other petition has been filed.",
  filingNextStepsPacket: {
    title: "Mississippi expungement filing",
    plainText: "1. File the petition with the circuit clerk.\n2. Pay the filing fee or request a fee waiver.\n3. Serve the district attorney.",
    filingLocation: "Circuit clerk of the county of conviction",
    filingMethod: "In person or by mail",
    requiredDocuments: ["Certified copy of the case disposition", "Government photo identification"],
    serviceAndCopies: ["Serve the district attorney"],
    feeSummary: ["Filing fee set by the clerk", "Fee waiver available on an affidavit of poverty"],
    courtContactOrLocationGuidance: ["Confirm clerk hours before travelling"],
    afterFiling: ["Watch for a hearing notice"],
    trackingChecklist: ["Keep the stamped copy"],
    workflowGaps: [],
    safetyDisclaimer: "LegalEase is not a law firm and this packet is not legal advice."
  }
};

// 1) The renderer produces bytes that are a real PDF, on both packet types.
for (const pdfType of ["full", "court"]) {
  const bytes = await renderRcapPacketPdf(packet, pdfType);
  assert(Buffer.isBuffer(bytes) && bytes.length > 1000, `${pdfType}: renderer returned no meaningful bytes.`);
  assert(bytes.subarray(0, 5).toString("latin1") === "%PDF-", `${pdfType}: output does not carry a PDF header.`);

  const parsed = await PDFDocument.load(bytes);
  const pages = parsed.getPageCount();
  assert(pages > 0, `${pdfType}: parsed document has no pages.`);
  const [first] = parsed.getPages();
  const size = first.getSize();
  assert(Math.round(size.width) === 612 && Math.round(size.height) === 792, `${pdfType}: page geometry is not Letter.`);

  const filename = rcapPacketPdfFilename(packet, pdfType);
  assert(filename.endsWith(".pdf"), `${pdfType}: filename is not a .pdf.`);
  assert(filename.includes("mississippi"), `${pdfType}: filename does not name the jurisdiction.`);
}

// The full packet carries the guidance pages ahead of the court pages, so it is
// strictly longer than the court-only packet.
const full = await renderRcapPacketPdf(packet, "full");
const court = await renderRcapPacketPdf(packet, "court");
assert(
  (await PDFDocument.load(full)).getPageCount() > (await PDFDocument.load(court)).getPageCount(),
  "The full packet should contain more pages than the court-only packet."
);

// 2) A packet whose text would break WinAnsi still renders rather than throwing
// mid-download.
const awkward = {
  ...packet,
  charge: "Possession — “paraphernalia” … 中文",
  generatedPlainText: "A single unbreakable token: " + "X".repeat(400)
};
const awkwardBytes = await renderRcapPacketPdf(awkward, "full");
assert(awkwardBytes.subarray(0, 5).toString("latin1") === "%PDF-", "Non-WinAnsi input broke the renderer.");

// 3) The resolver fails closed and has no wrong-state fallback.
//
// Mississippi is the retirement's clearest case: the renderer still exists and
// still runs, and the route still sells nothing. Before ADR-0004 this file
// asserted the opposite implication — "a renderable route should be sellable"
// — which is the inference the retirement removes. Renderability is a fact
// about a renderer. Sellability is a fact about a proven fulfillment record.
const ms = resolvePacketRoute({ state: "MS", pathway: "misdemeanor_conviction" });
assert(ms.routeKind === "legacy_retired", `Mississippi should resolve legacy_retired, got ${ms.routeKind}.`);
assert(packetRouteCanRender(ms), "Mississippi's renderer is retained for historical access and must still render.");
assert(!ms.sellable && !ms.creditConsumable,
  "A retired legacy route must not be sellable or credit-consumable, however well it renders.");

const unknown = resolvePacketRoute({ state: "ZZ", pathway: "anything" });
assert(unknown.routeKind === "disabled", `An unknown jurisdiction must resolve disabled, got ${unknown.routeKind}.`);
assert(!unknown.sellable && !unknown.creditConsumable, "A disabled route must not be sellable or credit-consumable.");
assert(unknown.jurisdiction !== "MS", "An unknown jurisdiction must never resolve to Mississippi.");

const empty = resolvePacketRoute({});
assert(empty.routeKind === "disabled", "A packet with no jurisdiction must resolve disabled.");
assert(empty.jurisdiction === "", "A packet with no jurisdiction must not be given one.");

for (const code of ["CA", "NY", "WY", "MA"]) {
  const resolution = resolvePacketRoute({ state: code, pathway: "" });
  assert(resolution.routeKind !== "legacy_retired", `${code} must not claim a legacy packet route.`);
  assert(!packetRouteCanRender(resolution), `${code} has no certified renderer and must not render.`);
  assert(!resolution.sellable, `${code} must not be sellable.`);
  assert(!resolution.creditConsumable, `${code} must not consume a credit.`);
  assert(resolution.jurisdiction === code, `${code} must resolve as itself, got ${resolution.jurisdiction}.`);
}

// 4) The request path is browser-free and gated by the resolver.
// Matches an import or require of a browser driver in code, not the word in a
// comment explaining why one is not used here.
const BROWSER_IMPORT = /(?:from\s*["'](?:playwright|puppeteer)[^"']*["']|require\(\s*["'](?:playwright|puppeteer)[^"']*["']\s*\)|chromium\.launch)/;

const routeSource = read("src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts");
assert(!BROWSER_IMPORT.test(routeSource), "The packet download route must not load a browser.");
assert(routeSource.includes("packet-document-renderer"), "The route must render through the browser-free renderer.");
assert(routeSource.includes("resolvePacketRoute"), "The route must resolve the packet route before rendering.");
assert(routeSource.includes("packetRouteCanRender"), "The route must refuse to render an unsupported jurisdiction.");

const rendererSource = read("src/lib/rcap/documents/packet-document-renderer.ts");
assert(!BROWSER_IMPORT.test(rendererSource), "The packet renderer must not load a browser.");

const resolverSource = read("src/lib/rcap/documents/packet-route-resolver.ts");
assert(
  !/return\s+["']?reference\/mississippi|packet\.state\s*===\s*"MS"\s*\?[^:]*:\s*"MS"/.test(resolverSource),
  "The resolver must not carry a Mississippi fallback."
);

if (failures.length > 0) {
  console.error("verify-rcap-packet-render-path FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("verify-rcap-packet-render-path passed");
