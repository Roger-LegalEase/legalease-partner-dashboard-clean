import { heldNotWrittenItems } from './nm-packet-host.mjs';
import assert from "node:assert/strict";
import fs from "node:fs";
import { PARTICIPANT_ELECTION } from "./nm-packet-host.mjs";
import { participantControlsByDocument as convictionControls } from "../build-census-v1-nm_conviction-set.mjs";
import { participantControlsByDocument as identityControls } from "../build-census-v1-nm_identity_theft-set.mjs";
import { participantControlsByDocument as releaseControls } from "../build-census-v1-nm_release_without_conviction-set.mjs";

const ROOT = "data/rcap-all50/overlays/census-v1/nm";
const families = [
  {
    slug: "nm-conviction-set--official-pdf-fill",
    courtDocument: "NM-LOCAL-CONVICTION-ORDER",
    expectsCourtOrderNotice: true,
    expectedParticipantControls: 69,
    group: convictionControls
  },
  {
    slug: "nm-identity-theft-set--official-pdf-fill",
    courtDocument: "NM-LOCAL-IDENTITY-THEFT-ORDER",
    expectsCourtOrderNotice: true,
    expectedParticipantControls: 26,
    group: identityControls
  },
  {
    slug: "nm-release-without-conviction-set--official-pdf-fill",
    courtDocument: null,
    expectsCourtOrderNotice: false,
    expectedParticipantControls: 59,
    group: releaseControls
  }
];

for (const family of families) {
  const dir = `${ROOT}/${family.slug}`;
  const report = JSON.parse(fs.readFileSync(`${dir}/reports/blanks-left-for-the-participant.json`, "utf8"));
  const grouped = family.group(report.handMarkedControls);
  const offered = [...grouped.values()].flat();
  assert.equal(offered.length, family.expectedParticipantControls);
  assert.ok(offered.every((control) => control.refusalClass === PARTICIPANT_ELECTION));
  if (family.courtDocument) assert.equal(grouped.has(family.courtDocument), false);

  const instructions = fs.readFileSync(`${dir}/participant-instructions.md`, "utf8");
  const map = JSON.parse(fs.readFileSync(`${dir}/production-field-map.json`, "utf8"));
  for (const held of heldNotWrittenItems(map.maps)) {
    assert.ok(instructions.includes(held.disclosureLabel), `missing current hand-fill task: ${held.document} ${held.disclosureLabel}`);
    assert.ok(instructions.includes(held.participantMustSupply), `missing hand-fill fact guidance: ${held.document}`);
  }
  const participantSection = instructions
    .split("## Boxes you tick with a pen\n\n")[1]
    .split("\n## What you must do before you file")[0];
  if (family.courtDocument) assert.doesNotMatch(participantSection, new RegExp(family.courtDocument));
  assert.doesNotMatch(participantSection, /nothing can mark them for you/i);
  assert.match(participantSection, /already marked \*\*Petitioner\*\* on Form 4-222/);
  if (family.expectsCourtOrderNotice) assert.match(participantSection, /proposed order are court-owned/);
}

console.log("PASS New Mexico participant instructions exclude court-owned order controls");
