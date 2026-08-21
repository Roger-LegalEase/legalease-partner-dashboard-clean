<!-- rcap-url-evidence: this document records what happened to URLs, including
     the ones that failed. It is evidence ABOUT sources, not a record OF them, so
     the acquisition-queue generator excludes it from its link harvest. -->

# Landing-page resolution, source drift, and archive reconciliation

Three questions the acquisition lane had left open, answered against evidence
rather than against the queue's own assumptions.

Nothing here promotes an asset, changes a release status, or makes a route
sellable. Every problem-PDF route remains held, non-sellable and non-public.
What changes is what the repository can now say about where its sources are.

Read with:

- `data/rcap-all50/source-observation-log.json` — what issuing bodies actually
  served, per leg, read from CI job logs
- `data/rcap-all50/source-drift-comparison.json` — every pinned hash against
  every witness of it
- `data/rcap-all50/archive-reconciliation.json` — every queue row against the
  two committed archive indices, with the route that would obtain it
- `scripts/rcap-source-acquisition/landing-page-resolution.mjs` — the resolver
- `npm run rcap:verify-source-resolution` and `npm run rcap:landing-page-resolution`

## The headline

**Not one of the 88 queue rows is blocked on identifying a source.** 84 of 88
have their pinned bytes indexed at a named path in an archive; 14 of those were
served live by an issuing body in a recorded run, byte-identical to the pin.
Exactly one row is unlocated, and its "pin" is the literal string
`sha256_unrecorded_in_repo`, so it never named bytes at all.

The blocker was never identification. It is transport, and the two are not the
same ask.

| Route | Rows | Means |
| --- | ---: | --- |
| `already_observed_live` | 14 | an issuing body served exactly these bytes in a recorded run |
| `fetch_the_recorded_url` | 35 | a URL is recorded and no run has tested it |
| `resolve_from_an_archived_page` | 17 | the page cannot be fetched, and the archive holds a saved copy of that same page |
| `restore_from_archive` | 21 | no usable URL, but the pinned bytes are at a named path in an archive |
| `still_unlocated` | 1 | nothing anywhere |

**Kentucky AOC-334 — the single Priority 1 asset, and the only active-track
asset blocking packet promotion — is `already_observed_live`.**
`https://www.kycourts.gov/Legal-Forms/Legal%20Forms/334.pdf` answered 200
`application/pdf`, 252,268 bytes, SHA-256 `7eb28380…`, which is its pinned hash
and also the Master Library's copy. Three independent records agree. The bytes
are in that run's artifact, which this session's egress policy cannot reach —
that, and only that, is what remains.

## 1. Landing-page resolution

29 of the 41 runnable legs point at an issuing body's page rather than at a
form. The acquisition script could fetch such a page and list every document it
linked, and then stopped: nothing decided which of those documents was the form.
Every landing-page leg ended with an HTML file and no source.

`scripts/rcap-source-acquisition/landing-page-resolution.mjs` closes that. It is
a pure function of `(html, url, form number)`, so it runs with no network at all,
and it is written to refuse rather than to guess, because a wrong resolution is
invisible downstream: the overlay renders, the contact sheet shows a fill, the
packet builds, and nothing later re-asks whether this was the right document.

- Separators are boundaries, never noise. `CC-6-12` does not match `CC-6-12-1`,
  and `CC-6-11` does not match `CC-6-11A`. Any rule that normalises separators
  away makes each of those a substring of the other.
- A trailing numeric or single-character token is part of a form number. A
  trailing word of two or more letters is prose, so `cr287.pdf` outranks
  `cr287-instructions.pdf` and both beat nothing.
- A leading agency prefix may be dropped — North Carolina publishes AOC-CR-287
  as `cr287.pdf` — but never far enough to leave a bare number that two forms
  could answer to. The exception is a form number that is only a prefix and a
  number: Kentucky publishes AOC-334 as `334.pdf`, and a bare token there is
  accepted only as a whole filename.
- A document linked from an official page but served by someone else is refused.
- Two documents named equally well is a refusal, not a coin toss, and every
  refusal carries the candidates it refused.

