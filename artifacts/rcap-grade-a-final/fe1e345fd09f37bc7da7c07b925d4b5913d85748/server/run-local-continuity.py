import os
assert os.environ['NEXT_PUBLIC_SUPABASE_URL']=='http://127.0.0.1:54321'
assert os.environ['HOSTED_STRIPE_TEST_SECRET'].startswith('sk_test_')
assert os.environ['HOSTED_STRIPE_TEST_WEBHOOK_SECRET'].startswith('whsec_')
os.environ.update(STRIPE_SECRET_KEY=os.environ['HOSTED_STRIPE_TEST_SECRET'], STRIPE_WEBHOOK_SECRET=os.environ['HOSTED_STRIPE_TEST_WEBHOOK_SECRET'], NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED='false', RATE_LIMIT_HASH_SECRET='isolated-rcap-acceptance-rate-limit-hash-only', ENABLE_PARTNER_EMAIL_DELIVERY='true', PARTNER_EMAIL_PROVIDER='resend', PARTNER_EMAIL_API_BASE_URL='http://127.0.0.1:54326', RESEND_API_KEY='local-mailpit-only', PARTNER_EMAIL_FROM='noreply@example.test', OPENAI_API_KEY='rcap-isolated-provider-fixture', RCAP_CONSUMER_DELIVERY_ROUTE_STATE='staging_scoped', RCAP_CONSUMER_DELIVERY_STAGING_SCOPE='a2cd11d4-aa6b-466c-b336-a1958ff1cb0a', NODE_OPTIONS='--import=/workspaces/legalease-partner-dashboard-clean/artifacts/rcap-grade-a-final/ba81792225d6d82ef57c104061e9d5eb9d7db395/provider/live-provider-transport.mjs')
os.environ['NODE_OPTIONS'] += ' --import=/workspaces/legalease-partner-dashboard-clean/artifacts/rcap-grade-a-final/fe1e345fd09f37bc7da7c07b925d4b5913d85748/server/isolated-resume-mail-transport.mjs'
os.execvp('npx',['npx','next','start','--hostname','127.0.0.1','--port','3100'])
