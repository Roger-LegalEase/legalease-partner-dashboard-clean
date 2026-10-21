# CODEX-BUILD-01 — build four Iowa Rule 2.86 expungement application families

You are a Codex Cloud task for the LegalEase RCAP Grade-A packet factory, lane `CXB01`, packet-build. You are not the Captain and you integrate nothing. Repository `Roger-LegalEase/legalease-partner-dashboard-clean`. Create branch `codex/build-01-iowa-rule-2-86` from commit `85e9d69e851705b43b1a73b93db6158e40bb02ea` on `claude/legalease-sprint-captain-utucnw` (never from `main`), push only that branch, write one return file. Never rebase, force-push, push to `main` or the Captain branch, or open a pull request. Never `git add .`, `-A` or `--all`. Read `data/rcap-grade-a/packet-factory-24h/codex-build-01/ASSIGNMENT.json` at the Captain branch tip first (its `captainBaseSha` must be the commit you branched from; stop if not), then `AGENTS.md` and `scripts/rcap-packet-completeness/completeness-contract.mjs`.

## Gate 1 — grants and sources, before any write

- `node scripts/grade-a-packet-factory-24h/claim.mjs --assert CXB01 <family>` for each of `ia-12347-set`, `ia-12346-set`, `ia-901c2-set`, `ia-901c3-set`. A non-zero exit is a full stop for that family: report the exact text.
- Resolve each family's official source by content hash the way `scripts/build-census-v1-ia-7251-set.mjs` does (`scripts/lib/corpus-index-paths.mjs` `makeCorpusEntryResolver`, `MASTER_LIBRARY_SOURCE_DIR` or `private/Nationwide Record Clearing`), and verify the sha256 against `data/record-clearing/source-artifact-registry.json`. `ia-12347-set` binds `STATES/IA/02_PACKET_FORMS/IA__FORM__RULE-2.86-FORM-4__…__REV-2024-08__EN.pdf`; the other three bind Rule 2.86 Forms 3, 1 and 2 through the corpus index (`google-drive:` source ids in MASTER_QUEUE.json `sourceHashes`). If any source is absent, stop that family with `SOURCE_ABSENT` and build nothing for it; never substitute a downloaded or hand-made form.

## The four families

Pattern: `ia-7251-set` (Rule 2.86 Form 5, COMPLETE_PACKET_PROVEN) — `scripts/build-census-v1-ia-7251-set.mjs` and `data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill/`. Copy the builder per family and change only the family id, track, form, source binding, field map and route facts.

| Family | Track | Route key (print once, exactly) | Forms | Directory (new) | Builder (new) |
|---|---|---|---|---|---|
| ia-12347-set | ia-12347 | obligation:track-pathway:IA:ia-12347:underage-alcohol-12347 | Rule 2.86 Form 4 + Certification of Service by Mailing or Delivery | data/rcap-all50/overlays/census-v1/ia/ia-12347-set--official-pdf-fill | scripts/build-census-v1-ia-12347-set.mjs |
| ia-12346-set | ia-12346 | obligation:track-pathway:IA:ia-12346:public-intoxication-12346 | Rule 2.86 Form 3 | …/ia-12346-set--official-pdf-fill | scripts/build-census-v1-ia-12346-set.mjs |
| ia-901c2-set | ia-901c2 | obligation:track-pathway:IA:ia-901c2:nonconviction-901c2 | Rule 2.86 Form 1 | …/ia-901c2-set--official-pdf-fill | scripts/build-census-v1-ia-901c2-set.mjs |
| ia-901c3-set | ia-901c3 | obligation:track-pathway:IA:ia-901c3:misdemeanor-901c3 | Rule 2.86 Form 2 | …/ia-901c3-set--official-pdf-fill | scripts/build-census-v1-ia-901c3-set.mjs |

Legal inputs, read and applied, never decided: `data/record-clearing/legal-design-track-registry.json` (the four tracks: stop conditions 2, 2, 7, 7; unresolved questions 1, 1, 2, 3 — print each unresolved question's effect as the registry states it), `data/record-clearing/legal-design-intake/IA.memo.json`, `data/record-clearing/legal-design-packet-set-manifests.json` (component order).

## Known rendering defects and their established fixes (apply, do not rediscover)

- Synthesized selection squares on unmarked checkboxes: `suppressSynthesizedAppearances: true` at the `finalizeOfficialForm` call.
- Appearance streams larger than the widget rect: `fitAppearancesToRect`. Per-widget text overflow: `alignWidgetFontSizeToFit` / `fitTextPerWidget`.
- Synthesized `/MK /BC` borders on unwritten fields: `suppressSynthesizedWidgetBorders`. On WRITTEN fields whose shipped `/AP /N` draws only an underline, the finalizer extension is FIX85 (in flight): record such a widget in `build-findings.json` as a known defect; do not hand-draw a fix.
- Page order follows the packet-set manifest's component order.
- Self-help stop conditions printed verbatim from the track registry at build time; who to ask named only from repository records (the clerk, a licensed lawyer or legal aid) — no invented referral.
- Fee and waiver, service and filing destination in the registry's own words; no invented figure or method.
- A held fact is written where the form asks for it, or its refusal is measured and recorded (`unfittable` with the length against `/MaxLen`, a refusal row in the field map, `requiredBeforeFiling` naming it); never described as filled when blank.
- Never write on a branch the case does not elect. Never prefill signatures, dates, certificate of mailing before mailing, court-only or prosecutor-only fields.
- Every blank carries a true disposition from the closed vocabulary; a fact the platform does not hold is `required_before_filing` and surfaced to the participant.

## Builder contract (all of it, per family, or a STOPPED row with the exact reason)

canonical and boundary fixtures rendered by the builder; every manifest component rendered or dispositioned in `reports/rendered-artifacts.json`; `participant-instructions.md` complete; `reports/actual-writes.json`, `blanks-left-for-the-participant.json`, `completeness-counters.json`, `production-field-map.json`, `source-receipt.json` (sha256-bound), `build-findings.json`, `product-wiring.json` as the pattern family carries them; `node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <id>` with all nine counters zero; two builds byte-identical. Run `node scripts/verify-packet-build-environment.mjs` once and record it. Never run `verify-packet-completeness.mjs --write` or the national chain. You do not verify, approve or terminalize your own output; the Captain arranges the central raster and the independent read.

Writable: the four family directories, the four builders, `data/rcap-grade-a/packet-factory-24h/codex-build-01/RETURN.json`. Read-only: `scripts/rcap-official-forms/**`, every other family and host, legal records, specifications, ledgers, queues, receipts, `src/**`, `supabase/**`.

## Return

`data/rcap-grade-a/packet-factory-24h/codex-build-01/RETURN.json` per ASSIGNMENT.json `returnLocation` (one row per family: status, directory, builder, sourcesResolved with sha256, canonical/boundary sha256, page counts, components rendered and not generated, the nine counters, rebuiltTwiceByteIdentical, knownDefectsRecorded, whatWasNotDone). Commit by file name, push `codex/build-01-iowa-rule-2-86`. Final message: pushed SHA; per family COMPLETED or STOPPED with digests and counters; anything not done.
