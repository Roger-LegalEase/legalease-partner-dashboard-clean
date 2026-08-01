-- Phase 48: durable RCAP document packet artifacts.
--
-- Forward-only and additive. Not applied to any remote database by this lane.
--
-- Why this exists
-- ---------------
-- Packet PDFs have never been stored. The download route rendered one on every
-- request, and `preview_generated` was set by a status flip that never checked
-- whether a document could be produced at all. A participant could therefore be
-- shown a Download action for a document that did not exist and never had.
--
-- This migration makes "ready" mean "stored bytes exist":
--
--   * `rcap_document_artifacts` records one stored object per (packet, kind),
--     with the byte size, SHA-256 checksum, renderer version and source template
--     identity needed to prove which document was served and from what.
--   * The unique constraint on (document_packet_id, kind) is what makes
--     generation idempotent: a retry cannot create a second fulfilled artifact.
--   * Three new packet statuses distinguish "rendering", "a document exists" and
--     "generation failed recoverably" from the old `preview_generated`, which
--     asserted readiness without evidence.
--
-- Apply after phase-47-rcap-onboarding-launch-readiness.sql.

begin;

-------------------------------------------------------------------------------
-- 1. Stored artifact records.
-------------------------------------------------------------------------------

create table if not exists public.rcap_document_artifacts (
  id uuid primary key default gen_random_uuid(),
  document_packet_id uuid not null
    references public.rcap_document_packets(id) on delete cascade,
  -- Which rendition. A packet may have a court-facing filing document and a
  -- fuller participant-facing packet; they are separate stored objects.
  kind text not null,
  storage_bucket text not null,
  -- Server-canonical object path. Never a public URL and never returned to a
  -- browser: the download route streams bytes rather than redirecting.
  object_path text not null,
  byte_size bigint not null,
  checksum_sha256 text not null,
  -- Which code produced it, so a bad rendition can be identified and requeued.
  renderer_version text not null,
  -- Which official source document it was built from, and the mapping used.
  source_template_id text not null,
  mapping_id text,
  page_count integer,
  jurisdiction text not null,
  county text,
  created_at timestamptz not null default now(),

  constraint rcap_document_artifacts_kind_check
    check (kind in ('court', 'full')),
  constraint rcap_document_artifacts_byte_size_check
    check (byte_size > 0),
  constraint rcap_document_artifacts_checksum_check
    check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  constraint rcap_document_artifacts_page_count_check
    check (page_count is null or page_count > 0),
  -- One stored artifact per rendition. This is the idempotency guarantee:
  -- a duplicate generation attempt conflicts here instead of fulfilling twice.
  constraint rcap_document_artifacts_packet_kind_unique
    unique (document_packet_id, kind)
);

create index if not exists rcap_document_artifacts_packet_idx
  on public.rcap_document_artifacts(document_packet_id);
create index if not exists rcap_document_artifacts_jurisdiction_idx
  on public.rcap_document_artifacts(jurisdiction, created_at);

comment on table public.rcap_document_artifacts is
  'One durably stored PDF per packet rendition. A packet is only ready when a row exists here.';
comment on column public.rcap_document_artifacts.object_path is
  'Server-canonical storage path. Never a public URL; the download route streams bytes.';
comment on constraint rcap_document_artifacts_packet_kind_unique
  on public.rcap_document_artifacts is
  'Idempotency: a retried generation conflicts rather than producing a second artifact.';

-------------------------------------------------------------------------------
-- 2. Packet statuses that distinguish a stored document from a status flip.
--
--    `preview_generated` is preserved so existing rows and read-side filters
--    keep working; it simply stops being the terminal success state.
-------------------------------------------------------------------------------

alter table public.rcap_document_packets
  drop constraint if exists rcap_document_packets_status_check;

alter table public.rcap_document_packets
  add constraint rcap_document_packets_status_check
    check (
      status in (
        'draft_started',
        'form_in_progress',
        'saved_for_later',
        'missing_information',
        'ready_for_review',
        'preview_generated',
        -- Added by this migration.
        'document_generating',
        'document_ready',
        'document_failed',
        'exported',
        'blocked_review_required'
      )
    );

-- When the packet last reached a state where stored bytes exist.
alter table public.rcap_document_packets
  add column if not exists document_ready_at timestamptz;

-- Safe, non-identifying failure reason. Never a stack trace and never PII.
alter table public.rcap_document_packets
  add column if not exists document_failure_code text;

alter table public.rcap_document_packets
  drop constraint if exists rcap_document_packets_document_failure_code_check;
alter table public.rcap_document_packets
  add constraint rcap_document_packets_document_failure_code_check
    check (
      document_failure_code is null
      or document_failure_code in (
        'jurisdiction_not_packet_ready',
        'source_template_unavailable',
        'mapping_not_approved',
        'render_failed',
        'invalid_pdf_output',
        'storage_unavailable',
        'storage_write_failed'
      )
    );

comment on column public.rcap_document_packets.document_failure_code is
  'Non-identifying recoverable failure reason. Never a message, stack trace or participant value.';

-------------------------------------------------------------------------------
-- 3. Private storage bucket for packet PDFs.
--
--    Object operations are issued only by the authorized server storage helper.
--    Browser JWT roles receive no object policies for this bucket, matching the
--    onboarding private bucket established in phase 43.
-------------------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'rcap-document-packets-private',
  'rcap-document-packets-private',
  false,
  20971520,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-------------------------------------------------------------------------------
-- 4. Row level security.
--
--    Artifact rows carry no participant identity of their own, but they reveal
--    which jurisdiction and template a packet used, so they stay server-only.
--    The service role reaches them through the admin client; no browser role is
--    granted a policy, which denies by default under RLS.
-------------------------------------------------------------------------------

alter table public.rcap_document_artifacts enable row level security;

drop policy if exists rcap_document_artifacts_service_role_all
  on public.rcap_document_artifacts;

create policy rcap_document_artifacts_service_role_all
  on public.rcap_document_artifacts
  for all
  to service_role
  using (true)
  with check (true);

commit;

-- Rollback notes
-- --------------
-- This migration is additive and reversible without data loss to existing rows:
--
--   1. drop table public.rcap_document_artifacts;
--   2. alter table public.rcap_document_packets
--        drop column if exists document_ready_at,
--        drop column if exists document_failure_code;
--   3. restore the previous status check constraint, which is this one minus
--      'document_generating', 'document_ready' and 'document_failed'. Any rows
--      left in those three states must first be moved back to 'ready_for_review'
--      or the constraint will refuse to validate.
--   4. delete from storage.buckets where id = 'rcap-document-packets-private';
--      stored objects must be removed first or the delete will fail.
