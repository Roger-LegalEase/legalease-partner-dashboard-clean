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

## Update, same day: seven of eight chunks are here and verified

Drive access opened mid-session and the desktop route delivered. Both were used
for what each is good for, and the state is now:

- **Google Drive is reachable.** `get_file_metadata` and `download_file_content`
  both work against the toolkit id, and returned it correctly. But
  `download_file_content` returns the payload as **base64 through the
  conversation**, so a 29 MB part arrives as ~39 MB of context. That is not a
  viable transport for the eight parts, and it is a property of the tool rather
  than a permission gap. Metadata confirms the files: the toolkit reads 5,451
  bytes, `application/zip`, owned by roger@legalease.com.
- **Seven inner chunks arrived as direct uploads and every one verifies.**
  part01 through part07, each exactly 29,000,000 bytes, each matching its
  `chunk_sha256` in the manifest. Zero mismatches. They are staged unchanged in
  `private/corpus-recovery-parts/chunks/`.
- **The toolkit arrived too**, as a macOS-zipped copy: 9,163 bytes rather than
  the manifest's 5,451, because the archive carries `__MACOSX` resource forks
  and a `(1)` suffix. Its five real files are the expected ones, and its
  `CORPUS_PARTS_MANIFEST.json` is **content-identical to the repository's** on
  every part number, chunk length and digest — two independently transported
  copies of the manifest that agree. Its `REASSEMBLED_EXPECTED.sha256` names the
  same original digest.
- **`reassemble_corpus.py` was read before being run.** Standard library only,
  no network, no repository write, no corpus installation. It validates the
  manifest's identity constants, requires all eight outer ZIPs by exact name,
  checks each outer ZIP's size and digest, requires each to hold exactly its one
  expected member at the expected size, streams and hashes each chunk against
  `chunk_sha256`, checks the running total and the combined digest against the
  original, confirms the result is a ZIP, and publishes with `os.link` so it
  fails rather than overwrites. Inputs are kept; only its own temp file is
  removed.

### One file is missing, and that is the whole remainder

`Nationwide_Corpus_Recovery_Kit.part08.bin` — **25,260,257 bytes**, sha256
`57a3614a4bb3c32fdf7e5897971ccdb76339009cdc3c1253f45f151a40556fc4`.
(Its outer ZIP is `Nationwide_Corpus_Recovery_Kit_part08.zip`, 25,260,437 bytes,
`9efbde514296baa3476df562c6685e48ed9a2b79aa2c4d2f70166608ee26acf2`, Drive id
`1YJnkcukGZchGN64COzjWgDw_ZqRN2w70`.)

The arithmetic closes exactly: 203,000,000 bytes held + 25,260,257 owed =
228,260,257, the original's length to the byte.

### A note on which reassembly runs

The script takes outer ZIPs; what arrived are inner chunks. Given the eight
outer ZIPs it runs unchanged and that is the preferred path. Given eight
verified inner chunks instead, the same proof is available without the wrapper
check, which is a transport property and not a property of the payload: every
chunk is already verified against its own `chunk_sha256`, and the concatenation
is verified against `original_bytes`, `original_sha256` and `is_zipfile` exactly
as the script does. Concatenating inner chunks in manifest order IS the payload;
the prohibition is on concatenating the outer wrappers, which is a different
and wrong operation. Whichever arrives, nothing is repackaged.

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
