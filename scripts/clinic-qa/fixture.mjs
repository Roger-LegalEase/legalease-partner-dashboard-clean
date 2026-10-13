import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {sponsoredCounterRestoration} from './sponsored-cleanup.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
export function assertLocalTarget(value) {
  const url = new URL(value);
  assert(['http:', 'https:'].includes(url.protocol) && ['127.0.0.1','localhost','[::1]'].includes(url.hostname)
    && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash, 'Clinic QA requires an exact loopback origin');
  return url.origin;
}

/** Reuses Auth admin provisioning and partner_users, as the existing onboarding
 * journeys do. Administrative clients are confined to fixture setup/teardown.
 * All measured requests use ordinary sign-in and the resulting user session. */
export async function createClinicFixture(env = process.env) {
  const origin = assertLocalTarget(env.JOURNEY_BASE_URL);
  const supabaseUrl = assertLocalTarget(env.NEXT_PUBLIC_SUPABASE_URL);
  assert.equal(env.CLINIC_QA_ISOLATED, 'owner-authorized-synthetic-only');
  assert(!['production'].includes(env.VERCEL_ENV), 'Production execution is forbidden');
  const program = env.CLINIC_QA_PROGRAM;
  assert(/^(qa-|practice-|synthetic-|integrated-)[a-z0-9-]+$/.test(program ?? ''), 'An existing synthetic program is required');
  assert(/^[A-Z]{2}$/.test(env.CLINIC_QA_JURISDICTION ?? ''), 'Specify the program jurisdiction');
  const jurisdiction = env.CLINIC_QA_JURISDICTION;
  const container = env.CLINIC_QA_DB_CONTAINER;
  assert(/^[a-zA-Z0-9_-]+$/.test(container ?? ''), 'Specify the isolated PostgreSQL container');
  const port = env.CLINIC_QA_DB_PORT;
  const database = env.CLINIC_QA_DB_NAME;
  assert(/^\d{4,5}$/.test(port ?? '') && /^[a-zA-Z0-9_]+$/.test(database ?? ''));
  const sql = query => execFileSync('docker', ['exec','-i',container,'psql','-X','-h','127.0.0.1','-p',port,'-U','postgres','-d',database,'-Atq','-v','ON_ERROR_STOP=1'],
    {input:query,encoding:'utf8',maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
  const json = query => JSON.parse(sql(query));
  const admin = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
  const checked = result => {assert(!result.error, result.error?.code ?? 'Fixture database operation failed');return result.data;};
  const partner = checked(await admin.from('partner_records').select('id,partner_slug,partner_name').eq('partner_slug',program).single());
  assert(/synthetic|simulated|practice/i.test(partner.partner_name), 'Live participant programs are forbidden');
  assert.equal(json(`select to_jsonb(id) from partner_records where partner_slug=${literal(program)};`), partner.id, 'Auth/API and SQL must address the same database');
  assert(checked(await admin.rpc('rcap_program_screening_jurisdictions',{p_slug:program})).includes(jurisdiction));
  assert.equal(checked(await admin.rpc('rcap_partner_activation_for_launch',{p_slug:program})),true,'Reuse a properly configured synthetic program');
  const operator = checked(await admin.from('partner_users').select('auth_user_id').eq('role','internal_admin').eq('status','active').is('partner_slug',null).limit(1).single()).auth_user_id;
  const run = `clinic-qa-${randomUUID()}`;
  const known = new Set([run]);
  const actors = [];
  const allocationIds=new Set();
  // Snapshot row data stays in memory. Reports contain hashes/counts only, never
  // passwords, refresh tokens, existing participant data or service credentials.
  const tables = json(`select jsonb_agg(format('%I.%I',schemaname,tablename) order by schemaname,tablename) from pg_tables where schemaname in ('public','auth');`);
  const snapshot = () => Object.fromEntries(tables.map(table => [table,json(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from ${table} t;`)]));
  const storageBaseline=json(`select coalesce(jsonb_agg(to_jsonb(o) order by id),'[]') from storage.objects o;`);
  const baseline = snapshot();
  const beforeHash = hash(baseline);
  const authorizationSchema = () => json(`select jsonb_build_object(
    'functions',(select jsonb_agg(jsonb_build_object('identity',oid::regprocedure::text,'definition',pg_get_functiondef(oid),'acl',proacl) order by oid::regprocedure::text) from pg_proc where pronamespace='public'::regnamespace and proname like 'clinic_%'),
    'policies',(select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public' and tablename like 'clinic_%'),
    'rls',(select jsonb_agg(jsonb_build_object('table',relname,'enabled',relrowsecurity,'forced',relforcerowsecurity) order by relname) from pg_class where relnamespace='public'::regnamespace and relname like 'clinic_%' and relkind='r'));`);
  const schemaSha256=hash(authorizationSchema());
  const rpc = async(name,params) => checked(await admin.rpc(name,params));
  const fixture = {origin,supabaseUrl,program,partnerId:partner.id,jurisdiction,run,actors,admin,sql,checked,rpc,known,
    identity:{database,container,origin,supabaseUrl,programHash:hash(program),baselineSha256:beforeHash,authorizationSchemaSha256:schemaSha256},
    async simulatedAllocation() {
      assert.equal(env.CLINIC_QA_SIMULATED_ALLOCATION,'owner-authorized-run-scoped','Separate synthetic allocation authorization is required');
      const row=checked(await admin.from('partner_packet_entitlement').insert({partner_id:partner.id,
        packet_cap:4,overage_enabled:false,overage_cap:0,pause_at_cap:true,
        contract_note:`${run}: owner-authorized temporary simulated QA allocation; no payment or production authority`,
        expires_at:new Date(Date.now()+3600000).toISOString()}).select('id').single());
      known.add(row.id);allocationIds.add(row.id);
      return {status:'CREATED_SYNTHETIC_ONLY',cap:4,paymentCreated:false};
    },
    async user(label, role, slug=program) {
      if(slug!==program) {
        assert.equal(slug,env.CLINIC_QA_OTHER_PROGRAM,'Explicit synthetic negative-test program required');
        const other=checked(await admin.from('partner_records').select('partner_name').eq('partner_slug',slug).single());
        assert(/^(qa-|practice-|synthetic-|integrated-)[a-z0-9-]+$/.test(slug)&&/synthetic|simulated|practice/i.test(other.partner_name),'Negative actors also require a synthetic program');
      }
      const email = `${run}-${label}@example.test`, password = randomBytes(32).toString('base64url');
      known.add(email);
      const user = checked(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
      known.add(user.id);
      const actor = {id:user.id,email,password,label};actors.push(actor);
      if(role) actor.member = checked(await admin.from('partner_users').insert({auth_user_id:user.id,partner_slug:slug,role,status:'active',invited_email:email}).select('id').single()).id;
      return actor;
    },
    async event(staff) {
      const eventSlug = `${run}-${randomBytes(3).toString('hex')}`;known.add(eventSlug);
      const startsAt=new Date(Date.now()-60000).toISOString(),endsAt=new Date(Date.now()+3600000).toISOString();
      const id=await rpc('clinic_create_event',{p_actor_user_id:operator,p_partner_slug:program,p_public_slug:eventSlug,p_name:'Synthetic Clinic QA',p_starts_at:startsAt,p_ends_at:endsAt,p_timezone:'UTC',p_location_name:'Synthetic QA',p_geography:jurisdiction,p_capacity:8,p_sponsorship_allocation:4,p_jurisdiction:jurisdiction});known.add(id);
      const staffId=await rpc('clinic_set_event_staff',{p_actor_user_id:operator,p_event_id:id,p_partner_user_id:staff.member,p_status:'approved',p_permissions:['assist','queue']});known.add(staffId);
      const code=`CLINIC-${randomBytes(18).toString('hex').toUpperCase()}`;
      await rpc('clinic_create_access_code',{p_actor_user_id:operator,p_event_id:id,p_code_hash:createHash('sha256').update(code).digest('hex'),p_code_hint:code.slice(-6),p_max_uses:8,p_starts_at:startsAt,p_expires_at:endsAt});
      assert.equal(await rpc('clinic_set_event_status',{p_event_id:id,p_actor_user_id:operator,p_status:'published'}),'updated');
      return {id,eventSlug,staffId,code};
    },
    async assign(event, actor, permissions, status='approved') {
      return rpc('clinic_set_event_staff',{p_actor_user_id:operator,p_event_id:event.id,p_partner_user_id:actor.member,p_status:status,p_permissions:permissions});
    },
    async cleanup() {
      // First collect the exact run-owned delta, including transitive FK rows.
      // Any unrelated added/changed/deleted row refuses cleanup rather than
      // overwriting concurrent work. Only the independently attributed synthetic
      // program counter may be restored using a whole-row compare-and-swap.
      const stored=json(`select coalesce(jsonb_agg(to_jsonb(o) order by id),'[]') from storage.objects o;`);
      assert(storageBaseline.every(old=>stored.some(row=>hash(row)===hash(old))),'Pre-existing storage metadata changed');
      const newObjects=stored.filter(row=>!storageBaseline.some(old=>old.id===row.id));
      for(const object of newObjects) {
        assert(object.bucket_id==='rcap-packet-artifacts-private'&&[...known].some(id=>object.name.includes(id)),'Only exact run-owned packet objects may be removed');
        checked(await admin.storage.from(object.bucket_id).remove([object.name]));
      }
      assert.equal(hash(json(`select coalesce(jsonb_agg(to_jsonb(o) order by id),'[]') from storage.objects o;`)),hash(storageBaseline),'Private object baseline restored');
      const after=snapshot(),added=[];
      const counter=sponsoredCounterRestoration({before:baseline,after,program,partnerId:partner.id,
        actorIds:new Set(actors.filter(actor=>actor.label.startsWith('participant-')).map(actor=>actor.id)),knownIds:known,allocationIds});
      for(const table of tables){
        const old=new Set(baseline[table].map(hash)),now=new Set(after[table].map(hash));
        assert(baseline[table].every(row=>now.has(hash(row))||(counter?.table===table&&hash(row)===hash(counter.before))),`Cleanup refused: pre-existing ${table} rows changed`);
        for(const row of after[table])if(!old.has(hash(row))&&!(counter?.table===table&&hash(row)===hash(counter.after)))added.push({table,row});
      }
      const approved=new Set();let progress=true;
      while(progress){progress=false;for(const entry of added){if(approved.has(entry))continue;
        const bytes=JSON.stringify(entry.row);
        if([...known].some(value=>bytes.includes(value))){approved.add(entry);progress=true;
          for(const [key,value] of Object.entries(entry.row))if((key==='id'||key.endsWith('_id'))&&typeof value==='string'&&/^[0-9a-f-]{36}$/.test(value)){
            // Never acquire ownership of a referenced pre-existing object.
            if(!Object.values(baseline).some(rows=>rows.some(row=>row.id===value||row.session_id===value)))known.add(value);
          }
        }
      }}
      assert.equal(approved.size,added.length,'Cleanup refused: unrelated rows appeared during exclusive QA');
      // Only exact newly added rows, on this loopback isolated database, in one
      // transaction. Append-only audit triggers are bypassed ONLY for teardown;
      // all measured operations above retain ordinary RLS and triggers.
      const statements=added.map(({table,row})=>`delete from ${table} t where to_jsonb(t)=${literal(JSON.stringify(row))}::jsonb;`);
      const restoreCounter=counter?`do $clinic_counter_cleanup$ declare affected bigint; begin
        update public.partner_entitlement pe set screenings_used=${counter.before.screenings_used},updated_at=${literal(counter.before.updated_at)}
        where pe.partner_slug=${literal(program)} and to_jsonb(pe)=${literal(JSON.stringify(counter.after))}::jsonb;
        get diagnostics affected=row_count;
        if affected<>1 then raise exception 'Clinic program counter compare-and-swap refused'; end if;
        end $clinic_counter_cleanup$;`:'';
      sql(`begin; set local session_replication_role=replica; ${restoreCounter} ${statements.join('\n')} commit;`);
      assert.equal(hash(authorizationSchema()),schemaSha256,'Clinic authorization schema unchanged during measured run');
      const restored=snapshot();assert.equal(hash(restored),beforeHash,'Exact public/Auth row baseline restoration');
      return {status:'PASS',removedRows:added.length,baselineSha256:beforeHash,restoredSha256:hash(restored),identitiesRemoved:actors.length,privateObjectsRemoved:newObjects.length,storageBaselineSha256:hash(storageBaseline),programCounterRestoration:counter?{status:'RESTORED',delta:counter.delta,proofSha256:counter.proofSha256}:{status:'NOT_NEEDED'}};
    }
  };
  return fixture;
}
