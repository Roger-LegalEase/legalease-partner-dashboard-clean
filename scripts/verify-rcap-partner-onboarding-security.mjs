import assert from "node:assert/strict";
import { File } from "node:buffer";
import { register } from "node:module";
import { NextRequest } from "next/server.js";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const originalFetch = globalThis.fetch;
let networkAttempts = 0;
globalThis.fetch = async () => {
  networkAttempts += 1;
  throw new Error("Network access is disabled in the onboarding security verifier.");
};

const {
  ONBOARDING_ASSET_CATEGORIES,
  OnboardingAssetValidationError,
  isOnboardingAssetCategory,
  validateOnboardingAssetFile
} = await import("../src/lib/partners/onboarding/asset-security.ts");
const {
  ONBOARDING_JSON_BODY_LIMIT_BYTES,
  ONBOARDING_PRIVATE_RESPONSE_HEADERS,
  OnboardingRequestError,
  assertSameOrigin,
  readBoundedJson,
  readBoundedMultipartFormData,
  requireRequestId
} = await import("../src/lib/partners/onboarding/request-security.ts");
const {
  RCAP_PARTNER_ONBOARDING_FLAG,
  isRcapPartnerOnboardingEnabled
} = await import("../src/lib/partners/onboarding/feature.ts");
const {
  OnboardingStorageError,
  buildOnboardingObjectPath,
  deletePrivateOnboardingAsset
} = await import("../src/lib/partners/onboarding/storage.ts");

const PNG_MIME = "image/png";
const JPEG_MIME = "image/jpeg";
const WEBP_MIME = "image/webp";
const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PARTNER_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const OBJECT_ID = "33333333-3333-4333-8333-333333333333";

const encoder = new TextEncoder();
const checks = [];

function check(name, run) {
  checks.push({ name, run });
}

function makeFile(bytes, name, type) {
  return new File([bytes], name, { type });
}

function makePng(width = 48, height = 32, byteLength = 24) {
  const bytes = new Uint8Array(byteLength);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (byteLength >= 24) {
    const view = new DataView(bytes.buffer);
    view.setUint32(16, width);
    view.setUint32(20, height);
  }
  return bytes;
}

function makeJpeg(width = 48, height = 32) {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x00,
    0x03,
    0x11,
    0x00
  ]);
}

function makeWebp(width = 64, height = 48) {
  const bytes = new Uint8Array(30);
  bytes.set(encoder.encode("RIFF"), 0);
  bytes.set(encoder.encode("WEBP"), 8);
  bytes.set(encoder.encode("VP8X"), 12);
  const widthMinusOne = width - 1;
  const heightMinusOne = height - 1;
  bytes.set(
    [
      widthMinusOne & 0xff,
      (widthMinusOne >> 8) & 0xff,
      (widthMinusOne >> 16) & 0xff
    ],
    24
  );
  bytes.set(
    [
      heightMinusOne & 0xff,
      (heightMinusOne >> 8) & 0xff,
      (heightMinusOne >> 16) & 0xff
    ],
    27
  );
  return bytes;
}

function makeLossyWebp(width = 96, height = 54) {
  const bytes = new Uint8Array(30);
  bytes.set(encoder.encode("RIFF"), 0);
  bytes.set(encoder.encode("WEBP"), 8);
  bytes.set(encoder.encode("VP8 "), 12);
  bytes.set([0x10, 0x00, 0x00, 0x9d, 0x01, 0x2a], 20);
  bytes[26] = width & 0xff;
  bytes[27] = (width >> 8) & 0x3f;
  bytes[28] = height & 0xff;
  bytes[29] = (height >> 8) & 0x3f;
  return bytes;
}

function makeDocx(extraText = "") {
  const entries = [
    {
      name: "[Content_Types].xml",
      contents:
        '<?xml version="1.0"?><Types><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    },
    {
      name: "word/document.xml",
      contents: '<?xml version="1.0"?><w:document xmlns:w="urn:test"/>'
    }
  ];
  if (extraText) {
    entries.push({ name: extraText, contents: "synthetic unsafe entry" });
  }
  return makeStoredZip(entries);
}

function makeStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const contents = Buffer.from(entry.contents, "utf8");
    const checksum = crc32(contents);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(contents.length, 18);
    local.writeUInt32LE(contents.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local, contents);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(contents.length, 20);
    central.writeUInt32LE(contents.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    localOffset += local.length + contents.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}

function makeRequest({
  body,
  contentType = "application/json",
  headers = {},
  url = "https://partner.test/api/partner/onboarding"
} = {}) {
  const requestHeaders = new Headers(headers);
  if (contentType !== null) requestHeaders.set("content-type", contentType);
  return new NextRequest(url, {
    method: "POST",
    headers: requestHeaders,
    body
  });
}

async function expectTypedError(run, ErrorType, code, status) {
  let thrown;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof ErrorType, `Expected ${ErrorType.name}.`);
  assert.equal(thrown.code, code);
  if (status !== undefined) assert.equal(thrown.status, status);
}

