-- PIN-05, ownership half — give every durable RCAP participant record a
-- participant owner, and give the participant a read path to their own record.
--
-- The privilege migration (20260828000000) stopped a partner-tenancy session
-- reading participant PII. It did not give the participant ownership, and it
-- did not give them a way to read their own record. This does both.
--
-- STATE BEFORE THIS MIGRATION
--
--   rcap_intake_sessions    no participant column at all
--   rcap_document_packets   user_id uuid, nullable
--   rcap_briefcase_items    user_id uuid, nullable
--
-- and on all three the only row-level read boundary is
-- partner_slug = current_partner_slug(), so a participant cannot read their
-- own record while the sponsoring partner can read every record.
--
-- WHY user_id IS NOT MADE NOT NULL HERE
--
-- These tables carry the preserved legacy generators; rcap_document_packets
-- .state defaults to 'MS'. In the legacy RCAP flow partner staff performed
-- intake, and rows can predate the participant having an account at all. A
-- NOT NULL constraint would either fail on those rows or force them to be
-- deleted or attributed to someone who does not own them. Neither is
-- acceptable, and the choice is a data decision that needs real counts.
--
-- So this migration establishes ownership where it is derivable, gives the
-- participant a read path, and publishes a view that reports exactly what
-- remains unattributable. Making the column NOT NULL is a follow-up taken
-- with those numbers in hand, not a guess made now.
--
-- person_id is not a substitute. It is keyed on (partner_slug, match_key) --
-- a partner-scoped pseudonymous join key, not an auth identity.

-- 1. rcap_intake_sessions gains the participant column the other two have.

alter table public.rcap_intake_sessions
  add column if not exists user_id uuid references auth.users (id) on delete set null;

comment on column public.rcap_intake_sessions.user_id is
  'Participant owner. Nullable only because legacy partner-staff intake predates participant accounts; see public.rcap_unowned_participant_records.';

-- 2. Backfill from the two links that already carry an owner. Both are
--    deterministic joins on existing foreign keys, and neither invents an
--    owner: a session is attributed only when a record that already names an
--    owner points at it.

update public.rcap_intake_sessions s
   set user_id = b.user_id
  from public.rcap_briefcase_items b
 where b.intake_session_id = s.id
   and b.user_id is not null
   and s.user_id is null;

update public.rcap_intake_sessions s
   set user_id = p.user_id
  from public.rcap_document_packets p
 where p.intake_session_id = s.id
   and p.user_id is not null
   and s.user_id is null;

-- The same linkage runs the other way: a packet or briefcase item with no
-- owner, whose intake session now has one, inherits it.

update public.rcap_document_packets p
   set user_id = s.user_id
  from public.rcap_intake_sessions s
 where p.intake_session_id = s.id
   and s.user_id is not null
   and p.user_id is null;

update public.rcap_briefcase_items b
   set user_id = s.user_id
  from public.rcap_intake_sessions s
 where b.intake_session_id = s.id
   and s.user_id is not null
   and b.user_id is null;

-- 3. Indexes for the owner predicate the new policies use.

create index if not exists rcap_intake_sessions_user_id_idx
  on public.rcap_intake_sessions (user_id) where user_id is not null;
create index if not exists rcap_document_packets_user_id_idx
  on public.rcap_document_packets (user_id) where user_id is not null;
create index if not exists rcap_briefcase_items_user_id_idx
  on public.rcap_briefcase_items (user_id) where user_id is not null;

-- 4. The participant read path. Additive: these sit alongside the existing
--    partner-tenancy and internal-admin policies, which are unchanged, so no
--    current consumer loses access. A participant may now read their own
--    record, which they previously could not do at all.
--
--    Column privileges from 20260828000000 still apply to the authenticated
--    role, so a participant reading their own row is subject to them too.
--    That is deliberate: participant access to their own PII belongs on the
--    owner-scoped application path, not on direct table reads.

drop policy if exists "rcap_intake_sessions_select_own_participant" on public.rcap_intake_sessions;
create policy "rcap_intake_sessions_select_own_participant"
  on public.rcap_intake_sessions for select to authenticated
  using (user_id is not null and user_id = auth.uid());

drop policy if exists "rcap_document_packets_select_own_participant" on public.rcap_document_packets;
create policy "rcap_document_packets_select_own_participant"
  on public.rcap_document_packets for select to authenticated
  using (user_id is not null and user_id = auth.uid());

drop policy if exists "rcap_briefcase_items_select_own_participant" on public.rcap_briefcase_items;
create policy "rcap_briefcase_items_select_own_participant"
  on public.rcap_briefcase_items for select to authenticated
  using (user_id is not null and user_id = auth.uid());

-- 5. WHY THERE IS NO "NEW ROWS MUST HAVE AN OWNER" TRIGGER HERE.
--
-- An INSERT trigger requiring user_id was drafted for this migration and
-- removed after checking the writers. All three can legitimately insert an
-- unowned row today:
--
--   src/lib/rcap-intake/repository.ts:107      inserts { partner_slug, status }
--                                              with no user_id at all
--   source-repository.ts packetRow()           user_id: packet.userId ?? null
--   source-repository.ts briefcaseItemRow()    user_id: packet.userId ?? null
--
-- Such a trigger would therefore have failed the first RCAP intake and broken
-- the preserved legacy generators, which AGENTS.md forbids.
--
-- It is also wrong on the contract. RCAP screening may begin before the
-- participant authenticates -- "screening may be anonymous" -- so an intake
-- session legitimately has no owner at the moment it is created. The owner
-- arrives when the participant claims their result.
--
-- Enforcement therefore belongs after the writers are changed to supply the
-- owner they already know, and after the claim path sets it. That is a code
-- change plus a follow-up constraint, not something this migration can assert.

-- 6. What could not be attributed. This is the input to the NOT NULL decision
--    and to any records-retention determination, and it is deliberately a view
--    rather than a number in a commit message, so the count is current whenever
--    it is read.

create or replace view public.rcap_unowned_participant_records as
  select 'rcap_intake_sessions' as table_name, partner_slug, count(*) as unowned_rows,
         min(created_at) as earliest, max(created_at) as latest
    from public.rcap_intake_sessions where user_id is null group by partner_slug
  union all
  select 'rcap_document_packets', partner_slug, count(*),
         min(created_at), max(created_at)
    from public.rcap_document_packets where user_id is null group by partner_slug
  union all
  select 'rcap_briefcase_items', partner_slug, count(*),
         min(created_at), max(created_at)
    from public.rcap_briefcase_items where user_id is null group by partner_slug;

comment on view public.rcap_unowned_participant_records is
  'PIN-05: durable participant records with no participant owner, by table and partner. Read this before deciding whether user_id can be made NOT NULL, and before any retention determination on legacy partner-staff intake.';

revoke all on public.rcap_unowned_participant_records from authenticated, anon;
