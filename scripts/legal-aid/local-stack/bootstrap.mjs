// Builds the isolated PGlite database the local stack runs against: the
// authentication and product stubs the Clinic Mode migrations depend on, the
// Clinic Mode and Legal Aid migrations verbatim from supabase/migrations, and
// a synthetic MVLP tenant. No real person, event, or record is used.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "../../../node_modules/@electric-sql/pglite/dist/index.cjs";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export const MIGRATIONS = [
  "supabase/migrations/20260825120000_clinic_mode_core.sql",
  "supabase/migrations/20260825121000_clinic_mode_security.sql",
  "supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql",
  "supabase/migrations/20260903120000_clinic_event_jurisdiction_lock.sql",
  "supabase/migrations/20260916120000_legal_aid_clinic_mode.sql"
];

export const IDS = {
  partnerRecord: "80000000-0000-4000-8000-000000000001",
  admin: "10000000-0000-4000-8000-000000000002",
  admin2: "10000000-0000-4000-8000-000000000012",
  coordinator: "10000000-0000-4000-8000-000000000003",
  intakeVolunteer: "10000000-0000-4000-8000-000000000004",
  attorney: "10000000-0000-4000-8000-000000000005",
  notary: "10000000-0000-4000-8000-000000000006",
  applicant: "10000000-0000-4000-8000-000000000009",
  secondApplicant: "10000000-0000-4000-8000-000000000010",
  eventLegalAid: "20000000-0000-4000-8000-000000000001",
  eventStandard: "20000000-0000-4000-8000-000000000002",
  matter: "50000000-0000-4000-8000-000000000001",
  renderJob: "60000000-0000-4000-8000-000000000001"
};

export const USERS = new Map([
  [IDS.admin, { id: IDS.admin, email: "clinic.admin@example.org", confirmed: true, partnerUserId: "90000000-0000-4000-8000-000000000002", role: "partner_admin" }],
  [IDS.admin2, { id: IDS.admin2, email: "second.admin@example.org", confirmed: true, partnerUserId: "90000000-0000-4000-8000-000000000012", role: "partner_admin" }],
  [IDS.coordinator, { id: IDS.coordinator, email: "coordinator@example.org", confirmed: true, partnerUserId: "90000000-0000-4000-8000-000000000003", role: "partner_staff" }],
  [IDS.intakeVolunteer, { id: IDS.intakeVolunteer, email: "intake.volunteer@example.org", confirmed: true, partnerUserId: "90000000-0000-4000-8000-000000000004", role: "partner_staff" }],
  [IDS.attorney, { id: IDS.attorney, email: "volunteer.attorney@example.org", confirmed: true, partnerUserId: "90000000-0000-4000-8000-000000000005", role: "partner_staff" }],
  [IDS.notary, { id: IDS.notary, email: "clinic.notary@example.org", confirmed: true, partnerUserId: "90000000-0000-4000-8000-000000000006", role: "partner_staff" }],
  [IDS.applicant, { id: IDS.applicant, email: "applicant@example.net", confirmed: true }],
  [IDS.secondApplicant, { id: IDS.secondApplicant, email: "second.applicant@example.net", confirmed: true }]
]);

export const STUBS = `
  create schema auth;
  create table auth.users(id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
  create table public.partner_records(id uuid primary key, partner_slug text unique not null);
  create table public.partner_users(id uuid primary key, auth_user_id uuid unique not null references auth.users(id), partner_slug text references public.partner_records(partner_slug), role text not null, status text not null, invited_email text);
  create table public.screening_sessions(session_id uuid primary key);
  create table public.consumer_briefcase_items(id uuid primary key, user_id uuid not null references auth.users(id));
  create table public.packet_credit_ledger(id uuid primary key);
  create table public.packet_render_jobs(
    id uuid primary key, packet_id text, route_id text, briefcase_item_id uuid, person_id uuid, renderer_kind text, renderer_version text,
    status text not null, attempt_count int default 0, max_attempts int default 5, accounting_result text, failure_disposition text, error_code text,
    output_storage_path text, output_sha256 text, normalized_output_sha256 text, delivery_eligibility text, consumer_briefcase_item_id uuid, consumer_verification_hash text,
    credit_ledger_id uuid references public.packet_credit_ledger(id), partner_id uuid references public.partner_records(id),
    matter_id uuid, consumer_auth_user_id uuid references auth.users(id), created_at timestamptz not null default now()
  );
  create table public.participant_account_tombstones(user_id uuid primary key, restoration_barrier boolean not null default false);
  create function public.participant_account_is_blocked(p_user_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.participant_account_tombstones t where t.user_id = p_user_id and t.restoration_barrier)
  $$;
  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated, service_role;
  grant select on auth.users, public.partner_records, public.partner_users, public.screening_sessions, public.consumer_briefcase_items, public.packet_render_jobs, public.packet_credit_ledger, public.participant_account_tombstones to service_role;
  grant execute on function public.participant_account_is_blocked(uuid) to service_role;
  -- Production lets a signed-in partner user read only their own membership row; the session resolver depends on it.
  alter table public.partner_users enable row level security;
  grant select on public.partner_users to authenticated;
  create policy partner_users_self on public.partner_users for select to authenticated using (auth_user_id = auth.uid());
`;

export async function createLocalDatabase({ seedEvents = true } = {}) {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(STUBS);
  await db.exec(MIGRATIONS.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n"));
  await db.exec(`
    insert into auth.users(id, email) values ${[...USERS.values()].map((user) => `('${user.id}','${user.email}')`).join(",")};
    insert into public.partner_records(id, partner_slug) values ('${IDS.partnerRecord}','mvlp');
    insert into public.partner_users(id, auth_user_id, partner_slug, role, status, invited_email) values
      ${[...USERS.values()].filter((user) => user.partnerUserId).map((user) => `('${user.partnerUserId}','${user.id}','mvlp','${user.role}','active','${user.email}')`).join(",")};
    insert into public.consumer_briefcase_items(id,user_id) values ('${IDS.matter}','${IDS.applicant}');
  `);
  if (seedEvents) {
    await db.exec(`
      insert into public.clinic_events(id, partner_slug, public_slug, name, starts_at, ends_at, timezone, location_name, geography, capacity, status, sponsorship_allocation, created_by, jurisdiction) values
        ('${IDS.eventLegalAid}','mvlp','mvlp-training-clinic','MVLP training clinic (synthetic)','2026-11-14T15:00:00Z','2026-11-14T21:00:00Z','America/Chicago','Training venue','Hinds County, Mississippi',12,'draft',null,'${IDS.admin}','MS'),
        ('${IDS.eventStandard}','mvlp','mvlp-standard-check','MVLP standard clinic (synthetic)','2026-11-21T15:00:00Z','2026-11-21T21:00:00Z','America/Chicago','Library','Mississippi',50,'published',null,'${IDS.admin}','MS');
    `);
  }
  return db;
}
