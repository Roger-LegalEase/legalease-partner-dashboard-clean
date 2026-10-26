import { questionAnswerState, sameKnownQuestionAnswer } from "@/lib/expungement-ai/question-answer-state";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { CA_SAFE_AT_HOME_ID, CA_CONTACT_CONTRACT, CA_FILER_CONTACT, CA_COURT_CONTACT, caContactContext, parseCaContact, caContactCurrent, caContactKnownText, caContactPhoneText } from "@/lib/expungement-ai/ca-prop64-contact-answer";
export const CA_SAFE_AT_HOME_COPY = {"en": {"prompt": "Are you enrolled in California's Safe at Home address confidentiality program?", "helperYes": "Use the substitute mailing address designated by Safe at Home for these forms. Do not enter your confidential home address. California courts generally must accept the designated address, subject to the applicable legal exceptions. This service does not verify your enrollment. If the court raises a question about your address, contact the Safe at Home program and the court clerk for the applicable instructions.", "helperNotSure": "If you are not sure, check with the Safe at Home program before you file. Until then, do not enter a home address you need to keep confidential."}, "es": {"prompt": "¿Está inscrito en Safe at Home, el programa de confidencialidad de direcciones de California?", "helperYes": "Use en estos formularios la dirección postal sustituta que le haya asignado Safe at Home. No ingrese su domicilio confidencial. Por regla general, los tribunales de California deben aceptar la dirección designada, salvo las excepciones legales aplicables. Este servicio no verifica su inscripción. Si el tribunal tiene alguna duda sobre su dirección, consulte al programa Safe at Home y a la secretaría del tribunal para obtener las instrucciones aplicables.", "helperNotSure": "Si no está seguro, consulte al programa Safe at Home antes de presentar los documentos. Mientras tanto, no ingrese un domicilio que necesite mantener confidencial."}, "options": ["Yes", "No", "I am not sure"], "spanishLabels": {"Yes": "Sí", "No": "No", "I am not sure": "No estoy seguro"}} as const;
export function caSafeAtHomeQuestion(answers: Readonly<Record<string, unknown>>): ProfileQuestion {
  const question: ProfileQuestion = { id: CA_SAFE_AT_HOME_ID, stage: "packet_information", type: "yes_no_unsure", required: false, contextOnly: false,
    lifecyclePhase: "optional_or_later", prompt: CA_SAFE_AT_HOME_COPY.en.prompt, options: [...CA_SAFE_AT_HOME_COPY.options],
    optionDisplay: Object.fromEntries(CA_SAFE_AT_HOME_COPY.options.map(value => [value, { label: value, translations: { es: { label: CA_SAFE_AT_HOME_COPY.spanishLabels[value] } } }])),
    translations: { es: { prompt: CA_SAFE_AT_HOME_COPY.es.prompt } } };
  const helper = caContactContext(answers).representation !== "attorney" && sameKnownQuestionAnswer(question, answers[CA_SAFE_AT_HOME_ID], "Yes") ? "helperYes" : questionAnswerState(question, answers[CA_SAFE_AT_HOME_ID]) === "uncertain" ? "helperNotSure" : null;
  return helper ? { ...question, helperText: CA_SAFE_AT_HOME_COPY.en[helper], translations: { es: { prompt: CA_SAFE_AT_HOME_COPY.es.prompt, helperText: CA_SAFE_AT_HOME_COPY.es[helper] } } } : question;
}
export function caProp64ContactQuestions(answers: Readonly<Record<string, unknown>>, privacyQuestionVisible = false): ProfileQuestion[] {
  const contactContext = caContactContext(answers), privacy = caSafeAtHomeQuestion(answers);
  return [
    { id: CA_FILER_CONTACT, prompt: "What contact information should appear for the party or attorney filing this request?", helperText: "Use the filing contact details. These are separate from your account and from any person serving papers. You can save incomplete details. Optional fax and email do not give consent to electronic service.",
      translations: { es: { prompt: "¿Qué datos de contacto deben aparecer para la parte o el abogado que presenta esta solicitud?", helperText: "Use los datos de contacto para esta presentación. Son distintos de los datos de su cuenta y de cualquier persona que entregue documentos. Puede guardar datos incompletos. El fax y el correo electrónico opcionales no dan consentimiento para la notificación electrónica." } } },
    { id: CA_COURT_CONTACT, prompt: "What is the address of the court receiving this filing?", helperText: "Use the actual courthouse address for this filing. The county alone does not identify a courthouse. Check whether its mailing address is the same or different.",
      translations: { es: { prompt: "¿Cuál es la dirección del tribunal que recibirá esta presentación?", helperText: "Use la dirección del tribunal correspondiente a esta presentación. El condado por sí solo no identifica el edificio del tribunal. Compruebe si su dirección postal es la misma o una diferente." } } }
  ].map(q => ({ ...q, ...(q.id === CA_FILER_CONTACT && privacy.helperText && !privacyQuestionVisible ? {
    helperText: `${q.helperText} ${privacy.helperText}`,
    translations: { es: { prompt: q.translations.es.prompt, helperText: `${q.translations.es.helperText} ${privacy.translations!.es!.helperText}` } }
  } : {}), stage: "packet_information", type: "filing_contact", required: true, contextOnly: false, options: null, answerContract: CA_CONTACT_CONTRACT, contactContext }));
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
    const addressReady = !context.safeAtHome || [filer.street, filer.city, filer.state, filer.zip].every(caContactKnownText);
    for (const [key, value] of Object.entries({ full_legal_name: actor === "attorney" ? filer.attorneyName : context.defendantName,
      ...(addressReady ? { street_address: filer.street, city: filer.city, state: filer.state, zip: filer.zip } : {}) })) put(`${actor}.${key}`, value);
    if (typeof filer.phone === "string") put(`${actor}.phone`, filer.phone);
    else if (filer.phone.status === "absent") { facts[`${actor}.phone`] = "None"; absent.push(`${actor}.phone`); }
    else if (filer.phone.status === "known" && caContactPhoneText(filer.phone.value)) put(`${actor}.phone`, filer.phone.value);
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
