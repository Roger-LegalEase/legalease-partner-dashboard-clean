# ca-1203-4-set — California Penal Code § 1203.4 (official_pdf_fill)

**Result: the source gate is open and steps 1–3 are done off the official bytes.
217 fields censused, 59 of 59 write boxes mapped to boxes the forms actually
draw. Steps 5–8 were NOT done, deliberately, and section 4 says exactly why and
what would reopen them.**

This family is *not* `ca-1203-41-set`. That is a sibling worker's family, a
different statute and a different packet. Nothing here applies to it.

The previous run on this branch stopped at step 1 and was right to: its
container had no corpus mounted, and an absent corpus is not an empty one. Its
findings are preserved in git history at `4f40d1fe` and none of them is
contradicted. The corpus is recovered per container with
`bash scripts/rcap-corpus/bootstrap-private-corpus.sh`.

## 1. The gate: all five sources bind

| Form | Role | Pinned SHA-256 | Result | Pages | Fields |
|---|---|---|---|---|---|
| CR-180 | Petition | `06c1b643…c98bbdbe` | bound exact | 3 | 81 |
| CR-181 | Proposed order | `f737503a…95ce504` | bound exact | 2 | 58 |
| CR-106 | Proof of service | `f8a37a9a…bf190c5a` | bound exact | 2 | 48 |
| MC-025 | Attachment | `b0ca1509…94f6f0af` | bound exact | 1 | 12 |
| MC-031 | Attached declaration | `defc9108…95191075` | bound exact | 1 | 18 |

Preflight: `PACKET_BUILD_ENVIRONMENT_READY`, 14/14. Nothing was acquired; no
egress to any court or agency host was attempted.

Every page is 612×792, `CropBox == MediaBox`, `/Rotate 0`. Page coordinates and
user space coincide throughout, so no measurement needs a transform.

## 2. The source-fidelity question, resolved

Full narrative in `SOURCE_FIDELITY_FINDING.md`; evidence in
`reports/source-fidelity-official-vs-rescued.json`.

The short of it: **the official binaries are readable directly.** All five carry
a permissions-only `/Standard` handler with an **empty user password** — CR-180
and CR-181 AESV3 256-bit, CR-106 AESV2 128-bit, MC-025 and MC-031 RC4 128-bit —
and `/P -1084`, which denies content modification and extraction but **allows
filling in form fields**. The `structuralClassObserved: "unreadable"` in the
corpus index is a true statement about pdf-lib 1.17.1, which has no decryption
support at all, and a false statement about the documents.

The three rescued derivatives were produced 2026-06-17 by `qpdf --decrypt`, and
they are faithful: zero delta against the official binaries in field set,
per-widget `/Rect`, `/FT`, `/Ff`, `/MaxLen`, page geometry, and page
content-stream SHA-256. The one assertion the previous run could not check —
that the rescue read bytes hashing to the pinned official value — is checked and
holds.

**None was used.** A faithful copy of a readable original is unnecessary, and no
geometry in this family was measured off one.

## 3. What was measured, and off what

`reports/field-census.json` and `reports/write-box-map.json`, both produced from
the official binaries, which are re-bound by SHA-256 on every run.

- **217 terminal fields**, each with widget rectangles in page coordinates,
  type, decoded flags, `/MaxLen`, tooltip, and the `/AP /N` states it accepts.
- **59 of 59 checkable widgets** bound to a box the form actually draws. Every
  painted mark falls inside its printed box. No printed box is unclaimed. No
  widget has an unknown on-state. **No box was drawn by this build.**

Three things had to be read rather than assumed, and each would have been a
defect if guessed:

1. **The on-state is never `Yes`, and it is not the same for every widget.**
   Across the 59 checkable widgets the accepted `/AP /N` state name is `1` (34),
   `2` (14), `3` (8), `4`, `5` and `6` — the radio-group members carry their own
   index as their state name. Writing `Yes`, or writing `1` for a widget whose
   state is `4`, sets a state the widget has no appearance for: the box renders
   empty and nothing errors. Every one of the 59 is recorded in the map.
2. **The mark is not painted across the whole `/Rect`.** Each "on" appearance
   opens with a clip inset from its BBox. That inset decides containment on
   MC-031, where the `/Rect` overhangs the printed box while the painted mark
   sits inside it with 0.23pt to spare.
3. **CR-180's printed box is 18×9 with a 9×9 widget centred in it.** A
   squareness filter discarded exactly the boxes that matter; the widgets now
   select the boxes rather than a shape heuristic guessing at them.