check("feature gate is disabled when the variable is absent", () => {
  assert.equal(isRcapPartnerOnboardingEnabled({}), false);
});

check("feature gate enables only the normalized true token", () => {
  assert.equal(
    isRcapPartnerOnboardingEnabled({
      [RCAP_PARTNER_ONBOARDING_FLAG]: "true"
    }),
    true
  );
  assert.equal(
    isRcapPartnerOnboardingEnabled({
      [RCAP_PARTNER_ONBOARDING_FLAG]: " TRUE "
    }),
    true
  );
});

check("truthy-looking non-true values cannot enable the feature", () => {
  for (const value of ["1", "yes", "on", "enabled", "false", ""]) {
    assert.equal(
      isRcapPartnerOnboardingEnabled({
        [RCAP_PARTNER_ONBOARDING_FLAG]: value
      }),
      false,
      `${JSON.stringify(value)} must not enable onboarding.`
    );
  }
});

check("asset category allowlist is exact", () => {
  assert.equal(ONBOARDING_ASSET_CATEGORIES.length, 7);
  for (const category of ONBOARDING_ASSET_CATEGORIES) {
    assert.equal(isOnboardingAssetCategory(category), true);
  }
  assert.equal(isOnboardingAssetCategory("participant_case_file"), false);
  assert.equal(isOnboardingAssetCategory(null), false);
});

check("valid PNG signature, MIME, extension, and dimensions are accepted", async () => {
  const result = await validateOnboardingAssetFile(
    makeFile(makePng(), "logo.png", PNG_MIME),
    "transparent_logo"
  );
  assert.equal(result.extension, "png");
  assert.equal(result.contentType, PNG_MIME);
  assert.equal(result.width, 48);
  assert.equal(result.height, 32);
});

check("valid JPEG signature and jpeg alias are accepted", async () => {
  const result = await validateOnboardingAssetFile(
    makeFile(makeJpeg(), "community.jpeg", JPEG_MIME),
    "hero_or_community_image"
  );
  assert.equal(result.extension, "jpg");
  assert.equal(result.width, 48);
  assert.equal(result.height, 32);
});

check("valid WebP signature and dimensions are accepted", async () => {
  const result = await validateOnboardingAssetFile(
    makeFile(makeWebp(), "lead.webp", WEBP_MIME),
    "organizer_or_program_lead_image"
  );
  assert.equal(result.extension, "webp");
  assert.equal(result.width, 64);
  assert.equal(result.height, 48);
});

check("valid lossy VP8 WebP dimensions are accepted", async () => {
  const result = await validateOnboardingAssetFile(
    makeFile(makeLossyWebp(), "community.webp", WEBP_MIME),
    "hero_or_community_image"
  );
  assert.equal(result.extension, "webp");
  assert.equal(result.width, 96);
  assert.equal(result.height, 54);
});

check("valid PDF is accepted for a document-only category", async () => {
  const result = await validateOnboardingAssetFile(
    makeFile(encoder.encode("%PDF-1.7\n"), "procurement.pdf", PDF_MIME),
    "procurement_document"
  );
  assert.equal(result.extension, "pdf");
  assert.equal(result.width, null);
  assert.equal(result.height, null);
});

check("a structurally valid macro-free DOCX container is accepted", async () => {
  const result = await validateOnboardingAssetFile(
    makeFile(makeDocx(), "brand-guide.docx", DOCX_MIME),
    "brand_guide"
  );
  assert.equal(result.extension, "docx");
  assert.equal(result.contentType, DOCX_MIME);
});

check("brand guides reject images while the explicit other category accepts approved mixed types", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(makePng(), "brand.png", PNG_MIME),
        "brand_guide"
      ),
    OnboardingAssetValidationError,
    "type_not_allowed"
  );
  await validateOnboardingAssetFile(
    makeFile(encoder.encode("%PDF-1.7\n"), "other.pdf", PDF_MIME),
    "other_approved_organizational_asset"
  );
});

