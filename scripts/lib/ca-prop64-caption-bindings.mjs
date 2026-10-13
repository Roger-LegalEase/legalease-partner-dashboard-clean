// Exact source-caption destinations. The caller supplies structured, held facts;
// this adapter cannot parse legacy contact prose or establish packet authority.
const forms = ["CR-400", "CR-401", "CR-403"];
const captions = Object.fromEntries(forms.map(form => [form,
  `${form}[0].Page1[0].${form === "CR-400" ? "P1Caption" : "Caption"}[0]`]));
const contact = { Name: "full_legal_name", Street: "street_address", City: "city", State: "state", Zip: "zip", Phone: "phone", Fax: "fax", Email: "email" };
const neutral = {
  "CR-400": { "Party[0].Party2[0]": "participant.full_legal_name", "HeaderSub[0].CaseNumber[0].CaseNumber[0]": "matter.case_number" },
  "CR-401": { "TitlePartyName[0].Party2[0]": "participant.full_legal_name", "HeaderSub[0].CaseNumber[0].CaseNumber[0]": "matter.case_number" },
  "CR-403": { "TitlePartyName[0].Defendant[0]": "participant.full_legal_name", "HeaderSub[0].CaseNumber[0].CaseNumber1[0]": "matter.case_number" },
};
export function caProp64HeldText(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (!Object.keys(value).every(key => ["value", "unknown"].includes(key)) || ![false, undefined].includes(value.unknown)) return undefined;
    value = value.value;
  }
  return typeof value === "string" && value.trim() && !/^unknown$/i.test(value.trim()) && !/[\x00-\x1f\x7f]/.test(value) ? value : undefined;
}

export function caProp64CaptionBindings({ familyId, facts }) {
  if (familyId !== "ca-prop64-set") return null;
  const role = caProp64HeldText(facts["filer.representation"]);
  const actor = role === "self_represented" ? "participant" : role === "attorney" ? "attorney" : null;
  const mappings = Object.fromEntries(forms.map(form => [form, {}]));
  const missing = [];
  const bind = (form, field, factId) => {
    if (caProp64HeldText(facts[factId]) !== undefined) mappings[form][field] = factId;
    else missing.push({ formNumber: form, fieldName: field, factId, status: "MISSING_HELD_FACT_APPLICABILITY_REVIEW" });
  };
  for (const form of forms) {
    const prefix = captions[form];
    for (const [field, factId] of Object.entries(neutral[form])) bind(form, `${prefix}.${field}`, factId);
    for (const [field, factId] of Object.entries({ CrtCounty: "matter.county", CrtStreet: "court.street_address", CrtCityZip: "court.city_state_zip" }))
      bind(form, `${prefix}.CourtInfo[0].${field}[0]`, factId);
    // A separate address is used only when its relationship is explicitly held.
    const mailingRelationship = caProp64HeldText(facts["court.mailing_address_relationship"]);
    if (mailingRelationship === "distinct")
      bind(form, `${prefix}.CourtInfo[0].CrtMailingAdd[0]`, "court.mailing_address");
    else if (mailingRelationship !== "same") missing.push({ formNumber: form,
      fieldName: `${prefix}.CourtInfo[0].CrtMailingAdd[0]`, factId: "court.mailing_address_relationship", status: "UNRESOLVED_ADDRESS_RELATIONSHIP" });
    for (const [field, component] of Object.entries(contact)) {
      const name = `${prefix}.AttyPartyInfo[0].${field}[0]`;
      if (actor) bind(form, name, `${actor}.${component}`);
      else missing.push({ formNumber: form, fieldName: name, factId: "filer.representation", status: "UNRESOLVED_FILER_ACTOR" });
    }
    if (actor === "attorney") {
      for (const [field, component] of Object.entries({ AttyBarNo: "bar_number", AttyFirm: "firm", AttyFor: "represented_party" }))
        bind(form, `${prefix}.AttyPartyInfo[0].${field}[0]`, `attorney.${component}`);
    }
  }
  bind("CR-403", "CR-403[0].Page2[0].P2Header_sf[0].Defendant[0]", "participant.full_legal_name");
  bind("CR-403", "CR-403[0].Page2[0].P2Header_sf[0].CaseNumber1[0]", "matter.case_number");
  return { mappings, missing, actor, facts: Object.fromEntries(Object.entries(facts)
    .map(([key, value]) => [key, caProp64HeldText(value)]).filter(([, value]) => value !== undefined)),
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0 };
}
