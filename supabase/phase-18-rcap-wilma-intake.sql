create table if not exists rcap_intake_sessions (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null references partner_records(partner_slug) on delete restrict,
  partner_id text,
  status text not null default 'started' check (status in ('started', 'in_progress', 'completed', 'abandoned', 'needs_review')),
  current_step text not null default 'understand_goal',
  user_first_name text,
  user_last_name text,
  user_email text,
  user_phone text,
  state text,
  county text,
  record_type text,
  charge_or_case_type text,
  case_outcome text,
  approximate_case_year text,
  has_documents boolean,
  needs_record_check boolean,
  pathway_summary text,
  suggested_next_step text,
  eligibility_signal text check (
    eligibility_signal is null or eligibility_signal in (
      'possible_pathway',
      'possible_expungement_path',
      'possible_sealing_path',
      'needs_rap_sheet',
      'needs_more_information',
      'likely_not_available',
      'human_review_recommended',
      'excluded_or_blocked_review_needed',
      'future_eligibility_update'
    )
  ),
  legal_disclaimer_accepted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists rcap_intake_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references rcap_intake_sessions(id) on delete cascade,
  partner_slug text not null references partner_records(partner_slug) on delete restrict,
  question_key text not null,
  response_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, question_key)
);

create index if not exists rcap_intake_sessions_partner_slug_idx on rcap_intake_sessions(partner_slug);
create index if not exists rcap_intake_sessions_status_idx on rcap_intake_sessions(status);
create index if not exists rcap_intake_sessions_eligibility_signal_idx on rcap_intake_sessions(eligibility_signal);
create index if not exists rcap_intake_responses_session_id_idx on rcap_intake_responses(session_id);
create index if not exists rcap_intake_responses_partner_slug_idx on rcap_intake_responses(partner_slug);

comment on table rcap_intake_sessions is 'Phase 18 RCAP Wilma guided eligibility intake sessions. No SSN, date of birth, uploads, or document generation fields are collected in this phase.';
comment on table rcap_intake_responses is 'Phase 18 RCAP Wilma structured question responses. Values are intentionally limited to basic screening and contact fields.';
comment on column rcap_intake_sessions.pathway_summary is 'Deterministic non-legal-advice summary. Does not guarantee eligibility or outcomes.';
