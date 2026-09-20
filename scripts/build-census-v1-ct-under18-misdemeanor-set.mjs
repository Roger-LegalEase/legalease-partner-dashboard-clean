#!/usr/bin/env node
/**
 * The Connecticut under-18 misdemeanour erasure packet family builder.
 *
 *   node scripts/build-census-v1-ct-under18-misdemeanor-set.mjs [--check]
 *
 * One census-v1 family, two alternative branches, ONE rendered component:
 *
 *   ct-under18-misdemeanor-branch-automatic   C.G.S. § 54-142a(f)(1): adult
 *       misdemeanour convictions for conduct committed while under 18, where
 *       the offense occurred on or after 1 January 2000 and before 1 July
 *       2012, are erased — or deemed erased by operation of law for scanned
 *       and non-electronic records. No participant filing exists.
 *
 *   ct-under18-misdemeanor-branch-petition   C.G.S. § 54-142a(f)(2): for
 *       offenses before 1 January 2000 the person may file a petition with
 *       the Superior Court at the location where the conviction was effected.
 *       THE PACKET DOES NOT GENERATE THAT PETITION: the family's own
 *       legal-design record retains the branch as a true blocker — no
 *       Judicial Branch form has been identified (JD-CR-202 is on its face a
 *       Clean Slate form, not an (f)(2) form), no accepted custom pleading is
 *       established, and the historical offense-date and classification rule
 *       is unresolved. "A known automatic branch does not authorise guessing
 *       the petition branch."
 *
 * The packet-set manifest for this family names exactly one component —
 * process_guidance — and that is what this build renders: the branch
 * worksheet, the carve-outs, the (f)(3) same-information limitation, how to
 * confirm an erasure happened, and the plain statement that the pre-2000
 * petition branch is a stop-and-get-help condition. This is an adult record;
 * it is not juvenile delinquency relief, and Connecticut says ERASURE — not
 * expungement, not sealing.
 *
 * The platform writes only the participant's name. Every case fact — the
 * offense date, the statute sections, the same-information question, the
 * conviction location — is a labelled blank on the worksheet declared
 * REQUIRED_BEFORE_FILING and disclosed in participant-instructions.md, with
 * the Judicial Branch online case look-up and the Superior Court clerk's
 * office named as the checkable authorities. No fee arises: § 54-142a(k).
 */
import {
  mapHelpers, composedMapOf, runIfMain, DOTS
} from "./rcap-custom-pleading/composed-family-host.mjs";

const FAMILY_ID = "ct-under18-misdemeanor-set";
const OUT = "data/rcap-all50/overlays/census-v1/ct/ct-under18-misdemeanor-set--custom-pleading";

const ROUTE = Object.freeze({
  routeKeys: [
    "obligation:unit:CT:ct-under18-misdemeanor:ct-under18-misdemeanor-branch-automatic",
    "obligation:unit:CT:ct-under18-misdemeanor:ct-under18-misdemeanor-branch-petition"
  ],
  legalName: "Erasure of an Adult Misdemeanor Conviction for Conduct Before Age 18, C.G.S. § 54-142a(f)",
  routeName: "erasure of a Connecticut adult misdemeanour conviction for conduct committed before you turned 18, under C.G.S. § 54-142a(f)",
  statutes: ["C.G.S. § 54-142a(f)(1)", "C.G.S. § 54-142a(f)(2)", "C.G.S. § 54-142a(f)(3)", "C.G.S. § 54-142a(k)"]
});

const COMPONENTS = [
  { id: "process_guidance", role: "process_guidance", title: "Which Branch Is Yours - the Sec. 54-142a(f) Worksheet" }
];

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Priya Ananya Ramachandran",
    "participant.date_of_birth": "1985-07-19",
    "participant.street_address": "36 Beacon Falls Terrace, New Haven, CT 06511",
    "participant.phone": "203-555-0171",
    "participant.email": "priya.ramachandran@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Konstantinos-Alexandros Papadimitriou-Wentworth",
    "participant.date_of_birth": "1979-12-31",
    "participant.street_address": "4184 Old Turnpike Hollow Road Extension, Second Floor Rear, Torrington, Connecticut 06790-3315",
    "participant.phone": "(860) 555-0119 ext. 7702",
    "participant.email": "konstantinos.alexandros.papadimitriou.wentworth@longmailexample.org"
  }
};

/* ---- composed body -------------------------------------------------------------- *
 * Everything below is traceable to the family's committed records, named inline:
 *   [MEMO]     data/record-clearing/legal-design-intake/CT.memo.json,
 *              track ct-under18-misdemeanor
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json,
 *              ct-under18-misdemeanor-set
 */
