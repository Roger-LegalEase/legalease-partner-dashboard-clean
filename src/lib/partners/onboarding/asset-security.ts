import "server-only";

import { inflateRawSync } from "node:zlib";

export const ONBOARDING_ASSET_CATEGORIES = [
  "transparent_logo",
  "brand_guide",
  "hero_or_community_image",
  "organizer_or_program_lead_image",
  "approved_partner_description_attachment",
  "procurement_document",
  "other_approved_organizational_asset"
] as const;

export type OnboardingAssetCategory = (typeof ONBOARDING_ASSET_CATEGORIES)[number];

export type ValidatedOnboardingAsset = {
  bytes: Uint8Array;
  extension: "png" | "jpg" | "webp" | "pdf" | "docx";
  contentType:
    | "image/png"
    | "image/jpeg"
    | "image/webp"
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  originalFileName: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

export class OnboardingAssetValidationError extends Error {
  constructor(
    readonly code:
      | "invalid_category"
      | "empty_file"
      | "file_too_large"
      | "invalid_file_name"
      | "type_not_allowed"
      | "signature_mismatch"
      | "invalid_image_dimensions"
      | "unsafe_docx",
    message: string
  ) {
    super(message);
    this.name = "OnboardingAssetValidationError";
  }
}

const IMAGE_LIMIT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_LIMIT_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 12_000;
const MIN_IMAGE_DIMENSION = 16;
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const imageOnlyCategories = new Set<OnboardingAssetCategory>([
  "transparent_logo",
  "hero_or_community_image",
  "organizer_or_program_lead_image"
]);

const documentOnlyCategories = new Set<OnboardingAssetCategory>([
  "brand_guide",
  "approved_partner_description_attachment",
  "procurement_document"
]);

export function isOnboardingAssetCategory(value: unknown): value is OnboardingAssetCategory {
  return typeof value === "string" &&
    (ONBOARDING_ASSET_CATEGORIES as readonly string[]).includes(value);
}

export async function validateOnboardingAssetFile(
  file: File,
  category: OnboardingAssetCategory
): Promise<ValidatedOnboardingAsset> {
  if (!isOnboardingAssetCategory(category)) {
    throw new OnboardingAssetValidationError("invalid_category", "Choose a supported asset category.");
  }

  if (!file || file.size <= 0) {
    throw new OnboardingAssetValidationError("empty_file", "Choose a non-empty file.");
  }

  const originalFileName = normalizeOriginalFileName(file.name);
  const extension = extensionFromName(originalFileName);
  const declaredType = file.type.toLowerCase().trim();
  const isImage = extension === "png" || extension === "jpg" || extension === "jpeg" || extension === "webp";
  const isDocument = extension === "pdf" || extension === "docx";

  if (!isImage && !isDocument) {
    throw new OnboardingAssetValidationError(
      "type_not_allowed",
      "Upload a PNG, JPEG, WebP, PDF, or DOCX file. SVG and executable formats are not accepted."
    );
  }

  if (imageOnlyCategories.has(category) && !isImage) {
    throw new OnboardingAssetValidationError("type_not_allowed", "This asset must be a PNG, JPEG, or WebP image.");
  }
  if (documentOnlyCategories.has(category) && !isDocument) {
    throw new OnboardingAssetValidationError("type_not_allowed", "This asset must be a PDF or DOCX document.");
  }

  const maxBytes = isImage ? IMAGE_LIMIT_BYTES : DOCUMENT_LIMIT_BYTES;
  if (file.size > maxBytes) {
    throw new OnboardingAssetValidationError(
      "file_too_large",
      isImage ? "Images must be 10 MiB or smaller." : "Documents must be 20 MiB or smaller."
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectFileType(bytes);

  if (!detected || !extensionMatches(extension, detected.extension) || declaredType !== detected.contentType) {
    throw new OnboardingAssetValidationError(
      "signature_mismatch",
      "The file contents, extension, and declared type do not match."
    );
  }

  const dimensions = detected.extension === "png" ||
      detected.extension === "jpg" ||
      detected.extension === "webp"
    ? readImageDimensions(bytes, detected.extension)
    : null;

  if (isImage && !dimensions) {
    throw new OnboardingAssetValidationError(
      "signature_mismatch",
      "The image header is incomplete or invalid."
    );
  }

  if (detected.extension === "docx") {
    assertSafeDocx(bytes);
  }

  if (
    dimensions &&
    (
      dimensions.width < MIN_IMAGE_DIMENSION ||
      dimensions.height < MIN_IMAGE_DIMENSION ||
      dimensions.width > MAX_IMAGE_DIMENSION ||
      dimensions.height > MAX_IMAGE_DIMENSION
    )
  ) {
    throw new OnboardingAssetValidationError(
      "invalid_image_dimensions",
      `Images must be between ${MIN_IMAGE_DIMENSION} and ${MAX_IMAGE_DIMENSION} pixels on each side.`
    );
  }

  return {
    bytes,
    extension: detected.extension,
    contentType: detected.contentType,
    originalFileName,
    sizeBytes: file.size,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null
  };
}

function normalizeOriginalFileName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 255 || /[\u0000-\u001f\u007f/\\]/.test(name)) {
    throw new OnboardingAssetValidationError("invalid_file_name", "The file name is not valid.");
  }
  return name;
}

function extensionFromName(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index > -1 ? fileName.slice(index + 1).toLowerCase() : "";
}

function detectFileType(bytes: Uint8Array): Pick<ValidatedOnboardingAsset, "extension" | "contentType"> | null {
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: "png", contentType: "image/png" };
  }
  if (matches(bytes, [0xff, 0xd8, 0xff])) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return { extension: "webp", contentType: "image/webp" };
  }
  if (ascii(bytes, 0, 5) === "%PDF-") {
    return { extension: "pdf", contentType: "application/pdf" };
  }
  if (matches(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    return { extension: "docx", contentType: DOCX_MIME };
  }
  return null;
}

