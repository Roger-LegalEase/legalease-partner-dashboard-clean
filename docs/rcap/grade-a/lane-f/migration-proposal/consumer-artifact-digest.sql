-- Lane F migration PROPOSAL — deliberately unnumbered, not in the apply order.
--
-- Optional. The artifact digest and page count already travel inside the
-- existing artifact_refs_json envelope, so delivery, repeat download and the
-- substituted-object refusal all work without this migration. What it adds is
-- the ability to ASK the question across the whole table: which stored
-- artifacts no longer reproduce the digest they were validated as.
--
-- Without it that question requires reading every JSON blob, which is exactly
-- the kind of query nobody runs, which is how a silent substitution stays
-- silent.
--
-- Captain-owned: numbering and apply order belong to whoever owns
-- supabase/migrations/.

begin;

-- Generated, not written: the value cannot drift from the envelope it is
-- derived from, and no application code has to remember to keep two copies
-- in step.
alter table if exists public.consumer_briefcase_items
  add column if not exists packet_artifact_sha256 text
    generated always as (artifact_refs_json ->> 'artifactSha256') stored;

alter table if exists public.consumer_briefcase_items
  add column if not exists packet_artifact_page_count integer
    generated always as (nullif(artifact_refs_json ->> 'pageCount', '')::integer) stored;

-- Partial on purpose: the rows without a digest are the legacy providers that
-- never recorded one, and they are not what this index is for.
create index if not exists consumer_briefcase_items_artifact_sha256_idx
  on public.consumer_briefcase_items (packet_artifact_sha256)
  where packet_artifact_sha256 is not null;

comment on column public.consumer_briefcase_items.packet_artifact_sha256 is
  'SHA-256 of the rendered packet bytes, recorded at attachment. Delivery re-renders and compares; a mismatch is a substituted object, not corruption.';

commit;
