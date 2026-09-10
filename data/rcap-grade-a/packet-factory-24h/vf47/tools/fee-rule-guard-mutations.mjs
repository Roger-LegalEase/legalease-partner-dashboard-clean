import fs from "node:fs";
import { feeRuleWithoutTheTrackSentence, TRACK_SENTENCE_IN_THE_FEE_RULE }
  from "/home/user/fixa-worktree/scripts/build-census-v1-la-976-arrest-no-conviction-set.mjs";

const reg = JSON.parse(fs.readFileSync("/home/user/fixa-worktree/data/record-clearing/legal-design-track-registry.json","utf8"));
const REAL = reg.tracks.find(t => t.trackId === "la-976-arrest-no-conviction").rules.fees;

const T = TRACK_SENTENCE_IN_THE_FEE_RULE;
const cases = [
  ["CONTROL  unmutated record", REAL, false],
  ["LIMB1    routing sentence deleted from the record", REAL.replace(" " + T, ""), true],
  ["LIMB1b   routing sentence reworded ('this track'->'this pathway')", REAL.replace(T, T.replace("this track","this pathway")), true],
  ["LIMB2    a SECOND 'this track' added before the known sentence", REAL.replace("under Article 983(G).", "under Article 983(G) on this track."), true],
  ["LIMB3    the Article 983(A) cap sentence removed", REAL.replace("Article 983(A) caps the total cost of obtaining a court order of expungement at five hundred fifty dollars. ",""), true],
  ["LIMB3b   the cap reworded ('caps the total cost'->'limits the total cost')", REAL.replace("caps the total cost","limits the total cost"), true],
  ["LIMB4    trailing 983(G) clause removed, routing sentence kept", REAL.replace(" or a juvenile who completed a juvenile drug court programme and is exempt under Article 983(G).",""), true],
  ["LIMB4b   a sentence appended after the routing sentence", REAL + " Fees are collected by the clerk.", true],
];
let ok = 0, bad = 0;
for (const [name, input, shouldThrow] of cases) {
  let threw = null;
  try { const out = feeRuleWithoutTheTrackSentence(input);
        if (!shouldThrow) { console.log(`PASS  ${name}\n        -> returned ${out.length} chars, ends: ...${out.slice(-60)}`); ok++; continue; }
        console.log(`*** GUARD DID NOT FIRE  ${name}`); bad++; continue;
  } catch (e) { threw = e; }
  if (shouldThrow) { console.log(`PASS  ${name}\n        -> threw: ${String(threw.message).split("\n")[0].slice(0,150)}`); ok++; }
  else { console.log(`*** UNEXPECTED THROW  ${name}: ${threw.message}`); bad++; }
}
console.log(`\n${ok} as expected, ${bad} not.`);
