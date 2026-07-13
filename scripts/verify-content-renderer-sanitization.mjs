/**
 * Content renderer — sanitization and structural safety.
 *
 * The renderer is the trust boundary between the CMS editor and the public web. It is an ALLOWLIST:
 * it walks a structured document and emits HTML itself, so there is no path by which editor-supplied
 * text becomes markup. This verifier attacks it with the payloads that break naive implementations.
 *
 * If any assertion here fails, a stored-XSS path into expungement.ai and legaleasepartner.com is open.
 */

import { register } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const failures = [];

const { renderContentDoc, validateContentDoc, safeUrl, escapeHtml, estimateReadingMinutes, contentDocToPlainText } =
  await import("../src/lib/content/renderer.ts");

// --- 1. Text is escaped, never interpreted as markup ----------------------------------------------

const scriptText = doc([
  { type: "paragraph", content: [text('<script>alert("xss")</script>')] }
]);
const scriptHtml = renderContentDoc(scriptText);
assert(!scriptHtml.includes("<script"), "A <script> tag in text must never be emitted as markup.");
assert(scriptHtml.includes("&lt;script&gt;"), "Script text must be HTML-escaped.");

// The escaped output still CONTAINS the word "onerror" as inert text — that is fine and expected.
// The property that matters is that no live <img> element is produced.
const imgOnerror = doc([
  { type: "paragraph", content: [text('<img src=x onerror=alert(1)>')] }
]);
const imgOnerrorHtml = renderContentDoc(imgOnerror);
assert(!/<img/i.test(imgOnerrorHtml), "An <img onerror> payload in text must not become a live element.");
assert(imgOnerrorHtml.includes("&lt;img"), "An <img onerror> payload must be escaped into text.");

// Attribute-context escaping: a quote in a caption must not break out of the attribute.
const quoteCaption = doc([
  {
    type: "image",
    attrs: {
      mediaId: "m1",
      src: "/img.png",
      alt: '" onerror="alert(1)',
      layout: "inline",
      caption: null,
      credit: null
    }
  }
]);
const quoteHtml = renderContentDoc(quoteCaption);
assert(!quoteHtml.includes('onerror="alert(1)"'), "A quote in alt text must not break out of the attribute.");
assert(quoteHtml.includes("&quot;"), "Quotes in attribute values must be escaped.");

// --- 2. URL scheme allowlist ------------------------------------------------------------------------

const dangerousUrls = [
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "java\tscript:alert(1)",
  "java\nscript:alert(1)",
  " javascript:alert(1)",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "//evil.example/path"
];

for (const url of dangerousUrls) {
  assert(safeUrl(url) === null, `safeUrl must reject ${JSON.stringify(url)}.`);
}

const safeUrls = ["/blog/post", "https://example.com/x", "http://example.com", "mailto:a@b.com", "#anchor"];
for (const url of safeUrls) {
  assert(safeUrl(url) !== null, `safeUrl must accept ${JSON.stringify(url)}.`);
}

// A javascript: link mark must degrade to plain text, keeping the words but dropping the anchor.
const jsLink = doc([
  {
    type: "paragraph",
    content: [{ type: "text", text: "click me", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }]
  }
]);
const jsLinkHtml = renderContentDoc(jsLink);
assert(!jsLinkHtml.includes("javascript:"), "A javascript: href must never be emitted.");
assert(!jsLinkHtml.includes("<a "), "An unsafe link must not produce an anchor at all.");
assert(jsLinkHtml.includes("click me"), "An unsafe link must keep its text content.");

// A protocol-relative image src must be dropped.
const protoRelImage = doc([
  { type: "image", attrs: { mediaId: "m", src: "//evil.example/x.png", alt: "x", layout: "inline" } }
]);
assert(renderContentDoc(protoRelImage) === "", "A protocol-relative image src must not render.");

// External links get rel=noopener.
const extLink = doc([
  {
    type: "paragraph",
    content: [{ type: "text", text: "ext", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }]
  }
]);
assert(
  renderContentDoc(extLink).includes('rel="noopener noreferrer"'),
  "External links must carry rel=noopener noreferrer."
);

// --- 3. Unknown node types and marks are dropped, not passed through ---------------------------------

const unknownNode = doc([
  { type: "rawHtml", attrs: { html: "<script>alert(1)</script>" } },
  { type: "paragraph", content: [text("safe")] }
]);
const unknownHtml = renderContentDoc(unknownNode);
assert(!unknownHtml.includes("<script"), "An unknown 'rawHtml' node must be dropped entirely.");
assert(unknownHtml.includes("<p>safe</p>"), "Known siblings of an unknown node must still render.");