check("truncated image headers are rejected", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(
          new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
          ]),
          "truncated.png",
          PNG_MIME
        ),
        "transparent_logo"
      ),
    OnboardingAssetValidationError,
    "signature_mismatch"
  );
});

check("a ZIP signature with marker text is not accepted as a DOCX container", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(
          encoder.encode(
            "PK\u0003\u0004[Content_Types].xml word/document.xml"
          ),
          "spoofed.docx",
          DOCX_MIME
        ),
        "brand_guide"
      ),
    OnboardingAssetValidationError,
    "unsafe_docx"
  );
});

check("document content is rejected from image-only categories", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(encoder.encode("%PDF-1.7\n"), "logo.pdf", PDF_MIME),
        "transparent_logo"
      ),
    OnboardingAssetValidationError,
    "type_not_allowed"
  );
});

check("image content is rejected from document-only categories", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(makePng(), "procurement.png", PNG_MIME),
        "procurement_document"
      ),
    OnboardingAssetValidationError,
    "type_not_allowed"
  );
});

check("SVG uploads are rejected", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(
          encoder.encode("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"),
          "logo.svg",
          "image/svg+xml"
        ),
        "transparent_logo"
      ),
    OnboardingAssetValidationError,
    "type_not_allowed"
  );
});

check("executable uploads are rejected", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), "program.exe", "application/octet-stream"),
        "other_approved_organizational_asset"
      ),
    OnboardingAssetValidationError,
    "type_not_allowed"
  );
});

check("macro-enabled DOCX markers are rejected", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(makeDocx("word/vbaProject.bin"), "unsafe.docx", DOCX_MIME),
        "procurement_document"
      ),
    OnboardingAssetValidationError,
    "unsafe_docx"
  );
});

check("malformed DOCX containers are rejected", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(
          new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...encoder.encode("not-a-word-document")]),
          "malformed.docx",
          DOCX_MIME
        ),
        "procurement_document"
      ),
    OnboardingAssetValidationError,
    "unsafe_docx"
  );
});

check("declared MIME mismatches are rejected", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(makePng(), "logo.png", JPEG_MIME),
        "transparent_logo"
      ),
    OnboardingAssetValidationError,
    "signature_mismatch"
  );
});

check("extension and signature mismatches are rejected", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(makePng(), "logo.jpg", PNG_MIME),
        "transparent_logo"
      ),
    OnboardingAssetValidationError,
    "signature_mismatch"
  );
});

check("image size is capped at 10 MiB", async () => {
  const oversized = makePng(48, 32, 10 * 1024 * 1024 + 1);
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(oversized, "oversized.png", PNG_MIME),
        "transparent_logo"
      ),
    OnboardingAssetValidationError,
    "file_too_large"
  );
});

check("control characters in original filenames are rejected", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(makePng(), "unsafe\u0001name.png", PNG_MIME),
        "transparent_logo"
      ),
    OnboardingAssetValidationError,
    "invalid_file_name"
  );
});

check("invalid image dimensions are rejected", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(makePng(15, 32), "tiny.png", PNG_MIME),
        "transparent_logo"
      ),
    OnboardingAssetValidationError,
    "invalid_image_dimensions"
  );
});

check("unknown categories are rejected at runtime", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(makePng(), "logo.png", PNG_MIME),
        "participant_case_file"
      ),
    OnboardingAssetValidationError,
    "invalid_category"
  );
});

check("empty files are rejected", async () => {
  await expectTypedError(
    () =>
      validateOnboardingAssetFile(
        makeFile(new Uint8Array(), "empty.png", PNG_MIME),
        "transparent_logo"
      ),
    OnboardingAssetValidationError,
    "empty_file"
  );
});

check("immutable identifiers produce the canonical private object path", () => {
  assert.equal(
    buildOnboardingObjectPath({
      partnerId: PARTNER_ID,
      workspaceId: WORKSPACE_ID,
      category: "transparent_logo",
      extension: "png",
      objectId: OBJECT_ID
    }),
    `partners/${PARTNER_ID}/onboarding/${WORKSPACE_ID}/transparent_logo/${OBJECT_ID}.png`
  );
});

