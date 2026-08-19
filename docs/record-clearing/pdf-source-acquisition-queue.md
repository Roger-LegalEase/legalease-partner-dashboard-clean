# PDF source acquisition queue

All **128** problematic-PDF assets, reconciled against the official forms-links
workbook, the committed source receipts, the existing form inventories and every
first-party URL this repository already holds.

| Classification | Assets |
|---|---|
| `exact_official_binary_url` | 51 |
| `official_landing_page` | 52 |
| `no_source_identified` | 25 |

**103** of 128 matched to an existing official source.

## Publisher rule

Only a government or court/judicial host enters the queue. A mirror, a law-firm copy or
an aggregator is not an official source and is dropped before classification, so a
convenient copy can never become the thing we hand a participant.

## Acquisition happens in Actions, not here

This container's network policy answers `403` to court and agency hosts at CONNECT —
`public.courts.alaska.gov` and `www.courts.ca.gov` were both refused at the gateway. The
branch-triggered workflow `.github/workflows/rcap-pdf-source-acquisition.yml` runs the
matrix where egress exists, and accepts a binary only after publisher, URL, revision,
content type, page count and SHA-256 all check out.

Matrix entries: **51**, across 7 jurisdictions.

| Jurisdiction | Acquirable now |
|---|---|
| KY | 14 |
| NE | 11 |
| VT | 9 |
| VA | 8 |
| AK | 4 |
| WI | 4 |
| NC | 1 |

## Landing pages needing direct-PDF resolution

**52** assets have an official landing page but no direct binary URL. The workflow
does not guess a binary from a landing page; resolving those is a named follow-up.

## Genuinely sourceless

**25** assets have no official URL anywhere in this repository. Each is either a
retirement candidate or a source-research obligation — the retirement lane decides which,
in `data/rcap-ledger/pdf-retirement-dispositions.json`.

Regenerate with `node scripts/generate-rcap-pdf-source-acquisition-queue.mjs`.
