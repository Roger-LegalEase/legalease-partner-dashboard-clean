// The Colorado official-form binding check.
//
// It recomputes every generated record from the census and the authored
// specification, compares the result against what is committed, and then asks
// the questions a diff cannot: does protection re-derive the same way, does
// every mutation still get caught, is every declared write actually on the
// bytes, and does the render receipt still name a renderer that does not
// exist.
//
// A hand edit to any emitted file fails the first check with the path. A
// weakened protection rule fails the second. A renderer quietly restored under
// its old name fails the last.
import fs from "node:fs";
import path from "node:path";

import { bindForm } from "./bind";
import { mergeFacts, DerivedFactOverrideError } from "./derived-facts";
import { auditProtection, derivedProtection } from "./protected-fields";
import {
  computeArtifactReviewFiles,
  computeSpecifiedFamilyFiles,
  determineRenderer,
  inheritedRendererProvenance,
  rewriteRenderReceipt,
  sha256,
  type ComputeOptions,
  type EmittedFile,
} from "./pipeline";
import { readArtifact } from "./artifact-review";
import {
  COLORADO_OVERLAY_ROOT,
  DANGLING_RENDERER_FAMILIES,
  SPECIFIED_FAMILIES,
  UNRECOVERABLE_RENDERER,
} from "./families";

export interface CheckResult {
  readonly ok: boolean;
  readonly label: string;
  readonly detail: string;
}

export interface VerificationReport {
  readonly checks: readonly CheckResult[];
  readonly failures: number;
  readonly summary: Readonly<Record<string, number | string>>;
}

