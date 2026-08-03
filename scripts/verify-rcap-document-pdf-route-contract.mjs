// Authorization contract for the stored-document route.
//
//   src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts
//
// This is the one route of the three that modifies a file already on main, and
// the reason it was modified is that it previously had NO authorization: any
// packet identifier returned a document built from that participant's identity
// and criminal-record details. The two `packets/*` routes are driven end to end
// by the real-HTTP acceptance gate, which includes an "another user's download"
// negative. This route is not driven there — it reads the Supabase-backed
// document repository and both session helpers directly — so its security
// properties were unguarded.
//
// The assertions below are ordered source-contract checks, the same style the
// promotion route verifier uses for the internal admin gate. They lock the
// properties that a rendered response cannot show: that authorization happens
// before any byte is served, that an unauthorized caller cannot use the status
// code to discover which packets exist, that the route serves only durably
// stored bytes, and that a failed session check never resolves to "allowed".

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROUTE = "src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts";

const failures = [];
const checks = [];
const source = read(ROUTE);

const at = (marker) => source.indexOf(marker);
const has = (marker) => at(marker) !== -1;
const require_ = (marker, why) => {
  if (!has(marker)) failures.push(`${ROUTE} missing ${why}: ${marker}`);
};
const refuse = (marker, why) => {
  if (has(marker)) failures.push(`${ROUTE} must not ${why}: ${marker}`);
};

// ---------------------------------------------------------------------------
// 1. Authorization exists at all
// ---------------------------------------------------------------------------

require_("getRcapBriefcaseAuthState", "the consumer session check");
require_("resolveSessionPartner", "the partner session check");
require_("isAuthorized(", "an authorization decision");
checks.push("1. Authorization is present: consumer session and partner session are both consulted.");

// ---------------------------------------------------------------------------
// 2. Authorization runs before any document byte is served
// ---------------------------------------------------------------------------

const authIndex = at("await isAuthorized(");
const artifactIndex = at("getStoredPacketArtifact(");
const bytesIndex = at("readStoredPacketArtifactBytes(");
const responseIndex = at('"content-type": "application/pdf"');

if (authIndex === -1 || artifactIndex === -1 || bytesIndex === -1 || responseIndex === -1) {
  failures.push(`${ROUTE} must authorize, then read the stored artifact, then serve it.`);
} else {
  if (authIndex > artifactIndex) failures.push(`${ROUTE} reads the stored artifact before authorizing.`);
  if (authIndex > bytesIndex) failures.push(`${ROUTE} reads stored bytes before authorizing.`);
  if (authIndex > responseIndex) failures.push(`${ROUTE} builds the PDF response before authorizing.`);
  checks.push("2. Ordering holds: authorize → locate stored artifact → read bytes → respond.");
}

// ---------------------------------------------------------------------------
// 3. An unauthorized caller cannot enumerate packets
// ---------------------------------------------------------------------------
//
// The unauthorized branch must return exactly what a missing packet returns.
// A distinct status or code would turn the route into an existence oracle: a
// caller could sweep identifiers and learn which ones are real.