function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push(COMPONENTS[0].title.toUpperCase(), "");
  L.push(`Prepared for: ${name}`, "");
  L.push("WHAT THIS IS. Connecticut General Statutes Sec. 54-142a(f) reaches an ADULT misdemeanour conviction for conduct committed while you were under 18. It is an adult record - this is NOT juvenile delinquency relief - and Connecticut's word for the relief is ERASURE: not expungement, not sealing. No fee is charged at any point on this route (Sec. 54-142a(k)).", "");
  L.push("Two branches exist, they are alternatives rather than stages, and WHEN THE OFFENSE OCCURRED decides which one is yours. This worksheet does not choose for you: fill in the facts below from the record, and read the branch that matches.", "");
  L.push("THE FACTS THAT DECIDE THE BRANCH - fill each from the record, never from memory. Look the case up on the Connecticut Judicial Branch online case look-up to confirm the offense date, the charges on the information and the conviction location; nothing is looked up, obtained or inspected for you.", "");
  L.push("Date the offense happened, confirmed against the case look-up:");
  L.push(DOTS(), "");
  L.push("Were you under 18 when the offense happened? (this route exists only if you were)");
  L.push(DOTS(), "");
  L.push("Statute sections you were convicted under, copied from your record:");
  L.push(DOTS(), "");
  L.push("Other charges on the same information, and whether any of them was one that could not be erased:");
  L.push(DOTS(), "");
  L.push("Court location where the conviction was effected (needed only on the petition branch):");
  L.push(DOTS(), "");
  L.push("BRANCH ONE - AUTOMATIC, Sec. 54-142a(f)(1). If the offense occurred ON OR AFTER 1 JANUARY 2000 AND BEFORE 1 JULY 2012, the conviction is erased - or, for scanned and other non-electronic records, DEEMED ERASED by operation of law. You file nothing, you sign nothing, and there is no form, because the erasure is the statute's own work.", "");
  L.push("Carve-outs on the automatic branch: it does not reach a motor vehicle offense, a violation under title 14, or a violation of Sec. 51-164r. Check the statute sections you copied above; if one of them is in those categories, this branch does not reach it.", "");
  L.push("HOW TO CONFIRM THE ERASURE HAPPENED. A deemed-erased record can still look visible. Check the Judicial Branch online case look-up for the case; ask the clerk's office of the Superior Court at the location where the conviction was effected what their file shows; and if a background check still discloses the conviction, take that report and this worksheet to a lawyer or a legal-aid office.", "");
  L.push("BRANCH TWO - PETITION, Sec. 54-142a(f)(2), offenses BEFORE 1 JANUARY 2000. The statute lets the person file a petition with the Superior Court at the location where the conviction was effected, and the court shall direct erasure. THIS PACKET DOES NOT GENERATE THAT PETITION, AND THAT IS DELIBERATE: no Judicial Branch form for an (f)(2) petition has been identified - JD-CR-202 is on its face a Clean Slate form, not an (f)(2) form - no accepted custom pleading is established, and the historical offense-date and classification rule is unresolved. A worksheet that guessed at that filing would be worse than none. If your offense date puts you on this branch, STOP HERE and take this worksheet to a lawyer or a legal-aid office; the clerk's office of the Superior Court at the location where the conviction was effected can also say what filings that court accepts.", "");
  L.push("THE SAME-INFORMATION LIMITATION, Sec. 54-142a(f)(3), APPLIES ON BOTH BRANCHES. Notwithstanding the multi-count rule at subsection (i), subsection (f) does not apply where there has been a conviction for any charge arising from the same information for which erasure would not apply. That is why the worksheet asks about the other charges on the information; if any of them could not be erased, stop and get advice.", "");
  L.push("WHEN TO STOP AND GET HELP", "");
  L.push("- the offense occurred before 1 January 2000 - the petition branch, for which no accepted filing vehicle has been identified;");
  L.push("- another charge arising from the same information could not be erased;");
  L.push("- the offense is a motor vehicle offense, a title 14 violation or a Sec. 51-164r violation;");
  L.push("- you have an immigration matter - erasure does not resolve immigration consequences.", "");
  L.push("WHAT THIS PACKET IS NOT. This is a worksheet and an explanation. It generates no filing on either branch, it is not legal advice, and it does not decide which branch is yours - the offense date on the record decides.");
  L.push("", `Route: ${ROUTE.routeKeys[0]}`);
  return L.join("\n");
}

