import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFString
} from "pdf-lib";

const PDF_HEADER = Buffer.from("%PDF-");
const PDF_NAME = (value) => PDFName.of(value);
const PARTICIPANT_PATTERNS = [
  ["petitioner", /\bpetitioner\b/i],
  ["applicant", /\bapplicant\b/i],
  ["defendant", /\bdefendant\b/i],
  ["respondent", /\brespondent\b/i],
  ["participant", /\b(?:participant|client)\b/i],
  [
    "participant_identity",
    /\b(?:first|middle|last|full|maiden|former)\s*name\b|\b(?:dob|date\s*of\s*birth|ssn|social\s*security)\b/i
  ],
  [
    "participant_contact",
    /\b(?:home|mailing|residential)\s*address\b|\b(?:phone|telephone|email)\b/i
  ]
];
const THIRD_PARTY_PATTERNS = [
  ["judge", /\b(?:judge|judicial|court\s+approval)\b/i],
  ["clerk", /\b(?:clerk|court\s+staff)\b/i],
  [
    "prosecutor",
    /\b(?:prosecutor|district\s+attorney|state'?s?\s+attorney|commonwealth'?s?\s+attorney)\b/i
  ],
  ["attorney", /\b(?:attorney|counsel|lawyer|bar\s+(?:number|no))\b/i],
  ["notary", /\b(?:notary|commission\s+expires|seal)\b/i],
  [
    "law_enforcement_or_agency",
    /\b(?:law\s+enforcement|police|sheriff|agency|department|bureau)\b/i
  ],
  ["victim_or_witness", /\b(?:victim|witness)\b/i],
  [
    "service_recipient",
    /\b(?:served\s+(?:on|to)|service\s+recipient|recipient\s+name)\b/i
  ]
];

/**
 * Inspect a local path or URL.  The returned object contains no wall-clock
 * timestamp and is therefore stable for identical bytes and source labels.
 */
