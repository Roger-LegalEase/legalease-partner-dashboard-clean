// Runtime HTTP delivery gate.
//
// Contract: every jurisdiction the product declares `packet_ready` must be able
// to produce a document a person can actually open, proven over real HTTP
// against a real server — not by reading source, not by a snapshot, not by a
// signoff declaration, and not by a screenshot.
//
// For each packet_ready capability the gate:
//   1. boots or reuses the real application server
//   2. submits a real packet-generation HTTP request
//   3. follows the durable identifier the server returned
//   4. makes a real HTTP download request
//   5. asserts 200 and Content-Type: application/pdf
//   6. asserts non-empty bytes that parse as a PDF with a positive page count
//   7. asserts the bytes identify the requested jurisdiction and source template
//   8. asserts no other jurisdiction's template identity is present
//
// This gate never skips on changed-file scope. When no jurisdiction is declared
// packet_ready it reports BLOCKED rather than passing quietly, because "nothing
// to prove" and "delivery proven" are different results and must not look alike.
//
// Flags:
//   --require-proof   exit non-zero when zero jurisdictions are proven. This is
//                     the launch gate: it is red until a jurisdiction genuinely
//                     delivers a document.

import { register } from "node:module";
import { PDFDocument } from "pdf-lib";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const requireProof = process.argv.includes("--require-proof");
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const capability = await import("@/lib/rcap/jurisdictions/packet-capability");
const { assertRegistryIntegrity, getPacketCapability, packetReadyTargets } = capability;

try {
  assertRegistryIntegrity();
} catch (error) {
  failures.push(error.message);
}

const targets = packetReadyTargets();
const proven = [];

if (targets.length > 0) {
  // Only pay the cost of a real server when there is something to prove.
  const server = await startOrReuseServer();
  try {
    for (const target of targets) {
      await proveDelivery(target, server.baseUrl);
    }
  } finally {
    await server.stop();
  }
}

report();

async function proveDelivery(target, baseUrl) {
  const entry = getPacketCapability(target.code);
  const label = target.county ? `${target.code}/${target.county}` : target.code;

  // 2. Real generation request.
  const generateResponse = await fetch(`${baseUrl}/api/rcap/documents/${target.code.toLowerCase()}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partnerSlug: process.env.PACKET_DELIVERY_FIXTURE_PARTNER ?? "demo-partner",
      county: target.county ?? undefined
    })
  });

  if (!generateResponse.ok) {
    failures.push(
      `${label} is packet_ready but generation returned HTTP ${generateResponse.status}.`
    );
    return;
  }

  const generated = await generateResponse.json().catch(() => null);
  const packetId = generated?.packet?.id;

  // 3. Follow the durable identifier the server returned.
  if (typeof packetId !== "string" || !packetId) {
    failures.push(`${label} generation returned no durable packet identifier.`);
    return;
  }

  // 4. Real download request.
  const downloadResponse = await fetch(
    `${baseUrl}/api/rcap/documents/${encodeURIComponent(packetId)}/pdf/court`
  );

  // 5. Status and content type.
  if (downloadResponse.status !== 200) {
    failures.push(
      `${label} download returned HTTP ${downloadResponse.status}; a packet_ready jurisdiction must serve a document.`
    );
    return;
  }
  const contentType = downloadResponse.headers.get("content-type") ?? "";
  assert(
    contentType.includes("application/pdf"),
    `${label} download Content-Type was ${JSON.stringify(contentType)}, expected application/pdf.`
  );

  // 6. Non-empty bytes that parse as a PDF with a positive page count.
  const bytes = new Uint8Array(await downloadResponse.arrayBuffer());
  assert(bytes.byteLength > 0, `${label} download returned zero bytes.`);

  let pageCount = 0;
  try {
    const parsed = await PDFDocument.load(bytes);
    pageCount = parsed.getPageCount();
  } catch (error) {
    failures.push(`${label} download did not parse as a PDF: ${error?.message ?? error}.`);
    return;
  }
  assert(pageCount > 0, `${label} document parsed but reported ${pageCount} pages.`);

  // 7 and 8. The bytes must identify this jurisdiction's source template and no
  // other. This is what catches a cross-jurisdiction fallback that would
  // otherwise serve a correct-looking PDF containing the wrong court's form.
  const approved = (target.county
    ? entry.counties.find((county) => county.countyKey === target.county)?.assets
    : entry.assets
  )?.filter((asset) => asset.mappingApproved) ?? [];

  assert(
    approved.length > 0,
    `${label} is packet_ready but exposes no approved mapping to identify the served document.`
  );

  const text = Buffer.from(bytes).toString("latin1");
  const ownMarkers = approved.map((asset) => asset.formId);
  assert(
    ownMarkers.some((marker) => text.includes(marker)),
    `${label} document does not identify its own source template (expected one of ${ownMarkers.join(", ")}).`
  );

  for (const other of capability.PACKET_CAPABILITIES) {
    if (other.code === target.code) continue;
    const foreign = [
      ...other.assets,
      ...other.counties.flatMap((county) => county.assets)
    ].map((asset) => asset.formId);
    for (const marker of foreign) {
      assert(
        !text.includes(marker),
        `${label} document contains ${other.code}'s template identity ${marker}.`
      );
    }
  }

  if (!failures.length) proven.push(label);
}

async function startOrReuseServer() {
  const configured = process.env.PACKET_DELIVERY_BASE_URL;
  for (const candidate of [configured, "http://127.0.0.1:3000"].filter(Boolean)) {
    if (await reachable(candidate)) {
      return { baseUrl: candidate, stop: async () => {} };
    }
  }

  const { spawn } = await import("node:child_process");
  const path = await import("node:path");
  const port = Number(process.env.PACKET_DELIVERY_PORT ?? 4137);
  const baseUrl = `http://127.0.0.1:${port}`;
  const nextBin = path.join(process.cwd(), "node_modules/next/dist/bin/next");

  const child = spawn(process.execPath, [nextBin, "dev", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error("The application server exited before becoming ready.");
    }
    if (await reachable(baseUrl)) {
      return {
        baseUrl,
        stop: async () => {
          child.kill("SIGTERM");
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (child.exitCode === null) child.kill("SIGKILL");
        }
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  child.kill("SIGKILL");
  throw new Error("The application server did not become ready.");
}

async function reachable(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/sign-in`, { signal: AbortSignal.timeout(2_000) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function report() {
  if (failures.length) {
    console.error("RCAP packet delivery gate failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  if (targets.length === 0) {
    console.log("RCAP packet delivery gate: BLOCKED.");
    console.log("0 of 51 jurisdictions are declared packet_ready, so no delivery is proven.");
    console.log("No official source document has an approved mapping yet.");
    console.log(
      "This gate proves delivery for every packet_ready jurisdiction. There are none to prove."
    );
    if (requireProof) {
      console.error("");
      console.error("--require-proof was set and zero jurisdictions are proven.");
      process.exit(1);
    }
    process.exit(0);
  }

  console.log("RCAP packet delivery gate passed.");
  console.log(`1. ${proven.length} of ${targets.length} packet_ready jurisdictions served a document over HTTP.`);
  console.log("2. Every document returned HTTP 200 with Content-Type application/pdf.");
  console.log("3. Every document parsed as a PDF with a positive page count.");
  console.log("4. Every document identified its own source template.");
  console.log("5. No document contained another jurisdiction's template identity.");
  console.log(`6. Proven: ${proven.join(", ")}.`);
}
