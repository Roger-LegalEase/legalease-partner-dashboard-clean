# V4_INDEPENDENT_PACKET_VERIFICATION — CONTINUATION

**Status of the previous run:** ENVIRONMENT_BLOCKED — RETRY REQUIRED
**Branch (unchanged):** `codex/v4-independent-packet-verification`
**Previous return:** `ed8176e98344d715040bfdaeaacb684ef04aec2e`
**Families (unchanged, 6):**

- `ca-1203-42-set`
- `nj_arrest_no_conviction-set`
- `oh_marijuana_expungement-set`
- `sd_arrest_expungement-set`
- `ut_pet_traffic-set`
- `wa_vac_survivor_felony-set`

## Why this is a continuation and not a new assignment

Every row this shard returned was `BLOCKED_SOURCE`: `MASTER_LIBRARY_SOURCE_DIR` was
unset, the default private master-library root was absent, and no pinned source
bound, so every observed SHA-256 was null. That is a record about the
environment, not about the packets. Nothing was verified, and nothing was
disproved.

The family list above is the one this shard's own return carries. It is not
re-derived, because re-deriving it would change what is verified on retry
without anyone deciding to.

## Before any command runs

1. MASTER_LIBRARY_SOURCE_DIR is set and resolves to the private Master Library root in the executing environment.
2. At least 4096 MiB of free disk before any command runs, per WEC-2.
3. node scripts/verify-packet-build-environment.mjs --family <familyId> returns something other than PACKET_BUILD_ENVIRONMENT_NOT_READY for the shard's first family.

If the precondition check fails, return `BLOCKED_SOURCE` again with the observed
environment and stop. Do not report a verdict you could not observe: a second
identical environment stop is a Captain problem, not a worker one.

## What a verdict requires

Each family's proof obligations are the ones the previous return already
enumerated. A family passes only when every obligation is observed, each with the
file it was observed in. A single unbound source is a ROW stop, and the shard
continues to its next family.

## What finishing does not do

A PASS here proves a packet was built and verified as specified. It opens no
commercial route, approves no output and creates no fulfillment record.

**COMMERCIAL ROUTES OPENED: 0 · PRODUCTION TOUCHED: NO**
