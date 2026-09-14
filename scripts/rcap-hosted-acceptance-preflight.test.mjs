#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(rootDir, "scripts/rcap-hosted-acceptance-preflight.mjs"), "utf8");
const hostedWorkflow = fs.readFileSync(path.join(rootDir, ".github/workflows/rcap-hosted-acceptance-staging.yml"), "utf8");
const dispatcherWorkflow = fs.readFileSync(path.join(rootDir, ".github/workflows/rcap-f1-ephemeral-staging.yml"), "utf8");

test("full preflight proves Preview isolation without reading Production values", () => {
  assert.match(source, /acceptanceProjectUrl: `https:\/\/\$\{ACCEPTANCE_PROJECT_REF\}\.supabase\.co`/);
  assert.match(source, /"acceptance_project_identity_is_exact"/);
  assert.match(source, /project\.name === "legalease-rcap-acceptance"/);
  assert.match(source, /project\.region === "us-west-2"/);
  assert.match(source, /project\.status === "ACTIVE_HEALTHY"/);
  assert.match(source, /"production_environment_shape_snapshotted_without_values"/);
  assert.match(source, /"preview_binding_is_per_deployment_only"/);
  assert.doesNotMatch(source, /acceptance_ref_disjoint_from_vercel_production/);
  assert.doesNotMatch(source, /acceptance_ref_absent_from_every_production_value/);
  assert.match(source, /requestedDecryption: false/);
  assert.match(source, /storedValuesRead: false/);
  assert.match(source, /productionValueDisjointness: "unproven_not_read"/);
  assert.doesNotMatch(source, /credentialled, reachable and demonstrably not production/);
});

