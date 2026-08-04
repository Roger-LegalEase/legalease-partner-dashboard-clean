/**
 * Validate the declared top-level output contract for one authority or
 * acquisition-reconciliation job. The factory prompt exposes the same
 * requiredOutputFields array; this validator remains the enforcing side.
 */
export function assertAuthorityOutputContract(job, relativePath, value) {
  if (job.lane !== "source_acquisition") return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `${job.jobId} authority output must be a JSON object (${relativePath}).`
    );
  }

  for (const field of job.requiredOutputFields ?? []) {
    if (!Object.hasOwn(value, field)) {
      throw new Error(
        `${job.jobId} output is missing required top-level field ${field} (${relativePath}).`
      );
    }
  }

  if ((job.acquisitionIds?.length ?? 0) > 0) {
    assertExactIds(job, relativePath, value, "acquisitionIds");
  }
  if ((job.reconciliationIds?.length ?? 0) > 0) {
    assertExactIds(job, relativePath, value, "reconciliationIds");
  }

  if (
    Object.hasOwn(value, "downloadedSourceCount") &&
    (!Number.isInteger(value.downloadedSourceCount) ||
      value.downloadedSourceCount < 0)
  ) {
    throw new Error(
      `${job.jobId} downloadedSourceCount must be a non-negative integer (${relativePath}).`
    );
  }
  if (
    Number.isInteger(job.downloadedSourceCount) &&
    value.downloadedSourceCount !== job.downloadedSourceCount
  ) {
    throw new Error(
      `${job.jobId} must record downloadedSourceCount=${job.downloadedSourceCount} (${relativePath}).`
    );
  }

  if (job.strategyFamily === "local_form_scope_correction") {
    if (
      value.legalDesignReconciliationRequired !== true ||
      value.statewidePromotionAllowed !== false
    ) {
      throw new Error(
        `${job.jobId} must require legal-design reconciliation and forbid statewide promotion.`
      );
    }
  }

  if (job.strategyFamily === "commercial_license") {
    const adoptedLicense =
      value.licenseAdopted === true &&
      value.adoptedLicense &&
      /^[0-9a-f]{64}$/.test(value.adoptedLicense.sha256 ?? "");
    if (
      value.generationAllowed !== false &&
      !(value.generationAllowed === true && adoptedLicense)
    ) {
      throw new Error(
        `${job.jobId} cannot allow generation without an adopted license pinned by SHA-256.`
      );
    }
  }
}

function assertExactIds(job, relativePath, value, field) {
  const raw = Array.isArray(value[field]) ? value[field] : [];
  if (
    raw.some((entry) => typeof entry !== "string") ||
    new Set(raw).size !== raw.length
  ) {
    throw new Error(
      `${job.jobId} output must list unique string ${field} values (${relativePath}).`
    );
  }
  const actual = [...raw].sort();
  const expected = [...job[field]].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${job.jobId} output must account for its exact ${field} (${relativePath}).`
    );
  }
}
