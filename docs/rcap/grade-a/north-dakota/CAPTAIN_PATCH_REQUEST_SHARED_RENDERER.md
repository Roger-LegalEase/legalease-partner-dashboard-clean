# Captain patch request — shared pleading renderer, two optional fields

Lane: `D-north-dakota-composed-pleading` (`claude/grade-a-68h-lane-d`)
Base: `a25eec4cdc1f2193a591ba9c2991c3c6dd8a03ef`
File: `src/lib/record-clearing/renderers/custom-pleading-renderer.ts`
Isolated in: the single commit that introduces this document, so the captain can
take or drop it as one unit.

## What is requested

Two optional fields on `PleadingPresentation`, and the two three-line branches
that read them:

```ts
reliefClauses?: string[];        // replaces the default (a)/(b)/(c) requested-relief set
proposedOrderClauses?: string[]; // replaces the default operative order paragraph
```

Nothing else in the file changes. No existing field, default, signature or
behaviour is altered.

## Why Lane D cannot proceed without it

The renderer's default requested-relief clause (b) is:

> (b) Direct all criminal justice agencies having custody of such records to
> seal all records relating to this matter; and

and the default proposed-order paragraph directs the named custodian "and all
other criminal justice agencies with records pertaining to this matter".

North Dakota Chapter 12-60.1 sealing does not reach that far. The committed ND
state pack states it twice:

- `ndDisqualifyingOffenseNotes[4]` — "Chapter 12-60.1 sealing does not reach BCI
  criminal history record information or Criminal Justice Data Information
  Sharing System data; federal, tribal, out-of-state, and private
  background-check records are not cleared by North Dakota sealing."
- `ndFilingInstructions[8]` — "North Dakota court sealing reaches court and
  prosecution records only".

`recordsScopePhrase` already narrows clause (a). Clause (b)'s subject and the
order's custodian sweep are hard-coded, so a Chapter 12-60.1 petition rendered
today asks a North Dakota court for relief the statute does not authorize.

Grade-A non-negotiable 6 requires a complete filing with no unsupported legal
language. Shipping the default text would breach it; composing around the
renderer would fork it. This is the smallest change that does neither.

## Byte-preservation proof

`node scripts/verify-nd-shared-renderer-byte-preservation.mjs`

It reads the unmodified renderer out of `a25eec4c` with `git show`, loads it and
the patched renderer as two distinct modules in one process, and renders every
pleading configuration in the repository through both.

```
Shared-renderer byte preservation PASSED (367 checks).
  base commit:        a25eec4cdc1f2193a591ba9c2991c3c6dd8a03ef
  configurations:     24
  input variants:     3
  comparisons:        72
  result:             every existing configuration renders byte for byte as before
  new fields:         replace the default clauses only when supplied
```

Compared per comparison: SHA-256 of the full text, the complete section list,
the attachment list, the warning list, and the render-result metadata. A single
differing byte fails the run.

The proof also asserts the converse — that a supplied clause list actually
replaces the default and removes the agency-wide text — so a patch that
preserved bytes by doing nothing could not pass.

`BYTE_PRESERVATION_BASE` overrides the base commit, so the captain can re-run
the same proof against whatever base integration lands on.

## Regressions run against the patched renderer

`verify-nd-pleading-state`, `verify-pleading-state` (PA), `verify-dc-pleading-state`,
`verify-ok-pleading-state`, `verify-wy-pleading-state`,
`verify-rcap-no-null-presentation`, `verify-rcap-terminalize-c2`,
`verify-rcap-terminalize-c3` — all pass, and the committed rendered artifacts
those lanes hash still match.

## If the captain declines

Lane D's packet must not be admitted. Without these fields the composed Chapter
12-60.1 petition asks for agency-wide relief the statute does not grant, which
is a Grade-A defect and not a cosmetic one. The lane would rather be held than
ship it.
