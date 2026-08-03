// ProcessGuidanceRenderer.
//
// Produces a real, actionable artifact for routes that are administrative,
// automatic, prosecutor-controlled or portal-based — not a dead-end screen, and
// never a fabricated court petition.
//
// The output states on its face that it is not a court filing. That statement
// is asserted by the acceptance gate, so a guidance artifact cannot be
// presented or counted as a generated filing packet.

import { PDFDocument } from "pdf-lib";
import {
  createDocument,
  fillTemplate,
  FlowWriter,
  LINE_HEIGHT
} from "@/lib/rcap/packets/engines/pdf-layout";
import {
  PacketRenderError,
  type PacketRenderer,
  type RenderInput,
  type RenderResult
} from "@/lib/rcap/packets/engines/types";
import { MISSISSIPPI_GUIDANCE_TEMPLATES } from "@/lib/rcap/packets/engines/guidance-templates-mississippi";

const VERSION = "process-guidance/1.0.0";

/** Asserted verbatim by the acceptance gate. */
export const NOT_A_COURT_FILING_NOTICE =
  "This document is not a court filing. It is step-by-step guidance for a process that is completed outside a court petition.";

export type GuidanceTemplate = {
  templateId: string;
  version: string;
  technicalFixture: boolean;
  mechanismName: string;
  /** Why this route is not a court filing. */
  whyNotAFiling: string;
  processType: "agency" | "prosecutor" | "certificate" | "portal" | "automatic" | "court_adjacent";
  /** Printed at the top of page one. Defaults to the non-production fixture banner. */
  banner?: string;
  prerequisites: readonly string[];
  documentsToObtain: readonly string[];
  participantDataToGather: readonly string[];
  officialDestination: { name: string; detail: string };
  actionSequence: readonly string[];
  submissionMethod: string;
  fees: string;
  feeWaiver: string;
  noticeOrService: readonly string[];
  expectedNextStage: string;
  legalEaseCanPrepare: readonly string[];
  legalEaseCannotPerform: readonly string[];
  escalationTriggers: readonly string[];
  officialSourceReferences: readonly string[];
};

const BASE_GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  "technical-fixture-guidance": {
    templateId: "technical-fixture-guidance",
    version: "1.0.0",
    technicalFixture: true,
    mechanismName: "TECHNICAL FIXTURE — administrative process guidance",
    whyNotAFiling:
      "This fixture represents a route completed through an agency rather than by filing a petition with a court. No petition exists for this route, so none is generated.",
    processType: "agency",
    prerequisites: [
      "This is a non-production fixture and has no real prerequisites.",
      "It exists to prove that guidance renders with all of its required sections."
    ],
    documentsToObtain: ["Fixture placeholder: a record or certificate the participant would request."],
    participantDataToGather: ["Full legal name", "Date of birth", "Any case or reference number"],
    officialDestination: {
      name: "Fixture agency (non-production)",
      detail: "No real destination. A production track names the actual agency, portal or office."
    },
    actionSequence: [
      "Gather the listed documents and data.",
      "Submit the request to the destination named above.",
      "Retain the confirmation you receive.",
      "Track the expected next stage."
    ],
    submissionMethod: "Fixture placeholder: online portal, mail or in person.",
    fees: "Fixture placeholder: no real fee applies.",
    feeWaiver: "Fixture placeholder: a production track states the real waiver path or that none exists.",
    noticeOrService: ["No notice or service is required for this fixture."],
    expectedNextStage: "Fixture placeholder for the stage that follows submission.",
    legalEaseCanPrepare: [
      "This guidance document.",
      "A checklist of the records and data to gather."
    ],
    legalEaseCannotPerform: [
      "Submitting the request on the participant's behalf.",
      "Guaranteeing eligibility or any outcome.",
      "Appearing before any agency or court."
    ],
    escalationTriggers: [
      "An objection or hearing is scheduled.",
      "The agency denies the request.",
      "The participant is asked for legal argument."
    ],
    officialSourceReferences: ["Fixture: a production track cites the controlling statute, rule and official page."]
  }
};

export const GUIDANCE_TEMPLATES: Readonly<Record<string, GuidanceTemplate>> = {
  ...BASE_GUIDANCE_TEMPLATES,
  ...MISSISSIPPI_GUIDANCE_TEMPLATES
};

