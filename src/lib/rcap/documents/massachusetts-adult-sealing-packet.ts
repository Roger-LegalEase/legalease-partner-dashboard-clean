import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { evaluateMassachusettsAdultSealing, MASSACHUSETTS_ADULT_SEALING_ROUTE } from "@/lib/rcap-engine/massachusetts-adult-sealing-facts";

export const MASSACHUSETTS_ADULT_PACKET_ROUTE = MASSACHUSETTS_ADULT_SEALING_ROUTE;
export const MASSACHUSETTS_SEALING_FORM_SHA256 = "416f9a1d1a7ade6e71ffe3964a30c2d247bd1aca3982f4ff8e55550a730506ce";
export type MassachusettsAdultMatter = {
  matterId: string;
  verifiedAt: string;
  participant: { firstName: string; middleName?: string; lastName: string; dateOfBirth: string; streetAddress: string; city: string; state: string; zip: string; alias?: string };
  caseNumber: string;
  courtName: string;
  facts: Readonly<Record<string, unknown>>;
};
const hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

/** Official administrative100A request. This held preview creates no commercial or release authority. */
export async function renderMassachusettsAdultSealingPacket(matter: MassachusettsAdultMatter, officialForm: Uint8Array, locale: "en" | "es" = "en") {
  const kind = "adult";
  const m = structuredClone(matter);
  const source = Uint8Array.from(officialForm);
  if (hash(source) !== MASSACHUSETTS_SEALING_FORM_SHA256) throw new Error("Massachusetts100B: current official form checksum mismatch");
  const p = m.participant;
  for (const [label, value] of Object.entries({ matterId: m.matterId, firstName: p.firstName, lastName: p.lastName, birth: p.dateOfBirth,
    street: p.streetAddress, city: p.city, state: p.state, zip: p.zip, caseNumber: m.caseNumber, court: m.courtName })) {
    if (typeof value !== "string" || !value.trim() || /\{\{|\}\}|Morgan Sample|Acceptance Consumer|placeholder/i.test(value)) throw new Error(`Massachusetts100B: missing or unresolved ${label}`);
  }
  const asOf = m.verifiedAt.slice(0, 10);
  const birth = new Date(`${p.dateOfBirth}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.dateOfBirth) || !Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== p.dateOfBirth || p.dateOfBirth > asOf) throw new Error("Massachusetts100B: invalid birth chronology");
  const eligibility = evaluateMassachusettsAdultSealing(MASSACHUSETTS_ADULT_PACKET_ROUTE, m.facts, asOf);
  if (eligibility?.status !== "qualifying") throw new Error(`Massachusetts100B: eligibility ${eligibility?.status}; ${eligibility?.reason}`);
  for (const id of ["ma_100a_latest_misdemeanor_event", "ma_100a_latest_felony_event", "ma_100a_latest_sex_offense_completion"]) {
    const value = m.facts[id]; const unwrapped = value && typeof value === "object" ? (value as { value?: unknown }).value : value;
    const date = typeof unwrapped === "string" ? unwrapped.trim() : unwrapped;
    if ( ["none", "no se aplicó", "nunca"].includes(String(date).toLowerCase())) continue;
    if (typeof date !== "string" || date < p.dateOfBirth) throw new Error("Massachusetts100B: juvenile court event precedes birth");
  }
  const pdf = await PDFDocument.load(source);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const form = pdf.getForm();
  const name = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(" ");
  const values: Record<string, string> = { Print: name, "Date of Birth": p.dateOfBirth, "Mailing address": p.streetAddress, City: p.city, State: p.state, Zip: p.zip };
  if (p.alias?.trim()) values.AliasMaidenPrevious_Name = p.alias;
  for (const [key, value] of Object.entries(values)) {
    const field = form.getTextField(key === "AliasMaidenPrevious_Name" ? "AliasMaidenPrevious Name" : key);
    const box = field.acroField.getWidgets()[0].getRectangle();
    if (font.widthOfTextAtSize(value, 8) > box.width - 3) throw new Error(`Massachusetts100B: ${key} does not fit official form; no clipping or tiny type permitted`);
    field.setFontSize(8); field.setText(value); field.updateAppearances(font);
  }
  // Select the supported adult request and corresponding affidavit; no signature is fabricated.
  const felonyAnswer = m.facts.ma_100a_latest_felony_event;
  const felonyValue = felonyAnswer && typeof felonyAnswer === "object" ? (felonyAnswer as { value?: unknown }).value : felonyAnswer;
  const felonyDate = typeof felonyValue === "string" ? felonyValue.trim() : felonyValue;
  const hasFelony = typeof felonyDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(felonyDate);
  const sexAnswer = m.facts.ma_100a_latest_sex_offense_completion;
  const sexValue = sexAnswer && typeof sexAnswer === "object" ? (sexAnswer as { value?: unknown }).value : sexAnswer;
  const hasSex = typeof sexValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sexValue.trim());
  const misdemeanorAnswer = m.facts.ma_100a_latest_misdemeanor_event;
  const misdemeanorValue = misdemeanorAnswer && typeof misdemeanorAnswer === "object" ? (misdemeanorAnswer as { value?: unknown }).value : misdemeanorAnswer;
  const hasMisdemeanor = typeof misdemeanorValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(misdemeanorValue.trim());
  // The official form expressly permits multiple Part A choices; include every represented adult class.
  const selections = [...(hasMisdemeanor ? [2,6] : []), ...(hasFelony || hasSex ? [3,7] : [])];
  for (let i=1;i<=7;i++) { const field=form.getCheckBox(`Check Box${i}`); if(selections.includes(i))field.check();else field.uncheck(); }
  const created = new Date(`${asOf}T00:00:00Z`);
  pdf.setCreationDate(created); pdf.setModificationDate(created); pdf.setTitle(`Massachusetts ${kind} record sealing - prepared request`);
  // Update text/checkbox appearances. Signature fields remain unsigned and no OCP action is written.
  form.updateFieldAppearances(font);
  const official = Buffer.from(await pdf.save({ useObjectStreams: false }));
  const instructions = pdf.addPage([612, 792]);
  const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
  const title = locale === "es" ? "Instrucciones para el participante - NO PRESENTAR" : "Participant instructions - DO NOT FILE";
  const adultParagraphs = locale === "es" ? [
    `${fullName}; ${m.courtName}; expediente ${m.caseNumber}. Solicitud administrativa de sellado del registro completo de Massachusetts conforme a la sección 100A. No es eliminación de registros ni petición judicial por caso. La referencia identifica solo una entrada; deben considerarse todas.`,
    "LegalEase prepara el formulario oficial del Comisionado de Libertad Condicional y selecciona la solicitud y declaración de adulto correspondientes. No se firma por usted ni se completa una decisión oficial. La modalidad juvenil de la sección 100B no está seleccionada.",
    "Revise la solicitud y firme tanto la solicitud como la declaración de adulto bajo pena de perjurio. Complete los datos biográficos adicionales que exija la oficina; los datos desconocidos siguen en blanco. Este flujo no le pide enviar un número de Seguro Social. No escriba bajo la línea de uso oficial.",
    "Los delitos menores usan tres años y los graves siete desde sus propios últimos eventos pertinentes, incluida la custodia. Los delitos sexuales elegibles requieren 15 años o el período mayor del deber de registrarse; una clasificación de nivel 2 o 3 en cualquier momento impide sellar los delitos sexuales. Se aplican las exclusiones de armas e integridad pública y los requisitos separados de antecedentes y encarcelamiento.",
    "Envíe la solicitud al Comisionado de Libertad Condicional, One Ashburton Place, Room 405, Boston, MA 02108, después de confirmar las instrucciones vigentes. No se añade una orden judicial propuesta ni notificación al fiscal. Antes de presentar, obtenga su propio CORI de DCJIS para identificar las entradas determinantes; obtenga expedientes si los necesita. LegalEase no recopila ni inspecciona su CORI ni afirma que esté adjunto.",
    "El trámite público es gratuito y no requiere comprar LegalEase. Cualquier cargo opcional de software es distinto de costos de registros y correo. El borrador requiere su revisión, los datos biográficos necesarios y firmas; no garantiza el resultado."
  ] : [
    `${fullName}; ${m.courtName}; case ${m.caseNumber}. Whole Massachusetts record administrative sealing request under section 100A, not expungement or a per-case court petition. The case reference identifies one entry only; all entries must be considered.`,
    "LegalEase prepares the official Commissioner of Probation form and selects the applicable adult request and adult affidavit. We do not sign for you or complete an official decision. The juvenile section 100B choice is not selected.",
    "Review the request and sign both the request and the adult affidavit under penalties of perjury. Complete any additional biographical information the office requires; unknown values remain blank. This flow does not ask you to submit a Social Security number. Do not write below the official-use line.",
    "Misdemeanors use three years and felonies seven years from their own latest relevant events, including custody. Eligible sex offenses require 15 years or the longer registration duty; an classification as level 2 or level 3 at any time prevents sealing sex offenses. The firearm/public-integrity exclusions and separate history/custody conditions also apply.",
    "Submit to the Commissioner of Probation, One Ashburton Place, Room 405, Boston, MA 02108, after confirming current instructions. No proposed court order or prosecutor service is added. Before filing, obtain your own CORI from DCJIS to identify the controlling entries; obtain dockets if needed. LegalEase does not collect or inspect your CORI and does not claim it is attached.",
    "The public request is free and does not require buying LegalEase. Any optional software charge is separate from record and mailing costs. The draft requires your review, necessary remaining biographical information and signatures; it does not guarantee an outcome."
  ];
  const paragraphs = adultParagraphs;
  let y = 742;
  instructions.drawText(title, { x: 48, y, size: 14, font, color: rgb(0, 0, 0) }); y -= 30;
  for (const paragraph of paragraphs) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, 10) > 516 && line) { instructions.drawText(line, { x: 48, y, size: 10, font }); y -= 15; line = word; }
      else line = candidate;
      if (y < 68) throw new Error("Massachusetts100B: instruction overflow");
    }
    instructions.drawText(line, { x: 48, y, size: 10, font }); y -= 26;
  }
  const fullPacket = Buffer.from(await pdf.save({ useObjectStreams: false }));
  return { fullPacket, officialRequest: official, checksums: { fullPacket: hash(fullPacket), officialRequest: hash(official) },
    frozenInputSha256: hash(JSON.stringify(m)), filingReady: false as const, verificationLevel: "LOCAL_GENERATED" as const,
    manifest: [{ documentId: "official_100A_request_and_affidavit", pages: [1], recipient: "Commissioner of Probation", sourceSha256: MASSACHUSETTS_SEALING_FORM_SHA256,
      manualCompletion: [`Participant request and100A affidavit signatures`, "Unprovided biographical fields as actually required by recipient"], officialFindingsWritten: false },
    { documentId: `participant_instructions_${locale}`, pages: [2], participantOnly: true }] };
}
