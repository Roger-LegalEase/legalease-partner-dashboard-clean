# pdf-lib stamps a border the form does not print, and the counter that should see it counts glyphs

**Measured 2026-09-09** by VF20 (`05cde650f`) on `mo-art-xiv-marijuana-set` and
`md_pardon_expungement-set`, and this entry stands above the earlier one because
it is a shared-host defect on the delivered bytes rather than an unread repair.

pdf-lib's default appearance provider paints a stroked square the size of the
widget `/Rect` for every check box whose `/AS` state carries no `/AP /N` entry,
and `flatten()` stamps it into the page. Under ISO 32000-1 12.5.5 a conforming
viewer paints nothing there, so it is ink the official form does not print. On
FI-05 at 300 dpi the 13.34x17.27 rect draws a plain second rectangle around the
court's own box; on CC-DC-089 the DENIED box comes out visibly heavier than the
source's.

Measured, not inferred: FIX50's scanner puts both families in the cohort -- 33
selection widgets in Missouri, 56 in Maryland, none shipping its own `/Off`
appearance and neither builder passing `suppressSynthesizedAppearances` --
leaving **29** synthesised squares in Missouri and **50** in Maryland. A
directional 150 dpi raster diff, added ink only, masked by the declared write
rects, finds 2767 stray pixels in Missouri on exactly the four pages carrying
unmarked selection widgets and 2681 in Maryland on all four, of which **654 sit
in a column on the judge's order page** at Granted / Granted In Part / Denied /
Frivolous and the financial-eligibility control. Identical on both fixtures,
same poppler build on both sides.

**`verify-packet-completeness.mjs` is structurally blind to it.** It raises
`visualDefects` only from `nonWhitespaceGlyphsOutsideMeasuredWriteBoxes`, which
counts **glyphs**. A synthesised square is a stroked rectangle and no glyph, so
the counter reads 0 on bytes carrying 2767 stray pixels. Nothing is rounded to
zero here; the instrument does not range over the quantity. It returns
PASS_COMPLETE with nine zeros for both families, before and after their repair.

Neither this defect nor its remedy needs legal input or a new source, and the
repair that just landed on these two families neither caused nor touched it.

Also recorded by that lane, not scored: ten CC-DC-089 widgets the source carries
as check boxes with `/AP /N` states -- all on the order page, Granted through
Frivolous -- are typed `acroform_text_field` in Maryland's
`production-field-map.json`. Nothing is written to them, but the record
misdescribes the judge's disposition controls, and any check reasoning over
`kind=selection_control` will not see them. The same cross-check on Missouri
finds zero.

---

# Twenty-two of the thirty-six failing families carry a repair nobody has read

**Measured 2026-09-09** at `d4984cbc5`, by asking git a narrow question for each
`FAIL_REPAIR_REQUIRED` family: did its **fixtures** or its **build script**
change between the commit its selected independent verdict names as
`verifiedAtBase` and HEAD?

The first cut of this measurement asked whether anything under the family's
directory had changed and answered "all 36", which is useless: the generator
rewrites `product-wiring.json` inside every family directory on every run, and a
regenerated derived record is not a repair. Narrowing to the two things a reader
would actually be reading is what makes the answer mean something.

## The stale-bytes question is closed: 34 of 36 proven families reproduce (2026-09-09)

Both sweeps are in. The screen that started this — 54 families whose builder is
newer than their delivered canonical, 36 of them `COMPLETE_PACKET_PROVEN` — is
answered.

| | first pass (25) | second pass (29) | together |
|---|---|---|---|
| Proven families measured | 14 | 22 | **36** |
| Of those, packet PDFs reproduce byte for byte | 14 | 20 | **34** |

The two proven exceptions are named below. **No proven family was found
delivering bytes that are wrong.** The one substantive divergence in each sweep
sits in a family already `FAIL_REPAIR_REQUIRED`.

