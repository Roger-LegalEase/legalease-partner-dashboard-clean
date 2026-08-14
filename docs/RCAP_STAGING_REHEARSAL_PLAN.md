# RCAP Staging Rehearsal Plan — prepared, not run

The finite checklist that officially closes Milestone 1 gate item 1, using real
Supabase services. **Do not run any step until Roger grants the exact staging
authorization** (`preparedStagingAction` A1-staging in
`data/rcap-authorization-queue.json`). Local note: steps 4–13 may additionally
be rehearsed early against the shared local Supabase stack once the unified
migrations apply there — useful signal, but the staging run remains the
official closure.

1. **Apply the canonical migration sequence** to staging through the authorized
   process: `phase-49-rcap-packet-render-jobs.sql` then
   `phase-50-rcap-packet-delivery-hardening.sql`. Capture object presence for
   every table, function, trigger, index and role to the compliance package.
2. **Deploy the application** (the download route ships with the unification
   branch) and the **durable worker** per
   `docs/RCAP_RENDER_WORKER_DEPLOYMENT.md`, recording the image digest.
3. **Create real identities** with real Supabase Auth: participants A1 and A2
   sponsored by partner P1 (two people, one partner), participant B1 under
   partner P2, plus an expired session for A1 on a second device.
4. **Entitlements:** P1 active entitlement cap 2, overage 1; P2 cap 1.
5. **Render through the real worker:** enqueue matters for A1, A2 (P1) and B1
   (P2); confirm claim → render → upload → re-read → finalize on the real
   private bucket, `consumed` results, and ledger rows keyed on immutable IDs.
6. **Mobile download with real auth:** A1 signs in on a real phone browser,
   downloads, and the packet opens; `delivery_authorized`,
   `transmission_started`, `transmission_completed` recorded; job `delivered`.
7. **Repeat download:** A1 downloads again — zero additional consumption.
8. **Denials:** A2's session requests A1's job → 403; B1 requests A1's job →
   403; the expired session → 401; an anonymous request → 401.
9. **Final-unit hard-cap race:** two P1 matters finalize concurrently at the
   last unit — exactly one `consumed`/`overage_consumed` per the reserve, the
   loser `cap_reached` + `accounting_blocked`, its artifact evidence intact,
   its download refused (the cap-blocked valid artifact case).
10. **Corrupt or replace an object** in the bucket (admin console) — the
    download fails closed with `transmission_failed` evidence and the participant
    sees a clean error, not a wrong file.
11. **Abort a client download** mid-stream (large artifact or throttled
    network) — `transmission_aborted` recorded, never `transmission_completed`.
12. **Storage authority test with the intended worker credential:** second
    upload to the same path, update, delete, move, copy-over, delete-recreate,
    cross-partner read and write. Record which operations the credential can
    perform; if any mutation succeeds, the guarantee remains tamper-evidence
    and the least-privilege credential from the deployment spec becomes a
    launch blocker for the immutability wording — the delivery path is safe
    either way because every serve re-verifies bytes.
13. **Reconcile** ledger entries, job rows, bucket objects and delivery events
    1:1:1:n; any orphan fails the rehearsal.
