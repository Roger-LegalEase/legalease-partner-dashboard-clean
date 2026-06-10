-- Security fix: rcap_user_profiles contains email/display_name and must not be publicly readable.
-- No policies are added because the current app has no direct access path for this table.
alter table public.rcap_user_profiles enable row level security;