test("Preview isolation proof inspects the actual deploy argument contract", () => {
  assert.match(source, /rcap-hosted-acceptance-deploy\.mjs/);
  assert.match(source, /const deployArgsLine = deploySource\.match/);
  assert.match(source, /args\.push\("--env"/);
  assert.match(source, /neverWroteProjectLevelEnv: true/);
  assert.match(source, /!deployArgsLine\.includes\('"--prod"'\)/);
  assert.match(source, /!deployArgsLine\.includes\('"alias"'\)/);
});

test("Supabase-only preflight neither requires nor accesses Vercel", () => {
  assert.doesNotMatch(source, /requiredCredentials\.push\(\["VERCEL_TOKEN"/);
  assert.match(source, /if \(SCOPE === "full"\) \{\s*const result = await resolvePreflightVercelIdentity/);
  assert.match(source, /if \(SCOPE === "full" && VERCEL_IDENTITY\) \{\s*const listing = await vercelApi/);
  assert.match(source, /if \(SCOPE === "full" && VERCEL_IDENTITY\) \{[\s\S]{0,500}const env = await vercelApi/);
  assert.match(hostedWorkflow, /VERCEL_TOKEN:\s*\n\s*required: false/);
  assert.match(dispatcherWorkflow, /VERCEL_TOKEN: \$\{\{ inputs\.mode == 'hosted_migrate' && 'not-used-in-supabase-only' \|\| secrets\.VERCEL_TOKEN \}\}/);
  const supabaseStep = hostedWorkflow.match(/- name: Prove acceptance Supabase credentials and project[\s\S]*?run: node scripts\/rcap-hosted-acceptance-preflight\.mjs/)?.[0] ?? "";
  const fullStep = hostedWorkflow.match(/- name: Prove credentials and Preview-only deployment boundary[\s\S]*?run: node scripts\/rcap-hosted-acceptance-preflight\.mjs/)?.[0] ?? "";
  assert.doesNotMatch(supabaseStep, /VERCEL_TOKEN/);
  assert.match(supabaseStep, /PREFLIGHT_SCOPE: supabase_only/);
  assert.match(fullStep, /VERCEL_TOKEN: \$\{\{ secrets\.VERCEL_TOKEN \}\}/);
  assert.match(fullStep, /PREFLIGHT_SCOPE: full/);
});

test("service-only exception cannot admit a mutation phase with changed worker inputs", async () => {
  const { spawnSync } = await import('node:child_process');
  const guarded = hostedWorkflow.slice(hostedWorkflow.indexOf('          if [ "${{ inputs.phase }}" != "preflight" ] && [ "${{ inputs.phase }}" != "vercel_identity" ]; then'), hostedWorkflow.indexOf('          git checkout --detach'));
  assert.ok(guarded.includes('git diff --quiet'));
  for (const phase of ['preflight','vercel_identity','deploy','replace_preview','accept','full','payment','browser','clinic_preview','clinic_migrate','migrate','stripe_retarget','checkout_gate','worker_contract','unknown']) {
    const script = 'set -e\ngit() { return 1; }\n' + guarded.replaceAll('${{ inputs.phase }}', phase).replaceAll(/\$\{\{ inputs\.[a-z_]+ \}\}/g,'a'.repeat(40));
    const result = spawnSync('bash',['-c',script],{encoding:'utf8'});
    assert.equal(result.status === 0, ['preflight','vercel_identity'].includes(phase),phase);
  }
});

test("preflight execution contract emits no mutation outputs", async () => {
  const { spawnSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const output = path.join(fs.mkdtempSync(path.join(tmpdir(),'rcap-preflight-contract-')),'outputs');
  const start = hostedWorkflow.indexOf("          PHASE='${{ inputs.phase }}'");
  const end = hostedWorkflow.indexOf('\n      - name: Retarget',start);
  const script = hostedWorkflow.slice(start,end).replace('${{ inputs.phase }}','preflight');
  const result = spawnSync('bash',['-c',script],{encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:output}});
  assert.equal(result.status,0,result.stderr);
  const fields = Object.fromEntries(fs.readFileSync(output,'utf8').trim().split('\n').map(line=>line.split('=')));
  assert.equal(fields.phase,'preflight');
  for(const key of ['deploy','matrix','gate','retarget','browser','clinic','diagnose','require_staging_scoped'])assert.equal(fields[key],'false',key);
  assert.match(hostedWorkflow,/Record worker rebuild requirement without accepting an image\n\s+if: inputs.phase == 'preflight'/);
  assert.match(source,/evidence\.workerRebuildRequired = plan\.rebuildRequired/);
  for(const key of ['applicationAccepted','workerImageAccepted','releaseAuthorityGranted'])assert.match(source,new RegExp(`evidence\\.${key} = false`));
});

test("network reads refuse redirects, expire, and never return raw failure bodies", async () => {
  const start=source.indexOf('async function boundedFetch(');
  const end=source.indexOf('async function supabaseApi(',start);
  const make = new Function('fetch','AbortSignal',source.slice(start,end)+'return safeResponse;');
  let observed;
  const fetchOk=async(url,options)=>{observed=options;return {status:403,json:async()=>({error:'SECRET_BODY'})}};
  const safe=make(fetchOk,AbortSignal);
  const result=await safe('https://api.vercel.com/v9/projects',{});
  assert.equal(observed.redirect,'error');assert.ok(observed.signal instanceof AbortSignal);
  assert.equal(result.status,403);assert.equal(result.text,'response body omitted');
  const failed=await make(async()=>{throw new Error('SECRET_TOKEN')},AbortSignal)('https://api.vercel.com',{});
  assert.deepEqual(failed,{status:0,json:null,text:'READ_FAILED_OR_TIMED_OUT'});
  assert.match(source,/\/env\?decrypt=false/);
  assert.doesNotMatch(source,/console\.error\(`PREFLIGHT: \$\{error\.message\}/);
  assert.match(source,/fetchImpl = boundedFetch/);
});

test("empty database proof refuses failed, missing, duplicate and invalid witness readback", () => {
  const start=source.indexOf('    const completePresence =');
  const end=source.indexOf('\n\n    // Emptiness',start);
  const evaluate=new Function('presence','PRODUCTION_WITNESS_TABLES','countReadSucceeded','counts','present','hasWitnesses','populatedParticipant',source.slice(start,end)+'return empty;');
  const tables=['a','b','c'];
  const presence={status:200,json:tables.map(table_name=>({table_name,present:0}))};
  const counts=tables.map(table_name=>({table_name,row_count:0}));
  const check=(p,c,ok=true)=>evaluate(p,tables,ok,c,tables,true,[]);
  assert.equal(check(presence,counts),true);
  assert.equal(check(presence,counts,false),false);
  assert.equal(check(presence,[]),false);
  assert.equal(check({...presence,json:[]},counts),false);
  assert.equal(check({...presence,status:403},counts),false);
  assert.equal(check(presence,[counts[0],counts[0],counts[2]]),false);
  assert.equal(check(presence,[...counts.slice(0,2),{table_name:'c',row_count:-1}]),false);
  assert.equal(check({...presence,json:[presence.json[0],presence.json[0],presence.json[2]]},counts),false);
  for(const row_count of [null, true, '', 'NaN', {}, 1.2, -1]) {
    assert.equal(check(presence,[...counts.slice(0,2),{table_name:'c',row_count}]),false);
  }
  // A synthetic marker cannot bypass incomplete witness readback.
  assert.match(source,/const clean = completePresence && completeCounts && \(empty \|\| markerValid\)/);
});

test("failed Vercel identity preserves independent Supabase proof and saved failed full receipt", async () => {
  const identityModule = await import('./rcap-hosted-acceptance-vercel-identity.mjs');
  const { tmpdir } = await import('node:os');
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  const executable = source.replace(/^#![^\n]*\n/,'').replace(/^import[\s\S]*?;\n/gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('./rcap-hosted-acceptance-preflight.mjs',import.meta.url).href));
  const run = new AsyncFunction('fs','path','fileURLToPath','prepareHostedAcceptanceEvidenceLayout',
    'HOSTED_VERCEL_PROJECT_NAME','HOSTED_VERCEL_TEAM_SLUG','hostedVercelScopedUrl','resolveHostedVercelIdentity','process','console','fetch',executable);
  for(const scenario of ['team401','team403','project404','team_missing','network','missing_token']) {
    const directory=fs.mkdtempSync(path.join(tmpdir(),'rcap-service-observability-'));
    const fakeProcess={env:{SUPABASE_ACCESS_TOKEN:'SYNTHETIC_SUPABASE_SECRET',VERCEL_TOKEN:scenario==='missing_token'?'':'SYNTHETIC_VERCEL_SECRET',ACCEPTANCE_SUPABASE_PROJECT_REF:'hyflxnlhpmiqxvvcoiia',PREFLIGHT_SCOPE:'full'},exit(code){if(!fs.existsSync(path.join(directory,'preflight.json')))throw new Error(`unexpected early exit ${code}`);this.exitCode=code;}};
    const calls=[],logs=[];
    const response=(body,status=200)=>new Response(JSON.stringify(body?.teams && !body.pagination ? {...body,pagination:{next:null}} : body),{status});
    const fetch=async(url,options)=>{
      calls.push(url);assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);
      if(url.startsWith('https://api.vercel.com')) {
        if(scenario==='network')throw new Error('SYNTHETIC_VERCEL_SECRET');
        if(url.includes('/v2/teams'))return scenario==='team401'?response({error:'SYNTHETIC_ERROR_SECRET'},401):scenario==='team403'?response({error:'SYNTHETIC_ERROR_SECRET'},403):response({teams:scenario==='team_missing'?[]:[{slug:'roger947s-projects',id:'team_test'}]});
        return response({error:'SYNTHETIC_ERROR_SECRET'},404);
      }
      if(url==='https://api.supabase.com/v1/projects')return response([{id:'hyflxnlhpmiqxvvcoiia',name:'legalease-rcap-acceptance',region:'us-west-2',status:'ACTIVE_HEALTHY'}]);
      const sql=JSON.parse(options.body).query;
      assert.match(sql,/^select /i);assert.doesNotMatch(sql,/\b(insert|update|delete|alter|create|drop)\b/i);
      if(sql.includes('current_database'))return response([{db:'acceptance'}]);
      if(sql.includes('to_regclass'))return response([...sql.matchAll(/\('([a-z_]+)'\)/g)].map(match=>({table_name:match[1],present:-1})));
      if(sql.includes('rcap_acceptance_environment_marker'))return response({error:'SYNTHETIC_ERROR_SECRET'},404);
      throw new Error('Unexpected query');
    };
    await run(fs,path,fileURLToPath,()=>({root:directory}),identityModule.HOSTED_VERCEL_PROJECT_NAME,identityModule.HOSTED_VERCEL_TEAM_SLUG,identityModule.hostedVercelScopedUrl,identityModule.resolveHostedVercelIdentity,fakeProcess,{log:(...x)=>logs.push(x.join(' ')),error:(...x)=>logs.push(x.join(' '))},fetch);
    const evidence=JSON.parse(fs.readFileSync(path.join(directory,'preflight.json'),'utf8'));
    assert.equal(evidence.passed,false,scenario);assert.equal(fakeProcess.exitCode,1,scenario);
    for(const gate of ['supabase_token_usable','acceptance_project_resolves','acceptance_project_identity_is_exact','acceptance_project_reachable_for_sql','acceptance_project_carries_no_production_data'])assert.equal(evidence.cases.verdicts[gate],true,`${scenario}:${gate}`);
    assert.equal(evidence.failedCases.length,4);
    const failure=evidence.cases.vercelIdentityFailure;
    const expected={team401:['VERCEL_TEAMS',401,'HTTP_UNAUTHENTICATED'],team403:['VERCEL_TEAMS',403,'HTTP_FORBIDDEN'],project404:['VERCEL_PINNED_PROJECT',404,'HTTP_NOT_FOUND'],team_missing:['VERCEL_TEAMS',200,'PINNED_TEAM_NOT_VISIBLE'],network:['VERCEL_TEAMS',null,'READ_FAILED_OR_TIMED_OUT'],missing_token:['NOT_REQUESTED',null,'MISSING_CREDENTIAL']}[scenario];
    assert.deepEqual([failure.endpoint,failure.httpStatus,failure.reason],expected);
    assert.ok(calls.some(url=>url.includes('/database/query')));
    assert.doesNotMatch(logs.join('\n')+JSON.stringify(evidence),/SYNTHETIC_(?:VERCEL|SUPABASE|ERROR)_SECRET/);
  }
});
