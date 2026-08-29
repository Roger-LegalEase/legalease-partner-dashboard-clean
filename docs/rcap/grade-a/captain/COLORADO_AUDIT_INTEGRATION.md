# Colorado — Lane G audit integrated, false readiness corrected

Integrated from `claude/grade-a-v5-lane-g-family-1`, two commits, replayed onto
the E-, F- and H-integrated captain head. Zero collisions.

| | |
|---|---|
| SOURCE AUDIT | COMPLETE |
| ARTIFACT AUDIT | COMPLETE |
| PACKET FAMILY | **INCOMPLETE** |
| GRADE-A CANDIDATE ROUTES | **0** |
| SERVICE DISPOSITION | `SOURCE_OR_CONFIGURATION_GATE` |
| COMMERCIAL STATUS | HOLD |

This is not a completed Colorado packet family, and nothing here describes it as
one.

## Corpus

Archive SHA-256 verified. 51 jurisdictions, 499 files, 329 PDFs. All 23 assigned
Colorado source identities rehashed from installed bytes; **23 of 23 agree**. No
private source bytes committed.

## The false-ready registry — corrected at its controlling source, not its projection

`CO:petition-based-non-conviction-sealing-jdf-417-24-72-704` reported
`factoryV2Resolves: true`, no unmet build inputs, and payment allowed at the
evaluator. That was false: the official JDF-416 guide requires JDF-417, JDF-418,
JDF-419 and JDF-435, and the corpus holds the first two.

The registry is generated, so hand-editing it would have been overwritten by the
next run. The controlling record is
`data/record-clearing/legal-design-packet-set-manifests.json`, which declared the
Colorado petition set as two components. It now declares what the guide
requires, with each unavailable component carrying `officialFormId: null`
because this repository has no source for it — while `requiredOfficialFormId`
records the number where it is known. *Knowing which document is required* and
*having that document* are different facts, and only the second makes a packet
buildable.

One generator rule was also wrong, and it is the reason this went unnoticed:

```
exactPacketSet: sets.length > 0 && sets.length === trackIds.length
```

That asks only whether a set exists per track. A set declaring two of four
required filings satisfied it. `exactPacketSet` now also requires that no set is
recorded incomplete and that no component is missing its source or its official
identity — so "exact" means complete, which is what the name always claimed.

Blast radius checked: exactly two routes flipped `true` to `false`, both the
Colorado petition routes. No other route in the registry changed.

### Resulting truthful state

| Route | Unmet build inputs |
|---|---|
| `…jdf-417-24-72-704` | `exactPacketSet`, `sourceOrApprovedComposedDocument` |
| `…jdf-612-24-72-706` | `exactPacketSet`, `sourceOrApprovedComposedDocument` |
| `…juvenile-expungement-19-1-306` | `exactPacketSet`, `packetSpecification`, `sourceOrApprovedComposedDocument` |

All dependent projections were regenerated to a fixed point: factory registry,
launch graph, sellable-pathway closure, commercial packet integrity, session-A
evidence, coverage reconciliation, legal-review decision sets, legal-authority
reconciliation, renderer-gap decomposition, and the Grade-A fulfillment
registry, observation and projection.

**Denial proven, not assumed:** all three Colorado routes were run against every
value exported by `COMMERCIAL_ADMISSION_POINTS` — 30 admissions across 10
points, **0 admitted**, each route `NO_RECORD` / `authorized: false`. No
Colorado exception or bypass was added.

## The two JDF-611 form numbers are NOT established

The guide requires a motion, an order, a notice and a second order. The corpus
holds JDF-612 and JDF-615. The notice and second order are absent **and their
official form numbers are unresolved**, because the guide renders those digits
as vector glyphs. They are recorded as `identity_unresolved` and are not
inferred. Guessing a JDF number would fabricate an official identity.

## JDF-302 provenance

Absent. Its current identity comes from the compiled Colorado profile, not from
an installed official juvenile source, so it is not treated as current source
verification. The route keeps its fail-closed state.

## No guidance substitution

Neither petition route received a guidance fallback. They are unfinished packet
routes, not guidance routes, and dressing an incomplete filing set as guidance
would misrepresent both. No juvenile filing guidance was written from memory:
filing destination, fee, service, copy and hearing instructions must come from
approved current sources.

## Renderer reproducibility — open, assigned

Seven Colorado manifests name
`scripts/rcap-official-forms/lanes/d3a-regenerate.mjs`, which is absent from the
tree. The blob is retrievable at 101,307 bytes from commit `a967fc11`, but that
commit is **not an ancestor of the captain branch** — it is on a side branch, so
"restore from accepted history" is not directly available and restoring it would
be importing unaccepted work. That decision, and the alternative of repointing
the manifests to the renderer that actually owns the artifacts with byte-identical
regeneration proven, is assigned to Lane G-CO-BUILD.

## Evidence location

The five Lane G evidence files were flat files inside
`data/rcap-all50/overlays/production/colorado/`, placed there so the review
manifest generator would not invent a phantom Colorado family. That worked, but
the path said "production" about candidate audit evidence.

They now live under `data/rcap-all50/candidate-evidence/colorado/`. Nothing else
in the repository referenced the old paths; the one comment that did is updated
in the same commit. The move creates no overlay family: the review manifests,
packet-family build status and hard-form dispositions all still pass, and
`overlays/production/colorado/` now contains only its 21 real family
directories.

## Seven missing artifacts

JDF-419 · JDF-435 · JDF-205 · JDF-206 · JDF-302 · the JDF-611 notice · the
JDF-611 second order.

## Field maps, for the record

JDF-417 binds 4 of 62 fields. JDF-612 binds 6 of 63. Materially unbound: the
nine agency name/address rows, qualification elections, certificate of service,
service recipients and filing details.