export async function verifyColoradoOfficialForms(options: ComputeOptions): Promise<VerificationReport> {
  const checks: CheckResult[] = [];
  const record = (ok: boolean, label: string, detail: string) => checks.push({ ok, label, detail });
  const summary: Record<string, number | string> = {};

  const determination = determineRenderer(options.rootDir, options.gitObjectExists);

  // ---- 1. The renderer determination still holds ---------------------------
  record(
    !determination.presentInTree,
    "the renderer the ported manifests named is still absent",
    `${UNRECOVERABLE_RENDERER}: ${determination.presentInTree ? "PRESENT — the determination must be revisited" : "absent"}`,
  );
  record(
    !determination.supersedingRendererCoversColorado,
    "no renderer in accepted history claims Colorado",
    determination.supersedingRendererCoversColorado
      ? "the d1 renderer now names CO; the manifests should be repointed to it"
      : `${determination.supersedingRendererInAcceptedHistory ?? "none"} does not name CO among its jurisdictions`,
  );
  summary.officialCorpusMounted = determination.officialCorpusMounted ? "yes" : "no";

  // ---- 2. Every emitted record is what the pipeline produces ---------------
  const expected: EmittedFile[] = [];
  for (const family of SPECIFIED_FAMILIES) {
    const { files, context } = await computeSpecifiedFamilyFiles(family, options);
    expected.push(...files);
    expected.push(...(await computeArtifactReviewFiles({ context, readArtifact })));

    // ---- 3. Protection re-derives the same way ----------------------------
    const disagreements = auditProtection(context.spec.fields);
    record(
      disagreements.length === 0,
      `${family.family}: protection re-derives to the specification`,
      disagreements.length === 0
        ? `${context.spec.fields.filter((f) => f.fieldClass === "protected").length} protected field(s), no disagreement`
        : disagreements.map((d) => `${d.field}: ${d.problem}`).join("; "),
    );

    // ---- 4. Not one protected field is ever written -----------------------
    const everyFixture = ["canonical", "boundary", "negative"] as const;
    let protectedWrites = 0;
    for (const fixture of everyFixture) {
      const plan = bindForm(
        context.spec,
        mergeFacts(context.spec, family.fixtures[fixture]),
        context.specSha256,
      );
      protectedWrites += plan.outcomes.filter(
        (outcome) => outcome.written && derivedProtection(outcome.field, "", "") !== null,
      ).length;
      protectedWrites += plan.outcomes.filter(
        (outcome) => outcome.written && context.spec.fields.find((f) => f.field === outcome.field)?.fieldClass === "protected",
      ).length;
    }
    record(
      protectedWrites === 0,
      `${family.family}: no protected field is written by any fixture`,
      `${protectedWrites} protected write(s) across three fixtures`,
    );

    // ---- 5. A caller cannot override a document-established fact -----------
    let overrideRejected = false;
    try {
      mergeFacts(context.spec, { "derived.cbi_required": "no" });
    } catch (error) {
      overrideRejected = error instanceof DerivedFactOverrideError;
    }
    record(
      overrideRejected,
      `${family.family}: a caller cannot un-tick a box the form marks required`,
      overrideRejected ? "rejected" : "ACCEPTED — the override path is open",
    );

    // ---- 6. Determinism: same inputs, identical plan -----------------------
    const facts = mergeFacts(context.spec, family.fixtures.canonical);
    const first = JSON.stringify(bindForm(context.spec, facts, context.specSha256));
    const second = JSON.stringify(bindForm(context.spec, facts, context.specSha256));
    record(first === second, `${family.family}: the canonical plan is identical across two runs`, `${sha256(first).slice(0, 16)}`);

    summary[`${context.spec.documentId} fields`] = context.spec.fieldCount;
    summary[`${context.spec.documentId} writable`] = context.spec.fields.filter(
      (field) => field.fieldClass !== "protected" && field.fieldClass !== "unmapped",
    ).length;
    summary[`${context.spec.documentId} protected`] = context.spec.fields.filter(
      (field) => field.fieldClass === "protected",
    ).length;
    summary[`${context.spec.documentId} spec sha256`] = context.specSha256;
  }

  for (const family of DANGLING_RENDERER_FAMILIES) {
    expected.push(rewriteRenderReceipt(options.rootDir, family, determination));
    if (!SPECIFIED_FAMILIES.some((specified) => specified.family === family)) {
      expected.push(inheritedRendererProvenance(options.rootDir, family, determination));
    }
  }

  const drifted: string[] = [];
  for (const file of expected) {
    const absolute = path.join(options.rootDir, file.path);
    const onDisk = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : null;
    if (onDisk !== file.text) drifted.push(file.path);
  }
  record(
    drifted.length === 0,
    "every emitted record matches what the pipeline produces",
    drifted.length === 0 ? `${expected.length} record(s) current` : `drifted: ${drifted.join(", ")}`,
  );
  summary.emittedRecords = expected.length;

  // ---- 7. No Colorado manifest names a renderer that cannot run ------------
  const stillNaming: string[] = [];
  for (const family of fs.readdirSync(path.join(options.rootDir, COLORADO_OVERLAY_ROOT))) {
    const receipt = path.join(options.rootDir, COLORADO_OVERLAY_ROOT, family, "reports/rendered-artifacts.json");
    if (!fs.existsSync(receipt)) continue;
    const parsed = JSON.parse(fs.readFileSync(receipt, "utf8")) as { renderer?: unknown };
    if (typeof parsed.renderer === "string" && !fs.existsSync(path.join(options.rootDir, parsed.renderer))) {
      stillNaming.push(`${family} → ${parsed.renderer}`);
    }
  }
  record(
    stillNaming.length === 0,
    "no Colorado render receipt names a renderer that is not in the tree",
    stillNaming.length === 0 ? "none" : stillNaming.join(", "),
  );

  // ---- 8. Retained artifacts still match their recorded digests ------------
  let artifactsChecked = 0;
  const mismatched: string[] = [];
  for (const family of fs.readdirSync(path.join(options.rootDir, COLORADO_OVERLAY_ROOT))) {
    const receiptPath = path.join(options.rootDir, COLORADO_OVERLAY_ROOT, family, "reports/rendered-artifacts.json");
    if (!fs.existsSync(receiptPath)) continue;
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8")) as {
      artifacts?: Record<string, { sha256: string; bytes: number }>;
    };
    for (const [relPath, meta] of Object.entries(receipt.artifacts ?? {})) {
      const absolute = path.join(options.rootDir, COLORADO_OVERLAY_ROOT, family, relPath);
      artifactsChecked += 1;
      if (!fs.existsSync(absolute)) {
        mismatched.push(`${family}/${relPath}: missing`);
        continue;
      }
      const bytes = fs.readFileSync(absolute);
      if (sha256(bytes) !== meta.sha256 || bytes.length !== meta.bytes) {
        mismatched.push(`${family}/${relPath}: digest drift`);
      }
    }
  }
  record(
    mismatched.length === 0,
    "every retained Colorado artifact matches its recorded digest",
    `${artifactsChecked} artifact(s); ${mismatched.length === 0 ? "all match" : mismatched.join(", ")}`,
  );
  summary.artifactsVerified = artifactsChecked;

  // ---- 9. Every mutation is still caught -----------------------------------
  for (const family of SPECIFIED_FAMILIES) {
    const mutationPath = path.join(
      options.rootDir,
      COLORADO_OVERLAY_ROOT,
      family.family,
      "specification/reports/mutation-tests.json",
    );
    const parsed = JSON.parse(fs.readFileSync(mutationPath, "utf8")) as {
      allCaught: boolean;
      mutations: { mutation: string; caught: boolean }[];
    };
    const missed = parsed.mutations.filter((mutation) => !mutation.caught);
    record(
      parsed.allCaught && missed.length === 0,
      `${family.family}: every mutation is caught`,
      `${parsed.mutations.length} mutation(s); ${missed.length === 0 ? "all caught" : `missed: ${missed.map((m) => m.mutation).join(", ")}`}`,
    );
  }

  // ---- 10. Nothing protected is on the retained bytes ----------------------
  for (const family of SPECIFIED_FAMILIES) {
    const actualWrites = JSON.parse(
      fs.readFileSync(
        path.join(options.rootDir, COLORADO_OVERLAY_ROOT, family.family, "specification/reports/actual-writes.json"),
        "utf8",
      ),
    ) as {
      protectedRowEvidence: {
        noProtectedFieldWasWritten: boolean;
        rowsCompared: number;
        rowsThatChangeWhenFactsArePresent: { field: string }[];
        declaredValuesFoundInAProtectedRow: { field: string }[];
      };
    };
    const evidence = actualWrites.protectedRowEvidence;
    record(
      evidence.noProtectedFieldWasWritten,
      `${family.family}: no protected row on the retained artifacts carries anything fact-derived`,
      evidence.noProtectedFieldWasWritten
        ? `${evidence.rowsCompared} protected row(s), identical with and without participant facts`
        : `changed: ${evidence.rowsThatChangeWhenFactsArePresent.map((row) => row.field).join(", ")}; values found in: ${evidence.declaredValuesFoundInAProtectedRow.map((row) => row.field).join(", ")}`,
    );
  }

  // ---- 11. Every retained page is still the official page ------------------
  for (const family of SPECIFIED_FAMILIES) {
    const review = JSON.parse(
      fs.readFileSync(
        path.join(options.rootDir, COLORADO_OVERLAY_ROOT, family.family, "specification/reports/visual-review.json"),
        "utf8",
      ),
    ) as {
      declaredPageCount: number;
      artifacts: { artifact: string; pageCount: number; pageCountMatchesSource: boolean }[];
    };
    const wrong = review.artifacts.filter((artifact) => !artifact.pageCountMatchesSource);
    record(
      wrong.length === 0,
      `${family.family}: every retained artifact carries the document's ${review.declaredPageCount} pages`,
      wrong.length === 0
        ? `${review.artifacts.length} artifact(s) reviewed page by page`
        : wrong.map((artifact) => `${artifact.artifact}: ${artifact.pageCount}`).join(", "),
    );
  }

  // ---- 12. The routes stay closed ------------------------------------------
  const dispositions = await import("../lane-g-route-dispositions");
  record(
    dispositions.COLORADO_LANE_G_ANY_GRADE_A_CANDIDATE === false,
    "no Colorado route is a Grade-A candidate",
    "0 of 3",
  );
  record(
    dispositions.COLORADO_LANE_G_ROUTES.every((route) => route.commercialStatus === "hold" && route.checkoutProhibited),
    "every Colorado route is on commercial hold with checkout prohibited",
    `${dispositions.COLORADO_LANE_G_ROUTES.length} route(s)`,
  );

  return { checks, failures: checks.filter((check) => !check.ok).length, summary };
}
