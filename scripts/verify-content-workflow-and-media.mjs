/**
 * Editorial workflow + media gating.
 *
 * Two invariants the business depends on:
 *   - LEGAL REVIEW CANNOT BE SKIPPED. State resources, resource guides, and anything flagged
 *     legally sensitive cannot reach a live status without a recorded legal approval — no matter
 *     which role attempts it. (The DB enforces this too; see test-content-platform-schema.mjs.)
 *   - MEDIA WITHOUT ESTABLISHED RIGHTS CANNOT BE PUBLISHED. Unknown permission and missing alt text
 *     are BLOCKING, not advisory.
 */

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const failures = [];

const { evaluateTransition, nextReviewStatus } = await import("../src/lib/content/workflow.ts");
const { validateMediaUpload, validateMediaForPublication, hasBlockingIssue, sniffImageMimeType } = await import(
  "../src/lib/content/media.ts"
);
const { canTransition, requiresLegalReview, roleHasCapability, SOCIAL_CHANNEL_LIMITS } = await import(
  "../src/lib/content/types.ts"
);

const base = {
  role: "editor",
  contentType: "blog_article",
  legalSensitive: false,
  legalApprovedAt: null
};

// --- 1. Illegal transitions are refused ------------------------------------------------------------

assert(!canTransition("draft", "published"), "draft -> published must not be a legal transition.");
assert(!canTransition("archived", "published"), "archived -> published must not be legal.");
assert(canTransition("approved", "published"), "approved -> published must be legal.");
assert(canTransition("published", "archived"), "published -> archived must be legal.");

const jump = evaluateTransition({ ...base, from: "draft", to: "published" });
assert(jump.ok === false && jump.code === "illegal_transition", "Publishing straight from draft must be refused.");

// --- 2. THE LEGAL GATE ------------------------------------------------------------------------------

// A state_resource cannot be published without legal approval — even by the primary admin.
for (const role of ["primary_admin", "editor"]) {
  const blocked = evaluateTransition({
    from: "approved",
    to: "published",
    role,
    contentType: "state_resource",
    legalSensitive: false,
    legalApprovedAt: null
  });
  assert(
    blocked.ok === false && blocked.code === "legal_review_required",
    `A ${role} must NOT be able to publish a state_resource without legal review.`
  );
}

// The same applies to scheduling — you cannot smuggle it live via the scheduler.
const scheduleBlocked = evaluateTransition({
  from: "approved",
  to: "scheduled",
  role: "primary_admin",
  contentType: "state_resource",
  legalSensitive: false,
  legalApprovedAt: null,
  scheduledFor: "2027-01-01T00:00:00.000Z"
});
assert(
  scheduleBlocked.ok === false && scheduleBlocked.code === "legal_review_required",
  "Scheduling must not bypass legal review."
);

// A legally-sensitive blog article is gated exactly like a state resource.
const sensitiveBlocked = evaluateTransition({
  from: "approved",
  to: "published",
  role: "editor",
  contentType: "blog_article",
  legalSensitive: true,
  legalApprovedAt: null
});
assert(
  sensitiveBlocked.ok === false && sensitiveBlocked.code === "legal_review_required",
  "A legal_sensitive article must require legal review regardless of content type."
);

// With legal approval recorded, it proceeds.
const allowed = evaluateTransition({
  from: "approved",
  to: "published",
  role: "editor",
  contentType: "state_resource",
  legalSensitive: false,
  legalApprovedAt: "2026-07-01T00:00:00.000Z"
});
assert(allowed.ok === true, "A legally-approved state resource must be publishable.");

// An ordinary article needs no legal approval.
assert(
  evaluateTransition({ ...base, from: "approved", to: "published" }).ok === true,
  "A plain blog article must be publishable without legal review."
);

assert(requiresLegalReview("state_resource", false), "state_resource always requires legal review.");
assert(requiresLegalReview("resource_guide", false), "resource_guide always requires legal review.");
assert(requiresLegalReview("blog_article", true), "A legal_sensitive flag forces legal review.");
assert(!requiresLegalReview("blog_article", false), "A plain blog article does not require legal review.");
assert(nextReviewStatus("state_resource", false) === "in_legal_review", "Legal content routes to legal review.");
assert(nextReviewStatus("blog_article", false) === "in_editorial_review", "Ordinary content routes to editorial review.");

// --- 3. Role gating ----------------------------------------------------------------------------------

for (const role of ["contributor", "partner_contributor", "viewer", "social_manager", "legal_reviewer"]) {
  const denied = evaluateTransition({ ...base, from: "approved", to: "published", role });
  assert(
    denied.ok === false && denied.code === "forbidden_role",
    `The ${role} role must not be able to publish.`
  );
}

const legalByEditor = evaluateTransition({
  from: "in_legal_review",
  to: "approved",
  role: "editor",
  contentType: "state_resource",
  legalSensitive: false,
  legalApprovedAt: null
});
assert(
  legalByEditor.ok === false && legalByEditor.code === "forbidden_role",
  "An editor must NOT be able to sign off legal review — only a legal_reviewer or primary_admin."
);

const legalByReviewer = evaluateTransition({
  from: "in_legal_review",
  to: "approved",
  role: "legal_reviewer",
  contentType: "state_resource",
  legalSensitive: false,
  legalApprovedAt: null
});
assert(legalByReviewer.ok === true, "A legal_reviewer must be able to approve out of legal review.");

// A scheduled transition needs a time.
const noTime = evaluateTransition({ ...base, from: "approved", to: "scheduled" });
assert(noTime.ok === false && noTime.code === "missing_schedule", "Scheduling without a time must be refused.");

