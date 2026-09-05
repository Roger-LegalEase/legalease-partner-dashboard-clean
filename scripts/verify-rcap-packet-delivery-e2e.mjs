import { exerciseIllinoisDelivery } from "./test-rcap-il-delivery-ephemeral.mjs";
// Browser-level delivery proof: a mobile-viewport Chromium downloads a packet
// over real HTTP from the identical delivery core the production route uses,
// and the delivery events land in a real database.
//
// Scope, stated exactly: this exercises authorizePacketDownload and
// streamAuthorizedPacket — the complete authorization, integrity and streaming
// logic of src/app/api/rcap/packets/[jobId]/download/route.ts — behind a thin
// local HTTP wrapper with a session-cookie test identity. What it does NOT
// exercise is the Next.js route shell and Supabase JWT verification, which
// need a running Supabase auth service. It proves server transmission and
// browser receipt of the bytes; it does not claim a human opened the file.
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { runWorkerCycle } = await import("../src/lib/rcap/render/render-worker.ts");
const { authorizePacketDownload, streamAuthorizedPacket } = await import("../src/lib/rcap/render/packet-delivery.ts");
const { renderRcapPacketPdf } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");

if (!ephemeralPgAvailable()) {
  console.error("verify-rcap-packet-delivery-e2e: PostgreSQL 16 is not available in this environment.");
  process.exit(1);
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const db = startEphemeralPg();
const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-e2e-artifacts-"));
const P1 = "11111111-1111-1111-1111-111111111111";
const PERSON_A = "aaaaaaaa-1111-1111-1111-111111111111";
const USER_OWNER = "0e0e0e0e-1111-1111-1111-111111111111";
const BRIEFCASE_ITEM = "b1b1b1b1-1111-1111-1111-111111111111";
const SESSION_COOKIE = "rcap-e2e-session";
const SESSION_VALUE = "e2e-owner-session-token";

const storage = {
  async upload(objectPath, bytes) {
    const abs = path.join(storageRoot, objectPath);
    if (fs.existsSync(abs)) return { ok: false, reason: "object already exists (409)" };
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, bytes);
    return { ok: true };
  },
  async read(objectPath) {
    const abs = path.join(storageRoot, objectPath);
    return fs.existsSync(abs) ? fs.readFileSync(abs) : null;
  }
};

function jobRow(jobId) {
  return db.json(
    `select row_to_json(t) from (select id, status, delivery_eligibility, accounting_result, briefcase_item_id, route_id, output_storage_path, output_sha256, normalized_output_sha256, attempt_count, partner_id, person_id, matter_id, renderer_kind, renderer_version, max_attempts, failure_disposition, error_code as last_error_code from packet_render_jobs where id = '${jobId}') t`
  );
}

const deliveryPorts = {
  getJob: async (jobId) => {
    const row = jobRow(jobId);
    if (!row) return null;
    return {
      id: row.id,
      packetId: "x",
      routeId: row.route_id,
      briefcaseItemId: row.briefcase_item_id,
      partnerId: row.partner_id,
      personId: row.person_id,
      matterId: row.matter_id,
      rendererKind: row.renderer_kind,
      rendererVersion: row.renderer_version,
      status: row.status,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
      failureDisposition: row.failure_disposition,
      lastErrorCode: row.last_error_code,
      outputStoragePath: row.output_storage_path,
      outputSha256: row.output_sha256,
      normalizedOutputSha256: row.normalized_output_sha256,
      deliveryEligibility: row.delivery_eligibility,
      accountingResult: row.accounting_result
    };
  },
  userOwnsBriefcaseItem: async (userId, briefcaseItemId) => userId === USER_OWNER && briefcaseItemId === BRIEFCASE_ITEM,
  storage,
  recordEvent: async (input) => {
    try {
      return db.scalar(
        `select record_packet_delivery_event('${input.jobId}', '${input.eventType}', ${input.actorUserId ? `'${input.actorUserId}'` : "null"}, '${JSON.stringify(input.requestContext ?? {})}'::jsonb)`
      );
    } catch {
      return null;
    }
  }
};