export async function inspectPdfSource(
  source,
  { rootDir = process.cwd(), fetchImpl = globalThis.fetch } = {}
) {
  if (typeof source !== "string" || source.trim().length === 0) {
    throw new Error("PDF source must be a non-empty local path or URL");
  }
  const trimmed = source.trim();
  let bytes;
  let sourceRecord;

  if (/^https?:\/\//i.test(trimmed)) {
    if (typeof fetchImpl !== "function") {
      throw new Error("This Node runtime does not provide fetch for URL inspection");
    }
    const response = await fetchImpl(trimmed, {
      redirect: "follow",
      headers: { accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.1" }
    });
    if (!response.ok) {
      throw new Error(`PDF fetch failed with HTTP ${response.status}`);
    }
    bytes = Buffer.from(await response.arrayBuffer());
    const url = new URL(trimmed);
    sourceRecord = {
      kind: "url",
      value: url.toString(),
      fileName: decodeURIComponent(path.posix.basename(url.pathname)) || "source.pdf"
    };
  } else {
    const absolutePath = path.resolve(rootDir, trimmed);
    bytes = await fs.readFile(absolutePath);
    sourceRecord = {
      kind: "file",
      value: safeSourcePath(rootDir, absolutePath),
      fileName: path.basename(absolutePath)
    };
  }

  return inspectPdfBytes(bytes, { source: sourceRecord });
}

export async function inspectPdfBytes(
  input,
  {
    source = { kind: "bytes", value: "[bytes]", fileName: "source.pdf" }
  } = {}
) {
  const bytes = Buffer.from(input);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const reportBase = {
    schemaVersion: "rcap-factory-pdf-inspection/v1",
    source,
    byteLength: bytes.length,
    sha256,
    structureClass: "unreadable_pdf",
    pageCount: null,
    acroFormFieldCount: 0,
    acroFormFields: [],
    widgetTypes: [],
    pageCoordinates: [],
    checkboxRadioValues: [],
    multilineFields: [],
    duplicateFieldNames: [],
    acroForm: {
      present: false,
      xfaPresent: false,
      fieldCount: 0,
      fields: [],
      duplicateFieldNames: [],
      duplicateFields: []
    },
    signatureBlocks: [],
    probableParticipantFields: [],
    probableThirdPartyFields: [],
    ownershipProposal: {
      status: "proposed_only",
      approved: false,
      requiresHumanApproval: true,
      participantFields: [],
      thirdPartyFields: [],
      unclassifiedFields: []
    },
    pageStructure: [],
    warnings: [],
    errors: []
  };

  if (!bytes.subarray(0, PDF_HEADER.length).equals(PDF_HEADER)) {
    return {
      ...reportBase,
      errors: ["source does not begin with a PDF header"]
    };
  }

  const rawText = bytes.toString("latin1");
  const encrypted = /\/Encrypt\b/.test(rawText);
  let document;
  try {
    document = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false
    });
  } catch (error) {
    return {
      ...reportBase,
      structureClass: encrypted ? "encrypted_pdf" : "unreadable_pdf",
      warnings: encrypted
        ? ["encryption dictionary detected; ownership and field metadata are not approved"]
        : [],
      errors: [normalizeError(error)]
    };
  }

  const pages = document.getPages();
  const pageMaps = buildPageMaps(document, pages);
  const acroForm = lookupAcroForm(document);
  const xfaPresent = Boolean(acroForm?.has(PDF_NAME("XFA")));
  const rawFieldNames = collectRawTerminalFieldNames(document, acroForm);
  const fields = acroForm
    ? collectFields(document, pages, pageMaps, xfaPresent)
    : [];
  // A field appears in both the raw tree and the high-level list.  Counts from
  // either representation alone are meaningful; combining them would mark
  // every ordinary field as duplicated.  Prefer raw tree counts when present.
  const rawDuplicates = duplicateNameRecords(rawFieldNames);
  const highLevelDuplicates = duplicateNameRecords(
    fields.map((field) => field.name)
  );
  const actualDuplicates =
    rawFieldNames.length > 0 ? rawDuplicates : highLevelDuplicates;

  const ownership = proposeOwnership(fields);
  const signatureBlocks = collectSignatureBlocks(fields, ownership);
  const pageStructure = pages.map((page, index) =>
    inspectPageStructure(document, page, index + 1)
  );

  const structureClass = classifyStructure({
    encrypted,
    xfaPresent,
    hasAcroForm: Boolean(acroForm),
    duplicateFieldNames: actualDuplicates,
    pageStructure
  });
  const warnings = [];
  if (encrypted) {
    warnings.push("encryption dictionary detected; metadata was read in inspection-only mode");
  }
  if (xfaPresent) {
    warnings.push("XFA data detected; XFA rendering and ownership require manual review");
  }
  if (actualDuplicates.length > 0) {
    warnings.push("duplicate fully-qualified AcroForm field names detected");
  }
  if (fields.length === 0 && acroForm) {
    warnings.push("AcroForm dictionary present but no terminal fields were readable");
  }
  if (
    rawFieldNames.length > 0 &&
    !sameStringSet(rawFieldNames, fields.map((field) => field.name))
  ) {
    warnings.push("raw and high-level field inventories disagree; manual inspection recommended");
  }

  return {
    ...reportBase,
    structureClass,
    pageCount: pages.length,
    acroFormFieldCount: fields.length,
    acroFormFields: fields,
    widgetTypes: [
      ...new Set(fields.flatMap((field) => field.widgetTypes))
    ].sort(),
    pageCoordinates: fields
      .flatMap((field) =>
        field.widgets.map((widget) => ({
          fieldName: field.name,
          widgetType: widget.controlType,
          page: widget.page,
          ...widget.coordinates
        }))
      )
      .sort(
        (left, right) =>
          left.fieldName.localeCompare(right.fieldName) ||
          compareNullable(left.page, right.page) ||
          left.y - right.y ||
          left.x - right.x
      ),
    checkboxRadioValues: fields
      .filter((field) => ["checkbox", "radio"].includes(field.type))
      .map((field) => ({
        fieldName: field.name,
        widgetType: field.type,
        values: field.exportValues
      })),
    multilineFields: fields
      .filter((field) => field.multiline)
      .map((field) => field.name),
    duplicateFieldNames: actualDuplicates.map((entry) => entry.name),
    acroForm: {
      present: Boolean(acroForm),
      xfaPresent,
      fieldCount: fields.length,
      fields,
      duplicateFieldNames: actualDuplicates.map((entry) => entry.name),
      duplicateFields: actualDuplicates
    },
    signatureBlocks,
    probableParticipantFields: ownership.participantFields,
    probableThirdPartyFields: ownership.thirdPartyFields,
    ownershipProposal: {
      status: "proposed_only",
      approved: false,
      requiresHumanApproval: true,
      participantFields: ownership.participantFields,
      thirdPartyFields: ownership.thirdPartyFields,
      unclassifiedFields: ownership.unclassifiedFields
    },
    pageStructure,
    warnings
  };
}