The acquisition script now takes a second hop when a landing-page leg returns
something that is not a PDF, and the receipt records both hops — the page, its
hash, the verdict, every candidate, and the form. A leg that resolves nothing is
recorded as `landing_page_unresolved` rather than `acquired`: a page is not a
form, and a register that calls it one believes it holds a document it has never
seen.

`npm run rcap:landing-page-resolution` — 22 checks, eight of which run the real
acquisition script end to end against a stubbed network.

### What the evidence says about those 29 legs

Resolution is not what is blocking them. The run recorded in the observation log
shows three different things happening under one label:

| Jurisdiction | Legs | What actually happened |
| --- | ---: | --- |
| VT | 4 | **not landing pages.** `/media/<id>` is a permalink that redirects straight to the PDF. Both VT legs read returned the form, byte-identical to their pins. |
| KY | 5 | the page answers **404**. All five legs name the same dead `Expungement.aspx` URL. |
| NC | 20 | every URL answers **403**, including the bare `/documents/forms` index — nccourts.gov refuses the runner, not a stale document URL. |

So the resolver resolves nothing today, and saying otherwise would be the easy
mistake to make here. What it does is remove the gap permanently, reclassify the
Vermont legs as already complete, and turn "landing-page resolution required"
into three specific and different problems.

## 2. Source drift comparison

Every asset carries a `pinnedHistoricalSha256`, and nothing had asked what that
hash is a hash *of*. It was recorded once, from a source nobody can now name, and
the acquisition workflow passes it as the expected hash — so a mismatch reads as
though the publisher changed something.

That framing is backwards. A pin and a live fetch that disagree is a fact about
two byte strings; which one is the current official form is a different question
that no hash comparison answers. `scripts/rcap-source-drift-compare.mjs`
compares each pin against every independent witness the repository holds and
names the disagreements instead of adjudicating them.

| Verdict | Rows |
| --- | ---: |
| `pin_confirmed_live` | 14 |
| `pin_confirmed_archive_only` | 69 |
| `pin_contradicted_live` | 1 |
| `pin_is_not_a_hash` | 4 |
| `pin_unwitnessed` | 0 |

**Zero unwitnessed.** Every pin that is a hash at all is corroborated by at
least one independent record.

### The contradiction: Virginia CC-1473

The queue holds two rows for this form, pinned to two different documents.

| Row | Pinned | Bytes | Where those bytes are |
| --- | --- | ---: | --- |
| `VA \| CC-1473` | `6176c2f5…` | 120,875 | the Master Library, **and** what vacourts.gov served |
| `VA \| cc1473.pdf` | `6f439049…` | 31,540 | the Nationwide archive only |

`https://www.vacourts.gov/forms/circuit/cc1473.pdf` redirects to
`/static/forms/circuit/cc1473.pdf` and serves 120,875 bytes. So one of the two
rows is pinned to bytes the issuing body does not serve at the URL the row
names. Which document the 31,540-byte file is — an older edition, a different
form, a truncated capture — the comparison does not say, and should not.

### The archives disagree with each other about 11 forms

The two archives were captured separately, so where both hold the same form the
comparison tests whether the repository's own records agree. 37 forms are held by
both; **26 agree byte-for-byte and 11 do not**, across CA, CO, VA and WV. Six
Colorado JDF forms differ by between 24 KB and 477 KB at the same recorded
revision; WV SCA-C-903 differs by a factor of nearly five. Each is one form with
two byte strings in this repository and no record of which is authoritative.

### Four pins are not hashes

`NC cr287_1.pdf`, `NC cr297.pdf`, `NC cr298_1.pdf` and `NE CC-6-11.pdf` carry the
literal string `sha256_unrecorded_in_repo`. They are passed to the workflow as
expected hashes, where they can never match. Nothing can be compared for them.

## 3. Archive / workbook reconciliation

The queue carried this caveat from the day it was generated:

> the official forms-links workbook. `private/Nationwide Record Clearing/` is
> not in this clone, so if that workbook holds URLs these sources do not, group C
> is an overcount. Mount it and re-run this generator.

The folder is still not in this clone. Its **committed file-level index** is —
425 files across all 51 jurisdictions, each with a path, a byte length and a
SHA-256 — and that is enough to settle the caveat without mounting anything.

