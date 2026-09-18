#!/usr/bin/env node
/**
 * The delivery e2e's schema, as a projection of production authority.
 *
 * `verify-rcap-packet-delivery-e2e.mjs` builds a deliberately small database:
 * it exercises the delivery gate, not the product, and loading the real
 * migration graph pulls in the document generator, pending screening results
 * and the atomic-claim chain before it reaches anything this test asks about.
 * Four migrations deep the cascade was still going.
 *
 * So the objects the delivery contract needs are declared here instead —
 * copied from the migrations that own them, not invented. That is only safe
 * while the copy stays honest, which is what `assertNoDriftFromMigrations`
 * is for: it reads the authoritative files and fails if the definitions this
 * fixture mirrors have moved. A fixture that silently diverges from the schema
 * it projects would let this e2e prove a contract Production no longer has.
 *
 * This is a projection of production authority. It is not an authority.
 */

import fs from "node:fs";
import path from "node:path";

/** The migrations these objects are copied from, and what is taken from each. */
export const SOURCES = {
  consumerLaunchRails: {
    file: "supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql",
    takes: ["public.consumer_packet_verifications", "packet_render_jobs.consumer_verification_hash"]
  },
  sponsoredRouteRender: {
    file: "supabase/migrations/20260906120000_sponsored_route_render_transaction.sql",
    takes: ["public.sponsored_packet_render_routes", "packet_render_jobs sponsored binding columns"]
  }
};

/**
 * Fragments that must still appear, verbatim, in the migration that owns them.
 *
 * Each one is a line this fixture reproduces. They are matched after
 * whitespace normalisation so reformatting does not raise a false alarm, but a
 * changed column, type or constraint does.
 */
const MIRRORED = [
  // consumer_packet_verifications — the current-verification storage shape the
  // delivery gate reads through ports.getCurrentVerification.
  ["consumerLaunchRails", "create table if not exists public.consumer_packet_verifications ("],
  ["consumerLaunchRails", "briefcase_item_id uuid primary key"],
  ["consumerLaunchRails", "consumer_auth_user_id uuid not null,"],
  ["consumerLaunchRails", "matter_id uuid not null,"],
  ["consumerLaunchRails", "status text not null check (status in ('unverified', 'verified', 'invalidated')),"],
  ["consumerLaunchRails", "verification_hash text check (verification_hash is null or verification_hash ~ '^[a-f0-9]{64}$'),"],
  ["consumerLaunchRails", "verification_snapshot jsonb,"],
  ["consumerLaunchRails", "draft_hash text not null check (draft_hash ~ '^[a-f0-9]{64}$'),"],
  ["consumerLaunchRails", "draft_snapshot jsonb not null,"],
  ["consumerLaunchRails", "revision integer not null check (revision >= 0),"],
  // The consumer job binding the gate compares a current verification against.
  ["consumerLaunchRails", "add column if not exists consumer_verification_hash text"],
  // The sponsored binding the partner branch requires.
  ["sponsoredRouteRender", "create table if not exists public.sponsored_packet_render_routes ("],
  ["sponsoredRouteRender", "route_key text primary key,"],
  ["sponsoredRouteRender", "add column if not exists sponsored_route_key text"],
  ["sponsoredRouteRender", "references public.sponsored_packet_render_routes(route_key),"],
  ["sponsoredRouteRender", "add column if not exists sponsored_session_id uuid,"],
  ["sponsoredRouteRender", "add column if not exists sponsored_clinic_event_id uuid,"],
  ["sponsoredRouteRender", "add column if not exists sponsored_consumer_briefcase_item_id uuid,"],
  ["sponsoredRouteRender", "add column if not exists sponsored_consumer_auth_user_id uuid,"],
  ["sponsoredRouteRender", "add column if not exists sponsored_verification_hash text;"],
  ["sponsoredRouteRender", "check (sponsored_verification_hash is null or sponsored_verification_hash ~ '^[a-f0-9]{64}$')"]
];

const squash = (text) => text.replace(/\s+/g, " ").trim();

/**
 * Fail if the fixture no longer matches what the migrations say.
 *
 * Returns the number of mirrored definitions confirmed, so a caller can assert
 * the check itself did not quietly stop checking.
 */
export function assertNoDriftFromMigrations(rootDir, fail) {
  const cache = new Map();
  for (const [sourceKey, fragment] of MIRRORED) {
    const source = SOURCES[sourceKey];
    if (!cache.has(sourceKey)) {
      const file = path.join(rootDir, source.file);
      if (!fs.existsSync(file)) {
        fail(`the delivery schema fixture cites ${source.file}, which does not exist`);
        cache.set(sourceKey, "");
        continue;
      }
      cache.set(sourceKey, squash(fs.readFileSync(file, "utf8")));
    }
    if (!cache.get(sourceKey).includes(squash(fragment))) {
      fail(
        `the delivery schema fixture has drifted from ${source.file}: it mirrors `
        + `"${fragment}", which that migration no longer contains. Update `
        + `scripts/lib/rcap-delivery-schema-fixture.mjs to match production before trusting this e2e.`
      );
    }
  }
  return MIRRORED.length;
}

/**
 * Install the projected objects.
 *
 * Applied after the phase files the harness already loads, because these
 * extend `packet_render_jobs` and reference `consumer_briefcase_items`.
 */
export function applyConsumerDeliverySchema(db) {
  // Supabase supplies auth.role() to the policies these definitions assume.
  db.sql(`create function auth.role() returns text language sql stable as $$ select ''::text $$`);

  db.sql(`create table public.consumer_packet_verifications (
    briefcase_item_id uuid primary key
      references public.consumer_briefcase_items(id) on delete cascade,
    consumer_auth_user_id uuid not null,
    matter_id uuid not null,
    status text not null check (status in ('unverified', 'verified', 'invalidated')),
    reason text not null check (nullif(trim(reason), '') is not null),
    verification_hash text check (verification_hash is null or verification_hash ~ '^[a-f0-9]{64}$'),
    verification_snapshot jsonb,
    draft_hash text not null check (draft_hash ~ '^[a-f0-9]{64}$'),
    draft_snapshot jsonb not null,
    revision integer not null check (revision >= 0),
    invalidated_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);

  db.sql(`alter table public.packet_render_jobs
    add column if not exists consumer_verification_hash text`);

  db.sql(`create table public.sponsored_packet_render_routes (
    route_key text primary key,
    jurisdiction text not null,
    pathway_id text not null,
    registry_track_id text,
    packet_family_id text not null
  )`);

  db.sql(`alter table public.packet_render_jobs
    add column if not exists sponsored_route_key text
      references public.sponsored_packet_render_routes(route_key),
    add column if not exists sponsored_session_id uuid,
    add column if not exists sponsored_clinic_event_id uuid,
    add column if not exists sponsored_consumer_briefcase_item_id uuid,
    add column if not exists sponsored_consumer_auth_user_id uuid,
    add column if not exists sponsored_verification_hash text`);

  db.sql(`alter table public.packet_render_jobs
    add constraint packet_render_jobs_sponsored_verification_hash_check
      check (sponsored_verification_hash is null or sponsored_verification_hash ~ '^[a-f0-9]{64}$')`);
}