export const ProcessGuidanceRenderer: PacketRenderer = {
  strategy: "process_guidance",
  version: VERSION,

  async render(input: RenderInput): Promise<RenderResult> {
    const templateId = input.component.templateId;
    const template = templateId ? GUIDANCE_TEMPLATES[templateId] : undefined;

    // Instruction components inside an official-form packet reuse this engine
    // with a generic template, so a missing named template is only an error
    // when the component actually claims one.
    const resolved: GuidanceTemplate =
      template ??
      (templateId === "technical-fixture-instructions"
        ? instructionsTemplate(input)
        : (() => {
            throw new PacketRenderError(
              "template_missing",
              "No approved guidance template is registered for this component.",
              { componentId: input.component.componentId, templateId }
            );
          })());

    const warnings: string[] = [];
    const fill = (text: string) => {
      const result = fillTemplate(text, input.facts);
      if (result.missing.length) warnings.push(`Absent values: ${result.missing.join(", ")}.`);
      return result.text;
    };

    const { doc, fonts } = await createDocument();
    const writer = new FlowWriter(doc, fonts);

    if (resolved.technicalFixture) {
      writer.write(resolved.banner ?? "NON-PRODUCTION TECHNICAL FIXTURE — NOT LEGAL ADVICE", {
        font: "bold",
        size: 9,
        align: "center"
      });
      writer.rule();
      writer.gap(LINE_HEIGHT / 2);
    }

    writer.write(fill(resolved.mechanismName), { font: "bold", size: 14, align: "center" });
    writer.gap(LINE_HEIGHT / 2);

    // The notice appears near the top, before any instruction, so it cannot be
    // missed by someone skimming.
    writer.write(NOT_A_COURT_FILING_NOTICE, { font: "bold", size: 11 });
    writer.gap(LINE_HEIGHT / 2);
    writer.write(fill(resolved.whyNotAFiling), { size: 11 });
    writer.gap();

    section(writer, "WHAT YOU NEED FIRST", resolved.prerequisites.map(fill));
    section(writer, "RECORDS AND DOCUMENTS TO OBTAIN", resolved.documentsToObtain.map(fill));
    section(writer, "INFORMATION TO GATHER", resolved.participantDataToGather.map(fill));

    writer.write("WHERE THIS GOES", { font: "bold", size: 11 });
    writer.gap(LINE_HEIGHT / 2);
    writer.write(fill(resolved.officialDestination.name), { font: "bold", size: 11 });
    writer.write(fill(resolved.officialDestination.detail), { size: 11 });
    writer.gap();

    section(writer, "WHAT TO DO, IN ORDER", resolved.actionSequence.map(fill), true);

    writer.write("HOW TO SUBMIT", { font: "bold", size: 11 });
    writer.gap(LINE_HEIGHT / 2);
    writer.write(fill(resolved.submissionMethod), { size: 11 });
    writer.gap();

    writer.write("FEES", { font: "bold", size: 11 });
    writer.gap(LINE_HEIGHT / 2);
    writer.write(fill(resolved.fees), { size: 11 });
    writer.write(fill(resolved.feeWaiver), { size: 11 });
    writer.gap();

    section(writer, "NOTICE AND SERVICE", resolved.noticeOrService.map(fill));

    writer.write("WHAT HAPPENS NEXT", { font: "bold", size: 11 });
    writer.gap(LINE_HEIGHT / 2);
    writer.write(fill(resolved.expectedNextStage), { size: 11 });
    writer.gap();

    section(writer, "WHAT LEGALEASE CAN PREPARE", resolved.legalEaseCanPrepare.map(fill));
    section(writer, "WHAT LEGALEASE CANNOT DO", resolved.legalEaseCannotPerform.map(fill));
    section(writer, "WHEN TO GET LEGAL HELP", resolved.escalationTriggers.map(fill));
    section(writer, "OFFICIAL SOURCES", resolved.officialSourceReferences.map(fill));

    const bytes = await doc.save();

    let pageCount = 0;
    try {
      pageCount = (await PDFDocument.load(bytes)).getPageCount();
    } catch (error) {
      throw new PacketRenderError("invalid_pdf_output", "The guidance artifact could not be reopened as a PDF.", {
        componentId: input.component.componentId,
        reason: String((error as Error)?.message ?? "").slice(0, 120)
      });
    }

    return {
      bytes,
      mimeType: "application/pdf",
      fileName: `${input.component.componentId}.pdf`,
      pageCount,
      sourceIdentity: resolved.templateId,
      sourceSha256: null,
      rendererStrategy: "process_guidance",
      rendererVersion: VERSION,
      warnings,
      validation: { parsed: true, pageCount, byteLength: bytes.byteLength, issues: warnings },
      metadata: {
        templateId: resolved.templateId,
        templateVersion: resolved.version,
        technicalFixture: resolved.technicalFixture,
        processType: resolved.processType,
        isCourtFiling: false,
        jurisdiction: input.jurisdiction,
        componentRole: input.component.role
      }
    };
  }
};

function section(writer: FlowWriter, heading: string, items: readonly string[], numbered = false): void {
  if (items.length === 0) return;
  writer.write(heading, { font: "bold", size: 11 });
  writer.gap(LINE_HEIGHT / 2);
  items.forEach((item, index) => {
    writer.write(numbered ? `${index + 1}.  ${item}` : `•  ${item}`, { size: 11, indent: 14 });
  });
  writer.gap();
}

/** Generic instructions accompanying an official-form packet. */
function instructionsTemplate(input: RenderInput): GuidanceTemplate {
  return {
    templateId: "technical-fixture-instructions",
    version: "1.0.0",
    technicalFixture: true,
    mechanismName: "TECHNICAL FIXTURE — filing instructions",
    whyNotAFiling:
      "These instructions accompany a completed form. The instructions themselves are not filed.",
    processType: "court_adjacent",
    prerequisites: ["Review the completed form in this packet before doing anything with it."],
    documentsToObtain: ["Any attachment the form itself requires."],
    participantDataToGather: ["Confirm every value printed on the form is correct."],
    officialDestination: {
      name: `Fixture destination for ${input.jurisdiction}`,
      detail: "A production track names the actual clerk, court or agency."
    },
    actionSequence: [
      "Read the completed form.",
      "Correct anything that is wrong.",
      "Follow the filing route named by the production track."
    ],
    submissionMethod: "Fixture placeholder.",
    fees: "Fixture placeholder.",
    feeWaiver: "Fixture placeholder.",
    noticeOrService: ["Fixture placeholder."],
    expectedNextStage: "Fixture placeholder.",
    legalEaseCanPrepare: ["The completed form in this packet.", "These instructions."],
    legalEaseCannotPerform: ["Filing on the participant's behalf.", "Guaranteeing any outcome."],
    escalationTriggers: ["A hearing is set.", "An objection is filed."],
    officialSourceReferences: ["Fixture placeholder."]
  };
}