check("mutable partner slugs cannot replace immutable partner IDs in paths", async () => {
  await expectTypedError(
    () =>
      buildOnboardingObjectPath({
        partnerId: "partner-slug",
        workspaceId: WORKSPACE_ID,
        category: "transparent_logo",
        extension: "png",
        objectId: OBJECT_ID
      }),
    OnboardingStorageError,
    "invalid_identifier"
  );
});

check("invalid object identifiers cannot enter generated paths", async () => {
  await expectTypedError(
    () =>
      buildOnboardingObjectPath({
        partnerId: PARTNER_ID,
        workspaceId: WORKSPACE_ID,
        category: "transparent_logo",
        extension: "png",
        objectId: "../object"
      }),
    OnboardingStorageError,
    "invalid_identifier"
  );
});

check("unsafe path shapes are rejected before any storage operation", async () => {
  await expectTypedError(
    () =>
      deletePrivateOnboardingAsset(
        `partners/${PARTNER_ID}/onboarding/${WORKSPACE_ID}/transparent_logo/../${OBJECT_ID}.png`
      ),
    OnboardingStorageError,
    "invalid_identifier"
  );
  await expectTypedError(
    () =>
      deletePrivateOnboardingAsset(
        `partners/${PARTNER_ID}/onboarding/${WORKSPACE_ID}/transparent_logo/${OBJECT_ID}.svg`
      ),
    OnboardingStorageError,
    "invalid_identifier"
  );
});

check("small JSON objects are accepted within the body limit", async () => {
  const result = await readBoundedJson(
    makeRequest({
      body: JSON.stringify({ sectionKey: "organization_contacts" }),
      contentType: "application/json; charset=utf-8"
    })
  );
  assert.equal(result.sectionKey, "organization_contacts");
  assert.equal(ONBOARDING_JSON_BODY_LIMIT_BYTES, 64 * 1024);
});

check("non-JSON content types are rejected", async () => {
  await expectTypedError(
    () =>
      readBoundedJson(
        makeRequest({
          body: "{}",
          contentType: "text/plain"
        })
      ),
    OnboardingRequestError,
    "invalid_content_type",
    415
  );
});

check("declared request bodies over the limit are rejected before parsing", async () => {
  await expectTypedError(
    () =>
      readBoundedJson(
        makeRequest({
          body: "{}",
          headers: {
            "content-length": String(ONBOARDING_JSON_BODY_LIMIT_BYTES + 1)
          }
        })
      ),
    OnboardingRequestError,
    "payload_too_large",
    413
  );
});

check("actual UTF-8 request bytes over the limit are rejected", async () => {
  await expectTypedError(
    () =>
      readBoundedJson(
        makeRequest({
          body: JSON.stringify({ value: "é".repeat(10) })
        }),
        16
      ),
    OnboardingRequestError,
    "payload_too_large",
    413
  );
});

check("invalid UTF-8 JSON is rejected", async () => {
  await expectTypedError(
    () =>
      readBoundedJson(
        makeRequest({
          body: new Uint8Array([
            0x7b, 0x22, 0x76, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d
          ])
        })
      ),
    OnboardingRequestError,
    "invalid_json",
    400
  );
});

check("multipart uploads are parsed only after a bounded stream read", async () => {
  const form = new FormData();
  form.set("category", "transparent_logo");
  form.set("requestId", OBJECT_ID);
  form.set("file", makeFile(makePng(), "logo.png", PNG_MIME));
  const parsed = await readBoundedMultipartFormData(
    new NextRequest("https://partner.test/api/partners/onboarding/assets", {
      method: "POST",
      body: form
    }),
    4 * 1024
  );
  assert.equal(parsed.get("category"), "transparent_logo");
  assert.ok(parsed.get("file") instanceof Blob);
});

