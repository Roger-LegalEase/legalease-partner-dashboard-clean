#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(root, "supabase/migrations/20260827120000_consumer_packet_verification_cas.sql");
const routePath = path.join(root, "src/app/api/expungement-ai/screening/pending/claim/route.ts");
const packetInformationRoutePath = path.join(root, "src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts");
const packetInformationPath = path.join(root, "src/lib/expungement-ai/packet-information.ts");
const packagePath = path.join(root, "package.json");
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
const route = fs.readFileSync(routePath, "utf8");
const packetInformationRoute = fs.readFileSync(packetInformationRoutePath, "utf8");
const packetInformation = fs.readFileSync(packetInformationPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

function includes(source, needle, message = `missing ${needle}`) {
  assert.ok(source.includes(needle), message);
}

assert.ok(migration.length > 0, "the forward-only verification CAS migration must exist");
includes(migration, "begin;");
includes(migration, "commit;");
includes(migration, "alter table public.consumer_briefcase_items");
includes(migration, "packet_verification_revision");
includes(migration, "packet_verification_hash");
includes(migration, "packet_draft_hash");
includes(migration, "packet_checkout_verification_hash");
includes(migration, "packet_payment_verification_hash");
includes(migration, "packet_artifact_json");
includes(migration, "packet_artifact_revision");

for (const signature of [
  "initialize_consumer_packet_verification(",
  "get_consumer_packet_verification_authority(",
  "persist_consumer_packet_verification(",
  "get_consumer_packet_artifact_authority(",
  "get_consumer_briefcase_presentation_source(",
  "bind_consumer_checkout_verification(",
  "record_consumer_packet_payment(",
  "attach_consumer_packet_artifact_if_verified(",
  "enqueue_verified_consumer_packet_render(",
  "finalize_sponsored_packet_generation_if_verified("
]) includes(migration, signature, `missing exact application RPC ${signature}`);

for (const parameter of [
  "p_expected_prior_hash",
  "p_expected_prior_revision",
  "p_expected_verification_hash",
  "p_render_packet",
  "p_render_input_payload",
  "p_packet_artifact"
]) includes(migration, parameter);

includes(migration, "for update", "CAS boundaries must lock the authoritative row");
includes(migration, "is distinct from p_expected_prior_revision", "revision CAS must refuse stale writers");
includes(migration, "is distinct from p_expected_prior_hash", "hash CAS must refuse stale writers");
includes(migration, "packet_verification_status = 'verified'", "commerce requires a successful current verification");
includes(migration, "packet_checkout_verification_hash", "payment must bind the exact checkout verification");
includes(migration, "rcap:consumer-person:v1:", "fresh checkout binding must independently validate the canonical consumer person");
includes(migration, "consumer_matter_id_for_briefcase_item", "fresh checkout binding must independently validate the deterministic matter");
includes(migration, "record_partner_packet_generation", "sponsored finalization must reuse the canonical included/overage writer");
includes(migration, "record_partner_packet_generation(uuid,timestamptz) from public, anon, authenticated, service_role", "generic sponsored credit consumption must be private to the atomic finalizer");
includes(migration, "enqueue_packet_render_job", "verified enqueue must reuse the canonical durable queue writer");
includes(migration, "packet_verification_invalidate_on_fact_change", "relevant out-of-band fact changes must invalidate verification");
includes(migration, "new.id is distinct from old.id", "out-of-band primary identity changes must invalidate protected authority");
includes(migration, "packet_render_payload_immutable", "render payloads must become immutable with the job");
includes(migration, "packet_render_jobs_current_verification_finalize_guard", "paid render finalization must re-lock current verification");
includes(migration, "'id','user_id','created_at'", "participant identity and creation columns must remain protected");
includes(migration, "revoke truncate on public.consumer_briefcase_items", "participant roles must not truncate Briefcase authority");
includes(migration, "revoke insert (\n  id,user_id,created_at", "every inherited identity column grant must be revoked explicitly");
includes(migration, "from public.screening_sessions s", "partner initialization must bind the shared screening source");
assert.ok(/from public\.screening_sessions s[\s\S]{0,500}for update/.test(migration),
  "partner initialization must serialize on the shared screening-session source before ambiguity checking");
includes(migration, "record_consumer_packet_payment_phase55", "the old payment writer may exist only under a private implementation name");
includes(migration, "consumer jobs require enqueue_verified_consumer_packet_render", "the old enqueue surface must reject consumer-bound jobs");

includes(migration, "from public, anon, authenticated", "RPC and protected-column privileges must be revoked from every browser role");
includes(migration, "to service_role", "only service_role may execute the protected RPCs");

assert.ok(!/update\s+public\.consumer_briefcase_items[\s\S]{0,500}artifact_refs_json\s*->/i.test(migration),
  "legacy participant JSON must never be backfilled into protected authority");
assert.ok(!/insert\s+into\s+public\.consumer_briefcase_items/i.test(migration),
  "the additive migration must not manufacture Briefcase rows");
assert.ok(!/create\s+table/i.test(migration), "the smallest migration adds no new table");
includes(packetInformation, "JSON.stringify(canonicalize(snapshot))", "application verification hashing must recursively sort JSON like PostgreSQL");
const alteredTables = [...migration.matchAll(/alter table public\.([a-z0-9_]+)/g)].map((match) => match[1]);
assert.deepEqual([...new Set(alteredTables)].sort(), ["consumer_briefcase_items", "packet_render_jobs"],
  "the migration may alter only the existing Briefcase authority and durable render queue");

includes(route, "initializeProtectedPacketVerification", "missing protected-source initialization write");
includes(route, "protectedPacketDraftSeedFromAuthoritative", "missing server-side protected draft derivation");
includes(route, "pendingId: data.pending_id", "initialization must bind the exact claimed pending source");
includes(route, "sourceMatterId: data.matter_id", "initialization must bind the exact screening matter");
includes(route, "if (!data.claimed_user_id && new Date(data.expires_at).getTime() <= Date.now())", "only an exact already-claimed legacy retry may outlive the anonymous replay TTL");
assert.ok(
  route.indexOf("await createClinicReviewFollowUpForSavedMatter({")
    < route.indexOf("const initialized = await initializeProtectedPacketVerification({"),
  "required Clinic follow-up must succeed before atomic protected initialization claims the source"
);
assert.ok(!/protectedPacketDraftSeedFromAuthoritative\([\s\S]{0,400}artifactRefs/.test(route),
  "initial protected state must not derive from participant artifact_refs_json");
assert.ok(
  packetInformationRoute.indexOf("const checkoutCompensation = await expireRetainedConsumerCheckoutIfUnbound({")
    > packetInformationRoute.indexOf("const saved = await persistProtectedPacketVerification({"),
  "a successful fact CAS must retry stale retained-Checkout expiration"
);
includes(packetInformationRoute, 'error: "stale_checkout_expiration_pending"', "failed provider compensation must request a retry");

includes(packageJson.scripts.test, "verify-consumer-packet-verification-cas-migration.mjs", "the repository chain must include the static CAS verifier");
includes(packageJson.scripts.test, "verify-consumer-packet-verification-cas-postgres.mjs", "the repository chain must include the isolated PostgreSQL CAS verifier");

console.log("consumer packet verification CAS static contract passed");
