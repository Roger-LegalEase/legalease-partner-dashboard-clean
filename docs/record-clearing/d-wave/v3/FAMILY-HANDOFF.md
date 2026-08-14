# D wave — final family handoff

Family level only. **No track disposition is derived here**; the Codex
track-mapping lane owns that, and this exists to give it family truth to build
on. Nothing is merged into canonical integration, no ledger is regenerated, and
no track is marked terminal.

Machine-readable: `family-handoff.json` beside this file.

## Where the 253 landed

| final disposition | families |
| --- | --- |
| technical_approved | **157** |
| correction_required | **8** |
| held_on_source_or_design | **88** |

| prior population | outcome |
| --- | --- |
| 104 prior approvals | 103 still approved, 1 now correction_required, 0 held |
| 61 prior corrections | 54 now approved, 7 still correction_required, 0 held |
| 88 prior holds | 88 preserved, 0 changed |

Every family appears exactly once, every one carries a disposition issued by an
independent review, and no family outside the 20 the v3 review inspected had its
category changed by it.

## Three factory versions, three reviews

| | fixed | reviewed by |
| --- | --- | --- |
| D0-v2 `b412f543` | print flags, contact-sheet sanitation, fail-closed inspection | 3 correction shards + approval-evidence review |
| D0-v3 `8ede0ed3` | subset-font decoding, rich-text finalization | `claude/rcap-review-d-v3-shard-0` @ `3601d8fe` |

The v3 review's branch was verified before its verdicts were read: one commit,
the pinned base as an ancestor, and a diff touching only its own two review
paths. No implementation, correction or evidence branch was modified by it.

## What the v3 cycle changed

13 participant artifacts re-rendered, 5 semantic bindings closed, 84 stale
`rendered-artifacts.json` manifests repaired to zero disagreements across all
seven branches. Two results are worth naming:

**Missouri CR-145 produced an artifact for the first time.** It never had one:
pdf-lib threw `RichTextFieldReadError` and the lane correctly refused to route
around the shared factory or rewrite the source. It now emits three fixtures and
a contact sheet — and the review promptly found a binding defect in the field
that fix made writable, which is exactly what should happen.

**BLAKE-006 and BLAKE-008 went from 0 readable lines to 164 and 174.** They had
been recorded as having no extractable text layer, a claim about 199 and 222
lines of real text.

## The 8 still open

Each carries an acceptance condition written by the reviewer.

| family | severity | what is wrong |
| --- | --- | --- |
| `MO:cr145-form-petition-en` | high | the petitioner's name is written into `Other Defendants`, whose printed label reads "Other (include name and address of agency)"; its sibling agency fields are all refused |
| `NH:nhjb-2956-support-record-request-en` | high | the participant artifact was re-rendered but its contact sheet was not, so the sheet still shows the superseded artifact with the control captions the re-render removed |
| `VA:cc-1203-form-en` | high + 2 medium | `User.AncillaryCaseNumber` is drawn truncated past both widget edges; the overflow reporter did not record it; `User.VSBCaseNumber` is bound to a case number when its printed context is an attorney bar number |
| `VT:200-00631-form-en` | high + medium | the participant's name is drawn cut mid-word at 39 of 70 characters, and recorded as a clean "shrunk" outcome |
| `WA:blake-006-form-en` | medium | every text run is a single character, so the run-level label matcher cannot see labels at all; "no participant label matched" is not a supportable conclusion |
| `WA:blake-008-form-en` | medium | same |
| `WA:crrlj-09-0100-form-en` | medium | the profile reports 0 unreadable lines while the decoder's own gate refuses 2; the lane does not use that gate |
| `WA:crrlj-09-0870-form-en` | medium | same, 7 lines |

Three of these are defects the v3 work introduced or exposed rather than
inherited: CR-145's binding became reachable only because the rich-text fix made
the field writable, NHJB-2956's sheet was left behind by the re-render, and the
Washington profiles disagree with the new decoder's gate because the lane still
filters lines its own way. That is the review doing its job.

The two clipping findings — VA CC-1203 and VT 200-00631 — point at something
broader than either family: a write whose drawn text is shorter than the value
supplied, or whose extent leaves the widget, is currently recorded as a clean
`shrunk` outcome. Whoever takes these should treat that as a shared fitter and
reporter defect, not two local ones.

## For the track-mapping lane

`family-handoff.json` carries, per family: prior population, disposition before
v3, whether v3 reviewed it, final disposition, whether its participant artifact
was re-rendered, and every open finding with its acceptance condition.

Current family bytes live on the seven `claude/rcap-<lane>-corrections-v3`
branches. Each is additive to its `-approval-evidence-v2` branch, which is
additive to `-corrections-v2`, which is additive to the reviewed lane head.
Nothing was force-pushed and no earlier branch was rewritten.

A track that requires any of the 8 open families is not promotable on family
grounds. A track whose families are all approved still has its own non-technical
gates — currentness, legal design, legal adoption, staging — none of which this
wave had authority over.
