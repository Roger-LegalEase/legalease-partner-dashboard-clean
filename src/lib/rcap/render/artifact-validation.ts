import "server-only";

import crypto from "node:crypto";

/**
 * What has to be true of the bytes before anyone is told a packet exists.
 *
 * The failure this guards against is not a corrupt file. It is a *plausible*
 * file: something that opens, has a page, and is not the filing the participant
 * paid for. So validation checks the three properties that a substitution
 * cannot fake at once — it is a PDF, it has the page count this packet was
 * composed to have, and its bytes hash to the digest recorded at attachment.
 *
 * The digest is the load-bearing one, and it works only because the Grade-A
 * renderer is deterministic: the same specification and the same verified facts
 * render byte-identical output every time, with the document dates bound to the
 * verification rather than the clock. That is what lets a repeat download
 * re-render and compare, instead of trusting whatever is in storage.
 */

export const PDF_MAGIC = "%PDF-";

export type ArtifactValidationInput = {
  bytes: Uint8Array;
  expectedContentType: string;
  /** Present on a repeat delivery; absent on the first validation, which sets it. */
  expectedSha256?: string | null;
  /** Present once the packet's composed document count is known. */
  expectedPageCount?: number | null;
};

export type ArtifactValidationResult = {
  valid: boolean;
  sha256: string;
  byteLength: number;
  pageCount: number;
  /** Every reason this artifact may not be delivered, sorted for determinism. */
  failures: string[];
};

export class ArtifactValidationError extends Error {
  readonly failures: readonly string[];
  constructor(result: ArtifactValidationResult) {
    super(`Artifact validation failed: ${result.failures.join("; ")}`);
    this.name = "ArtifactValidationError";
    this.failures = Object.freeze([...result.failures]);
  }
}

export function sha256Hex(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

/**
 * Counts page objects in a PDF.
 *
 * Deliberately a byte scan rather than a parse: re-parsing with pdf-lib to
 * count pages would validate the artifact with the same library that produced
 * it, so a library-level defect would be invisible to the check that exists to
 * catch it. `/Type /Page` (not `/Pages`) appears once per page object.
 */
export function countPdfPages(bytes: Uint8Array): number {
  const text = Buffer.from(bytes).toString("latin1");
  const matches = text.match(/\/Type\s*\/Page(?![sA-Za-z])/g);
  return matches ? matches.length : 0;
}

export function validateArtifact(input: ArtifactValidationInput): ArtifactValidationResult {
  const { bytes } = input;
  const failures: string[] = [];
  const sha256 = sha256Hex(bytes);
  const isPdf = input.expectedContentType === "application/pdf";
  const pageCount = isPdf ? countPdfPages(bytes) : 0;

  if (bytes.byteLength === 0) {
    failures.push("the artifact is empty");
  }

  if (isPdf) {
    const header = Buffer.from(bytes.slice(0, PDF_MAGIC.length)).toString("latin1");
    if (header !== PDF_MAGIC) {
      failures.push(`the artifact is declared application/pdf and does not begin with ${PDF_MAGIC}`);
    }
    if (pageCount < 1) {
      failures.push("the artifact has no pages; a zero-page PDF is a receipt, not a filing packet");
    }
  } else {
    failures.push(`${input.expectedContentType} is not a deliverable packet content type`);
  }

  if (typeof input.expectedPageCount === "number" && input.expectedPageCount > 0 && pageCount !== input.expectedPageCount) {
    failures.push(`the artifact has ${pageCount} pages and this packet was composed with ${input.expectedPageCount}`);
  }

  if (input.expectedSha256) {
    if (input.expectedSha256 !== sha256) {
      // The substituted-object case. Named plainly, because "checksum mismatch"
      // reads like corruption and this is the case where storage returned a
      // different object than the one that was vouched for.
      failures.push("the stored artifact is not the artifact this packet was validated as; delivery refuses a substituted object");
    }
  }

  return { valid: failures.length === 0, sha256, byteLength: bytes.byteLength, pageCount, failures: failures.sort() };
}

/** Validate or throw. Used where a caller has no meaningful way to continue. */
export function assertValidArtifact(input: ArtifactValidationInput): ArtifactValidationResult {
  const result = validateArtifact(input);
  if (!result.valid) throw new ArtifactValidationError(result);
  return result;
}
