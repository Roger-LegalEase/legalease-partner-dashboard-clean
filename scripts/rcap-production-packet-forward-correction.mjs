import {fundingCatalogQuery, fundingSourcePrefix, expectedFundingCatalog} from './rcap-production-funding-dependency-contract.mjs';
// Source-derived forward delta generator plus bounded runtime authorization helpers.
// No credentials, network or apply entrypoint exists in this module.
import fs from 'node:fs';
import path from 'node:path';
import { packetApplicationTestDatabase } from './rcap-packet-database-reference.mjs';
import { packetCatalogQuery, normalizeCatalog, loadPacketContract, comparePacketCatalog, digest } from './rcap-packet-database-contract.mjs';
export const FIXTURE = 'scripts/fixtures/production-packet-forward-correction/captured-catalog.json';
export const stable = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v);
export const equal = (a,b) => stable(a) === stable(b);
export function readRaw(db) { return JSON.parse(db.sql(packetCatalogQuery()).trim().split('\n').at(-1)); }
export function captured(root) { return JSON.parse(fs.readFileSync(path.join(root,FIXTURE))).data[0].catalog; }
const quote = text => `'${text.replaceAll("'", "''")}'`;
export function catalogGate(expected,label) {
  const query = packetCatalogQuery().replace(/^set search_path = public, pg_catalog;\s*/, '').replace(/;\s*$/, '');
  return `do $catalog_gate$ declare actual jsonb; expected jsonb := ${quote(JSON.stringify(expected))}::jsonb; begin\nselect catalog into actual from (${query}) captured;\nif actual is distinct from expected then raise exception '${label}: %', (select string_agg(k, ', ' order by k) from (select jsonb_object_keys(actual) k union select jsonb_object_keys(expected)) keys where actual->k is distinct from expected->k); end if;\nend $catalog_gate$;`;
}
export function buildCorrection(root) {
  const prerequisites=correctionPrerequisites(root);
  const contract=loadPacketContract(root), before=captured(root);
  if(digest(fs.readFileSync(path.join(root,FIXTURE)))!=='e9a7851d04cd66a4f9fa2ff155bfeb7c8618fd34da1fc25e4bec83de20487dc6')throw new Error('capture_bytes_changed');
  for(const [name,hash] of Object.entries({'captured-canonical-matter.json':'0896b3b55638a7e1964aa1d333c0a6e8a77908b6c3ef744963689014257dff33','captured-canonical-matter-full.json':'91455142e0abe9a60eda8ee77e0110c2abd01910771caabe9e90bc6a13d86828'}))if(digest(fs.readFileSync(path.join(root,'scripts/fixtures/production-packet-forward-correction',name)))!==hash)throw new Error('canonical_capture_bytes_changed');
  const canonical=JSON.parse(fs.readFileSync(path.join(root,'scripts/fixtures/production-packet-forward-correction/captured-canonical-matter.json')));
  const canonicalSource=fs.readFileSync(path.join(root,'supabase/migrations/20260925134704_canonical_consumer_presentation_matter.sql'),'utf8');
  if(digest(canonicalSource)!=='378af4a07b2c02a5405eb5d9c02e4b2b47165485283deaeabeaf01c069f378bc')throw new Error('canonical_source_changed');
  const canonicalDdl=canonicalSource.slice(canonicalSource.indexOf('create or replace function'),canonicalSource.lastIndexOf('commit;')).trim();
  const canonicalFull=JSON.parse(fs.readFileSync(path.join(root,'scripts/fixtures/production-packet-forward-correction/captured-canonical-matter-full.json')));
  const fullGate=(expected,label)=>`do $full_gate$ declare actual jsonb; begin select to_jsonb(c) into actual from (${canonicalFull.query}) c; if actual is distinct from ${quote(JSON.stringify(expected))}::jsonb then raise exception '${label}'; end if; end $full_gate$;`;
  const canonicalBefore=canonical.data[0], canonicalAfter={...canonicalBefore,prosrc:canonicalDdl.split('$source$')[1]};
  const canonicalGate=(expected,label)=>`do $canonical_gate$ declare actual jsonb; begin select to_jsonb(c) into actual from (${canonical.query}) c; if actual is distinct from ${quote(JSON.stringify(expected))}::jsonb then raise exception '${label}'; end if; end $canonical_gate$;`;
  const db=packetApplicationTestDatabase(root);
  let after,canonicalFullAfter; try { after=readRaw(db); db.sql(canonicalDdl); db.sql('revoke all on function get_consumer_briefcase_presentation_source(uuid,uuid) from public, anon, authenticated;'); canonicalFullAfter=JSON.parse(db.sql(`select to_jsonb(c) from (${canonicalFull.query}) c`).trim()); } finally { db.stop(); }
  if(!equal(normalizeCatalog(after),contract.current))throw new Error('frozen_reference_drift');
  const changed=Object.keys(after).filter(key=>!equal(before[key],after[key]));
  if(changed.length!==19)throw new Error('captured_difference_scope_changed');
  // Preserve captured Clinic and erasure triggers outside this packet reference's scope.
  for(const key of Object.keys(before))if(!Object.hasOwn(after,key))after[key]=before[key];
  const statements=[`alter table public.packet_render_jobs add column retry_reconciliation_history jsonb not null default '[]'::jsonb;`];
  const functions=[];
  for(const key of changed.filter(key=>key.startsWith('functions:'))) {
    if(Object.keys(before[key]??{}).some(signature=>!Object.hasOwn(after[key],signature)))throw new Error('unexpected_function_overload');
    for(const [signature,fn] of Object.entries(after[key])) {
      const prior=before[key]?.[signature];
      if(equal(prior,fn))continue;
      functions.push(signature);
      statements.push(fn.definition.trim()+';');
      if(!prior || !equal(prior.execute,fn.execute) || prior.publicExecute!==fn.publicExecute) {
        statements.push(`revoke all on function public.${signature} from public, anon, authenticated, service_role, rcap_render_worker, rcap_packet_delivery;`);
        for(const [role,allowed] of Object.entries(fn.execute))if(allowed)statements.push(`grant execute on function public.${signature} to ${role};`);
        if(fn.publicExecute)statements.push(`grant execute on function public.${signature} to public;`);
      }
    }
  }
  statements.push(`alter table public.packet_render_jobs drop constraint packet_render_jobs_error_code_check;`);
  for(const name of ['packet_render_jobs_error_code_check','packet_render_jobs_retry_history_array'])statements.push(`alter table public.packet_render_jobs add constraint ${name} ${after['constraint:packet_render_jobs.'+name].definition};`);
  statements.push(after['trigger:packet_render_jobs.guard_packet_render_job_retry_history'].definition+';');
  const tables=[...new Set([...Object.keys(after).filter(key=>key.startsWith('table:')).map(key=>'public.'+key.slice(6)),...Object.keys(prerequisites.expected.relations).map(n=>'public.'+n)])].sort();
  const fundingGate=(value,label)=>`do $funding_gate$ declare funding_actual jsonb; begin select catalog into funding_actual from (${fundingCatalogQuery}) source; if funding_actual is distinct from ${quote(JSON.stringify(value))}::jsonb then raise exception '${label}'; end if; end $funding_gate$;`;
  const prerequisiteGate=label=>`do $prerequisite_gate$ declare prereq_actual jsonb; begin select to_jsonb(source) into prereq_actual from (${prerequisites.query}) source; if prereq_actual is distinct from ${quote(JSON.stringify(prerequisites.expected))}::jsonb then raise exception '${label}'; end if; end $prerequisite_gate$;`;
  const sql=[
    '-- REVIEW ONLY. No workflow invokes this file. Requires separate reviewed execution authorization.',
    '-- No historical migration replay, ledger adoption, row reconciliation, privilege broadening or customer transaction.',
    'begin;', "set local lock_timeout = '5s';", "set local statement_timeout = '60s';", 'set local search_path = public, pg_catalog;',
    `do $$ begin if current_user <> 'postgres' then raise exception 'correction_owner_refused'; end if; end $$;`,
    `select pg_advisory_xact_lock(724927100);`,
    `lock table ${tables.join(', ')} in access exclusive mode nowait;`,
    catalogGate(before,'packet_forward_precondition_changed'),
    canonicalGate(canonicalBefore,'canonical_forward_precondition_changed'),
    fullGate(canonicalFull.data[0],'canonical_full_precondition_changed'),
    prerequisiteGate('prerequisite_forward_precondition_changed'), fundingGate({},'funding_forward_precondition_changed'), fundingSourcePrefix(root),
    ...statements, canonicalDdl,
    canonicalGate(canonicalAfter,'canonical_forward_postcondition_failed'),
    fullGate(canonicalFullAfter,'canonical_full_postcondition_failed'),
    catalogGate(after,'packet_forward_postcondition_failed'),
    fundingGate(expectedFundingCatalog(root),'funding_forward_postcondition_failed'),
    prerequisiteGate('prerequisite_forward_postcondition_failed'),
    'commit;'
  ].join('\n\n')+'\n';
  return {sql,before,after,changed,functions,canonical,canonicalFull,canonicalFullAfter,canonicalDdl,canonicalBefore,canonicalAfter,fixtureSha256:digest(fs.readFileSync(path.join(root,FIXTURE)))};
}

