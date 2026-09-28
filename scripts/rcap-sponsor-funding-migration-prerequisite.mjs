#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export const PREREQUISITES = Object.freeze(['20260917090000','20260924120347','20260924172645']);
export const MIGRATION = 'supabase/migrations/20260927152649_clinic_packet_funding_choice.sql';
export const FUNCTION_GUARDS = Object.freeze([
  ['public.sponsored_packet_render_authority(text,uuid,uuid,uuid)', 'v_event.sponsorship_allocation <= 0'],
  ['public.enqueue_verified_sponsored_packet_render(text,uuid,uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,text,jsonb,jsonb)', '  insert into public.rcap_document_packets ('],
  ['public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)', '  -- The event allocation is a second, narrower cap around the partner usage'],
  ['public.finalize_packet_render_job(uuid,uuid,text,text,text,text,text,integer,integer,text)', '        if v_used < v_entitlement.packet_cap then'],
  ['public.record_consumer_packet_payment(uuid,text,integer,integer,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)', 'if coalesce(v_sponsored, false) then'],
]);
// One exact historical Acceptance chain, not an equivalence heuristic. These
// identities are receipts for the canonical SQL, never invented catalogue rows.
export const ACCEPTANCE_RECEIPTS = Object.freeze([
  {canonicalVersion:'20260917090000',ledger:'rcap_acceptance_clinic_migration_ledger',position:11,identity:'supabase/migrations/20260917090000_consumer_promotion_codes.sql',name:null,sha256:'27be177ca6f35e4dd3b0db56ccbc2f9fef4dd03b5108a8690b2bb8fd13299369',applicationSha:'8d9382b93ada32adf9e50dd7f52680f4f9fb7018'},
  {canonicalVersion:'20260924120347',ledger:'schema_migrations',position:null,identity:'20260924125910',name:'packet_delivery_dependency_and_retry_errors',sha256:'86991c0d5bd772fd40e244c31cd902c78a88c15491c224ef37d6a29576932795',applicationSha:null},
  {canonicalVersion:'20260924172645',ledger:'schema_migrations',position:null,identity:'20260924194249',name:'preserve_sponsored_regeneration_attribution',sha256:'af514f99b4aaca1d7f92c7eaaf6e6f12079919961fc5a0911caaef31b8c715d2',applicationSha:null}
]);
export function prerequisiteSql() {
  const versions=PREREQUISITES.map(v=>`'${v}'`).join(',');
  return `begin transaction read only;
select jsonb_build_object(
'projectRef','hyflxnlhpmiqxvvcoiia',
'catalogueRows',(select coalesce(jsonb_agg(jsonb_build_object('version',version) order by version),'[]'::jsonb) from supabase_migrations.schema_migrations where version in (${versions})),
'versions',(select coalesce(jsonb_agg(version order by version),'[]'::jsonb) from supabase_migrations.schema_migrations where version in (${versions})),
'acceptanceReceipts',(select coalesce(jsonb_agg(receipt order by receipt->>'canonicalVersion'),'[]'::jsonb) from (
 select jsonb_build_object('canonicalVersion','20260917090000','ledger','rcap_acceptance_clinic_migration_ledger','position',sequence_position,'identity',migration_path,'name',null,'sha256',sha256,'applicationSha',application_sha) as receipt
 from public.rcap_acceptance_clinic_migration_ledger where sequence_position=11
 union all
 select jsonb_build_object('canonicalVersion',case version when '20260924125910' then '20260924120347' else '20260924172645' end,'ledger','schema_migrations','position',null,'identity',version,'name',name,'sha256',encode(sha256(convert_to(array_to_string(statements,E'\\n'),'UTF8')),'hex'),'applicationSha',null)
 from supabase_migrations.schema_migrations where version in ('20260924125910','20260924194249')
) historical),
'functions',jsonb_build_object(${FUNCTION_GUARDS.map(([sig])=>`'${sig}',pg_get_functiondef('${sig}'::regprocedure)`).join(',')})) as evidence;
commit;`;
}
export function verifyMigrationPrerequisites(evidence, reviewedBodies) {
  assert.match(reviewedBodies?.sourceSha ?? "", /^[a-f0-9]{40}$/, "reviewed prerequisite-body receipt required");
  assert.ok(Array.isArray(evidence.catalogueRows),'raw catalogue row observation required');
  assert.deepEqual(evidence.versions,evidence.catalogueRows.map(row=>row.version),'claimed versions must equal observed catalogue rows');
  let proofForm,prerequisiteProofs;
  if(evidence.versions.length===0){
    assert.equal(evidence.projectRef,'hyflxnlhpmiqxvvcoiia','alternate proof is Acceptance-specific');
    assert.deepEqual(evidence.acceptanceReceipts,ACCEPTANCE_RECEIPTS,'complete exact ordered historical Acceptance chain required');
    proofForm='reviewed_alternate_receipts';
    prerequisiteProofs=evidence.acceptanceReceipts.map(receipt=>({canonicalPrerequisite:receipt.canonicalVersion,proofForm,canonicalCatalogueRowPresent:false,receipt}));
  }else{
    assert.deepEqual(evidence.versions,[...PREREQUISITES],'all exact prerequisite migrations, in order, required; partial/mixed proof refuses');
    assert.deepEqual(evidence.catalogueRows,PREREQUISITES.map(version=>({version})),'exact ordered catalogue rows required');
    proofForm='canonical_catalogue';
    prerequisiteProofs=PREREQUISITES.map(version=>({canonicalPrerequisite:version,proofForm,canonicalCatalogueRowPresent:true,catalogueVersion:version}));
  }
  if(evidence.proofForm!==undefined)assert.equal(evidence.proofForm,proofForm,'asserted proof form conflicts with observed history');
  for (const [sig, guard] of FUNCTION_GUARDS) {
    assert.equal(typeof evidence.functions?.[sig], 'string', `missing prerequisite function ${sig}`);
    assert.ok(evidence.functions[sig].includes(guard), `unrecognized prerequisite body ${sig}`);
    assert.ok(!evidence.functions[sig].includes('allocate_clinic_packet_funding('), 'already transitioned body; do not replay migration');
    assert.equal(createHash('sha256').update(evidence.functions[sig]).digest('hex'),reviewedBodies.functionHashes?.[sig],`prerequisite full body differs from reviewed rehearsal: ${sig}`);
  }
  return { status:'PASS', prerequisiteSource:reviewedBodies.sourceSha, required:PREREQUISITES, proofForm, prerequisiteProofs, observedCatalogueVersions:[...evidence.versions], next:MIGRATION,
    functionHashes:Object.fromEntries(FUNCTION_GUARDS.map(([sig])=>[sig,createHash('sha256').update(evidence.functions[sig]).digest('hex')])),
    disposition:'PREREQUISITE_ONLY; disposable target-copy rehearsal and authorized exact-source apply still required' };
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv[2]==='--sql')console.log(prerequisiteSql());
  else console.log(JSON.stringify(verifyMigrationPrerequisites(JSON.parse(fs.readFileSync(process.argv[2],'utf8')),JSON.parse(fs.readFileSync(process.argv[3],'utf8'))),null,2));
}
