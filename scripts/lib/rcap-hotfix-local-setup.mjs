// Disposable loopback harness only. Reuses original schema and service functions.
import fs from "node:fs";
import {execFileSync} from "node:child_process";
const container="rcap-master-hotfix-synthetic-20261008-db-1";
const sql=text=>execFileSync("docker",["exec","-i",container,"psql","-h","127.0.0.1","-p","55432","-U","postgres","-d","rcap","-v","ON_ERROR_STOP=1"],{input:text,stdio:["pipe","pipe","pipe"]});
const read=file=>fs.readFileSync(file,"utf8");
for(const file of ["supabase/partner-journey-os.sql","supabase/phase-18-rcap-wilma-intake.sql","supabase/phase-19-mississippi-document-generator.sql","supabase/phase-21-partner-auth-rls-foundation.sql","supabase/phase-22-enable-rls-rcap-user-profiles.sql","supabase/phase-28-rcap-record-audit-trail.sql","supabase/phase-35-rcap-partner-entitlement.sql"]) {console.log("Apply original",file);sql(read(file));}
const phase41=read("supabase/phase-41-rcap-partner-access-codes.sql");sql(phase41.slice(0,phase41.indexOf("-- 3. partner_access_codes.")));
for(const file of ["supabase/phase-42-partner-onboarding.sql","supabase/phase-43-rcap-partner-onboarding-phase1.sql","supabase/phase-44-rcap-onboarding-prefill.sql","supabase/phase-45-rcap-onboarding-artifacts.sql","supabase/phase-46-rcap-onboarding-media-contact-role.sql","supabase/phase-47-rcap-onboarding-launch-readiness.sql"]){console.log("Apply original",file);sql(read(file));}
for(const file of ["supabase/migrations/20260819120000_rcap_partner_provisioning.sql","supabase/migrations/20260822180000_rcap_prefill_reproposal.sql","supabase/migrations/20261007034510_onboarding_review_conflict_transport.sql"])sql(read(file));
// Upgrade function exports include the current atomic actor guards and review transport.
const functions=read("supabase/migrations/20260818202000_rcap_upgrade_02_functions.sql");
for(const name of ["rcap_service_assert_internal_actor","rcap_service_assert_partner_actor"]){const start=functions.indexOf("CREATE OR REPLACE FUNCTION public."+name+"(");const end=functions.indexOf("$function$;",start)+11;if(start<0||end<11)throw new Error("Missing existing actor function");sql(functions.slice(start,end));}
const entitlement=read("supabase/phase-50-rcap-packet-delivery-hardening.sql");const start=entitlement.indexOf("create table if not exists public.partner_packet_entitlement");const end=entitlement.indexOf(";",start)+1;if(start<0)throw new Error("Missing existing packet table");sql(entitlement.slice(start,end));
sql(`alter table public.partner_packet_entitlement enable row level security; grant usage on schema public,auth,storage to anon,authenticated,service_role; grant select on all tables in schema public to anon,authenticated,service_role; grant all on all tables in schema public to service_role; grant execute on all functions in schema public to service_role; grant usage,select on all sequences in schema public to service_role;`);
for(const file of ["supabase/proposals/rcap_launch_package_20261008.sql","supabase/proposals/rcap_launch_authority_20261008.sql"]){console.log("Apply authorized disposable proposal",file);sql(read(file));}
sql("notify pgrst,'reload schema';");console.log("Disposable local schema ready.");
