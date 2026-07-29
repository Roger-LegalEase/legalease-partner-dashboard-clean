/**
 * Media validation and publication gating (isomorphic — the CMS uses it to warn as you type, the
 * server uses it to refuse).
 *
 * Two severities, and the difference matters:
 *   BLOCK — publication is refused. Missing alt text (accessibility + legal exposure), unknown
 *           permission (we would be publishing an image we cannot prove we may use), unsupported
 *           MIME, oversized file.
 *   WARN  — publication proceeds, the CMS shows the problem. Low resolution for a featured image,
 *           missing credit on a licensed asset, missing social variants.
 *
 * "Unknown permission blocks publication" is deliberate: an image whose rights we cannot account
 * for is the single most expensive kind of mistake a publishing platform can make.
 */

import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_GIF_BYTES,
  MAX_MEDIA_BYTES,
  MIN_FEATURED_IMAGE_WIDTH,
  isAllowedMediaMimeType,
  isMediaPermission,
  type MediaPermission
} from "@/lib/content/types";

export type MediaRecord = {
  mediaId: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  credit: string | null;
  sourceInfo: string | null;
  permissionStatus: MediaPermission;
  archived: boolean;
};

export type MediaIssue = {
  severity: "block" | "warn";
  code: string;
  message: string;
};

/**
 * Validate an upload before it is accepted. Returns issues; any `block` issue means reject.
 * This runs server-side on the upload route — the browser's `accept` attribute is a convenience,
 * never the gate.
 */
export function validateMediaUpload(input: {
  mimeType: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
}): MediaIssue[] {
  const issues: MediaIssue[] = [];

  if (!isAllowedMediaMimeType(input.mimeType)) {
    issues.push({
      severity: "block",
      code: "unsupported_mime",
      message: `Unsupported file type "${input.mimeType}". Allowed: ${ALLOWED_MEDIA_MIME_TYPES.join(", ")}.`
    });
    // No point checking size rules against a type we will not store.
    return issues;
  }

  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    issues.push({ severity: "block", code: "empty_file", message: "The file is empty." });
    return issues;
  }

  if (input.byteSize > MAX_MEDIA_BYTES) {
    issues.push({
      severity: "block",
      code: "too_large",
      message: `File is ${formatBytes(input.byteSize)}; the limit is ${formatBytes(MAX_MEDIA_BYTES)}.`
    });
  }

  // GIFs are held to a much tighter budget: an animated GIF is trivially a 10 MB autoplaying video
  // that tanks Core Web Vitals on the exact mobile connections our readers are on.
  if (input.mimeType === "image/gif" && input.byteSize > MAX_GIF_BYTES) {
    issues.push({
      severity: "block",
      code: "gif_too_large",
      message: `Animated GIFs are capped at ${formatBytes(MAX_GIF_BYTES)}. Export as WebP or MP4 instead.`
    });
  }

  return issues;
}

/**
 * Gate an asset for publication in a given role (featured image, social card, or body image).
 */
export function validateMediaForPublication(
  media: MediaRecord,
  usage: "featured" | "body" | "social"
): MediaIssue[] {
  const issues: MediaIssue[] = [];

  if (media.archived) {
    issues.push({
      severity: "block",
      code: "archived",
      message: "This asset is archived and cannot be published."
    });
  }

  if (!media.altText || !media.altText.trim()) {
    issues.push({
      severity: "block",
      code: "missing_alt",
      message: "Alt text is required before this image can be published."
    });
  }

  if (!isMediaPermission(media.permissionStatus) || media.permissionStatus === "unknown") {
    issues.push({
      severity: "block",
      code: "unknown_permission",
      message:
        "Permission status is unknown. Record how we are permitted to use this image before publishing."
    });
  }

  if (media.permissionStatus === "licensed" && !media.credit?.trim()) {
    issues.push({
      severity: "warn",
      code: "missing_credit",
      message: "Licensed images usually require a visible credit."
    });
  }

  if (usage === "featured" && typeof media.width === "number" && media.width < MIN_FEATURED_IMAGE_WIDTH) {
    issues.push({
      severity: "warn",
      code: "low_resolution",
      message: `Featured images should be at least ${MIN_FEATURED_IMAGE_WIDTH}px wide (this is ${media.width}px).`
    });
  }

  if (usage === "social" && media.mimeType === "image/gif") {
    issues.push({
      severity: "warn",
      code: "gif_social",
      message: "Several networks flatten GIFs to a still frame. Consider a static image."
    });
  }

  return issues;
}

export function hasBlockingIssue(issues: MediaIssue[]): boolean {
  return issues.some((issue) => issue.severity === "block");
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Sniff the real image type from the file's magic bytes. The browser-supplied Content-Type is
 * attacker-controlled, so an upload claiming image/png must actually start with the PNG signature
 * or we refuse it. Returns null when the bytes match no allowed format.
 */
export function sniffImageMimeType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: "GIF87a" or "GIF89a"
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
