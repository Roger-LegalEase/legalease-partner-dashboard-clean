# Regeneration note — 2026-09-01, sprint branch

The commit that regenerated `pdf-retirement-determination.json` on this branch
carries a message written for the `main` branch, where the same regeneration is
a single derived counter. **On this branch it is not.** The message understates
the change and this note is the correction.

## What the message says, and what actually happened here

| | `main` | this branch |
| --- | --- | --- |
| diff | 1 insertion, 1 deletion | **1055 insertions, 9 deletions** |
| assets probed | 128 | **149** |
| retain | 88 | **107** |
| retirement candidates | 40 | **42** |

The message's "one derived counter, `identifierCount 4101 -> 4100`, no
retirement decision moves" is accurate for `main` and inaccurate for this
branch. Here the determination took in the artifacts this sprint has been
building — twenty-one more assets probed, nineteen more retained, two more
retirement candidates.

## Why the commit was not amended

Seven worker branches are based on this branch. Rewriting its history to fix a
commit message would invalidate every one of their checkouts, which is a worse
outcome than an inaccurate message with a correction beside it. The record is
corrected here instead.

## What this regeneration is and is not

It **is** the generator's own output, run three times with byte-identical
results, never hand-edited. `--check` passes.

It is **not** a retirement decision by the Captain. Nineteen assets moved into
`retain` and two into `retirement candidates` because the generator measured the
tree as it now stands, not because anyone determined their fate. A retirement
candidate is a candidate; nothing here retires an asset, and nothing here grants
or withdraws commercial authority.

Anyone relying on the counts above should re-run the generator rather than trust
this note, which is a snapshot of one moment on a moving branch.
