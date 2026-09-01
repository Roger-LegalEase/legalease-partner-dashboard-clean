#!/usr/bin/env node
/**
 * The North Dakota deferred-imposition records packet family builder.
 *
 *   node scripts/build-census-v1-nd-deferred-imposition-records-set.mjs [--check]
 *
 * One census-v1 family, two alternative units, strategy custom_pleading:
 *
 *   nd_deferred_verify_automatic_seal   N.D.R.Crim.P. 32.1 makes it a MANDATORY
 *       TERM of every order deferring imposition of sentence that, sixty-one
 *       days after probation expires or terminates, the guilty plea is
 *       withdrawn or the verdict set aside, the case is dismissed and the file
 *       is sealed. Nothing is filed: the court acts under a term of its own
 *       order — process guidance and verification only.
 *
 *   nd_deferred_dismissal_motion   Where the automatic term did not operate —
 *       a deferral order predating the Rule 32.1 regime, or a clerk's file
 *       showing the term was not carried out — the defendant may move under
 *       N.D.C.C. § 12.1-32-07.1, which also permits the court, on the
 *       defendant's application, to reduce a felony to a misdemeanor before
 *       dismissing. No official form exists.
 *
 * The family's own legal-design record — data/record-clearing/legal-design-intake/
 * ND.memo.json, track nd-deferred-imposition-records — models the two units as
 * alternatives selected by whether the automatic term operated, and resolves
 * the motion unit to custom_pleading, which is what this build renders.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform writes only the participant's identity and contact facts on the
 * motion. Every case fact — county, case number, the deferral order's date,
 * the probation end date, the offence level — is a labelled dotted blank
 * declared REQUIRED_BEFORE_FILING and disclosed in participant-instructions.md
 * with the clerk of court of the sentencing court named as the checkable
 * authority. The felony-reduction application is the participant's own mark.
 * No signature is ever written, no fee is stated because none is identified in
 * the record, and the legal-effect page states plainly what the seal is NOT:
 * a deferred disposition remains pleadable under N.D.C.C. § 12.1-32-02(4) and
 * counts as a conviction for firearm purposes under § 62.1-02-01(2).
 */
import {
  mapHelpers, composedMapOf, runIfMain, DOTS
} from "./rcap-custom-pleading/composed-family-host.mjs";

const FAMILY_ID = "nd-deferred-imposition-records-set";
const OUT = "data/rcap-all50/overlays/census-v1/nd/nd-deferred-imposition-records-set--custom-pleading";

const ROUTE = Object.freeze({
  routeKeys: [
    "obligation:unit:ND:nd-deferred-imposition-records:nd_deferred_dismissal_motion",
    "obligation:unit:ND:nd-deferred-imposition-records:nd_deferred_verify_automatic_seal"
  ],
  legalName: "Deferred Imposition of Sentence: Automatic Withdrawal, Dismissal and Sealing, and the Fallback Motion (N.D.R.Crim.P. 32.1; N.D.C.C. §§ 12.1-32-07.1, 12.1-32-07.2)",
  routeName: "clearing a North Dakota case where the court deferred imposition of sentence — verifying the automatic sixty-one-day withdrawal, dismissal and sealing, or moving under N.D.C.C. § 12.1-32-07.1 where the automatic term did not operate",
  statutes: ["N.D.R.Crim.P. 32.1", "N.D.C.C. § 12.1-32-07.1", "N.D.C.C. § 12.1-32-07.2", "N.D.C.C. § 12.1-32-02(4)", "N.D.C.C. § 62.1-02-01(2)"]
});