export function createOwnershipMapProposal(inspection) {
  return {
    schemaVersion: "rcap-factory-field-ownership-proposal/v1",
    sourceSha256: inspection.sha256,
    source: inspection.source,
    status: "proposed_only",
    approved: false,
    requiresHumanApproval: true,
    warning:
      "Heuristic ownership is scaffolding only. A reviewer must approve every field before implementation.",
    fields: (inspection.acroForm?.fields ?? []).map((field) => {
      const proposal =
        inspection.ownershipProposal.participantFields.find(
          (entry) => entry.fieldName === field.name
        ) ??
        inspection.ownershipProposal.thirdPartyFields.find(
          (entry) => entry.fieldName === field.name
        );
      return {
        fieldName: field.name,
        proposedOwner: proposal?.proposedOwner ?? "unclassified",
        reason: proposal?.reason ?? null,
        confidence: proposal?.confidence ?? "unclassified",
        approved: false
      };
    })
  };
}

function collectFields(document, pages, pageMaps, xfaPresent) {
  let fields = [];
  const originalWarn = console.warn;
  try {
    // pdf-lib warns that getForm removes XFA from its in-memory model. We have
    // already recorded XFA and never save this inspection-only document.
    if (xfaPresent) console.warn = () => {};
    fields = document.getForm().getFields();
  } catch {
    return [];
  } finally {
    console.warn = originalWarn;
  }

  return fields
    .map((field, index) => inspectField(document, pages, pageMaps, field, index))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        left.type.localeCompare(right.type) ||
        left.sourceIndex - right.sourceIndex
    )
    .map((field) =>
      Object.fromEntries(
        Object.entries(field).filter(([key]) => key !== "sourceIndex")
      )
    );
}

function inspectField(document, pages, pageMaps, field, sourceIndex) {
  const name = safeCall(() => field.getName(), `unnamed-field-${sourceIndex + 1}`);
  const type = fieldType(field);
  const widgets = safeCall(() => field.acroField.getWidgets(), [])
    .map((widget, widgetIndex) =>
      inspectWidget(document, pages, pageMaps, widget, type, widgetIndex)
    )
    .sort(
      (left, right) =>
        compareNullable(left.page, right.page) ||
        left.coordinates.y - right.coordinates.y ||
        left.coordinates.x - right.coordinates.x ||
        left.widgetIndex - right.widgetIndex
    )
    .map((widget) =>
      Object.fromEntries(
        Object.entries(widget).filter(([key]) => key !== "widgetIndex")
      )
    );
  const multiline =
    type === "text"
      ? Boolean(safeCall(() => field.isMultiline(), false))
      : false;
  const exportValues = collectExportValues(field, widgets);
  return {
    name,
    type,
    widgetTypes: [...new Set(widgets.map((widget) => widget.controlType))].sort(),
    widgets,
    exportValues,
    multiline,
    sourceIndex
  };
}

function inspectWidget(
  document,
  pages,
  pageMaps,
  widget,
  controlType,
  widgetIndex
) {
  const rectangle = safeCall(
    () => widget.getRectangle(),
    { x: 0, y: 0, width: 0, height: 0 }
  );
  const page = resolveWidgetPage(document, pages, pageMaps, widget);
  const onValue = decodePdfValue(safeCall(() => widget.getOnValue(), null));
  const appearanceState = decodePdfValue(
    safeCall(() => widget.getAppearanceState(), null)
  );
  return {
    annotationType: "widget",
    controlType,
    page,
    coordinates: {
      x: roundCoordinate(rectangle.x),
      y: roundCoordinate(rectangle.y),
      width: roundCoordinate(rectangle.width),
      height: roundCoordinate(rectangle.height)
    },
    exportValue: onValue,
    appearanceState,
    widgetIndex
  };
}

