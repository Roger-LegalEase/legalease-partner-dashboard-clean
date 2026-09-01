# Legal design memo import — provenance and read-only status

This directory is an **import**, not a second editable source of truth.

| | |
|---|---|
| Source branch | `feat/record-clearing-production-integration` |
| Source commit | `3b6f4c10` |
| Files | 51 jurisdiction memos, plus `README.md` and `TEMPLATE.memo.json` |
| Tracks | 586 |

Byte-for-byte identity with the source branch is proved by
`node scripts/verify-legal-design-memo-import.mjs`, which is in `npm test`. Every
file's SHA-256 is recorded in
`data/rcap-ledger/all51-legal-authority-finalization.json` under `memoManifest`.

**Do not edit these files here.** A correction belongs upstream, in the memo
lineage, and is then re-imported. Editing in place would create a second legal
design of record, and the whole point of a hash-bound memo is that there is only
one.

The authority chain these memos sit at the head of:

```
legal-design memo
  -> approved legal track          legal-design-track-registry.json
  -> runtime pathway               src/lib/rcap-engine/compiled/profiles
  -> packet or process family      legal-design-packet-set-manifests.json
  -> source and components         legal-design-track-source-relationships.json
  -> technical artifact            packet proofs
  -> completed-output approval     data/rcap-authorization-queue.json
  -> launch graph                  data/rcap-ledger/launch-graph.json
```
