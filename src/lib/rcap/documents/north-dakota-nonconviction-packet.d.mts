import type {NorthDakotaNonconvictionDocumentInput} from "./north-dakota-nonconviction-document-facts";
import type {ND_NONCONVICTION_DOCUMENT_MANIFEST} from "@/lib/rcap-engine/north-dakota-nonconviction-facts";
export const ND_NONCONVICTION_OFFICIAL_SOURCE_SHA256:string;
export function renderNorthDakotaNonconvictionPacket(input:NorthDakotaNonconvictionDocumentInput,sourceBytes:Uint8Array):Promise<{
 bytes:Uint8Array;artifactSha256:string;pageCount:6;sourceSha256:string;documents:typeof ND_NONCONVICTION_DOCUMENT_MANIFEST;
 written:ReadonlyArray<{field:string;factId?:string}>;refused:ReadonlyArray<unknown>;unfittable:ReadonlyArray<unknown>;filingReady:false;
 manualCompletion:{petitionElections:string;proposedOrder:string;execution:string;judicialDistrict:string|null};
}>;
