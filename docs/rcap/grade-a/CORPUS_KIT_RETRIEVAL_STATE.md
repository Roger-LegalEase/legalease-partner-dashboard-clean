# The recovery kit is nine Drive files away, and this session cannot open Drive

**Measured 2026-09-09.** Retrieval manifest read from
`Roger-LegalEase/legalease-source-artifacts` at commit
`b9fb030e97344cde8e63c0da186745e6a7ebfbcd`, path `corpus-recovery/`. Reading
that private repository worked; nothing else about the transport did.

## The two missing capabilities, named exactly

**1. No authenticated Google Drive download in this session.** The org has a
Google Drive connector installed, and it reports `enabledInChat: false` — its
tools are not loaded here, so no Drive call can be made at all. There is no
Drive credential in the environment (checked by variable name; no value was
read or printed), no `gdrive`, `rclone` or `gcloud` on PATH, and no
Drive-capable tool in this session's surface. The fix is a session setting, not
a new upload: enable Google Drive for this chat. No anonymous fetch was
attempted — a private Drive file does not answer one, and the manifest says so.

**2. This session's GitHub token cannot write to the source-artifacts
repository.** It reads it fine — this manifest was fetched with it — but the
repository reports `{"admin":false,"maintain":false,"push":false,"triage":false,
"pull":false}` for it. So even with the archive in hand, the release-asset
upload would be refused. That is a separate grant from the Drive one and both
are needed to finish the transport here.

## What is verified and ready, so the remaining work is one command each

Publication preconditions, checked now rather than at upload time:

- `Roger-LegalEase/legalease-source-artifacts` is **private** (`visibility:
  private`, not archived).
- Release `source-corpus-2026-08-28` exists, id `378805322`, not a draft.
- It carries four assets — the Master Library zip and its `.sha256`, the Oregon
  pack, and the recovery report — and **no asset named
  `Nationwide_Corpus_Recovery_Kit.zip`**. There is nothing to clobber.

Input directory prepared and confirmed git-ignored:
`private/corpus-recovery-parts/{parts,toolkit}`. Disk headroom is ~12 GB against
the ~460 MB the parts and the reconstructed original need together.

The guarded installer is `scripts/rcap-corpus/stage-nationwide-recovery-pool.mjs`.
It takes `--kit-root` and `--verify-only`, stages into
`private/source-imports/Nationwide_Recovery_Pool_2026-09-02`, refuses to run if
that path is not git-ignored, and refuses to write into the reserved operational
path `private/Nationwide Record Clearing` under any argument. It re-hashes every
staged file against `data/rcap-all50/nationwide-restore-manifest.json` and
deletes rather than stages a file that does not match.

## The nine files to fetch

Original: `Nationwide_Corpus_Recovery_Kit.zip`, 228260257 bytes,
`db8a02db11f3951dfffe34fa443d444d53ab4e09bce25767960905396a54f6f1`.

| # | file | bytes | sha256 | Drive file id |
|---|---|---:|---|---|
| 1 | Nationwide_Corpus_Recovery_Kit_part01.zip | 29000180 | `f211341f863cee8d998bb1a9…` | `1zIDnHlmHIMKaXcJI6vDAUQN1blpJmYgE` |
| 2 | Nationwide_Corpus_Recovery_Kit_part02.zip | 29000180 | `56800638be3a9fa8361e8b79…` | `1Qwzc3I00OS8LkCjremjYm6LdLynfKwr8` |
| 3 | Nationwide_Corpus_Recovery_Kit_part03.zip | 29000180 | `948c5495e784bd0cba34d095…` | `1Nhunk-uvu7Wm1vqmy1GC6ONCKL0MRnJ7` |
| 4 | Nationwide_Corpus_Recovery_Kit_part04.zip | 29000180 | `eed926986a5ea53fff58432f…` | `1KVXTzL7wCRLMLczdtKdcLEabeqxc2pvE` |
| 5 | Nationwide_Corpus_Recovery_Kit_part05.zip | 29000180 | `31656c391f5a7b4dd8c32d52…` | `1031nQoJv-iqAakNB-RfqU0xTJGAqd9xA` |
| 6 | Nationwide_Corpus_Recovery_Kit_part06.zip | 29000180 | `2083ba42ff113e2b0be3a0e4…` | `11r0TJY8GU3r3MvogkV8mgXo_vfzv3CAY` |
| 7 | Nationwide_Corpus_Recovery_Kit_part07.zip | 29000180 | `03ad6cc7eb12d1ad721d19cf…` | `19bCWAN63KjCb8Iv0ExoZw1KZHBK-EaEh` |
| 8 | Nationwide_Corpus_Recovery_Kit_part08.zip | 25260437 | `9efbde514296baa3476df562…` | `1YJnkcukGZchGN64COzjWgDw_ZqRN2w70` |
| toolkit | Nationwide_Corpus_Recovery_Kit_REASSEMBLY.zip | 5451 | `9b818086a1d5c341b90895a7…` | `12IJEkYM4_qI9_O6B93LbojhMGFwNywzY` |

Full digests are in the committed manifest at the pinned commit; the truncations
above are for reading, not for verification.

## The order the moment Drive opens

1. Download the nine into `private/corpus-recovery-parts/`, names unchanged.
   Verify every size and SHA-256 before anything else. A preview, an extracted
   text or a view-page HTML is not a ZIP.
2. Verify the toolkit against its hash, extract its five files into
   `toolkit/`, and READ `reassemble_corpus.py` before running it.
3. `python3 toolkit/reassemble_corpus.py --parts-dir <abs>/private/corpus-recovery-parts/parts`.
   Never concatenate the outer ZIPs; the payload is ordered inner chunks.
4. Confirm the reconstructed archive is exactly 228260257 bytes and hashes to
   `db8a02db11f3951dfffe34fa443d444d53ab4e09bce25767960905396a54f6f1`.
5. Publish it as a release asset, only after re-checking privacy and the
   absence of a same-name asset, and read the asset back before calling it
   GitHub-hosted.
6. Install through the guarded stager, then re-measure buildability. The kit is
   a PARTIAL recovery pool, not the Master Library and not the operational
   corpus: 513 of 583 files. It is not today's authoritative manifest by
   default, and installing it promotes nothing.

## What this is worth when it lands

Fifteen `SOURCE_READY` families have every bound source in that pool and can be
built the day it mounts; thirteen more are split across it and a mounted
custody. The arithmetic is in `WHAT_SOURCE_READY_MEANS_HERE.md`. FIX94 stopped
five Illinois families on this same blocker.

Source recovery is not a terminal promotion, and nothing here grants a packet
verdict, a source-edition approval or any production permission.
