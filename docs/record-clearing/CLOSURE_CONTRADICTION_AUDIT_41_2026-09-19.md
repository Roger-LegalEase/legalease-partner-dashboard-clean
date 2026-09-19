# 41 — is the generator defective, or correctly refusing?

**Correctly refusing.** And it was only refusing half the time.

## Classification

**`CORRECT_FAIL_CLOSED`**, dispositioned — with one real defect in the
generator, fixed here, that is the opposite of weakening the refusal.

The missing decisions are not this generator's to make. It is surfacing six
unresolved adjudications the same way step 22's register surfaces two broken
verifiers: the control is accurate, and the work belongs elsewhere.

## The refusal condition

`ADJUDICATION` is a hard-coded per-pathway table in the generator. A row is
selected when the closure ledger calls the pathway `paid_packet_intended`, the
route authority gives it a non-packet `outcomeMode`, and the authority names
**no packet family**. Each selected row must carry its own entry:

```js
if (!row.adjudication) {
  problems.push(`${row.pathwayKey} has no individual adjudication; the eleven rows are not one move`);
}
```

The comment above it states the purpose exactly: *"An unadjudicated row would
fall back to the flat default, which is the thing this register exists to
stop."*

## The six, and how long they have been there

```
MA:marijuana-only-expungement
NE:law-enforcement-error-expungement
NJ:clean-slate-petition-under-n-j-s-a-2c-52-5-3
NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247
OR:marijuana-specific-set-aside-redesignation
SD:juvenile-trafficking-expungement
```

Identical six at `bf2eaefc0` and identical six at the accepted Production
baseline `8682bd007`. Nothing in this session's work added any of them.

**Correction to the frozen inventory.** It recorded *"four routes (NJ, NV, OR,
SD)"*. That was my own transcription from a truncated log tail, not a
measurement. There were six then and there are six now. The frozen inventory is
left unedited; this is the corrected count.

## What the records are

Not missing content, not contradictory, not malformed, not stale against a
source. They are **unowned**: six pathways whose commercial classification
nobody has individually decided.

The register's whole premise is that these cannot move as a group. Each
adjudication must state a `commercialClassification`, a `serviceDisposition` to
preserve, an `implementationEffect`, any
`childPacketRoutesThatMustRemainActive`, and — where the closure vocabulary
cannot express the answer — a `blockedOnVocabulary` explaining why. One entry in
the table already carries that last field, recording that the ledger has no
`branch_mixed` category and that applying `non_filing_guidance` to the whole
route would misclassify a participant petition.

So the generator does not own the missing decision. It is refusing to publish a
classification nobody made.

## Would making it write create authority?

Yes, and that is the point. The rows it would publish propose a **commercial
reclassification** — moving a route out of `paid_packet_intended`. An
unadjudicated row does not become unclassified; it takes the flat default. So a
forced write would publish six commercial classifications on nobody's authority.

## The defect: the refusal was a convention, not a property

`--check` validated and refused. The write path did not:

```
line 306  if (CHECK) { ...every substantive check... process.exit(1) }
line 368  fs.writeFileSync(OUT_JSON, serialized)      <- unconditional
```

And `package.json` invokes it without the flag:

```
"rcap:closure-contradictions": "node scripts/generate-closure-authority-contradictions.mjs"
```

So the documented way to regenerate this register published it with **no
validation at all**, including the six `adjudication: null` rows and their
default proposals — exactly what the check exists to prevent. The protection
depended on remembering to pass `--check`.

Fixed by hoisting the substantive checks out of the `CHECK` branch so they run
in both modes. Staleness stays check-only, because writing is what answers it.

Measured:

| | |
|---|---|
| `--check` | unchanged — same six messages, exit 1, writes nothing |
| bare run, before | wrote both files, exit 0 |
| bare run, after | `Refusing to write the closure/authority contradiction register:` + the same six, exit 1, writes nothing |
| positive control — rows restricted to adjudicated ones | `Wrote …`, exit 0 |

The positive control matters: the guard is the only thing stopping the write,
and the write path is otherwise intact. A first attempt at that control neutered
the `!row.adjudication` check instead, and the generator crashed on
`row.adjudication.childPacketRoutesThatMustRemainActive` — which confirms the
check is a genuine precondition for the validation behind it, not a formality.

## Noted, not acted on

The table holds 13 adjudications; only **one** matches a current row. Twelve are
for pathways that no longer qualify as contradictions — reclassified, repaired,
or gone from the paid denominator. Seven rows exist today: one adjudicated, six
not. The register's own title still says "the eleven rows". None of that is
wrong, exactly — retaining a decision after its subject moves is history, not
drift — but the gap between 13 recorded, 1 live and 6 waiting is worth a look by
whoever takes the six.

## What must not be done

- Do not weaken or bypass the adjudication requirement to let the register
  regenerate. Six unowned commercial classifications would be published.
- Do not adjudicate the six mechanically. Each needs a stated classification,
  preserved service disposition, implementation effect and child-route list;
  at least one may need `blockedOnVocabulary` instead.
- Do not treat step 41 as the blocker. The generator is correct; the six
  decisions are held elsewhere.

## Gate

`scripts/generate-closure-authority-contradictions.mjs` is not among the 30
compared inputs. `comparedInputs: 30`, `changedPaths: []`,
`rebuildRequired: false`.
