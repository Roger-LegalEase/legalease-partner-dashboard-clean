import type { JurisdictionCode, QaResult } from "./types";
import type { PleadingTrackConfig, PleadingRenderResult } from "./renderers/custom-pleading-renderer";

export interface PleadingQaInput {
  config: PleadingTrackConfig;
  renderResult: PleadingRenderResult;
  prohibitedTerms: string[];
}

export interface PleadingAuditManifest {
  packetId: string;
  product: "record_clearing";
  jurisdictionCode: JurisdictionCode;
  trackId: string;
  primaryReliefTerm: string;
  templateGrade: string;
  templateLifecycle: string;
  shadowMode: boolean;
  rendered: boolean;
  qaResult: QaResult;
  counselFlags: string[];
  outputTextSample: string;
  createdAt: string;
}

export function runPleadingQa(input: PleadingQaInput): QaResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const text = input.renderResult.fullText;

  // HARD: must have rendered
  if (!input.renderResult.rendered) {
    failures.push("Pleading did not render. Check errors in render result.");
  }

  // HARD: Grade E blocked
  if (input.renderResult.templateGrade === "html_replica_or_unverified") {
    failures.push(
      "Grade E (html_replica_or_unverified) template output is blocked from any pleading generation."
    );
  }

  // HARD: lifecycle must be replacement_candidate, never verified_replacement
  if (input.renderResult.templateLifecycle === "verified_replacement") {
    failures.push(
      "Lifecycle verified_replacement is blocked; pleading state must be replacement_candidate for shadow builds."
    );
  }

  // HARD: vocabulary — no prohibited terms in output text
  for (const term of input.prohibitedTerms) {
    if (new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text)) {
      failures.push(
        `Output must not use prohibited term "${term}" for ${input.config.primaryReliefTerm} track.`
      );
    }
  }

  // HARD: required footer present
  if (!text.includes("This is not an official court form")) {
    failures.push(
      "Required footer 'This is not an official court form' is missing from output."
    );
  }

  // HARD: no seal or logo markers
  if (/\[seal\]/i.test(text) || /\[logo\]/i.test(text)) {
    failures.push(
      "Output must not contain [seal] or [logo] markers. No manual seals or logos are permitted."
    );
  }

  // Warning: primary relief term should appear in output
  if (!new RegExp(`\\b${escapeRegExp(input.config.primaryReliefTerm)}\\b`, "i").test(text)) {
    warnings.push(
      `Primary relief term "${input.config.primaryReliefTerm}" not found in output text — verify pleading is correctly rendered.`
    );
  }

  return { passed: failures.length === 0, failures, warnings };
}

export function buildPleadingAuditManifest(input: {
  packetId: string;
  config: PleadingTrackConfig;
  renderResult: PleadingRenderResult;
  qaResult: QaResult;
  createdAt?: string;
}): PleadingAuditManifest {
  return {
    packetId: input.packetId,
    product: "record_clearing",
    jurisdictionCode: input.config.jurisdictionCode,
    trackId: input.config.trackId,
    primaryReliefTerm: input.config.primaryReliefTerm,
    templateGrade: input.renderResult.templateGrade,
    templateLifecycle: input.renderResult.templateLifecycle,
    shadowMode: input.renderResult.shadowMode,
    rendered: input.renderResult.rendered,
    qaResult: input.qaResult,
    counselFlags: input.renderResult.counselFlags,
    outputTextSample: input.renderResult.fullText.slice(0, 500),
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
