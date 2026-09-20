# Recovering the Nationwide Record Clearing corpus

The 583 gathered files — 436 official PDFs and 147 reference documents across
all 51 jurisdictions — were assembled into `private/Nationwide Record
Clearing/`. `.gitignore` excludes `private/`, so the bytes have never been in
this repository and were never lost from it. What is committed is a complete
SHA-256 index of them:

```text
data/rcap-all50/nationwide-source-inventory.json
  generatedAt 2026-07-31T14:00:00Z
  sourceDir   /workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing
  51 jurisdictions, 583 files, all 583 with a recorded sha256
```

`/workspaces/` is the Codespaces mount point, so the corpus lived in a
Codespace. The build reads it through `RCAP_BUNDLE_EXTRACT`, never from git.

## Run this in the Codespace

```bash
cd /workspaces/legalease-partner-dashboard-clean
git pull
node scripts/rcap-corpus/verify-nationwide-corpus.mjs
```

It defaults to `private/Nationwide Record Clearing` under the repository root.
Elsewhere, pass `--root "/path/to/Nationwide Record Clearing"` — the external
drive included.

**`--root` is repeatable.** The corpus was split across sibling directories in
the Codespace, and neither copy is complete on its own: batch 2's manifest
holds 625 files but not one of Colorado's 39. A file counts as recovered when
any copy holds the exact indexed bytes, so passing every copy at once answers
the question that matters — between them, is anything still missing?

```bash
node scripts/rcap-corpus/verify-nationwide-corpus.mjs \
  --root "/workspaces/legalease-partner-dashboard-clean-document-delivery/private/Nationwide Record Clearing" \
  --root "/workspaces/legalease-partner-dashboard-clean-batch-2/private/Nationwide Record Clearing" \
  --json /tmp/corpus-report.json
```

The summary then reports how many files each copy supplied.

Every indexed file is reported as one of:

| | |
|---|---|
| **verified identical** | present, and the bytes hash to the indexed value |
| **MISSING** | not on disk |
| **CHANGED** | present, but not the indexed bytes |
| **no hash in index** | the 7 files indexed without a sha256 |

**CHANGED is the case that matters.** It looks like a successful recovery and
is not one. Either the file drifted, or the issuing court revised the form —
in which case every field map, census and fixture keyed to the old bytes now
describes a document that no longer exists. That is a finding, not a nuisance:
it is the difference between a packet that matches what the clerk expects and
one that does not.

Exit status is 0 only when nothing is missing and nothing changed, so this can
gate a later step.

## Getting the bytes out

```bash
# verify and archive in one pass; prints the archive's own sha256
node scripts/rcap-corpus/verify-nationwide-corpus.mjs --tar /tmp/nationwide-corpus.tgz

# full machine-readable report
node scripts/rcap-corpus/verify-nationwide-corpus.mjs --json /tmp/corpus-report.json
```

The corpus is ~191 MB, so the archive downloads comfortably from the
Codespace's file explorer.

## Why this keeps happening

A gitignored corpus behind an environment variable means the bytes live in
exactly one place at a time, and that place has been a Codespace, a session
scratchpad, and an external drive at different points. Each move was invisible
to the repository, because the repository only ever held receipts.

Once a verified copy is in hand, decide deliberately where it lives. At 0.13 GB
committing it outright is viable; Git LFS or a release asset also work. Any of
the three beats the current answer, which is that the only complete copy is
wherever it happens to be sitting.

## Which Codespace is it in?

If several Codespaces exist, the repository narrows it to one without guessing.
`nationwide-source-inventory.json` was generated at `2026-06-17T12:10:37Z` and
committed as `95ad8a35` two and a half minutes later, from the branch PR #9
merged as `feat/rcap-all50-qa-attorney-handoff`. Sibling commits run 12:13 to
12:37 — state pack batches one through three, then the QA attorney artifacts —
so that is one working session on one machine.

```bash
scripts/rcap-corpus/find-corpus-codespace.sh                 # rank only, starts nothing
scripts/rcap-corpus/find-corpus-codespace.sh --probe         # check best-first, stop at first hit
scripts/rcap-corpus/find-corpus-codespace.sh --probe --fetch # verify in place, archive, download
```

Listing is free. Probing uses `gh codespace ssh`, which starts a stopped
Codespace, so it is opt-in and ordered best-first to keep the number started as
small as possible. `--fetch` runs the verifier inside the Codespace before
downloading, so the archive is checked against the index while the bytes are
still next to it.

If nothing matches, the Codespace is gone and the gitignored corpus went with
it. The external drive is then the primary copy:

```bash
node scripts/rcap-corpus/verify-nationwide-corpus.mjs --root "/Volumes/<drive>/Nationwide Record Clearing"
```

## Recovering everything, not just the indexed files

`verify-nationwide-corpus.mjs` walks the committed index and asks whether each
of its 425 files is present. For recovery that is the wrong question. The index
is a snapshot, and gathering continues after each one. The index has been
regenerated eight times: 425 files on 2026-06-17, then 518, 557, 567, 568, 572,
582 and 583 through July and early August. A check driven by whichever snapshot
happens to be checked out cannot see what arrived after it, so it would report a
clean recovery while leaving newer files behind.

`inventory-nationwide-corpus.mjs` walks the directories instead and uses the
index only as a cross-check:

```bash
node scripts/rcap-corpus/inventory-nationwide-corpus.mjs \
  --root "/workspaces/legalease-partner-dashboard-clean-document-delivery/private/Nationwide Record Clearing" \
  --root "/workspaces/legalease-partner-dashboard-clean-batch-2/private/Nationwide Record Clearing" \
  --out   /tmp/nationwide-source-inventory.AUG.json \
  --stage /tmp/corpus-union \
  --tar   /tmp/nationwide-corpus.tgz
```

Every file found is captured whether or not anything knew about it, and each is
reported as one of:

| | |
|---|---|
| **matching the index** | known, and the bytes still agree |
| **CHANGED since the index** | known, but the bytes differ — revised or drifted |
| **not in the index at all** | gathered after 2026-06-17 |
| **still MISSING** | in the index, in none of the copies |

`--stage` assembles one deduplicated directory holding every recovered file, and
`--out` writes a fresh inventory in the committed schema so it can replace the
June one rather than sit beside it as a second artifact to reconcile.

Where two copies hold the same path with different bytes, the first root wins
and the disagreement is reported as a conflict. That is a fact worth seeing, not
a tie to break silently.

### Is there a later index already?

The newest index committed anywhere in this repository is 2026-07-31 (583
files), added by `1fd2e122`. It is not reachable from `main` or the national
checkpoint — it lives only on unmerged `feat/record-clearing-*` branches, which
is why a fresh checkout carries the June one. A later index generated in the
Codespace would be a derived artifact of the same generator against a later
corpus: a useful cross-check, not a prerequisite. To look for one:

```bash
find /workspaces -name "nationwide-source-inventory*.json" -not -path "*/node_modules/*" 2>/dev/null \
  -exec sh -c 'printf "%s  " "$1"; grep -o "\"generatedAt\"[^,]*" "$1" | head -1' _ {} \;
```

If one turns up, diff its file count against the `reconciliation` block this
tool writes. They should agree; if they do not, the corpus moved between them
and the difference is the thing to look at.
