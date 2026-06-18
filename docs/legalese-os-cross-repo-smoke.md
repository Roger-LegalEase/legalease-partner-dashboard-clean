# LegalEase OS Cross-Repo Smoke

This is a local-only smoke for proving the Expungement.ai / RCAP product exporter can send one safe signed LegalEase OS event to a running local LegalEase Command Center.

It is disabled by default and must never use production secrets.

## 1. Start Command Center locally

From the Command Center repo:

```bash
cd /Users/rogerroman/Dev/legalease-command-center
```

Start the local preview/server with the repo's normal local command and set a local-only test secret for LegalEase OS event verification.

Use a local test secret such as `local-os-smoke-secret`. Do not use a production secret.

Confirm the local Command Center health route works, then note the local port.

The event endpoint should be:

```text
http://localhost:<port>/api/os-loops/events
```

## 2. Run the product exporter smoke

From the product repo:

```bash
cd /Users/rogerroman/Dev/legalease-clean
RUN_LEGALEASE_OS_CROSS_REPO_SMOKE=true \
LEGALEASE_OS_EVENTS_ENABLED=true \
LEGALEASE_OS_EVENTS_ENDPOINT=http://localhost:<port>/api/os-loops/events \
LEGALEASE_OS_EVENTS_SECRET=local-os-smoke-secret \
npm test -- tests/legalese-os-cross-repo-smoke.test.ts
```

The smoke sends one event only:

```text
engine.health_changed
```

The payload uses a hashed local engine reference, `jurisdiction: ALL`, safe summary text, and `pii_classification: none`.

## 3. Verify Command Center receipt

In the local Command Center, sign in as owner/admin if required and check:

```text
GET /api/os-loops/diagnostics
GET /api/os-loops/evaluation-preview
POST /api/os-loops/materialize-review-items
GET /api/os-loops/review-items
```

Then confirm the read-only LegalEase OS loop surfaces show the local smoke item in Today, Command, and Queue.

## Safety Notes

The smoke must not include names, emails, phones, addresses, DOB, SSN, raw case facts, Wilma transcripts, raw packet content, payment identifiers, provider payloads, tokens, secrets, request bodies, or response bodies.

The smoke does not add product hooks, UI, migrations, or Command Center code.
