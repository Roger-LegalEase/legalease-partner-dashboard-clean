# Legal design memo import — provenance and read-only status

This directory is an **import**, not a second editable source of truth.

| | |
|---|---|
| Source branch | `feat/record-clearing-production-integration` |
| Source commit | `3b6f4c10` |
| Files | 51 jurisdiction memos, plus `README.md` and `TEMPLATE.memo.json` |
| Tracks | 586 |

**Succession** with the source branch is proved by
`node scripts/verify-legal-design-memo-import.mjs`, which is in `npm test`. Each
memo is either byte-for-byte identical to the import, or carried forward from it
by exactly the commits `data/record-clearing/legal-design-memo-lineage.json`
records — and by no other commit. The import remains the identity root. Every
file's SHA-256 is recorded in
`data/rcap-ledger/all51-legal-authority-finalization.json` under `memoManifest`.

**A correction belongs upstream, in the memo lineage, and is then re-imported.**
Where that has not happened, the correction must be recorded in the lineage
record above, naming the exact commit that made it. An edit recorded nowhere
creates a second legal design of record, which is what the hash binding exists
to prevent; the control refuses one whether or not it restores the import.

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