/* ---- the field map --------------------------------------------------------------- */
function maps() {
  const h = mapHelpers("process_guidance");
  const writes = [h.write("participant_name", "Participant named on the branch worksheet", "participant.full_legal_name")];
  const refusals = [
    h.rbf("offense_date", "Date the offense happened, confirmed against the case look-up",
      "the date the offense happened, confirmed against the Connecticut Judicial Branch online case look-up - this answer selects the branch, and nothing selects it for you",
      "the offense date decides which branch applies and lives on the participant's own record"),
    h.rbf("age_at_offense", "Whether the participant was under 18 when the offense happened",
      "whether you were under 18 when the offense happened - this route exists only if you were",
      "the participant's age at the offense is a case fact the platform does not hold"),
    h.rbf("statute_sections", "Statute sections of the conviction, copied from the record",
      "the statute sections you were convicted under, copied from your record - the automatic branch does not reach a motor vehicle offense, a title 14 violation or a Sec. 51-164r violation",
      "the sections decide the automatic branch's carve-outs and live on the record"),
    h.rbf("same_information_charges", "Other charges on the same information, and whether any could not be erased",
      "the other charges on the same information, from the case look-up, and whether any of them was one that could not be erased - Sec. 54-142a(f)(3) turns on it",
      "the same-information limitation turns on charges the platform has not seen"),
    h.rbf("conviction_location", "Court location where the conviction was effected, needed only on the petition branch",
      "the Superior Court location where the conviction was effected - needed only on the petition branch, and the clerk's office there can confirm it",
      "the conviction location is a case fact, and on the petition branch it fixes the court whose accepted filings a lawyer would need to determine")
  ];
  return [composedMapOf("process_guidance", FAMILY, writes, refusals)];
}

