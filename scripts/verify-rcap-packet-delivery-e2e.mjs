import { exerciseIllinoisDelivery } from "./test-rcap-il-delivery-ephemeral.mjs";
import { applyConsumerDeliverySchema, assertNoDriftFromMigrations } from "./lib/rcap-delivery-schema-fixture.mjs";
import { MS_NONCONVICTION_ROUTE, buildMsNonConvictionVerification } from "./lib/rcap-ms-nonconviction-fixture.mjs";
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
const { consumerMatterIdForItem } = await import("../src/lib/expungement-ai/consumer-identity.ts");
const { renderRcapPacketPdf } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");
// The route's own authority, used to build participants rather than to describe
// them. Supabase environment variables are cleared first: this fixture resolves
// screening and verification locally and must never reach a hosted project.
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  delete process.env[name];
}
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const { packetInformationPatch, protectedPacketDraftSeedFromAuthoritative } =
  await import("../src/lib/expungement-ai/packet-information.ts");

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
/**
 * The route this e2e models, and why it is this one.
 *
 * Delivery ends at commercial admission, which reads the verified snapshot's
 * jurisdiction and pathway and asks whether a Grade-A record proves that route
 * delivers a packet. A synthetic route id has no such record, so a synthetic
 * route can never produce a successful download — correctly. This is the
 * Mississippi non-conviction route, which holds a real fulfillment record, so
 * the test exercises authority the platform actually has rather than inventing
 * some for a convenient fixture.
 */
const ROUTE_JURISDICTION = MS_NONCONVICTION_ROUTE.jurisdiction;
const ROUTE_PATHWAY = MS_NONCONVICTION_ROUTE.pathwayId;
const ROUTE_ID = MS_NONCONVICTION_ROUTE.routeId;

/** The partner job's own matter, and the sponsored transaction that created it. */
const SPONSORED_MATTER = "9aaaaaaa-3333-1111-1111-111111111111";
const SPONSORED_SESSION = "5e551011-1111-1111-1111-111111111111";
const SPONSORED_EVENT = "e4e4e4e4-1111-1111-1111-111111111111";

/**
 * The consumer lane: a second participant who paid for their own packet.
 *
 * Kept entirely separate from the sponsored one rather than converted out of
 * it. A partner job's partner_id is immutable by design, and a test that
 * contorts one job into the other shape proves the contortion, not the
 * contract. This participant owns their own Briefcase item, their own matter
 * and their own verification, and is bound to their job at enqueue.
 */
const CONSUMER_USER = "0e0e0e0e-2222-2222-2222-222222222222";
const CONSUMER_ITEM = "b1b1b1b1-2222-2222-2222-222222222222";
const CONSUMER_PERSON = "aaaaaaaa-2222-2222-2222-222222222222";
const CONSUMER_MATTER = consumerMatterIdForItem(CONSUMER_ITEM);
const CONSUMER_PROVIDER_EVENT = "evt_test_e2e_consumer_packet";

const SESSION_COOKIE = "rcap-e2e-session";
const SESSION_VALUE = "e2e-owner-session-token";
const CONSUMER_SESSION_VALUE = "e2e-consumer-session-token";

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

/**
 * A JSON value as a SQL literal.
 *
 * The real snapshots carry participant prose — "Nolle prosequi entered on the
 * State's motion" — so the apostrophe has to survive the trip. Escaping is
 * doubling, as SQL defines it.
 */