// --- 4. Capability matrix ------------------------------------------------------------------------------

assert(roleHasCapability("primary_admin", "roles.manage"), "primary_admin must manage roles.");
assert(!roleHasCapability("editor", "roles.manage"), "An editor must not manage roles.");
assert(!roleHasCapability("partner_contributor", "content.publish"), "A partner contributor must not publish.");
assert(!roleHasCapability("viewer", "content.create"), "A viewer must not create content.");
assert(roleHasCapability("social_manager", "social.send"), "A social manager must be able to send promotion.");
assert(!roleHasCapability("contributor", "social.send"), "A contributor must not send promotion.");

// --- 5. Media upload validation --------------------------------------------------------------------------

assert(
  hasBlockingIssue(validateMediaUpload({ mimeType: "image/svg+xml", byteSize: 100 })),
  "SVG must be rejected (it is a script-capable document, not a raster image)."
);
assert(
  hasBlockingIssue(validateMediaUpload({ mimeType: "application/pdf", byteSize: 100 })),
  "A non-image MIME must be rejected."
);
assert(
  hasBlockingIssue(validateMediaUpload({ mimeType: "image/png", byteSize: 20 * 1024 * 1024 })),
  "An oversized file must be rejected."
);
assert(
  hasBlockingIssue(validateMediaUpload({ mimeType: "image/gif", byteSize: 8 * 1024 * 1024 })),
  "An oversized animated GIF must be rejected under the tighter GIF cap."
);
assert(
  !hasBlockingIssue(validateMediaUpload({ mimeType: "image/webp", byteSize: 400 * 1024 })),
  "A reasonable WebP must be accepted."
);

// --- 6. Publication gating ---------------------------------------------------------------------------------

const goodMedia = {
  mediaId: "m1",
  mimeType: "image/jpeg",
  byteSize: 500_000,
  width: 1600,
  height: 900,
  altText: "A courthouse entrance",
  caption: null,
  credit: "Photo: LegalEase",
  sourceInfo: null,
  permissionStatus: "owned",
  archived: false
};

assert(
  !hasBlockingIssue(validateMediaForPublication(goodMedia, "featured")),
  "A well-formed owned image with alt text must be publishable."
);

assert(
  hasBlockingIssue(validateMediaForPublication({ ...goodMedia, altText: null }, "featured")),
  "Missing alt text must BLOCK publication."
);
assert(
  hasBlockingIssue(validateMediaForPublication({ ...goodMedia, altText: "   " }, "featured")),
  "Whitespace-only alt text must BLOCK publication."
);
assert(
  hasBlockingIssue(validateMediaForPublication({ ...goodMedia, permissionStatus: "unknown" }, "featured")),
  "Unknown image permission must BLOCK publication — we must never publish an image we cannot account for."
);
assert(
  hasBlockingIssue(validateMediaForPublication({ ...goodMedia, archived: true }, "featured")),
  "An archived asset must not be publishable."
);

// Low resolution warns but does not block.
const lowRes = validateMediaForPublication({ ...goodMedia, width: 600 }, "featured");
assert(!hasBlockingIssue(lowRes), "Low resolution must warn, not block.");
assert(
  lowRes.some((issue) => issue.code === "low_resolution" && issue.severity === "warn"),
  "Low resolution must produce a warning."
);

// --- 7. Magic-byte sniffing (the declared MIME is attacker-controlled) -------------------------------------------

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]);
const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const htmlBytes = new Uint8Array([...Buffer.from("<html><script>x</script>")]);
const svgBytes = new Uint8Array([...Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\">")]);

assert(sniffImageMimeType(pngBytes) === "image/png", "PNG magic bytes must be detected.");
assert(sniffImageMimeType(jpegBytes) === "image/jpeg", "JPEG magic bytes must be detected.");
assert(sniffImageMimeType(gifBytes) === "image/gif", "GIF magic bytes must be detected.");
assert(sniffImageMimeType(webpBytes) === "image/webp", "WebP magic bytes must be detected.");
assert(
  sniffImageMimeType(htmlBytes) === null,
  "An HTML payload renamed to .png must NOT sniff as an image (polyglot upload)."
);
assert(sniffImageMimeType(svgBytes) === null, "An SVG must not sniff as an allowed raster image.");

// --- 8. Social channel limits -----------------------------------------------------------------------------------

assert(SOCIAL_CHANNEL_LIMITS.x === 280, "The X caption limit must be 280 characters.");
assert(SOCIAL_CHANNEL_LIMITS.linkedin > SOCIAL_CHANNEL_LIMITS.x, "LinkedIn allows longer captions than X.");
for (const [channel, limit] of Object.entries(SOCIAL_CHANNEL_LIMITS)) {
  assert(Number.isInteger(limit) && limit > 0, `Channel ${channel} must have a positive integer caption limit.`);
}

// --- report ----------------------------------------------------------------------------------------------------

if (failures.length) {
  console.error("Content workflow and media verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Content workflow and media verification passed.");
console.log("Legal gate: state resources, resource guides, and legal_sensitive posts cannot be published OR scheduled");
console.log("  without a recorded legal approval — not by an editor, and not by the primary admin.");
console.log("Roles: only legal_reviewer/primary_admin sign off legal review; contributors and partners cannot publish.");
console.log("Media: missing alt text, unknown permission, SVG/polyglot uploads, and oversized files all BLOCK publication;");
console.log("  magic-byte sniffing rejects an HTML or SVG payload renamed to .png.");

function assert(condition, message) {
  if (!condition) failures.push(message);
}