const COMPONENTS = [
  { id: "verification_instructions", role: "verification_instructions", title: "Verifying the Automatic Withdrawal, Dismissal and Sealing" },
  {
    id: "primary_filing", role: "primary_filing", title: "Motion Under N.D.C.C. Sec. 12.1-32-07.1 for Withdrawal of Plea, Dismissal and Sealing",
    condition: "Filed only on the motion unit, where the automatic sixty-one-day term of N.D.R.Crim.P. 32.1 did not operate - a deferral order predating the rule's regime for the offence level, or a clerk's file showing the term was not carried out. Where the final order already exists, nothing is filed."
  },
  { id: "legal_effect_explanation", role: "legal_effect_explanation", title: "What This Seal Is, and What It Is Not" }
];

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Erik Haldor Bjornstad",
    "participant.date_of_birth": "1992-03-27",
    "participant.street_address": "1409 Prairie Rose Lane, Bismarck, ND 58501",
    "participant.phone": "701-555-0134",
    "participant.email": "erik.bjornstad@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Wilhelmina-Astrid Gustafsson-Featherington",
    "participant.date_of_birth": "1964-12-31",
    "participant.street_address": "8830 Northwest Missouri River Breaks Township Road 141-A, Rural Route 3, Williston, North Dakota 58801-7742",
    "participant.phone": "(701) 555-0198 ext. 2204",
    "participant.email": "wilhelmina.astrid.gustafsson.featherington@longmailexample.org"
  }
};

/* ---- composed bodies ------------------------------------------------------------ *
 * Everything below is traceable to the family's committed records, named inline:
 *   [MEMO]     data/record-clearing/legal-design-intake/ND.memo.json,
 *              track nd-deferred-imposition-records
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json,
 *              nd-deferred-imposition-records-set
 */
