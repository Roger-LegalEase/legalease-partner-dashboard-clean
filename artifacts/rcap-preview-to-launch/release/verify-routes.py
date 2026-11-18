import concurrent.futures, datetime, json, pathlib, re, subprocess, sys

host, sha, output = sys.argv[1:4]
protected = len(sys.argv) > 4 and sys.argv[4] == 'protected'
cli = '/home/codespace/.npm/_npx/cf16195db335a816/node_modules/.bin/vercel'
paths = {'/': [200, 307], '/sign-in': [200], '/api/health': [200], '/api/rcap/release': [200], '/partner/onboarding': [307], '/internal/partners/onboarding/fresh-start-network': [307], '/clinic': [200], '/partner/clinic': [307], '/internal/clinic': [307], '/api/internal/partners/onboarding/phase1/fresh-start-network/configuration': [401], '/api/internal/partners/onboarding/phase1/fresh-start-network/program': [401], '/partners': [200]}
def check(item):
    path, expected = item
    url = 'https://' + host + path
    cmd = ([cli, 'curl', url, '--scope', 'team_4qLmZK9WI6xIy5vjYC0IF3ae', '--'] if protected else ['curl', url]) + ['--silent', '--show-error', '--include', '--max-time', '45']
    p = subprocess.run(cmd, capture_output=True, text=True, cwd='/workspaces/rcap-rights-release-08f68583', timeout=60)
    raw = p.stdout.replace('\r\n', '\n')
    blocks = list(re.finditer(r'HTTP/\S+ (\d+)[^\n]*\n(.*?)\n\n', raw, re.S))
    if not blocks: return {'path': path, 'pass': False, 'error': 'No HTTP response', 'exitCode': p.returncode}
    block = blocks[-1]
    status = int(block[1]); body = raw[block.end():]
    headers = dict(line.split(':',1) for line in block[2].splitlines() if ':' in line)
    headers = {k.lower(): v.strip() for k,v in headers.items()}
    result = {'path':path, 'status':status, 'location':headers.get('location'), 'requestId':headers.get('x-vercel-id'), 'serverError': bool(re.search(r'Application error:|Internal Server Error|NEXT_REDIRECT.*Error',body)), 'pass':p.returncode==0 and status in expected}
    result['pass'] &= not result['serverError']
    # Existing canonical-host contract, also proven in the PR #262 live receipt.
    if host=='www.legaleasepartner.com' and not path.startswith('/api/'):
        result['pass'] = p.returncode==0 and not result['serverError'] and status==308 and result['location']=='https://legaleasepartner.com'+path
    if path in ('/api/health','/api/rcap/release'):
        try: payload = json.loads(body)
        except ValueError: payload = None
        result['payload'] = payload
        if path=='/api/health': result['pass'] &= bool(payload and payload.get('ok') and payload.get('checks',{}).get('db')=='ok')
        else: result['pass'] &= bool(payload and payload.get('sourceBound') and payload.get('buildSha')==sha and payload.get('runtimeSha')==sha)
    if status==307 and path!='/': result['pass'] &= bool(result['location'] and result['location'].startswith('/sign-in?next='))
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: results=list(pool.map(check, paths.items()))
data={'host':host,'expectedSha':sha,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'applicationAuthenticated':False,'access':'existing Vercel CLI' if protected else 'public','status':'PASS' if all(r['pass'] for r in results) else 'FAIL','results':results}
pathlib.Path(output).write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps({'host':host,'status':data['status'],'passed':sum(r['pass'] for r in results),'total':len(results),'failed':[r for r in results if not r['pass']]}))
sys.exit(0 if data['status']=='PASS' else 1)
