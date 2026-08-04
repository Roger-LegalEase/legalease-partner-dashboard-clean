import crypto from "node:crypto";
import { register } from "node:module";

import { PDFDocument } from "pdf-lib";

register("../lib/ts-esm-loader.mjs", import.meta.url);

const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const {
  GUIDANCE_TEMPLATES,
  NOT_A_COURT_FILING_NOTICE,
  NOT_A_COURT_FILING_SENTENCE
} = await import("@/lib/rcap/packets/engines/process-guidance");
const { renderPacketComponent } = await import(
  "@/lib/rcap/packets/engines/index"
);
const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");

const PROHIBITED_PARTICIPANT_FIELDS = Object.freeze([
  /\bsocial security number\b/i,
  /\bSSN\b/,
  /\brace\s*:/i,
  /\bnotary block\b/i,
  /\battorney (?:certifies|recites|represents)\b/i
]);

export async function verifyGuidanceFamily({
  jurisdiction,
  familyName,
  tracks,
  templates,
  deriveFacts,
  fixtureForTrack,
  verifyTypedStops
}) {
  const failures = [];
  const ok = (condition, message) => {
    if (!condition) failures.push(message);
  };

  ok(
    RELIEF_TRACKS.every(
      (track) =>
        track.jurisdiction !== jurisdiction ||
        !tracks.some((candidate) => candidate.trackId === track.trackId)
    ),
    `${familyName} is already wired into the shared runtime registry.`
  );
  ok(
    Object.keys(GUIDANCE_TEMPLATES).every(
      (templateId) => !Object.hasOwn(templates, templateId)
    ),
    `${familyName} templates are already wired into the shared renderer.`
  );

  Object.assign(GUIDANCE_TEMPLATES, templates);
  const samples = [];

  for (const track of tracks) {
    ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
    ok(track.statuses.technical === "renderer_ready", `${track.trackId} overstates technical status.`);
    ok(track.statuses.visual === "not_reviewed", `${track.trackId} overstates visual review.`);
    ok(track.statuses.legal === "not_submitted", `${track.trackId} overstates legal review.`);
    ok(
      computeRuntimeStatus({
        statuses: track.statuses,
        sourceCurrent: track.sourceCurrent,
        runtimeDisabled: track.runtimeDisabled,
        outputStrategy: track.outputStrategy
      }) === "runtime_disabled",
      `${track.trackId} does not compute runtime_disabled.`
    );

    const inputKeys = track.requiredInputs.map((input) => input.key);
    ok(
      new Set(inputKeys).size === inputKeys.length,
      `${track.trackId} duplicates a participant-input key.`
    );
    ok(
      track.packetSet.components.length === 1,
      `${track.trackId} must have one required guidance component.`
    );
    const component = track.packetSet.components[0];
    ok(component.role === "process_guidance", `${track.trackId} has the wrong component role.`);
    ok(component.requirement === "required", `${track.trackId} guidance is not required.`);
    ok(
      component.sourcePath === null && component.sourceSha256 === null,
      `${track.trackId} claims an editable official binary.`
    );
    ok(Boolean(templates[component.templateId]), `${track.trackId} has no family template.`);

    const facts = deriveFacts(track.trackId, fixtureForTrack(track.trackId));
    const first = await renderPacketComponent({
      component,
      jurisdiction,
      geography: null,
      facts,
      rootDir: process.cwd()
    });
    const second = await renderPacketComponent({
      component,
      jurisdiction,
      geography: null,
      facts,
      rootDir: process.cwd()
    });
    ok(sha256(first.bytes) === sha256(second.bytes), `${track.trackId} component bytes drifted.`);
    ok(first.pageCount > 0, `${track.trackId} rendered no pages.`);
    ok(first.metadata.isCourtFiling === false, `${track.trackId} rendered as a filing.`);

    const document = await PDFDocument.load(first.bytes);
    ok(
      document.getPages().every((page) => Boolean(page.node.Contents())),
      `${track.trackId} contains a content-free page.`
    );
    const template = templates[component.templateId];
    const notice = template.notFilingNotice ?? NOT_A_COURT_FILING_NOTICE;
    ok(
      notice.startsWith(NOT_A_COURT_FILING_SENTENCE),
      `${track.trackId} omits the not-a-court-filing notice.`
    );
    const participantText = JSON.stringify(template);
    for (const pattern of PROHIBITED_PARTICIPANT_FIELDS) {
      ok(
        !pattern.test(participantText),
        `${track.trackId} contains prohibited participant or attorney content: ${pattern}.`
      );
    }

    const components = [
      {
        componentId: component.componentId,
        role: component.role,
        order: component.order,
        bytes: first.bytes
      }
    ];
    const assembled = await assemblePacketPdf({
      jurisdiction,
      jurisdictionName: familyName,
      packetName: track.assembledPacketName,
      caseReference: "TECHNICAL-FIXTURE",
      title: track.assembledPacketTitle,
      components
    });
    const assembledAgain = await assemblePacketPdf({
      jurisdiction,
      jurisdictionName: familyName,
      packetName: track.assembledPacketName,
      caseReference: "TECHNICAL-FIXTURE",
      title: track.assembledPacketTitle,
      components
    });
    ok(
      assembled.sha256 === assembledAgain.sha256,
      `${track.trackId} assembled bytes drifted.`
    );
    ok(
      assembled.pageCount === first.pageCount,
      `${track.trackId} assembled page count does not match its sole component.`
    );
    samples.push({
      trackId: track.trackId,
      pageCount: assembled.pageCount,
      sha256: assembled.sha256
    });
  }

  try {
    verifyTypedStops();
  } catch (error) {
    failures.push(`Typed-stop regression failed: ${error.message}`);
  }

  for (const templateId of Object.keys(templates)) {
    delete GUIDANCE_TEMPLATES[templateId];
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
  return samples;
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
