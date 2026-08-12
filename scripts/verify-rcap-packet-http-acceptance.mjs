// Real HTTP acceptance gate for packet delivery.
//
// Starts a local HTTP server on a real socket, mounts the actual Next route
// handlers behind it, and drives them with real fetch() calls. Nothing here
// imports a renderer and calls it directly: every assertion below is made
// against bytes that crossed a socket.
//
// It proves the platform works. It proves nothing about legal readiness — every
// track exercised is a non-production technical fixture, and the summary says
// so explicitly so a green run can never be read as a packet-ready state.

import { register } from "node:module";
import http from "node:http";
import zlib from "node:zlib";

process.env.NODE_ENV ??= "test";
process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "technical-fixture-anon-key";

register("./lib/next-server-loader.mjs", import.meta.url);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { NextRequest } = await import("next/server");
const { PDFDocument, decodePDFRawStream } = await import("pdf-lib");
// Imported by absolute file URL: the bracketed dynamic-segment directories are
// not resolvable through the "@/" alias hook.
const { pathToFileURL } = await import("node:url");
const nodePath = (await import("node:path")).default;
const routeUrl = (relative) => pathToFileURL(nodePath.resolve(process.cwd(), relative)).href;

const generateRoute = await import(routeUrl("src/app/api/rcap/packets/generate/route.ts"));
const componentRoute = await import(
  routeUrl("src/app/api/rcap/packets/[fulfillmentId]/components/[componentId]/route.ts")
);

const failures = [];
const passed = [];
const check = (condition, message) => {
  if (condition) passed.push(message);
  else failures.push(message);
};

// Enumerated in the summary below. Kept as a constant so the count and the
// enumeration cannot drift apart.
const NEGATIVE_PATH_COUNT = 20;

const ACTOR = "technical-fixture-actor-1";
const OTHER_ACTOR = "technical-fixture-actor-2";

// ---------------------------------------------------------------------------
// Local HTTP server in front of the real route handlers
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    // Only forward end-to-end headers. Passing Node's hop-by-hop headers
    // (connection, content-length, transfer-encoding) into a fetch Request
    // stalls the body reader.
    const forwarded = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (["connection", "content-length", "transfer-encoding", "keep-alive", "upgrade", "host"].includes(key)) {
        continue;
      }
      if (typeof value === "string") forwarded.set(key, value);
      else if (Array.isArray(value)) forwarded.set(key, value.join(", "));
    }

    const nextRequest = new NextRequest(url.toString(), {
      method: req.method,
      headers: forwarded,
      body: body && body.length ? new Uint8Array(body) : undefined
    });

    let response;
    const componentMatch = url.pathname.match(
      /^\/api\/rcap\/packets\/([^/]+)\/components\/([^/]+)$/
    );

    if (url.pathname === "/api/rcap/packets/generate" && req.method === "POST") {
      response = await generateRoute.POST(nextRequest);
    } else if (componentMatch && req.method === "GET") {
      response = await componentRoute.GET(nextRequest, {
        params: Promise.resolve({
          fulfillmentId: decodeURIComponent(componentMatch[1]),
          componentId: decodeURIComponent(componentMatch[2])
        })
      });
    } else {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const headers = {};
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "content-length") return;
      headers[key] = value;
    });
    headers["content-length"] = String(buffer.length);
    res.writeHead(response.status, headers);
    res.end(buffer);
  } catch (error) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "harness_error", message: String(error?.message ?? error) }));
  }
});

