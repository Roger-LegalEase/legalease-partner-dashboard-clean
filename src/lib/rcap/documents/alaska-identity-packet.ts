import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fieldMap from "@/../data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/production-field-map.json";
import { evaluateAlaskaIdentity, AK_IDENTITY_ROUTE } from "@/lib/rcap-engine/alaska-identity-research";
import type { AlaskaIdentityDocumentInput } from "./alaska-identity-document-facts";
import { finalizeFlatOverlay } from "../../../../scripts/rcap-official-forms/rcap-official-form-finalize.mjs";
import { fitTextToWidget } from "../../../../scripts/rcap-official-forms/rcap-text-fitting.mjs";

export const ALASKA_IDENTITY_SOURCE_SHA256 = "1fb64733f46c397beb69d1da8d72a1f1462669f8dfb7611e86a833c45aa5c80a";
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
// Existing reviewed instructions; later external acts are not represented as completed.
export const ALASKA_IDENTITY_PARTICIPANT_INSTRUCTIONS = "# Participant draft — Alaska DPS request\n\nThis is the agency's existing six-page application, with the known participant fields and the participant's actual explanation. It is not filing-ready. Complete remaining applicant-only Part II items from actual records; do not replace unknown answers with qualifying facts. Complete any SSN or ID field privately if the agency requires it; LegalEase does not infer or invent identifiers.\n\nObtain the officer/superior verification and, if referred, prosecutor/superior verification in Part IV. Obtain the actual court disposition order for dismissed or acquitted charges; for a conviction obtain the actual reversal/vacatur order or Governor's pardon as applicable. No exhibit or verification is attached to this draft. Do not complete Part V or VI or any government signature/agreement checkbox. The agency decides the beyond-a-reasonable-doubt standard; a dismissal alone is insufficient. Submit only the records held by the receiving agency.\n\nPreparation software is optional and distinct from government fees; no filing fee amount or outcome is promised. An adverse decision or contested proof uses separate attorney/administrative appeal assistance.\n\n## Español\n\nEste es un borrador de la solicitud de seis páginas de la agencia, con los datos conocidos y la explicación del participante. No está listo para presentarse. Complete los demás campos del participante con datos reales; no convierta respuestas desconocidas en hechos favorables. Complete de forma privada cualquier número de Seguro Social o de identificación que la agencia requiera.\n\nObtenga la verificación del oficial o superior y, si hubo remisión, del fiscal o superior en la Parte IV. Obtenga la orden judicial real de desestimación o absolución; para una condena, obtenga la orden real de revocación o anulación, o el indulto del gobernador que corresponda. No se adjunta ningún documento probatorio ni verificación a este borrador. No complete las Partes V o VI, firmas oficiales ni casillas de acuerdo de terceros. La agencia decide si se cumple el criterio de más allá de toda duda razonable. La preparación por software es opcional y no equivale a las tasas gubernamentales ni garantiza el resultado.\n";

/** Exact extraction of the reviewed six-page DPS fill. This renderer grants no fulfillment authority. */
export async function renderAlaskaIdentityPacket(input: AlaskaIdentityDocumentInput, sourceBytes: Uint8Array) {
  if (input.routeId !== AK_IDENTITY_ROUTE) throw new Error("Alaska DPS renderer requires its exact initial-request route");
  const decision = evaluateAlaskaIdentity(input.materialScreeningFacts, input.asOf);
  if (decision.status !== "qualifying" || decision.branchId !== "dps_initial_request") throw new Error("Alaska DPS initial-request facts remain unresolved");
  const sourceSha = sha256(sourceBytes);
  if (sourceSha !== ALASKA_IDENTITY_SOURCE_SHA256 || fieldMap.maps[0].officialSource.sha256 !== sourceSha) throw new Error("Alaska DPS official source identity changed");
  const cells = fieldMap.measuredCells.dps_seal_application.filter(cell => cell.fact && !cell.tooShallowToWriteIn && Object.hasOwn(input.facts, cell.fact));
  const anchors = cells.map(cell => ({label:cell.label,page:cell.page,writeBox:cell.rect,factId:cell.fact,protectedRules:[]}));
  const filled = await finalizeFlatOverlay({sourceBytes,expectedSha256:sourceSha,anchors,explicitMappings:Object.fromEntries(cells.map(cell => [cell.label,cell.fact])),facts:input.facts,documentTextLines:[]});
  if (filled.report.refused.length || filled.report.unfittable.length || filled.report.written.length !== cells.length) throw new Error("Alaska DPS participant facts do not fit the official form");
  const doc = await PDFDocument.load(filled.bytes,{updateMetadata:false});
  if (doc.getPageCount() !== 6) throw new Error("Alaska DPS official six-page source changed");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const explanation = input.materialScreeningFacts.ak_seal_explanation;
  if (typeof explanation !== "string") throw new Error("Alaska DPS explanation must be the participant's actual text");
  const box={x:36,y:160,width:540,height:440};
  const fit=fitTextToWidget({font,text:explanation,rect:box,multiline:true,maxFontSize:10,minFontSize:10});
  if (fit.outcome === "refused" || !fit.lines) throw new Error("Alaska DPS explanation needs a disclosed continuation; do not clip it");
  let y=600;
  for (const line of fit.lines) {doc.getPage(3).drawText(line,{x:box.x,y,size:fit.fontSize,font,color:rgb(0,0,0)});y-=14;}
  if (y <= box.y) throw new Error("Alaska DPS explanation exceeds the reviewed participant area");
  const bytes=Buffer.from(await doc.save({useObjectStreams:false}));
  return {bytes,pageCount:6,sourceSha256:sourceSha,artifactSha256:sha256(bytes),knownParticipantFieldsWritten:filled.report.written,
    documentIds:decision.documentIds,externalDocumentIds:decision.externalDocumentIds,
    unfilledParticipantFactIds:[...input.unfilledParticipantFactIds],requiredBeforeSubmission:structuredClone(fieldMap.requiredBeforeFiling),
    participantInstructions:ALASKA_IDENTITY_PARTICIPANT_INSTRUCTIONS,filingReady:false as const};
}
