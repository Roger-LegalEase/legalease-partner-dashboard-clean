import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';
const require = createRequire(import.meta.url);
const routePath = 'src/app/api/clinic/session/reset/route.ts';
export const baseline = process.env.RESET_BASE_SHA;
const source = baseline ? execFileSync('git', ['show', `${baseline}:${routePath}`], { encoding: 'utf8' }) : fs.readFileSync(routePath, 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
export function fixture({ database } = {}) {
  const state = { event:{partner_slug:'tenant-a',id:'event-a',public_slug:'test-clinic',status:'published'}, eventError:false, partner:null, staff:null, actor:null, queries:[], owner: 'participant-a', session: { created_at:new Date().toISOString(), id: 'session-a', event_id:'event-a', participant_user_id: 'participant-a', status: 'active', handoff_token_hash: sha('handoff-a'), device_nonce_hash: sha('device-a') }, rpcError: false, lookupError: false, lostCommit: false, result: 'ended', calls: 0, audits: 0, signoutError: false, authError: false, signouts: 0, signingKey: 'disposable-reset-signing-key' };
  const jar = new Map([['clinic_session', 'handoff-a'], ['clinic_device', 'device-a'], ['sb-test', 'auth-a']]);
  const db = database ?? {
    from(table) { const filters = []; const query = { select() { return query; }, contains(key, value) { filters.push([key, value]); return query; }, eq(key, value) { filters.push([key, value]); return query; }, async maybeSingle() {
      state.queries.push({table,filters});
      if(table==='partner_users'||table==='clinic_event_staff'){const row=table==='partner_users'?state.partner:state.staff;return {data:row&&filters.every(([k,v])=>Array.isArray(v)?v.every(x=>row[k]?.includes(x)):row[k]===v)?row:null,error:null};}
      if(table==='clinic_events')return {data:state.event,error:state.eventError?{message:'event lookup refused'}:null};
      if (state.lookupError) return { data: null, error: { message: 'lookup refused' } };
      return { data: filters.every(([key, value]) => state.session?.[key] === value) ? { ...state.session } : null, error: null };
    } }; return query; },
    async rpc(name, args) {
      assert.equal(name, 'clinic_end_assisted_session'); assert.equal(args.p_session_id, state.session.id); assert.equal(args.p_actor_user_id, state.actor ?? state.session.participant_user_id);
      state.calls++;
      if (state.rpcError) return { data: null, error: { message: 'closure refused' } };
      if (state.result !== 'ended') return { data: state.result, error: null };
      if (state.session.status === 'active') { state.session.status = 'reset'; state.audits++; }
      if (state.lostCommit) throw new Error('connection lost after commit');
      return { data: 'ended', error: null };
    }
  };
  const auth = { auth: { async getUser() { return { data: { user: [...jar.keys()].some(k=>k.startsWith('sb-')) ? { id: state.owner } : null }, error: state.authError ? {message:'auth unavailable'} : null }; }, async signOut() { state.signouts++; return { error: state.signoutError ? { message: 'signout failed' } : null }; } } };
  const runtimeProcess = {env: {NODE_ENV:'test', get SUPABASE_SERVICE_ROLE_KEY(){return state.signingKey}}};
  const recoveryModule = {exports:{}};
  new Function('require','module','exports','process',ts.transpileModule(baseline ? execFileSync('git',['show',`${baseline}:src/lib/clinic-mode/reset-recovery.ts`],{encoding:'utf8'}) : fs.readFileSync('src/lib/clinic-mode/reset-recovery.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,recoveryModule,recoveryModule.exports,runtimeProcess);
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'process', output)(name => {
    if (name.endsWith('/reset-recovery')) return recoveryModule.exports;
    if (name === 'next/server') return { NextRequest, NextResponse };
    if (name.includes('auth-server')) return { createServerSupabaseAuthClient: async () => auth };
    if (name === '@/lib/supabase/server') return { getSupabaseAdminClient: () => db };
    return require(name);
  }, module, module.exports, runtimeProcess);
  async function call(action, { deliver = true, extra = {}, origin = 'http://localhost' } = {}) {
    const response = await module.exports.POST(new NextRequest('http://localhost/api/clinic/session/reset', { method: 'POST', headers: { origin, 'content-type': 'application/json', cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }, body: JSON.stringify({ action, ...extra }) }));
    if (deliver) for (const cookie of response.cookies.getAll()) { if (cookie.maxAge === 0 || cookie.expires?.getTime() === 0) jar.delete(cookie.name); else jar.set(cookie.name, cookie.value); }
    return { status: response.status, cookies:response.cookies.getAll(), ...await response.json() };
  }
  return { state, jar, call, issueAtStart() { const proof=recoveryModule.exports.mintRecovery(state.owner,sha('handoff-a'),sha('device-a')); jar.set('clinic_reset_recovery',recoveryModule.exports.encodeRecovery(proof)); }, recovery:recoveryModule.exports, POST: module.exports.POST };
}
