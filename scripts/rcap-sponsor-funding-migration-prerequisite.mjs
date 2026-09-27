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
export function prerequisiteSql() {
  return `begin transaction read only;
select jsonb_build_object('versions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations where version in (${PREREQUISITES.map(v=>`'${v}'`).join(',')})),
'functions',jsonb_build_object(${FUNCTION_GUARDS.map(([sig])=>`'${sig}',pg_get_functiondef('${sig}'::regprocedure)`).join(',')})) as evidence;
commit;`;
}
export function verifyMigrationPrerequisites(evidence, reviewedBodies) {
  assert.match(reviewedBodies?.sourceSha ?? "", /^[a-f0-9]{40}$/, "reviewed prerequisite-body receipt required");
  assert.deepEqual(evidence.versions, [...PREREQUISITES], 'all exact prerequisite migrations, in order, required');
  for (const [sig, guard] of FUNCTION_GUARDS) {
    assert.equal(typeof evidence.functions?.[sig], 'string', `missing prerequisite function ${sig}`);
    assert.ok(evidence.functions[sig].includes(guard), `unrecognized prerequisite body ${sig}`);
    assert.ok(!evidence.functions[sig].includes('allocate_clinic_packet_funding('), 'already transitioned body; do not replay migration');
    assert.equal(createHash('sha256').update(evidence.functions[sig]).digest('hex'),reviewedBodies.functionHashes?.[sig],`prerequisite full body differs from reviewed rehearsal: ${sig}`);
  }
  return { status:'PASS', prerequisiteSource:reviewedBodies.sourceSha, required:PREREQUISITES, next:MIGRATION,
    functionHashes:Object.fromEntries(FUNCTION_GUARDS.map(([sig])=>[sig,createHash('sha256').update(evidence.functions[sig]).digest('hex')])),
    disposition:'PREREQUISITE_ONLY; disposable target-copy rehearsal and authorized exact-source apply still required' };
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv[2]==='--sql')console.log(prerequisiteSql());
  else console.log(JSON.stringify(verifyMigrationPrerequisites(JSON.parse(fs.readFileSync(process.argv[2],'utf8')),JSON.parse(fs.readFileSync(process.argv[3],'utf8'))),null,2));
}