/* ---- participant instructions ----------------------------------------------------- */
function participantInstructions(rbf) {
  const out = [];
  out.push(`# What you must do — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("This is an **adult record** — an adult conviction for conduct committed before you turned 18 — not juvenile delinquency relief, and Connecticut's word for the relief is **erasure**. Two branches exist and the offense date decides which is yours: the § 54-142a(f)(1) **automatic** branch (offense on or after 1 January 2000 and before 1 July 2012 — erased or deemed erased by operation of law, nothing filed) and the § 54-142a(f)(2) **petition** branch (offense before 1 January 2000). **This packet generates no petition**: no Judicial Branch form for an (f)(2) petition has been identified — JD-CR-202 is on its face a Clean Slate form — no accepted custom pleading is established, and the family's own legal-design record retains that branch as a blocker. A known automatic branch does not authorise guessing the petition branch.", "");
  out.push("## Documents you must obtain", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Judicial Branch case look-up printout — confirm the offense date, the charges on the information and the conviction location against it, and correct the worksheet if they disagree | Connecticut Judicial Branch online case look-up |");
  out.push("");
  out.push("## The items you must supply on the worksheet", "");
  out.push("| The blank on the worksheet | What to write |", "| --- | --- |");
  for (const i of rbf) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  out.push("");
  out.push("## Money", "");
  out.push("No fee is charged on this route. § 54-142a(k).", "");
  out.push("## When to stop and get help", "");
  out.push("- the offense occurred before 1 January 2000 — the petition branch, for which no accepted filing vehicle has been identified; take the worksheet to a lawyer or legal-aid office, and the clerk's office of the Superior Court where the conviction was effected can say what filings that court accepts;");
  out.push("- another charge arising from the same information could not be erased (§ 54-142a(f)(3));");
  out.push("- the offense is a motor vehicle offense, a title 14 violation or a § 51-164r violation;");
  out.push("- you have an immigration matter.", "");
  out.push("## What this packet is not", "");
  out.push("A worksheet and an explanation. It generates no filing on either branch, it is not legal advice, and it does not decide which branch is yours — the offense date on the record decides.", "");
  out.push(`_Routes: ${ROUTE.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

const FAMILY = {
  familyId: FAMILY_ID,
  outDir: OUT,
  buildScript: "scripts/build-census-v1-ct-under18-misdemeanor-set.mjs",
  jurisdiction: "CT",
  route: ROUTE,
  components: COMPONENTS,
  composedFrom:
    "the legal-design intake record (data/record-clearing/legal-design-intake/CT.memo.json, track "
    + "ct-under18-misdemeanor, composition mode 'alternative' over two units, petition unit retained unavailable) "
    + "and the packet-set manifest (data/record-clearing/legal-design-packet-set-manifests.json, "
    + "ct-under18-misdemeanor-set), whose component set is exactly one process_guidance component",
  compositionSources: [
    "data/record-clearing/legal-design-intake/CT.memo.json",
    "data/record-clearing/legal-design-packet-set-manifests.json"
  ],
  composedBody,
  maps,
  fixtures: FIXTURES,
  participantInstructions,
  formIdentityNote:
    "The packet-set manifest names exactly one component — process_guidance — and the legal-design decision "
    + "retains the § 54-142a(f)(2) petition branch as a true blocker: no Judicial Branch form has been identified "
    + "(JD-CR-202 is on its face a Clean Slate form, not an (f)(2) form), no accepted custom pleading is "
    + "established, and the historical offense-date and classification rule is unresolved. The MASTER_QUEUE row's "
    + "instrumentKinds mention an (f)(2) petition instrument, but the manifest and the legal-design decision are "
    + "the component authorities, and both withhold it; the discrepancy is raised for counsel rather than resolved "
    + "by composing a petition no record authorizes.",
  routeSelectionNote:
    "The two branches are alternatives selected by the offense date, a fact on the participant's own record, so "
    + "neither is selected for them and the worksheet carries no election control — it asks for the date and "
    + "explains both branches, with the petition branch printed as a stop-and-get-help condition.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "that any particular conviction was erased or deemed erased on the automatic branch",
    "any accepted filing vehicle for the § 54-142a(f)(2) petition branch — the recorded blocker stands",
    "the historical offense-date and classification rule for pre-2000 convictions"
  ],
  buildFindings: [
    {
      finding:
        "The packet-set manifest for this family names exactly one component (process_guidance), and the "
        + "legal-design decision states in terms that the (f)(2) petition branch 'carries no strategy, because a "
        + "known automatic branch does not authorise guessing the petition branch' — two build_blocker questions "
        + "stand against it (no identified form; JD-CR-202 is a Clean Slate form on its face; the historical "
        + "offense-date and classification rule is unresolved).",
      consequence:
        "The build renders the guidance worksheet alone and composes no petition. The MASTER_QUEUE row's "
        + "instrumentKinds mention an (f)(2) petition instrument; that discrepancy is recorded here and raised as "
        + "a counsel question rather than resolved by inventing an instrument no record authorizes."
    },
    {
      finding:
        "The automatic branch is erasure — or deemed erasure for scanned and non-electronic records — by "
        + "operation of law for offenses on or after 1 January 2000 and before 1 July 2012, with carve-outs for "
        + "motor vehicle offenses, title 14 violations and § 51-164r violations.",
      consequence:
        "The worksheet explains the window and the carve-outs, asks the participant to copy their statute "
        + "sections from the record, and tells them how to confirm a deemed erasure actually happened — the case "
        + "look-up, the clerk's office at the conviction location, and counsel where a background check still "
        + "discloses the conviction."
    },
    {
      finding:
        "Section 54-142a(f)(3) disapplies subsection (f) where a conviction for any charge for which erasure "
        + "would not apply arises from the same information, notwithstanding the multi-count rule at subsection (i).",
      consequence:
        "The same-information question is a required worksheet fact checked against the case look-up, and an "
        + "affirmative answer is a printed stop condition on both branches."
    },
    {
      finding:
        "This is an adult record — an adult conviction for conduct committed before age 18 — and Connecticut's "
        + "terminology is erasure.",
      consequence:
        "The worksheet states both plainly, so the participant neither seeks juvenile relief here nor asks a "
        + "Connecticut clerk for an 'expungement'."
    }
  ],
  counselQuestions: [
    "Whether the Judicial Branch publishes a form for a § 54-142a(f)(2) petition, and whether JD-CR-202 is used for it in practice — JD-CR-202 on its face is a Clean Slate form, not an (f)(2) form. This is the recorded build blocker that keeps the petition branch out of this packet.",
    "The current form or accepted custom pleading for the (f)(2) petition branch, and the historical offense-date and classification rule for pre-2000 convictions.",
    "The MASTER_QUEUE row's instrumentKinds name an (f)(2) petition instrument while the packet-set manifest and the legal-design decision withhold it; confirm the guidance-only component set, or authorize the petition instrument once the blockers above are resolved.",
    "How a participant on the automatic branch should best confirm that a deemed-erased scanned or non-electronic record is in fact treated as erased."
  ],
  reviewerAttention: [
    "The petition branch is a printed stop-and-get-help condition, not an instrument; confirm no page reads as generating or promising an (f)(2) filing.",
    "The worksheet's branch window (on or after 1 January 2000 and before 1 July 2012) and the carve-out list are stated from the family's own record; confirm the dates and sections on review.",
    "No fee is stated anywhere except the § 54-142a(k) no-fee rule, from the record."
  ]
};

runIfMain(FAMILY, import.meta.url);
export { FAMILY };
