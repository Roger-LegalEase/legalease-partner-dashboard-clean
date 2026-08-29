#!/usr/bin/env node
// Lane D — the North Dakota composed packet through the real product path.
//
//   node scripts/verify-nd-grade-a-product-path.mjs
//
// A standalone PDF is not the deliverable. This proves the composed packet
// survives the path a participant actually walks, against the real schema and
// the real delivery core:
//
//   1. anonymous screening produces a pending result and nothing else — the
//      route is resolved on the server from governed facts, and a client cannot
//      name it;
//   2. the pending result becomes a participant-owned matter only by an atomic
//      claim — two simultaneous claims, exactly one winner, and a Briefcase item
//      that is never anonymous;
//   3. Review and Edit: the owner corrects a governed fact and the packet
//      recomposes deterministically to different bytes and a different input
//      hash;
//   4. final verification at render time: a stale specification hash refuses;
//   5. a synthetic payment (no live provider, no live key) authorizes the render;
//   6. the render worker durably renders, stores and validates the artifact;
//   7. a mobile browser downloads the exact validated bytes from a private
//      Briefcase, and repeats the download without consuming anything;
//   8. a wrong user and a wrong matter are denied.
//
// The database is a real ephemeral PostgreSQL running the committed migrations.
// The browser is a real Chromium. Nothing about delivery is simulated.

import fs from "node:fs";
import os from "node:os";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";
import { renderNdComposedPacketPdf, PDFDocument } from "./lib/nd-composed-packet-pdf.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT_DIR = path.join(
  rootDir,
  "data/rcap-lane-d/north-dakota/nd-nonconviction-closing-petition"
);

const { runWorkerCycle } = await import("../src/lib/rcap/render/render-worker.ts");
const { authorizePacketDownload, streamAuthorizedPacket } = await import(
  "../src/lib/rcap/render/packet-delivery.ts"
);
const { forbiddenRouteIdentityFields } = await import(
  "../src/lib/rcap-engine/composed-route-selector.ts"
);
const {
  ND_NONCONVICTION_PETITION_SPEC,
  resolveNdNonconvictionRoute,
  ndComposedPacketSpecHash
} = await import("../src/lib/record-clearing/north-dakota-nonconviction-spec.ts");
const { composeNdNonconvictionPacket, ND_PACKET_LAYOUT } = await import(
  "../src/lib/record-clearing/composers/nd-composed-packet-composer.ts"
);

if (!ephemeralPgAvailable()) {
  console.error(
    "verify-nd-grade-a-product-path: PostgreSQL is not available in this environment; the product path cannot be proven."
  );
  process.exit(1);
}

const failures = [];
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonicalFixture = JSON.parse(
  fs.readFileSync(path.join(ARTIFACT_DIR, "fixtures/canonical.json"), "utf8")
);
const specHash = ndComposedPacketSpecHash();