// Runtime consumes the committed source-derived plan, never a locally generated
// database. Source generation/rehearsal remains an offline build-time operation.
export const CORRECTION_DIR = 'scripts/fixtures/production-packet-forward-correction';
export const AUTHORIZATION_PATH = 'data/rcap-production-forward-chain-migration-authorization.json';
export const fingerprint = value => 'sha256:' + digest(stable(value));
export const stateFingerprint = (packetCatalog, canonicalMatter, canonicalMatterFull, fundingCatalog = {}, prerequisites = {}) => fingerprint({packetCatalog,canonicalMatter,canonicalMatterFull,fundingCatalog,prerequisites});
export function correctionPrerequisites(root) {
 const capture=JSON.parse(fs.readFileSync(path.join(root,CORRECTION_DIR,'captured-funding-prerequisites.json')));
 if(capture.readOnly!==true || capture.projectRef!=='wwtwtsmywnckfkdaqqeg')throw new Error('forward_prerequisite_capture_invalid');
 const expected=structuredClone(capture.data[0]);
 for(const relation of Object.values(expected.relations))relation.columns.sort((a,b)=>a.name.localeCompare(b.name));
 return {query:capture.query.replace('order by a.attnum','order by a.attname'),expected};
}
export function loadCorrection(root) {
  loadPacketContract(root);
  const prerequisites=correctionPrerequisites(root);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,CORRECTION_DIR,'correction-manifest.json')));
  if(manifest.schemaVersion!=='rcap-production-packet-forward-correction/v1')throw new Error('forward_correction_manifest_invalid');
  const sql=fs.readFileSync(path.join(root,CORRECTION_DIR,'proposed-forward-delta.sql'),'utf8');
  if(manifest.sqlSha256!=='f1a25acf33bb202e990262427d58421180b300f17ed770b28bf7c185a484d6f3' || digest(sql)!==manifest.sqlSha256)throw new Error('forward_correction_sql_hash_mismatch');
  for(const entry of manifest.sources)if(digest(fs.readFileSync(path.join(root,entry.path)))!==entry.sha256)throw new Error('forward_correction_source_hash_mismatch');
  const canonical=JSON.parse(fs.readFileSync(path.join(root,CORRECTION_DIR,'captured-canonical-matter.json')));
  const canonicalFull=JSON.parse(fs.readFileSync(path.join(root,CORRECTION_DIR,'captured-canonical-matter-full.json')));
  if(stateFingerprint(captured(root),canonical.data[0],canonicalFull.data[0],{},prerequisites.expected)!==manifest.beforeFingerprint)throw new Error('forward_correction_capture_fingerprint_mismatch');
  const catalogs=[...sql.matchAll(/expected jsonb := '((?:''|[^'])*)'::jsonb/g)].map(m=>JSON.parse(m[1].replaceAll("''","'")));
  const rpc=[...sql.matchAll(/\bactual is distinct from '((?:''|[^'])*)'::jsonb/g)].map(m=>JSON.parse(m[1].replaceAll("''","'")));
  const funding=[...sql.matchAll(/funding_actual is distinct from '((?:''|[^'])*)'::jsonb/g)].map(m=>JSON.parse(m[1].replaceAll("''","'")));
  const fundingCapture=JSON.parse(fs.readFileSync(path.join(root,CORRECTION_DIR,'captured-funding-dependencies.json')));
  if(fundingCapture.readOnly!==true || fundingCapture.projectRef!==manifest.releaseTuple.productionProjectRef || fundingCapture.data[0].funding_table_exists!==false || !equal(fundingCapture.data[0].funding_function_signatures,[]))throw new Error('funding_capture_absence_invalid');
  const fundingFull=JSON.parse(fs.readFileSync(path.join(root,CORRECTION_DIR,'captured-funding-full.json')));
  if(fundingFull.readOnly!==true || fundingFull.projectRef!==manifest.releaseTuple.productionProjectRef || !equal(fundingFull.data,[{catalog:{}}]) || !fundingFull.query.includes(fundingCatalogQuery))throw new Error('funding_full_capture_invalid');
  const prerequisiteGates=[...sql.matchAll(/prereq_actual is distinct from '((?:''|[^'])*)'::jsonb/g)].map(m=>JSON.parse(m[1].replaceAll("''","'")));
  if(prerequisiteGates.length!==2 || prerequisiteGates.some(p=>!equal(p,prerequisites.expected)))throw new Error('forward_prerequisite_gates_invalid');
  if(funding.length!==2 || !equal(funding[0],{}) || !equal(funding[1],expectedFundingCatalog(root)) || manifest.fundingSourcePrefixSha256!==digest(fundingSourcePrefix(root)) || !sql.includes(fundingSourcePrefix(root)))throw new Error('funding_source_postcondition_mismatch');
  if(catalogs.length!==2 || rpc.length!==4
    || stateFingerprint(catalogs[0],rpc[0],rpc[1],{},prerequisites.expected)!==manifest.beforeFingerprint
    || stateFingerprint(catalogs[1],rpc[2],rpc[3],funding[1],prerequisites.expected)!==manifest.afterFingerprint
    || comparePacketCatalog(loadPacketContract(root).current,normalizeCatalog(catalogs[1])).length!==0)
    throw new Error('forward_correction_source_postcondition_mismatch');
  return {manifest,sql,canonical,canonicalFull,prerequisites};
}
export function requireForwardCorrectionAuthorization(root,release,plan=loadCorrection(root)) {
  const a=JSON.parse(fs.readFileSync(path.join(root,AUTHORIZATION_PATH)));
  if(a.schemaVersion!=='rcap-production-forward-chain-migration-authorization/v1'
    || a.status!=='authorized_readback_bound_forward_correction' || a.authorized!==true
    || a.recordedBy!=='Roger Roman' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(a.recordedAt??'') || !Number.isFinite(Date.parse(a.recordedAt))
    || !equal(a.phases,['forward_chain_migrate']) || a.dropAuthorized!==false
    || a.historicalReplayAuthorized!==false || a.ledgerAdoptionAuthorized!==false
    || a.authorizationReference!=='Before any future write, the correction must re-read Production and require an exact before-state fingerprint matching the captured state. If Production changes between readiness capture and apply, refuse rather than improvising.'
    || a.boundedProductionAuthorization!==release.productionAuthorization?.note)throw new Error('independent_forward_correction_authorization_missing');
  for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef'])
    if(a[key]!==release[key] || a[key]!==plan.manifest.releaseTuple[key])throw new Error('independent_forward_correction_release_mismatch:'+key);
  if(a.correction?.path!==CORRECTION_DIR+'/proposed-forward-delta.sql' || a.correction?.sha256!==plan.manifest.sqlSha256
    || a.readback?.beforeFingerprint!==plan.manifest.beforeFingerprint || a.correction?.afterFingerprint!==plan.manifest.afterFingerprint
    || !equal(a.readback?.sources,plan.manifest.sources.filter(s=>s.path.includes('/captured-'))))throw new Error('independent_forward_correction_readback_mismatch');
  return a;
}
