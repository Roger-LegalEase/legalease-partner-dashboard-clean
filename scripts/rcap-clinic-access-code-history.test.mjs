import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {startEphemeralPg} from './lib/rcap-ephemeral-pg.mjs';

const source=fs.readFileSync('scripts/rcap-hosted-ms-clinic-preview-seed.mjs','utf8');
const base='84f0fe2ef1ab2072ebb452cab5fb025baaf079a7';
const ACCESS_CODE_ID='77000000-0000-4000-8000-000000000057';
const EVENT_ID='77000000-0000-4000-8000-000000000055';
const variables={ACCESS_CODE_ID,EVENT_ID,accessCodeHash:'a'.repeat(64)};
function accessSql(s) {
  const start=s.includes('      -- Preserve historical usage')?s.indexOf('      -- Preserve historical usage'):s.indexOf('      insert into public.clinic_event_access_codes');
  const fragment=s.slice(start,s.indexOf('      insert into public.partner_entitlement',start));
  assert.ok(start>=0 && fragment.includes('on conflict'));
  const rendered=vm.runInNewContext('`'+fragment+'`',variables);
  return `do $$declare v_access_uses integer; v_admin uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';begin ${rendered} end$$;`;
}
function readback(s,uses) {
  const start=s.indexOf('    && row?.access_code_id === ACCESS_CODE_ID');
  const end=s.indexOf('    && Number(row?.screenings_allowed)',start);
  return vm.runInNewContext('true '+s.slice(start,end),{ACCESS_CODE_ID,row:{access_code_id:ACCESS_CODE_ID,is_active:true,max_uses:2,uses_count:uses}});
}

test('actual seed SQL preserves new, unused, partial and exhausted access-code history in disposable PostgreSQL',()=>{
  const db=startEphemeralPg();
  try {
    // Only the access-code upsert and its atomic history guard are under test;
    // no auth, remote transport or full fixture seed is invoked.
    db.sql(`create table public.clinic_event_access_codes(
      id uuid primary key,event_id uuid,code_hash text,code_hint text,max_uses integer,
      uses_count integer not null default 0 check(uses_count>=0),starts_at timestamptz,
      expires_at timestamptz,is_active boolean,created_by uuid,updated_at timestamptz);`);
    const fixture=n=>{db.sql('truncate clinic_event_access_codes');if(n!==null)db.sql(`insert into clinic_event_access_codes(id,uses_count,max_uses,is_active) values('${ACCESS_CODE_ID}',${n},2,true)`);};
    const check=(s,n)=>{fixture(n);db.sql(accessSql(s));const r=db.json(`select to_jsonb(c) from clinic_event_access_codes c where id='${ACCESS_CODE_ID}'`);assert.equal(r.uses_count,n??0);assert.equal(r.max_uses,2);assert.equal(r.is_active,true);assert.equal(readback(s,r.uses_count),true);};
    for(const n of [null,0,1,2]) {check(source,n);db.sql(accessSql(source));assert.equal(db.scalar('select uses_count from clinic_event_access_codes'),String(n??0));}
    for(const n of [-1,3,1.5]) assert.equal(readback(source,n),false);
    const old=execFileSync('git',['show',`${base}:scripts/rcap-hosted-ms-clinic-preview-seed.mjs`],{encoding:'utf8'});
    // Reproduce the real Captain defect rather than label it pre-existing.
    assert.throws(()=>check(old,1));assert.throws(()=>check(old,2));
    for(const [prior,replacement] of [[1,0],[2,0],[2,1]]) {
      const mutant=source.replace('uses_count=public.clinic_event_access_codes.uses_count',`uses_count=${replacement}`);
      assert.notEqual(mutant,source);assert.throws(()=>check(mutant,prior));
      assert.equal(db.scalar('select uses_count from clinic_event_access_codes'),String(prior),'atomic refusal preserves history');
    }
    assert.throws(()=>check(source.replace('max_uses=2, uses_count=','max_uses=3, uses_count='),1));
    assert.throws(()=>check(source.replace('Number(row?.uses_count) >= 0','Number(row?.uses_count) === 0'),1));
  } finally {db.stop();}
});

test('packet capacity and non-replenishing screening authority remain unchanged',()=>{
  for(const p of ['scripts/rcap-clinic-packet-capacity.mjs','scripts/rcap-clinic-downstream-closure.mjs','scripts/test-rcap-sponsored-delivery-binding.mjs']) {
    let current=fs.readFileSync(p,'utf8');
    // The only successor change in the integration is the owner-authorized
    // indistinguishable denial assertion. Capacity/accounting proof is intact.
    if(p.endsWith('test-rcap-sponsored-delivery-binding.mjs')) current=current.replace(
      '!other.ok && other.status === 404 && other.code === "not_found" && other.message === "This packet does not exist."',
      '!other.ok && other.status === 403 && other.code === "unauthorized"');
    assert.equal(current,execFileSync('git',['show',`${base}:${p}`],{encoding:'utf8'}));
  }
  assert.match(source,/screenings_allowed=public\.partner_entitlement\.screenings_allowed/);
});

test('exact access-history tools overlay preserves prior receipts and refuses drift or execution',()=>{
  const root=process.cwd();
  // The completed overlay is historical after a pending source successor. Test
  // its exact accepted Captain bytes, without rewriting its signed hashes.
  const overlayBase='dc5124f99565baac004f1260e351209a4518ccf1';
  const historicalRead=p=>execFileSync('git',['show',`${overlayBase}:${path.relative(root,p)}`]);
  const text=historicalRead(path.join(root,'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs')).toString();
  const block=text.slice(text.indexOf('      const localRepairPaths = ['),text.indexOf('      const bounded = new Set(['));
  const currentBinding=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json'));
  const b=currentBinding.successorTools?currentBinding.supersededRecord:currentBinding;
  const prior=JSON.parse(execFileSync('git',['show',`${base}:data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json`],{encoding:'utf8'}));
  for(const k of ['localQueueLifecycleRepair','localClinicRuntimeRepair','localClinicDownstreamRepair'])assert.deepEqual(b[k],prior[k]);
  const verify=(binding,override)=>vm.runInNewContext(block,{binding,root,path,fs:{readFileSync:p=>override?.(p)??historicalRead(p)},createHash:crypto.createHash,generated:new Set(),execFileSync,git:a=>execFileSync('git',a,{encoding:'utf8'}).trim()});
  verify(b);
  for(const mutate of [x=>x.localClinicAccessHistoryRepair.executionAuthorized=true,x=>x.localClinicAccessHistoryRepair.pushAuthorized=true,x=>x.clinicDispatchReady=true,x=>x.localClinicAccessHistoryRepair.baseSha='0'.repeat(40),x=>delete x.localClinicAccessHistoryRepair.files['scripts/rcap-clinic-access-code-history.test.mjs'],x=>x.localClinicAccessHistoryRepair.files['src/app/page.tsx']='0'.repeat(64)]){
    const x=structuredClone(b);mutate(x);assert.throws(()=>verify(x));
  }
  for(const file of Object.keys(b.localClinicAccessHistoryRepair.files))assert.throws(()=>verify(b,p=>p===path.join(root,file)?Buffer.from('drift'):undefined));
});