function collectExportValues(field, widgets) {
  const values = [];
  for (const candidate of [
    ...safeCall(() => field.acroField.getExportValues(), []),
    ...safeCall(() => field.acroField.getOnValues(), []),
    safeCall(() => field.acroField.getOnValue(), null),
    ...safeCall(() => field.getOptions(), [])
  ]) {
    const value = decodePdfValue(candidate);
    if (value !== null && value !== "Off") values.push(value);
  }
  for (const widget of widgets) {
    if (widget.exportValue && widget.exportValue !== "Off") {
      values.push(widget.exportValue);
    }
  }
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function proposeOwnership(fields) {
  const participantFields = [];
  const thirdPartyFields = [];
  const unclassifiedFields = [];

  for (const field of fields) {
    const searchable = humanizeFieldName(field.name);
    const thirdParty = firstPatternMatch(searchable, THIRD_PARTY_PATTERNS);
    const participant = firstPatternMatch(searchable, PARTICIPANT_PATTERNS);
    if (thirdParty) {
      thirdPartyFields.push({
        fieldName: field.name,
        proposedOwner: "third_party",
        reason: thirdParty,
        confidence: "probable",
        approved: false
      });
    } else if (participant) {
      participantFields.push({
        fieldName: field.name,
        proposedOwner: "participant",
        reason: participant,
        confidence: "probable",
        approved: false
      });
    } else {
      unclassifiedFields.push({
        fieldName: field.name,
        proposedOwner: "unclassified",
        reason: null,
        confidence: "unclassified",
        approved: false
      });
    }
  }

  return { participantFields, thirdPartyFields, unclassifiedFields };
}

function collectSignatureBlocks(fields, ownership) {
  const ownershipByName = new Map(
    [
      ...ownership.participantFields,
      ...ownership.thirdPartyFields,
      ...ownership.unclassifiedFields
    ].map((entry) => [entry.fieldName, entry])
  );
  return fields
    .filter(
      (field) =>
        field.type === "signature" ||
        /\b(?:signature|signed\s+by|sign\s+here)\b/i.test(
          humanizeFieldName(field.name)
        )
    )
    .map((field) => ({
      fieldName: field.name,
      detection:
        field.type === "signature" ? "acroform_signature_field" : "name_heuristic",
      probableOwner:
        ownershipByName.get(field.name)?.proposedOwner ?? "unclassified",
      approved: false,
      widgets: field.widgets.map((widget) => ({
        page: widget.page,
        coordinates: widget.coordinates
      }))
    }));
}

function inspectPageStructure(document, page, pageNumber) {
  const resources = safeCall(() => page.node.Resources(), null);
  let hasFonts = false;
  let imageXObjectCount = 0;
  let otherXObjectCount = 0;
  if (resources instanceof PDFDict) {
    const fonts = safeLookup(resources, PDF_NAME("Font"), PDFDict);
    hasFonts = fonts instanceof PDFDict && fonts.keys().length > 0;
    const xObjects = safeLookup(resources, PDF_NAME("XObject"), PDFDict);
    if (xObjects instanceof PDFDict) {
      for (const key of xObjects.keys()) {
        const object = safeContextLookup(document, xObjects.get(key));
        const dictionary =
          object instanceof PDFRawStream
            ? object.dict
            : object instanceof PDFDict
              ? object
              : null;
        const subtype = decodePdfValue(dictionary?.get(PDF_NAME("Subtype")));
        if (subtype === "Image") imageXObjectCount += 1;
        else otherXObjectCount += 1;
      }
    }
  }
  const size = page.getSize();
  return {
    page: pageNumber,
    width: roundCoordinate(size.width),
    height: roundCoordinate(size.height),
    rotation: safeCall(() => page.getRotation().angle, 0),
    hasFontResources: hasFonts,
    imageXObjectCount,
    otherXObjectCount
  };
}

function classifyStructure({
  encrypted,
  xfaPresent,
  hasAcroForm,
  duplicateFieldNames,
  pageStructure
}) {
  if (encrypted) return "encrypted_pdf";
  if (xfaPresent) return "xfa_pdf";
  if (hasAcroForm) {
    return duplicateFieldNames.length > 0
      ? "dirty_acroform"
      : "clean_acroform";
  }
  const hasFonts = pageStructure.some((page) => page.hasFontResources);
  const hasImages = pageStructure.some((page) => page.imageXObjectCount > 0);
  if (!hasFonts && hasImages) return "scanned_pdf";
  return "flat_pdf";
}

function lookupAcroForm(document) {
  const entry = document.catalog.get(PDF_NAME("AcroForm"));
  const value = safeContextLookup(document, entry);
  return value instanceof PDFDict ? value : null;
}

function collectRawTerminalFieldNames(document, acroForm) {
  if (!(acroForm instanceof PDFDict)) return [];
  const roots = safeLookup(acroForm, PDF_NAME("Fields"), PDFArray);
  if (!(roots instanceof PDFArray)) return [];
  const names = [];
  const visited = new Set();

  function visit(candidate, parentParts = []) {
    const identity =
      candidate instanceof PDFRef ? candidate.toString() : String(candidate);
    if (visited.has(identity)) return;
    visited.add(identity);
    const dictionary = safeContextLookup(document, candidate);
    if (!(dictionary instanceof PDFDict)) return;
    const partialName = decodePdfValue(dictionary.get(PDF_NAME("T")));
    const currentParts = partialName
      ? [...parentParts, partialName]
      : parentParts;
    const kids = safeLookup(dictionary, PDF_NAME("Kids"), PDFArray);
    const nonWidgetChildren = [];
    if (kids instanceof PDFArray) {
      for (let index = 0; index < kids.size(); index += 1) {
        const childEntry = kids.get(index);
        const child = safeContextLookup(document, childEntry);
        if (!(child instanceof PDFDict)) continue;
        const subtype = decodePdfValue(child.get(PDF_NAME("Subtype")));
        if (subtype !== "Widget") nonWidgetChildren.push(childEntry);
      }
    }
    if (nonWidgetChildren.length === 0 && currentParts.length > 0) {
      names.push(currentParts.join("."));
    } else {
      for (const child of nonWidgetChildren) visit(child, currentParts);
    }
  }

  for (let index = 0; index < roots.size(); index += 1) {
    visit(roots.get(index), []);
  }
  return names.filter(Boolean);
}

function buildPageMaps(document, pages) {
  const byReference = new Map();
  const annotationPage = new Map();
  pages.forEach((page, pageIndex) => {
    byReference.set(page.ref.toString(), pageIndex + 1);
    const annotations = safeCall(() => page.node.Annots(), null);
    if (!(annotations instanceof PDFArray)) return;
    for (let index = 0; index < annotations.size(); index += 1) {
      const entry = annotations.get(index);
      if (entry instanceof PDFRef) {
        annotationPage.set(entry.toString(), pageIndex + 1);
      }
      const dictionary = safeContextLookup(document, entry);
      if (dictionary instanceof PDFDict) {
        annotationPage.set(dictionary, pageIndex + 1);
      }
    }
  });
  return { byReference, annotationPage };
}

function resolveWidgetPage(document, pages, pageMaps, widget) {
  const pageEntry = safeCall(() => widget.P(), null);
  if (pageEntry instanceof PDFRef) {
    const number = pageMaps.byReference.get(pageEntry.toString());
    if (number) return number;
  }
  if (pageEntry instanceof PDFDict) {
    const match = pages.findIndex((page) => page.node === pageEntry);
    if (match >= 0) return match + 1;
  }
  const direct = pageMaps.annotationPage.get(widget.dict);
  if (direct) return direct;
  return null;
}

function duplicateNameRecords(names) {
  const counts = new Map();
  for (const name of names.filter(Boolean)) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function sameStringSet(left, right) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size !== rightSet.size) return false;
  return [...leftSet].every((value) => rightSet.has(value));
}

