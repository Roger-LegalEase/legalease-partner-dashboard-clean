# The Colorado supplement

`source-corpus-2026-08-28` is pinned: an archive digest, 51 jurisdictions, 499
files, 329 PDFs, and a per-file index that every downstream field map, census and
fixture is keyed to. It is also incomplete for Colorado.

The issuing court's own guides say so. Both are in the pinned corpus, and both
were read from it rather than from anybody's summary:

| Guide | Step 3, "File the Request" | In the corpus | Absent |
|---|---|---|---|
| JDF 611 (R: August 7, 2024) | JDF 612, **JDF 613**, **JDF 614**, JDF 615 | 612, 615 | **613, 614** |
| JDF 416 (R: July 1, 2025) | JDF 417, JDF 418, **JDF 419**, **JDF 435** | 417, 418 | **419, 435** |

Both guides also name **JDF 205** and **JDF 206** under "Filing Fees", and the
juvenile remedy's only petition, **JDF 302**, is absent as well. Seven documents,
and no Colorado filing set is complete without them.

An eighth was added by the captain, and it is different in kind. **JDF 611 is in
the corpus** — at R: August 7, 2024. While resolving the filing set this lane
established that the court has since issued **R: July 1, 2025**. Grade-A source
provenance may not keep binding a superseded guide once the current one has been
identified, and the guide is what tells a participant which forms to file and how
far to complete each one. So the current revision joins the acquisition scope,
installing **beside** the pinned copy rather than over it. Eight documents.

## Why a supplement and not a new corpus

Adding the eight to the base release would mean republishing
`source-corpus-2026-08-28` under its own tag. That moves the pin underneath
everything keyed to it, silently: the digest that used to identify a known
corpus now identifies a different one, and every record that cited it is wrong
without saying so. The pinned release is immutable, so the eight arrive with
their own identity instead.

The supplement installs into **its own root**, not into the base tree:

```
private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1   base, 51/499/329
private/source-imports/Expungement_AI_RCAP_CO_Supplement_2026-08-29   supplement
```

That is deliberate. `bootstrap-private-corpus.sh` asserts exactly 51 / 499 / 329
and fails on any other count. Extracting the supplement into the base tree would
either break that assertion or force it to be loosened, and a loosened invariant
is how a corpus stops being pinned. Separate roots keep the base byte-identical
to the release whichever bootstrap runs first, and
`bootstrap-colorado-supplement.sh` re-counts the base afterwards to prove it.

Nothing shadows anything: no supplement path exists in the base corpus, and no
base file carries a supplement document id under any revision — with exactly one
exception, JDF 611, which is a **declared supersession** rather than an accident.

A supersession is not a hole in the disjointness rule; it is a narrower rule. The
verifier accepts an identity collision only when the document declares, in full,
which base file it stands against, and then checks that declaration against the
corpus on disk: the named base file must exist, must hash to the digest recorded
for it, must be the copy actually carrying that identity, and the superseding
revision must be strictly newer. The superseding copy may not claim the pinned
document's own path, and a declaration that says the base copy does not remain is
refused outright — the pinned bytes are never removed. Seven mutations in
`test-colorado-supplement.mjs` break each of those in turn and require a red.

`verify-colorado-supplement.mjs` re-checks all of it whenever the base is mounted,
so that stays a measured property rather than a claim in a README.

## The two JDF-611 filings

JDF 611 names four filings. Two of them — a notice and a second order — were
carried as unresolved, on the report that the guide's digits do not survive text
extraction.

They are resolved, by rendering page 1 of the pinned guide at 300 dpi and reading
the block:

```
JDF 612    Motion
JDF 613    Order (just do §§ A-C)      <- the second order
JDF 614    Notice (Just do §§ A-C)     <- the notice
JDF 615    Order (just do §§ A-C)
```

`JDF 613` is **Order Denying Request to Seal Conviction Records** and `JDF 614`
is **Order and Notice of Hearing to Seal Conviction Records**. The set carries
two proposed orders because the movant files both outcomes blank — denial and
grant — and JDF 615, the grant, was the one already in the corpus.