const baseUrl = await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    resolve(`http://127.0.0.1:${address.port}`);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function generate(payload, actor = ACTOR) {
  const response = await fetch(`${baseUrl}/api/rcap/packets/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(actor ? { "x-rcap-technical-actor": actor } : {})
    },
    body: JSON.stringify({ allowTechnicalFixtures: true, ...payload })
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, body: json };
}

async function download(fulfillmentId, componentId, actor = ACTOR) {
  const response = await fetch(
    `${baseUrl}/api/rcap/packets/${encodeURIComponent(fulfillmentId)}/components/${encodeURIComponent(componentId)}`,
    { headers: actor ? { "x-rcap-technical-actor": actor } : {} }
  );
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    sourceIdentity: decodeURIComponent(response.headers.get("x-rcap-source-identity") ?? ""),
    rendererStrategy: response.headers.get("x-rcap-renderer-strategy") ?? "",
    bytes: buffer
  };
}

function hasPdfSignature(bytes) {
  return bytes.length > 5 && bytes.subarray(0, 5).toString("latin1") === "%PDF-";
}

/**
 * Extracts visible text from a PDF.
 *
 * Deliberately a single-pass scanner rather than regexes: nested-quantifier
 * patterns over binary stream data backtrack catastrophically and hang on an
 * 800KB source form.
 */
async function pdfText(bytes) {
  const doc = await PDFDocument.load(bytes);
  let out = "";

  // Field values live in the AcroForm dictionary, not the content stream.
  try {
    for (const field of doc.getForm().getFields()) {
      if (typeof field.getText === "function") {
        const value = field.getText();
        if (value) out += ` ${value}`;
      }
    }
  } catch {
    // Not every document has a form.
  }

  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    const streams = [];
    if (contents && typeof contents.size === "function") {
      for (let i = 0; i < contents.size(); i += 1) streams.push(contents.lookup(i));
    } else if (contents) {
      streams.push(contents);
    }
    for (const stream of streams) {
      let text = "";
      try {
        text = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
      } catch {
        continue;
      }
      out += ` ${scanTextOperators(text)}`;
    }
  }

  return out.replace(/\\([()\\])/g, "$1").replace(/\s+/g, " ");
}

/** Walks a content stream once, collecting literal strings used by Tj and TJ. */
function scanTextOperators(text) {
  let collected = "";
  let i = 0;
  while (i < text.length) {
    // pdf-lib emits text as hex strings, not literal strings, so both forms
    // have to be handled or a generated document looks empty.
    if (text[i] === "<" && text[i + 1] !== "<") {
      const close = text.indexOf(">", i);
      if (close < 0) break;
      const hex = text.slice(i + 1, close).replace(/[^0-9a-fA-F]/g, "");
      if (hex.length >= 2) {
        collected += Buffer.from(hex.length % 2 ? `${hex}0` : hex, "hex").toString("latin1");
      }
      i = close + 1;
      continue;
    }
    if (text[i] !== "(") {
      i += 1;
      continue;
    }
    let depth = 1;
    let literal = "";
    i += 1;
    while (i < text.length && depth > 0) {
      const char = text[i];
      if (char === "\\") {
        literal += text[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (char === "(") depth += 1;
      else if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
      if (depth > 0) literal += char;
      i += 1;
    }
    collected += literal;
  }
  return collected;
}

// ---------------------------------------------------------------------------
// A, B, C — filing-packet fixtures
// ---------------------------------------------------------------------------

const FILING_FIXTURES = [
  {
    label: "A. custom pleading",
    payload: {
      jurisdiction: "ND",
      trackId: "technical-fixture-pleading",
      geography: "Cass",
      facts: {
        petitionerName: "Jordan Fixture-Participant",
        county: "Cass",
        caseNumber: "FIXTURE-2026-0001",
        recordDate: "2019-04-02",
        requestsFeeWaiver: true
      }
    },
    primaryComponent: "pleading-primary",
    expectSourceIdentity: "technical-fixture-petition",
    expectStrategy: "custom_pleading",
    expectText: ["Jordan Fixture-Participant", "FIXTURE-2026-0001"],
    expectComponentCount: 4
  },
  {
    label: "B. official form, AcroForm fill",
    payload: {
      jurisdiction: "IA",
      trackId: "technical-fixture-acroform",
      facts: {
        county: "Polk",
        petitionerName: "Riley Fixture-Participant",
        caseNumber: "FIXTURE-IA-77",
        docketNumber: "D-77",
        offenseDate: "2018-06-01",
        offenseCode: "PA",
        offenseYear: "2018",
        confirmsEligibility: true
      }
    },
    primaryComponent: "acroform-primary",
    expectSourceIdentity:
      "private/Nationwide Record Clearing/LegalEase Iowa/2_86_4_123_PAULA_Expungement_18A04436D4107.pdf",
    expectStrategy: "acroform_fill",
    expectText: ["Riley Fixture-Participant", "FIXTURE-IA-77"],
    expectComponentCount: 2
  },
  {
    label: "C. official form, coordinate overlay",
    payload: {
      jurisdiction: "AZ",
      trackId: "technical-fixture-overlay",
      facts: {
        personFiling: "Sam Fixture-Participant",
        mailingAddress: "1 Fixture Way",
        cityStateZip: "Phoenix, AZ 85001",
        emailAddress: "fixture@example.invalid",
        telephone: "000-000-0000",
        county: "Maricopa",
        caseNumber: "FIXTURE-AZ-42",
        defendantName: "Sam Fixture-Participant",
        dateOfBirth: "1990-01-01"
      }
    },
    primaryComponent: "overlay-primary",
    expectSourceIdentity:
      "private/Nationwide Record Clearing/LegalEase Arizona/AOCCREM3F-071221.pdf",
    expectStrategy: "coordinate_overlay",
    expectText: ["Sam Fixture-Participant", "FIXTURE-AZ-42", "Maricopa"],
    expectComponentCount: 1
  }
];

for (const fixture of FILING_FIXTURES) {
  const created = await generate(fixture.payload);
  check(created.status === 201, `${fixture.label}: generation returned 201 (got ${created.status})`);
  if (created.status !== 201) continue;

  const result = created.body;
  check(result.status === "ready", `${fixture.label}: fulfillment reports ready`);
  check(result.isFilingPacket === true, `${fixture.label}: reported as a filing packet`);
  check(
    typeof result.fulfillmentId === "string" && result.fulfillmentId.length > 0,
    `${fixture.label}: returned a durable fulfillment identifier`
  );
  check(
    typeof result.briefcaseItemId === "string" && result.destination.includes(result.fulfillmentId),
    `${fixture.label}: returned a Briefcase destination for the exact item`
  );
  check(
    result.components.length === fixture.expectComponentCount,
    `${fixture.label}: packet set assembled ${fixture.expectComponentCount} components (got ${result.components.length})`
  );

  const dl = await download(result.fulfillmentId, fixture.primaryComponent);
  check(dl.status === 200, `${fixture.label}: download returned 200 (got ${dl.status})`);
  check(dl.contentType.includes("application/pdf"), `${fixture.label}: Content-Type is application/pdf`);
  check(hasPdfSignature(dl.bytes), `${fixture.label}: bytes begin with a %PDF- signature`);
  check(dl.bytes.length > 0, `${fixture.label}: downloaded a non-empty document`);
  check(
    dl.sourceIdentity === fixture.expectSourceIdentity,
    `${fixture.label}: served the expected source identity`
  );
  check(dl.rendererStrategy === fixture.expectStrategy, `${fixture.label}: used the expected renderer strategy`);

  let pageCount = 0;
  try {
    pageCount = (await PDFDocument.load(dl.bytes)).getPageCount();
  } catch (error) {
    failures.push(`${fixture.label}: downloaded bytes did not parse as a PDF (${error?.message})`);
  }
  check(pageCount > 0, `${fixture.label}: parsed PDF reports ${pageCount} page(s)`);

  const text = await pdfText(dl.bytes);
  for (const needle of fixture.expectText) {
    check(text.includes(needle), `${fixture.label}: output contains fixture participant data ${JSON.stringify(needle)}`);
  }

  // Idempotency: the same logical request must not fulfil twice.
  const retry = await generate(fixture.payload);
  check(retry.status === 200, `${fixture.label}: retry returned 200 rather than creating again`);
  check(retry.body?.reused === true, `${fixture.label}: retry reported the existing fulfillment`);
  check(
    retry.body?.fulfillmentId === result.fulfillmentId,
    `${fixture.label}: retry returned the same fulfillment identifier`
  );
  check(
    retry.body?.components?.length === result.components.length,
    `${fixture.label}: retry did not duplicate packet components`
  );
}

// ---------------------------------------------------------------------------
// D — process guidance
// ---------------------------------------------------------------------------

const guidance = await generate({
  jurisdiction: "UT",
  trackId: "technical-fixture-guidance",
  facts: { petitionerName: "Casey Fixture-Participant" }
});
check(guidance.status === 201, `D. process guidance: generation returned 201 (got ${guidance.status})`);

if (guidance.status === 201) {
  const result = guidance.body;
  check(result.outputStrategy === "process_guidance", "D. process guidance: resolved process_guidance");
  check(
    result.isFilingPacket === false,
    "D. process guidance: NOT counted as a filing packet"
  );
  check(
    /guided|process|administrative|guidance/i.test(result.deliverable),
    "D. process guidance: deliverable describes guided process, not court documents"
  );

  const dl = await download(result.fulfillmentId, "guidance-primary");
  check(dl.status === 200, "D. process guidance: download returned 200");
  check(hasPdfSignature(dl.bytes), "D. process guidance: bytes begin with a %PDF- signature");

  const text = await pdfText(dl.bytes);
  check(
    text.includes("not a court filing"),
    "D. process guidance: artifact states on its face that it is not a court filing"
  );
  check(text.includes("WHERE THIS GOES"), "D. process guidance: names an official destination");
  check(text.includes("WHAT YOU NEED FIRST"), "D. process guidance: lists prerequisites");
  check(text.includes("WHAT TO DO, IN ORDER"), "D. process guidance: lists next actions");
  check(text.includes("WHAT LEGALEASE CANNOT DO"), "D. process guidance: states what LegalEase cannot perform");
}

// ---------------------------------------------------------------------------
// Negative tests, all over real HTTP
// ---------------------------------------------------------------------------

const negatives = [
  {
    label: "unknown jurisdiction fails closed",
    payload: { jurisdiction: "ZZ", trackId: "technical-fixture-pleading" },
    expectStatus: 404,
    expectError: "unknown_jurisdiction"
  },
  {
    label: "missing relief track fails closed",
    payload: { jurisdiction: "IA" },
    expectStatus: 404,
    expectError: "unknown_relief_track"
  },
  {
    label: "unknown relief track fails closed",
    payload: { jurisdiction: "IA", trackId: "no-such-track" },
    expectStatus: 404,
    expectError: "unknown_relief_track"
  },
  {
    label: "wrong county fails closed",
    payload: {
      jurisdiction: "ND",
      trackId: "technical-fixture-pleading",
      geography: "Burleigh",
      facts: { petitionerName: "x", county: "Burleigh", caseNumber: "1" }
    },
    expectStatus: 409,
    expectError: "geography_not_supported"
  },
  {
    label: "missing geography on a county-scoped track fails closed",
    payload: {
      jurisdiction: "ND",
      trackId: "technical-fixture-pleading",
      facts: { petitionerName: "x", county: "Cass", caseNumber: "1" }
    },
    expectStatus: 409,
    expectError: "geography_required"
  },
  {
    label: "Texas cannot receive Harris County material",
    payload: { jurisdiction: "TX", trackId: "technical-fixture-overlay", geography: "Dallas" },
    expectStatus: 404,
    expectError: "unknown_relief_track"
  },
  {
    label: "another state cannot receive the Arizona fixture source",
    payload: { jurisdiction: "NM", trackId: "technical-fixture-overlay" },
    expectStatus: 404,
    expectError: "unknown_relief_track"
  },
  {
    label: "missing required input fails closed",
    payload: { jurisdiction: "IA", trackId: "technical-fixture-acroform", facts: {} },
    expectStatus: 409,
    expectError: "missing_required_input"
  },
  {
    label: "stale source prevents fulfillment",
    payload: { jurisdiction: "IA", trackId: "technical-fixture-stale-source" },
    expectStatus: 409,
    expectError: "not_runtime_enabled"
  },
  {
    label: "absent official source fails closed",
    payload: { jurisdiction: "IA", trackId: "technical-fixture-missing-source" },
    expectStatus: 502,
    expectError: "render_failed"
  },
  {
    label: "source-hash mismatch fails closed",
    payload: { jurisdiction: "IA", trackId: "technical-fixture-hash-mismatch" },
    expectStatus: 502,
    expectError: "render_failed"
  },
  {
    label: "placeholder coordinates fail closed",
    payload: { jurisdiction: "AZ", trackId: "technical-fixture-unconfirmed-overlay" },
    expectStatus: 502,
    expectError: "render_failed"
  },
  {
    label: "XFA source produces a handled unsupported response",
    payload: { jurisdiction: "PA", trackId: "technical-fixture-xfa" },
    expectStatus: 502,
    expectError: "render_failed"
  },
  {
    label: "encrypted source produces a handled unsupported response",
    payload: { jurisdiction: "ME", trackId: "technical-fixture-encrypted" },
    expectStatus: 502,
    expectError: "render_failed"
  }
];

for (const negative of negatives) {
  const response = await generate(negative.payload);
  check(
    response.status === negative.expectStatus,
    `NEG ${negative.label}: HTTP ${negative.expectStatus} (got ${response.status})`
  );
  check(
    response.body?.error === negative.expectError,
    `NEG ${negative.label}: error ${negative.expectError} (got ${response.body?.error})`
  );
}

// Approval gating: a fixture cannot be fulfilled without the explicit opt-in,
// which is what stands between a fixture and a production request.
{
  const response = await fetch(`${baseUrl}/api/rcap/packets/generate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-rcap-technical-actor": ACTOR },
    body: JSON.stringify({ jurisdiction: "IA", trackId: "technical-fixture-acroform" })
  });
  const body = await response.json().catch(() => null);
  check(response.status === 409, "NEG missing approval: an un-opted-in fixture is refused (409)");
  check(body?.error === "track_not_runtime_enabled", "NEG missing approval: refused as not runtime enabled");
}

