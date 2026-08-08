/**
 * What counts as having acquired an official document.
 *
 * Two integrated source decisions in one wave found the same hole from
 * opposite sides. Minnesota's official channel answers automation with a
 * Cloudflare managed challenge: HTTP 403, `cf-mitigated: challenge`. That one
 * at least fails loudly. Delaware's answers with **HTTP 200** and a 247-byte
 * F5/BIG-IP body reading "The requested URL was rejected" with a rotating
 * support ID. A pipeline that treats 2xx as success writes that rejection page
 * to disk, hashes it, and pins it as the official form.
 *
 * So status never establishes acquisition here. A response has to survive
 * every applicable check below before it may be called acquired:
 *
 *   1. it is not an access block, challenge or rejection;
 *   2. the status permits success;
 *   3. the content type matches the expected asset, or is safely parseable
 *      as it under the repository's explicit wrong-MIME policy;
 *   4. the file signature matches;
 *   5. a parser opens it;
 *   6. the expected document structure is present.
 *
 * Block detection runs first, deliberately. An F5 rejection is a 200 with a
 * `text/html` body, and every later check would otherwise report it as "wrong
 * content type" — true, but it buries the fact that a perimeter refused us
 * behind what looks like a routine mismatch.
 *
 * A blocked response yields exactly one disposition and never yields bytes,
 * a digest, a receipt or a worker-ready contract. Nothing in this module
 * evades, retries against a mirror, or substitutes a replica: a block is an
 * answer, and the answer is that a person has to fetch it.
 */

import crypto from "node:crypto";

/** The only disposition a blocked acquisition may produce. */
export const ACQUISITION_BLOCKED_DISPOSITION =
  "official_download_automation_blocked_attended_retrieval_required";

/** Dispositions that must never appear for a blocked response. */
export const SUCCESS_DISPOSITIONS = Object.freeze([
  "acquired",
  "acquired_public_official_download",
  "hash_pinned_official_binary",
  "source_receipt_written",
  "worker_ready_source_contract"
]);

const PDF_SIGNATURE = Buffer.from("%PDF-", "utf8");
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const OOXML_PACKAGE_ENTRIES = Object.freeze({
  docx: "word/",
  xlsx: "xl/",
  pptx: "ppt/"
});

/**
 * Perimeter signatures.
 *
 * Matched against the decoded body and the response headers. Kept as data so a
 * new vendor is a row rather than a new branch, and so the reason a response
 * was refused is reportable rather than inferred.
 */
const BLOCK_SIGNATURES = Object.freeze([
  {
    vendor: "cloudflare",
    signal: "cf_mitigated_challenge",
    header: { name: "cf-mitigated", includes: "challenge" }
  },
  {
    vendor: "cloudflare",
    signal: "just_a_moment_interstitial",
    bodyIncludes: "Just a moment"
  },
  {
    vendor: "cloudflare",
    signal: "cf_challenge_platform",
    bodyIncludes: "/cdn-cgi/challenge-platform"
  },
  {
    vendor: "cloudflare",
    signal: "attention_required",
    bodyIncludes: "Attention Required! | Cloudflare"
  },
  {
    vendor: "f5_big_ip",
    signal: "requested_url_was_rejected",
    bodyIncludes: "The requested URL was rejected"
  },
  {
    vendor: "f5_big_ip",
    signal: "support_id",
    bodyIncludes: "Your support ID is"
  },
  {
    vendor: "akamai",
    signal: "access_denied_reference",
    bodyIncludes: "Access Denied"
  },
  {
    vendor: "imperva",
    signal: "incapsula_incident",
    bodyIncludes: "Incapsula incident ID"
  }
]);

/**
 * A rotating support ID makes every rejection a different string, so hashing
 * the raw body would produce an unstable "identity" for what is one block. The
 * volatile parts are removed before the block is fingerprinted, and the
 * fingerprint is explicitly not a document digest.
 */
const VOLATILE_PATTERNS = Object.freeze([
  /Your support ID is\s*:?\s*[-0-9a-f]+/giu,
  /support ID:\s*[-0-9a-f]+/giu,
  /Incapsula incident ID:\s*[-0-9a-f]+/giu,
  /Ray ID:\s*[0-9a-f]+/giu,
  /\b\d{10,}\b/gu
]);

function headerValue(headers, name) {
  if (!headers) return null;
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) {
      return Array.isArray(value) ? value.join(", ") : String(value);
    }
  }
  return null;
}

