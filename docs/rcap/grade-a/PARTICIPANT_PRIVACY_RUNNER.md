# Participant privacy execution

Local verification (disposable PostgreSQL, no hosted writes):

```sh
TMPDIR=/tmp/grade-a-tmp node scripts/verify-participant-data-rights.mjs --privacy-journeys
node --test scripts/rcap-participant-privacy-journeys.test.mjs scripts/rcap-hosted-participant-privacy.test.mjs
```

The shared driver executes real export, reauthentication, matter-deletion and
account-deletion routes locally. Hosted execution replaces the transport with
requests to the exact protected Preview. It independently reads owned matter
and Auth rows, and the deletion receipt, ordered step ledger, processor outcomes,
session-revocation marker and restoration barrier from the acceptance database.

Hosted entrypoint: `node scripts/rcap-hosted-participant-privacy.mjs`.
It requires a current `RELEASE_CANDIDATE_BINDING.json`, published worker digest,
exact READY nonproduction Preview metadata and separate synthetic write approval.
Publication approval does not authorize this runner.

Required environment: `HOSTED_APPLICATION_SHA`, `HOSTED_WORKER_DIGEST`,
`ACCEPTANCE_SUPABASE_PROJECT_REF`, `HOSTED_PREVIEW_DEPLOYMENT_ID`,
`HOSTED_PREVIEW_HOSTNAME`, `HOSTED_PRIVACY_WRITE_AUTHORIZATION`,
`HOSTED_PRIVACY_FIXTURE_PATH`, `HOSTED_PRIVACY_FIXTURE_SHA256`, `VERCEL_TOKEN`,
`VERCEL_AUTOMATION_BYPASS_SECRET`, and `SUPABASE_ACCESS_TOKEN`.
The authorization token must equal `privacy:<application-sha>:<deployment-id>`.
Only acceptance project `hyflxnlhpmiqxvvcoiia` is allowed.

The protected fixture JSON must contain `syntheticOnly: true`, `candidateSha`,
`projectRef`, `owner`, `peer`, `otherTenant`, `matterId`, and `remainingMatterId`.
Each actor requires a distinct UUID `id`, authenticated `cookie`, `password`, and
`tenant`. Owner and peer share a tenant; otherTenant must use a different tenant.
The owner must have both named matters; both neighbours must have existing
matters. Actor credentials and fixture files must remain private and untracked.
Provisioning these fixtures is a separate authorized operation.

The runner stops on any failed boundary or postcondition. Its evidence stores
case IDs, fixed observations and export hashes, without credentials or exported
contents. Failed request history may echo the exact foreign target ID supplied
by that same actor; no foreign matter record or other foreign content is allowed.

A completed run is original execution evidence, not independent acceptance.
Ledger completion does not independently prove every backing object, processor
system, backup restoration, mobile or accessibility obligation. Those proofs and
independent review remain required by the 35-obligation execution plan.