**There is no forms-links workbook.** The index lists 289 `.pdf`, 90 `.html`,
27 `.rtf`, 13 `.doc`/`.docx`, 4 extensionless and 2 `.aspx` files. No `.xlsx`,
no `.xls`, no `.csv`, no `.tsv`. The instruction to mount the folder and re-run
would not have changed a single row, because there is nothing there to harvest
URLs from.

Group C **is** an overcount, for a better-evidenced reason: **12 of its 13 rows
have their pinned bytes indexed at a named path in an archive**, including all
four Priority 2 rows. Three of those — AK TF-810, NE CC-6-11, NE CC-6-11.2 —
were reached live in the recorded run at URLs *derived* from sibling naming
patterns, and all three returned bytes identical to their pins. The one row left
is `NE CC-6-11.pdf`, whose pin is the placeholder string.

### The archive holds the pages, too

90 of those 425 files are saved copies of issuing-body pages, named after the URL
slug they were saved from. Where a landing-page leg is refused, the archive
frequently holds a copy of that same page:

- the three North Carolina document pages that answer 403 are archived under
  filenames that are character-for-character the URL slugs the queue names,
  captured 2026-06-14
- `forms.html` and `forms-2.html` are the `/documents/forms` index that also 403s
- 23 rows have a page candidate on that strict slug join, 17 of them refused
  and therefore routed to resolve from it; 12 more are refused with no slug
  match but do have archived pages for their jurisdiction —
  Kentucky's `Kentucky-Expungement-Forms.html` is very likely the page that now
  404s, and the join deliberately does not claim so

The resolver from part 1 takes HTML and a URL. It does not care whether the HTML
came off the wire. **Mounting the archive makes the North Carolina and Kentucky
legs resolvable offline**, against pages saved before the courts started
refusing.

## What is still open

1. **The archives are not in this clone.** Both `private/` paths are git-ignored
   and absent. Every `restore_from_archive` and `resolve_from_an_archived_page`
   row needs the folder mounted. That is the single highest-leverage action for
   this lane and it is not a research task.
2. **Acquired bytes are stranded.** Run 32433785452, which carried the two-hop
   script, confirms the receipt transport works — the full receipt was read back
   from its job log between the `RCAP_RECEIPT_BEGIN`/`END` markers, without
   touching the artifact host. It also reproduced Kentucky AOC-334 and Vermont
   200-00132 byte-for-byte a day later, and recorded that
   `vtcourts.gov/media/10142` redirects to the PDF, which settles the Vermont
   legs as permalinks rather than pages. The PDFs themselves are still on
   `productionresultssa*.blob.core.windows.net`, which answers 403 CONNECT
   through a restricted egress proxy — as does the job-summary transport — so
   the identity of every acquisition now travels where the bytes cannot.
3. **28 of the 44 legs in that run were never read**, most of them further North
   Carolina legs. The observation log says so per leg and nothing here treats an
   unread leg as covered.
4. **Three confirmed URLs are not recorded as sources.** AK TF-810, NE CC-6-11
   and NE CC-6-11.2 were fetched successfully at derived URLs returning
   pin-identical bytes. They remain group C, because promoting a derived URL to
   a recorded one belongs on the master list in a deliberate commit, not as a
   side effect of a generator reading its own lane's output. The queue generator
   now excludes these three reports from its link harvest for exactly that
   reason — they record failures as well as successes, and harvesting them would
   file Kentucky's dead 404 page as that jurisdiction's known official source.
5. **The Virginia CC-1473 contradiction and the 11 archive disagreements** are
   source-identity questions for a reviewer. No hash comparison can settle which
   byte string is the official form.
6. **`46/46 jobs successful` is not 46 acquired sources.** The acquire step runs
   with `RCAP_TOLERATE_FAILURE=1`, so a 404, a 403 or a transport failure exits
   0 to protect the other legs. Three of the sixteen legs read acquired nothing.

## What none of this establishes

- that any archived or acquired file is the **current** published edition
- that a hash match means the pin was ever *correct* — it means the pin and the
  publisher agree today
- that an archive index hit means the bytes can be obtained now
- that a 403 or 404 says anything about whether a form exists
- that any asset is closer to `approved_for_live`. Currentness, edition,
  supersession and intended use all remain unmade, and they belong to a person.