function extensionMatches(declared: string, detected: ValidatedOnboardingAsset["extension"]): boolean {
  return detected === "jpg" ? declared === "jpg" || declared === "jpeg" : declared === detected;
}

function assertSafeDocx(bytes: Uint8Array): void {
  let entries: Map<string, Uint8Array>;
  try {
    entries = readZipEntries(bytes);
  } catch {
    throw new OnboardingAssetValidationError(
      "unsafe_docx",
      "The DOCX container is invalid or contains unsupported executable content."
    );
  }
  const names = [...entries.keys()];
  const hasContentTypes = names.includes("[Content_Types].xml");
  const hasWordDocument = names.includes("word/document.xml");
  const hasMacros = names.some((name) =>
    /(^|\/)(vbaProject\.bin|macros?\/)/i.test(name)
  );
  const contentTypes = entries.get("[Content_Types].xml");
  const declaresMacroContent =
    contentTypes !== undefined &&
    /macroEnabled|vbaProject/i.test(
      new TextDecoder("utf-8", { fatal: false }).decode(contentTypes)
    );

  if (!hasContentTypes || !hasWordDocument || hasMacros || declaresMacroContent) {
    throw new OnboardingAssetValidationError(
      "unsafe_docx",
      "The DOCX container is invalid or contains unsupported executable content."
    );
  }
}

function readZipEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findZipEndOfCentralDirectory(view);
  const diskNumber = view.getUint16(eocdOffset + 4, true);
  const centralDisk = view.getUint16(eocdOffset + 6, true);
  const entriesOnDisk = view.getUint16(eocdOffset + 8, true);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralSize = view.getUint32(eocdOffset + 12, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);
  const commentLength = view.getUint16(eocdOffset + 20, true);
  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === 0 ||
    entryCount > 10_000 ||
    eocdOffset + 22 + commentLength !== bytes.length ||
    centralOffset + centralSize !== eocdOffset
  ) {
    throw new Error("Unsupported ZIP structure.");
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries = new Map<string, Uint8Array>();
  let centralCursor = centralOffset;
  let totalUncompressedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      centralCursor + 46 > eocdOffset ||
      view.getUint32(centralCursor, true) !== 0x02014b50
    ) {
      throw new Error("Invalid central directory.");
    }
    const flags = view.getUint16(centralCursor + 8, true);
    const compression = view.getUint16(centralCursor + 10, true);
    const expectedCrc32 = view.getUint32(centralCursor + 16, true);
    const compressedSize = view.getUint32(centralCursor + 20, true);
    const uncompressedSize = view.getUint32(centralCursor + 24, true);
    const nameLength = view.getUint16(centralCursor + 28, true);
    const extraLength = view.getUint16(centralCursor + 30, true);
    const entryCommentLength = view.getUint16(centralCursor + 32, true);
    const startDisk = view.getUint16(centralCursor + 34, true);
    const localOffset = view.getUint32(centralCursor + 42, true);
    const centralEntryEnd =
      centralCursor + 46 + nameLength + extraLength + entryCommentLength;
    if (
      centralEntryEnd > eocdOffset ||
      startDisk !== 0 ||
      (flags & 0x0001) !== 0 ||
      ![0, 8].includes(compression) ||
      uncompressedSize > 50 * 1024 * 1024
    ) {
      throw new Error("Unsupported ZIP entry.");
    }
    const name = decoder.decode(
      bytes.subarray(centralCursor + 46, centralCursor + 46 + nameLength)
    );
    assertSafeZipEntryName(name);
    if (entries.has(name)) throw new Error("Duplicate ZIP entry.");

    if (
      localOffset + 30 > centralOffset ||
      view.getUint32(localOffset, true) !== 0x04034b50
    ) {
      throw new Error("Invalid local ZIP entry.");
    }
    const localFlags = view.getUint16(localOffset + 6, true);
    const localCompression = view.getUint16(localOffset + 8, true);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const localName = decoder.decode(
      bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength)
    );
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataOffset + compressedSize;
    if (
      localName !== name ||
      localFlags !== flags ||
      localCompression !== compression ||
      dataEnd > centralOffset
    ) {
      throw new Error("Mismatched ZIP entry.");
    }
    const compressed = bytes.subarray(dataOffset, dataEnd);
    const uncompressed =
      compression === 0
        ? new Uint8Array(compressed)
        : new Uint8Array(
            inflateRawSync(compressed, {
              maxOutputLength: 50 * 1024 * 1024
            })
          );
    if (
      uncompressed.length !== uncompressedSize ||
      crc32(uncompressed) !== expectedCrc32
    ) {
      throw new Error("Corrupt ZIP entry.");
    }
    totalUncompressedBytes += uncompressed.length;
    if (totalUncompressedBytes > 50 * 1024 * 1024) {
      throw new Error("Expanded ZIP is too large.");
    }
    entries.set(name, uncompressed);
    centralCursor = centralEntryEnd;
  }
  if (centralCursor !== eocdOffset) {
    throw new Error("Invalid central directory size.");
  }
  return entries;
}

function findZipEndOfCentralDirectory(view: DataView): number {
  const minimum = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("ZIP central directory not found.");
}

function assertSafeZipEntryName(name: string): void {
  if (
    !name ||
    name.includes("\u0000") ||
    name.includes("\\") ||
    name.startsWith("/") ||
    /^[A-Za-z]:/.test(name) ||
    name.split("/").some((segment) => segment === "..")
  ) {
    throw new Error("Unsafe ZIP entry name.");
  }
}

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}

function readImageDimensions(
  bytes: Uint8Array,
  extension: "png" | "jpg" | "webp"
): { width: number; height: number } | null {
  if (extension === "png" && bytes.length >= 24) {
    return { width: readUint32Be(bytes, 16), height: readUint32Be(bytes, 20) };
  }
  if (extension === "jpg") {
    return readJpegDimensions(bytes);
  }
  if (extension === "webp") {
    return readWebpDimensions(bytes);
  }
  return null;
}

function readJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (segmentLength < 2) return null;
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        width: (bytes[offset + 7] << 8) | bytes[offset + 8]
      };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function readWebpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const chunk = ascii(bytes, 12, 4);
  if (
    chunk === "VP8 " &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      width: readUint16Le(bytes, 26) & 0x3fff,
      height: readUint16Le(bytes, 28) & 0x3fff
    };
  }
  if (chunk === "VP8X" && bytes.length >= 30) {
    return {
      width: 1 + readUint24Le(bytes, 24),
      height: 1 + readUint24Le(bytes, 27)
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const b1 = bytes[21];
    const b2 = bytes[22];
    const b3 = bytes[23];
    const b4 = bytes[24];
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))
    };
  }
  return null;
}

function matches(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function readUint32Be(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function readUint24Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint16Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}
