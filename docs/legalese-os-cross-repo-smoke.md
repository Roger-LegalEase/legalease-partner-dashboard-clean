# LegalEase OS Cross-Repo Smoke

This smoke verifies that the active app can send a signed, safe LegalEase OS event to a local Command Center.

It is skipped by default and should only be run with local synthetic data.

## Local Setup

1. Start the Command Center locally.
2. Configure the Command Center event ingestion secret with a local-only value:

   ```bash
   LEGALEASE_OS_EVENTS_SECRET=local-os-smoke-secret
   ```

3. In this app repo, run the opt-in smoke with the local Command Center endpoint:

   ```bash
   RUN_LEGALEASE_OS_CROSS_REPO_SMOKE=true \
   LEGALEASE_OS_EVENTS_ENDPOINT=http://localhost:3000/api/os-loops/events \
   LEGALEASE_OS_EVENTS_SECRET=local-os-smoke-secret \
   node scripts/test-legalese-os-cross-repo-smoke.mjs
   ```

4. In Command Center, confirm receipt through the fastest local signal available:

   - `/api/os-loops/diagnostics`
   - `/api/os-loops/evaluation-preview`
   - `/api/os-loops/review-items`
   - the local Today, Command, or Queue read-only OS loop surfaces

## Safety

- The smoke sends `engine.health_changed` only.
- The smoke uses `source_system: expungement_ai`.
- The smoke uses a hashed synthetic subject reference.
- The smoke does not include names, emails, phone numbers, addresses, DOB, SSN, raw facts, Wilma transcripts, packet content, payment identifiers, provider payloads, tokens, request bodies, or response bodies.
- The smoke does not run unless `RUN_LEGALEASE_OS_CROSS_REPO_SMOKE=true`.
- Normal tests do not contact Command Center.
