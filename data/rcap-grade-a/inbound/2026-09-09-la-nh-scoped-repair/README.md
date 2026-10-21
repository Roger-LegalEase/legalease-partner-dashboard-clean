# Louisiana / New Hampshire scoped repair — actual code and four complete outputs

## What is delivered

- `la-987-set-aside-and-dismiss-set`: canonical and boundary, **five pages each**. The existing full builder now reproduces the source-prescribed motion, rule and order; moves machine metadata out of the filed instrument; retains proper neutral fact fields, representation/Article choices, complete contact blocks, protected execution and specific missing-information disclosures. Canonical extra facts are explicitly synthetic; the boundary has unresolved essential completion facts and is not ready to sign/file.
- `nh_petition_vacated-set`: canonical and boundary, **15 pages each**. Both generated instruction paths separate initial court costs from later agency costs and petition notice from separate financial-statement service. All first nine official pages per packet are reused, not re-rendered from unavailable blanks. The two effect/limits guide pages per fixture also remain pixel-identical. Existing ten self-help stops and financial-service uncertainty remain.
- **25 exact installation targets**, listed with before/after hashes. These are complete candidate code/output files, not a new terminal status. `candidate.patch` is a standard Git binary patch.

## Executed evidence

The final LA CLI ran twice without `--check`, exit0 twice; every one of the 17 generated or preserved family files matched. Three of these retained files were unchanged, not newly authored. The two NH complete guide recompositions each exited0 and matched all five emitted files; no blank-form renderer executed. The 22 focused Node tests passed, including a second isolated patch-replay checkout. Four whole-PDF checks and three corrupted complete-PDF controls passed. Full-page PDFium author QA measured40page instances. The18 changed instances are covered by15 inspected distinct full pages and3 exact aliases. All18 NH official and4 effect-guide instances are pixel-identical to baseline. This is author QA, not independent review or calibrated central Chromium acceptance.

A preliminary replay checkout lacked an unchanged transitive helper. After restoring the real retained helper files, all22 focused tests passed. No stub or weakened test was used. The initial failure and final results remain separate.

## Safe installation

Use a clean, isolated task worktree based on current Captain, not Claude's dirty active worktree. Read `INSTALL_MANIFEST.json` first. Verify that each existing target matches its exact `before` SHA-256 and each new target is absent. If some targets already match `after`, preserve them and reconcile per-file; do not blindly apply the complete patch twice. Unexpected current bytes require comparison, not overwrite. Reject symlinked target parents. No files outside the two families, two builders, scoped helpers/test, and exact statutory source are in the patch.

```
git apply --check /path/to/candidate.patch
git apply /path/to/candidate.patch
```

Verify every target against `after` identities before committing explicit paths. Patch replay, matching all25files, duplicate refusal, reverse restoration and a corrupt-preimage refusal are recorded in `evidence/patch-replay.json`.

This is a **file-bound patch**, not a full current-Captain build. Current builder preimages matched Captain `2a01a973082c279ef95229407d45a1252a9dbec3`. Shared authority inputs were restored from the explicit retained source snapshot; their actual hashes and selected LA entries are in `INPUT_BINDINGS.json` and the LA receipt. Before admission, compare the relevant entries with current Captain and regenerate only necessary metadata under existing rules. Do not replace the16MB registry with this older snapshot.

## Reproduce the focused tests after installing outputs

NH's scoped re-composer deliberately reads the ORIGINAL bound complete packets. After installation, restore its four preimage inputs from the inspected Git commit into a new scratch directory, then set `RCAP_NH_REPAIR_BASELINE_DIR`. Do not point it to the corrected PDFs and mistake the expected refusal for a new defect.

```sh
baseline=$(mktemp -d)
family=data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill
for rel in fixtures/canonical.pdf fixtures/boundary.pdf reports/rendered-artifacts.json production-field-map.json; do
  mkdir -p "$baseline/$(dirname "$rel")"
  git show "2a01a973082c279ef95229407d45a1252a9dbec3:$family/$rel" > "$baseline/$rel" || exit 1
done
RCAP_NH_REPAIR_BASELINE_DIR="$baseline" node --test scripts/rcap-packet-recovery/chat-la-nh/repair.test.mjs
RCAP_NH_REPAIR_BASELINE_DIR="$baseline" node scripts/rcap-packet-recovery/chat-la-nh/refresh-nh-guides.mjs --out /new/empty/nh-output
```

Use existing compatible locked dependencies. Recorded runtime: Node22.16.0, pdf-lib1.17.1, sharp0.34.5; author appearance checks use local PyMuPDF/PDFium. No font files or dependency tree are distributed.

For LA, the ordinary CLI remains `node scripts/build-census-v1-la-987-set-aside-and-dismiss-set.mjs --no-raster`. Both its normal path and the NH normal full-source path now use corrected instructions. A full-source NH run was not performed because original blank bytes were not locally present; retained official pages were preserved instead.

## Remaining integration and review, not new legal gates

**Shared registry/intake are unchanged by this batch.** Consume Chat6 Group09/11's already-recorded corrections at their actual producing fields: LA/NH `manualCompletionItems`, `packetSet.participantActionRequired` and derived `requiredBeforeFiling`; LA nonexistent waiver procedure; NH fee-stage summaries and mandatory `notarize:None identified`. Preserve court/DA future acts as protected rather than silently deleting source history. Synchronize originating memo and generator projection so the contradiction does not regenerate. Do not assume blanket removal based on the words `court` or `fee`. The exact modified packet instructions already distinguish these roles, but the remaining global gates cannot be claimed fixed here.

LA still requires the selected parish's actual cost/service handling and current supported route/fact handling. NH retains automatic-cohort/form/channel applicability and separate financial-statement service/agency-cost questions. These two rendering fixtures do not establish exhaustive route coverage, actual intake, source freshness or valid real participants. Existing synthetic boundary caption facts are retained and do not certify venue.

No independent verdict, approval record, national queue, runtime entitlement, production setting or terminal count is changed. Old product declarations are preserved as historical inputs, not updated authority for these new PDFs. Captain must reconcile current source/dependency anchors, install exact outputs, obtain proportional independent review and central acceptance where the existing contract requires it. Do not count this archive as two closed families.

## Source basis

- Existing Louisiana repair contract: `docs/rcap/grade-a/research/2026-09-06-batch-02/Louisiana_Article_987_Repair_Contract.md`.
- Chat6 Group09 `group-09-la987-authority-input.json` and Group11 `group-11-ne-nh-prefiling-corrections.json` at source branch `e56ed74ff8b82fd65766ab0d5d42ca2186da1b78`.
- Louisiana Legislature Articles986/987: https://www.legis.la.gov/legis/Law.aspx?d=919679 and https://www.legis.la.gov/legis/Law.aspx?d=919680.
- New Hampshire RSA651:5: https://gc.nh.gov/rsa/html/LXII/651/651-5.htm.

Exact Louisiana transcription:5286bytes, SHA256 `5e2bb2ee372d01c819b4466a222cd61fc5b931b3e4a1e9a93d34a5c549820900`; not original HTML bytes or an issuer PDF. No new official-source acquisition or counsel adoption is claimed.