function normalizeBlockBody(text) {
  let normalized = text;
  for (const pattern of VOLATILE_PATTERNS) {
    normalized = normalized.replace(pattern, (match) =>
      match.replace(/[-0-9a-f]+$/iu, "<redacted>")
    );
  }
  return normalized.replace(/\s+/gu, " ").trim();
}

/**
 * Detects an access block. Returns null when the response is not a block.
 *
 * The body is only inspected as text when it is small enough or is not
 * binary-signatured: a real 3 MB PDF must never be string-scanned for
 * "Access Denied", and a real document that happens to contain the phrase in
 * its text layer must not be mistaken for a rejection page. A block page is
 * HTML and small; those two facts gate the scan.
 */
export function detectAccessBlock({ headers = {}, body = null } = {}) {
  const matches = [];
  for (const signature of BLOCK_SIGNATURES) {
    if (!signature.header) continue;
    const value = headerValue(headers, signature.header.name);
    if (
      value &&
      value.toLowerCase().includes(signature.header.includes.toLowerCase())
    ) {
      matches.push({ vendor: signature.vendor, signal: signature.signal });
    }
  }

  const bytes = body === null ? null : Buffer.from(body);
  const looksBinary =
    bytes !== null &&
    (bytes.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE) ||
      bytes.subarray(0, ZIP_SIGNATURE.length).equals(ZIP_SIGNATURE));
  // 64 KiB is far larger than any block page and far smaller than any real
  // form; scanning below it costs nothing and cannot reach a document body.
  const scannable = bytes !== null && !looksBinary && bytes.length <= 65536;

  if (scannable) {
    const text = bytes.toString("utf8");
    for (const signature of BLOCK_SIGNATURES) {
      if (!signature.bodyIncludes) continue;
      if (text.includes(signature.bodyIncludes)) {
        matches.push({ vendor: signature.vendor, signal: signature.signal });
      }
    }
  }

  if (matches.length === 0) return null;

  const vendors = [...new Set(matches.map((entry) => entry.vendor))].sort();
  const signals = [...new Set(matches.map((entry) => entry.signal))].sort();
  const normalized = scannable
    ? normalizeBlockBody(bytes.toString("utf8"))
    : "";
  return {
    vendor: vendors.length === 1 ? vendors[0] : vendors.join("+"),
    vendors,
    signals,
    // Stable across rotating support IDs, and deliberately not a document
    // digest: it identifies the block, never the thing we failed to fetch.
    blockFingerprint: crypto
      .createHash("sha256")
      .update(`${vendors.join("+")}|${signals.join(",")}|${normalized}`)
      .digest("hex"),
    bodyBytes: bytes === null ? null : bytes.length
  };
}

function checkPdf(bytes, { expectedPageCount = null } = {}) {
  const failures = [];
  if (!bytes.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    failures.push({
      check: "file_signature",
      detail: "body does not start with %PDF-"
    });
    return { failures, structure: null };
  }
  const tail = bytes.subarray(Math.max(0, bytes.length - 2048)).toString("latin1");
  if (!tail.includes("%%EOF")) {
    failures.push({
      check: "parser_opens",
      detail: "no %%EOF trailer; the document is truncated"
    });
  }
  const text = bytes.toString("latin1");
  if (!/\/Type\s*\/Catalog/u.test(text) && !text.includes("/Root")) {
    failures.push({
      check: "parser_opens",
      detail: "no document catalog or trailer /Root"
    });
  }
  const pageCount = (text.match(/\/Type\s*\/Page[^s]/gu) ?? []).length;
  if (pageCount === 0) {
    failures.push({
      check: "expected_structure",
      detail: "no page objects found"
    });
  }
  if (
    Number.isInteger(expectedPageCount) &&
    pageCount !== expectedPageCount
  ) {
    failures.push({
      check: "expected_structure",
      detail: `expected ${expectedPageCount} page(s), found ${pageCount}`
    });
  }
  return { failures, structure: { pageCount } };
}

function checkOoxml(bytes, kind) {
  const failures = [];
  if (!bytes.subarray(0, ZIP_SIGNATURE.length).equals(ZIP_SIGNATURE)) {
    failures.push({
      check: "file_signature",
      detail: "body is not a ZIP container"
    });
    return { failures, structure: null };
  }
  const text = bytes.toString("latin1");
  const required = ["[Content_Types].xml", OOXML_PACKAGE_ENTRIES[kind]];
  const missing = required.filter((entry) => !text.includes(entry));
  if (missing.length > 0) {
    failures.push({
      check: "expected_structure",
      detail: `ZIP container is missing ${missing.join(", ")}`
    });
  }
  return { failures, structure: { packageEntriesPresent: required.length - missing.length } };
}