let server;
let browser;
let illinoisDelivery;
try {
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`alter default privileges in schema public grant all on tables to service_role`);
  db.sql(`create table public.partner_records (id uuid primary key, partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  // Local identity fixtures and the existing consumer schema; no hosted auth.
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create schema auth`);
  db.sql(`create table auth.users (id uuid primary key)`);
  db.sql(`create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$`);
  db.sql(`insert into auth.users values ('${USER_OWNER}')`);
  for (const migration of ["phase-26-consumer-briefcase-items.sql", "phase-27-consumer-checkout-metadata.sql", "phase-28-consumer-packet-generation-status.sql"]) {
    db.applyFile(path.join(rootDir, "supabase", migration));
  }
  db.applyFile(path.join(rootDir, "supabase/phase-49-rcap-packet-render-jobs.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-50-rcap-packet-delivery-hardening.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-51-rcap-consumer-payment-gate.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-52-rcap-consumer-payment-authority.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-53-rcap-consumer-job-binding.sql"));
  db.sql(`insert into partner_records values ('${P1}','we-must-vote')`);
  db.sql(`insert into rcap_persons values ('${PERSON_A}','we-must-vote','a')`);
  db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap) values ('${P1}', 5, false, 0)`);

  // Produce a real validated, consumed artifact through the worker.
  const inputHash = createHash("sha256").update("e2e-input").digest("hex");
  const packetRow = db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);
  const jobId = db
    .scalar(
      `select id from enqueue_packet_render_job('${packetRow}', 'MS:misdemeanor_conviction', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${inputHash}', '${BRIEFCASE_ITEM}', '${P1}', '${PERSON_A}', '9aaaaaaa-3333-1111-1111-111111111111', 5, null, null)`
    )
    .trim();

  const packet = {
    id: "e2e-pkt",
    state: "MS",
    pathway: "misdemeanor_conviction",
    petitionerFirstName: "Test",
    petitionerLastName: "Participant",
    county: "Hinds",
    generatedPlainText: "Petitioner requests expungement.",
    filingNextStepsPacket: {
      title: "t",
      plainText: "1. File.",
      filingLocation: "clerk",
      filingMethod: "in person",
      requiredDocuments: ["ID"],
      serviceAndCopies: [],
      feeSummary: ["fee"],
      courtContactOrLocationGuidance: [],
      afterFiling: [],
      trackingChecklist: [],
      workflowGaps: [],
      safetyDisclaimer: "Not legal advice."
    }
  };

  const workerDeps = {
    queue: {
      claim: async (worker) => {
        const row = db.json(`select row_to_json(t) from (select * from claim_packet_render_job('${worker}', null, 60)) t`);
        if (!row) return null;
        return {
          id: row.id, packetId: row.packet_id, routeId: row.route_id, rendererKind: row.renderer_kind,
          rendererVersion: row.renderer_version, sourceSha256: row.source_sha256, profileId: row.profile_id,
          profileVersion: row.profile_version, inputHash: row.input_hash, attemptCount: row.attempt_count,
          maxAttempts: row.max_attempts, partnerId: row.partner_id, personId: row.person_id, matterId: row.matter_id,
          fencingToken: row.fencing_token, claimExpiresAt: row.claim_expires_at
        };
      },
      startRender: async (id, token) => db.scalar(`select start_packet_render('${id}', '${token}')`) === "t",
      startValidation: async (id, token) => db.scalar(`select start_packet_validation('${id}', '${token}')`) === "t",
      fail: async (id, token, code, detail, retryable) =>
        db.scalar(`select fail_packet_render_job('${id}', '${token}', '${code}', 'e2e', ${retryable})`),
      finalize: async (input) => {
        const row = db.json(
          `select row_to_json(t) from (select * from finalize_packet_render_job('${input.jobId}', '${input.fencingToken}', '${input.outputStoragePath}', '${input.localSha256}', '${input.localNormalizedSha256}', '${input.storedSha256}', '${input.storedNormalizedSha256}', ${input.outputByteCount}, ${input.outputPageCount}, '${input.containerDigest}')) t`
        );
        return row && {
          accountingResult: row.accounting_result,
          deliveryEligibility: row.delivery_eligibility,
          consumptionUnitHash: row.consumption_unit_hash,
          creditLedgerId: row.credit_ledger_id
        };
      },
      releaseExpired: async () => 0,
      requeueRetryable: async () => 0
    },
    storage,
    renderer: { render: async () => renderRcapPacketPdf(packet, "full") },
    allowlists: {
      allowedSourceShas: new Set(),
      knownProfileVersions: new Set(["1.3.0"]),
      supportedRendererKinds: new Set(["packet_document_v1"])
    },
    workerId: "e2e-worker",
    containerDigest: "sha256:e2e-container"
  };
  const cycle = await runWorkerCycle(workerDeps);
  assert(cycle.outcome === "finalized" && cycle.accountingResult === "consumed", `e2e: worker produced a consumed artifact (${JSON.stringify(cycle)})`);

  // The HTTP wrapper: same decision core, session-cookie test identity.
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const match = url.pathname.match(/^\/api\/rcap\/packets\/([0-9a-f-]+)\/download$/);
    if (!match) {
      res.writeHead(404).end();
      return;
    }
    const cookies = Object.fromEntries(
      (req.headers.cookie ?? "").split(";").map((part) => part.trim().split("=")).filter((pair) => pair.length === 2)
    );
    const userId = cookies[SESSION_COOKIE] === SESSION_VALUE ? USER_OWNER : null;

    const activePorts = illinoisDelivery?.jobs.some((job) => job.jobId === match[1]) ? illinoisDelivery.ports : deliveryPorts;
    const decision = await authorizePacketDownload(activePorts, { jobId: match[1], userId });
    if (!decision.ok) {
      res.writeHead(decision.status, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: decision.message, code: decision.code }));
      return;
    }
    const response = await streamAuthorizedPacket(activePorts, decision, {
      userId,
      requestContext: { surface: "e2e", userAgentClass: "mobile" }
    });
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const downloadUrl = `http://127.0.0.1:${port}/api/rcap/packets/${jobId}/download`;

  // Browser resolution, in order: an explicitly pinned executable, then
  // Playwright's own cache, then a one-time managed install. This verifier
  // does not skip itself: an environment that cannot produce a browser fails
  // loudly rather than reporting a pass that tested nothing.
  const pinnedChromium = process.env.RCAP_E2E_CHROMIUM ?? "/opt/pw-browsers/chromium";
  const launchOptions = { headless: true };
  if (fs.existsSync(pinnedChromium)) {
    launchOptions.executablePath = pinnedChromium;
  } else {
    try {
      browser = await chromium.launch(launchOptions);
    } catch {
      const { spawnSync } = await import("node:child_process");
      const install = spawnSync("npx", ["playwright", "install", "chromium"], {
        stdio: ["ignore", "inherit", "inherit"],
        timeout: 300000
      });
      if (install.status !== 0) {
        throw new Error("Playwright chromium is unavailable and could not be installed; the e2e cannot run.");
      }
    }
  }
  browser = browser ?? (await chromium.launch(launchOptions));
  const context = await browser.newContext({
    // iPhone-class mobile viewport.
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    acceptDownloads: true
  });
  await context.addCookies([{ name: SESSION_COOKIE, value: SESSION_VALUE, url: `http://127.0.0.1:${port}` }]);
  const page = await context.newPage();

  // An unauthenticated browser (no session cookie) is denied.
  const anonContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const anonPage = await anonContext.newPage();
  const anonResponse = await anonPage.goto(downloadUrl);
  assert(anonResponse.status() === 401, `e2e: browser without a session is denied (${anonResponse.status()})`);
  await anonContext.close();

  // The authenticated mobile browser downloads the PDF.
  const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
  await page.goto(downloadUrl).catch(() => {
    // Chromium treats a navigation that becomes a download as an aborted
    // navigation; the download event is the signal that matters.
  });
  const download = await downloadPromise;
  const savedPath = path.join(storageRoot, "browser-download.pdf");
  await download.saveAs(savedPath);
  const downloadedBytes = fs.readFileSync(savedPath);
  const row = jobRow(jobId);
  assert(downloadedBytes.subarray(0, 5).toString("latin1") === "%PDF-", "e2e: the browser received a PDF");
  assert(createHash("sha256").update(downloadedBytes).digest("hex") === row.output_sha256, "e2e: the browser received the exact validated artifact bytes");
  assert(/\.pdf$/.test(download.suggestedFilename()), `e2e: participant-facing filename (${download.suggestedFilename()})`);

  await new Promise((resolve) => setTimeout(resolve, 200));
  const events = db.json(
    `select coalesce(json_object_agg(event_type, n), '{}'::json) from (select event_type, count(*) n from packet_delivery_events where render_job_id = '${jobId}' group by event_type) s`
  );
  assert(events.delivery_authorized >= 1, `e2e: delivery_authorized recorded (${JSON.stringify(events)})`);
  assert(events.transmission_completed >= 1, `e2e: transmission_completed recorded after the pipeline finished (${JSON.stringify(events)})`);
  assert(jobRow(jobId).status === "delivered", "e2e: the job is delivered");

  // Repeat download consumes nothing.
  const before = db.scalar(`select count(*) from packet_credit_ledger where event_type in ('consumed','overage_consumed')`);
  const secondDownload = page.waitForEvent("download", { timeout: 15000 });
  await page.goto(downloadUrl).catch(() => {});
  await secondDownload;
  const after = db.scalar(`select count(*) from packet_credit_ledger where event_type in ('consumed','overage_consumed')`);
  assert(before === after, "e2e: a repeat mobile download consumes nothing");
  illinoisDelivery = await exerciseIllinoisDelivery({ db, deps: workerDeps, deliveryPorts, userId: USER_OWNER, partnerId: P1, personId: PERSON_A });
  for (const job of illinoisDelivery.jobs) {
    const received = page.waitForEvent("download", { timeout: 15000 });
    await page.goto(`http://127.0.0.1:${port}/api/rcap/packets/${job.jobId}/download`).catch(() => {});
    const download = await received;
    const target = path.join(storageRoot, `${job.kind}.pdf`);
    await download.saveAs(target);
    assert(fs.readFileSync(target).equals(illinoisDelivery.bytes), `Illinois ${job.kind}: mobile browser received the exact pinned fixture`);
  }
} finally {
  if (browser) await browser.close();
  if (server) server.close();
  db.stop();
  fs.rmSync(storageRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("verify-rcap-packet-delivery-e2e FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("verify-rcap-packet-delivery-e2e passed: a mobile browser received the validated artifact over HTTP with honest delivery events.");
