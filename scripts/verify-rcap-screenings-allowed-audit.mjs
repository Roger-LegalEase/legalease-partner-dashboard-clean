// Row-level evidence harness for the screenings_allowed correction
// (docs/RCAP_SCREENINGS_ALLOWED_AUDIT_PLAN.md) and the phase-50 packet
// accounting guarantees, run entirely against sanitized fixtures on an
// ephemeral PostgreSQL 16 cluster. No shared or remote database is reachable.
//
// Section A — audit / backfill / rollback mechanics, three schema variants:
//   V1 production-like: phase 41 absent (no overage columns), phase 42 applied.
//      Proves the cap-event-without-columns ambiguity clause refuses the row
//      even when an authority value AND a CAS operand are loaded for it.
//   V2 full: phases 41+42 applied. Proves overwrite detection, contract-drift
//      correction, CAS refusal of post-audit drift, exception reporting,
//      pre-image capture, rollback restoration, rollback CAS, idempotence,
//      and that packet capacity is seeded only from contract values.
//   V3 sink-blocked: phase 41 applied, phase 42 not. Proves the event-sink
//      probe marks mismatched rows ambiguous and the backfill refuses them,
//      and that partner_onboarding events were genuinely unrecordable there.
//
// Section B — phase-49/50/51 accounting scope, the zero_charge guard and the
// consumer payment gate:
//   B1 sponsored job with NO entitlement row      -> unauthorized, blocked,
//                                                    zero ledger rows
//   B2 sponsored job with only an EXPIRED row     -> unauthorized, blocked
//   B3a unsponsored, payment table absent         -> consumer_payment_required
//   B3b unsponsored, no briefcase item            -> consumer_payment_required
//   B3c unsponsored, unpaid / refunded / mispriced-> consumer_payment_required
//   B3d unsponsored, paid at 5000 cents           -> zero_charge, eligible,
//                                                    and no partner credit moves
//   B4 consumption unit == sha256(partner:entitlement:person:matter);
//      same matter twice -> already_consumed; new matter -> consumed
//   B5 direct 'consumed' ledger row without matter_id -> constraint violation
//   B6 sponsored enqueue without person/matter    -> identity check violation
//
// Emits a JSON evidence summary on success for the row-evidence report.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(rootDir, file), "utf8");

if (!ephemeralPgAvailable()) {
  console.error("verify-rcap-screenings-allowed-audit: PostgreSQL 16 is not available in this environment.");
  process.exit(1);
}

const failures = [];
const assert = (cond, message) => {
  if (!cond) failures.push(message);
};
const evidence = { fixture: true, variants: {}, accounting: {} };

const AUDIT_SQL = read("scripts/rcap-audit-screenings-allowed.sql");
const BACKFILL_SQL = read("scripts/rcap-backfill-screenings-allowed.sql");
const ROLLBACK_SQL = read("scripts/rcap-rollback-screenings-allowed.sql");
const READONLY_AUDIT_SQL = read("scripts/rcap-audit-screenings-allowed-readonly.sql");

// psql -A -t output mixes command tags with query output; the JSON block is
// everything between the first '[' and the last ']'.
function jsonBlock(raw) {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  return JSON.parse(raw.slice(start, end + 1));
}

const P = {
  clean: "0c1ea000-0000-4000-8000-000000000001",
  overwritten: "0c1ea000-0000-4000-8000-000000000002",
  analog: "0c1ea000-0000-4000-8000-000000000003",
  ambiguous: "0c1ea000-0000-4000-8000-000000000004",
  drift: "0c1ea000-0000-4000-8000-000000000005",
  legacy: "0c1ea000-0000-4000-8000-000000000006",
  sinkBlocked: "0c1ea000-0000-4000-8000-000000000007"
};

function bootAuditVariant({ phase41, phase42 }) {
  const db = startEphemeralPg();
  db.sql("create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;");
  db.sql("create schema if not exists auth;");
  db.sql("create table if not exists auth.users (id uuid primary key);");
  db.sql("create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;");
  db.applyFile(path.join(rootDir, "supabase/partner-journey-os.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-21-partner-auth-rls-foundation.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-28-rcap-record-audit-trail.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-32-expungement-screening-sessions.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-35-rcap-partner-entitlement.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-35b-rcap-screening-session-partner-mode.sql"));
  if (phase41) db.applyFile(path.join(rootDir, "supabase/phase-41-rcap-partner-access-codes.sql"));
  if (phase42) db.applyFile(path.join(rootDir, "supabase/phase-42-partner-onboarding.sql"));
  // Minimal FK targets so phases 49+50 (packet capacity home) apply.
  db.sql("create table if not exists public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null);");
  db.sql("create table if not exists public.rcap_document_packets (id uuid primary key default gen_random_uuid());");
  db.applyFile(path.join(rootDir, "supabase/phase-49-rcap-packet-render-jobs.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-50-rcap-packet-delivery-hardening.sql"));
  return db;
}

