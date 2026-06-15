import type { FieldMap } from "./types";

export const nebraskaFieldMaps: Record<string, FieldMap> = {
  ne_cc_6_11_petition_set_aside_conviction: {
    formId: "ne_cc_6_11_petition_set_aside_conviction",
    mappingMode: "hybrid",
    fields: {},
    overlays: [
      {
        page: 1,
        x: 283,
        y: 663,
        textKey: "county",
        fontSize: 9,
        label: "court/county"
      },
      {
        page: 1,
        x: 380,
        y: 637,
        textKey: "caseNumber",
        fontSize: 10,
        label: "case number"
      },
      {
        page: 1,
        x: 112,
        y: 579,
        textKey: "petitionerName",
        fontSize: 10,
        label: "petitioner full name"
      },
      {
        page: 1,
        x: 221,
        y: 468,
        textKey: "offenseDescription",
        fontSize: 10,
        label: "conviction/offense description"
      },
      {
        page: 1,
        x: 121,
        y: 446,
        textKey: "dispositionDate",
        fontSize: 10,
        label: "disposition/sentence date"
      },
      {
        page: 1,
        x: 363,
        y: 334,
        textKey: "signatureDate",
        fontSize: 10,
        label: "petitioner signature date"
      },
      {
        page: 1,
        x: 187,
        y: 318,
        textKey: "petitionerName",
        fontSize: 10,
        label: "petitioner printed name"
      }
    ]
  },
  ne_cc_6_11_2_order_set_aside_conviction: {
    formId: "ne_cc_6_11_2_order_set_aside_conviction",
    mappingMode: "hybrid",
    fields: {},
    overlays: []
  },
  ne_cc_6_12_motion_seal_adult_record: {
    formId: "ne_cc_6_12_motion_seal_adult_record",
    mappingMode: "hybrid",
    fields: {},
    overlays: []
  }
};

export function getFieldMap(formId: string): FieldMap | null {
  return nebraskaFieldMaps[formId] ?? null;
}

export function isFieldMapComplete(fieldMap: FieldMap): boolean {
  const fieldCount = Object.keys(fieldMap.fields ?? {}).length;
  const overlayCount = fieldMap.overlays?.length ?? 0;
  return fieldCount + overlayCount > 0;
}