const unknownMark = doc([
  { type: "paragraph", content: [{ type: "text", text: "hi", marks: [{ type: "evil" }] }] }
]);
assert(renderContentDoc(unknownMark) === "<p>hi</p>", "An unknown mark must be dropped but keep its text.");

// There must be no raw-HTML escape hatch anywhere in the renderer's CODE. Comments are stripped
// first: the renderer's own docblock legitimately names these constructs to explain that it avoids
// them, and matching against prose would be a false positive.
const rendererSource = fs.readFileSync(path.join(rootDir, "src/lib/content/renderer.ts"), "utf8");
const rendererCode = rendererSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
assert(
  !/dangerouslySetInnerHTML/.test(rendererCode),
  "The renderer must not contain a dangerouslySetInnerHTML escape hatch."
);
assert(
  !/\brawHtml\b|\btrustedHtml\b|\ballowRawHtml\b/i.test(rendererCode),
  "The renderer must not implement a raw-HTML passthrough node."
);

// --- 4. Heading level clamping -----------------------------------------------------------------------

const h1Attempt = doc([{ type: "heading", attrs: { level: 1 }, content: [text("Title")] }]);
const h1Html = renderContentDoc(h1Attempt);
assert(!h1Html.includes("<h1"), "Body headings must never emit <h1> (the article title owns it).");
assert(h1Html.includes("<h2"), "An out-of-range heading level must clamp to h2.");

// --- 5. Structural validation ------------------------------------------------------------------------

const missingAlt = doc([
  { type: "image", attrs: { mediaId: "m", src: "/a.png", alt: "", layout: "inline" } }
]);
const altProblems = validateContentDoc(missingAlt);
assert(
  altProblems.some((p) => p.includes("alt")),
  "validateContentDoc must flag an image with no alt text."
);

const badCta = doc([
  { type: "cta", attrs: { label: "Go", href: "javascript:alert(1)", ctaId: "x" } }
]);
assert(
  validateContentDoc(badCta).some((p) => p.includes("CTA")),
  "validateContentDoc must flag a CTA with an unsafe href."
);

assert(validateContentDoc({ type: "notdoc" }).length > 0, "validateContentDoc must reject a non-doc root.");
assert(validateContentDoc(doc([{ type: "paragraph", content: [text("ok")] }])).length === 0, "A clean doc must validate.");

// --- 6. CTA tracking hook + no inline script ----------------------------------------------------------

const cta = doc([
  { type: "cta", attrs: { label: "Start Free Check", href: "/expungement-ai/start", ctaId: "start_free_check" } }
]);
const ctaHtml = renderContentDoc(cta);
assert(ctaHtml.includes('data-cta-id="start_free_check"'), "A CTA must expose data-cta-id for the analytics tracker.");
assert(!/<script|onclick=/i.test(ctaHtml), "The renderer must never emit inline script or event handlers.");

// --- 7. Reading time + plain text ----------------------------------------------------------------------

const words = Array.from({ length: 400 }, () => "word").join(" ");
const longDoc = doc([{ type: "paragraph", content: [text(words)] }]);
assert(estimateReadingMinutes(longDoc) === 2, "400 words at 200wpm must be a 2 minute read.");
assert(estimateReadingMinutes(doc([{ type: "paragraph", content: [text("hi")] }])) === 1, "Reading time has a 1-minute floor.");
assert(contentDocToPlainText(longDoc).startsWith("word word"), "Plain text extraction must flatten paragraph text.");

// --- 8. escapeHtml completeness --------------------------------------------------------------------------

assert(escapeHtml(`<>&"'`) === "&lt;&gt;&amp;&quot;&#39;", "escapeHtml must escape < > & \" and '.");

// --- report --------------------------------------------------------------------------------------------

if (failures.length) {
  console.error("Content renderer sanitization verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Content renderer sanitization verification passed.");
console.log("Allowlist renderer: unknown nodes/marks are dropped; there is no raw-HTML passthrough.");
console.log("XSS: script text, onerror payloads, and attribute-breakout quotes are escaped in text and attribute position.");
console.log("URLs: javascript:, data:, vbscript:, file:, control-character-smuggled schemes, and protocol-relative //host are all rejected.");
console.log("Structure: missing alt text and unsafe CTA hrefs are rejected before storage; body headings cannot emit <h1>.");

// --- helpers --------------------------------------------------------------------------------------------

function doc(content) {
  return { type: "doc", content };
}

function text(value) {
  return { type: "text", text: value };
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