function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const component = COMPONENTS.find((c) => c.id === componentId);
  const L = [];
  L.push(component.title.toUpperCase(), "");
  if (componentId === "verification_instructions") {
    L.push(`Prepared for: ${name}`, "");
    L.push("THE RULE. N.D.R.Crim.P. 32.1 makes it a mandatory term of every order deferring imposition of sentence that, sixty-one days after probation expires or terminates, the guilty plea is withdrawn or the verdict of guilt set aside, the case is dismissed and the file is sealed. Since the amendment effective 1 March 2019 the rule applies in all cases, not only misdemeanors and infractions. On this unit NOTHING IS FILED, because the court acts under a term of its own order.", "");
    L.push("VERIFY, IN ORDER, FROM THE RECORD - nothing can be said about your status until you hold the papers:", "");
    L.push("STEP ONE. Obtain the ORDER DEFERRING IMPOSITION OF SENTENCE from the clerk of court of the sentencing court. Its date decides which version of Rule 32.1 applies: before 1 March 2019 the rule reached only misdemeanor and infraction cases, so a pre-2019 felony deferral may never have carried the term at all - that is a recorded open question, and it decides which unit of this packet is yours.");
    L.push("STEP TWO. Obtain the PROBATION DISCHARGE or final discharge from supervision, from the clerk of court or from the Department of Corrections and Rehabilitation Parole and Probation. It fixes the date the sixty-one days run from.");
    L.push("STEP THREE. Confirm from the clerk's file that NO PETITION FOR REVOCATION was filed within sixty days of probation ending, and that NO BENCH WARRANT is outstanding in the case. Either one keeps the automatic term from operating on schedule.");
    L.push("STEP FOUR. Ask the clerk for the FINAL ORDER withdrawing the plea, setting aside the verdict and dismissing the case. Until you have it, nothing can be said about whether the automatic term operated.", "");
    L.push("WHAT THE ANSWERS MEAN:");
    L.push("- You hold the final order: the term operated. Nothing is filed. Read the legal-effect page of this packet before assuming what the seal does.");
    L.push("- No final order, probation ended more than sixty-one days ago, no revocation petition and no bench warrant: the automatic term may not have been carried out, and the motion unit of this packet is the fallback. Ask the clerk for an explanation first.");
    L.push("- No final order and no explanation from the clerk: stop and get help before filing anything.", "");
    L.push("MONEY. No fee is identified for either unit in the family's own record; nothing here states one.");
  } else if (componentId === "primary_filing") {
    L.push("FILE THIS MOTION ONLY IF the automatic sixty-one-day term of N.D.R.Crim.P. 32.1 did not operate in your case - because the deferral order predates the rule's regime for your offence level, or because the clerk's file shows the term was not carried out. If the final order withdrawing the plea and dismissing the case already exists, do not file this; there is nothing to ask for.", "");
    L.push("IN THE DISTRICT COURT OF .......................................... COUNTY, NORTH DAKOTA");
    L.push("(the county of the sentencing court that deferred imposition)", "");
    L.push("STATE OF NORTH DAKOTA,");
    L.push("Plaintiff,");
    L.push("v.");
    L.push(`${name},`);
    L.push("Defendant.", "");
    L.push("Case No. " + DOTS(44));
    L.push("(the existing criminal case number, from the deferral order)", "");
    L.push("MOTION UNDER N.D.C.C. Sec. 12.1-32-07.1 FOR WITHDRAWAL OF PLEA OR SETTING ASIDE OF VERDICT, DISMISSAL, AND SEALING", "");
    L.push(`The defendant, ${name}, moves the Court in the existing criminal case, under N.D.C.C. Sec. 12.1-32-07.1, and states:`, "");
    L.push("FIRST. The Court entered an order deferring imposition of sentence in this case on the following date, shown by the deferral order:");
    L.push(DOTS(), "");
    L.push("SECOND. The defendant's probation expired or terminated on the following date, shown by the discharge record:");
    L.push(DOTS(), "");
    L.push("THIRD. More than sixty-one days have passed since probation expired or terminated; the clerk's file shows no petition for revocation filed within sixty days of that date and no outstanding bench warrant in this case; and the file does not show that the withdrawal, dismissal and sealing which N.D.R.Crim.P. 32.1 makes a mandatory term of a deferral order have been carried out.", "");
    L.push("FOURTH. The offence was of the following level - felony, misdemeanor or infraction - as the deferral order states it:");
    L.push(DOTS(), "");
    L.push("FIFTH. Mark the following ONLY where the offence was a felony and you ask for the reduction; it is your own application and nothing is marked for you:");
    L.push("[  ]  The defendant applies, under N.D.C.C. Sec. 12.1-32-07.1, for reduction of the felony to a misdemeanor before dismissal.", "");
    L.push("THEREFORE the defendant asks the Court to allow withdrawal of the plea of guilty or set aside the verdict of guilt, to dismiss the information or indictment, to seal the file as provided for a deferred imposition of sentence, and - where the reduction is applied for above - to reduce the felony to a misdemeanor before dismissal.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF DEFENDANT " + DOTS(38), "");
    L.push("(The defendant signs and dates this motion personally. Nothing on this page is signed or dated for the defendant. No notarization is required by the record.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else {
    L.push(`Prepared for: ${name}`, "");
    L.push("READ THIS PAGE WHETHER OR NOT ANYTHING IS FILED. The seal that follows a deferred imposition of sentence is narrower than people expect, and expecting more from it is a recorded reason to stop and get advice.", "");
    L.push("WHAT THE SEAL IS. Sealing here is the restricted-access regime of N.D.C.C. Sec. 12.1-32-07.2(2): the records and papers may be examined only by the persons that subsection enumerates, and by others upon written order of a judge. It restricts access; it is not a disclosure prohibition, and it is narrower than Chapter 12-60.1 sealing.", "");
    L.push("WHAT THE SEAL IS NOT:");
    L.push("- IT IS NOT A CLEAN SLATE IN A LATER PROSECUTION. Under N.D.C.C. Sec. 12.1-32-02(4), in any subsequent prosecution for any other offence, the prior conviction for which imposition of sentence was deferred may be pleaded and proved, and has the same effect as if probation had not been granted or the information or indictment dismissed.");
    L.push("- IT DOES NOT LIFT THE FIREARM DISABILITY. Under N.D.C.C. Sec. 62.1-02-01(2) the deferred disposition still counts as a conviction for firearm-disability purposes.");
    L.push("- IT DOES NOT END A REGISTRATION CONSEQUENCE. A registration consequence under N.D.C.C. Sec. 12.1-32-15 survives dismissal.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
    L.push("Stop, and take this packet to a lawyer or a legal-aid office, if any of these is true:");
    L.push("- your deferred status is unclear from the record;");
    L.push("- there is no final order and no explanation from the clerk of court;");
    L.push("- a registration consequence survives dismissal in your case;");
    L.push("- a firearm consequence matters to you - the disability survives dismissal;");
    L.push("- a petition for revocation was filed, or a bench warrant is outstanding;");
    L.push("- you expected the deferred disposition to be invisible in a later prosecution, which N.D.C.C. Sec. 12.1-32-02(4) forecloses.", "");
    L.push("WHAT THIS PACKET IS NOT", "");
    L.push("This is a verification walkthrough, a fallback motion and this explanation. It is not legal advice, it is not filed for you, and it does not decide whether the automatic term operated in your case - the clerk's file decides that.");
  }
  L.push("", `Route: ${ROUTE.routeKeys[0]}`);
  return L.join("\n");
}

/* ---- the field maps -------------------------------------------------------------- */
function maps() {
  const out = [];
  {
    const h = mapHelpers("verification_instructions");
    out.push(composedMapOf("verification_instructions", FAMILY,
      [h.write("participant_name", "Participant named on the verification walkthrough", "participant.full_legal_name")], []));
  }
  {
    const h = mapHelpers("primary_filing");
    const writes = [
      h.write("defendant_name", "Defendant named in the caption of this motion", "participant.full_legal_name"),
      h.write("mailing_address", "Mailing address of the defendant in the contact block at the foot of the motion", "participant.street_address"),
      h.write("telephone", "Telephone number of the defendant in the contact block at the foot of the motion", "participant.phone"),
      h.write("email", "Email address of the defendant in the contact block at the foot of the motion", "participant.email")
    ];
    const refusals = [
      h.rbf("sentencing_county", "County of the sentencing court, named in the caption of the motion",
        "which North Dakota county's district court deferred imposition - it is on the deferral order, and the clerk of court of the sentencing court can confirm it",
        "the sentencing court is a case fact the participant establishes from the deferral order"),
      h.rbf("case_number", "Case number of the existing criminal case, from the deferral order",
        "the existing criminal case number, copied from the deferral order - the motion is filed in the existing case, not as a new one",
        "no case identifier is held for this record"),
      h.rbf("deferral_order_date", "Date the court entered the order deferring imposition of sentence",
        "the date of the deferral order, checked against the order itself - its date decides which version of Rule 32.1 applies, and a pre-2019 felony deferral is a reason to stop and get advice",
        "no order fact is held for this record, and the order's date decides which unit of the packet applies"),
      h.rbf("probation_end_date", "Date the defendant's probation expired or terminated, from the discharge record",
        "the date probation expired or terminated, checked against the probation discharge record - it fixes the date the sixty-one days run from",
        "no supervision fact is held for this record"),
      h.rbf("offense_level_statement", "Level of the offence - felony, misdemeanor or infraction - as the deferral order states it",
        "the offence level, copied from the deferral order; it decides whether the felony-reduction application can apply",
        "no offence fact is held for this record"),
      h.electionBox("felony_reduction_application", "[  ] The defendant applies for reduction of the felony to a misdemeanor before dismissal (mark only where the offence was a felony and you ask for it)",
        "the reduction is available on the defendant's own application under N.D.C.C. Sec. 12.1-32-07.1; whether to apply is the participant's own choice and the route does not determine it"),
      h.protectedBlank("defendant_signature", "Signature of the defendant on the motion",
        "the defendant signs the motion personally; nothing is signed on the verification unit"),
      h.protectedBlank("signature_date", "Date beside the defendant's signature on the motion",
        "a date written before the motion is signed would be false")
    ];
    out.push(composedMapOf("primary_filing", FAMILY, writes, refusals));
  }
  {
    const h = mapHelpers("legal_effect_explanation");
    out.push(composedMapOf("legal_effect_explanation", FAMILY,
      [h.write("participant_name", "Participant named on the legal-effect page", "participant.full_legal_name")], []));
  }
  return out;
}

/* ---- participant instructions ----------------------------------------------------- */
function participantInstructions(rbf) {
  const titles = Object.fromEntries(COMPONENTS.map((c) => [c.id, c.title]));
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("This packet carries two alternatives and at most one applies, selected by whether the automatic term operated. On the **verification unit** nothing is filed: N.D.R.Crim.P. 32.1 makes the withdrawal, dismissal and sealing a mandatory term of the court's own deferral order, effective sixty-one days after probation expires or terminates. On the **motion unit** — where the automatic term did not operate — you file the composed motion under N.D.C.C. § 12.1-32-07.1 in the existing criminal case. No official form exists for that motion.", "");
  out.push("The platform filled in what it holds about you: your name, your mailing address, your telephone number and your email. Every case fact is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `verification_instructions` | how to confirm, from the clerk's file, whether the automatic sixty-one-day term operated |");
  out.push("| `primary_filing` | the composed § 12.1-32-07.1 motion — **conditional**: filed only where the automatic term did not operate |");
  out.push("| `legal_effect_explanation` | what the § 12.1-32-07.2(2) seal is, and what it is not |");
  out.push("");

  out.push("## Documents you must obtain first", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| The final order withdrawing the plea, setting aside the verdict and dismissing the case — until you have it (or the clerk explains why there is none), nothing can be said about whether the automatic term operated; check your answer about the final order against it | clerk of court of the sentencing court |");
  out.push("| The order deferring imposition of sentence — its date decides which version of Rule 32.1 applies; check the deferral date you write against it | clerk of court of the sentencing court |");
  out.push("| The probation discharge or final discharge from supervision — it fixes the date the sixty-one days run from; check the probation end date you write against it | clerk of court, or Department of Corrections and Rehabilitation Parole and Probation |");
  out.push("");

  out.push("## The items you must supply on the motion", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one from the records — only on the motion unit; nothing is completed or filed on the verification unit.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${titles[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and the date beside it.** The motion is yours alone; nothing is signed on the verification unit.");
  out.push("- **The felony-reduction mark.** The reduction is available on your own application; whether to apply is your choice.");
  out.push("- **The court's dismissal order.** It is not in the packet: on the verification unit the court acts under the mandatory term of its own order.");
  out.push("- **Any fee figure.** No fee is identified for either unit in the family's own record; the clerk of court of the sentencing court can confirm whether that court expects one.", "");

  out.push("## When to stop and get help instead of filing", "");
  out.push("- your deferred status is unclear from the record;");
  out.push("- there is no final order and no explanation from the clerk;");
  out.push("- a registration consequence survives dismissal in your case;");
  out.push("- a firearm consequence matters to you — the disability survives dismissal;");
  out.push("- a petition for revocation was filed, or a bench warrant is outstanding;");
  out.push("- you expected the deferred disposition to be invisible in a later prosecution, which N.D.C.C. § 12.1-32-02(4) forecloses;");
  out.push("- the deferral order is a pre-March-2019 felony order — whether it ever carried the sixty-one-day term is a recorded open question.", "");

  out.push("## What this packet is not", "");
  out.push("A verification walkthrough, a fallback motion and a legal-effect explanation — not legal advice, not filed for you, and no decision about whether the automatic term operated in your case. The clerk's file decides that.", "");
  out.push(`_Routes: ${ROUTE.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

const FAMILY = {
  familyId: FAMILY_ID,
  outDir: OUT,
  buildScript: "scripts/build-census-v1-nd-deferred-imposition-records-set.mjs",
  jurisdiction: "ND",
  route: ROUTE,
  components: COMPONENTS,
  composedFrom:
    "the legal-design intake record (data/record-clearing/legal-design-intake/ND.memo.json, track "
    + "nd-deferred-imposition-records, composition mode 'alternative' over two units) and the packet-set manifest "
    + "(data/record-clearing/legal-design-packet-set-manifests.json, nd-deferred-imposition-records-set)",
  compositionSources: [
    "data/record-clearing/legal-design-intake/ND.memo.json",
    "data/record-clearing/legal-design-packet-set-manifests.json"
  ],
  composedBody,
  maps,
  fixtures: FIXTURES,
  participantInstructions,
  formIdentityNote:
    "No official North Dakota form exists for a motion under N.D.C.C. § 12.1-32-07.1, and the verification unit "
    + "files nothing at all because N.D.R.Crim.P. 32.1 makes the withdrawal, dismissal and sealing a mandatory "
    + "term of the court's own deferral order. The MASTER_QUEUE row binds no source (sourceStatus "
    + "CUSTOM_PLEADING_FROM_CODIFIED_TEXT) and the legal-design record resolves the motion unit to custom_pleading.",
  routeSelectionNote:
    "The two units are alternatives selected by whether the automatic term operated — a fact that lives in the "
    + "clerk's file, so neither unit is selected for the participant and the motion's own face carries its "
    + "condition. The felony-to-misdemeanor reduction is available on the defendant's own application under "
    + "§ 12.1-32-07.1, so it is the participant's own mark and never route-determined.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "that the automatic sixty-one-day term operated, or failed to operate, in any particular case",
    "whether a deferral order entered before 1 March 2019 on a felony ever carried the sixty-one-day seal term — a recorded open question",
    "any filing fee, since none is identified in the family's own record"
  ],
  buildFindings: [
    {
      finding:
        "N.D.R.Crim.P. 32.1 makes withdrawal of the plea (or setting aside of the verdict), dismissal and sealing "
        + "a MANDATORY TERM of every deferral order, operating sixty-one days after probation expires or "
        + "terminates, while N.D.C.C. § 12.1-32-07.1 provides a motion route to the same outcome where the term "
        + "did not operate. The legal-design record models these as one composed node with two alternative units.",
      consequence:
        "The verification unit files nothing and walks the participant through the clerk's file to the final "
        + "order; the motion unit is conditional, its condition is printed on its own face, and the packet never "
        + "decides which unit applies — the clerk's file decides."
    },
    {
      finding:
        "Whether a deferral order entered before 1 March 2019 on a felony carries the sixty-one-day seal term is a "
        + "recorded open question: until that amendment the rule reached only misdemeanor and infraction cases.",
      consequence:
        "The deferral order's date is a required-before-filing fact checked against the order itself, and a "
        + "pre-2019 felony deferral is a printed stop-and-get-advice condition rather than a guessed eligibility."
    },
    {
      finding:
        "A deferred disposition is not a clean slate: N.D.C.C. § 12.1-32-02(4) allows the prior conviction to be "
        + "pleaded and proved in any subsequent prosecution with the same effect as if the case had not been "
        + "dismissed; § 62.1-02-01(2) counts it as a conviction for firearm-disability purposes; and a "
        + "§ 12.1-32-15 registration consequence survives dismissal. The seal itself is the § 12.1-32-07.2(2) "
        + "restricted-access regime, narrower than Chapter 12-60.1 sealing.",
      consequence:
        "A dedicated legal-effect page states all four limits in plain terms, and a participant who expects "
        + "invisibility in a later prosecution is a printed stop condition — the packet promises nothing the "
        + "statute forecloses."
    },
    {
      finding:
        "Section 12.1-32-07.1 also permits the court, on the defendant's application, to reduce a felony to a "
        + "misdemeanor before dismissing.",
      consequence:
        "The reduction application is rendered as the participant's own mark on the motion, available only where "
        + "the offence was a felony, and is never pre-selected."
    },
    {
      finding:
        "No fee, no notice requirement and no service requirement is identified for either unit in the family's "
        + "own record, and no notarization is required.",
      consequence:
        "The packet states no fee and invents no service mechanic; the clerk of court of the sentencing court is "
        + "named as the authority for anything that court expects beyond the record."
    }
  ],
  counselQuestions: [
    "Whether a deferral order entered before 1 March 2019 on a felony carries the sixty-one-day seal term at all, given that Rule 32.1 reached only misdemeanor and infraction cases until that amendment — it decides whether the verification unit or the motion unit applies to those participants.",
    "Whether this slot is better normalized as one composed node with two alternative units (as built) or split into a verification node and a separate motion track — a recorded counsel-classification question; the substance is identical either way.",
    "Whether the composed § 12.1-32-07.1 motion's structure — deferral date, discharge date, the sixty-one-day recital, the negative recitals on revocation and bench warrant, and the optional reduction application — is sufficient where no official form exists.",
    "Whether any district judge expects notice to the state's attorney on a § 12.1-32-07.1 motion, where neither the rule nor the statute states a notice or service requirement."
  ],
  reviewerAttention: [
    "The motion is conditional and its condition is printed on its own face; confirm the verification unit visibly files nothing.",
    "The legal-effect page states the § 12.1-32-02(4) pleadability, the § 62.1-02-01(2) firearm consequence and the § 12.1-32-15 registration survival in plain terms; confirm the wording against the record.",
    "The felony-reduction application is a participant mark gated by the offence level the participant copies from the deferral order; confirm that gating is legible."
  ]
};

runIfMain(FAMILY, import.meta.url);
export { FAMILY };
