import fs from "node:fs";
import path from "node:path";

// Real current program predicates on a synthetic legacy partner. Unused
// onboarding branches keep their shipped definitions; this fixture certifies
// legacy partner scope, not a real launch or the LegalEase-managed branch.
export function installCurrentSponsoredAuthority(db) {
  db.sql(`
    alter table partner_records add qualification_status text default 'qualified',
      add provisioning_status text default 'provisioned', add payment_status text default 'demo_paid',
      add target_state text default 'IL', add state text default 'IL', add access_mode text default 'open',
      add stripe_payment_intent_id text, add paid_at timestamptz, add payment_amount integer;
    alter table partner_packet_entitlement add column if not exists entitlement_scope text default 'sponsored_packets';
    create table partner_onboarding(id uuid primary key,partner_slug text,partner_record_id uuid,
      operating_model text,rcap_policy_version text,status text,landing_page_ready boolean,
      internal_approved_at timestamptz,launched_at timestamptz,rcap_launch_operation_id uuid,agreement_status text);
    create table partner_onboarding_sections(workspace_id uuid,section_key text,response_data jsonb,status text);
    create table rcap_launch_operation_events(workspace_id uuid,operation_id uuid,step text,evidence jsonb,created_at timestamptz);
    create table rcap_commercial_authorizations(id uuid,workspace_id uuid,document_id uuid,document_hash text,
      expires_at timestamptz,access_mode text,kind text,packet_entitlement_id uuid,created_at timestamptz);
    create table partner_onboarding_assets(id uuid,workspace_id uuid,sha256_hex text,lifecycle_status text,review_status text);
  `);
  const operating=fs.readFileSync('supabase/migrations/20261010023000_rcap_operating_authority.sql','utf8');
  const policy=fs.readFileSync('supabase/migrations/20261009224252_rcap2_program_policy_and_start.sql','utf8');
  const names=['rcap_screening_jurisdictions','rcap_program_internal_authority','rcap_program_funding_valid',
    'rcap_program_commercial_valid','rcap_partner_activation_for_launch','rcap_program_screening_jurisdictions',
    'rcap_program_packet_scope_authorized','sponsored_packet_render_authority'];
  for(const [source,name] of [[policy,'rcap_program_policy_source'],...names.map(name=>[operating,name])]) {
    const start=source.search(new RegExp(`create (?:or replace )?function public\\.${name}\\(`,'i'));
    if(start<0)throw Error(`missing current program predicate ${name}`);
    const body=source.slice(start),tag=body.match(/\bas\s+(\$[a-z_]*\$)/i)?.[1];
    if(!tag)throw Error(`missing predicate body ${name}`);
    const end=body.indexOf(tag+';',body.indexOf(tag)+tag.length);
    if(end<0)throw Error(`missing predicate terminator ${name}`);
    db.sql('set check_function_bodies=off;'+body.slice(0,end+tag.length+1));
  }
  db.applyFile(path.resolve('supabase/migrations/20261023151500_ordinary_sponsored_packet_authority.sql'));
}
