import pathlib,re,subprocess,json,hashlib
root=pathlib.Path('artifacts/rcap-grade-a-final/c6cf9a8070ae18e795d532c6d85ed205fcba591a/server')
command=['docker','exec','-i','legalease-hotfix-local-db-1','psql','-h','127.0.0.1','-p','55432','-U','postgres','-d','rcap','-v','ON_ERROR_STOP=1']
def run(sql):
 p=subprocess.run(command,input=sql,text=True,capture_output=True)
 if p.returncode: raise RuntimeError(p.stderr)
 return p.stdout
run('select 1 where current_database()=\'rcap\';')
files=['20260901130000_consumer_private_delivery.sql','20260901140000_tighten_consumer_artifact_authorization.sql','20260906130000_verified_artifact_regeneration.sql']
combined=[]
for name in files:
 s=(pathlib.Path('supabase/migrations')/name).read_text();combined.append(re.sub(r'(?m)^\s*(begin|commit);\s*$','',s))
s=pathlib.Path('supabase/migrations/20260924120347_packet_delivery_dependency_and_retry_errors.sql').read_text()
for name in ['requeue_retryable_packet_render_jobs','consumer_packet_artifact_provenance_immutable','publish_validated_consumer_render_artifact']:
 start=s.index('create or replace function public.'+name+'(')
 pattern=re.compile(r'\bas\s+(\$[a-zA-Z_]*\$)',re.I);m=pattern.search(s,start);end=s.index(m[1]+';',m.end())+len(m[1])+1
 combined.append(s[start:end])
combined.append("revoke all on function public.publish_validated_consumer_render_artifact() from public,anon,authenticated;grant execute on function public.publish_validated_consumer_render_artifact() to service_role;")
s=pathlib.Path('supabase/migrations/20260924161239_preserve_packet_publisher_attribution.sql').read_text();combined.append(re.sub(r'(?m)^\s*(begin|commit);\s*$','',s))
sql='begin;\n'+ '\n'.join(combined)+'\ncommit;\n'
(root/'local-existing-delivery-baseline.sql').write_text(sql)
result=run(sql);(root/'local-existing-delivery-baseline.log').write_text(result)
print('PASS restored existing private-delivery baseline locally; no proposed application migration and no Production write')
print(run("select proname,md5(prosrc) from pg_proc where proname in ('publish_validated_consumer_render_artifact','consumer_packet_artifact_provenance_immutable','requeue_retryable_packet_render_jobs');"))
