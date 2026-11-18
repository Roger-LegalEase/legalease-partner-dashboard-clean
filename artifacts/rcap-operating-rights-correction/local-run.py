import os, pathlib, subprocess, sys

values = dict(line.split('=', 1) for line in pathlib.Path('/workspaces/legalease-hotfix-runtime-20261006/.env').read_text().splitlines() if '=' in line)
env = dict(os.environ)
env.update({
    'NEXT_PUBLIC_SUPABASE_URL': 'http://127.0.0.1:54321',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': values['ANON_KEY'],
    'SUPABASE_SERVICE_ROLE_KEY': values['SERVICE_KEY'],
    'ENABLE_SUPABASE_PARTNER_DATA': 'true',
    'RCAP_PARTNER_ONBOARDING_ENABLED': 'true',
    'RCAP_ONBOARDING_PREFILL_ENABLED': 'true',
    'RCAP_ONBOARDING_LAUNCH_PREP_ENABLED': 'true',
    'RCAP_LAUNCH_STUDIO_ENABLED': 'true',
    'RCAP_2_0_ENABLED': 'true',
    'RCAP_PARTNER_LAUNCH_ENABLED': 'true',
    'RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION': 'release:' + subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN': 'http://127.0.0.1:3100',
    'NEXT_PUBLIC_APP_URL': 'http://127.0.0.1:3100',
    'NEXT_PUBLIC_PARTNER_APP_URL': 'http://127.0.0.1:3100',
    'NEXT_PUBLIC_EXPUNGEMENT_AI_URL': 'http://127.0.0.1:3100',
    'ENABLE_PARTNER_EMAIL_DELIVERY': 'false',
    'ENABLE_RCAP_CAPTCHA': 'false',
    'VERCEL_ENV': 'development',
    'RCAP_ACCEPTANCE_BASE_URL': 'http://127.0.0.1:3100',
    'RCAP_LOCAL_SCHEMA_FILE': str(pathlib.Path('artifacts/rcap-operating-rights-correction/local-schema-before.sql').resolve()),
})
raise SystemExit(subprocess.call(sys.argv[1:], env=env))