function seedPartner(db, id, slug, allowed, used) {
  db.sql(
    `insert into public.partner_records (id, partner_id, partner_slug, partner_name, program_tier) values ('${id}', 'pid-${slug}', '${slug}', 'Fixture ${slug}', 'standard')`
  );
  db.sql(
    `insert into public.partner_entitlement (partner_slug, screenings_allowed, screenings_used) values ('${slug}', ${allowed}, ${used})`
  );
}

function seedCapEvent(db, slug, packetCap) {
  db.sql(
    `insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, actor, metadata)
     values ('partner_onboarding', '${slug}', '${slug}', 'partner_packet_cap_configured', 'internal_admin',
             jsonb_build_object('packet_cap', ${packetCap}, 'overage_enabled', false, 'pause_at_cap', true))`
  );
}

function loadAuthority(db, rows) {
  db.sql(`create table if not exists public.rcap_audit_authority (
    partner_record_id uuid primary key,
    screening_allocation integer,
    screening_source text,
    packet_allocation integer,
    packet_source text,
    packet_overage_reserve integer not null default 0,
    audited_wrong_value integer
  )`);
  db.sql("delete from public.rcap_audit_authority");
  for (const r of rows) {
    db.sql(
      `insert into public.rcap_audit_authority values ('${r.id}', ${r.screening ?? "null"}, ${r.screeningSource ? `'${r.screeningSource}'` : "null"}, ${r.packet ?? "null"}, ${r.packetSource ? `'${r.packetSource}'` : "null"}, ${r.reserve ?? 0}, ${r.cas ?? "null"})`
    );
  }
}

const runAudit = (db) => jsonBlock(db.sql(AUDIT_SQL));
const byPartner = (rows) => Object.fromEntries(rows.map((r) => [r.partner_slug, r]));
const entRow = (db, slug) =>
  db.json(
    `select row_to_json(t) from (select screenings_allowed, screenings_used from partner_entitlement where partner_slug = '${slug}') t`
  );