The wall-clock category, empty in the first sweep, has two entries in the second:
`co_pardoned_conviction_seal-set` and `pa_age70_deceased-set` differ in exactly
14 and 16 bytes, every one inside `/ModDate` and `/CreationDate`. Byte-identical
once normalised, `pdftotext` identical. The builders now write a pinned date, so
the delivered bytes are stale and the defect is already repaired upstream.

### The two that need work

**`wv_conv_multiple_misdemeanors-set` — `COMPLETE_PACKET_PROVEN`, and today's
builder produces a poorer packet.** It exits 1 from its shared host's byte gate
with 26 blocking findings, all one check —
`selection_control_carries_artifact_derived_text_or_vector_mark` — across 13
selection controls on SCA-C906 in both fixtures. The delivered
`build-findings.json` records `blocking: []`.

Not source drift: delivered and rebuilt receipts both bind SCA-C906 at
`43b5606c9faf…`, 176072 bytes, `exactHashVerified: true`. Rastered at 100 dpi and
compared pixel by pixel, **pages 1–3 hold ink the rebuild does not reproduce —
7013, 7516 and 662 pixels inked only in the delivered fixture, against 409 inked
only in the rebuild.** That establishes the delivered bytes cannot be reproduced,
NOT that they are wrong. A repair lane and an independent reader settle it.

**`sd_arrest_expungement-set` — the rebuild would delete a record.** The packet
difference is inert: 51 bytes in one empty text-widget appearance stream whose
body is `/Tx BMC EMC` and paints nothing; `pdftotext -layout` identical. What
moves is the sidecars — `product-wiring.json` goes 97 lines to 17, dropping the
whole 17-key `binding` block including `paymentEligible`, `sponsorshipEligible`,
`whyPaymentIsClosed`, `lastIndependentVerification` and the three-stage
`binding.routeKeys`. And the delivered `build-findings.json` asserts *"107
field(s) … surfaced in participant-instructions.md rather than guessed"* while
that file — byte-identical in both directories — lists **9**. Neither 107 nor the
rebuild's 28 matches the document being cited.

### One a participant would see

**`ut_pet_acquittal-set`** ships a `participant-instructions.md` citing
`src/lib/rcap-engine/compiled/profiles/UT-utah.json` at `73dd7ea9…`/345529 bytes.
That file is now `8d5cf401…`/346575, moved by `78e79be41` on 2026-09-05, after
the delivered canonical was built. **The packet cites a source hash that cannot
be verified against the repository's own committed file.** Six further families
pin `legal-design-packet-set-manifests.json` at a digest it has moved past; those
are internal and invisible to a participant.

### Tool repairs, and an honest note on one of them

`measure-build-reproducibility.mjs` gained `--out` (a subset sweep can no longer
overwrite a completed sweep's record — the reason the 87-row record kept being
clobbered), `--families` (one run over a named set instead of a loop that
replaces its own output each time), and top-level entry-point discovery. Every
row now carries `builderRewroteOwnDirectory`, and all 28 buildable families did,
so no "reproduces" here is a script that merely exited cleanly.

The entry-point repair **changed no outcome in this set** — it fired for no
family. `sd_arrest_expungement-set`, the only builder with that shape, was
already reaching the right invocation through a coincidence: a
`const target = "sd_arrest_expungement-set"` inside its `--instruction-repair-only`
branch resolved the `runFamilyById(target, [])` call. Its stored
`invocationBasis` claims a direct-invocation guard that does not exist. The
invocation is right and the explanation is not, and that is recorded rather than
tidied away.

`BUILD_REPRODUCIBILITY.json` still hashes as it did and still carries all 87
rows. Every rebuilt family was restored and verified byte-identical.

## Nebraska passed the central raster and cannot be admitted from this session (2026-09-09)

`ne-seal-pardoned-set` has everything the admission criteria ask for except a
receipt this container can produce.

