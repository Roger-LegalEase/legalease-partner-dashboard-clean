# Recovering the Nationwide Record Clearing corpus

The 425 gathered files — 289 official PDFs and 136 reference documents across
all 51 jurisdictions — were assembled into `private/Nationwide Record
Clearing/`. `.gitignore` excludes `private/`, so the bytes have never been in
this repository and were never lost from it. What is committed is a complete
SHA-256 index of them:

```text
data/rcap-all50/nationwide-source-inventory.json
  generatedAt 2026-06-17T12:10:37Z
  sourceDir   /workspaces/legalease-partner-dashboard-clean/private/Nationwide Record Clearing
  51 jurisdictions, 425 files, 418 with a recorded sha256
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

The corpus is ~0.13 GB, so the archive downloads comfortably from the
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
