import assert from 'node:assert/strict';
import fs from 'node:fs';
import { requireAcceptance } from './rcap-acceptance-fixture-retention.mjs';
export const PARTNER_ID='bc1ed720-681e-4da5-9964-acb2affd5b12';
export const ENTITLEMENT_ID='77000000-0000-4000-8000-000000000058';
export const EVENT_ID='77000000-0000-4000-8000-000000000055';
export const NOTE='Synthetic Mississippi Clinic Preview packet capacity only';
export function clinicAllowance() {
  const grant=JSON.parse(fs.readFileSync(new URL('../data/record-clearing/legal-decisions/2026-09-25-ms-nonconv-sponsored-preview.json',import.meta.url)));
  assert.equal(grant.eventId,EVENT_ID);assert.equal(grant.partnerSlug,'mvl-demo');
  assert.equal(grant.productionAuthorized,false);assert.equal(new Set(grant.participantUserIds).size,2);
  return grant.participantUserIds.length;
}
// Fragment runs inside the existing bounded seed transaction. The same locks
// serialize packet finalization and prevent ledger/cap derivation races.
export function seedPacketCapacitySql(project) {
  requireAcceptance(project);const allowance=clinicAllowance();
  return `do $packet_capacity$ declare c integer; remaining integer; e public.partner_packet_entitlement%rowtype;
    begin
      lock table public.partner_packet_entitlement,public.packet_credit_ledger,public.partner_entitlement,
        public.consumer_packet_artifact_provenance,public.clinic_cases,public.clinic_events in share row exclusive mode;
      if not exists(select 1 from public.partner_records where id='${PARTNER_ID}' and partner_slug='mvl-demo') then raise exception 'immutable Clinic partner mismatch';end if;
      if exists(select 1 from public.partner_packet_entitlement where partner_id='${PARTNER_ID}' and id<>'${ENTITLEMENT_ID}') then raise exception 'foreign packet entitlement: refuse ownership adoption';end if;
      select * into e from public.partner_packet_entitlement where id='${ENTITLEMENT_ID}' for update;
      if found and (e.partner_id<>'${PARTNER_ID}' or e.entitlement_scope<>'sponsored_packets' or e.contract_note is distinct from '${NOTE}'
        or e.expires_at is not null or e.effective_at>now() or e.overage_enabled or e.overage_cap<>0 or not e.pause_at_cap) then raise exception 'synthetic packet entitlement drift';end if;
      select least(${allowance},pe.screenings_allowed-pe.screenings_used,ev.sponsorship_allocation-
        (select count(*) from public.consumer_packet_artifact_provenance p join public.clinic_cases cc on cc.matter_id=p.briefcase_item_id
          where cc.event_id=ev.id and p.entitlement_source='partner_sponsorship'))::integer into remaining
        from public.partner_entitlement pe join public.clinic_events ev on ev.partner_slug=pe.partner_slug
        where pe.partner_slug='mvl-demo' and ev.id='${EVENT_ID}' and ev.status='published'
          and ev.sponsorship_allocation=${allowance} and pe.pause_at_cap and not pe.overage_enabled;
      if remaining is null or remaining<1 then raise exception 'bounded Clinic allowance exhausted or invalid';end if;
      select count(*)::integer into c from public.packet_credit_ledger where entitlement_id='${ENTITLEMENT_ID}' and event_type='consumed';
      if exists(select 1 from public.packet_credit_ledger where entitlement_id='${ENTITLEMENT_ID}' and event_type='overage_consumed') then raise exception 'synthetic overage history unexpected';end if;
      insert into public.partner_packet_entitlement(id,partner_id,entitlement_scope,packet_cap,overage_enabled,overage_cap,pause_at_cap,contract_note)
        values('${ENTITLEMENT_ID}','${PARTNER_ID}','sponsored_packets',c+remaining,false,0,true,'${NOTE}')
        on conflict(id) do update set packet_cap=excluded.packet_cap
        where public.partner_packet_entitlement.packet_cap is distinct from excluded.packet_cap;
    end $packet_capacity$;`;
}

export function packetCapacitySql() {
  return `select jsonb_build_object('allPartnerRows',(select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object(
    'active',e.effective_at<=now() and (e.expires_at is null or e.expires_at>now()),
    'consumed',(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type='consumed'),
    'overageConsumed',(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type='overage_consumed')) order by e.id),'[]')
    from public.partner_packet_entitlement e where e.partner_id='${PARTNER_ID}'),
    'screening',(select to_jsonb(e) from public.partner_entitlement e where partner_slug='mvl-demo'),
    'event',(select to_jsonb(e) from public.clinic_events e where id='${EVENT_ID}'),
    'eventConsumed',(select count(*) from public.consumer_packet_artifact_provenance p join public.clinic_cases c on c.matter_id=p.briefcase_item_id
      where c.event_id='${EVENT_ID}' and p.entitlement_source='partner_sponsorship')) as capacity`;
}
export function assertPacketCapacity(s,{seedExact=false}={}) {
  const rows=s.allPartnerRows;assert.equal(rows?.length,1,'exactly one bounded partner packet entitlement required');
  const e=rows[0];assert.equal(e.id,ENTITLEMENT_ID);assert.equal(e.partner_id,PARTNER_ID);assert.equal(e.entitlement_scope,'sponsored_packets');
  assert.equal(e.active,true,'packet entitlement expired/not effective');assert.equal(e.expires_at,null);assert.equal(e.contract_note,NOTE);
  assert.equal(e.overage_enabled,false);assert.equal(e.overage_cap,0);assert.equal(e.pause_at_cap,true);assert.equal(e.overageConsumed,0);
  assert.equal(s.screening?.partner_slug,'mvl-demo');assert.equal(s.screening.pause_at_cap,true);assert.equal(s.screening.overage_enabled,false);
  assert.equal(s.event?.id,EVENT_ID);assert.equal(s.event.partner_slug,'mvl-demo');assert.equal(s.event.status,'published');assert.equal(s.event.sponsorship_allocation,clinicAllowance());
  const remaining=Math.min(clinicAllowance(),s.screening.screenings_allowed-s.screening.screenings_used,s.event.sponsorship_allocation-s.eventConsumed);
  assert.ok(remaining>=1,'Clinic screening/event allowance exhausted');
  assert.ok(e.packet_cap-e.consumed>=1,'packet capacity exhausted');
  assert.equal(e.packet_cap-e.consumed,remaining,'packet capacity must match exact remaining synthetic allowance');
  return {remaining,packetCap:e.packet_cap,consumed:e.consumed,entitlementId:e.id};
}