| Criterion | State |
|---|---|
| Independent verification | `PASS_COMPLETE_INDEPENDENT`, all nine counters measured zero |
| Completeness audit | `PASS_COMPLETE`, and now in the matrix |
| Central raster | **`RASTER_PASS`** — run `34341080972`, job `102432777025`, commit `a25db5034ab8ff3ed1466fa8028c63d0558e809d`, scale 2.5, *"2 document(s), 8 page(s) measured, 0 problem(s)"* |
| Canary precondition | job `102431769489`, same run, success |
| Bytes | canonical `06f5fae3…6979` and boundary `a6b1d085…9b4f`, both recomputed from disk and matching their queue pins |
| **Receipt ingested** | **NO — and it cannot be, here** |

### Why not, exactly

The queue does not read verdict files from
`launch-recovery-2026-09-07/central-raster/`; it carries `rasterReceipt` forward
inside `RASTER_QUEUE.json` itself, and the only thing that writes one is
`scripts/rcap-packet-recovery/ingest-completed-raster.mjs`.

That ingester requires a verdict record carrying `measurements[]` — one entry
per page, each with `nonblank`, `croppedToThePage`, `bytes`,
`calibrationResidualPx`, `pageWidthPt` and `pageHeightPt`, cross-checked against
the PDF's own page geometry. **Those measurements exist only inside the workflow
artifact** (`rcap-raster-ne-seal-pardoned-set-34341080972`, id `10099982865`,
3,040,284 bytes, 15 files), and artifact download redirects to blob storage the
egress proxy denies. The job log prints the one-line verdict and nothing else.

I wrote a receipt from the log and the API, then deleted it. It carried the run,
job, commit, artifact identity and disk-recomputed hashes, and it carried **no
`measurements[]`** — so it could not satisfy the ingester, and a file in the
receipts directory that looks like a receipt but omits the evidence the gate
checks is worse than no file.

### Two things this needs

1. **A session that can download workflow artifacts** ingests
   `10099982865` and runs the ingester. That is the whole remaining step; the
   raster itself is done and passed.
2. **`ingest-completed-raster.mjs` is hard-pinned to Delaware.** `FAMILY`,
   `VERDICT` and a frozen `PIN` of run/commit/job/artifact/zip/digest are module
   constants, so it can admit exactly one family and no other. Its validation is
   good — twelve mutations, each proved to reject — and generalising it means
   taking the family and its pins as arguments while keeping every assertion.
   Until then every future raster pass needs the same manual path.

Alternatively the raster workflow could print its `measurements[]` into the job
log, which this session **can** read. That is a change to a shared gate and is
recorded as an option, not made.

## The stale-bytes screen measured: 20 of 25 reproduce, and my screen was wrong (2026-09-09)

The measurement lane answered the question and corrected the question.

**Answer.** Of the 25 screened: 5 reproduce their whole directory exactly, 11
reproduce their packet PDFs with only the raster stage differing, 4 reproduce
with only a recorded source hash drifted, 1 was unmeasurable, and **4 diverge
substantively**. The wall-clock-stamp category I anticipated is **empty** — every
`build-status.json` that changed changed its raster fields, not a timestamp. And
`64f2dbb8e`, the commit twelve of the 25 pointed at, **changed no output at all**,
which is why the screen was recorded as a screen.

**All 14 `COMPLETE_PACKET_PROVEN` families in that set reproduce their packet
bytes exactly.** None of the four with wrong bytes is proven; all four already sit
in `FAIL_REPAIR_REQUIRED`.

**MY SCREEN UNDER-COVERED ITS OWN CRITERION.** It derived each family's builder
name from the overlay DIRECTORY name, which is hyphenated, while many family ids
use underscores — so `md_pardon_expungement-set` looked for
`build-census-v1-md-pardon-expungement-set.mjs`, found nothing, and was silently
skipped. Re-run against `MASTER_QUEUE` family ids with both spellings tried, the
criterion matches **54 families, 36 of them `COMPLETE_PACKET_PROVEN`** — not 25
and 14. The lane independently reported 64 (85 counting shared hosts) by its own
method. Either way the screen I published covered under half of its subject.

**29 of the 54 are still unmeasured, 22 of them `COMPLETE_PACKET_PROVEN`.**

