import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import fieldMap from "../../../data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/production-field-map.json";
import { oregonDispositionConfigurationSourceMatches } from "@/lib/rcap-engine/composed-route-selector";
import { OR_DISPOSITION_CONFIGURATIONS, OR_DISPOSITION_SOURCE, oregonDispositionIdentity } from "@/lib/rcap-engine/oregon-disposition-identity";
import { OR_CONTACT_IDS, oregonContactKnownText as known } from "@/lib/expungement-ai/oregon-disposition-contact-answer";
export { OR_CONTACT_IDS } from "@/lib/expungement-ai/oregon-disposition-contact-answer";

/** GA15 Q-f7d146243ddbc9e69709: explicit facts for existing destinations.
 * The shared OJD source does not merge the three legal configurations. These
 * controls install neither the family nor its completed fixture artifacts. */
export const OR_CONTACT_SOURCE = {
  mapPath: "data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/production-field-map.json",
  mapSha256: "21bf83cc2f2b00ae193a5127a217ffe8bf2fb2a27d68d4f203364559146ae4f7",
  mapCanonicalSha256: "d77e62857858d3fb813dd58772ca293a44b2304c77c12ace9638e943f24a3da6",
  ojdSourceSha256: "b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071",
  ospSourceSha256: "a523a9ffc3eb0cc35d89e1c81df8eafcd703cf1ffdb4237a0106b72e1e793ac6",
  authorityFingerprint: "4de3e6f42cc1a5ec00f213a3721a714e3853a464285699319a82ddb8be223f39"
} as const;
export function oregonContactContract(profile: { jurisdiction: { code: string }; profileVersion: string; source?: { sourceCorpusSha256?: string } }, pathwayId: string | null, map: unknown = fieldMap) {
  return profile.jurisdiction.code === "OR"
    && Object.values(OR_DISPOSITION_CONFIGURATIONS).some(c => c.pathwayId === pathwayId)
    && oregonDispositionConfigurationSourceMatches(profile.profileVersion, profile.source?.sourceCorpusSha256)
    && contactRepresentationHash(map) === OR_CONTACT_SOURCE.mapCanonicalSha256;
}
const text = (id: string, prompt: string, helperText: string, es: string, esHelper: string): ProfileQuestion => ({
  id, prompt, helperText, type: "text_or_unknown", stage: "packet_information", required: false,
  contextOnly: false, lifecyclePhase: "postpay_official_form_field", options: null,
  translations: { es: { prompt: es, helperText: esHelper } }
});
const choices = [
  ["same", "Use the same address entered for the court form", "Usar la misma dirección ingresada para el formulario judicial"],
  ["different", "Use a different address for the OSP request", "Usar otra dirección para la solicitud a OSP"],
  ["not_preparing", "I am not preparing this separate request now", "No estoy preparando esta solicitud por separado ahora"],
  ["unknown", "I am not sure", "No estoy seguro"]
];
const QUESTIONS: ProfileQuestion[] = [
  text(OR_CONTACT_IDS[0], "What mailing street address should appear on your Oregon court form?",
    "Optional preparation: enter the address you choose for the OJD Motion and Declaration. This is not residence history, the court's address or the prosecutor's service address. Do not invent a missing address.",
    "¿Qué dirección postal debe aparecer en su formulario judicial de Oregon?",
    "Preparación opcional: ingrese la dirección que elija para la Moción y Declaración de OJD. No es el historial de residencia, la dirección del tribunal ni la dirección para notificar a la fiscalía. No invente una dirección que falte."),
  text(OR_CONTACT_IDS[1], "What city, state and ZIP code go with that court-form mailing address?",
    "Enter these address parts as they should appear. They do not establish the county or court where the case belongs.",
    "¿Qué ciudad, estado y código postal corresponden a esa dirección postal del formulario judicial?",
    "Ingrese estos datos de la dirección tal como deben aparecer. No establecen el condado ni el tribunal al que corresponde el caso."),
  text(OR_CONTACT_IDS[2], "What email address, if any, do you choose to put on the Oregon court form?",
    "Optional. The form has an Email line. Your account email and earlier contact answer are not copied. This answer does not complete service on the prosecutor or another party.",
    "¿Qué correo electrónico, si alguno, elige incluir en el formulario judicial de Oregon?",
    "Es opcional. El formulario tiene una línea para el correo electrónico. No se copia el correo de su cuenta ni una respuesta anterior de contacto. Esta respuesta no completa la notificación a la fiscalía ni a otra parte."),
  { id: OR_CONTACT_IDS[3], stage: "packet_information", type: "single_choice", required: false, contextOnly: false,
    lifecyclePhase: "postpay_official_form_field", prompt: "Which mailing address do you choose for the separate Oregon State Police request?",
    helperText: "OSP's criminal-history request is a separate agency document, not part of the court filing. Choose reuse only if you want its mailing-address field to use the two court-address answers above. This does not decide whether or when an OSP step applies.",
    options: choices.map(([value]) => value), optionDisplay: Object.fromEntries(choices.map(([value, label, es]) => [value, { label, translations: { es: { label: es } } }])),
    translations: { es: { prompt: "¿Qué dirección postal elige para la solicitud por separado a la Policía Estatal de Oregon?",
      helperText: "La solicitud de antecedentes de OSP es un documento de una agencia por separado, no parte de la presentación judicial. Elija reutilizar la dirección solo si quiere usar las dos respuestas de dirección anteriores en ese campo. Esto no determina si corresponde un trámite ante OSP ni cuándo." } } },
  text(OR_CONTACT_IDS[4], "What different mailing street address should appear on the OSP request?",
    "Use the mailing address you choose for this separate agency request. Do not enter the prosecutor's service address.",
    "¿Qué otra dirección postal debe aparecer en la solicitud a OSP?",
    "Use la dirección postal que elija para esta solicitud a la agencia por separado. No ingrese la dirección para notificar a la fiscalía."),
  text(OR_CONTACT_IDS[5], "What city, state and ZIP code go with that OSP mailing address?",
    "These parts are combined with the OSP street address in its single mailing-address field.",
    "¿Qué ciudad, estado y código postal corresponden a esa dirección postal para OSP?",
    "Estos datos se combinan con la dirección postal para OSP en su único campo de dirección postal.")
];
export function oregonContactConflictingIds(maps: readonly Readonly<Record<string, unknown>>[]): string[] {
  return OR_CONTACT_IDS.filter(id => {
    const raw = maps.filter(map => Object.hasOwn(map, id)).map(map => map[id]);
    if (raw.length < 2) return false;
    const first = known(raw[0]);
    return !raw.every(value => first !== null ? known(value) === first
      : contactRepresentationHash(value) === contactRepresentationHash(raw[0]));
  });
}
export function oregonContactQuestions(answers: Readonly<Record<string, unknown>>, includeInactive = false, conflictingIds: readonly string[] = []): ProfileQuestion[] {
  const undisputed = Object.fromEntries(Object.entries(answers).filter(([id]) => !conflictingIds.includes(id)));
  const differentAddressIds: readonly string[] = OR_CONTACT_IDS.slice(4);
  return QUESTIONS.filter(q => includeInactive || !differentAddressIds.includes(q.id)
    || undisputed.or_osp_address_choice === "different").map(original => {
    const question = structuredClone(original);
    if (question.id === "or_osp_address_choice") {
      const address = OR_CONTACT_IDS.slice(0, 2).map(id => known(undisputed[id]));
      if (address.every(value => value !== null)) {
        question.helperText += `\nCourt-form address entered: ${address.join(", ")}`;
        question.translations!.es!.helperText += `\nDirección ingresada para el formulario judicial: ${address.join(", ")}`;
      }
    }
    return question;
  });
}
export function oregonContactInputs(snapshot: {
  jurisdiction: string; pathwayId: string | null; selectedTrackId: string | null;
  profileVersion: string; profileSourceFingerprint: string | null; profileAuthorityFingerprint: string | null;
  screeningAnswers: Record<string, unknown>; prefilledAnswers: Record<string, unknown>; packetAnswers: Record<string, unknown>;
}, map: unknown = fieldMap) {
  if (!oregonContactContract({ jurisdiction: { code: snapshot.jurisdiction }, profileVersion: snapshot.profileVersion,
    source: { sourceCorpusSha256: snapshot.profileSourceFingerprint ?? undefined } }, snapshot.pathwayId, map)
    || snapshot.profileAuthorityFingerprint !== OR_CONTACT_SOURCE.authorityFingerprint) return null;
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  const read = (id: string) => {
    const values = maps.filter(m => Object.hasOwn(m, id)).map(m => known(m[id]));
    return values.length && values.every(v => v !== null && v === values[0]) ? values[0] : null;
  };
  // Contradictory active disposition facts cannot be flattened into permission.
  for (const id of ["case_outcome", "or_disposition_record"]) {
    if (maps.filter(m => Object.hasOwn(m, id)).length && read(id) === null) return null;
  }
  const identity = oregonDispositionIdentity(Object.assign({}, ...maps));
  if (identity.status !== "identified" || identity.configuration.pathwayId !== snapshot.pathwayId
    || identity.configuration.trackId !== snapshot.selectedTrackId) return null;
  const writes = [
    [OR_CONTACT_IDS[0], "p5.r303.2.x72.rule", "participant.street_address"],
    [OR_CONTACT_IDS[1], "p5.r303.2.x72.rule#citystatezip", "participant.city_state_zip"],
    [OR_CONTACT_IDS[2], "p5.r340.8.x72.rule", "participant.email"]
  ].flatMap(([id, field, factId]) => { const value = read(id); return value === null ? [] : [{ document: "OR-OJD-ADULT-SET-ASIDE-PACKET", field, factId, inputIds: [id], value }]; });
  const choice = read(OR_CONTACT_IDS[3]);
  const addressIds = choice === "same" ? OR_CONTACT_IDS.slice(0, 2) : choice === "different" ? OR_CONTACT_IDS.slice(4) : [];
  const address = addressIds.map(read);
  if (address.length === 2 && address.every(v => v !== null)) writes.push({ document: "OR-OSP-SET-ASIDE-CCH",
    field: "Street, City, State, Zip code", factId: "participant.city_state_zip", inputIds: [...addressIds], value: address.join(", ") });
  return { source: OR_CONTACT_SOURCE, configuration: identity.configuration, profileSource: OR_DISPOSITION_SOURCE,
    writes, conflictingIds: oregonContactConflictingIds(maps), separateAgencyAddressChoice: choice, generationAllowed: false as const, deliveryAllowed: false as const, admissionGranted: false as const,
    limitations: ["Phone fields remain the existing participant handbacks.", "Prosecutor service, signatures and actual mailing are not supplied.", "Acquittal retains its own configuration; no dismissed-case artifact is substituted."] };
}
