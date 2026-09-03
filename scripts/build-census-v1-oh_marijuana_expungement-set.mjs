#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runEastFamily } from "./build-census-v1-nj_arrest_no_conviction-set.mjs";

const FAMILY_ID = "oh_marijuana_expungement-set";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT,
  "data/rcap-all50/overlays/census-v1/oh/oh-marijuana-expungement-set--custom-pleading");
const COMPANION = path.join(OUT,
  "companion/OH-BCI-SEALING-EXPUNGEMENT-REQUEST--official-source.pdf");
const COMPANION_SHA256 = "9234ec763403b1ccfbed796dfcf86f29bf7887390d1770460d0bcc9da31fc8cb";

const SELF_HELP_STOPS = [
  "Any question about the exact ORC 2925.11 division, or about the substance or quantity.",
  "Any hashish matter near the fifteen-gram line.",
  "Mixed cases with non-marijuana charges, which trigger ORC 2953.61.",
  "Any disposition on or after March 20, 2026, which is outside the section.",
  "Any incident that produced more than one charge with different dispositions, which triggers ORC 2953.61.",
  "Pending criminal proceedings or open warrants.",
  "Prosecutor objection, and any victim objection where applicable.",
  "Choosing between sealing and expungement, which is a legal judgment with different waits and different exclusions.",
  "Immigration exposure.",
];

function participantInstructions() {
  return `# Ohio marijuana or hashish possession expungement — participant instructions

This packet contains one statutory-content draft, an unsigned proposed order, and one unchanged official Ohio BCI request. The draft is a review artifact. It is not a statewide Ohio court form, is not filing-ready, and does not decide eligibility.

## What you must supply before filing

- **Name of court and local caption.** Use the caption required by the Ohio sentencing court; do not guess.
- **Date of arrest.** Copy it from the certified court record.
- **Date of disposition.** Confirm that the conviction, guilty plea, or dismissal occurred before March 20, 2026.
- **Arresting agency.** Copy the agency name from the certified court record.
- **Date of birth and Social Security Number, if the local court form requires them.** Add these yourself only where that court requires them; this packet stores and writes neither value.
- **Ohio Rev. Code Sec. 2953.61 same-act charge schedule.** Assemble a written list of every charge arising from the same act and how each charge ended. The statute generally prevents clearing only part of a same-act record when the charges have different final dispositions.

## Records and checks you must complete

1. Obtain your Ohio BCI criminal-history record from the Ohio Bureau of Criminal Identification and Investigation. Check your answer about every Ohio case, in every court, against that record and correct the packet if they disagree.
2. Obtain from the clerk of the sentencing court a certified disposition and the complaint, indictment, or information showing the substance, quantity, and exact division of Ohio Rev. Code Sec. 2925.11. Check the packet's quantity and citation against those documents and correct any disagreement.
3. Obtain the sentencing court's current local application, caption, filing instructions, and proposed-order requirements. Transfer only reviewed content to that court's paper.
4. Sign and date the application yourself. Confirm any local notarization requirement; the held route record does not identify one.
5. Present the $50 filing fee or the court's required indigency showing to the clerk when filing. Ohio Rev. Code Sec. 2953.321(G) charges fifty dollars unless the applicant is indigent; indigency excuses that fee.

## Where this is filed

Apply to the Ohio sentencing court and file with that court's clerk. No statewide mandatory application is held for this new section, so the sentencing court's current local paper remains a release requirement.

## Notice, service, and hearing

You do not separately serve the prosecutor under the held route record. The court sets a hearing, notifies the prosecutor, and directs any required probation inquiry; the prosecutor may object by filing an objection with the court. The hearing is held 45 to 90 days after filing. This packet generates no certificate of service.

## If an order is granted

Only a signed judicial order operates. After entry, send the signed order to BCI with the unchanged Sealings and Expungements Request included in this packet. Do not prefill or send that BCI request before a signed order exists.

## When to stop and get legal help

${SELF_HELP_STOPS.map((stop) => `- ${stop}`).join("\n")}

This packet is not legal advice, is not filed for you, and does not guarantee that a court will grant relief. Commercial and runtime authority remain false.
`;
}

function assertFix17Repair() {
  assert.ok(fs.existsSync(COMPANION), `${FAMILY_ID}: the declared BCI companion is absent`);
  const companionHash = crypto.createHash("sha256").update(fs.readFileSync(COMPANION)).digest("hex");
  assert.equal(companionHash, COMPANION_SHA256, `${FAMILY_ID}: BCI companion hash drift`);
  const text = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
  for (const required of [
    "Check your answer about every Ohio case, in every court, against that record",
    "complaint, indictment, or information showing the substance, quantity, and exact division",
    "$50 filing fee",
    "indigency excuses that fee",
    "You do not separately serve the prosecutor",
    ...SELF_HELP_STOPS,
  ]) {
    assert.ok(text.includes(required), `${FAMILY_ID}: participant guidance dropped ${JSON.stringify(required)}`);
  }
}

const argv = process.argv.slice(2);
await runEastFamily(FAMILY_ID, argv);
if (!argv.includes("--self-test")) {
  if (!argv.includes("--check")) {
    fs.writeFileSync(path.join(OUT, "participant-instructions.md"), participantInstructions());
  }
  assertFix17Repair();
}
