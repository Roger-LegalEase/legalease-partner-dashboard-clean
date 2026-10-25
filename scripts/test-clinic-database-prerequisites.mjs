import {CLINIC_FRESH_ATTEMPT} from './rcap-clinic-fresh-attempt.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { qualifyClinicDatabasePrerequisites, normalizeClinicPrerequisiteCatalog, CLINIC_PREREQUISITE_SQL } from './lib/rcap-clinic-database-prerequisites.mjs';
const contract = JSON.parse(readFileSync(new URL('./lib/rcap-clinic-database-prerequisite-contract.json', import.meta.url), 'utf8'));
function fixture() {
  const functions = new Map();
  for (const f of contract.functions) {
    if (!functions.has(f.name)) functions.set(f.name, { name: f.name, overloads: [] });
    functions.get(f.name).overloads.push({ ...structuredClone(f), service_execute: true });
  }
  return { functions: [...functions.values()], relations: structuredClone(contract.relations), relevant_history: [...structuredClone(contract.priorHistory), { name: 'rcap_clinic_app4feb_compatibility', version: '20261024233056', statements_md5: 'f54b99a6eafd72c4031a46639781b690' }], operational: {
    administrator_active: true, administrator_confirmed: true, participant_confirmed: true, staff_active: true, event_available: true, program_activation_authorized: true, screening_scope_authorized: true, packet_scope_authorized: true, sponsor_capacity_available: true, screening_capacity_available: true, screening_entitlement_present: true,
    existing_code_available: false, existing_code_inventory: CLINIC_FRESH_ATTEMPT.history.map(h=>({id:h.id,uses_count:h.usesCount,max_uses:h.maxUses,is_active:true,starts_at:h.startsAt,expires_at:h.expiresAt,redemption_rows:h.redemptionRows}))
  } };
}
const qualify = catalog => qualifyClinicDatabasePrerequisites({ catalog, projectRef: contract.projectRef, appSha: contract.appSha });
test('one management result normalizes; a complete contract retains exhausted-code facts without authorizing code use', () => {
  const data = fixture();
  assert.equal(normalizeClinicPrerequisiteCatalog([{ clinic_known_compatibility_prerequisites: data }]), data);
  const result = qualify(data); assert.equal(result.status, 'READY'); assert.equal(result.operational.codeIssuanceRequired, true);
  assert.throws(() => normalizeClinicPrerequisiteCatalog([data, data]));
});
test('aggregates missing overload, retry column and wrong unique index together', () => {
  const data = fixture();
  data.functions.find(f => f.name === 'claim_rcap_screening_session').overloads = data.functions.find(f => f.name === 'claim_rcap_screening_session').overloads.filter(f => !f.signature.endsWith('(text,text,text)'));
  const table = data.relations.find(t => t.name === 'public.screening_sessions'); table.columns = table.columns.filter(c => c.name !== 'entry_request_hash'); table.indexes.find(i => i.name === 'screening_sessions_entry_request_unique').definition = 'wrong';
  const result = qualify(data); assert.equal(result.status, 'BLOCKED'); assert(result.blockers.some(b => b.id.includes('claim_rcap_screening_session(text,text,text)'))); assert(result.blockers.some(b => b.id === 'relation:public.screening_sessions'));
});
test('changed security owner, volatility, body or execute permission is refused', () => {
  for (const [field, value] of [['owner', 'other'], ['volatility', 'v'], ['source_body_md5', '0'.repeat(32)], ['definition_md5','0'.repeat(32)], ['service_execute', false]]) {
    const data = fixture(); const fn = data.functions.find(f => f.name === 'rcap_clinic_case_materials').overloads[0]; fn[field] = value;
    assert.equal(qualify(data).status, 'BLOCKED', field);
  }
});
test('disabled preconsent trigger and missing accepted history fail closed', () => {
  const data = fixture(); data.relations.find(t => t.name === 'public.clinic_event_access_redemptions').triggers[0].enabled = 'D'; data.relevant_history = [];
  const result = qualify(data); assert(result.blockers.some(b => b.id === 'relation:public.clinic_event_access_redemptions')); assert(result.blockers.some(b => b.id === 'prior_migration_history')); assert(result.blockers.some(b => b.id === 'repair_migration_history'));
});
test('the actual installed repair identity and SQL receipt cannot be replaced by a well-shaped history row',()=>{
 for(const delta of [{version:'20261024235959'},{statements_md5:'a'.repeat(32)}]) {
  const data=fixture();Object.assign(data.relevant_history.at(-1),delta);
  assert(qualify(data).blockers.some(c=>c.id==='repair_migration_history'));
 }
});
test('all operational denials aggregate, including old-counter changes and source/project mismatch', () => {
  const data = fixture(); data.operational.administrator_confirmed = false; data.operational.sponsor_capacity_available = false; data.operational.existing_code_inventory[0].uses_count = 0;
  const result = qualifyClinicDatabasePrerequisites({ catalog: data, projectRef: 'wrong', appSha: 'wrong' });
  for (const id of ['project', 'application_source', 'operational:administrator_confirmed', 'operational:sponsor_capacity_available', 'historical_code_preserved']) assert(result.blockers.some(b => b.id === id), id);
});
test('optional Legal Aid table absence retains standard Clinic support; required tables do not', () => {
  const data = fixture(); data.relations.find(t => t.name === 'public.legal_aid_policy_profiles').present = false; assert.equal(qualify(data).status, 'READY');
  data.relations.find(t => t.name === 'public.clinic_cases').present = false; assert.equal(qualify(data).status, 'BLOCKED');
});
test('fixed read-only probes resolve absence before dynamic SELECT, and SQL emits no code secrets', () => {
  assert.match(CLINIC_PREREQUISITE_SQL, /begin transaction read only/i); assert.match(CLINIC_PREREQUISITE_SQL, /case when to_regprocedure\(signature\) is not null then/); assert.match(CLINIC_PREREQUISITE_SQL, /query_to_xml\(sql_text,false,false,''\)/);
  assert.doesNotMatch(CLINIC_PREREQUISITE_SQL, /\b(?:insert into|update public|delete from|create function|alter table)\b/i);
  assert.match(CLINIC_PREREQUISITE_SQL, /'existing_code_inventory'/); assert.match(CLINIC_PREREQUISITE_SQL, /nullif\(\(xpath/);
});

test('managed screening retains the admission function nullable allowance rule', () => { assert.match(CLINIC_PREREQUISITE_SQL, /'screening_entitlement_present',exists\(select 1 from public\.partner_entitlement where partner_slug='mvl-demo' and screenings_allowed is not null\) or exists\(select 1 from public\.partner_onboarding where partner_slug='mvl-demo' and operating_model='legalease_managed'\)/); });


test('all prerequisite callers preserve all three exact historical codes, validity and redemption accounting',()=>{
 for(const change of [d=>d.operational.existing_code_inventory.push({...d.operational.existing_code_inventory[0],id:'unexpected'}),d=>{d.operational.existing_code_inventory[0].redemption_rows=2;},d=>{d.operational.existing_code_inventory[1].expires_at='2030-01-01T00:00:00Z';},d=>{d.operational.existing_code_inventory[0].is_active=false;},d=>d.operational.existing_code_inventory.pop()]) {
  const data=fixture();change(data);assert(qualify(data).blockers.some(c=>c.id==='historical_code_preserved'));
 }
});
