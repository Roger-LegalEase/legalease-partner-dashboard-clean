-- An optimistic workspace conflict is deterministic, not a serialization failure.
-- PostgREST retries 40001; PT409 returns the same safe message without retrying.
-- Change only this exception's transport code. Preserve the locked version check,
-- preceding completed-request replay, transitions, authorization and function ACL.
do $migration$
declare
  definition text;
  original constant text := 'raise exception using errcode = ''40001'', message = ''Onboarding workspace revision conflict'';';
  corrected constant text := 'raise exception using errcode = ''PT409'', message = ''Onboarding workspace revision conflict'';';
begin
  definition := pg_get_functiondef(
    'public.rcap_service_review_onboarding(text,uuid,uuid,bigint,uuid,text,jsonb)'::regprocedure
  );
  if strpos(definition, original) = 0 then
    if strpos(definition, corrected) > 0 then return; end if;
    raise exception 'Expected review workspace conflict statement not found';
  end if;
  if (length(definition) - length(replace(definition, original, ''))) / length(original) <> 1 then
    raise exception 'Expected exactly one review workspace conflict statement';
  end if;
  execute replace(definition, original, corrected);
end
$migration$;