Also recorded by the lane: the existing 87-row `BUILD_REPRODUCIBILITY.json` was
measured at base `4b1d36fd5` on 2026-09-02, which predates `64f2dbb8e`,
`d5450b1c8` and `32b4cd663` — its rows for families those commits touched are
themselves stale.

## Four Illinois families deliver bytes that are stale AND wrong (2026-09-09)

`il-exp-pardon-set`, `il-exp-precompletion-set` and `il-seal-nonconv-set` share
the EXP-AD host. Their delivered bytes carry, identically:

- **20 of 20 charge cells holding the case number** `2021-CF-004217`;
- **zero Order page-2 item-3 writes** (8 Order writes, all on page 1);
- Case List `arrest2..arrest5` filled as columns of one row;
- `"Charge exactly as shown o…"` — a direction to the participant, truncated,
  printed where a charge belongs.

Rebuilding writes one real charge, adds all four Order item-3 contact fields,
drops 31 spurious writes and answers the item-1/12/3(b) elections. Writes go
70→45, 70→46 and 72→44.

**`il-seal-edu-set` is a fourth and nobody had named it.** The sweep first filed
it `UNKNOWN_INVOCATION` because the tool's `determineInvocation` misses top-level
entry points; its builder does enter on a bare `node <script>`. Its delivered
charge cell prints the direction sentence in full, its Order item 3 is blank, and
its `participant-instructions.md` ships **66 lines of interior AcroForm field
names as instructions** — `- Complete arrest60 on EXP-AD Case List page 1`.

### Tool limitations the lane found, worth fixing before the next sweep

- `determineInvocation` misses top-level entry points — it cost a true positive.
- A builder asserting a required flag reads as `UNBUILDABLE` (`ar-felony-seal-set`
  asserts `--no-raster`).
- The 600s default timeout is shorter than four custom-pleading raster stages.
- A delivered directory that never ran its raster stage reads as `DIVERGES`
  against a rebuild that does — 11 of the sweep's 16 `DIVERGES` rows.
- `scripts/build-census-v1-ar-felony-seal-set.mjs` writes
  `data/rcap-grade-a/packet-factory-24h/pf13/rows.json`, outside its own family
  directory.

## Four families deliver packets whose form fields are still live (2026-09-09)

The build lane observed in passing, outside its grants, that four delivered
canonical fixtures still report `Form: AcroForm`. Screened with `pdfinfo` over
every delivered fixture in the corpus — canonical and boundary — the set is
exactly four families and no others, in both fixtures each:

| Family | State |
|---|---|
| `hi_712_1200_deferred_expungement-set` | SOURCE_READY |
| `hi_dag_danc_expungement-set` | **COMPLETE_PACKET_PROVEN** |
| `ia-12347-set` | SOURCE_READY |
| `ia-7251-set` | **COMPLETE_PACKET_PROVEN** |

Every other delivered fixture reports `Form: none`, so this is a defect in four
families rather than a corpus-wide convention.

### Why it matters

A delivered packet whose fields are still interactive does not carry its values
as ink. It carries them as field values with generated appearances, which a
viewer can alter, which some printers and e-filing pipelines drop or re-render,
and which a participant can change after the page they sign is produced. Two of
the four are recorded `COMPLETE_PACKET_PROVEN`.

It also weakens the evidence over those bytes rather than just the bytes: a
raster receipt hash-bound to a file whose appearances are generated at view time
proves what one renderer chose to draw, not what the file fixes.

### What is NOT established

That the delivered values are wrong, or that any of the four renders
incorrectly today. The screen establishes only that the fields survived
flattening in these four and in no others. Whether each family's builder skips
the flatten, flattens and leaves the AcroForm dictionary behind, or writes the
values a different way is a per-builder question nobody has asked yet.

The related repair the same lane made on the Maryland host is the likely shape
of the fix and the reason to be careful with it: `pdf-lib`'s `form.flatten()`
DELETES each field's objects, after which the writer emits an xref with entries
for object numbers that no longer exist — poppler reported `Invalid XRef entry
93`. Its builder now draws what pdf-lib draws, operator for operator, and
DETACHES instead of deleting. A naive "just call flatten()" fix on these four
would trade live fields for a broken cross-reference table, which is the defect
VF13 independently found across every Illinois fixture.