check("case-sensitive multipart boundaries are preserved", async () => {
  const boundary = "----CaseSensitiveBoundaryABC";
  const body = encoder.encode(
    `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="category"\r\n\r\n' +
      "transparent_logo\r\n" +
      `--${boundary}--\r\n`
  );
  const parsed = await readBoundedMultipartFormData(
    makeRequest({
      body,
      contentType: `multipart/form-data; boundary=${boundary}`
    }),
    4 * 1024
  );
  assert.equal(parsed.get("category"), "transparent_logo");
});

check("streamed multipart bodies cannot bypass the upload byte limit", async () => {
  await expectTypedError(
    () =>
      readBoundedMultipartFormData(
        makeRequest({
          body: new Uint8Array(64),
          contentType: "multipart/form-data; boundary=bounded-test"
        }),
        32
      ),
    OnboardingRequestError,
    "payload_too_large",
    413
  );
});

check("malformed JSON and non-object JSON are rejected", async () => {
  await expectTypedError(
    () => readBoundedJson(makeRequest({ body: "{" })),
    OnboardingRequestError,
    "invalid_json",
    400
  );
  await expectTypedError(
    () => readBoundedJson(makeRequest({ body: "[]" })),
    OnboardingRequestError,
    "invalid_json",
    400
  );
  await expectTypedError(
    () => readBoundedJson(makeRequest({ body: "null" })),
    OnboardingRequestError,
    "invalid_json",
    400
  );
});

check("valid UUID request IDs are normalized", () => {
  assert.equal(
    requireRequestId("123E4567-E89B-42D3-A456-426614174000"),
    "123e4567-e89b-42d3-a456-426614174000"
  );
});

check("invalid and non-string request IDs are rejected", async () => {
  for (const value of [
    "not-a-request-id",
    "123e4567-e89b-92d3-a456-426614174000",
    42,
    null
  ]) {
    await expectTypedError(
      () => requireRequestId(value),
      OnboardingRequestError,
      "invalid_request_id",
      400
    );
  }
});

check("same-origin requests pass with the direct host", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(
      makeRequest({
        body: "{}",
        headers: {
          host: "partner.test",
          origin: "https://partner.test"
        }
      })
    )
  );
});

check("trusted forwarded host and protocol determine the expected origin", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(
      makeRequest({
        body: "{}",
        headers: {
          host: "internal.test",
          origin: "https://partners.example.test",
          "x-forwarded-host": "partners.example.test",
          "x-forwarded-proto": "https"
        },
        url: "http://internal.test/api/partner/onboarding"
      })
    )
  );
});

check("host and protocol origin mismatches are rejected", async () => {
  await expectTypedError(
    () =>
      assertSameOrigin(
        makeRequest({
          body: "{}",
          headers: {
            host: "partner.test",
            origin: "https://attacker.test"
          }
        })
      ),
    OnboardingRequestError,
    "invalid_origin",
    403
  );
  await expectTypedError(
    () =>
      assertSameOrigin(
        makeRequest({
          body: "{}",
          headers: {
            host: "partner.test",
            origin: "http://partner.test"
          }
        })
      ),
    OnboardingRequestError,
    "invalid_origin",
    403
  );
});

check("missing or malformed origins are rejected", async () => {
  await expectTypedError(
    () =>
      assertSameOrigin(
        makeRequest({
          body: "{}",
          headers: { host: "partner.test" }
        })
      ),
    OnboardingRequestError,
    "invalid_origin",
    403
  );
  await expectTypedError(
    () =>
      assertSameOrigin(
        makeRequest({
          body: "{}",
          headers: {
            host: "partner.test",
            origin: "not a URL"
          }
        })
      ),
    OnboardingRequestError,
    "invalid_origin",
    403
  );
});

check("partner responses carry private no-store and no-sniff headers", () => {
  assert.match(ONBOARDING_PRIVATE_RESPONSE_HEADERS["Cache-Control"], /private/);
  assert.match(ONBOARDING_PRIVATE_RESPONSE_HEADERS["Cache-Control"], /no-store/);
  assert.equal(ONBOARDING_PRIVATE_RESPONSE_HEADERS.Vary, "Cookie");
  assert.equal(ONBOARDING_PRIVATE_RESPONSE_HEADERS["X-Content-Type-Options"], "nosniff");
});

let passed = 0;
const failures = [];

try {
  for (const [index, item] of checks.entries()) {
    try {
      await item.run();
      passed += 1;
      console.log(`ok ${index + 1} - ${item.name}`);
    } catch (error) {
      failures.push({
        name: item.name,
        detail: error instanceof Error ? error.stack ?? error.message : String(error)
      });
      console.error(`not ok ${index + 1} - ${item.name}`);
    }
  }

  assert.equal(networkAttempts, 0, "The verifier attempted a network request.");
} catch (error) {
  failures.push({
    name: "network isolation",
    detail: error instanceof Error ? error.stack ?? error.message : String(error)
  });
} finally {
  globalThis.fetch = originalFetch;
}

if (failures.length > 0) {
  console.error(
    `RCAP partner onboarding security verification failed: ${passed}/${checks.length} checks passed.`
  );
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log(
  `RCAP partner onboarding security verification passed: ${passed}/${checks.length} checks passed; 0 network requests attempted.`
);