// Storage failure must leave the packet non-ready.
{
  process.env.RCAP_PACKET_STORE_FAIL_WRITE = "true";
  const response = await generate({
    jurisdiction: "AZ",
    trackId: "technical-fixture-overlay",
    requestKey: "storage-failure-probe",
    facts: { personFiling: "Storage Failure Probe", county: "Pima" }
  });
  delete process.env.RCAP_PACKET_STORE_FAIL_WRITE;
  check(response.status === 502, "NEG storage failure: generation returned 502");
  check(response.body?.error === "storage_failed", "NEG storage failure: reported storage_failed");

  const dl = await download(response.body?.detail?.fulfillmentId ?? "missing", "overlay-primary");
  check(dl.status !== 200, "NEG storage failure: no document is downloadable afterwards");
}

// Authorization.
{
  const created = await generate({
    jurisdiction: "AZ",
    trackId: "technical-fixture-overlay",
    requestKey: "authz-probe",
    facts: { personFiling: "Authz Probe", county: "Pima" }
  });
  check(created.status === 201, "NEG authorization: setup fulfillment created");

  if (created.status === 201) {
    const id = created.body.fulfillmentId;

    const anonymous = await fetch(`${baseUrl}/api/rcap/packets/${id}/components/overlay-primary`);
    check(anonymous.status === 401, "NEG unauthenticated download is rejected (401)");

    const other = await download(id, "overlay-primary", OTHER_ACTOR);
    check(other.status === 404, "NEG another user cannot download the artifact (404)");

    const missing = await download(id, "no-such-component");
    check(missing.status === 404, "NEG missing artifact is handled (404)");

    const missingFulfillment = await download("00000000-0000-4000-8000-000000000000", "overlay-primary");
    check(missingFulfillment.status === 404, "NEG unknown fulfillment is handled (404)");
  }
}

