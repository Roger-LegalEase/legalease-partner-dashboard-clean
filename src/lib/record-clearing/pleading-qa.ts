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

  // HARD: no vendor attribution or product disclaimer on court-facing text.
  //
  // This rule used to be its exact inverse — the footer "This is not an official
  // court form" was REQUIRED on every rendered pleading, alongside "Prepared by
  // petitioner using <product>". Both are the vendor talking on a participant's
  // filing: one advertises, and the other addresses the court about the
  // document's provenance, which is not the participant's certification to make.
  // Guidance of that kind belongs on the packet's participant pages, and the
  // renderer now carries it there as guidanceNotes.
  //
  // It sits beside the seal/logo rule below because it is the same rule: nothing
  // that marks the document as a product may appear on a page filed with a court.
  if (/This is not an official court form/i.test(text)) {
    failures.push(
      "Court-facing output must not carry the 'This is not an official court form' disclaimer; it belongs on participant guidance pages."
    );
  }
  if (/\bPrepared by\b[^.]*\busing\b/i.test(text) || /\bLegalEase\b/i.test(text)) {
    failures.push(
      "Court-facing output must not carry product attribution."
    );
  }

  // HARD: a proposed order is signed by the judge, on the rendered page.
  //
  // The config-level rule refuses a component that CLAIMS another signer. This
  // checks the document that actually came out, so a template change cannot
  // quietly put a participant signature under an order while the config still
  // reads "judge". Preparation and signature stay distinct: the participant
  // prepares and submits it, the court signs it.
  const proposedOrder = input.renderResult.sections.find((s) => s.sectionId === "proposed_order");
  if (proposedOrder) {
    if (!/BY THE COURT:/.test(proposedOrder.text)) {
      failures.push(
        "A proposed order must carry the court's signature block; only a judge signs it."
      );
    }
    // Under the court's signature block, only the signature rule and the judge's
    // designation may appear. A participant signature arrives as a name line, a
    // typed address, or a "Date:" line, and each of those fails here.
    const belowSignature = (proposedOrder.text.split("BY THE COURT:")[1] ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    // No \b after "J.": the "." is already a non-word character at end of
    // string, so a word boundary can never match there.
    const courtBlockLine = (line: string) => /^_+$/.test(line) || /^(J\.|Judge|JUDGE)/.test(line);
    const intruder = belowSignature.find((line) => !courtBlockLine(line));
    if (intruder) {
      failures.push(
        `A proposed order must not carry a participant signature line (found "${intruder}" under the court's signature block).`
      );
    }
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
