#!/usr/bin/env node

import crypto from "node:crypto";
import { register } from "node:module";

import { PDFDocument } from "pdf-lib";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  FlowWriter,
  LINE_HEIGHT,
  MARGIN_BOTTOM,
  PAGE_HEIGHT,
  MARGIN_TOP,
  createDocument
} = await import("@/lib/rcap/packets/engines/pdf-layout");
const {
  GUIDANCE_TEMPLATES,
  ProcessGuidanceRenderer
} = await import("@/lib/rcap/packets/engines/process-guidance");

const failures = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};

{
  const { doc, fonts } = await createDocument();
  const writer = new FlowWriter(doc, fonts);
  writer.write("boundary marker", { size: 1, lineHeight: 634 });
  writer.spacingGap(LINE_HEIGHT);
  ok(doc.getPageCount() === 1, "An exact-boundary spacing gap created a page.");
}

{
  const { doc, fonts } = await createDocument();
  const writer = new FlowWriter(doc, fonts);
  writer.write("near-boundary marker", { size: 1, lineHeight: 635 });
  writer.spacingGap(LINE_HEIGHT);
  ok(
    doc.getPageCount() === 1,
    "A near-boundary spacing gap created a blank page."
  );
  writer.write("content after gap");
  ok(doc.getPageCount() === 2, "The next drawing operation did not paginate.");
  ok(
    contentBearingPages(doc).every(Boolean),
    "The near-boundary case contains a content-free page."
  );
}

{
  const { doc, fonts } = await createDocument();
  const writer = new FlowWriter(doc, fonts);
  const heading = "OFFICIAL SOURCES";
  const firstItem =
    "•  Official source whose wrapped first item must remain with its heading.";
  const blockHeight =
    writer.measureTextHeight(heading, { font: "bold", size: 11 }) +
    LINE_HEIGHT / 2 +
    writer.measureTextHeight(firstItem, { size: 11, indent: 14 });
  const usableHeight = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
  writer.write("keep-together marker", {
    size: 1,
    lineHeight: usableHeight - blockHeight + 1
  });
  ok(doc.getPageCount() === 1, "Keep-together setup unexpectedly paginated.");
  ok(writer.keepTogether(blockHeight), "A page-sized block was declined.");
  ok(doc.getPageCount() === 2, "The final section was not moved as a unit.");
  writer.write(heading, { font: "bold", size: 11 });
  writer.gap(LINE_HEIGHT / 2);
  writer.write(firstItem, { size: 11, indent: 14 });
  writer.gap();
  ok(
    contentBearingPages(doc).every(Boolean),
    "The keep-together case contains a content-free page."
  );
  ok(
    writer.keepTogether(usableHeight + 1) === false,
    "An oversized keep-together request was accepted."
  );
}

const templateId = "technical-fixture-layout-regression";
GUIDANCE_TEMPLATES[templateId] = {
  templateId,
  version: "1.0.0",
  technicalFixture: true,
  mechanismName: "TECHNICAL FIXTURE — layout regression",
  whyNotAFiling: "This fixture verifies pagination and does not describe a legal route.",
  processType: "agency",
  prerequisites: ["One prerequisite."],
  documentsToObtain: ["One record."],
  participantDataToGather: ["One participant value."],
  officialDestination: {
    name: "Fixture destination",
    detail: "No real filing destination."
  },
  actionSequence: ["Perform the fixture action."],
  submissionMethod: "No real submission.",
  fees: "No real fee.",
  feeWaiver: "No real waiver.",
  noticeOrService: ["No real notice."],
  expectedNextStage: "No real next stage.",
  legalEaseCanPrepare: ["This fixture."],
  legalEaseCannotPerform: ["Any legal service."],
  escalationTriggers: ["Any legal question."],
  officialSourceReferences: Array.from(
    { length: 40 },
    (_, index) => `Official fixture source ${String(index + 1).padStart(2, "0")}.`
  )
};

const input = {
  component: {
    componentId: "technical-fixture-layout-regression-component",
    role: "process_guidance",
    outputStrategy: "process_guidance",
    rendererStrategy: "process_guidance",
    templateId,
    sourcePath: null,
    sourceSha256: null,
    geographicScope: "statewide",
    requirement: "required",
    order: 1,
    approval: {
      visual: "not_reviewed",
      legal: "not_submitted"
    },
    version: "1.0.0"
  },
  jurisdiction: "ZZ",
  geography: null,
  facts: {},
  rootDir: process.cwd()
};

const first = await ProcessGuidanceRenderer.render(input);
const second = await ProcessGuidanceRenderer.render(input);
const firstDocument = await PDFDocument.load(first.bytes);
ok(
  (first.pageCount ?? 0) >= 2,
  "The synthetic boundary fixture did not exercise multi-page layout."
);
ok(
  contentBearingPages(firstDocument).every(Boolean),
  "The synthetic boundary fixture contains a trailing blank page."
);
ok(
  sha256(first.bytes) === sha256(second.bytes),
  "The process-guidance layout is not deterministic."
);
ok(
  first.rendererVersion === "process-guidance/1.0.1",
  "The renderer version was not advanced for the layout correction."
);

delete GUIDANCE_TEMPLATES[templateId];

if (failures.length > 0) {
  console.error("RCAP process-guidance layout verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP process-guidance layout verification passed.");
console.log("- exact- and near-boundary terminal spacing does not create pages");
console.log("- final heading and first item remain together");
console.log("- no trailing blank page");
console.log("- deterministic output");

function contentBearingPages(document) {
  return document.getPages().map((page) => Boolean(page.node.Contents()));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
