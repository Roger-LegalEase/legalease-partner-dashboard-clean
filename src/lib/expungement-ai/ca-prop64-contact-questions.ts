import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { CA_CONTACT_CONTRACT, CA_FILER_CONTACT, CA_COURT_CONTACT, caContactContext, parseCaContact, caContactCurrent, caContactKnownText } from "@/lib/expungement-ai/ca-prop64-contact-answer";
export function caProp64ContactQuestions(answers: Readonly<Record<string, unknown>>): ProfileQuestion[] {
  const contactContext = caContactContext(answers);
  return [
    { id: CA_FILER_CONTACT, prompt: "What contact information should appear for the party or attorney filing this request?", helperText: "Use the filing contact details. These are separate from your account and from any person serving papers. You can save incomplete details. Optional fax and email do not give consent to electronic service.",
      translations: { es: { prompt: "¿Qué datos de contacto deben aparecer para la parte o el abogado que presenta esta solicitud?", helperText: "Use los datos de contacto para esta presentación. Son distintos de los datos de su cuenta y de cualquier persona que entregue documentos. Puede guardar datos incompletos. El fax y el correo electrónico opcionales no dan consentimiento para la notificación electrónica." } } },
    { id: CA_COURT_CONTACT, prompt: "What is the address of the court receiving this filing?", helperText: "Use the actual courthouse address for this filing. The county alone does not identify a courthouse. Check whether its mailing address is the same or different.",
      translations: { es: { prompt: "¿Cuál es la dirección del tribunal que recibirá esta presentación?", helperText: "Use la dirección del tribunal correspondiente a esta presentación. El condado por sí solo no identifica el edificio del tribunal. Compruebe si su dirección postal es la misma o una diferente." } } }
  ].map(q => ({ ...q, stage: "packet_information", type: "filing_contact", required: true, contextOnly: false, options: null, answerContract: CA_CONTACT_CONTRACT, contactContext }));
}
/** Only current, explicitly bound declarations become renderer inputs. No
 * source values, signature, service actor or account fields are synthesized. */
export function caProp64ContactFacts(answers: Readonly<Record<string, unknown>>) {
  const context = caContactContext(answers), facts: Record<string, string> = {}, absent: string[] = [], unresolvedOptional: string[] = [];
  const filer = parseCaContact(CA_FILER_CONTACT, answers[CA_FILER_CONTACT]);
  const court = parseCaContact(CA_COURT_CONTACT, answers[CA_COURT_CONTACT]);
  const put = (id: string, value: string) => { if (caContactKnownText(value)) facts[id] = value; };
  if (filer?.kind === "filer" && caContactCurrent(filer, context)) {
    const actor = filer.representation === "attorney" ? "attorney" : "participant";
    for (const [key, value] of Object.entries({ full_legal_name: actor === "attorney" ? filer.attorneyName : context.defendantName,
      street_address: filer.street, city: filer.city, state: filer.state, zip: filer.zip, phone: filer.phone })) put(`${actor}.${key}`, value);
    if (actor === "attorney") { put("attorney.bar_number", filer.barNumber); put("attorney.represented_party", context.defendantName); }
    else facts["participant.represented_party"] = "Self-represented";
    for (const key of ["fax", "email", ...(actor === "attorney" ? ["firm"] : [])] as Array<"fax" | "email" | "firm">) {
      const item = filer[key], id = `${actor}.${key}`;
      if (item.status === "known") put(id, item.value);
      else if (item.status === "absent") absent.push(id);
      else unresolvedOptional.push(id);
    }
  }
  if (court?.kind === "court" && caContactCurrent(court, context)) {
    put("court.street_address", court.street); put("court.city_state_zip", court.cityStateZip);
    if (["same", "distinct"].includes(court.mailingRelationship)) facts["court.mailing_address_relationship"] = court.mailingRelationship;
    if (court.mailingRelationship === "distinct") put("court.mailing_address", court.mailingAddress);
  }
  return { facts, absent, unresolvedOptional };
}