## Repaired in source, never rebuilt: a screen over 25 families (2026-09-09)

The Illinois repair lane found, outside its own grants, that
`il-exp-pardon-set`'s **delivered** fixtures are still the original build from
`78474b174`. Its builder carries the repair everyone has been citing as the
precedent for the Order item-3 and charge-cell adjudications; the artifacts were
never regenerated. Its `reports/actual-writes.json` shows **20 charge cells
holding the case number** and **zero** Order item-3 writes. The source precedent
is real; the delivered bytes are not.

Screened the whole corpus for the same shape — every family whose builder has a
commit newer than its delivered `fixtures/canonical.pdf`:

| | |
|---|---|
| Families matching the screen | **25** |
| Of those, `COMPLETE_PACKET_PROVEN` | **14** |
| `FAIL_REPAIR_REQUIRED` | 6 |
| Other states | 5 |

The fourteen proven on bytes older than their builder: `ar-nonconviction-seal-set`,
`ct-decriminalized-set`, `ct-missed-erasure-set`, `ct-pardon-erasure-set`,
`ga-jail-k2-set`, `il-prostitution-j-vacate-set`, and the eight custom-pleading
families `rcap-ks`, `rcap-ms`, `rcap-nd`, `rcap-ok`, `rcap-tn`,
`rcap-wa-clean-tracks`, `rcap-wi`, `rcap-wv`.

### This is a screen, not a finding

