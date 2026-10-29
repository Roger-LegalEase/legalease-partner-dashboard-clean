export const GA_PRE2013_REVIEWED_THROUGH:string;
export const FORM:string;export const FAMILY:string;export const ROUTE:string;export const BASES:Record<string,string>;
export const FIELDS:ReadonlyArray<{factId:string;label:string}>;
export function validateGa(input:unknown):{facts:Record<string,unknown>;missing:Array<{fieldId:string;label:string;reason:string}>;attachmentGuidance:boolean};