The current guide is newer than the pinned copy (R: July 1, 2025) and names the
same four, so the answer is not an artifact of reading a stale revision. The
render command, the crop's own digest and the guide's digest are all in
`data/rcap-all50/candidate-evidence/colorado/co-jdf-611-filing-set-identification.json`,
so the image can be reproduced from the pinned corpus and compared.

Worth recording: the digits **do** survive `pdftotext -layout` against the same
bytes. The earlier failure was a property of the extractor, not the document.

## Acquisition is blocked

The eight have **not** been retrieved. This session's network egress policy
allows an allowlist and refuses everything else with a 403 to `CONNECT`, the
Colorado Judicial Branch included:

```
JDF-613  FAILED  fetch failed <- Request was cancelled. <- Proxy response (403) !== 200 when HTTP Tunneling
```

That is an organization policy denial, not a dead link and not a fault of the
court's site, and it is measured rather than inferred: `https://example.com/` is
refused with the identical 403 while `https://registry.npmjs.org/` succeeds, so
the denial is the allowlist and not the issuing court. It was not routed around:
no mirror, no cache, and no unofficial form aggregator standing in as the source
of record.

One trap is worth naming, because it produced a wrong-looking record before it
was caught. Node's built-in `fetch` ignores `HTTPS_PROXY` unless
`NODE_USE_ENV_PROXY=1` is set, and the unproxied request in this sandbox comes
back as a bare `HTTP 403 Forbidden` — which reads, in a governed record, exactly
like the court refusing to serve the form. The remedies are opposite: a network
grant versus a new URL. The acquirer now re-executes itself through the
configured proxy when one is set, so the failure it records is the real one.

So no byte size, page count, SHA-256, content type or form technology is recorded
for any of the eight. Those fields are `null` and stay `null`. A plausible digest
in a governed index is indistinguishable from a real one to every consumer that
reads it, which is exactly why there isn't one.

Everything that does not need the bytes is settled: official URLs, official
titles, filing-set roles, routes, requiredness, corpus paths, the archive recipe,
the release identity and both verifiers.

## Running it

```bash
# what would be fetched, and from where
node scripts/rcap-corpus/acquire-colorado-supplement.mjs --dry-run

# once www.coloradojudicial.gov is reachable: fetch, hash, measure, package
# (it routes itself through HTTPS_PROXY when one is configured)
node scripts/rcap-corpus/acquire-colorado-supplement.mjs --write-index

# after publishing the staged archive as the sole asset of the tag
bash scripts/rcap-corpus/bootstrap-colorado-supplement.sh

# contract always; bytes when a supplement is mounted
node scripts/rcap-corpus/verify-colorado-supplement.mjs

# determinism and verifier-mutation proofs; no network, no corpus needed
node scripts/rcap-corpus/test-colorado-supplement.mjs
```

`NODE_USE_ENV_PROXY=1` matters where an egress proxy is in play: Node's built-in
`fetch` ignores `HTTPS_PROXY` without it, and the failure looks like the court's
site being down rather than the proxy refusing.

The acquirer refuses rather than guesses, for the same reason the base bootstrap
does. It rejects a non-200, a redirect off `coloradojudicial.gov`, a body that
is not a PDF, and a document whose page 1 does not print the form number that was
asked for — the check that catches a court re-using a path for a different form,
which every other check would pass. It reads the revision from the `R:` date
printed on the document rather than from the upload directory in the URL, which
dates the upload; a revision that disagrees with the index is reported as a
finding, because it means the court revised the form.

If any one of the eight fails, nothing is packaged. A partial supplement is not
published, because a filing set that is missing one filing is not a filing set.

There is deliberately **no** flag that packages bytes from local disk. The only
way into this archive is a fetch from the issuing court.

## What this does not do

It does not open a gate. Identifying a filing is not acquiring it, and no
Colorado route becomes fulfillable because its missing documents now have names.
All three Colorado routes stay denied and commercially ineligible.

It also does not refresh the corpus. The current JDF 611 is R: July 1, 2025 while
the pinned copy is R: August 7, 2024, and a `JDF612.pdf` exists under the site's
`2025-07` directory. Both are recorded as freshness findings in
`data/rcap-all50/candidate-evidence/colorado/co-official-source-acquisition.json`
and neither was acted on. They belong to whoever refreshes the base corpus.