try {
  // =========================================================================
  // Section A / V2 — full schema: detection, CAS, capture, rollback.
  // =========================================================================
  {
    const db = bootAuditVariant({ phase41: true, phase42: true });
    seedPartner(db, P.clean, "fixture-clean", 300, 10);
    seedPartner(db, P.overwritten, "fixture-overwritten", 100, 40);
    seedPartner(db, P.analog, "fixture-analog-1200", 1200, 60);
    seedPartner(db, P.ambiguous, "fixture-ambiguous", 50, 5);
    seedPartner(db, P.drift, "fixture-drift", 120, 8);
    seedCapEvent(db, "fixture-overwritten", 100);

    loadAuthority(db, [
      { id: P.clean, screening: 300, screeningSource: "contract-2026-01", packet: null },
      { id: P.overwritten, screening: 500, screeningSource: "contract-2026-02", packet: 100, packetSource: "signed contract", reserve: 0 },
      { id: P.analog, screening: 800, screeningSource: "resolved ruling", packet: 100, packetSource: "signed contract 100 + 10 reserve", reserve: 10 },
      { id: P.drift, screening: 400, screeningSource: "contract-2026-03", packet: null }
    ]);

    const audit1 = byPartner(runAudit(db));
    assert(audit1["fixture-overwritten"]?.overwrite_occurred === true, "V2: overwrite detected where phase-41 columns + cap event + equal value");
    assert(audit1["fixture-clean"]?.proposed_correction === "none", "V2: matching row proposes no change");
    assert(audit1["fixture-ambiguous"]?.unresolved_ambiguity === true, "V2: partner without authority row is ambiguous");
    assert(String(audit1["fixture-ambiguous"]?.proposed_correction).startsWith("exception"), "V2: ambiguous row proposes exception, not a value");
    assert(audit1["fixture-analog-1200"]?.unresolved_ambiguity === false && String(audit1["fixture-analog-1200"]?.proposed_correction).includes("non-defect drift"), "V2: 1200-analog is an unambiguous contract correction");
    assert(audit1["fixture-overwritten"]?.cas_operand === 100 && audit1["fixture-analog-1200"]?.cas_operand === 1200, "V2: audit emits the CAS operands");

    const affected = Object.values(audit1).filter((r) => r.proposed_correction !== "none" && !r.unresolved_ambiguity).length;
    const ambiguous = Object.values(audit1).filter((r) => r.unresolved_ambiguity).length;
    evidence.variants.V2 = { partners: Object.keys(audit1).length, affected, ambiguous };
    assert(affected === 3 && ambiguous === 1, `V2: expected 3 affected / 1 ambiguous, got ${affected}/${ambiguous}`);

    // The production observation variant: it must produce the same row facts
    // with NO authority table in the database, inside a read-only transaction.
    // This is the file that actually runs in Roger's window, so "it runs
    // read-only" has to be a test result rather than a claim.
    db.sql("drop table if exists public.rcap_audit_authority");
    const roRaw = db.sql(`begin; set transaction read only;\n${READONLY_AUDIT_SQL}\ncommit;`);
    const ro = byPartner(jsonBlock(roRaw));
    assert(Object.keys(ro).length === 5, `V2-ro: read-only audit returns every partner (got ${Object.keys(ro).length})`);
    assert(ro["fixture-overwritten"]?.overwrite_suspected === true, "V2-ro: overwrite still detected without an authority table");
    assert(ro["fixture-overwritten"]?.cas_operand === 100, "V2-ro: read-only audit emits the CAS operand");
    assert(
      ro["fixture-overwritten"]?.evidence_quality === "cap_event_recorded",
      `V2-ro: cap event recorded where the sink was available (got ${ro["fixture-overwritten"]?.evidence_quality})`
    );
    assert(
      db.scalar("select to_regclass('public.rcap_audit_authority') is null") === "t",
      "V2-ro: the read-only audit created nothing"
    );

    // Post-audit drift: the operator recorded cas=120, then the row changed.
    db.sql("update partner_entitlement set screenings_allowed = 90 where partner_slug = 'fixture-drift'");
    loadAuthority(db, [
      { id: P.clean, screening: 300, screeningSource: "contract-2026-01", packet: null, cas: audit1["fixture-clean"].cas_operand },
      { id: P.overwritten, screening: 500, screeningSource: "contract-2026-02", packet: 100, packetSource: "signed contract", reserve: 0, cas: audit1["fixture-overwritten"].cas_operand },
      { id: P.analog, screening: 800, screeningSource: "resolved ruling", packet: 100, packetSource: "signed contract 100 + 10 reserve", reserve: 10, cas: audit1["fixture-analog-1200"].cas_operand },
      { id: P.drift, screening: 400, screeningSource: "contract-2026-03", packet: null, cas: audit1["fixture-drift"].cas_operand }
    ]);

    const backfillOut = db.sql(`set rcap.backfill_batch_label = 'fixture-batch';\n${BACKFILL_SQL}`);
    const exceptions = Object.fromEntries(jsonBlock(backfillOut).map((r) => [r.partner_slug, r]));

    assert(entRow(db, "fixture-overwritten").screenings_allowed === 500, "V2: overwritten row restored to authoritative 500");
    assert(entRow(db, "fixture-analog-1200").screenings_allowed === 800, "V2: 1200-analog corrected to authoritative 800");
    assert(entRow(db, "fixture-drift").screenings_allowed === 90, "V2: drifted row refused by CAS and untouched");
    assert(entRow(db, "fixture-ambiguous").screenings_allowed === 50, "V2: ambiguous row untouched");
    assert(entRow(db, "fixture-clean").screenings_allowed === 300, "V2: already-correct row untouched");
    assert(
      entRow(db, "fixture-overwritten").screenings_used === 40 && entRow(db, "fixture-analog-1200").screenings_used === 60,
      "V2: screenings_used never modified"
    );
    assert(exceptions["fixture-drift"]?.disposition === "cas_refused_row_drifted_untouched", "V2: drift refusal reported");
    assert(exceptions["fixture-ambiguous"]?.disposition === "ambiguous_no_authoritative_value_untouched", "V2: ambiguity reported");

    const captured = db.json(
      "select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) from (select partner_slug, prev_screenings_allowed, new_screenings_allowed from rcap_audit_rollback_screenings_allowed where batch_label = 'fixture-batch' order by partner_slug) r"
    );
    assert(captured.length === 2, `V2: exactly the two corrected rows captured (got ${captured.length})`);
    assert(
      captured.some((r) => r.partner_slug === "fixture-overwritten" && r.prev_screenings_allowed === 100 && r.new_screenings_allowed === 500) &&
      captured.some((r) => r.partner_slug === "fixture-analog-1200" && r.prev_screenings_allowed === 1200 && r.new_screenings_allowed === 800),
      "V2: rollback capture holds exact pre-images"
    );

    // Packet capacity comes only from the contract values.
    const pkt = (id) =>
      db.json(
        `select coalesce(row_to_json(t), 'null'::json) from (select packet_cap, overage_enabled, overage_cap, pause_at_cap from partner_packet_entitlement where partner_id = '${id}' and expires_at is null) t`
      );
    assert(pkt(P.overwritten)?.packet_cap === 100 && pkt(P.overwritten)?.overage_enabled === false, "V2: packet cap seeded from contract (100)");
    assert(pkt(P.analog)?.packet_cap === 100 && pkt(P.analog)?.overage_cap === 10 && pkt(P.analog)?.overage_enabled === true, "V2: contract reserve 100+10 seeds overage_cap");
    assert(pkt(P.analog)?.pause_at_cap === true, "V2: seeded entitlement fails closed at cap");
    assert(pkt(P.clean) === null && pkt(P.drift) === null && pkt(P.ambiguous) === null, "V2: no packet row without an authoritative packet value");
    assert(
      db.scalar("select count(*) from partner_packet_entitlement where packet_cap in (300, 500, 800, 1200, 90, 50)") === "0",
      "V2: packet capacity never inferred from screenings_allowed"
    );

    // Idempotence: a second run changes nothing and captures nothing new.
    db.sql(`set rcap.backfill_batch_label = 'fixture-batch-2';\n${BACKFILL_SQL}`);
    assert(
      db.scalar("select count(*) from rcap_audit_rollback_screenings_allowed") === "2",
      "V2: second backfill run captures nothing (converged)"
    );

    const audit2 = byPartner(runAudit(db));
    assert(audit2["fixture-overwritten"].proposed_correction === "none" && audit2["fixture-analog-1200"].proposed_correction === "none", "V2: re-audit shows corrected rows clean");

    // Rollback: one row edited after the backfill is CAS-refused; the other restores.
    db.sql("update partner_entitlement set screenings_allowed = 999 where partner_slug = 'fixture-overwritten'");
    const rollbackOut = db.sql(`set rcap.backfill_batch_label = 'fixture-batch';\n${ROLLBACK_SQL}`);
    const rb = Object.fromEntries(jsonBlock(rollbackOut).map((r) => [r.partner_slug, r]));
    assert(entRow(db, "fixture-analog-1200").screenings_allowed === 1200, "V2: rollback restores the exact pre-image (1200)");
    assert(entRow(db, "fixture-overwritten").screenings_allowed === 999, "V2: rollback CAS refuses a row edited after the backfill");
    assert(rb["fixture-analog-1200"]?.disposition === "restored", "V2: rollback reports the restoration");
    assert(rb["fixture-overwritten"]?.disposition === "cas_refused_row_changed_after_backfill_untouched", "V2: rollback reports the refusal");

    // Rollback without a batch label must refuse to run.
    const noLabel = db.sqlExpectError(ROLLBACK_SQL);
    assert(noLabel.includes("backfill_batch_label"), "V2: rollback demands an explicit batch label");
    db.stop();
  }

  // =========================================================================
  // Section A / V1 — production-like (no phase-41 columns): the ambiguity
  // clause refuses the eventful row even with authority + CAS operand loaded.
  // =========================================================================
  {
    const db = bootAuditVariant({ phase41: false, phase42: true });
    seedPartner(db, P.legacy, "fixture-eventful-legacy", 100, 12);
    seedPartner(db, P.clean, "fixture-clean", 300, 10);
    seedCapEvent(db, "fixture-eventful-legacy", 100);

    loadAuthority(db, [
      { id: P.legacy, screening: 500, screeningSource: "contract", packet: 100, packetSource: "contract", cas: 100 },
      { id: P.clean, screening: 300, screeningSource: "contract", cas: 300 }
    ]);

    const audit = byPartner(runAudit(db));
    assert(audit["fixture-eventful-legacy"]?.phase41_columns_present === false, "V1: phase-41 columns reported absent");
    assert(audit["fixture-eventful-legacy"]?.overwrite_occurred === false, "V1: overwrite impossible without phase-41 columns");
    assert(audit["fixture-eventful-legacy"]?.unresolved_ambiguity === true, "V1: cap event + equal value without columns is ambiguous");
    evidence.variants.V1 = {
      partners: Object.keys(audit).length,
      affected: Object.values(audit).filter((r) => r.proposed_correction !== "none" && !r.unresolved_ambiguity).length,
      ambiguous: Object.values(audit).filter((r) => r.unresolved_ambiguity).length
    };

    db.sql(`set rcap.backfill_batch_label = 'v1-batch';\n${BACKFILL_SQL}`);
    assert(entRow(db, "fixture-eventful-legacy").screenings_allowed === 100, "V1: ambiguous row untouched even with authority + CAS operand loaded (structural exclusion)");
    assert(db.scalar("select count(*) from rcap_audit_rollback_screenings_allowed where batch_label = 'v1-batch'") === "0", "V1: nothing captured because nothing changed");
    db.stop();
  }

  // =========================================================================
  // Section A / V3 — phase 41 applied, phase 42 not: the event sink refuses
  // partner_onboarding rows, so absence of events proves nothing and the
  // mismatched row is ambiguous.
  // =========================================================================
  {
    const db = bootAuditVariant({ phase41: true, phase42: false });
    seedPartner(db, P.sinkBlocked, "fixture-sink-blocked", 100, 3);

    const sinkErr = db.sqlExpectError(
      `insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, actor, metadata)
       values ('partner_onboarding', 'fixture-sink-blocked', 'fixture-sink-blocked', 'partner_packet_cap_configured', 'internal_admin', '{}')`
    );
    assert(sinkErr.includes("record_type"), "V3: partner_onboarding events are genuinely unrecordable pre-phase-42");

    loadAuthority(db, [{ id: P.sinkBlocked, screening: 500, screeningSource: "contract", cas: 100 }]);
    const audit = byPartner(runAudit(db));
    assert(audit["fixture-sink-blocked"]?.record_event_sink_admits_partner_onboarding === false, "V3: sink probe reports partner_onboarding not admitted");
    assert(audit["fixture-sink-blocked"]?.unresolved_ambiguity === true, "V3: mismatch with unavailable sink is ambiguous");
    evidence.variants.V3 = { partners: 1, affected: 0, ambiguous: 1 };

    db.sql(`set rcap.backfill_batch_label = 'v3-batch';\n${BACKFILL_SQL}`);
    assert(entRow(db, "fixture-sink-blocked").screenings_allowed === 100, "V3: sink-ambiguous row untouched by backfill");
    db.stop();
  }

  // =========================================================================
  // Section B — phase-49/50 accounting scope and the zero_charge guard.
  // =========================================================================
  {
    const db = startEphemeralPg();
    db.sql("create role service_role nologin bypassrls");
    db.sql("alter default privileges in schema public grant all on tables to service_role");
    db.sql("create table public.partner_records (id uuid primary key, partner_slug text unique not null)");
    db.sql("create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)");
    db.sql("create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())");
    db.applyFile(path.join(rootDir, "supabase/phase-49-rcap-packet-render-jobs.sql"));
    db.applyFile(path.join(rootDir, "supabase/phase-50-rcap-packet-delivery-hardening.sql"));
    // consumer_briefcase_items is deliberately NOT created yet: B3a proves the
    // payment probe fails closed on a schema that does not carry it.
    db.applyFile(path.join(rootDir, "supabase/phase-51-rcap-consumer-payment-gate.sql"));

    db.applyFile(path.join(rootDir, "supabase/phase-52-rcap-consumer-payment-authority.sql"));
    const SP1 = "b1000000-0000-4000-8000-000000000001"; // no entitlement
    const SP2 = "b1000000-0000-4000-8000-000000000002"; // expired entitlement
    const SP3 = "b1000000-0000-4000-8000-000000000003"; // active entitlement
    const PERSON = "b2000000-0000-4000-8000-000000000001";
    db.sql(`insert into partner_records values ('${SP1}','fx-no-ent'), ('${SP2}','fx-expired-ent'), ('${SP3}','fx-active-ent')`);
    db.sql(`insert into rcap_persons values ('${PERSON}','fx-active-ent','p')`);
    db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap, effective_at, expires_at) values ('${SP2}', 50, now() - interval '2 years', now() - interval '1 year')`);
    const entId = db.scalar(`with r as (insert into partner_packet_entitlement (partner_id, packet_cap) values ('${SP3}', 5) returning id) select id from r`);

    let seq = 0;
    const enqueue = (partner, person, matter) => {
      seq += 1;
      const hash = createHash("sha256").update(`evidence-${seq}`).digest("hex");
      const packet = db.scalar("with r as (insert into rcap_document_packets default values returning id) select id from r");
      return db.scalar(
        `select id from enqueue_packet_render_job('${packet}', 'MS:misdemeanor_conviction', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${hash}', null, ${partner ? `'${partner}'` : "null"}, ${person ? `'${person}'` : "null"}, ${matter ? `'${matter}'` : "null"}, 5)`
      );
    };
    // Phase 52 requirement 4: a consumer job binds item, consumer, person and
    // matter. Each call gets its own matter so one payment is never asked to
    // authorize two of them by accident.
    const enqueueConsumer = (briefcaseItemId, owner = null) => {
      seq += 1;
      const hash = createHash("sha256").update(`evidence-${seq}`).digest("hex");
      const packet = db.scalar("with r as (insert into rcap_document_packets default values returning id) select id from r");
      const matter = `b6000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
      const id = db.scalar(
        `select id from enqueue_packet_render_job('${packet}', 'MS:misdemeanor_conviction', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${hash}', '${briefcaseItemId}', null, null, '${matter}', 5)`
      ).trim();
      if (owner) {
        db.sql(`update packet_render_jobs
                   set consumer_briefcase_item_id = '${briefcaseItemId}', consumer_auth_user_id = '${owner}'
                 where id = '${id}'`);
      }
      return id;
    };
    const driveToValidating = (jobId) => {
      const c = db.json(`select row_to_json(t) from (select id, fencing_token from claim_packet_render_job('w-evidence', null, 120)) t`);
      if (!c || c.id !== jobId) throw new Error(`expected to claim ${jobId}, got ${c?.id}`);
      db.scalar(`select start_packet_render('${jobId}', '${c.fencing_token}')`);
      db.scalar(`select start_packet_validation('${jobId}', '${c.fencing_token}')`);
      return c.fencing_token;
    };
    const SHA_A = "a".repeat(64);
    const SHA_B = "b".repeat(64);
    const finalize = (jobId, token) =>
      db.json(
        `select row_to_json(t) from (select * from finalize_packet_render_job('${jobId}', '${token}', 'packet-artifacts/fx/${jobId}/${SHA_A}.pdf', '${SHA_A}', '${SHA_B}', '${SHA_A}', '${SHA_B}', 1000, 3, 'sha256:evidence')) t`
      );
    const ledgerRows = (jobId) =>
      Number(db.scalar(`select count(*) from packet_credit_ledger where render_job_id = '${jobId}'`));

    // B1: sponsored, entitlement missing entirely.
    const M1 = "b3000000-0000-4000-8000-000000000001";
    const j1 = enqueue(SP1, PERSON, M1);
    const f1 = finalize(j1, driveToValidating(j1));
    assert(f1.accounting_result === "unauthorized", "B1: missing entitlement yields unauthorized, not zero_charge");
    assert(f1.delivery_eligibility === "accounting_blocked", "B1: missing entitlement blocks delivery");
    assert(ledgerRows(j1) === 0, "B1: no ledger row of any kind without an entitlement");
    const d1 = db.sqlExpectError(`select record_packet_delivery_event('${j1}', 'delivery_authorized', null)`);
    assert(d1.includes("not delivery-eligible"), "B1: delivery event refused for the blocked job");

    // B2: sponsored, only an expired entitlement period.
    const M2 = "b3000000-0000-4000-8000-000000000002";
    const j2 = enqueue(SP2, PERSON, M2);
    const f2 = finalize(j2, driveToValidating(j2));
    assert(f2.accounting_result === "unauthorized" && f2.delivery_eligibility === "accounting_blocked", "B2: expired entitlement yields unauthorized/blocked");
    assert(ledgerRows(j2) === 0, "B2: expired entitlement writes no ledger row");

    // B3a: unsponsored, carrying a briefcase item id, on a schema where the
    // payment table does not exist. "Cannot prove payment" must read as
    // blocked — not as an error, and not as a pass. The id must be non-null
    // here or the probe's null check short-circuits and this case would prove
    // nothing about the absent-table path.
    const j3a = enqueueConsumer("b4000000-0000-4000-8000-000000000009");
    const f3a = finalize(j3a, driveToValidating(j3a));
    assert(
      f3a.accounting_result === "consumer_payment_required" && f3a.delivery_eligibility === "accounting_blocked",
      "B3a: unsponsored job is blocked when payment cannot be proven"
    );
    assert(ledgerRows(j3a) === 0, "B3a: a payment-blocked job writes no ledger row of any kind");
    const d3a = db.sqlExpectError(`select record_packet_delivery_event('${j3a}', 'delivery_authorized', null)`);
    assert(d3a.includes("not delivery-eligible"), "B3a: delivery event refused for the payment-blocked job");

    // The consumer payment record as phases 26/27 define it. The real table
    // references auth.users, which an ephemeral cluster has no reason to carry;
    // the columns the gate reads are what matters.
    // Phase 52 widened "paid": the row must also name its owner, the currency
    // and the server-written provider evidence, and the job must be bound to
    // that same owner. BC(2) therefore carries a full authority record; every
    // other row stays short of it and is expected to remain blocked.
    db.sql(`create table public.consumer_briefcase_items (
              id uuid primary key,
              user_id uuid,
              payment_status text not null default 'not_applicable',
              amount_cents integer,
              currency text,
              provider_event_id text,
              payment_authority text,
              payment_recorded_at timestamptz
            )`);
    const BC = (n) => `b4000000-0000-4000-8000-00000000000${n}`;
    const BC_OWNER = "b5000000-0000-4000-8000-00000000000a";
    db.sql(`insert into consumer_briefcase_items
              (id, user_id, payment_status, amount_cents, currency, provider_event_id, payment_authority, payment_recorded_at)
            values
              ('${BC(1)}', '${BC_OWNER}', 'unpaid', 5000, null, null, null, null),
              ('${BC(2)}', '${BC_OWNER}', 'paid', 5000, 'usd', 'evt_b3d', 'server_webhook', now()),
              ('${BC(3)}', '${BC_OWNER}', 'refunded', 5000, 'usd', 'evt_b3c3', 'server_webhook', now()),
              ('${BC(4)}', '${BC_OWNER}', 'paid', 2500, 'usd', 'evt_b3c4', 'server_webhook', now()),
              ('${BC(5)}', '${BC_OWNER}', 'not_applicable', null, null, null, null, null)`);

    // B3b: unsponsored with no briefcase item at all.
    const j3b = enqueue(null, null, null);
    const f3b = finalize(j3b, driveToValidating(j3b));
    assert(
      f3b.accounting_result === "consumer_payment_required" && f3b.delivery_eligibility === "accounting_blocked",
      "B3b: unsponsored job without a briefcase item is non-deliverable"
    );
    assert(ledgerRows(j3b) === 0, "B3b: no ledger row without a payment");

    // B3c: every non-paying state is blocked — including a paid-but-mispriced
    // checkout, so a partial capture cannot open delivery.
    for (const [n, label] of [[1, "unpaid"], [3, "refunded"], [4, "paid at 2500 cents"], [5, "not_applicable"]]) {
      const job = enqueueConsumer(BC(n), BC_OWNER);
      const fin = finalize(job, driveToValidating(job));
      assert(
        fin.accounting_result === "consumer_payment_required" && fin.delivery_eligibility === "accounting_blocked",
        `B3c: ${label} is non-deliverable`
      );
      assert(ledgerRows(job) === 0, `B3c: ${label} writes no ledger row`);
    }

    // B3d: paid at the product price — deliverable, and it costs no partner
    // anything. zero_charge is reachable only on this side of the gate.
    const partnerLedgerBefore = db.scalar("select count(*) from packet_credit_ledger where partner_id is not null");
    const j3d = enqueueConsumer(BC(2), BC_OWNER);
    const f3d = finalize(j3d, driveToValidating(j3d));
    assert(
      f3d.accounting_result === "zero_charge" && f3d.delivery_eligibility === "eligible",
      "B3d: a paid consumer packet is zero_charge and deliverable"
    );
    assert(
      db.scalar(`select count(*) from packet_credit_ledger where render_job_id = '${j3d}' and event_type = 'zero_charge' and partner_id is null and entitlement_id is null`) === "1",
      "B3d: the zero_charge row carries no partner and no entitlement"
    );
    assert(
      db.scalar("select count(*) from packet_credit_ledger where partner_id is not null") === partnerLedgerBefore,
      "B3d: a paid consumer packet consumes no partner packet credit"
    );
    assert(
      db.scalar("select count(*) from packet_credit_ledger where event_type = 'zero_charge' and partner_id is not null") === "0",
      "B3d: invariant — no zero_charge row is partner-attributed"
    );

    // B4: consumption unit scope = partner : entitlement : person : matter.
    const M4 = "b3000000-0000-4000-8000-000000000004";
    const j4 = enqueue(SP3, PERSON, M4);
    const f4 = finalize(j4, driveToValidating(j4));
    assert(f4.accounting_result === "consumed", "B4: active entitlement consumes one credit");
    const expectedHash = createHash("sha256").update(`${SP3}:${entId}:${PERSON}:${M4}`).digest("hex");
    assert(f4.consumption_unit_hash === expectedHash, "B4: unit hash is sha256(partner_id:entitlement_id:person_id:matter_id)");

    const j5 = enqueue(SP3, PERSON, M4); // same person + matter, new packet
    const f5 = finalize(j5, driveToValidating(j5));
    assert(f5.accounting_result === "already_consumed" && ledgerRows(j5) === 0, "B4: same matter never consumes twice");

    const M6 = "b3000000-0000-4000-8000-000000000006";
    const j6 = enqueue(SP3, PERSON, M6); // new matter
    const f6 = finalize(j6, driveToValidating(j6));
    assert(f6.accounting_result === "consumed", "B4: a new matter is a new consumption unit");
    assert(
      db.scalar(`select consumed_units::text from packet_entitlement_balance('${entId}')`) === "2",
      "B4: balance counts exactly the two consumed units"
    );

    // B5a: without the finalize authority, even a superuser's direct write is
    // refused by the guard trigger before any constraint is reached.
    const b5a = db.sqlExpectError(
      `insert into packet_credit_ledger (entitlement_id, partner_id, person_id, matter_id, render_job_id, event_type, consumption_unit_hash)
       values ('${entId}', '${SP3}', '${PERSON}', null, '${j4}', 'consumed', '${"e".repeat(64)}')`
    );
    assert(b5a.includes("appended only by finalize_packet_render_job"), "B5a: guard trigger refuses direct ledger writes");

    // B5b: with the authority forged, the identity constraint still rejects a
    // consuming row that lacks matter_id — the scope key is structural.
    const b5b = db.sqlExpectError(
      `set rcap.packet_mutation_authority = 'finalize_packet_render_job';
       insert into packet_credit_ledger (entitlement_id, partner_id, person_id, matter_id, render_job_id, event_type, consumption_unit_hash)
       values ('${entId}', '${SP3}', '${PERSON}', null, '${j4}', 'consumed', '${"e".repeat(64)}')`
    );
    assert(b5b.includes("packet_credit_ledger_consuming_identity_check"), "B5b: consuming ledger row without matter_id violates the identity constraint");

    // B6: a sponsored job cannot even be enqueued without person + matter.
    const b6 = db.sqlExpectError(
      `select id from enqueue_packet_render_job((select id from rcap_document_packets limit 1), 'MS:x', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${"f".repeat(64)}', null, '${SP3}', null, null, 5)`
    );
    assert(b6.includes("packet_render_jobs_partner_identity_check"), "B6: sponsored enqueue without person/matter violates the identity constraint");

    evidence.accounting = {
      missing_entitlement: f1.accounting_result,
      expired_entitlement: f2.accounting_result,
      consumer_no_payment_proof: f3a.accounting_result,
      consumer_unpaid_or_refunded: "consumer_payment_required",
      consumer_paid: f3d.accounting_result,
      unit_hash_parity: f4.consumption_unit_hash === expectedHash,
      same_matter_retry: f5.accounting_result,
      new_matter: f6.accounting_result
    };
    db.stop();
  }
} catch (error) {
  failures.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
}

if (failures.length) {
  console.error("verify-rcap-screenings-allowed-audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("verify-rcap-screenings-allowed-audit passed.");
console.log("Audit: overwrite detection, CAS operands and ambiguity classification hold on all three schema variants.");
console.log("Backfill: only unambiguous CAS-matched rows change; ambiguous and drifted rows are structurally refused and reported.");
console.log("Rollback: exact pre-images restore, post-backfill edits are CAS-refused, and a batch label is mandatory.");
console.log("Accounting: unit = sha256(partner:entitlement:person:matter); missing/expired entitlements yield unauthorized, never zero_charge.");
console.log("Consumer gate: an unsponsored packet delivers only on a paid briefcase item at 5000 cents; zero_charge is reachable only past that gate.");
console.log(JSON.stringify({ evidence }, null, 2));
