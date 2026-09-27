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
  const state = { owner: 'participant-a', session: { id: 'session-a', participant_user_id: 'participant-a', status: 'active', handoff_token_hash: sha('handoff-a'), device_nonce_hash: sha('device-a') }, rpcError: false, lookupError: false, lostCommit: false, result: 'ended', calls: 0, audits: 0, signoutError: false };
  const jar = new Map([['clinic_session', 'handoff-a'], ['clinic_device', 'device-a'], ['sb-test', 'auth-a']]);
  const db = database ?? {
    from() { const filters = []; const query = { select() { return query; }, eq(key, value) { filters.push([key, value]); return query; }, async maybeSingle() {
      if (state.lookupError) return { data: null, error: { message: 'lookup refused' } };
      return { data: filters.every(([key, value]) => state.session[key] === value) ? { ...state.session } : null, error: null };
    } }; return query; },
    async rpc(name, args) {
      assert.equal(name, 'clinic_end_assisted_session'); assert.equal(args.p_session_id, state.session.id); assert.equal(args.p_actor_user_id, state.session.participant_user_id);
      state.calls++;
      if (state.rpcError) return { data: null, error: { message: 'closure refused' } };
      if (state.result !== 'ended') return { data: state.result, error: null };
      if (state.session.status === 'active') { state.session.status = 'reset'; state.audits++; }
      if (state.lostCommit) throw new Error('connection lost after commit');
      return { data: 'ended', error: null };
    }
  };
  const auth = { auth: { async getUser() { return { data: { user: jar.has('sb-test') ? { id: state.owner } : null }, error: null }; }, async signOut() { return { error: state.signoutError ? { message: 'signout failed' } : null }; } } };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'process', output)(name => {
    if (name === 'next/server') return { NextRequest, NextResponse };
    if (name.includes('auth-server')) return { createServerSupabaseAuthClient: async () => auth };
    if (name === '@/lib/supabase/server') return { getSupabaseAdminClient: () => db };
    return require(name);
  }, module, module.exports, { env: { NODE_ENV: 'test', SUPABASE_SERVICE_ROLE_KEY: 'disposable-reset-signing-key' } });
  async function call(action, { deliver = true, extra = {}, origin = 'http://localhost' } = {}) {
    const response = await module.exports.POST(new NextRequest('http://localhost/api/clinic/session/reset', { method: 'POST', headers: { origin, 'content-type': 'application/json', cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }, body: JSON.stringify({ action, ...extra }) }));
    if (deliver) for (const cookie of response.cookies.getAll()) { if (cookie.maxAge === 0 || cookie.expires?.getTime() === 0) jar.delete(cookie.name); else jar.set(cookie.name, cookie.value); }
    return { status: response.status, ...await response.json() };
  }
  return { state, jar, call, POST: module.exports.POST };
}
