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

## Missing official artifacts — eight, and two of them are now named

At the time of the audit this read *seven*, two of them as "the JDF-611 notice"
and "the JDF-611 second order", because the guide's digits were reported as not
surviving text extraction. G-CO-SOURCE resolved both by rendering page 1 of the
pinned guide at 300 dpi:

| Filing | Role in the JDF 611 set |
|---|---|
| JDF 612 | Motion — already in the pinned corpus |
| **JDF 613** | Order denying — was "the second order" |
| **JDF 614** | Order and notice of hearing — was "the notice" |
| JDF 615 | Order granting — already in the pinned corpus |

The set carries two proposed orders because the movant files both outcomes blank.

The scope is now **eight**, not seven: JDF-419, JDF-435, JDF-205, JDF-206,
JDF-302, JDF-613, JDF-614, plus the **current JDF 611 guide (R: July 1, 2025)**,
which the pinned corpus holds only at the superseded R: August 7, 2024. None has
been acquired; the session's egress policy refuses the issuing court's hosts.

## Field census — one table, two columns, no ambiguity

There are two different counts for each form and confusing them is how a
specification gets mistaken for a rendered document. They are stated together
here so neither can be quoted alone.

| | JDF-417 | JDF-612 |
|---|---|---|
| Total fields in the official form | **62** | **63** |
| Specified writable (participant-fillable) | **59** | **58** |
| Specified protected (never written) | **3** | **5** |
| Unmapped after specification | 0 | 0 |
| **Realized in the retained artifact** | **4** | **6** |
| Specification digest | `f753ed82…` | `bbaaaca4…` |
| Specification version | `co-jdf-417-binding/2026-08-29.1` | `co-jdf-612-binding/2026-08-29.1` |

Read it this way. **62 = 59 + 3** and **63 = 58 + 5**: every field in each form is
classified, none is unaccounted for. That is the *specification*, and it is
complete.

The last row is a different fact. The retained fixtures still realize **4** and
**6** fields, because they were rendered by the D3A run of 2026-08-12 under the
narrow binding that preceded this work, and nothing has been re-rendered since:
the official binary each family is pinned to is not mounted, and the renderer
those receipts name is unavailable in accepted captain ancestry. So the
specification is complete and the artifacts are not, and the gap between 59 and 4
is exactly the work that a mounted corpus and a resolved renderer would close.

The earlier reading of this section — "JDF-417 binds 4 of 62 fields, JDF-612
binds 6 of 63" — described only that last row. It was true of the artifacts and
was never a statement about the specification, which did not exist yet.

Materially unbound before this work, and specified now: the nine agency
name/address rows, the eligibility and qualification elections, the certificate
of service, the service recipients and the filing details.

Source of every number above:
`data/rcap-all50/overlays/production/colorado/<family>/specification/reports/binding-coverage.json`,
re-derived by `node src/lib/rcap/state-packs/colorado/official-forms/run-verify.mjs`.