const CONTENT_TYPES = Object.freeze({
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ],
  html: ["text/html", "application/xhtml+xml"]
});

/**
 * Classifies one acquisition response.
 *
 * `expectedAsset.kind` is required and is the assignment's own expectation:
 * HTML is a valid acquisition only where the assignment expects HTML, so a
 * challenge page can never satisfy a PDF assignment by being well-formed HTML.
 */
export function classifyAcquisitionResponse({
  status = null,
  headers = {},
  body = null,
  expectedAsset = {},
  wrongMimeButParseablePolicy = "accept_with_finding"
} = {}) {
  const kind = expectedAsset.kind;
  if (!kind || !CONTENT_TYPES[kind]) {
    throw new Error(
      `acquisition classification needs expectedAsset.kind, one of ${Object.keys(CONTENT_TYPES).join(", ")}`
    );
  }

  const block = detectAccessBlock({ headers, body });
  if (block) {
    return {
      schemaVersion: "rcap-acquisition-response/v1",
      acquired: false,
      disposition: ACQUISITION_BLOCKED_DISPOSITION,
      block,
      status,
      // Explicitly absent. A blocked response has no document digest, because
      // there is no document.
      contentSha256: null,
      receiptEligible: false,
      workerReadyContract: false,
      findings: [],
      failures: [
        {
          check: "not_an_access_block",
          detail: `${block.vendor} returned ${block.signals.join(", ")} at HTTP ${status}`
        }
      ]
    };
  }

  const failures = [];
  const findings = [];

  if (!Number.isInteger(status) || status < 200 || status >= 300) {
    failures.push({
      check: "status_permits_success",
      detail: `HTTP ${status} does not permit success`
    });
  }

  const bytes = body === null ? Buffer.alloc(0) : Buffer.from(body);
  const contentType = (headerValue(headers, "content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const contentTypeMatches = CONTENT_TYPES[kind].includes(contentType);

  let structureResult = { failures: [], structure: null };
  if (kind === "pdf") {
    structureResult = checkPdf(bytes, expectedAsset);
  } else if (kind === "html") {
    if (bytes.length === 0) {
      structureResult.failures.push({
        check: "expected_structure",
        detail: "empty body"
      });
    }
  } else {
    structureResult = checkOoxml(bytes, kind);
  }

  const signatureFailed = structureResult.failures.some(
    (entry) => entry.check === "file_signature"
  );

  if (!contentTypeMatches) {
    if (signatureFailed) {
      failures.push({
        check: "content_type_matches",
        detail: `content-type ${contentType || "(absent)"} does not match ${kind} and the body is not ${kind} either`
      });
    } else if (wrongMimeButParseablePolicy === "accept_with_finding") {
      // The repository's explicit policy: a correct document served under a
      // careless content type is still the document, and is accepted with the
      // mismatch recorded rather than silently normalised away.
      findings.push({
        finding: "content_type_mismatch_body_parseable",
        detail: `content-type ${contentType || "(absent)"} does not match ${kind}; the body is a valid ${kind} and is accepted with this finding recorded`
      });
    } else {
      failures.push({
        check: "content_type_matches",
        detail: `content-type ${contentType || "(absent)"} does not match ${kind} and policy is ${wrongMimeButParseablePolicy}`
      });
    }
  }

  failures.push(...structureResult.failures);

  const acquired = failures.length === 0;
  return {
    schemaVersion: "rcap-acquisition-response/v1",
    acquired,
    disposition: acquired
      ? "acquired_public_official_download"
      : "official_download_failed_validation",
    block: null,
    status,
    contentSha256: acquired
      ? crypto.createHash("sha256").update(bytes).digest("hex")
      : null,
    byteLength: acquired ? bytes.length : null,
    structure: structureResult.structure,
    receiptEligible: acquired,
    workerReadyContract: acquired,
    findings,
    failures
  };
}

/**
 * Fail-closed assertion for a claimed acquisition.
 *
 * Throws rather than returning, because the caller is about to write a receipt.
 */
export function assertAcquisitionPermitted(result) {
  if (!result || result.acquired === true) return result;
  throw new Error(
    `${result?.disposition ?? "unknown disposition"}: ${
      (result?.failures ?? []).map((entry) => entry.detail).join("; ") ||
      "acquisition did not validate"
    }`
  );
}