const notFoundCalls = [...source.matchAll(/problem\(\s*404,\s*"packet_not_found"/g)];
if (notFoundCalls.length < 2) {
  failures.push(
    `${ROUTE} must answer an unauthorized caller with the same 404 packet_not_found a missing packet returns; found ${notFoundCalls.length} such response(s).`
  );
} else {
  checks.push("3. An unauthorized caller receives the same 404 as a missing packet, so status cannot enumerate packets.");
}
refuse('problem(403', "distinguish an unauthorized caller with a 403");
refuse('"forbidden"', "expose a forbidden code that reveals the packet exists");

// ---------------------------------------------------------------------------
// 4. Stored bytes only — never render on demand
// ---------------------------------------------------------------------------

refuse("renderRcapPacketPdf", "render a document on demand");
require_("getStoredPacketArtifact", "the stored-artifact lookup");
require_("readStoredPacketArtifactBytes", "the stored-bytes read");
require_('"document_not_ready"', "an honest not-ready answer when nothing was stored");
checks.push("4. Only durably stored bytes are served; a document that was never produced returns not-ready.");

// ---------------------------------------------------------------------------
// 5. A failed session check is never an identity
// ---------------------------------------------------------------------------
//
// Both session lookups sit in try/catch. A catch that returns true — or an
// isAuthorized that ends in anything but a refusal — would turn an outage in the
// session service into open access.

const authFn = source.slice(at("async function isAuthorized("));
const authBody = authFn.slice(0, authFn.indexOf("\n}\n") + 3);
if (!authBody) {
  failures.push(`${ROUTE}: isAuthorized could not be read.`);
} else {
  if (/catch\s*(\([^)]*\))?\s*\{[^}]*return\s+true/s.test(authBody)) {
    failures.push(`${ROUTE}: a failed session check must never authorize.`);
  }
  if (!/return\s+false;\s*\}\s*$/.test(authBody.trimEnd())) {
    failures.push(`${ROUTE}: isAuthorized must end in a refusal, so an unhandled path fails closed.`);
  }
  if (!authBody.includes("auth.userId === packetUserId")) {
    failures.push(`${ROUTE}: consumer access must require the session user to own the packet.`);
  }
  if (!authBody.includes("partner.partnerSlug === packetPartnerSlug")) {
    failures.push(`${ROUTE}: partner access must require the session partner to match the sponsoring partner.`);
  }
  checks.push("5. Both session checks fail closed; ownership and partner attribution must match, and the function ends in a refusal.");
}

// ---------------------------------------------------------------------------
// 6. Partner access is not broadened
// ---------------------------------------------------------------------------
//
// Partner access is exactly one comparison against the sponsoring partner slug.
// Anything that reaches a participant by name, email or a partner's whole roster
// would widen the boundary this task is not permitted to widen.

for (const marker of ["participantName", "participantEmail", "listParticipants", "allPartners", "partnerSlug !=="]) {
  refuse(marker, `broaden partner access (${marker})`);
}
const partnerComparisons = [...source.matchAll(/partner\.partnerSlug\s*===\s*packetPartnerSlug/g)];
if (partnerComparisons.length !== 1) {
  failures.push(`${ROUTE}: partner access must be exactly one attribution comparison; found ${partnerComparisons.length}.`);
}
checks.push("6. Partner access remains one attribution comparison against the sponsoring partner.");

// ---------------------------------------------------------------------------
// 7. Response hygiene
// ---------------------------------------------------------------------------

require_('"cache-control": "no-store"', "no-store on a participant document");
require_('"content-type": "application/pdf"', "the PDF content type");
require_("content-disposition", "an attachment disposition");
require_("safeFilename(", "a sanitised download filename");
for (const marker of ["signedUrl", "createSignedUrl", "supabaseUrl", "SERVICE_ROLE", "error.stack", "bucket:"]) {
  refuse(marker, `leak internal detail (${marker})`);
}
checks.push("7. Response carries no-store, a PDF content type, a sanitised filename, and no internal path, bucket, signed URL or stack trace.");

// ---------------------------------------------------------------------------
// 8. The supporting modules exist
// ---------------------------------------------------------------------------

for (const file of [
  "src/lib/rcap/documents/artifact-service.ts",
  "src/lib/rcap/documents/artifact-storage.ts",
  "src/lib/rcap/briefcase/auth.ts",
  "src/lib/partners/session-partner.ts"
]) {
  if (!fs.existsSync(path.join(rootDir, file))) failures.push(`Missing module the route depends on: ${file}`);
}
require_("isPacketArtifactKind(pdfType)", "validation of the requested document type");
refuse('pdfType !== "full"', "hard-code document types in the route instead of validating them centrally");
checks.push("8. The document type is validated centrally, and every module the route depends on is present.");

// ---------------------------------------------------------------------------

console.log("");
if (failures.length > 0) {
  console.error("RCAP document PDF route contract verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("RCAP document PDF route contract verification passed.");
for (const line of checks) console.log(line);
console.log("9. This route is authorization-critical: before it was fixed, any packet identifier returned another person's document.");

function read(relative) {
  return fs.readFileSync(path.join(rootDir, relative), "utf8");
}