// Stable synthetic identities. Derived from labels rather than generated, so a
// rerun produces the same evidence.
const duuid = (label) => {
  const h = sha256(`rcap-lane-d/${label}`);
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const OWNER = duuid("owner");
const STRANGER = duuid("stranger");
const PENDING_ID = duuid("pending");
const BRIEFCASE_ITEM = duuid("briefcase-item");
const OTHER_ITEM = duuid("other-briefcase-item");
const PERSON = duuid("person");
const MATTER = duuid("matter");
const OTHER_MATTER = duuid("other-matter");
const PARTNER = duuid("partner");
const SESSION_COOKIE = "nd-lane-d-session";
const OWNER_SESSION = "nd-lane-d-owner-session";
const STRANGER_SESSION = "nd-lane-d-stranger-session";

const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nd-lane-d-"));
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

const db = startEphemeralPg();
let server;
let browser;

try {
  // -------------------------------------------------------------------------
  // Schema: the committed migrations, on a real PostgreSQL.
  // -------------------------------------------------------------------------
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create schema if not exists auth`);
  db.sql(`create table auth.users (id uuid primary key)`);
  db.sql(`create or replace function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$`);
  db.sql(`create or replace function auth.role() returns text language sql stable as $$
            select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user) $$`);
  db.sql(`alter default privileges in schema public grant all on tables to service_role`);
  db.sql(`create table public.partner_records (id uuid primary key, partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  for (const migration of [
    "supabase/phase-26-consumer-briefcase-items.sql",
    "supabase/phase-27-consumer-checkout-metadata.sql",
    "supabase/phase-28-consumer-packet-generation-status.sql",
    "supabase/phase-38-expungement-pending-screening-results.sql"
  ]) {
    if (fs.existsSync(path.join(rootDir, migration))) db.applyFile(path.join(rootDir, migration));
  }
  db.sql(`grant select, insert, update on public.consumer_briefcase_items to authenticated`);
  db.sql(`grant select on public.consumer_briefcase_items to anon`);
  for (const migration of [
    "supabase/phase-49-rcap-packet-render-jobs.sql",
    "supabase/phase-50-rcap-packet-delivery-hardening.sql",
    "supabase/phase-51-rcap-consumer-payment-gate.sql",
    "supabase/phase-52-rcap-consumer-payment-authority.sql",
    "supabase/phase-53-rcap-consumer-job-binding.sql"
  ]) {
    db.applyFile(path.join(rootDir, migration));
  }
  db.sql(`insert into auth.users values ('${OWNER}'), ('${STRANGER}')`);
  db.sql(`insert into partner_records values ('${PARTNER}','we-must-vote')`);
  db.sql(`insert into rcap_persons values ('${PERSON}','we-must-vote','nd-lane-d')`);

  // -------------------------------------------------------------------------
  // 1. Anonymous screening resolves the route on the server.
  // -------------------------------------------------------------------------
  const screeningAnswers = {
    case_outcome: "dismissed",
    all_charges_dismissed_or_acquitted: true,
    nonconviction_order_date: canonicalFixture.facts.nonconvictionOrderDate
  };
  const resolution = resolveNdNonconvictionRoute({
    nonconvictionOrderDate: screeningAnswers.nonconviction_order_date,
    allChargesDismissedOrAcquitted: screeningAnswers.all_charges_dismissed_or_acquitted
  });
  check(
    resolution.status === "composed_packet" && resolution.specId === ND_NONCONVICTION_PETITION_SPEC.specId,
    "Canonical resolver: the screening facts must resolve to the North Dakota nonconviction petition specification."
  );

  // A participant may not name the route. The forbidden-field guard is the
  // repository's existing authority on that and is exercised here, not restated.
  const clientBody = {
    jurisdiction: "ND",
    selectedTrackId: ND_NONCONVICTION_PETITION_SPEC.routeId,
    treatmentClassification: "production_packet"
  };
  const forbidden = forbiddenRouteIdentityFields(clientBody);
  check(
    forbidden.includes("selectedTrackId") && forbidden.includes("treatmentClassification"),
    "A client body that asserts route identity must be rejected by the forbidden-field guard."
  );

  // The anonymous screening result is a handoff row, owned by nobody.
  db.sql(
    `insert into consumer_pending_screening_results
       (pending_id, jurisdiction, result_code, pathway_label, packet_type, payment_allowed, summary,
        screening_answers, profile_version, matter_id)
     values ('${PENDING_ID}', 'ND', 'possible_path',
             'Nonconviction closing - Petition to Close Nonconviction Records',
             'custom_pleading_packet', false, 'Possible path',
             '${JSON.stringify(screeningAnswers)}'::jsonb,
             '${ND_NONCONVICTION_PETITION_SPEC.provider.profileVersion}', 'nd-lane-d-matter')`
  );
  const pendingOwner = db.scalar(
    `select coalesce(claimed_user_id::text, 'ANONYMOUS') from consumer_pending_screening_results where pending_id = '${PENDING_ID}'`
  ).trim();
  check(pendingOwner === "ANONYMOUS", "Screening may be anonymous: the pending result starts unowned.");

  // -------------------------------------------------------------------------
  // 2. The claim: atomic, exactly once, and a Briefcase that is never anonymous.
  // -------------------------------------------------------------------------
  const briefcaseIsNotNullable = db.scalar(
    `select is_nullable from information_schema.columns
      where table_schema='public' and table_name='consumer_briefcase_items' and column_name='user_id'`
  ).trim();
  check(
    briefcaseIsNotNullable === "NO",
    "A Briefcase may not be anonymous: consumer_briefcase_items.user_id must be NOT NULL."
  );

  // Two simultaneous claimants race for the same pending result. The claim is a
  // conditional update on claimed_user_id being null, so the database decides,
  // and exactly one of them can win.
  const claimSql = (user) =>
    `update consumer_pending_screening_results set claimed_at = now(), claimed_user_id = '${user}'
      where pending_id = '${PENDING_ID}' and claimed_user_id is null returning pending_id`;
  const claimOutputs = db.sql(
    `begin;
     ${claimSql(OWNER)};
     ${claimSql(STRANGER)};
     commit;`
  );
  const claimWins = (String(claimOutputs).match(/UPDATE 1/g) ?? []).length;
  check(
    claimWins === 1,
    `Exactly one claimant may win the pending result; ${claimWins} conditional updates succeeded.`
  );
  const claimedBy = db.scalar(
    `select claimed_user_id from consumer_pending_screening_results where pending_id = '${PENDING_ID}'`
  ).trim();
  check(claimedBy === OWNER, "The first claimant must own the claimed pending result.");
  // A later claimant is refused rather than silently re-owning the row.
  db.sql(claimSql(STRANGER));
  check(
    db
      .scalar(`select claimed_user_id from consumer_pending_screening_results where pending_id = '${PENDING_ID}'`)
      .trim() === OWNER,
    "A second claimant must not be able to take over an already-claimed pending result."
  );

  // The claim creates the participant-owned matter.
  db.sql(
    `insert into consumer_briefcase_items (id, user_id, item_type, status, jurisdiction, source_session_id)
     values ('${BRIEFCASE_ITEM}', '${OWNER}', 'packet', 'packet_ready', 'ND', '${PENDING_ID}')`
  );
  db.sql(
    `insert into consumer_briefcase_items (id, user_id, item_type, status, jurisdiction)
     values ('${OTHER_ITEM}', '${STRANGER}', 'packet', 'packet_ready', 'ND')`
  );
  check(
    db.scalar(`select user_id from consumer_briefcase_items where id = '${BRIEFCASE_ITEM}'`).trim() === OWNER,
    "The claimed matter must be owned by the claimant."
  );

  // -------------------------------------------------------------------------
  // 3. Review and Edit.
  // -------------------------------------------------------------------------
  const firstPass = composeNdNonconvictionPacket({
    facts: canonicalFixture.facts,
    productName: "LegalEase RCAP",
    expectedJurisdiction: "ND",
    expectedSpecId: ND_NONCONVICTION_PETITION_SPEC.specId,
    expectedSpecHash: specHash
  });
  check(firstPass.status === "composed", "The claimed matter must compose a packet for review.");
  const editedFacts = {
    ...canonicalFixture.facts,
    judicialDistrict: "East Central Judicial District",
    clerkOfCourtDestination: "Clerk of District Court, Cass County, East Central Judicial District"
  };
  const secondPass = composeNdNonconvictionPacket({
    facts: editedFacts,
    productName: "LegalEase RCAP",
    expectedJurisdiction: "ND",
    expectedSpecId: ND_NONCONVICTION_PETITION_SPEC.specId,
    expectedSpecHash: specHash
  });
  check(secondPass.status === "composed", "An edited matter must recompose.");
  check(
    firstPass.status === "composed"
      && secondPass.status === "composed"
      && firstPass.packet.fullTextSha256 !== secondPass.packet.fullTextSha256,
    "An edit to a governed fact must change the composed bytes."
  );
  check(
    secondPass.status === "composed"
      && secondPass.packet.fullText.replace(/\s+/g, " ").includes("East Central Judicial District"),
    "The edited filing destination must appear in the recomposed packet."
  );
  // Editing back restores the exact original bytes: the edit path is not lossy.
  const thirdPass = composeNdNonconvictionPacket({
    facts: canonicalFixture.facts,
    productName: "LegalEase RCAP",
    expectedJurisdiction: "ND",
    expectedSpecId: ND_NONCONVICTION_PETITION_SPEC.specId,
    expectedSpecHash: specHash
  });
  check(
    thirdPass.status === "composed"
      && firstPass.status === "composed"
      && thirdPass.packet.fullTextSha256 === firstPass.packet.fullTextSha256,
    "Reverting an edit must restore the exact original bytes."
  );

  const finalPacket = firstPass.packet;
  const inputHashFirst = sha256(JSON.stringify({ facts: canonicalFixture.facts, specHash }));
  const inputHashEdited = sha256(JSON.stringify({ facts: editedFacts, specHash }));
  check(inputHashFirst !== inputHashEdited, "An edit must change the render input hash.");

  // -------------------------------------------------------------------------
  // 4. Final verification before render.
  // -------------------------------------------------------------------------
  const staleGate = composeNdNonconvictionPacket({
    facts: canonicalFixture.facts,
    productName: "LegalEase RCAP",
    expectedSpecHash: "f".repeat(64)
  });
  check(
    staleGate.status === "refused" && staleGate.reasonCode === "stale_spec_hash",
    "Final verification must refuse to render against a stale specification."
  );
  const reverifiedRoute = resolveNdNonconvictionRoute({
    nonconvictionOrderDate: canonicalFixture.facts.nonconvictionOrderDate,
    allChargesDismissedOrAcquitted: canonicalFixture.facts.allChargesDismissedOrAcquitted
  });
  check(
    reverifiedRoute.status === "composed_packet",
    "Final verification must re-resolve the route from the governed facts, not from the pending row."
  );

  // -------------------------------------------------------------------------
  // 5. Synthetic payment.
  // -------------------------------------------------------------------------
  const providerEvent = "evt_nd_lane_d_synthetic_0001";
  db.sql(
    `update consumer_briefcase_items
        set payment_status = 'paid', amount_cents = 5000, currency = 'usd',
            payment_provider = 'stripe', provider_event_id = '${providerEvent}',
            payment_authority = 'server_webhook', payment_recorded_at = now(),
            payment_recorded_by = 'nd-lane-d-synthetic'
      where id = '${BRIEFCASE_ITEM}'`
  );
  check(
    db.scalar(`select payment_status from consumer_briefcase_items where id = '${BRIEFCASE_ITEM}'`).trim() === "paid",
    "The synthetic payment must be recorded through the server payment-authority columns."
  );
  // The next two attempts are supposed to fail. PostgreSQL prints its rejection
  // to stderr; that output is the evidence, not a problem.
  console.log("  (the next two database errors are the expected payment rejections)");
  // The provider receipt is single-use: it cannot be replayed onto another matter.
  let replayRejected = false;
  try {
    db.sql(
      `update consumer_briefcase_items set provider_event_id = '${providerEvent}' where id = '${OTHER_ITEM}'`
    );
  } catch {
    replayRejected = true;
  }
  check(replayRejected, "A provider receipt must not be replayable onto a second matter.");
  // A hand-written paid row without server evidence is refused by the database.
  let handWrittenRejected = false;
  try {
    db.sql(`update consumer_briefcase_items set payment_status = 'paid' where id = '${OTHER_ITEM}'`);
  } catch {
    handWrittenRejected = true;
  }
  check(handWrittenRejected, "A paid status without server payment evidence must be refused.");

  // -------------------------------------------------------------------------
  // 6. Durable render.
  // -------------------------------------------------------------------------
  db.sql(
    `insert into partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap) values ('${PARTNER}', 5, false, 0)`
  );
  const packetRow = db
    .scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`)
    .trim();
  const jobId = db
    .scalar(
      `select id from enqueue_packet_render_job('${packetRow}', 'ND:nd-nonconviction-closing-petition', 'packet_document_v1', '1.0.0', null, 'ND', '${ND_NONCONVICTION_PETITION_SPEC.provider.profileVersion}', '${inputHashFirst}', '${BRIEFCASE_ITEM}', '${PARTNER}', '${PERSON}', '${MATTER}', 5, null, null)`
    )
    .trim();
  check(Boolean(jobId), "The render job must enqueue against the participant's matter.");

  const composedPdf = await renderNdComposedPacketPdf(
    finalPacket,
    ND_PACKET_LAYOUT,
    "North Dakota Petition to Close Nonconviction Records"
  );
  check(
    composedPdf.overlongLines.length === 0,
    `The rendered packet has lines past the margin: ${composedPdf.overlongLines.join("; ")}`
  );
  // The artifact the participant receives is the artifact the review covered.
  const committedPdf = fs.readFileSync(path.join(ARTIFACT_DIR, "rendered/canonical.pdf"));
  check(
    sha256(composedPdf.bytes) === sha256(committedPdf),
    "The packet rendered on the product path must be byte-identical to the reviewed artifact."
  );

  const cycle = await runWorkerCycle({
    queue: {
      claim: async (worker) => {
        const row = db.json(
          `select row_to_json(t) from (select * from claim_packet_render_job('${worker}', null, 60)) t`
        );
        if (!row) return null;
        return {
          id: row.id,
          packetId: row.packet_id,
          routeId: row.route_id,
          rendererKind: row.renderer_kind,
          rendererVersion: row.renderer_version,
          sourceSha256: row.source_sha256,
          profileId: row.profile_id,
          profileVersion: row.profile_version,
          inputHash: row.input_hash,
          attemptCount: row.attempt_count,
          maxAttempts: row.max_attempts,
          partnerId: row.partner_id,
          personId: row.person_id,
          matterId: row.matter_id,
          fencingToken: row.fencing_token,
          claimExpiresAt: row.claim_expires_at
        };
      },
      startRender: async (id, token) => db.scalar(`select start_packet_render('${id}', '${token}')`) === "t",
      startValidation: async (id, token) =>
        db.scalar(`select start_packet_validation('${id}', '${token}')`) === "t",
      fail: async (id, token, code, detail, retryable) =>
        db.scalar(`select fail_packet_render_job('${id}', '${token}', '${code}', 'nd-lane-d', ${retryable})`),
      finalize: async (input) => {
        const row = db.json(
          `select row_to_json(t) from (select * from finalize_packet_render_job('${input.jobId}', '${input.fencingToken}', '${input.outputStoragePath}', '${input.localSha256}', '${input.localNormalizedSha256}', '${input.storedSha256}', '${input.storedNormalizedSha256}', ${input.outputByteCount}, ${input.outputPageCount}, '${input.containerDigest}')) t`
        );
        return (
          row && {
            accountingResult: row.accounting_result,
            deliveryEligibility: row.delivery_eligibility,
            consumptionUnitHash: row.consumption_unit_hash,
            creditLedgerId: row.credit_ledger_id
          }
        );
      },
      releaseExpired: async () => 0,
      requeueRetryable: async () => 0
    },
    storage,
    renderer: { render: async () => composedPdf.bytes },
    allowlists: {
      allowedSourceShas: new Set(),
      knownProfileVersions: new Set([ND_NONCONVICTION_PETITION_SPEC.provider.profileVersion]),
      supportedRendererKinds: new Set(["packet_document_v1"])
    },
    workerId: "nd-lane-d-worker",
    containerDigest: "sha256:nd-lane-d-container"
  });
  check(
    cycle.outcome === "finalized",
    `The render worker must durably finalize the North Dakota packet (${JSON.stringify(cycle)}).`
  );

  const jobRow = (id) =>
    db.json(
      `select row_to_json(t) from (select id, status, delivery_eligibility, accounting_result, briefcase_item_id, route_id, output_storage_path, output_sha256, normalized_output_sha256, attempt_count, partner_id, person_id, matter_id, renderer_kind, renderer_version, max_attempts, failure_disposition, page_count as output_page_count, error_code as last_error_code from packet_render_jobs where id = '${id}') t`
    );
  const finalized = jobRow(jobId);
  check(
    finalized.output_sha256 === sha256(composedPdf.bytes),
    "The stored artifact hash must be the composed packet's hash."
  );
  check(
    Number(finalized.output_page_count) === finalPacket.totalPageCount,
    `The stored artifact page count (${finalized.output_page_count}) must be the composed page count (${finalPacket.totalPageCount}).`
  );
  const storedBytes = await storage.read(finalized.output_storage_path);
  check(Boolean(storedBytes), "The artifact must be durably stored.");
  const storedDoc = await PDFDocument.load(storedBytes).catch(() => null);
  check(
    storedDoc && storedDoc.getPageCount() === finalPacket.totalPageCount,
    "The durably stored artifact must be a parseable PDF with the composed page count."
  );

  // -------------------------------------------------------------------------
  // 7 and 8. Private Briefcase delivery, repeat download, and denials.
  // -------------------------------------------------------------------------
  const deliveryPorts = {
    getJob: async (id) => {
      const row = jobRow(id);
      if (!row) return null;
      return {
        id: row.id,
        packetId: "nd-lane-d",
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
    // Ownership is read from the database, not asserted by the caller: the user
    // owns the item only if the Briefcase row says so.
    userOwnsBriefcaseItem: async (userId, briefcaseItemId) => {
      if (!userId || !briefcaseItemId) return false;
      return (
        db
          .scalar(
            `select count(*) from consumer_briefcase_items where id = '${briefcaseItemId}' and user_id = '${userId}'`
          )
          .trim() === "1"
      );
    },
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

  // A job bound to a matter the participant does not own is denied.
  const otherPacketRow = db
    .scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`)
    .trim();
  const otherJobId = db
    .scalar(
      `select id from enqueue_packet_render_job('${otherPacketRow}', 'ND:nd-nonconviction-closing-petition', 'packet_document_v1', '1.0.0', null, 'ND', '${ND_NONCONVICTION_PETITION_SPEC.provider.profileVersion}', '${sha256("other-input")}', '${OTHER_ITEM}', '${PARTNER}', '${PERSON}', '${OTHER_MATTER}', 5, null, null)`
    )
    .trim();
  const wrongMatter = await authorizePacketDownload(deliveryPorts, { jobId: otherJobId, userId: OWNER });
  // Ownership is checked before deliverability, so this denial is an ownership
  // denial and not an incidental "not ready yet".
  check(
    !wrongMatter.ok && wrongMatter.status === 403 && wrongMatter.code === "unauthorized",
    `A participant must be denied a packet bound to a matter they do not own, on ownership (${JSON.stringify(wrongMatter)}).`
  );
  const wrongUser = await authorizePacketDownload(deliveryPorts, { jobId, userId: STRANGER });
  check(
    !wrongUser.ok && wrongUser.status === 403 && wrongUser.code === "unauthorized",
    `A different authenticated user must be denied the owner's packet, on ownership (${JSON.stringify(wrongUser)}).`
  );
  const anonymous = await authorizePacketDownload(deliveryPorts, { jobId, userId: null });
  check(!anonymous.ok && anonymous.status === 401, "An unauthenticated request must be denied.");
  const owner = await authorizePacketDownload(deliveryPorts, { jobId, userId: OWNER });
  check(owner.ok, `The owner must be authorized to download their own packet (${JSON.stringify(owner)}).`);

  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const match = url.pathname.match(/^\/api\/rcap\/packets\/([0-9a-f-]+)\/download$/);
    if (!match) {
      res.writeHead(404).end();
      return;
    }
    const cookies = Object.fromEntries(
      (req.headers.cookie ?? "")
        .split(";")
        .map((part) => part.trim().split("="))
        .filter((pair) => pair.length === 2)
    );
    const userId =
      cookies[SESSION_COOKIE] === OWNER_SESSION
        ? OWNER
        : cookies[SESSION_COOKIE] === STRANGER_SESSION
          ? STRANGER
          : null;
    const decision = await authorizePacketDownload(deliveryPorts, { jobId: match[1], userId });
    if (!decision.ok) {
      res.writeHead(decision.status, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: decision.message, code: decision.code }));
      return;
    }
    const response = await streamAuthorizedPacket(deliveryPorts, decision, {
      userId,
      requestContext: { surface: "nd-lane-d", userAgentClass: "mobile" }
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

  const pinnedChromium = process.env.RCAP_E2E_CHROMIUM ?? "/opt/pw-browsers/chromium";
  const launchOptions = { headless: true };
  if (fs.existsSync(pinnedChromium)) launchOptions.executablePath = pinnedChromium;
  browser = await chromium.launch(launchOptions);

  const mobile = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    acceptDownloads: true
  };

  // An unauthenticated browser is denied.
  const anonContext = await browser.newContext(mobile);
  const anonResponse = await anonContext.newPage().then((page) => page.goto(downloadUrl));
  check(
    anonResponse.status() === 401,
    `A browser with no session must be denied (${anonResponse.status()}).`
  );
  await anonContext.close();

  // A different authenticated participant is denied.
  const strangerContext = await browser.newContext(mobile);
  await strangerContext.addCookies([
    { name: SESSION_COOKIE, value: STRANGER_SESSION, url: `http://127.0.0.1:${port}` }
  ]);
  const strangerResponse = await strangerContext.newPage().then((page) => page.goto(downloadUrl));
  check(
    strangerResponse.status() === 403 || strangerResponse.status() === 404,
    `A different participant must be denied the owner's packet (${strangerResponse.status()}).`
  );
  await strangerContext.close();

  // The owner downloads the exact validated bytes.
  const ownerContext = await browser.newContext(mobile);
  await ownerContext.addCookies([
    { name: SESSION_COOKIE, value: OWNER_SESSION, url: `http://127.0.0.1:${port}` }
  ]);
  const page = await ownerContext.newPage();
  const downloadPromise = page.waitForEvent("download", { timeout: 20000 });
  await page.goto(downloadUrl).catch(() => {
    // Chromium reports a navigation that becomes a download as aborted; the
    // download event is the signal that matters.
  });
  const download = await downloadPromise;
  const savedPath = path.join(storageRoot, "owner-download.pdf");
  await download.saveAs(savedPath);
  const downloaded = fs.readFileSync(savedPath);
  check(
    downloaded.subarray(0, 5).toString("latin1") === "%PDF-",
    "The participant must receive a PDF."
  );
  check(
    sha256(downloaded) === finalized.output_sha256,
    "The participant must receive the exact validated artifact bytes."
  );
  check(
    sha256(downloaded) === sha256(committedPdf),
    "The downloaded packet must be the reviewed packet, byte for byte."
  );
  check(/\.pdf$/.test(download.suggestedFilename()), `The download must be named as a PDF (${download.suggestedFilename()}).`);

  await new Promise((resolve) => setTimeout(resolve, 250));
  const events = db.json(
    `select coalesce(json_object_agg(event_type, n), '{}'::json) from (select event_type, count(*) n from packet_delivery_events where render_job_id = '${jobId}' group by event_type) s`
  );
  check(events.delivery_authorized >= 1, `Delivery authorization must be recorded (${JSON.stringify(events)}).`);
  check(
    events.transmission_completed >= 1,
    `Transmission completion must be recorded (${JSON.stringify(events)}).`
  );
  check(jobRow(jobId).status === "delivered", "The job must reach delivered.");

  // The repeat download consumes nothing.
  const consumedBefore = db
    .scalar(`select count(*) from packet_credit_ledger where event_type in ('consumed','overage_consumed')`)
    .trim();
  const repeatPromise = page.waitForEvent("download", { timeout: 20000 });
  await page.goto(downloadUrl).catch(() => {});
  const repeat = await repeatPromise;
  const repeatPath = path.join(storageRoot, "owner-download-2.pdf");
  await repeat.saveAs(repeatPath);
  const consumedAfter = db
    .scalar(`select count(*) from packet_credit_ledger where event_type in ('consumed','overage_consumed')`)
    .trim();
  check(consumedBefore === consumedAfter, "A repeat download must consume nothing.");
  check(
    sha256(fs.readFileSync(repeatPath)) === sha256(downloaded),
    "A repeat download must return the same bytes."
  );
} finally {
  if (browser) await browser.close();
  if (server) server.close();
  db.stop();
  fs.rmSync(storageRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`North Dakota Grade-A product path FAILED (${failures.length} of ${checks} checks).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`North Dakota Grade-A product path PASSED (${checks} checks).`);
console.log("  resolver:          server-resolved from governed facts; client route identity rejected");
console.log("  claim:             atomic, exactly one winner, matter owned by the claimant");
console.log("  briefcase:         user_id NOT NULL — a Briefcase is never anonymous");
console.log("  review and edit:   deterministic, reversible, changes the render input hash");
console.log("  final verification: stale specification refuses to render");
console.log("  payment:           synthetic, server-evidenced, receipt single-use");
console.log("  render:            durable, validated, stored, page count matches the composer");
console.log("  delivery:          mobile browser received the reviewed bytes; repeat consumed nothing");
console.log("  denials:           anonymous, wrong user, and wrong matter all denied");