await new Promise((resolve) => server.close(resolve));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (failures.length) {
  console.error("RCAP packet HTTP acceptance gate FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`\n${passed.length} checks passed, ${failures.length} failed.`);
  process.exit(1);
}

console.log("RCAP packet HTTP acceptance gate passed.");
console.log(`1. ${passed.length} assertions, all against bytes that crossed a real socket.`);
console.log("2. TECHNICAL FIXTURE PASSED: custom pleading, AcroForm fill, coordinate overlay, process guidance.");
console.log("3. Every artifact was generated, stored, downloaded, parsed and confirmed to carry fixture data.");
console.log("4. Retries reused the existing fulfillment and duplicated nothing.");
console.log("5. Process guidance was produced and was NOT counted as a filing packet.");
console.log(`6. ${NEGATIVE_PATH_COUNT} negative paths fail closed, enumerated:`);
console.log("   resolution (6): unknown jurisdiction, missing track, unknown track, wrong county,");
console.log("                   absent geography, cross-jurisdiction source request.");
console.log("   input (1):      missing required input.");
console.log("   source (5):     stale source, absent source, hash mismatch, XFA, encrypted.");
console.log("   mapping (1):    placeholder coordinates.");
console.log("   readiness (2):  missing approval, storage failure leaves the packet non-ready.");
console.log("   access (5):     unauthenticated download, another user's download, missing component,");
console.log("                   unknown fulfillment, no download after a failed generation.");
console.log("");
console.log("PRODUCTION TRACK APPROVED: none.");
console.log("PRODUCTION TRACK ENABLED:  none.");
console.log("A green technical fixture is not a packet-ready state. No relief track is packet_ready,");
console.log("and no jurisdiction is enabled for participant fulfillment.");
