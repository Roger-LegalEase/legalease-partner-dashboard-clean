import {readFileSync} from 'node:fs';
import {isDeepStrictEqual as equal} from 'node:util';
export const CLINIC_CLAIM_SQL=readFileSync(new URL('../sql/rcap-clinic-claim-prerequisites.sql',import.meta.url),'utf8');
const contract=JSON.parse(readFileSync(new URL('./rcap-clinic-claim-prerequisite-contract.json',import.meta.url),'utf8'));
export function qualifyClinicClaimPrerequisites(catalog) {
  const checks=[],observations=[];
  const add=(id,ok)=>checks.push({id:`claim_contract:${id}`,ok:ok===true});
  if(!catalog||!Array.isArray(catalog.functions)||!Array.isArray(catalog.relations)) {
    add('catalog_shape',false);return {checks,observations};
  }
  const functions=new Map(catalog.functions.flatMap(f=>(f.overloads??[]).map(o=>[o.signature.replace(/^public\./,''),o])));
  for(const f of contract.functions) {
    const actual=functions.get(f.signature);
    const ok=!!actual&&actual.owner==='postgres'&&(f.kind==='trigger'||(actual.service_execute===true&&actual.anon_execute===false&&actual.authenticated_execute===false))
      &&['source_body_md5','argument_names','security_definer','config'].every(k=>equal(actual[k],f[k]))
      &&(!f.required||(actual.arguments===f.arguments&&actual.result===f.result));
    if(f.required)add(f.signature,ok);else observations.push({id:`optional:${f.name}`,compatible:ok,blocking:false});
  }
  for(const expected of contract.relations) {
    const table=catalog.relations.find(t=>t.name===expected.name),columns=new Map(table?.columns?.map(c=>[c.name,c.type])??[]);
    const analytics=expected.name==='public.rcap_screening_analytics_events';
    add(expected.name,table?.present===true&&table.owner==='postgres'&&table.rls===true&&table.service_select===true
      &&(analytics||(table.service_insert===true&&table.anon_access===false&&table.authenticated_access===false))
      &&Object.entries(expected.columns).every(([name,type])=>columns.get(name)===type));
  }
  const pending=catalog.relations.find(t=>t.name==='public.consumer_pending_screening_results');
  const constraints=new Map(pending?.constraints?.map(c=>[c.name,c.definition.replaceAll('public.','')])??[]);
  add('claimed_shape',constraints.get('consumer_pending_screening_results_claim_shape')==="CHECK (((status <> 'CLAIMED'::text) OR ((claimed_user_id IS NOT NULL) AND (claimed_matter_id IS NOT NULL) AND (claimed_at IS NOT NULL))))");
  add('matter_implies_claimed',constraints.get('consumer_pending_screening_results_matter_implies_claimed')==="CHECK (((claimed_matter_id IS NULL) OR (status = 'CLAIMED'::text)))");
  add('claimed_matter_fk',constraints.get('consumer_pending_screening_results_claimed_matter_fkey')==='FOREIGN KEY (claimed_matter_id) REFERENCES consumer_briefcase_items(id) ON DELETE SET NULL');
  add('unique_claim_token',pending?.indexes?.some(i=>i.valid===true&&i.ready===true&&/^CREATE UNIQUE INDEX \w+ ON public\.consumer_pending_screening_results USING btree \(claim_token_hash\)( WHERE \(claim_token_hash IS NOT NULL\))?$/.test(i.definition)));
  const events=catalog.relations.find(t=>t.name==='public.participant_claim_events');
  add('append_only_claim_events',events?.triggers?.some(t=>t.enabled==='O'&&t.function_body_md5===contract.append_only_body_md5
    &&t.definition==='CREATE TRIGGER participant_claim_events_no_update BEFORE DELETE OR UPDATE ON public.participant_claim_events FOR EACH ROW EXECUTE FUNCTION participant_claim_events_append_only()'));
  for(const [name,columns] of [['participant_claim_events_pending_idx','pending_result_id, occurred_at DESC'],['participant_claim_events_actor_idx','actor_user_id, occurred_at DESC']])
    add(name,events?.indexes?.some(i=>i.name===name&&i.valid===true&&i.ready===true&&i.definition===`CREATE INDEX ${name} ON public.participant_claim_events USING btree (${columns})`));
  const analytics=catalog.relations.find(t=>t.name==='public.rcap_screening_analytics_events'),trigger=catalog.admission_analytics_trigger;
  const emitter=contract.functions.find(f=>f.kind==='trigger');
  add('admission_analytics_trigger',trigger?.present===true&&trigger.enabled==='O'&&trigger.owner_insert===true&&trigger.function_owner==='postgres'
    &&trigger.function_source_body_md5===emitter.source_body_md5&&trigger.definition==='CREATE TRIGGER rcap_screening_started_event AFTER INSERT ON public.screening_sessions FOR EACH ROW EXECUTE FUNCTION emit_rcap_screening_started_event()');
  add('analytics_insert_defaults',Object.entries({id:'gen_random_uuid()',occurred_at:'now()',metadata:"'{}'::jsonb"})
    .every(([name,value])=>analytics?.columns?.some(c=>c.name===name&&c.default===value))
    &&['partner_access_code_id','campaign_name','outcome_category','packet_route_available'].every(name=>analytics?.columns?.some(c=>c.name===name&&c.not_null===false)));
  add('analytics_read_policies',analytics?.policies?.length===2&&analytics.policies.every(p=>p.command==='r'&&equal(p.role_names,['authenticated'])
    &&((p.name==='rcap_screening_analytics_select_own_partner'&&p.using==='(partner_slug = current_partner_slug())')
      ||(p.name==='rcap_screening_analytics_select_internal_admin'&&p.using==='is_internal_admin()'))));
  add('analytics_event_constraint',analytics?.constraints?.some(c=>c.name==='rcap_screening_analytics_events_event_type_check'
    &&c.definition==="CHECK ((event_type = ANY (ARRAY['screening_started'::text, 'screening_completed'::text, 'eligibility_result_recorded'::text, 'guidance_only_result'::text, 'packet_ready_result'::text, 'packet_generated'::text, 'packet_overage_recorded'::text])))"));
  for(const [suffix,columns] of [['partner','partner_slug, occurred_at'],['code','partner_access_code_id'],['session','session_id, event_type']])
    add(`analytics_${suffix}_index`,analytics?.indexes?.some(i=>i.valid===true&&i.ready===true&&i.definition===`CREATE INDEX rcap_screening_analytics_events_${suffix}_idx ON public.rcap_screening_analytics_events USING btree (${columns})`));
  for(const action of ['UPDATE','DELETE'])add(`analytics_append_only_${action.toLowerCase()}`,analytics?.triggers?.some(t=>t.enabled==='O'
    &&t.function_body_md5===contract.analytics_append_only_body_md5
    &&t.definition===`CREATE TRIGGER rcap_screening_analytics_prevent_${action.toLowerCase()} BEFORE ${action} ON public.rcap_screening_analytics_events FOR EACH ROW EXECUTE FUNCTION prevent_rcap_screening_analytics_mutation()`));
  return {checks,observations};
}
