# Source custody — Session 3

Custody's job is that every executable family's worker, and Sessions 9 and 10,
can reach the exact official bytes their asset identity names, proven by digest
rather than by filename.

## What the corpus actually is here

The work view indexed 686 corpus files across two roots and hash-verified 71 of
the 81 sources. In this clone:

| Corpus root | State |
| --- | --- |
| `private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1` | present, **4 files** |
| `private/Nationwide Record Clearing` | **absent** |

So 2 of the 71 hash-verified members are reachable and both were re-proven here
against their pinned identity — NC AOC-CR-296 and NC AOC-CR-298, digest and byte
length. The other 69 cannot be materialized from this machine: 54 need
`private/source-imports`, 15 need `private/Nationwide Record Clearing`. Custody
cannot produce bytes it does not hold, and will not substitute a same-named file
to close the gap.

## What is committed

- `data/rcap-all50/source-custody/source-custody-manifest.json` — for each of
  the 71, the member, the digest that proves it, its byte length, and the
  canonical private path it must occupy.
- `data/rcap-all50/source-custody/install-verified-sources.mjs` — the
  deterministic verifying installer.
- `data/rcap-all50/source-custody/unavailable-handoff.json` — the ten families
  custody cannot resolve, and what each one actually needs.

No official binary is committed by this lane at any path. `private/` is
gitignored and materialization happens there, which is where the platform-ready
gate's own `resolveSourceBinary()` already looks.

## The installer

```
node data/rcap-all50/source-custody/install-verified-sources.mjs            # dry run
node data/rcap-all50/source-custody/install-verified-sources.mjs --apply    # materialize
node data/rcap-all50/source-custody/install-verified-sources.mjs --family NC:aoc-cr-296-form-en
RCAP_CORPUS_ROOTS=/mnt/extra node data/rcap-all50/source-custody/install-verified-sources.mjs --apply
```

It indexes every reachable corpus file **by digest** and ignores filenames
entirely — the member is whatever hashes to the pinned identity, wherever it
sits and whatever it is called. It verifies byte length as well as digest,
re-reads its own copy and deletes it if the copy did not reproduce the digest,
and refuses to write anywhere outside `private/`. A refusal is never installed.

It is idempotent: a member already sitting proven at its destination reports
`already proven` and is not rewritten. Two consecutive `--apply` runs in this
clone produce identical output.

Run it rather than reaching into a corpus by hand. That is the whole point —
every lane then consumes the same bytes, proven the same way, and a worker never
has to decide for itself whether a file it found is the right one.

## The ten custody cannot resolve

Eight have no member matching their pinned digest in any accessible corpus:
AL CR-65, AL CR-65A, AR 3-misdemeanor petition, KY 497.2, KY JV-29, KY JV-29.1,
KY JV-30, VT 400-00171. Two have never had a digest recorded at all: NC CR297
and NE CC-6-11.

Custody will not re-pin a digest to make a family resolvable. A digest changed to
fit an available file stops being evidence of anything. The two unpinned families
need an authorised first pin from a named publisher retrieval, not a hash of the
nearest candidate. Details per family are in `unavailable-handoff.json`.
