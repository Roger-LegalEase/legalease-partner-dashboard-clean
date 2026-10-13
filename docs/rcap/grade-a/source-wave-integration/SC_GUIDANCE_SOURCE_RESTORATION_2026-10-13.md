# South Carolina guidance source restoration

Run38418930836 passed the existing Master Library and September11 adoption
restoration, then refused the absent private SCCA-223A1 source in the existing
South Carolina guidance admission. That source is already indexed inside the
pinned Master Library downloaded by CI; no new archive, token or release is needed.

The exact PDF is 1,045,144 bytes, SHA-256
`3c3daacf4c246fe5f33f09b971948c489e1343076b5d0ddc47babf9a12cf15b7`.
The owner's Drive file `1bl1sHiSZvYfsvha6VOYLqECwibln9Fem` was downloaded through
authenticated custody and cryptographically verified. The independently supplied
output-workspace copy matches too. Filename/revision alone was not used as proof.

The transitive admission contains34 unique bound files, including exactly one
private source. The new restoration step authenticates bound JSON before following
its references, checks every private binding against the existing Master Library
index, and copies only exact bytes into ignored, untracked transfer destinations.
It refuses unknown mappings, changed bytes/pins, unsafe paths and overwrites.
All private sources must pass before any installation. Original PDF bytes remain
unchanged. The September adoption restorer and all existing source/approval pins
remain unchanged.

The exact source path within the Master Library is:
`STATES/SC/02_PACKET_FORMS/SC__FORM__SCCA-223A1__order-for-destruction-of-arrest-records__REV-2026-04__EN.pdf`.
Its admission destination is that path below
`private/transfers/sc-223a1-current-custody-20260914/`.

Run `python3 scripts/rcap-corpus/restore-sc-guidance-sources.py` after the existing
Master Library bootstrap. A local original can instead be supplied with
`--source-file /private/path/original.pdf`; exactly the same pins are required.
The10 focused guard tests cover exact restore/idempotence, differing revision or
length, preservation of existing files, all-private preflight, mismatched index,
conflicting/traversing references, authenticated JSON, symlinks and retained
runtime drift. The12 September restoration guards and106 readiness-summary
controls also pass. No source binary is committed.

Source restoration does not renew the independent guidance admission. Four
current runtime consumers differ from that admission's historical bindings:
`guidance-packet-registry.ts`, `packet-route-resolver.ts`, `job-contract.ts` and
`payment-adapter.ts`. The restoration report exposes all four; the unchanged
admission loader still refuses them. The first actual local admission refusal
after PDF recovery is the stale guidance-packet-registry binding. No approval
hash is rolled forward, guidance requirement removed or commercial authority
changed. The next exact-commit CI result is recorded in the existing private
`sc-guidance-source-restoration-20261013` evidence directory.
