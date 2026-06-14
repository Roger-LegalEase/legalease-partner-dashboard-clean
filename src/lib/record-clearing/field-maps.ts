import type { FieldMap } from "./types";

export const nebraskaFieldMaps: Record<string, FieldMap> = {
  ne_cc_6_11_petition_set_aside_conviction: {
    formId: "ne_cc_6_11_petition_set_aside_conviction",
    mappingMode: "hybrid",
    fields: {},
    overlays: []
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