const sqlJson = (value) => `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;

function jobRow(jobId) {
  return db.json(
    `select row_to_json(t) from (select id, status, delivery_eligibility, accounting_result, briefcase_item_id, consumer_briefcase_item_id, consumer_verification_hash, sponsored_route_key, sponsored_session_id, sponsored_clinic_event_id, sponsored_consumer_briefcase_item_id, sponsored_consumer_auth_user_id, sponsored_verification_hash, route_id, output_storage_path, output_sha256, normalized_output_sha256, attempt_count, partner_id, person_id, matter_id, renderer_kind, renderer_version, max_attempts, failure_disposition, error_code as last_error_code from packet_render_jobs where id = '${jobId}') t`
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
      accountingResult: row.accounting_result,
      consumerBriefcaseItemId: row.consumer_briefcase_item_id ?? null,
      consumerVerificationHash: row.consumer_verification_hash ?? null,
      // Loaded exactly as job-queue.ts loads it: only for a partner job, and
      // only when the binding names this job's own route.
      sponsoredBinding: row.partner_id && row.sponsored_route_key === row.route_id && row.sponsored_session_id
        ? {
          routeKey: row.sponsored_route_key,
          sourceSessionId: row.sponsored_session_id,
          clinicEventId: row.sponsored_clinic_event_id,
          briefcaseItemId: row.sponsored_consumer_briefcase_item_id,
          authUserId: row.sponsored_consumer_auth_user_id,
          verificationHash: row.sponsored_verification_hash
        }
        : null
    };
  },

  /**
   * The current verification, read from the table the production path reads.
   *
   * Deliberately not a stub answering "current". The gate exists to tell "the
   * verification is current" apart from "we cannot see the current
   * verification", and a reader that always says yes erases that distinction
   * while appearing to honour it. This returns what
   * consumer_packet_verifications holds, and null when it holds nothing.
   */
  getCurrentVerification: async (itemId) => {
    const row = db.json(
      `select row_to_json(t) from (select consumer_auth_user_id, matter_id, verification_hash, verification_snapshot from public.consumer_packet_verifications where briefcase_item_id = '${itemId}' and status = 'verified') t`
    );
    if (!row || !row.verification_hash || !row.verification_snapshot) return null;
    return {
      snapshot: row.verification_snapshot,
      hash: row.verification_hash,
      ownerUserId: row.consumer_auth_user_id,
      matterId: row.matter_id,
      alreadyDownloaded: false
    };
  },
  /**
   * Sponsored publication readiness, checked rather than asserted.
   *
   * Mirrors every condition sponsoredRenderDeliveryReady applies: the binding
   * must name this user and this job's own Briefcase item, the sponsored scope
   * must belong to this job's partner and clinic event, and the published
   * artifact must be this job's artifact — matched on the render job id and on
   * the output hash the worker actually produced. Seeded state is read; none of
   * it is assumed, and a mismatch anywhere returns false exactly as production
   * would.
   */
  sponsoredDeliveryReady: async (job, userId) => {
    const binding = job.sponsoredBinding;
    if (!binding || binding.authUserId !== userId || binding.briefcaseItemId !== job.briefcaseItemId) return false;
    const publication = db.json(
      `select row_to_json(t) from (select partner_id, clinic_event_id, render_job_id, artifact_sha256, status, entitlement_source from public.e2e_sponsored_publications where route_key = '${binding.routeKey}' and source_session_id = '${binding.sourceSessionId}' and briefcase_item_id = '${binding.briefcaseItemId}' and auth_user_id = '${userId}') t`
    );
    if (!publication) return false;
    return publication.partner_id === job.partnerId
      && publication.clinic_event_id === binding.clinicEventId
      && publication.status === "ready"
      && publication.entitlement_source === "partner_sponsorship"
      && publication.render_job_id === job.id
      && publication.artifact_sha256 === job.outputSha256;
  },
  // Ownership answered from the same table the product owns it in, so the
  // consumer lane cannot reach the sponsored participant's item and neither
  // can reach a third party's.
  userOwnsBriefcaseItem: async (userId, briefcaseItemId) => Boolean(userId) && Boolean(briefcaseItemId)
    && db.scalar(
      `select count(*) from public.consumer_briefcase_items where id = '${briefcaseItemId}' and user_id = '${userId}'`
    ) === "1",
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
  // The delivery contract's own objects, projected from the migrations that own
  // them, with a drift check so the projection cannot quietly stop matching.
  const mirrored = assertNoDriftFromMigrations(rootDir, (message) => { throw new Error(message); });
  assert(mirrored >= 20, `e2e: the schema drift check must cover the delivery contract (${mirrored} definitions)`);
  applyConsumerDeliverySchema(db);
  db.sql(`insert into partner_records values ('${P1}','we-must-vote')`);
  db.sql(`insert into rcap_persons values ('${PERSON_A}','we-must-vote','a')`);
  db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap) values ('${P1}', 5, false, 0)`);

  // Produce a real validated, consumed artifact through the worker.
  const inputHash = createHash("sha256").update("e2e-input").digest("hex");
  const packetRow = db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);
  const jobId = db
    .scalar(
      `select id from enqueue_packet_render_job('${packetRow}', '${ROUTE_ID}', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${inputHash}', '${BRIEFCASE_ITEM}', '${P1}', '${PERSON_A}', '9aaaaaaa-3333-1111-1111-111111111111', 5, null, null)`
    )
    .trim();

  /**
   * The sponsored binding this job has always needed.
   *
   * The partner branch binds a download to the sponsored transaction's own
   * record of the participant: the route it was authorized for, the Briefcase
   * item it belongs to, and the verification hash current at the time. The
   * harness never supplied one, so the gate refused — rightly. Seeded through
   * the real columns with a real current verification, so the gate validates
   * it rather than being waved past.
   */
  //
  // The snapshot is the product's own, not a shape resembling it. The route's
  // collection asks this participant 47 questions and the verification hash is
  // taken over all of their answers, so the fixture answers them and verifies
  // through the same path a participant takes. A hand-written snapshot would
  // pass the gate's field checks while describing a matter nobody completed.
  const sponsoredParticipant = buildMsNonConvictionVerification({
    evaluateAuthoritativeScreeningResult,
    protectedPacketDraftSeedFromAuthoritative,
    packetInformationPatch,
    matterId: SPONSORED_MATTER
  });
  const verificationSnapshot = sponsoredParticipant.snapshot;
  const sponsoredVerificationHash = sponsoredParticipant.hash;
  assert(
    verificationSnapshot.jurisdiction === ROUTE_JURISDICTION && verificationSnapshot.pathwayId === ROUTE_PATHWAY,
    "e2e: the sponsored participant's verification describes the admitted route"
  );
  db.sql(
    `insert into consumer_briefcase_items (id, user_id, item_type, jurisdiction, status) values ('${BRIEFCASE_ITEM}', '${USER_OWNER}', 'packet', 'MS', 'packet_ready')`
  );
  db.sql(
    `insert into consumer_packet_verifications (briefcase_item_id, consumer_auth_user_id, matter_id, status, reason, verification_hash, verification_snapshot, draft_hash, draft_snapshot, revision)
     values ('${BRIEFCASE_ITEM}', '${USER_OWNER}', '${SPONSORED_MATTER}', 'verified', 'e2e sponsored current verification', '${sponsoredVerificationHash}', ${sqlJson(verificationSnapshot)}, '${sponsoredVerificationHash}', '{}'::jsonb, 1)`
  );
  db.sql(
    `insert into sponsored_packet_render_routes (route_key, jurisdiction, pathway_id, packet_family_id) values ('${ROUTE_ID}', '${ROUTE_JURISDICTION}', '${ROUTE_PATHWAY}', 'ms-nonconv-set')`
  );
  db.sql(
    `update packet_render_jobs set sponsored_route_key = '${ROUTE_ID}', sponsored_session_id = '${SPONSORED_SESSION}', sponsored_clinic_event_id = '${SPONSORED_EVENT}', sponsored_consumer_briefcase_item_id = '${BRIEFCASE_ITEM}', sponsored_consumer_auth_user_id = '${USER_OWNER}', sponsored_verification_hash = '${sponsoredVerificationHash}' where id = '${jobId}'`
  );

  /**
   * The renderer's input, taken from the participant who was verified.
   *
   * The name, county and court on the page are the answers their verification
   * hash was computed over, so the artifact a lane downloads is that lane's
   * participant's packet rather than a shared placeholder. Two lanes then
   * produce different bytes, which is what makes the artifact-identity checks
   * downstream say anything.
   */
  const packetFor = (participant) => {
    const answers = participant.answers;
    const [first, ...rest] = String(answers.participant_full_legal_name).split(" ");
    return {
      id: `e2e-pkt-${participant.item.id}`,
      state: ROUTE_JURISDICTION,
      pathway: ROUTE_PATHWAY,
      petitionerFirstName: first,
      petitionerLastName: rest.join(" ") || first,
      county: answers.county.value,
      generatedPlainText:
        `Petitioner ${answers.participant_full_legal_name} requests expungement of cause number `
        + `${answers.case_number.value} in the ${answers.court.value}, dismissed on `
        + `${answers.disposition_date.value}.`,
      filingNextStepsPacket: {
        title: "How to file your petition",
        plainText: `1. File the petition with the ${answers.court.value}.`,
        filingLocation: `${answers.county.value} Circuit Clerk`,
        filingMethod: "in person",
        requiredDocuments: ["Certified copy of the disposition", "Docket sheet", "Photo ID"],
        serviceAndCopies: [`Serve the ${answers.prosecuting_authority_name.value}.`],
        feeSummary: ["Filing fees are set by the clerk."],
        courtContactOrLocationGuidance: [answers.prosecuting_authority_service_address.value],
        afterFiling: ["Keep the file-stamped copy."],
        trackingChecklist: ["Petition filed", "Order signed"],
        workflowGaps: [],
        safetyDisclaimer: "Not legal advice."
      }
    };
  };
  const packet = packetFor(sponsoredParticipant);
  const packetForJob = new Map([[jobId, packet]]);

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
    // Each claimed job renders its own participant's packet. A renderer that
    // ignored the claim would hand both lanes identical bytes, and every
    // later assertion that the browser received "this job's artifact" would
    // pass without distinguishing them.
    renderer: { render: async (claim) => renderRcapPacketPdf(packetForJob.get(claim.id) ?? packet, "full") },
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

  // The sponsored publication, recorded against the artifact the worker just
  // produced. Its hash is read back from the job rather than restated, so the
  // readiness check above is binding on real bytes.
  const sponsoredJobRow = jobRow(jobId);
  db.sql(`create table public.e2e_sponsored_publications (
    route_key text not null,
    source_session_id uuid not null,
    briefcase_item_id uuid not null,
    auth_user_id uuid not null,
    partner_id uuid not null,
    clinic_event_id uuid not null,
    render_job_id uuid not null,
    artifact_sha256 text not null,
    status text not null,
    entitlement_source text not null
  )`);
  db.sql(
    `insert into e2e_sponsored_publications values ('${ROUTE_ID}', '${SPONSORED_SESSION}', '${BRIEFCASE_ITEM}', '${USER_OWNER}', '${P1}', '${SPONSORED_EVENT}', '${jobId}', '${sponsoredJobRow.output_sha256}', 'ready', 'partner_sponsorship')`
  );

  // ======================================================================
  // The consumer lane, built from birth rather than converted.
  //
  // A participant who paid for their own packet reaches delivery through a
  // different branch of the same gate: no sponsored binding, no partner
  // entitlement, and the job's own consumer_verification_hash compared
  // against the current verification for their Briefcase item. That branch
  // had no coverage here at all, so its refusals were unproven.
  //
  // Everything below is the real path. The payment is recorded through
  // record_consumer_packet_payment, which is the only writer of paid state
  // this schema has; the binding is established inside the enqueue, which is
  // the only way a consumer job can be created; and the artifact comes out of
  // a second worker cycle, because runWorkerCycle claims one job per call.
  // ======================================================================
  db.sql(`insert into auth.users values ('${CONSUMER_USER}')`);
  db.sql(
    `insert into consumer_briefcase_items (id, user_id, item_type, jurisdiction, status) values ('${CONSUMER_ITEM}', '${CONSUMER_USER}', 'packet', '${ROUTE_JURISDICTION}', 'packet_ready')`
  );
  db.sql(`insert into rcap_persons values ('${CONSUMER_PERSON}','we-must-vote','consumer-a')`);

  // A different participant, so a different verification hash. The lanes are
  // distinguishable because the people are, not because a hash was perturbed.
  const consumerParticipant = buildMsNonConvictionVerification({
    evaluateAuthoritativeScreeningResult,
    protectedPacketDraftSeedFromAuthoritative,
    packetInformationPatch,
    matterId: CONSUMER_MATTER,
    answerOverrides: {
      participant_full_legal_name: "Consumer Participant",
      case_caption_defendant_name: { value: "Consumer Participant", unknown: false },
      name_used_at_arrest: { value: "Consumer Participant", unknown: false },
      case_number: { value: "2014-0902-CR", unknown: false }
    }
  });
  assert(
    consumerParticipant.hash !== sponsoredVerificationHash,
    "e2e: the two participants verify to different hashes, so the binding checks distinguish them"
  );

  // Payment, recorded through the server payment authority. Not a direct
  // UPDATE: the whole point of the Phase 52 constraint is that paid state
  // cannot be written except with server evidence behind it, and a fixture
  // that writes the column directly would be proving a gate it walked around.
  const payment = db.json(
    `select row_to_json(t) from (select * from record_consumer_packet_payment('${CONSUMER_ITEM}', 'paid', 5000, 'usd', 'stripe', '${CONSUMER_PROVIDER_EVENT}', 'cs_test_e2e_consumer_delivery', 'pi_test_e2e_consumer_delivery', 'https://example.test/receipt', 'server_webhook', 'rcap-delivery-e2e')) t`
  );
  assert(payment?.outcome === "recorded_paid", `e2e: the consumer payment is recorded by the server authority (${JSON.stringify(payment)})`);
  const authority = db.json(
    `select row_to_json(t) from (select * from consumer_packet_payment_authority('${CONSUMER_ITEM}', '${CONSUMER_USER}')) t`
  );
  assert(authority?.valid === true, `e2e: the consumer payment satisfies the payment authority (${JSON.stringify(authority)})`);

  db.sql(
    `insert into consumer_packet_verifications (briefcase_item_id, consumer_auth_user_id, matter_id, status, reason, verification_hash, verification_snapshot, draft_hash, draft_snapshot, revision)
     values ('${CONSUMER_ITEM}', '${CONSUMER_USER}', '${CONSUMER_MATTER}', 'verified', 'e2e consumer current verification', '${consumerParticipant.hash}', ${sqlJson(consumerParticipant.snapshot)}, '${consumerParticipant.verification.draftHash}', ${sqlJson(consumerParticipant.verification.draftSnapshot)}, ${consumerParticipant.verification.revision ?? 1})`
  );

  const consumerPacketRow = db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);
  const consumerInputHash = createHash("sha256").update("e2e-consumer-input").digest("hex");
  const consumerJobId = db
    .scalar(
      `select id from enqueue_packet_render_job('${consumerPacketRow}', '${ROUTE_ID}', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${consumerInputHash}', '${CONSUMER_ITEM}', null, '${CONSUMER_PERSON}', '${CONSUMER_MATTER}', 5, '${CONSUMER_ITEM}', '${CONSUMER_USER}')`
    )
    .trim();
  db.sql(`update packet_render_jobs set consumer_verification_hash = '${consumerParticipant.hash}' where id = '${consumerJobId}'`);
  const enqueued = jobRow(consumerJobId);
  assert(enqueued?.partner_id === null, `e2e: the consumer job carries no partner (${enqueued?.partner_id})`);
  assert(
    enqueued?.consumer_briefcase_item_id === CONSUMER_ITEM && enqueued?.consumer_verification_hash === consumerParticipant.hash,
    "e2e: the consumer job is bound to its own item and verification at enqueue"
  );
  assert(enqueued?.matter_id === CONSUMER_MATTER, `e2e: the consumer job names the participant's own matter (${enqueued?.matter_id})`);

  packetForJob.set(consumerJobId, packetFor(consumerParticipant));
  const consumerCycle = await runWorkerCycle(workerDeps);
  assert(
    consumerCycle.outcome === "finalized",
    `e2e: a second worker cycle produced the consumer artifact (${JSON.stringify(consumerCycle)})`
  );
  // The consumer accounting result is whatever the consumer path actually
  // returns. Copying the partner lane's "consumed" here would assert the
  // sponsored entitlement ledger for a job that never touched it.
  const consumerJobAfterRender = jobRow(consumerJobId);
  assert(
    consumerJobAfterRender?.delivery_eligibility === "eligible",
    `e2e: the consumer artifact is delivery-eligible (${consumerJobAfterRender?.delivery_eligibility} / ${consumerJobAfterRender?.accounting_result})`
  );
  assert(
    consumerJobAfterRender?.output_sha256 !== sponsoredJobRow.output_sha256,
    "e2e: the two lanes produced distinct artifacts, so an identity check can tell them apart"
  );

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
    const userId = { [SESSION_VALUE]: USER_OWNER, [CONSUMER_SESSION_VALUE]: CONSUMER_USER }[cookies[SESSION_COOKIE]] ?? null;

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

  // ======================================================================
  // The consumer lane's own refusals, then its delivery.
  //
  // Each case asks for a distinct product code, because "it was refused" is
  // not the property that matters — a gate that answered every refusal with
  // the same code would be indistinguishable from one that had stopped
  // telling them apart, and the delivery contract's codes are what the
  // participant-facing surfaces key their messages off.
  // ======================================================================
  const consumerUrl = `http://127.0.0.1:${port}/api/rcap/packets/${consumerJobId}/download`;
  const refusal = async (value) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    if (value) await ctx.addCookies([{ name: SESSION_COOKIE, value, url: `http://127.0.0.1:${port}` }]);
    const probe = await ctx.newPage();
    const response = await probe.goto(consumerUrl);
    const body = await response.json().catch(() => ({}));
    await ctx.close();
    return { status: response.status(), code: body.code };
  };

  // 1. No session at all. A Briefcase may not be anonymous.
  const unauthenticated = await refusal(null);
  assert(unauthenticated.status === 401, `consumer: an unauthenticated request is refused 401 (${unauthenticated.status})`);

  // 2. No current verification. The reader sees nothing, and "we cannot see
  //    the current verification" is a refusal, not a pass.
  db.sql(`update consumer_packet_verifications set status = 'invalidated' where briefcase_item_id = '${CONSUMER_ITEM}'`);
  const notCurrent = await refusal(CONSUMER_SESSION_VALUE);
  assert(
    notCurrent.status === 409 && notCurrent.code === "verification_not_current",
    `consumer: an invalidated verification refuses verification_not_current (${notCurrent.status} ${notCurrent.code})`
  );
  db.sql(`update consumer_packet_verifications set status = 'verified' where briefcase_item_id = '${CONSUMER_ITEM}'`);

  // 3. A verification that is current but is not the one this artifact was
  //    rendered against. A newly verified different snapshot must not
  //    authorize delivery of an older stored artifact.
  const rebound = createHash("sha256").update("e2e-consumer-reverified").digest("hex");
  db.sql(`update consumer_packet_verifications set verification_hash = '${rebound}' where briefcase_item_id = '${CONSUMER_ITEM}'`);
  const bindingMismatch = await refusal(CONSUMER_SESSION_VALUE);
  assert(
    bindingMismatch.status === 409 && bindingMismatch.code === "verification_binding_mismatch",
    `consumer: a re-verified snapshot refuses verification_binding_mismatch (${bindingMismatch.status} ${bindingMismatch.code})`
  );
  db.sql(`update consumer_packet_verifications set verification_hash = '${consumerParticipant.hash}' where briefcase_item_id = '${CONSUMER_ITEM}'`);

  // 4. A verification whose snapshot describes a different route than the job
  //    was rendered for. The hash still matches; the route no longer does.
  const otherRouteSnapshot = { ...consumerParticipant.snapshot, pathwayId: "misdemeanor_conviction" };
  db.sql(
    `update consumer_packet_verifications set verification_snapshot = ${sqlJson(otherRouteSnapshot)} where briefcase_item_id = '${CONSUMER_ITEM}'`
  );
  const routeMismatch = await refusal(CONSUMER_SESSION_VALUE);
  assert(
    routeMismatch.status === 403 && routeMismatch.code === "route_binding_mismatch",
    `consumer: a snapshot verifying another route refuses route_binding_mismatch (${routeMismatch.status} ${routeMismatch.code})`
  );
  db.sql(
    `update consumer_packet_verifications set verification_snapshot = ${sqlJson(consumerParticipant.snapshot)} where briefcase_item_id = '${CONSUMER_ITEM}'`
  );

  // 5. Restored, the same participant downloads their own packet, and the
  //    bytes are theirs rather than the sponsored lane's.
  const consumerContext = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, acceptDownloads: true
  });
  await consumerContext.addCookies([{ name: SESSION_COOKIE, value: CONSUMER_SESSION_VALUE, url: `http://127.0.0.1:${port}` }]);
  const consumerPage = await consumerContext.newPage();
  const consumerDownload = consumerPage.waitForEvent("download", { timeout: 15000 });
  await consumerPage.goto(consumerUrl).catch(() => {});
  const consumerFile = await consumerDownload;
  const consumerSaved = path.join(storageRoot, "consumer-download.pdf");
  await consumerFile.saveAs(consumerSaved);
  const consumerBytes = fs.readFileSync(consumerSaved);
  const consumerRow = jobRow(consumerJobId);
  assert(consumerBytes.subarray(0, 5).toString("latin1") === "%PDF-", "consumer: the browser received a PDF");
  assert(
    createHash("sha256").update(consumerBytes).digest("hex") === consumerRow.output_sha256,
    "consumer: the browser received the exact validated artifact bytes"
  );
  assert(/\.pdf$/.test(consumerFile.suggestedFilename()), `consumer: participant-facing filename (${consumerFile.suggestedFilename()})`);
  assert(jobRow(consumerJobId).status === "delivered", "consumer: the job is delivered");

  // 6. The mutation. Flipping the stored verification hash must turn this
  //    green case red, or the binding check above proves nothing; restoring
  //    it must bring the delivery back.
  db.sql(`update consumer_packet_verifications set verification_hash = '${rebound}' where briefcase_item_id = '${CONSUMER_ITEM}'`);
  const mutated = await refusal(CONSUMER_SESSION_VALUE);
  assert(
    mutated.status === 409 && mutated.code === "verification_binding_mismatch",
    `consumer: mutating the bound verification hash breaks delivery (${mutated.status} ${mutated.code})`
  );
  db.sql(`update consumer_packet_verifications set verification_hash = '${consumerParticipant.hash}' where briefcase_item_id = '${CONSUMER_ITEM}'`);
  const restored = consumerPage.waitForEvent("download", { timeout: 15000 });
  await consumerPage.goto(consumerUrl).catch(() => {});
  const restoredFile = await restored;
  const restoredPath = path.join(storageRoot, "consumer-restored.pdf");
  await restoredFile.saveAs(restoredPath);
  assert(fs.readFileSync(restoredPath).equals(consumerBytes), "consumer: restoring the bound hash restores delivery of the same artifact");

  // 7. Another authenticated participant may not reach this packet.
  const otherParticipant = await refusal(SESSION_VALUE);
  assert(
    otherParticipant.status === 403 && otherParticipant.code === "unauthorized",
    `consumer: a different participant is refused unauthorized (${otherParticipant.status} ${otherParticipant.code})`
  );
  await consumerContext.close();

  illinoisDelivery = await exerciseIllinoisDelivery({ db, deps: workerDeps, deliveryPorts, userId: USER_OWNER, partnerId: P1, personId: PERSON_A });
  for (const job of illinoisDelivery.jobs) {
    const received = page.waitForEvent("download", { timeout: 15000 });
    await page.goto(`http://127.0.0.1:${port}/api/rcap/packets/${job.jobId}/download`).catch(() => {});
    const download = await received;
    const target = path.join(storageRoot, `${job.kind}.pdf`);
    await download.saveAs(target);
    assert(fs.readFileSync(target).equals(illinoisDelivery.bytes), `Illinois ${job.kind}: mobile browser received the exact pinned fixture`);
  }
} catch (error) {
  // A later lane throwing used to discard everything the earlier ones had
  // already established, so a crash reported one stack trace and silently took
  // every collected assertion with it. Report what was proven before the
  // throw, then let the throw stand: a crash is still a failure.
  if (failures.length > 0) {
    console.error(`\nverify-rcap-packet-delivery-e2e: ${failures.length} assertion(s) had already failed before the error below:`);
    for (const failure of failures) console.error(` - ${failure}`);
  } else {
    console.error("\nverify-rcap-packet-delivery-e2e: every assertion reached before the error below passed.");
  }
  throw error;
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