A newer builder commit does not mean the output would differ. Twelve of the 25
point at one commit, `64f2dbb8e` — "Integrate GATE01, PROD-D and FIX28: bytes are
re-hashed before they are called proven" — which touched many builders and may
well change no output at all. `d5450b1c8` ("Repair the four Illinois EXP-AD
builders") is the one already shown to be substantive, by reading the delivered
bytes rather than the dates.

The only thing that settles it is rebuilding and comparing. **Do not act on this
table as though it were a verdict, and do not quietly widen it into one.** What it
supports is a bounded measurement: rebuild the 25, diff against the delivered
bytes, and report which actually moved.

`scripts/measure-build-reproducibility.mjs` is that measurement, with one trap
already paid for: **it rewrites its whole record on every run**, so running it
once per family in a loop replaces an 87-row measurement with a 1-row one. Run it
once over the set, or in a throwaway worktree.

`il-exp-precompletion-set` and `il-seal-nonconv-set` share the Illinois host and
are the likeliest true positives after `il-exp-pardon-set`.

## An inverted safeguard: a builder invariant that REQUIRES the defect (2026-09-09)

`scripts/build-census-v1-al-felony-nonconviction-90-set.mjs:318` reads:

```js
assert.match(instructions, /notary/i);
```

The builder's own repair invariant requires the word to appear in the delivered
participant instructions. What appears there is *"Sign the petition under oath
before an authorized officer or notary…"* — and `AL.memo.json` `rules.notarization`
for this track reads *"The source review does not state a notarization requirement
for CR-65."* The repaired shared host refuses that exact sentence:

```js
assert.doesNotMatch(filing, /Sign the petition under oath before an authorized officer or notary/)
```

Two builders forked before that repair and never run it. One of them asserts the
opposite. So a text-only fix to `al-felony-nonconviction-90-set` fails the
builder's own check, and the check is what keeps an unsupported legal direction
in front of participants.

This is not a safeguard to weaken — it is a safeguard pointing the wrong way, and
the repair is to make it assert what the memo actually establishes. Found by
VF03; the family is `FAIL_REPAIR_REQUIRED` and queued for repair behind the
Illinois lane holding FIX03.

`al-felony-dwop-set` carries the same unsupported sentence without the inverted
assertion.

## Six sworn certifications the route never establishes (2026-09-09)

CR-65 Section V is conjunctive — *"If you have not checked all eight boxes, the
conviction is not eligible"* — and `al-pardoned-felony-set` ticks all eight, as
`route.selection`, on a petition sworn on page 6. `AL.memo.json` track
`al-pardoned-felony` carries `exclusions: []`, `waitingPeriods: []` and four
inputs. So 11.1 (180 days) and 11.2 through 11.6 (violent / sex / moral turpitude
/ serious traffic / CDL) assert facts the route never establishes or asks about,
and 11.0 is contradicted by the track's own stop condition, *"The pardon
withholds firearm rights and the restoration question controls."* Only 10.6 is
route-determined. The list is hardcoded at
`scripts/build-census-v1-al-diversion-set.mjs:56`.

The controlling comparison, which is why this is not an objection to conjunctive
ticking as such: sibling `al-misd-conviction-set` ticks seven Section II boxes
and every one is backed by a memo exclusion, waiting period or input.

This is the AL6-01 defect class surviving the AL6-01 repair — a value written
because the mapping says to, not because the record establishes it — with all
nine counters at zero.

## AL6-03: which case does the CR-65 caption box mean? (2026-09-09, owner question)

`CR-65:Court Case Number_3` on page 7 (x=445.44, w=129.00 — the same x and width
as the boxes filled on pages 6 and 8) is blank while nine pages carry the number;
`C-10-CRIMINAL:Court Case Number_3` likewise. Page 1 separately prints
"COURT CASE NUMBER TO BE EXPUNGED:" as its own line, which the packet also fills,
which argues the caption box means something else. The box is printed
"Court Case Number (Assigned by Clerk)".

**Either reading yields a defect; only the direction is open.** If the box means
the expungement case the clerk assigns, the packet prefills nine pages it should
leave blank. If it means the underlying criminal case, page 7 is a missing write.
Nothing in `AL.memo.json` establishes which, and it is an Alabama forms-practice
conclusion rather than a fact in the record.

Three families are `BLOCKED_LEGAL_INPUT` on `KNOWN_PREFILLS` for this and no
other reason: `al-diversion-set`, `al-misd-conviction-set`, `al-misd-dwop-set`.
They are otherwise clean. **This is the single answer that would move three
families.**

## The route-election counter can only see six families (2026-09-09, measured)

VF13 returned `FAIL_REPAIR_REQUIRED` on all five Illinois families with
`requiredOptionsMissing = 1` on three of them. The shared gate,
`scripts/rcap-packet-completeness/verify-packet-completeness.mjs`, returns
`PASS_COMPLETE` on every one of the five with all nine counters at zero. Both ran
in this container, against the same bytes, at the same commit. Measured:

| Question | Answer |
|---|---|
| Fields anywhere in the corpus declaring `decision: measured_route_selection` | **6** |
| Families containing one | **6** — five New Jersey, one Rhode Island |
| Fields carrying the refusal class `participant_sworn_narrative_or_legal_election` | **9,341** |
| Of those the route-election check examines | **0** |

`requiredOptionsMissing` is raised from exactly two places. One needs a blank the
blank classifier reaches; the other iterates `declaredElections`, built by
matching `String(f.decision).toLowerCase() === "measured_route_selection"`
(`verify-packet-completeness.mjs:490`). A field map that describes its legal
election any other way is not in that set, so no packet it produces can raise the
counter.

**The gate's coverage is set by the artifact it audits.** The comment above that
loop already records one round of this — a decision that was "not literally
refuse" counted as an election made, and the counter read zero on all six
families that declare one while three New Jersey families were failed by hand.
The fix named the one string that then existed. It did not make the check
independent of what the map chooses to call the field, so the same shape returned
one declaration further out.

Illinois is the instance. `12 - Seal Records` is declared
`participant_sworn_narrative_or_legal_election` with `routeDetermined: false`,
and the route registry gives `il-exp-nonconv` and `il-exp-qualprob` no sealing
authority at all — the answer is fixed by the route, not chosen by the
participant. So `routeDetermined: false` is itself the defect, and it is the
field the counter would have had to read to catch it.

### What this does and does not establish

It establishes that `requiredOptionsMissing = 0` is not evidence that a family's
route election is made — for 340 of 346 families the counter cannot fire at all.
Any admission resting on that counter alone rests on less than it appears to.

It does **not** establish that those families are wrong. Most of the 9,341
refused elections are genuinely the participant's to make, and a packet that
leaves them blank and says so is behaving correctly. Which refusals are
route-determined is a route-identity judgement per family; the map is exactly
the artifact under suspicion, so it cannot be the thing that answers.

### What must not be done about it

Not a sweeping tightening applied by the same hand that found it. Making the
check read every election refusal would newly fail families now recorded
`COMPLETE_PACKET_PROVEN`, and whether each is a real failure is the per-family
judgement above. It needs measuring against the route registry family by family,
and an independent reader — not the Captain's own edit at the end of a shift.

Recorded, unconsumed, owned by nobody yet.

## The split

**Fourteen** families are unchanged since the verdict that failed them. Their
failure stands and a repair is genuinely owed:

> al-felony-dwop-set · al-felony-nonconviction-90-set · fl-early-juvenile-set ·
> il-cannabis-vacate-set · il-exp-nonconv-set · il-seal-edu-set · and the eight
> the sweep lists alongside them

**Six** have had their delivered bytes repaired since the verdict. These owe an
independent re-read and nothing else — no build, no source acquisition, no legal
input:

| family | verdict base | what moved |
|---|---|---|
| ar-drug-court-set | 5de917b35 | 1 fixture commit, 2 script |
| ca-17b-reduction-set | 46360ba12 | 1 fixture commit, 1 script |
| co_petition_seal_arrest-set | 553966eaa | 1 fixture commit, 1 script |
| composed-treatment:…:WV:sex-trafficking-victim-vacatur-and-expungement | 03ff12bf9 | 1 fixture commit, 2 script |
| il-seal-2yr-set | fbd22ae2c | 1 fixture commit, 1 script |
| il-seal-3yr-set | fbd22ae2c | 1 fixture commit, 1 script |

**Sixteen** have a repaired build script and **unmoved fixtures**. That is a
different thing and it must not be confused with the six: the repair exists in
code and not in the delivered bytes, so a reader sent at them would read exactly
what already failed and fail it again. They owe a rebuild first, then a read:

> al-diversion-set · al-misd-conviction-set · al-misd-dwop-set ·
> al-pardoned-felony-set · ar-felony-seal-set · ar-pardon-seal-set ·
> az_marijuana_expungement_arrest_no_charges-set · co_motion_seal_conviction-set ·
> co_motion_seal_nonconviction-set · fl-10yr-bridge-set · il-exp-pardon-set ·
> il-exp-precompletion-set · il-exp-qualprob-set · il-seal-nonconv-set ·
> in_infraction_nondisclosure-set · nj_disorderly_persons-set

A caution on that sixteen: "the script moved" is not "the output would move".
Some of those commits are fleet-wide — `64f2dbb8e` re-hashed bytes before
calling them proven across many builders — and would change no output at all.
The decisive test is a rebuild compared against the committed bytes, which is
what `scripts/grade-a-packet-factory-24h/measure-build-reproducibility.mjs`
does. Its committed record
(`data/rcap-grade-a/fable-packet-factory/BUILD_REPRODUCIBILITY.json`) already
answers it for three of the twenty-two and for nobody else: that sweep ran on
2026-09-02, is marked `complete: false`, and deliberately swept only the 87
PROVEN families, so it excludes almost every family here by construction.

**Do not run that tool per family to fill the gap.** It writes its record on
every invocation, so a loop of twenty-two single-family runs replaces an 87-row
measurement with a 1-row one. That happened here and was restored from HEAD
before anything was committed. Run it once over the set, or run it in a
throwaway worktree.

## Why this is the cheapest queue left

The 73 `SOURCE_READY` families need sources, builds, rasters, reads and
acceptance, and only 25 can be built in this container at all. These six need a
reader. The sixteen need a rebuild and a reader. Nothing in either group is
waiting on Roger, on counsel, or on bytes nobody holds.