function fieldType(field) {
  switch (field?.constructor?.name) {
    case "PDFTextField":
      return "text";
    case "PDFCheckBox":
      return "checkbox";
    case "PDFRadioGroup":
      return "radio";
    case "PDFDropdown":
      return "dropdown";
    case "PDFOptionList":
      return "option_list";
    case "PDFButton":
      return "button";
    case "PDFSignature":
      return "signature";
    default:
      return "unknown";
  }
}

function decodePdfValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.replace(/^\//, "");
  if (value instanceof PDFString || value instanceof PDFHexString) {
    return safeCall(() => value.decodeText(), value.toString());
  }
  if (value instanceof PDFName) return value.asString().replace(/^\//, "");
  const rendered = safeCall(() => value.toString(), String(value));
  return rendered.replace(/^\//, "");
}

function safeLookup(dictionary, key, expectedType) {
  try {
    return dictionary.lookup(key, expectedType);
  } catch {
    return null;
  }
}

function safeContextLookup(document, value) {
  if (value === null || value === undefined) return null;
  try {
    return document.context.lookup(value);
  } catch {
    return null;
  }
}

function firstPatternMatch(value, patterns) {
  for (const [reason, pattern] of patterns) {
    if (pattern.test(value)) return reason;
  }
  return null;
}

function humanizeFieldName(value) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_.:[\]#/-]+/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeSourcePath(rootDir, absolutePath) {
  const relative = path.relative(path.resolve(rootDir), absolutePath);
  if (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  ) {
    return relative.replaceAll(path.sep, "/") || path.basename(absolutePath);
  }
  return `[external-local-source]/${path.basename(absolutePath)}`;
}

function safeCall(callback, fallback) {
  try {
    const value = callback();
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function roundCoordinate(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function compareNullable(left, right) {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function normalizeError(error) {
  return String(error?.message ?? error)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}
