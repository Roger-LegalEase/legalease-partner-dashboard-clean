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


## Runtime binding successor and factory environment

The original four consumer pins exactly match Git commit `20d26d6a3bd74521f7f400ca27d98f307fb8d7b6`. Their October 13 successors changed for these reasons:

| Consumer | Change since accepted source | SC verification |
| --- | --- | --- |
| guidance-packet-registry.ts | Confines component evidence paths to the declared repository locations. | All ten saved guidance records and twenty locale bundles remain exact. |
| packet-route-resolver.ts | Literal traceable JSON reads and a claimed-worker reconstruction entry point. | All ten original route objects remain exact; neither application nor claimed worker gains rendering authority. |
| job-contract.ts | Direct-artifact storage paths and claimed-worker routing purpose. | Both job-spec entry modes refuse all ten guidance tracks. |
| payment-adapter.ts | Shared checkout, readiness, recovery, catalog and promotion handling. | SC placeholders stay disabled; checkout, delivery, credit and commercial entry gates refuse. |

`SC_GUIDANCE_RUNTIME_SUCCESSOR_2026-10-13.json` supplements the original admission using the existing independent-review semantics. It binds an independently authored review and actual baseline/current replay results. The original legal/content approval, admission, measurements and runtime hashes remain unchanged. The loader checks historical consumer blobs against those original pins, current consumers and reviewed dependencies against the successor receipt, and all ten exact route objects and twenty bundle identities. The generator retains the original content-approval references; the supplemental receipt supplies current technical runtime proof. No new legal, language or commercial approval is represented.

Independent replay passed 150 baseline and 160 current assertions. Successor controls passed 45 checks including actual admission; source-restoration guards passed 10; readiness-summary controls passed 110. The baseline replay substitutes precisely the four historical consumer blobs while using current shared dependencies; it is not a reconstructed historical deployment.

Factory `validate` previously failed before generator work because neither Master Library environment binding existed. Its workflow now reuses the Source Conveyor's pinned corpus bootstrap, explicit `MASTER_LIBRARY_SOURCE_DIR` / `RCAP_BUNDLE_EXTRACT` validation and exact adopted/SC restoration steps before convergence. It also replays all ten SC guidance routes. Existing generator, clean-worktree, mutation and integrity requirements remain enforced.

The local full generator refuses because this Codespace has no mounted Master Library. No substitute root was supplied and no source recovery was repeated. Fresh CI supplies the already-authorized exact library; actual CI outcomes are recorded in the existing private checkpoint and closure matrix.
