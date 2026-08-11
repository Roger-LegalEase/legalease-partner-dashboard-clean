# Official-Source Materialization — Pennsylvania and South Carolina

The E2 source-support audit found the tree carries **no official source
store**: every statutory and official-form citation across the eight E2 lanes
resolves to compiled profiles and ledger artifacts (secondary, repository-
derived descriptions), because nothing official exists in the tree to cite.
This store fixes that, starting with PA and SC.

Store root: `data/record-clearing/official-sources/<JUR>/`
— `manifest.json` (the contract) and `files/` (the bytes).
Verifier: `node scripts/verify-rcap-official-source-store.mjs` (not wired into
`package.json`; run it directly).

## What is materialized now, and what is provably not materializable from here

Everything assertable from committed repository evidence is materialized:

- **PA — 28 source entries** covering all 10 PA registry tracks: the five
  Title 18 statute texts whose legis.state.pa.us HTM file identities the
  registry itself carries (§ 9102, § 9122, § 9122.1, § 9122.2, § 9122.3),
  §§ 9122.5 and 6308 (identity only — the registry carries no HTM name, and
  the file name is deliberately not guessed), Pa.R.Crim.P. 320/490/790/791,
  and 17 checksum-pinned court/agency artifacts (490/790 orders and
  petitions, juvenile motion and order, four numbered UJS forms, PSP SP 4-170
  and DNA removal, three official web pages).
- **SC — 16 source entries** covering all 12 SC registry tracks: the six
  scstatehouse.gov chapter pages whose file identities the registry carries
  (t17c001, t17c022, t22c005, t34c011, t44c053, t56c005), Title 24 Ch. 19 and
  the predicate-offense sections (identity only), 2024 Act No. 111 § 20, and
  six checksum-pinned SCCA forms (223A1, 223A1(a), 223B1, 223D1, 223E, 492).

**The bytes themselves cannot be fetched from this environment**, and this is
verified, not assumed (2026-08-11):

- Every official host is refused by the network egress proxy —
  `www.legis.state.pa.us`, `www.scstatehouse.gov`, `www.pacodeandbulletin.gov`,
  `www.pacourts.us` all answered `EGRESS_BLOCKED` / CONNECT 403 to both curl
  and WebFetch. This is the same condition every E2 lane recorded.
- `private/Nationwide Record Clearing/` (the folder the checksums describe)
  was never committed to git on any ref.
- The repository has no GitHub releases, and its Actions history contains only
  CI verification runs — the backup zips are not retrievable through the
  GitHub API either. `scripts/fetch-codespace-backups.sh` states it must run
  on a machine with normal outbound internet.

Unofficial mirrors are **not** an acceptable substitute, and the verifier
enforces that: an `expectedUrl` outside the official host list fails the
build.

## The contract each entry carries

| Field | Meaning |
|---|---|
| `expectedSha256` / `expectedSizeBytes` | pinned from `data/rcap-all50/nationwide-source-inventory.json`, the sha256 inventory of the private source folder |
| `expectedUrl` | constructed from a file identity the registry itself carries; `urlConstructed: true`, unverified from this environment |
| `retrievalStatus` | `pinned_checksum_bytes_pending` (checksum known, bytes absent) → `materialized` (bytes present, hash-verified, dated); `identity_only_bytes_pending` when no checksum exists anywhere yet |
| `citedByTracks` | registry tracks whose authority or official-form refs name this source — every PA and SC track is covered by at least one entry |

Provenance anchors (`generatedFrom` hashes of the projection and the
inventory) are re-verified on every run, so the manifests cannot silently
drift from the evidence they were derived from.

## Completing the materialization (one authorized session with normal egress)

1. Obtain the bytes, either way:
   - run `bash scripts/fetch-codespace-backups.sh` on a laptop and extract the
     PA/SC folders from the backup zips (fastest — the checksums here were
     computed from exactly those bytes), or
   - download each entry from its official issuing body (the manifest's
     `expectedUrl` where present; resolve the noted identities otherwise).
2. Drop each file into `data/record-clearing/official-sources/<JUR>/files/`
   under its manifest `fileName`.
3. For each landed file, set `retrievalStatus: "materialized"`, fill
   `retrievedAt` (and the final URL for downloads; mark
   `urlVerifiedFromThisEnvironment: true` only if fetched from that URL).
   A downloaded file whose hash differs from the pinned checksum means the
   official source was revised since the June inventory — keep the new bytes,
   update the pin, and record the revision in `notes`.
4. `node scripts/verify-rcap-official-source-store.mjs` — it fails on any
   hash mismatch, status inconsistency, stray file, non-official host, or
   coverage gap.

## Known gap surfaced by the join

- **SCCA 223C (06/2024)** — Order for Destruction of Arrest Records under
  S.C. Code § 17-1-65: named by registry track `sc_17_1_65_handgun`, but
  **absent from the private-folder inventory** — there has never been a copy
  to checksum. It ships `identity_only_bytes_pending` and must be retrieved
  from sccourts.org.
- PA §§ 9122.5 and 6308, SC Title 24 Ch. 19, the SC § 16-x predicate
  sections and 2024 Act No. 111 likewise carry no file identity in the
  registry; their entries name the section and issuing body and leave the
  file identity to be resolved at retrieval rather than inferred.
