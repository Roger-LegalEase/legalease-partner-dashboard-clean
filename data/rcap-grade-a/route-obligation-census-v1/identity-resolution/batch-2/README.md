# Source-identity resolution — batch 2

`resolved.json` is generated. Do not edit it by hand.

```
node scripts/grade-a-route-obligation-census/resolve-census-source-identity.mjs --batch 2
node scripts/grade-a-route-obligation-census/resolve-census-source-identity.mjs --batch 2 --check
```

`--check` regenerates the record from the committed inputs and fails unless the
bytes on disk are identical, so the file is a fixed point of its own inputs and
cannot drift from them silently.

## What it covers

Rows 84 through 166 of the 166 rows the census classifies
`SOURCE_IDENTITY_UNRESOLVED` in
`data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json`,
sorted by `worklistGroupId` as that file sorts them. Rows 1 through 83 are batch
1 and are owned by a sibling lane.

## What it is for

The census's unresolved class mixes a family that names no document-shaped source
at all with one that names a label which does not resolve, and an acquisition
lane cannot act on either while they are one number. This separates them and, for
each document a route actually needs, records the issuing authority, the form
number where one exists, the official title, whether the verified corpus holds it,
and the committed evidence each answer came from.

Nothing is fetched. Every answer is derived from files committed to this
repository.

## What it does not establish

It does not establish that a resolved document is the current official edition,
that a route may use it, or that a document recorded as held is present on this
machine right now. Output strategy, legal approval and packet verification are
separate gates, and this record touches none of them.
