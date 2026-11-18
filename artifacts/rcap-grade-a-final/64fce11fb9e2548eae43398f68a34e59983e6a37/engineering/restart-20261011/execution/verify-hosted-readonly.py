import concurrent.futures, datetime, json, os, subprocess, sys, urllib.error, urllib.request
from types import SimpleNamespace

host, expected_sha, output_path = sys.argv[1:]
paths = ['/internal/partners/onboarding', '/internal/partners/provisioning/new', '/api/internal/partners/onboarding/phase1/fresh-start-network/program', '/api/clinic/events', '/', '/sign-in', '/api/health', '/api/rcap/release', '/partner/onboarding', '/internal/partners/onboarding/fresh-start-network', '/clinic', '/partner/clinic', '/internal/clinic', '/api/internal/partners/onboarding/phase1/fresh-start-network/configuration']
if host.endswith('.vercel.app'): paths.append('/partners')
protected = {'/internal/partners/onboarding', '/internal/partners/provisioning/new', '/partner/onboarding', '/internal/partners/onboarding/fresh-start-network', '/partner/clinic', '/internal/clinic'}
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs): return None

def check(path):
    try:
        if os.environ.get('RCAP_USE_VERCEL_CURL') == '1':
            command = ['node', '/home/codespace/.npm/_npx/69f9afb961c37556/node_modules/vercel/dist/index.js', 'curl', path, '--deployment', 'https://' + host, '--scope', 'team_4qLmZK9WI6xIy5vjYC0IF3ae', '--', '--silent', '--show-error', '--max-time', '45', '--write-out', '\n__RCAP_METADATA__%{http_code}\n%{redirect_url}\n%header{x-vercel-id}']
            run = subprocess.run(command, cwd='/workspaces/rcap-grade-a-release-c63e420', capture_output=True, text=True, timeout=60, check=True)
            body, metadata = run.stdout.rsplit('\n__RCAP_METADATA__', 1)
            status, location, request_id = metadata.split('\n', 2)
            location = location.removeprefix('https://' + host) or None
            response = SimpleNamespace(status=int(status), headers={'location': location, 'x-vercel-id': request_id.strip()})
        else:
            request = urllib.request.Request('https://' + host + path, headers={'Cache-Control': 'no-cache'})
            try: response = urllib.request.build_opener(NoRedirect).open(request, timeout=45)
            except urllib.error.HTTPError as error: response = error
            body = response.read().decode('utf-8', errors='replace')
        result = {'path': path, 'status': response.status, 'location': response.headers.get('location'), 'requestId': response.headers.get('x-vercel-id'), 'serverError': 'Application error: a server-side exception' in body or 'INTERNAL_SERVER_ERROR' in body}
        passed = not result['serverError']
        canonical_redirect = host == 'www.legaleasepartner.com' and not path.startswith('/api/')
        if canonical_redirect:
            result['pass'] = passed and response.status == 308 and result['location'] == 'https://legaleasepartner.com' + path
            return result
        if path == '/' and host.endswith('.vercel.app'):
            passed = passed and response.status == 307 and result['location'] == '/partners'
        elif path in protected:
            passed = passed and response.status in (303,307,308) and (result['location'] or '').startswith('/sign-in?next=')
        elif path.endswith('/configuration') or path.endswith('/program') or path == '/api/clinic/events':
            passed = passed and response.status in (401,403)
        else:
            passed = passed and response.status == 200
        if path == '/api/rcap/release':
            release = json.loads(body)
            result['release'] = release
            passed = passed and release.get('buildSha') == expected_sha and release.get('runtimeSha') == expected_sha and release.get('sourceBound') is True and release.get('policyVersion') == 'rcap2.2'
        if path == '/api/health':
            health = json.loads(body)
            result['health'] = health
            passed = passed and health.get('ok') is True and health.get('checks', {}).get('db') == 'ok'
        if path == '/clinic':
            passed = passed and 'Open your Clinic event' in body
        if path == '/sign-in':
            passed = passed and 'type="email"' in body
        result['pass'] = bool(passed)
        return result
    except Exception as error:
        return {'path': path, 'pass': False, 'errorClass': type(error).__name__}

results = list(concurrent.futures.ThreadPoolExecutor(max_workers=5).map(check, paths))
report = {'host': host, 'expectedSha': expected_sha, 'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'authenticated': False, 'deploymentProtectionAccess': 'existing Vercel CLI access' if os.environ.get('RCAP_USE_VERCEL_CURL') == '1' else 'public', 'status': 'PASS' if all(row['pass'] for row in results) else 'FAIL', 'results': results}
with open(output_path, 'w') as output: json.dump(report, output, indent=2)
print(json.dumps(report, indent=2))
sys.exit(0 if report['status'] == 'PASS' else 1)