`scripts/lib/pdf-stroked-boxes.mjs` was used as the instrument, and it works
here precisely because it takes a content stream rather than a `PDFDocument` —
pdf-lib cannot open these sources, but their content streams can be extracted
from them.

**One gap in that instrument, for the Captain.** MC-031 draws each checkbox as
four separate ~0.36pt bars, some filled and some stroked. No single subpath is
box-shaped, so the instrument correctly reports nothing — but the box is real
and a mark still has to land in it. `bar-assembled-boxes.mjs` assembles those
frames with the same CTM tracking, and is applied only where a checkable widget
already sits and the instrument found no box. `scripts/lib` is shared and was
not modified. The instrument probably wants this third construction absorbed so
every family gets it; that is not this family's call.

## 4. Why steps 5–8 were not done

Not blocked by sources. Blocked on two decisions that are wider than this
family, and that a rendered fixture would silently settle.

**(a) There is no sanctioned way to write a filled artifact from an encrypted
source.** pdf-lib is the only writer here and cannot open any of these five.
Filling requires a decryption stage. qpdf/pikepdf does the job — it is what
produced every measurement above — but it is **not a repository dependency**, is
not in `package.json`, and `scripts/verify-packet-build-environment.mjs` does
not check for it. It was pip-installed in this container. Building on it without
declaring it would leave the next worker with a family it cannot rebuild.

**(b) A filled artifact is not structurally the official form.** This was
measured, not assumed: an AcroForm fill of CR-180 through pdf-lib was produced
in scratch and compared against the official binary.

| | Official | After an AcroForm fill |
|---|---|---|
| Page content streams | — | **identical, all 3 pages** |
| Page count / geometry | 3 @ 612×792 | unchanged |
| Field value written | — | present in the AcroForm |
| `/XFA` packet | present | **removed** |
| Encryption + permission bits | present | **removed** |

CR-180, CR-181 and CR-106 are hybrid static-XFA documents (`/XFA` present,
`/NeedsRendering` absent). pdf-lib announces `Removing XFA form data as pdf-lib
does not support reading or writing XFA` and strips the packet on save.

Worth being precise about, because the obvious fear turns out to be the wrong
one: because the XFA is *removed* rather than left stale, there is **no**
AcroForm/XFA desynchronisation and no risk of a viewer rendering the form blank.
The printed page is preserved byte-for-byte. What is lost is the XFA packet and
the publisher's permission bits.

That is very likely acceptable — on a static XFA form the page content is what
prints and what gets filed, and the XFA packet is redundant with it. But it is a
judgment about altering an official Judicial Council form, and the discipline
here is to say what is lost and let the Captain decide rather than bake the
decision into a committed artifact.

**A related warning, since it affects how any answer gets checked.** The visual
review path renders through Chromium, which does not render XFA at all. For this
class of defect our own raster review is structurally incapable of showing a
difference — it would look correct either way. Do not treat a green raster as
evidence on question (b).

## 5. To reopen steps 5–8

1. Declare a decryption stage: add qpdf/pikepdf (or an equivalent) as a real
   dependency, and add a preflight check for it, so an encrypted-source family
   is reproducible.
2. Rule on (b): is a filled artifact with page content preserved byte-for-byte,
   but `/XFA` and the permission bits removed, acceptable for this family?
3. With both settled, steps 5–8 run as written. Everything they need is already
   measured and committed: `reports/field-census.json` carries the geometry and
   `reports/write-box-map.json` carries the marks and their on-states.

## 6. Work-type status

| Work type | Status |
|---|---|
| `OFFICIAL_SOURCE_ACQUISITION_REQUIRED` | **CLEARED** by binding, 5/5 exact. Nothing acquired. |
| `OFFICIAL_FORM_MAP_REQUIRED` | **CLEARED.** 217 fields censused, 59/59 write boxes mapped off official bytes. |
| `LOCAL_VARIATION_REQUIRED` | **ADDRESSED** by the previous run — `local-variation-record.json`, not redone. |
| `ARTIFACT_REVIEW_REQUIRED` | **NOT CLEARED.** No artifact rendered; see §4. |
| `OUTPUT_LEGAL_APPROVAL_REQUIRED` | **REQUESTED, NOT GRANTED.** |

Nothing here opens a commercial route, creates a fulfilment record, or approves
anything for participant delivery. No participant name was written into a
charge, offence, count, statute or violation caption; no signature, signature
date, certificate of mailing or court-only field was prefilled; no verifier was
skipped or weakened; no source binary was committed; no rescued derivative was
modified.
